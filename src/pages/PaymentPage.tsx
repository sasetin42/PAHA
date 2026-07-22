import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPaycoolsPayment } from '../services/paycoolsService';
import { db, storage } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, query, where, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notifyAdmin } from '../utils/notify';
import { cleanPhoneInput } from '../utils/phone';
import { CustomDatePicker } from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import LoadingScreen from '../components/LoadingScreen';

type Step = 1 | 2;
type PayOption = 'Pay Now' | 'Manual Payment';

const FALLBACK_CHANNEL_METADATA = [
    { channelCode: 'GCASH_URL', channelType: 'EWALLET' },
    { channelCode: 'PAYMAYA_URL', channelType: 'EWALLET' },
    { channelCode: 'QRPH_DYNAMIC_QR', channelType: 'QR' },
    { channelCode: 'BPIA_URL', channelType: 'ONLINE_BANKING' },
    { channelCode: 'UBPB_URL', channelType: 'ONLINE_BANKING' },
    { channelCode: 'VISA_CARD_URL', channelType: 'CARD' },
    { channelCode: 'MASTER_CARD_URL', channelType: 'CARD' },
    { channelCode: '7ELEVEN_VA', channelType: 'OTC' }
];

const getFriendlyChannelLabel = (code: string): string => {
    switch (code) {
        case 'GCASH_URL': return 'GCash';
        case 'PAYMAYA_URL': return 'Maya';
        case 'QRPH_DYNAMIC_QR': return 'QRPH';
        case 'BPIA_URL': return 'BPI Online';
        case 'UBPB_URL': return 'UnionBank';
        case 'VISA_CARD_URL': return 'Visa Card';
        case 'MASTER_CARD_URL': return 'Mastercard';
        case '7ELEVEN_VA': return '7-Eleven';
        default: return code.replace('_URL', '').replace(/_/g, ' ');
    }
};

const formatPHMobile = (num: string): string => {
    if (!num) return '';
    const cleaned = num.trim();
    if (cleaned.startsWith('+63')) return '0' + cleaned.slice(3);
    if (cleaned.startsWith('63')) return '0' + cleaned.slice(2);
    return cleaned;
};

const PaymentPage: React.FC = () => {
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Payment type (membership or accreditation)
    const urlPaymentType = searchParams.get('type') || 'membership';
    const urlAppId = searchParams.get('appId') || '';
    const urlMembershipType = searchParams.get('membershipType') || 'None';

    const [paymentType, setPaymentType] = useState<'membership' | 'accreditation'>(
        urlPaymentType === 'accreditation' ? 'accreditation' : 'membership'
    );

    // Accreditation state
    const [accApplication, setAccApplication] = useState<any>(null);
    // No more membership add-on selector — the accreditation payment is a flat
    // fee, so this is fixed from the URL (always 'None' for that flow).
    const selectedMembershipType = urlMembershipType || 'None';

    const [step, setStep] = useState<Step>(1);
    const [checking, setChecking] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // Step 1 — Personal Info
    const [emailConfirm, setEmailConfirm] = useState('');
    const [prcLicense, setPrcLicense] = useState('');
    const [facilityName, setFacilityName] = useState('');
    const [fullName, setFullName] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [sex, setSex] = useState('');
    const [mobile, setMobile] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const photoRef = useRef<HTMLInputElement>(null);

    // Step 2 — Payment
    const [payOption, setPayOption] = useState<PayOption>('Pay Now');
    const [agreed, setAgreed] = useState(false);
    const [qrContent, setQrContent] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofFileName, setProofFileName] = useState<string>('');
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
    const proofInputRef = useRef<HTMLInputElement>(null);

    const [gatewaySettings, setGatewaySettings] = useState<any>(null);
    const [availableChannels, setAvailableChannels] = useState<any[]>([]);
    const [selectedChannelCode, setSelectedChannelCode] = useState<string>('');
    const [selectedChannelType, setSelectedChannelType] = useState<string>('');
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);

    // Dynamic Accreditation Settings state
    const [liveAccreditationFee, setLiveAccreditationFee] = useState(15000);
    const [liveAccreditationProcessingFee, setLiveAccreditationProcessingFee] = useState(2500);
    const [liveAccreditationValidityYears, setLiveAccreditationValidityYears] = useState(3);

    // Customizable Card Design State
    const [cardDesign, setCardDesign] = useState<any>({
        backgroundType: 'gradient',
        solidColor: '#0d2257',
        gradientStart: '#0d2257',
        gradientVia: '#2563eb',
        gradientEnd: '#3b82f6',
        gradientDirection: 'to-br',
        textColor: 'light',
        icon: 'pets',
        customIconUrl: '',
        backgroundImageUrl: '',
        showPatternOverlay: true,
        cardTitle: 'MEMBERSHIP CARD'
    });

    // Load active settings in real-time from Firestore doc
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'paymentGatewaySettings', 'paycools'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setGatewaySettings(data);
                if (data.enabled === false) {
                    setPayOption('Manual Payment');
                }
            } else {
                // If doc doesn't exist, default to disabled
                setGatewaySettings({ enabled: false });
                setPayOption('Manual Payment');
            }
        }, (err) => {
            console.error('[PaymentPage] Realtime config sync error:', err);
        });

        // Query customizable membership plans in real-time
        const unsubPlans = onSnapshot(collection(db, 'membership_plans'), (snap) => {
            const plans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembershipPlans(plans);
        }, (err) => {
            console.error('[PaymentPage] Realtime plans sync error:', err);
        });

        const unsubAccSettings = onSnapshot(doc(db, 'systemSettings', 'accreditation'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveAccreditationFee(data.baseFee || 15000);
                const feeEnabled = data.enableProcessingFee !== undefined ? data.enableProcessingFee : true;
                setLiveAccreditationProcessingFee(feeEnabled ? (data.processingFee !== undefined ? data.processingFee : 2500) : 0);
                setLiveAccreditationValidityYears(data.validityYears || 3);
            }
        }, (err) => {
            console.error('[PaymentPage] Accreditation settings error:', err);
        });

        // Load card design settings
        const unsubCardDesign = onSnapshot(doc(db, 'systemSettings', 'membershipCard'), (snap) => {
            if (snap.exists()) {
                setCardDesign(snap.data());
            }
        }, (err) => {
            console.error('[PaymentPage] Card design error:', err);
        });

        return () => {
            unsub();
            unsubPlans();
            unsubAccSettings();
            unsubCardDesign();
        };
    }, []);

    // Fetch channels only when the user is logged in
    useEffect(() => {
        if (!user) return;

        const fetchChannels = async () => {
            try {
                const snap = await getDocs(collection(db, 'paycoolsChannels'));
                const list = snap.docs.map(d => d.data());
                setAvailableChannels(list);
            } catch (err) {
                console.error('[PaymentPage] Channels fetch error:', err);
            }
        };

        fetchChannels();
    }, [user]);

    // Compute active display channels dynamically
    const displayChannels = React.useMemo(() => {
        const allowedCodes = gatewaySettings?.allowedChannelCodes || [];
        const allowedTypes = gatewaySettings?.allowedChannelTypes || [];

        if (allowedCodes.length === 0 && allowedTypes.length === 0) {
            return (availableChannels && availableChannels.length > 0)
                ? availableChannels
                : FALLBACK_CHANNEL_METADATA;
        }

        const baseChannels = (availableChannels && availableChannels.length > 0)
            ? availableChannels
            : FALLBACK_CHANNEL_METADATA;

        return baseChannels.filter(ch => {
            const codeMatch = allowedCodes.includes(ch.channelCode);
            const typeMatch = allowedTypes.includes(ch.channelType);
            return codeMatch && typeMatch;
        });
    }, [availableChannels, gatewaySettings]);

    // Auto-select first/GCash channel when displayChannels are loaded or settings load
    useEffect(() => {
        if (displayChannels.length > 0) {
            const exists = displayChannels.some(ch => ch.channelCode === selectedChannelCode);
            if (!selectedChannelCode || !exists) {
                const gcash = displayChannels.find(ch => ch.channelCode === 'GCASH_URL');
                if (gcash) {
                    setSelectedChannelCode(gcash.channelCode);
                    setSelectedChannelType(gcash.channelType);
                } else {
                    setSelectedChannelCode(displayChannels[0].channelCode);
                    setSelectedChannelType(displayChannels[0].channelType);
                }
            }
        }
    }, [displayChannels, selectedChannelCode]);

    useEffect(() => {
        if (!profile) return;
        setPrcLicense(profile.prcLicense || profile.prcLicenseNo || '');
        setFacilityName(profile.clinicName || profile.facilityName || profile.hospitalName || (profile as any).facility || '');
        setBirthdate(profile.birthdate || '');
        setSex(profile.sex || '');
        setFullName(profile.ownerName || profile.fullName || profile.displayName || '');
        const loadedMobile = cleanPhoneInput(profile.phone || profile.mobile || '');
        setMobile(loadedMobile);
        if (profile.photoUrl) {
            setPhotoPreview(profile.photoUrl);
            setUploadedPhotoUrl(profile.photoUrl);
        }
    }, [profile]);

    // Fetch accreditation application when tab is accreditation
    useEffect(() => {
        if (!user || paymentType !== 'accreditation') return;
        if (urlAppId) {
            // Direct app ID from URL
            getDoc(doc(db, 'accreditation_applications', urlAppId)).then(snap => {
                if (snap.exists()) setAccApplication({ id: snap.id, ...snap.data() });
            }).catch(() => {});
        } else {
            const q = query(collection(db, 'accreditation_applications'));
            const unsub = onSnapshot(q, snap => {
                const userApps = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(app => app.clinicId === user.uid)
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                if (userApps.length > 0) {
                    setAccApplication(userApps[0]);
                }
            });
            return () => unsub();
        }
    }, [user, paymentType, urlAppId]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { navigate('/login?next=/membership/payment'); return; }
        if (!user.emailVerified) { navigate('/login?next=/membership/payment'); return; }
        // The checks below (already-paid membership redirect, pending manual
        // membership payment) only apply to the MEMBERSHIP payment flow. For
        // accreditation payments, hasPaid === true is the normal/expected state
        // (you must already be a paid member to reach accreditation payment),
        // so applying them here was bouncing every accreditation visitor
        // straight back to the dashboard before the page ever loaded.
        if (paymentType === 'accreditation') { setChecking(false); return; }
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.data()?.hasPaid === true) { navigate('/members'); return; }

                // Check if user has already uploaded manual payment proof
                const q = query(
                    collection(db, 'membership_applications')
                );
                const querySnap = await getDocs(q);
                const userApps = querySnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(app => app.uid === user.uid)
                    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

                if (userApps.length > 0) {
                    const appData = userApps[0];
                    if (appData.paymentStatus === 'pending_manual' || appData.status === 'pending_manual') {
                        const orderId = appData.orderId || appData.id;
                        navigate(`/membership/payment/pending?orderId=${orderId}`);
                        return;
                    }
                }
            } catch (err) {
                console.error('[PaymentPage] Pre-check error:', err);
            } finally {
                setChecking(false);
            }
        })();
    }, [user, authLoading, navigate, paymentType]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) { alert('Only JPG or PNG files are allowed.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
            alert('Only PDF, Images, or DOC files are allowed.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File must be under 5 MB.');
            return;
        }
        
        setProofFile(file);
        setProofFileName(file.name);
        if (file.type.startsWith('image/')) {
            setProofPreviewUrl(URL.createObjectURL(file));
        } else {
            setProofPreviewUrl('');
        }
    };

    const validateStep1 = () => {
        const effectivePrc = prcLicense || profile?.prcLicense || profile?.prcLicenseNo || '';
        const effectiveName = (fullName || profile?.ownerName || profile?.fullName || profile?.displayName || '').trim();
        if (!effectivePrc) { setError('PRC License number is required.'); return false; }
        if (!effectiveName) { setError('Representative name is required.'); return false; }
        if (!birthdate) { setError('Birthdate is required.'); return false; }
        if (!sex) { setError('Sex is required.'); return false; }
        const cleanedMobile = cleanPhoneInput(mobile);
        const isValid10 = cleanedMobile.length === 10 && cleanedMobile.startsWith('9');
        if (!isValid10) { setError('Please enter a valid 10-digit Philippine mobile number starting with 9.'); return false; }
        if (!photo && !photoPreview) { setError('Profile photo is required.'); return false; }
        if (!emailConfirm) { setError('Confirm email address is required.'); return false; }
        if (emailConfirm.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase()) { setError('Email addresses do not match.'); return false; }
        return true;
    };

    const next = async () => {
        setError('');
        if (step === 1) {
            if (!validateStep1()) return;
            setProcessing(true);
            try {
                let photoUrl = uploadedPhotoUrl || profile?.photoUrl || '';
                
                if (photo) {
                    const storageRef = ref(storage, `profile-photos/${user?.uid}/${Date.now()}_${photo.name}`);
                    await uploadBytes(storageRef, photo);
                    photoUrl = await getDownloadURL(storageRef);
                    setUploadedPhotoUrl(photoUrl);
                }

                if (user) {
                    await setDoc(doc(db, 'users', user.uid), {
                        prcLicense,
                        fullName,
                        birthdate,
                        sex,
                        mobile: mobile ? `+63${mobile.replace(/^0/, '')}` : '',
                        photoUrl,
                        displayName: fullName,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }

                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err: any) {
                console.error('[PaymentPage] Error saving profile:', err);
                setError(err.message || 'Failed to save details. Please try again.');
            } finally {
                setProcessing(false);
            }
        } else {
            setStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleRefresh = async () => {
        setPrcLicense('');
        setFullName('');
        setBirthdate('');
        setSex('');
        setMobile('');
        setPhoto(null);
        setPhotoPreview('');
        setUploadedPhotoUrl('');
        setEmailConfirm('');
        setError('');

        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), {
                    prcLicense: '',
                    fullName: '',
                    birthdate: '',
                    sex: '',
                    mobile: '',
                    photoUrl: '',
                    displayName: '',
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err: any) {
                console.error('Error auto-saving cleared profile:', err);
                setError('Failed to auto-save cleared form details in database.');
            }
        }
    };

    const back = () => { setError(''); setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    // Determine if user has already paid/registered previously (making this a renewal)
    const isRenewal = profile?.hasPaid === true || !!profile?.memberId;

    // Determine if user is an active member (can access Accreditation)
    const isActiveMember = profile?.hasPaid === true || !!profile?.memberId;

    // Compute active membership fees lookup dynamically
    const liveMembershipFees = React.useMemo(() => {
        const fees: Record<string, number> = { None: 0 };
        membershipPlans.forEach(plan => {
            const feeVal = isRenewal
                ? (plan.recurringFee !== undefined ? plan.recurringFee : plan.fee)
                : (plan.firstPaymentFee !== undefined ? plan.firstPaymentFee : plan.fee);
            if (plan.type) {
                fees[plan.type] = Number(feeVal || 0);
            }
            // Also map by plan title (e.g. 'Annual Membership') for direct lookup
            if (plan.title) {
                fees[plan.title] = Number(feeVal || 0);
            }
        });
        // Default fallbacks in case Firestore query is pending
        const defaults = ['Regular', 'Associate', 'Institutional', 'Affiliate'];
        defaults.forEach(def => {
            if (fees[def] === undefined) {
                fees[def] = 5000.00;
            }
        });
        return fees;
    }, [membershipPlans, isRenewal]);

    // Get the Annual Membership plan directly (saved by admin under 'Annual Membership' title/id)
    const annualMembershipPlan = React.useMemo(() => {
        return membershipPlans.find(p => p.id === 'Annual Membership' || p.title === 'Annual Membership' || p.type === 'Annual');
    }, [membershipPlans]);

    // Live membership fee from the Annual Membership plan.
    // First payment: ₱5,000 · Renewal: ₱2,000 (fallbacks when no plan doc exists)
    const liveAnnualMembershipFee = React.useMemo(() => {
        if (!annualMembershipPlan) return isRenewal ? 2000 : 5000;
        if (isRenewal) {
            return Number(annualMembershipPlan.recurringFee !== undefined ? annualMembershipPlan.recurringFee : (annualMembershipPlan.fee || 2000));
        } else {
            return Number(annualMembershipPlan.firstPaymentFee !== undefined ? annualMembershipPlan.firstPaymentFee : (annualMembershipPlan.fee || 5000));
        }
    }, [annualMembershipPlan, isRenewal]);

    // Determine current user's plan type fee based on profile values
    const liveUserMembershipFee = React.useMemo(() => {
        // For membership payments, always use the Annual Membership plan fee
        return liveAnnualMembershipFee;
    }, [liveAnnualMembershipFee]);

    // Determine user's active membership plan duration validity (in years)
    const liveUserMembershipDuration = React.useMemo(() => {
        return annualMembershipPlan?.validityDuration || 1;
    }, [annualMembershipPlan]);

    // Live Annual Membership processing fee
    const liveAnnualMembershipProcessingFee = React.useMemo(() => {
        if (!annualMembershipPlan) return 0;
        const feeEnabled = annualMembershipPlan.enableProcessingFee !== undefined ? annualMembershipPlan.enableProcessingFee : true;
        return feeEnabled ? Number(annualMembershipPlan.processingFee || 0) : 0;
    }, [annualMembershipPlan]);

    const accrTotal = liveAccreditationFee + liveAccreditationProcessingFee + (liveMembershipFees[selectedMembershipType] || 0);
    const baseFee = paymentType === 'accreditation' ? accrTotal : (liveUserMembershipFee + liveAnnualMembershipProcessingFee);
    const convFee = 0;
    const total = baseFee;

    const handleSubmit = async () => {
        if (!agreed) { setError('You must agree to the terms before submitting.'); return; }
        if (!user) return;
        if (payOption === 'Manual Payment' && !proofFile) {
            setError('Please upload your proof of payment.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (payOption === 'Pay Now') {
            const digits = cleanPhoneInput(mobile);
            const isValid10 = digits.length === 10 && digits.startsWith('9');
            if (!isValid10) {
                setError('Please enter a valid 10-digit Philippine mobile number starting with 9.');
                setProcessing(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }
        setProcessing(true);
        setError('');

        try {
            let photoUrl = uploadedPhotoUrl || profile?.photoUrl || '';
            if (!photoUrl && photo) {
                const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}_${photo.name}`);
                await uploadBytes(storageRef, photo);
                photoUrl = await getDownloadURL(storageRef);
            }

            const orderId = `PAHA${Date.now()}`;

            let paymentReference = '';
            if (payOption === 'Manual Payment' && proofFile) {
                const storageRef = ref(storage, `proofs/${orderId}_${proofFile.name}`);
                await uploadBytes(storageRef, proofFile);
                paymentReference = await getDownloadURL(storageRef);
            }

            if (paymentType === 'accreditation') {
                // Accreditation payment flow
                const appId = accApplication?.id || urlAppId;
                if (!appId) {
                    setError('No accreditation application found. Please return to the accreditation page.');
                    setProcessing(false);
                    return;
                }

                if (payOption === 'Manual Payment') {
                    await updateDoc(doc(db, 'accreditation_applications', appId), {
                        status: 'paid',
                        paymentData: {
                            triggeredAt: new Date().toISOString(),
                            proofOfPaymentUrl: paymentReference || '',
                            paymentMethod: 'manual',
                            totalAmount: total
                        }
                    });
                    navigate(`/membership/payment/pending?orderId=${orderId}&type=accreditation&appId=${appId}`);
                    return;
                }

                const mobileFormatted = (() => {
                    const digits = mobile.replace(/\D/g, '');
                    return digits.replace(/^(63|0)/, '').slice(-10);
                })();

                const result = await createPaycoolsPayment({
                    orderId,
                    amount: total,
                    currency: 'PHP',
                    description: `PAHA Accreditation Fee${selectedMembershipType !== 'None' ? ` + ${selectedMembershipType} Membership` : ''}`,
                    successUrl: `${window.location.origin}/membership/payment/success?type=accreditation`,
                    cancelUrl: `${window.location.origin}/membership/payment?type=accreditation&appId=${appId}&cancelled=true`,
                    callbackUrl: `${window.location.origin}/api/paycools/webhook/checkout`,
                    metadata: {
                        uid: user.uid,
                        email: user.email || '',
                        allowedChannelTypes: [selectedChannelType],
                        allowedChannelCodes: [selectedChannelCode],
                        customerName: fullName,
                        mobile: mobileFormatted,
                    },
                    // Accreditation-specific
                    paymentType: 'accreditation',
                    accreditationAppId: appId,
                    selectedMembershipType,
                } as any);

                if (result.success && result.paymentUrl) {
                    window.location.href = result.paymentUrl;
                } else {
                    setError(result.error || 'Failed to initiate payment. Please try again.');
                    setProcessing(false);
                }
            } else {
                // Membership payment flow
                await setDoc(doc(db, 'convention_registrations', orderId), {
                    uid: user.uid,
                    email: user.email,
                    prcLicense,
                    fullName,
                    birthdate,
                    sex,
                    mobile,
                    photoUrl,
                    paymentOption: payOption,
                    paymentMethod: payOption === 'Pay Now' ? selectedChannelCode : 'manual',
                    paymentReference: paymentReference || null,
                    baseFee,
                    convenienceFee: convFee,
                    totalFee: total,
                    orderId,
                    status: payOption === 'Pay Now' ? 'pending_payment' : 'pending_manual',
                    createdAt: serverTimestamp(),
                });

                // Link the payment to the user's membership application as well
                try {
                    const qApp = query(
                        collection(db, 'membership_applications'),
                        where('uid', '==', user.uid),
                        orderBy('createdAt', 'desc'),
                        limit(1)
                    );
                    const querySnap = await getDocs(qApp);
                    if (!querySnap.empty) {
                        const appDoc = querySnap.docs[0];
                        await updateDoc(doc(db, 'membership_applications', appDoc.id), {
                            paymentReference: paymentReference || null,
                            paymentOption: payOption,
                            paymentMethod: payOption === 'Pay Now' ? selectedChannelCode : 'manual',
                            paymentStatus: payOption === 'Pay Now' ? 'pending_payment' : 'pending_manual'
                        });
                    }
                } catch (err) {
                    console.error('Error linking payment to membership application:', err);
                }

                if (payOption === 'Manual Payment') {
                    notifyAdmin({
                        type: 'application',
                        title: 'Payment Proof Submitted',
                        body: `${fullName || user.email} submitted proof of manual payment for membership (₱${total.toLocaleString()}).`,
                        link: 'applications',
                    });
                    navigate(`/membership/payment/pending?orderId=${orderId}`);
                    return;
                }

                const result = await createPaycoolsPayment({
                    orderId,
                    amount: total,
                    currency: 'PHP',
                    description: 'PAHA Membership Registration Fee',
                    successUrl: `${window.location.origin}/membership/payment/success`,
                    cancelUrl: `${window.location.origin}/membership/payment?cancelled=true`,
                    callbackUrl: `${window.location.origin}/api/paycools/webhook/checkout`,
                    metadata: {
                        uid: user.uid,
                        email: user.email || '',
                        allowedChannelTypes: [selectedChannelType],
                        allowedChannelCodes: [selectedChannelCode],
                        customerName: fullName.trim(),
                        mobile: (() => {
                            const digits = mobile.replace(/\D/g, '');
                            const local = digits.replace(/^(63|0)/, '').slice(-10);
                            return '0' + local;
                        })(),
                    },
                });

                if (result.success && result.paymentUrl) {
                    window.location.href = result.paymentUrl;
                } else {
                    setError(result.error || 'Failed to initiate payment. Please try again.');
                    setProcessing(false);
                }
            }
        } catch (err: any) {
            console.error('[PaymentPage]', err);
            setError('An error occurred. Please try again.');
            setProcessing(false);
        }
    };


    if (checking || authLoading) {
        return <LoadingScreen message="PAHA • PREPARING SECURE PAYMENT PORTAL" />;
    }

    const inputCls = 'w-full h-11 px-4 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-slate-400';
    const labelCls = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-white/40 mb-2';

    const STEPS = [
        { num: 1 as Step, label: 'Personal Info', icon: 'person' },
        { num: 2 as Step, label: 'Payment',       icon: 'payments' },
    ];

    const MEMBERSHIP_BENEFITS = [
        { icon: 'verified',           text: 'Official PAHA membership card & certificate' },
        { icon: 'gavel',              text: 'Free legal advice and consultation' },
        { icon: 'school',             text: 'Priority access to seminars & CPD events' },
        { icon: 'groups',             text: 'Access to PAHA professional network' },
        { icon: 'local_hospital',     text: 'Clinic listing in the PAHA directory' },
        { icon: 'workspace_premium',  text: 'Exclusive member rates & benefits' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0A0F1A] font-display">

            {/* QR Code Modal */}
            {qrContent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQrContent('')}></div>
                    <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 max-w-sm w-full shadow-2xl relative z-10 animate-scale-up">
                        <p className="font-black text-slate-900 text-lg">Scan to Pay</p>
                        <QRCodeSVG value={qrContent} size={240} level="M" />
                        <p className="text-sm text-slate-500 text-center">Scan with GCash or any PH bank app</p>
                        <p className="text-2xl font-black text-primary">₱{total.toFixed(2)}</p>
                        <button
                            onClick={() => setQrContent('')}
                            className="mt-2 text-xs text-slate-400 underline underline-offset-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <header className="bg-[#0A0F1A] border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/members')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-primary hover:to-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border border-slate-700 hover:border-transparent shadow-lg shadow-black/40 hover:shadow-primary/20 hover:scale-[1.03] active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
                        Return to your account
                    </button>

                    {/* Payment Type Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
                        <button
                            id="pay-tab-membership"
                            onClick={() => setPaymentType('membership')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                paymentType === 'membership'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span>
                            <span className="hidden sm:inline">Membership Plan</span>
                        </button>
                        <button
                            id="pay-tab-accreditation"
                            onClick={() => isActiveMember && setPaymentType('accreditation')}
                            disabled={!isActiveMember}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                !isActiveMember
                                    ? 'opacity-40 cursor-not-allowed'
                                    : paymentType === 'accreditation'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'text-white/50 hover:text-white/80'
                            }`}
                            title={!isActiveMember ? 'Only active members can access Accreditation' : undefined}
                        >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                            <span className="hidden sm:inline">Accreditation</span>
                        </button>
                    </div>

                    <div className="hidden sm:block text-right">
                        <p className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-bold">Signed in as</p>
                        <p className="text-white/60 text-xs truncate max-w-[200px]">{user?.email}</p>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Left panel */}
                    <div className="lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-8 h-fit space-y-4">

                        {paymentType === 'membership' ? (
                            <>
                                {/* Membership card preview */}
                                {/* Membership card preview */}
                                <div 
                                    style={{
                                        background: cardDesign.backgroundType === 'solid' 
                                            ? cardDesign.solidColor 
                                            : cardDesign.backgroundType === 'image' 
                                                ? `url(${cardDesign.backgroundImageUrl}) center/cover no-repeat` 
                                                : `linear-gradient(${
                                                    cardDesign.gradientDirection === 'to-r' ? '90deg' 
                                                    : cardDesign.gradientDirection === 'to-b' ? '180deg' 
                                                    : cardDesign.gradientDirection === 'to-tr' ? '45deg' 
                                                    : '135deg'
                                                }, ${cardDesign.gradientStart}, ${cardDesign.gradientVia}, ${cardDesign.gradientEnd})`,
                                        color: cardDesign.textColor === 'light' ? '#FFFFFF' : '#0F172A'
                                    }}
                                    className="relative w-full max-w-[380px] aspect-[1.586/1] rounded-2xl p-5 shadow-xl overflow-hidden flex flex-col justify-between"
                                >
                                    {cardDesign.showPatternOverlay && (
                                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                                            <div className="absolute top-0 right-0 w-40 h-40 rounded-full border-4 border-current -translate-y-1/2 translate-x-1/2" />
                                            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full border-4 border-current translate-y-1/2 -translate-x-1/2" />
                                        </div>
                                    )}

                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-[7px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5">Philippine Animal Hospital Association</div>
                                                <div className="text-xs font-black tracking-tight">{cardDesign.cardTitle || 'MEMBERSHIP CARD'}</div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {cardDesign.icon === 'custom' && cardDesign.customIconUrl ? (
                                                    <img src={cardDesign.customIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-3xl">{cardDesign.icon === 'custom' ? 'pets' : cardDesign.icon}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3.5 my-auto">
                                            <div className="size-16 rounded-xl border border-current/25 bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {(uploadedPhotoUrl || profile?.photoUrl) ? (
                                                    <img src={uploadedPhotoUrl || profile?.photoUrl} alt="Profile" className="size-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-3xl opacity-75">account_circle</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div>
                                                    <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Member Name</div>
                                                    <div className="text-xs font-black tracking-wide leading-tight truncate">
                                                        {profile?.ownerName || fullName || profile?.fullName || profile?.displayName || 'Your Name'}
                                                    </div>
                                                </div>
<div>
    <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Facility</div>
    <div className="font-bold text-[10px] leading-tight truncate">
        {profile?.clinicName || 'Your Clinic'}
    </div>
</div>
<div>
    <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Mobile</div>
    <div className="font-bold text-[10px] leading-tight truncate">
        {formatPHMobile(profile?.phone || profile?.mobile || mobile || '') || '—'}
    </div>
</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end pt-2 border-t border-current/10">
                                            <div>
                                                <p className="text-[7px] opacity-60 uppercase tracking-wider mb-0.5">Valid Until</p>
                                                <p className="text-[10px] font-semibold">{liveUserMembershipDuration} {liveUserMembershipDuration === 1 ? 'year' : 'years'} from payment date</p>
                                            </div>
<div className="px-2 py-0.5 rounded bg-white/20 text-[8px] font-black uppercase tracking-wider">
                                                    {profile?.membershipType || profile?.type || 'Regular'}
                                                </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee summary */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30">Fee Summary</p>
                                        <div className="size-6 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 text-blue-500 flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-xs">receipt_long</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {/* Membership Fee Item */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-base">card_membership</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">Membership Fee</span>
                                                    <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                        {isRenewal ? 'Renewal / Recurring' : 'First-time Payment'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                                                ₱{liveUserMembershipFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {/* Processing Fee Item */}
                                        {paymentType === 'membership' && (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="material-symbols-outlined text-base">bolt</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Processing Fee</span>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                                                    ₱{liveAnnualMembershipProcessingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Total Row */}
                                        <div className="pt-1">
                                            <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
                                                        <span className="material-symbols-outlined text-base">payments</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">TOTAL</span>
                                                </div>
                                                <span className="text-lg font-black text-primary font-mono tracking-tight">
                                                    ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Benefits */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">What You Get</p>
                                    <div className="space-y-3">
                                        {MEMBERSHIP_BENEFITS.map((b, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                                                </div>
                                                <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{b.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Accreditation badge */}
                                <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-[#0A0F1A] rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full border-4 border-white/10 -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/60">PAHA</p>
                                                <p className="text-xs font-black leading-none">Accreditation Certificate</p>
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <p className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">Clinic</p>
                                            <p className="font-bold text-sm">{accApplication?.clinicName || profile?.clinicName || 'Your Clinic'}</p>
                                        </div>
                                        <div className="mb-2">
                                            <p className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">Validity</p>
                                            <p className="text-xs font-semibold">{liveAccreditationValidityYears} {liveAccreditationValidityYears === 1 ? 'year' : 'years'} from payment date</p>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30">
                                            <span className="material-symbols-outlined text-emerald-300 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                                            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider">Accreditation Payment</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Accreditation Fee Summary */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30">Statement of Account</p>
                                        <div className="size-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-xs">receipt_long</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {/* Accreditation Fee */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-base">verified_user</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-white">Accreditation Fee</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                                ₱{liveAccreditationFee.toLocaleString()}.00
                                            </span>
                                        </div>

                                        {/* Processing Fee */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-base">bolt</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Processing Fee</span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                                                ₱{liveAccreditationProcessingFee.toLocaleString()}.00
                                            </span>
                                        </div>

                                        {/* Optional Membership Add-on */}
                                        {selectedMembershipType !== 'None' && (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="material-symbols-outlined text-base">card_membership</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selectedMembershipType} Membership</span>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                    +₱{(liveMembershipFees[selectedMembershipType] || 0).toLocaleString()}.00
                                                </span>
                                            </div>
                                        )}

                                        {/* Total Due Row */}
                                        <div className="pt-1">
                                            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                                                        <span className="material-symbols-outlined text-base">payments</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">TOTAL DUE</span>
                                                </div>
                                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                                                    ₱{total.toLocaleString()}.00
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 p-4">
                            <div className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-primary text-base mt-0.5">support_agent</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-white mb-0.5">Need help?</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Email <a href="mailto:paha_members@yahoo.com" className="text-primary font-semibold">paha_members@yahoo.com</a></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right panel — form */}
                    <div className="flex-1 min-w-0">

                        {/* Stepper */}
                        <div className="flex items-center mb-6">
                            {STEPS.map((s, i) => {
                                const status = step > s.num ? 'done' : step === s.num ? 'active' : 'pending';
                                return (
                                    <React.Fragment key={s.num}>
                                        <div className="flex flex-col items-center min-w-0">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm
                                                ${status === 'done'   ? 'bg-emerald-500 border-emerald-500 shadow-emerald-500/30'
                                                : status === 'active' ? 'bg-primary border-primary shadow-primary/30'
                                                :                       'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                                                {status === 'done'
                                                    ? <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                                    : <span className={`material-symbols-outlined text-base ${status === 'active' ? 'text-white' : 'text-slate-400 dark:text-white/30'}`}>{s.icon}</span>
                                                }
                                            </div>
                                            <p className={`text-[10px] font-black mt-1.5 uppercase tracking-wider whitespace-nowrap hidden sm:block
                                                ${status === 'active' ? 'text-primary' : status === 'done' ? 'text-emerald-500' : 'text-slate-400 dark:text-white/30'}`}>
                                                {s.label}
                                            </p>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-3 mb-5 sm:mb-0 rounded-full transition-all
                                                ${step > s.num ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-white/10'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl text-sm text-red-700 dark:text-red-400">
                                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
                                {error}
                            </div>
                        )}

                        {/* ── STEP 1: Personal Info ── */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Personal Information</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your details will appear on your PAHA membership card.</p>
                                    </div>
                                    <button 
                                        onClick={handleRefresh}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all active:scale-[0.98] shadow-sm select-none border border-slate-200/50 dark:border-white/5 shrink-0 self-start sm:self-center"
                                        title="Clear all fields in the form"
                                    >
                                        <span className="material-symbols-outlined text-sm font-black">sync</span>
                                        REFRESH FORM
                                    </button>
                                </div>

                                {/* Personal Details & Profile Photo */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">Personal Details</p>
                                    
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Profile Photo upload block */}
                                        <div className="md:w-1/3 flex flex-col justify-start">
                                            <label htmlFor="profilePhoto" className={labelCls + " block mb-1"}>Profile Photo <span className="text-red-500">*</span></label>
                                            <p className="text-[10px] text-slate-400 dark:text-white/30 mb-3 leading-normal">Front-facing, plain background. Used on your membership card.</p>
                                            <div
                                                className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-3 text-center cursor-pointer hover:border-primary hover:bg-primary/[0.03] transition-all flex flex-col items-center justify-center min-h-[110px] flex-1 shadow-sm"
                                                onClick={() => photoRef.current?.click()}
                                            >
                                                {photoPreview ? (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <img src={photoPreview} alt="Preview" className="size-16 object-cover rounded-xl shadow-lg ring-2 ring-primary/30" />
                                                        <p className="text-[10px] text-primary font-bold">Click to change</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="size-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1.5 shadow-sm">
                                                            <span className="material-symbols-outlined text-xl">cloud_upload</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-white">
                                                            <span className="text-primary">Click to upload</span>
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5">JPG, PNG up to 5MB</p>
                                                    </>
                                                )}
                                            </div>
                                            <input ref={photoRef} id="profilePhoto" name="profilePhoto" type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
                                        </div>

                                        {/* Form Details */}
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="birthdate" className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                                                <CustomDatePicker 
                                                    id="birthdate" 
                                                    value={birthdate} 
                                                    onChange={setBirthdate} 
                                                    className={inputCls} 
                                                    leftIcon="calendar_month"
                                                    iconColor="text-blue-500"
                                                    iconBg="bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20"
                                                />
                                            </div>
                                            <div>
                                                <CustomSelect
                                                    id="sex"
                                                    label="Sex"
                                                    value={sex}
                                                    onChange={setSex}
                                                    placeholder="Select"
                                                    required
                                                    options={[
                                                        { value: "Male", label: "Male", icon: "male", iconColor: "text-blue-500", iconBg: "bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20" },
                                                        { value: "Female", label: "Female", icon: "female", iconColor: "text-pink-500", iconBg: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200/50 dark:border-pink-500/20" }
                                                    ]}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label htmlFor="mobile" className={labelCls}>Personal Mobile No. <span className="text-red-500">*</span></label>
                                                 <div className="flex gap-2 items-stretch mt-1.5">
                                                     <div className="flex items-center gap-1.5 px-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white select-none shadow-sm">
                                                         <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm shadow-sm shrink-0 border border-slate-200/20" aria-hidden="true">
                                                             <rect width="30" height="20" fill="#f5f5f5"/>
                                                             <rect width="30" height="10" fill="#0038A8"/>
                                                             <rect y="10" width="30" height="10" fill="#CE1126"/>
                                                             <path d="M0,0 L17.32,10 L0,20 Z" fill="#FFFFFF"/>
                                                             <circle cx="5.77" cy="10" r="2" fill="#FCD116"/>
                                                             <polygon points="5.77,8.2 6.1,8.9 6.8,8.9 6.3,9.3 6.5,10 6,9.6 5.5,10 5.7,9.3 5.2,8.9 5.9,8.9" fill="#FCD116"/>
                                                             <polygon points="1.5,4.5 1.7,5.0 2.2,5.0 1.8,5.3 1.9,5.8 1.5,5.5 1.1,5.8 1.2,5.3 0.8,5.0 1.3,5.0" fill="#FCD116"/>
                                                             <polygon points="1.5,15.5 1.7,16.0 2.2,16.0 1.8,16.3 1.9,16.8 1.5,16.5 1.1,16.8 1.2,16.3 0.8,16.0 1.3,16.0" fill="#FCD116"/>
                                                         </svg>
                                                         <span>+63</span>
                                                     </div>
                                                     <div className="relative flex-1">
                                                         <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-500 pointer-events-none shadow-sm">
                                                             <span className="material-symbols-outlined text-base font-medium">smartphone</span>
                                                         </div>
                                                         <input 
                                                             id="mobile" 
                                                             name="mobile" 
                                                             type="tel" 
                                                             value={cleanPhoneInput(mobile)} 
                                                             onChange={e => {
                                                                 setMobile(cleanPhoneInput(e.target.value));
                                                             }}
                                                             maxLength={10}
                                                             className={inputCls + ' pl-11'} 
                                                             placeholder="9773590258" 
                                                         />
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account & License */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">Account & License</p>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="email" className={labelCls}>Email Address</label>
                                                <div className="relative">
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-amber-500 pointer-events-none shadow-sm">
                                                        <span className="material-symbols-outlined text-base font-medium">alternate_email</span>
                                                    </div>
                                                    <input id="email" name="email" type="email" value={user?.email || ''} readOnly
                                                        className={inputCls + ' bg-slate-50 dark:bg-white/[0.03] text-slate-400 cursor-not-allowed pl-11 pr-10'} />
                                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="emailConfirm" className={labelCls}>Confirm Email Address <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-500 pointer-events-none shadow-sm">
                                                        <span className="material-symbols-outlined text-base font-medium">mark_email_read</span>
                                                    </div>
                                                    <input id="emailConfirm" name="emailConfirm" type="email" value={emailConfirm} onChange={e => setEmailConfirm(e.target.value)}
                                                        className={inputCls + ' pl-11'} placeholder="Re-enter your email address" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="prcLicense" className={labelCls}>PRC License No. <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/50 dark:border-cyan-500/20 text-cyan-500 pointer-events-none shadow-sm">
                                                        <span className="material-symbols-outlined text-base font-medium">verified</span>
                                                    </div>
                                                    <input id="prcLicense" name="prcLicense" type="text" value={prcLicense} onChange={e => setPrcLicense(e.target.value)}
                                                        className={inputCls + ' pl-11'} placeholder="e.g. 0012345" />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="facilityName" className={labelCls}>Facility / Clinic Name</label>
                                                <div className="relative">
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 text-teal-500 pointer-events-none shadow-sm">
                                                        <span className="material-symbols-outlined text-base font-medium">domain</span>
                                                    </div>
                                                    <input id="facilityName" name="facilityName" type="text" value={facilityName} onChange={e => setFacilityName(e.target.value)}
                                                        className={inputCls + ' pl-11'} placeholder="Enter facility or clinic name" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Representative Name */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">Representative Name</p>
                                    <div>
                                        <label htmlFor="fullName" className={labelCls}>Representative Name <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 text-rose-500 pointer-events-none shadow-sm">
                                                <span className="material-symbols-outlined text-base font-medium">person</span>
                                            </div>
                                            <input id="fullName" name="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls + ' pl-11'} placeholder="Enter full name" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button onClick={next}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/30 transition-all active:scale-[0.98]">
                                        Continue <span className="material-symbols-outlined text-base">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: Payment ── */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Membership Fee & Payment</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose how you'd like to pay your annual membership fee.</p>
                                    {gatewaySettings?.appName && (
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-xs">verified_user</span> Secure Payments by PayCools for {gatewaySettings.appName}
                                        </p>
                                    )}
                                </div>

                                {/* Mobile fee summary */}
                                <div className="lg:hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
                                                <span className="material-symbols-outlined text-base">payments</span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Total Due</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">₱{baseFee.toFixed(2)} membership fee</span>
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-primary font-mono tracking-tight">₱{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Payment Option */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">Payment Option</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {([
                                            { id: 'Pay Now' as PayOption,        icon: 'bolt',         title: 'Pay Now',         desc: 'Pay online instantly. Account activated upon payment confirmation.' },
                                            { id: 'Manual Payment' as PayOption, icon: 'receipt_long',  title: 'Manual Payment',  desc: 'Pay via bank deposit and submit proof of payment to PAHA.' },
                                        ]).map(opt => (
                                            <div key={opt.id} onClick={() => setPayOption(opt.id)}
                                                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                                                    ${payOption === opt.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                                                <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0
                                                    ${payOption === opt.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-black ${payOption === opt.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{opt.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                                                </div>
                                                <div className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1.5
                                                    ${payOption === opt.id ? 'border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                                    {payOption === opt.id && <div className="size-2 rounded-full bg-primary" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                {payOption === 'Pay Now' && (
                                    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-4">Payment Method</p>
                                        <div className="space-y-3">
                                            {displayChannels.length === 0 ? (
                                                <div className="text-center py-6 text-slate-400 text-sm font-semibold">
                                                    Loading available channels...
                                                </div>
                                            ) : (
                                                displayChannels.map(ch => {
                                                    const isSelected = selectedChannelCode === ch.channelCode;
                                                    let icon = 'payments';
                                                    if (ch.channelType === 'EWALLET') icon = 'bolt';
                                                    else if (ch.channelType === 'CARD') icon = 'credit_card';
                                                    else if (ch.channelType === 'ONLINE_BANKING') icon = 'account_balance';
                                                    else if (ch.channelType === 'QR') icon = 'qr_code_2';

                                                    const label = getFriendlyChannelLabel(ch.channelCode);

                                                    return (
                                                        <div key={ch.channelCode} onClick={() => {
                                                            setSelectedChannelCode(ch.channelCode);
                                                            setSelectedChannelType(ch.channelType);
                                                        }}
                                                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                                                                ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-primary/40'}`}>
                                                            <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0
                                                                ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-base">{icon}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{label}</p>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">{ch.channelType.replace('_', ' ')}</p>
                                                            </div>
                                                            <div className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                                                ${isSelected ? 'border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                                                {isSelected && <div className="size-2 rounded-full bg-primary" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                 {payOption === 'Manual Payment' && (
                                     <div className="space-y-4">
                                         <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
                                             <div className="flex items-start gap-3">
                                                 <span className="material-symbols-outlined text-amber-500 text-xl flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                                 <div>
                                                     <p className="text-sm font-black text-amber-800 dark:text-amber-400 mb-2">Manual Payment Instructions</p>
                                                     <div className="space-y-1.5 text-xs text-amber-700 dark:text-amber-500">
                                                         <p>1. Deposit ₱{baseFee.toFixed(2)} to the PAHA bank account:</p>
                                                         <div className="my-2 p-3 bg-white/50 dark:bg-black/20 border border-amber-200/50 dark:border-amber-500/10 rounded-xl space-y-1 font-mono text-[11px] text-slate-800 dark:text-slate-300">
                                                             <p><strong>Bank Name:</strong> UnionBank of the Philippines</p>
                                                             <p><strong>Account Name:</strong> Philippine Animal Hospital Association, Inc.</p>
                                                             <p><strong>Account Number:</strong> 1023-4567-8901</p>
                                                         </div>
                                                         <p>2. Upload your proof of payment (deposit slip, online transfer screenshot, or receipt) below.</p>
                                                         <p>3. Account activated within 2–3 business days after verification.</p>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                         <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                             <label htmlFor="proofOfPayment" className={labelCls + " block mb-1"}>Proof of Payment <span className="text-red-500">*</span></label>
                                             <p className="text-[10px] text-slate-400 dark:text-white/30 mb-3 leading-normal">Upload your transaction receipt. Accepted formats: PDF, Images (JPG, PNG), or Word Docs (DOC, DOCX).</p>
                                             
                                             <div
                                                 className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center min-h-[140px]"
                                                 onClick={() => proofInputRef.current?.click()}
                                             >
                                                 {proofFile ? (
                                                     <div className="flex flex-col items-center gap-3">
                                                         {proofPreviewUrl ? (
                                                             <img src={proofPreviewUrl} alt="Receipt Preview" className="max-h-24 object-contain rounded-xl shadow-lg border border-slate-100 dark:border-white/5" />
                                                         ) : (
                                                             <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                                 <span className="material-symbols-outlined text-2xl">description</span>
                                                             </div>
                                                         )}
                                                         <div className="text-center">
                                                             <p className="text-xs font-bold text-slate-800 dark:text-white max-w-[200px] truncate">{proofFileName}</p>
                                                             <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">Click or drag to replace file</p>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <>
                                                         <div className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-2">
                                                             <span className="material-symbols-outlined text-slate-400 text-xl">upload_file</span>
                                                         </div>
                                                         <p className="text-xs font-semibold text-slate-700 dark:text-white">
                                                             <span className="text-primary">Click to upload</span> or drag and drop
                                                         </p>
                                                         <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1">PDF, JPG, PNG, DOC, DOCX up to 5MB</p>
                                                     </>
                                                 )}
                                             </div>
                                             <input 
                                                 ref={proofInputRef} 
                                                 id="proofOfPayment" 
                                                 name="proofOfPayment" 
                                                 type="file" 
                                                 accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                                 className="hidden" 
                                                 onChange={handleProofFileChange} 
                                             />
                                         </div>
                                     </div>
                                 )}

                                {/* Terms */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-3">Terms & Consent</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                        By submitting, you confirm all information is true and accurate. Your data will be processed per the Data Privacy Act of 2012 for PAHA membership purposes only. Membership fees are non-refundable once processed.
                                    </p>
                                    <label htmlFor="agreeTerms" className="flex items-start gap-3 cursor-pointer group">
                                        <input 
                                            id="agreeTerms" 
                                            name="agreeTerms" 
                                            type="checkbox" 
                                            checked={agreed} 
                                            onChange={e => setAgreed(e.target.checked)} 
                                            className="sr-only" 
                                        />
                                        <div className={`size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                                            ${agreed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20 group-hover:border-primary/50'}`}>
                                            {agreed && <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                                        </div>
                                        <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            I agree to the PAHA membership terms, data privacy consent, and refund policy. <span className="text-red-500">*</span>
                                        </span>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button onClick={back}
                                        className="flex items-center gap-2 px-6 py-3.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                        <span className="material-symbols-outlined text-base">chevron_left</span> Back
                                    </button>
                                    <button onClick={handleSubmit} disabled={processing}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
                                        {processing ? (
                                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" /> Processing...</>
                                        ) : payOption === 'Pay Now' ? (
                                            <><span className="material-symbols-outlined text-base">payments</span> Pay ₱{total.toFixed(2)}</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-base">send</span> Send Registration</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
