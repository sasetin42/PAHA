import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import { cleanPhoneInput } from '../utils/phone';

interface FAQItem {
    question: string;
    answer: string;
}

const Contact: React.FC = () => {
    const { addMessage } = useAdmin();

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [service, setService] = useState('Accreditation');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [contactMethod, setContactMethod] = useState('Email');
    const [contactTime, setContactTime] = useState('Morning');
    const [urgency, setUrgency] = useState('Normal');
    const [agree, setAgree] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [captchaChecked, setCaptchaChecked] = useState(false);

    // Form status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Live typing status
    const [_typingText, setTypingText] = useState('');
    const messageTemplate = "Hello PAHA Support, I would like to inquire about...";

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            if (index < messageTemplate.length) {
                setTypingText(prev => prev + messageTemplate.charAt(index));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 60);
        return () => clearInterval(interval);
    }, []);

    // FAQ state
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    // Stats counter state
    const [_stats, setStats] = useState({
        responseTime: 0,
        satisfaction: 0,
        clients: 0,
        transactions: 0
    });

    useEffect(() => {
        const duration = 1500; // ms
        const steps = 50;
        const stepTime = duration / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            setStats({
                responseTime: Math.min(Math.round((24 / steps) * step), 24),
                satisfaction: Math.min(Math.round((98 / steps) * step), 98),
                clients: Math.min(Math.round((15000 / steps) * step), 15000),
                transactions: Math.min(Math.round((99 / steps) * step), 99)
            });

            if (step >= steps) {
                clearInterval(timer);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, []);

    // Business hours calculation
    const [businessStatus, setBusinessStatus] = useState({
        isOpen: false,
        text: 'Closed',
        countdownText: ''
    });

    useEffect(() => {
        const updateStatus = () => {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();


            // Mon-Fri: 8:00 AM - 5:00 PM (8 to 17)
            if (day >= 1 && day <= 5) {
                if (hour >= 8 && hour < 17) {
                    const closingTime = new Date(now);
                    closingTime.setHours(17, 0, 0, 0);
                    const diffMs = closingTime.getTime() - now.getTime();
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    
                    setBusinessStatus({
                        isOpen: true,
                        text: 'Open Now',
                        countdownText: `${diffHrs}h ${diffMins}m until closing`
                    });
                    return;
                }
            }
            
            setBusinessStatus({
                isOpen: false,
                text: 'Closed Now',
                countdownText: 'Opens Monday at 8:00 AM'
            });
        };

        updateStatus();
        const interval = setInterval(updateStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    // Floating widget state
    const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // File upload handler
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                alert('File size exceeds 10MB limit.');
                return;
            }
            setAttachedFile(file);
        }
    };

    // Form submission validation
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!firstName.trim()) errors.firstName = 'First Name is required.';
        if (!lastName.trim()) errors.lastName = 'Last Name is required.';
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errors.email = 'Valid Email is required.';
        if (!phone.trim()) errors.phone = 'Phone number is required.';
        else if (phone.length !== 10) errors.phone = 'Phone number must be exactly 10 digits.';
        if (!message.trim()) errors.message = 'Message is required.';
        if (!agree) errors.agree = 'You must agree to the privacy policy.';
        if (!captchaChecked) errors.captcha = 'Please verify the CAPTCHA.';

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors({});
        setIsSubmitting(true);

        // Simulate submission
        setTimeout(() => {
            addMessage({
                firstName,
                lastName,
                email,
                message: `[Urgency: ${urgency}] [Service: ${service}] [Method: ${contactMethod} - Time: ${contactTime}] ${message}`
            });
            setIsSubmitting(false);
            setSubmitSuccess(true);
            
            // Reset
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhone('');
            setSubject('');
            setMessage('');
            setAgree(false);
            setAttachedFile(null);
            setCaptchaChecked(false);
        }, 1500);
    };

    const faqs: FAQItem[] = [
        {
            question: 'How long is the response time?',
            answer: 'We typically respond to all standard inquiries within 24 hours. Priority and urgent submissions are routed directly to our officers for immediate review.'
        },
        {
            question: 'What services does PAHA offer?',
            answer: 'PAHA handles animal clinic certifications and accreditations, companion animal clinical standards, continuing education programs (CPE), national workshops, and member advocacy support.'
        },
        {
            question: 'Can I apply for accreditation online?',
            answer: 'Yes! Certified veterinary practitioners can apply for hospital/clinic accreditation online directly through the Member Dashboard after log-in verification.'
        },
        {
            question: 'Do you accept walk-in inquiries?',
            answer: 'Yes, our national headquarters in Marikina is open to members and standard applicants Monday to Friday, from 8:00 AM to 5:00 PM.'
        },
        {
            question: 'How do I submit physical documents?',
            answer: 'You can upload digital scans directly using the secure file attach field in this form, or mail physical envelopes to our head office address.'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-background-dark-black font-sans text-slate-900 dark:text-white relative overflow-hidden transition-all duration-300">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
            
            <main className="hero-pt px-6 max-w-7xl mx-auto pb-16 md:pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    
                    {/* Left Column: Information, Stats, Map, Accreditations */}
                    <div className="lg:col-span-7 space-y-12">
                        
                        {/* Section Header */}
                        <div className="space-y-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-white text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                CONTACT US
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                                Get in Touch with <span className="text-primary">PAHA</span>
                            </h1>
                            <p className="text-sm md:text-base text-slate-550 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
                                Have questions about our veterinary accreditation, membership application, or portal services? Our support team is ready to help. Send us a message or reach us using any of the contact methods below.
                            </p>
                        </div>

                        {/* Staggered Premium Contact Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {[
                                {
                                    icon: 'location_on',
                                    title: 'Office Address',
                                    info: '46 Pres. Quezon St.',
                                    desc: 'Marikina City',
                                    color: 'from-amber-400 to-orange-500 shadow-orange-500/10'
                                },
                                {
                                    icon: 'mail',
                                    title: 'Email',
                                    info: 'secretariat@phaa.org.ph',
                                    desc: 'Email inquiries & support',
                                    color: 'from-blue-400 to-indigo-500 shadow-blue-500/10'
                                },
                                {
                                    icon: 'call',
                                    title: 'Phone',
                                    info: '+63 2 8955 1234',
                                    desc: 'Direct customer service helpline',
                                    color: 'from-emerald-400 to-teal-500 shadow-emerald-500/10'
                                },
                                {
                                    icon: 'schedule',
                                    title: 'Office Hours',
                                    info: 'Monday–Friday',
                                    desc: '8:00 AM – 5:00 PM',
                                    color: 'from-purple-400 to-pink-500 shadow-purple-500/10'
                                }
                            ].map((card, idx) => (
                                <div key={idx} className="group p-6 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 size-32 bg-gradient-to-br ${card.color} opacity-[0.01] group-hover:opacity-[0.04] transition-opacity rounded-bl-full`}></div>
                                    <div className="flex gap-4 items-start">
                                        <div className={`size-11 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                                            <span className="material-symbols-outlined text-xl">{card.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">{card.title}</h4>
                                            <p className="text-sm font-black text-slate-800 dark:text-white leading-snug group-hover:text-primary transition-colors">{card.info}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">{card.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Live Business Hours Banner */}
                        <div className="p-5 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className={`flex h-3 w-3 relative shrink-0`}>
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${businessStatus.isOpen ? 'bg-emerald-450' : 'bg-red-450'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${businessStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{businessStatus.text}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{businessStatus.countdownText}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-350 px-3 py-1 rounded-lg">
                                    Standard PH Time (PST)
                                </span>
                            </div>
                        </div>



                        {/* Social Media Link Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 rounded-[24px] bg-slate-50 dark:bg-slate-900/20 border border-slate-200/40 dark:border-white/5">
                            <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Follow PAHA updates:</span>
                            <div className="flex gap-2">
                                {[
                                    { name: 'Facebook', icon: 'groups', color: 'hover:bg-blue-600' },
                                    { name: 'Messenger', icon: 'chat', color: 'hover:bg-cyan-500' },
                                    { name: 'Instagram', icon: 'photo_camera', color: 'hover:bg-pink-600' },
                                    { name: 'LinkedIn', icon: 'group', color: 'hover:bg-sky-600' },
                                    { name: 'YouTube', icon: 'play_circle', color: 'hover:bg-red-650' }
                                ].map((soc, idx) => (
                                    <button
                                        key={idx}
                                        className={`size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-white transition-all duration-300 ${soc.color} shadow-sm`}
                                        aria-label={soc.name}
                                    >
                                        <span className="material-symbols-outlined text-base">{soc.icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upgrade Google Maps Card */}
                        <div className="rounded-[24px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg h-[300px] relative group">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.55123456789!2d121.0965!3d14.6333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDM4JzAwLjAiTiAxMjHCsDA1JzQ3LjQiRQ!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen={false} 
                                loading="lazy" 
                                className="grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                                title="PAHA HQ Map"
                            ></iframe>
                            <div className="absolute top-4 left-4 bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-2xl shadow-md border border-white/20 p-4">
                                <p className="text-[9px] font-extrabold uppercase text-primary mb-0.5 tracking-wider">National Office</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">Marikina City HQ</p>
                                <div className="flex gap-2 mt-3">
                                    <a
                                        href="https://maps.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-bold bg-primary text-white px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-primary-dark transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[10px]">directions</span> Directions
                                    </a>
                                    <a
                                        href="https://maps.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-bold border border-slate-200 dark:border-white/10 dark:text-white px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        Open Map
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Premium Contact Form */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 rounded-[32px] border border-slate-150 dark:border-white/5 shadow-xl relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
                        
                        <div className="mb-8">
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Send Inquiry</h3>
                            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mt-1.5 tracking-wider">Veterinary Standards Support</p>
                        </div>

                        {submitSuccess ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                                    <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Message Transmitted</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    Your inquiry has been successfully received by the PAHA secretariat team. A confirmation mail has been queued.
                                </p>
                                <button
                                    onClick={() => setSubmitSuccess(false)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    Submit Another Inquiry
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                
                                {/* Names */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="contact-firstName" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">First Name</label>
                                        <input
                                            id="contact-firstName"
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5"
                                            placeholder="Enter first name"
                                        />
                                        {validationErrors.firstName && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.firstName}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="contact-lastName" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Last Name</label>
                                        <input
                                            id="contact-lastName"
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5"
                                            placeholder="Enter last name"
                                        />
                                        {validationErrors.lastName && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.lastName}</p>}
                                    </div>
                                </div>

                                {/* Email & Phone */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="contact-email" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Email Address</label>
                                        <input
                                            id="contact-email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5"
                                            placeholder="Enter email address"
                                        />
                                        {validationErrors.email && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.email}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="contact-phone" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Phone Number</label>
                                        <div className="relative flex items-center w-full">
                                            <div className="absolute left-3 flex items-center gap-1.5 text-xs font-bold text-slate-555 dark:text-slate-400 select-none pointer-events-none">
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
                                                <span className="font-semibold">+63</span>
                                            </div>
                                            <input
                                                id="contact-phone"
                                                type="tel"
                                                required
                                                value={cleanPhoneInput(phone)}
                                                onChange={(e) => {
                                                    setPhone(cleanPhoneInput(e.target.value));
                                                }}
                                                maxLength={10}
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-16 pr-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5"
                                                placeholder="900 000 0000"
                                            />
                                        </div>
                                        {validationErrors.phone && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.phone}</p>}
                                    </div>
                                </div>

                                {/* Service Needed Dropdown */}
                                <div className="space-y-1">
                                    <label htmlFor="contact-service" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Service Needed</label>
                                    <select
                                        id="contact-service"
                                        value={service}
                                        onChange={(e) => setService(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-350 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                    >
                                        <option value="Membership Application">Membership Application</option>
                                        <option value="Accreditation Requirements">Accreditation Requirements</option>
                                        <option value="Technical & Portal Support">Technical & Portal Support</option>
                                        <option value="Events & Conventions">Events & Conventions</option>
                                        <option value="Payments & Billing">Payments & Billing</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Subject */}
                                <div className="space-y-1">
                                    <label htmlFor="contact-subject" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Subject</label>
                                    <input
                                        id="contact-subject"
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5"
                                        placeholder="Subject of inquiry"
                                    />
                                </div>

                                {/* Message */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="contact-message" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Message</label>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                            {message.length} chars
                                        </span>
                                    </div>
                                    <textarea
                                        id="contact-message"
                                        required
                                        rows={4}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/5 resize-none"
                                        placeholder="Type your message here..."
                                    ></textarea>
                                    {validationErrors.message && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.message}</p>}
                                </div>

                                {/* Preferred Contact Method */}
                                <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2">
                                    <p className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1 block">Preferred Contact Method</p>
                                    <div className="flex gap-6 pl-1">
                                        {['Email', 'Phone', 'Messenger'].map(m => (
                                            <label key={m} className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                                                <input
                                                    type="radio"
                                                    id={`contact-method-${m}`}
                                                    name="contactMethod"
                                                    value={m}
                                                    checked={contactMethod === m}
                                                    onChange={() => setContactMethod(m)}
                                                    className="text-primary focus:ring-primary h-4 w-4 border-slate-350"
                                                />
                                                <span>{m}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Urgency & Callback Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="contact-urgency" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Urgency</label>
                                        <select
                                            id="contact-urgency"
                                            value={urgency}
                                            onChange={(e) => setUrgency(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-350 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                        >
                                            <option value="Normal">Normal</option>
                                            <option value="Priority">Priority</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="contact-time" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1">Preferred Callback Time</label>
                                        <select
                                            id="contact-time"
                                            value={contactTime}
                                            onChange={(e) => setContactTime(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-350 focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                                        >
                                            <option value="Morning">Morning (8:00 AM - 12:00 PM)</option>
                                            <option value="Afternoon">Afternoon (1:00 PM - 5:00 PM)</option>
                                            <option value="Evening">Evening (Callback via Email)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* File Attachment Upload */}
                                <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-3">
                                    <label htmlFor="contact-attachment" className="text-[10px] font-extrabold uppercase text-slate-450 dark:text-slate-500 ml-1 block">Attach Support Document (Max 10MB)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 border border-slate-200 dark:border-white/10 dark:text-white hover:bg-slate-55 dark:hover:bg-white/5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-sm">attach_file</span>
                                            {attachedFile ? 'Change File' : 'Upload File'}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            id="contact-attachment"
                                            name="contactAttachment"
                                            type="file"
                                            accept=".pdf,.jpg,.png"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        {attachedFile && (
                                            <span className="text-[10px] text-emerald-500 font-bold truncate max-w-[150px]">
                                                {attachedFile.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Supported formats: PDF, JPG, PNG</p>
                                </div>

                                {/* CAPTCHA Mock Verification */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between shadow-sm">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="contact-captcha"
                                            name="contactCaptcha"
                                            checked={captchaChecked}
                                            onChange={(e) => setCaptchaChecked(e.target.checked)}
                                            className="text-primary focus:ring-primary h-4.5 w-4.5 rounded"
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">I'm not a robot</span>
                                    </label>
                                    <div className="flex flex-col items-center leading-none">
                                        <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">reCAPTCHA</span>
                                    </div>
                                </div>
                                {validationErrors.captcha && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.captcha}</p>}

                                {/* Privacy agreement */}
                                <div className="space-y-1">
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="contact-agree"
                                            name="contactAgree"
                                            checked={agree}
                                            onChange={(e) => setAgree(e.target.checked)}
                                            className="text-primary focus:ring-primary h-4.5 w-4.5 rounded mt-0.5"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                                            I agree to the <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a> to store my message details.
                                        </span>
                                    </label>
                                    {validationErrors.agree && <p className="text-[9px] text-red-500 font-bold ml-1">{validationErrors.agree}</p>}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full relative group/btn py-4 px-6 rounded-2xl overflow-hidden shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-primary group-hover/btn:scale-110 transition-transform"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2.5 text-white text-xs font-bold uppercase tracking-wider">
                                        {isSubmitting ? (
                                            <>
                                                <span>Processing...</span>
                                                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Message</span>
                                                <span className="material-symbols-outlined text-base">send</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* FAQ Section Accordion below */}
                <div className="mt-20 space-y-6">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                            FAQ
                        </span>
                        <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 dark:text-white mt-6 mb-2">Frequently Asked Questions</h2>
                        <p className="text-slate-500 dark:text-slate-450 text-xs md:text-sm font-semibold">Find quick answers to common inquiries about PAHA services and portal operations.</p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4 pt-6">
                        {faqs.map((faq, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-white/5 overflow-hidden transition-all duration-300 shadow-sm">
                                <button
                                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-slate-900 dark:text-white"
                                >
                                    <span>{faq.question}</span>
                                    <span className={`material-symbols-outlined transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                                        expand_more
                                    </span>
                                </button>
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaqIndex === idx ? 'max-h-40 border-t border-slate-100 dark:border-white/5' : 'max-h-0'}`}>
                                    <div className="p-5 text-xs md:text-sm text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Emergency Highlight Section */}
                <div className="mt-20 p-6 sm:p-8 rounded-[28px] bg-gradient-to-r from-rose-500 to-red-650 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div>
                        <h3 className="text-xl font-black mb-1">Need Immediate Administrative Assistance?</h3>
                        <p className="text-white/80 text-xs md:text-sm font-semibold">Contact our support center line for urgent issues relating to accreditations or verification codes.</p>
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="tel:+63289551234"
                            className="bg-white text-rose-600 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:bg-rose-50 transition-all flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">call</span> Call Us Now
                        </a>
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-sm">chat</span> Messenger
                        </a>
                    </div>
                </div>



            </main>

            {/* Bottom-Right Floating Contact Widget */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3.5">
                {isWidgetExpanded && (
                    <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl shadow-2xl transition-all scale-100 origin-bottom-right">
                        {[
                            { name: 'Messenger', url: 'https://m.me/paha', icon: 'chat', color: 'bg-cyan-500' },
                            { name: 'Direct Phone', url: 'tel:+63289551234', icon: 'call', color: 'bg-emerald-500' },
                            { name: 'Mail Support', url: 'mailto:secretariat@paha.org.ph', icon: 'mail', color: 'bg-purple-500' }
                        ].map((wid, idx) => (
                            <a
                                key={idx}
                                href={wid.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-xl transition-all"
                            >
                                <div className={`size-8 rounded-lg ${wid.color} text-white flex items-center justify-center`}>
                                    <span className="material-symbols-outlined text-sm">{wid.icon}</span>
                                </div>
                                <span className="text-xs font-bold dark:text-white">{wid.name}</span>
                            </a>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2">
                    {showBackToTop && (
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="size-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                            aria-label="Back to Top"
                        >
                            <span className="material-symbols-outlined">arrow_upward</span>
                        </button>
                    )}
                    
                    <button
                        onClick={() => setIsWidgetExpanded(!isWidgetExpanded)}
                        className="size-12 rounded-full bg-primary hover:bg-primary-dark text-white shadow-2xl flex items-center justify-center hover:rotate-12 transition-all active:scale-95"
                        aria-label="Toggle Quick Contact Menu"
                    >
                        <span className="material-symbols-outlined text-2xl">
                            {isWidgetExpanded ? 'close' : 'support_agent'}
                        </span>
                    </button>
                </div>
            </div>
            
        </div>
    );
};

export default Contact;
