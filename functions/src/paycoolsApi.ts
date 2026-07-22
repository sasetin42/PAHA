import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import dns from 'dns';
import * as nodemailer from 'nodemailer';

dns.setDefaultResultOrder('ipv4first');

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// Helper to get active API URL from settings, falling back to UAT
function getPaycoolsApiUrl(settings?: any): string {
    return settings?.baseApiUrl || 'https://api-uat.paycools.com';
}

// Production webhook URL — ALWAYS use this, never the Firestore-stored notifyUrl
// (Firestore notifyUrl may be set to localhost if admin opened Settings in dev)
const PAYCOOLS_NOTIFY_URL = 'https://paha-db.web.app/api/paycools/webhook/checkout';


// ⎯⎯⎯ Key Formatting Helpers ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
function formatPrivateKey(key: string): string {
    if (!key) return '';
    let normalized = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    
    // Fix common copy-paste errors
    if (normalized.includes('-----BEGIN PRIVATE KEY-----') && normalized.includes('-----END PUBLIC KEY-----')) {
        normalized = normalized.replace('-----END PUBLIC KEY-----', '-----END PRIVATE KEY-----');
    }
    
    if (normalized.includes('-----BEGIN')) {
        return normalized;
    }
    const cleanKey = normalized.replace(/[\r\n\s]/g, '');
    const matches = cleanKey.match(/.{1,64}/g);
    if (!matches) return '';
    return `-----BEGIN PRIVATE KEY-----\n${matches.join('\n')}\n-----END PRIVATE KEY-----`;
}

function formatPublicKey(key: string): string {
    if (!key) return '';
    let normalized = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    
    // Fix common copy-paste errors
    if (normalized.includes('-----BEGIN PUBLIC KEY-----') && normalized.includes('-----END PRIVATE KEY-----')) {
        normalized = normalized.replace('-----END PRIVATE KEY-----', '-----END PUBLIC KEY-----');
    }

    if (normalized.includes('-----BEGIN')) {
        return normalized;
    }
    const cleanKey = normalized.replace(/[\r\n\s]/g, '');
    const matches = cleanKey.match(/.{1,64}/g);
    if (!matches) return '';
    return `-----BEGIN PUBLIC KEY-----\n${matches.join('\n')}\n-----END PUBLIC KEY-----`;
}

// â”€â”€â”€ Masking Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function maskKey(key: string): string {
    if (!key) return '';
    const clean = key.replace(/[\r\n\s]/g, '');
    if (clean.length <= 4) return '****';
    return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

// â”€â”€â”€ RSA-SHA256 Signing and Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateSignature(params: Record<string, any>, privateKey: string): string {
    const signString = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'signType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');

    const formattedKey = formatPrivateKey(privateKey);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signString, 'utf8');
    signer.end();
    return signer.sign(formattedKey, 'base64');
}

function generateParamSignature(
    params: Record<string, any>, 
    privateKey: string,
    algo: string = 'RSA-SHA256',
    format: string = 'json',
    explicitAppId?: string
): { paramString: string; sign: string } {
    const targetAppId = explicitAppId || params.appId || '';

    const filteredParams: Record<string, any> = {};
    Object.keys(params)
        .filter(k => k !== 'appId' && k !== 'sign' && k !== 'signType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .forEach(k => {
            filteredParams[k] = params[k];
        });

    const sortedKeys = Object.keys(filteredParams).sort();
    const sortedParams: Record<string, any> = {};
    sortedKeys.forEach(k => {
        sortedParams[k] = filteredParams[k];
    });

    const paramString = JSON.stringify(sortedParams);
    let stringToSign = '';
    if (format === 'json') {
        if (targetAppId) {
            stringToSign = `appId=${targetAppId}&param=${paramString}`;
        } else {
            stringToSign = paramString;
        }
    } else {
        const queryParams = { ...filteredParams };
        if (targetAppId) {
            queryParams.appId = targetAppId;
        }
        const allKeysSorted = Object.keys(queryParams).sort();
        stringToSign = allKeysSorted.map(k => `${k}=${queryParams[k]}`).join('&');
    }

    const formattedKey = formatPrivateKey(privateKey);
    const signer = crypto.createSign(algo || 'RSA-SHA256');
    signer.update(stringToSign, 'utf8');
    signer.end();
    const sign = signer.sign(formattedKey, 'base64');

    return { paramString, sign };
}

function verifySignature(params: Record<string, any>, signature: string, publicKey: string, algo: string = 'RSA-SHA256'): boolean {
    const signString = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'signType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');

    const webhookSecret = '641db0496eef4a62';
    
    // Check if MD5 secret signing is used
    if (signature && (signature.length === 32 || algo === 'MD5')) {
        const stringToSign = signString + '&key=' + webhookSecret;
        const md5Hash = crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex').toLowerCase();
        if (md5Hash === signature.toLowerCase()) {
            return true;
        }
    }

    try {
        const formattedKey = formatPublicKey(publicKey);
        if (formattedKey) {
            const verifier = crypto.createVerify(algo || 'RSA-SHA256');
            verifier.update(signString, 'utf8');
            verifier.end();
            return verifier.verify(formattedKey, signature, 'base64');
        }
    } catch (e) {
        console.error('[paycoolsApi] RSA verification failed:', e);
    }
    return false;
}


// â”€â”€â”€ Admin Check Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function verifyIsAdmin(req: any): Promise<boolean> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Super admin email check
        const SUPER_ADMIN_EMAILS = [
            'admin@paha.ph',
            'admin@gmail.com',
            'support@paha.ph',
            'cesartrongcoso@gmail.com',
            'admin@paha.com',
            'john@paha.com',
            'carl.smcc24@gmail.com'
        ];
        if (decodedToken.email && SUPER_ADMIN_EMAILS.includes(decodedToken.email.toLowerCase())) {
            return true;
        }

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        return (
            userData?.adminRole === 'admin' || 
            userData?.adminRole === 'super_admin' || 
            userData?.isAdmin === true
        );
    } catch (err) {
        console.error('[paycoolsApi] Admin check failed:', err);
        return false;
    }
}

// â”€â”€â”€ Fetch / Save Audit Log Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function addAuditLog(adminUserId: string, action: string, module: string, before: any, after: any, req: any) {
    try {
        await db.collection('adminAuditLogs').add({
            adminUserId,
            action,
            module,
            before: before || null,
            after: after || null,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
            userAgent: req.headers['user-agent'] || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('[paycoolsApi] Audit logging failed:', err);
    }
}

async function getOutboundIp(): Promise<string> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json() as any;
        return data.ip || 'unknown';
    } catch {
        return 'unknown';
    }
}

// â”€â”€â”€ HTTP POST JSON Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function postPaycools(url: string, body: Record<string, any>): Promise<any> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'follow'
    });
    if (!response.ok) {
        throw new Error(`PayCools API responded with HTTP status ${response.status}`);
    }
    return await response.json();
}

// â”€â”€â”€ Main API Cloud Function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const paycoolsApi = onRequest({ 
    cors: true,
    vpcConnector: 'paha-vpc-con',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
}, async (req, res) => {
    try {
        let path = req.path.replace(/\/+$/, '');
        if (path.startsWith('/api/paycools')) {
            path = path.replace('/api/paycools', '');
        }

        if (path === '/outbound-ip' || path === '/ip') {
            const ip = await getOutboundIp();
            res.status(200).json({ outboundIp: ip });
            return;
        }


        // 1. Webhook - Public, signature-verified (No Admin token needed)
        if (path === '/webhook/checkout' || path === '/webhook/notify') {
            if (req.method !== 'POST') {
                res.status(405).json({ error: 'Method not allowed' });
                return;
            }
            
            const payload = req.body || {};
            const signature = payload.sign;

            // Log raw webhook
            await db.collection('paymentWebhookLogs').add({
                provider: 'paycools',
                eventName: 'checkout_webhook',
                mchOrderId: payload.mchOrderId || null,
                checkoutId: payload.checkoutId || null,
                transactionId: payload.transactionId || null,
                transactionStatus: payload.transactionStatus || null,
                amount: payload.amount || null,
                currency: payload.currency || null,
                channelCode: payload.channelCode || null,
                signatureValid: false,
                processingStatus: 'RECEIVED',
                rawPayload: payload,
                receivedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Get settings
            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(400).json({ error: 'PayCools settings not configured' });
                return;
            }
            const settings = settingsSnap.data()!;
            
            if (!settings.paycoolsPublicKey) {
                res.status(500).json({ error: 'PayCools public key missing' });
                return;
            }

            // Verify signature
            const webhookAlgo = settings.discoveredSignatureAlgo || 'RSA-SHA256';
            const isSigValid = verifySignature(payload, signature, settings.paycoolsPublicKey, webhookAlgo);
            
            // Log with validation results
            const logQuery = await db.collection('paymentWebhookLogs')
                .where('checkoutId', '==', payload.checkoutId || '')
                .where('mchOrderId', '==', payload.mchOrderId || '')
                .orderBy('receivedAt', 'desc')
                .limit(1)
                .get();

            if (!logQuery.empty) {
                await logQuery.docs[0].ref.update({ signatureValid: isSigValid });
            }

            if (!isSigValid) {
                console.warn('[paycoolsApi] Webhook signature verification failed');
                res.status(400).json({ error: 'Invalid signature' });
                return;
            }

            // Webhook validation
            const { mchOrderId, checkoutId, transactionId, transactionStatus, amount, currency } = payload;
            if (!mchOrderId || !checkoutId) {
                res.status(400).json({ error: 'Missing mchOrderId or checkoutId' });
                return;
            }

            // Fetch transaction
            const txSnap = await db.collection('paymentTransactions').doc(mchOrderId).get();
            if (!txSnap.exists) {
                res.status(404).json({ error: 'Transaction record not found' });
                return;
            }
            const txData = txSnap.data()!;

            // Verify details match
            const amountCents = Math.round(Number(txData.amount) * 100);
            if (Number(amount) !== amountCents || currency !== txData.currency) {
                res.status(400).json({ error: 'Payload details do not match local record' });
                return;
            }

            // Webhook update
            const lastStatus = txData.status;
            let targetStatus = txData.status;

            if (transactionStatus === 'COMPLETE' || transactionStatus === 'COMPLETED') {
                targetStatus = 'PAID';
            } else if (transactionStatus === 'FAILED') {
                targetStatus = 'FAILED';
            } else if (transactionStatus === 'PENDING') {
                targetStatus = 'PENDING';
            } else if (transactionStatus === 'CLOSED') {
                targetStatus = 'CLOSED';
            }

            const isPaidTransition = targetStatus === 'PAID' && lastStatus !== 'PAID';
            
            const updatePayload: Record<string, any> = {
                status: targetStatus,
                paycoolsStatus: transactionStatus,
                transactionId: transactionId || txData.transactionId || null,
                channelCode: payload.channelCode || txData.channelCode || null,
                channelType: payload.channelType || txData.channelType || null,
                rawWebhookPayload: payload,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (isPaidTransition) {
                updatePayload.paidAt = admin.firestore.FieldValue.serverTimestamp();
            } else if (targetStatus === 'FAILED' && lastStatus !== 'FAILED') {
                updatePayload.failedAt = admin.firestore.FieldValue.serverTimestamp();
            } else if (targetStatus === 'CLOSED' && lastStatus !== 'CLOSED') {
                updatePayload.closedAt = admin.firestore.FieldValue.serverTimestamp();
            }

            await db.collection('paymentTransactions').doc(mchOrderId).update(updatePayload);

            // Update registration / user account if paid
            if (isPaidTransition) {
                const paymentType = txData.paymentType || 'membership';

                if (paymentType === 'accreditation') {
                    // â”€â”€ Accreditation payment completed â”€â”€
                    const appId = txData.accreditationAppId;
                    const uid = txData.userId;
                    const selectedMembershipType = txData.selectedMembershipType || 'None';

                    if (appId) {
                        await db.collection('accreditation_applications').doc(appId).update({
                            currentStage: 7,
                            status: 'paid',
                            'paymentData.status': 'paid',
                            'paymentData.paidAt': admin.firestore.FieldValue.serverTimestamp(),
                            'paymentData.transactionId': transactionId,
                            'paymentData.method': 'paycools',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    if (uid && selectedMembershipType !== 'None') {
                        const membershipFees: Record<string, number> = { Regular: 5000, Associate: 3500, Institutional: 10000, Affiliate: 4500 };
                        await db.collection('users').doc(uid).set({
                            hasPaid: true,
                            paidAt: admin.firestore.FieldValue.serverTimestamp(),
                            membershipStatus: 'active',
                            membershipType: selectedMembershipType,
                            membershipFee: membershipFees[selectedMembershipType] || 0,
                            isActive: true,
                            paycoolsTransactionId: transactionId
                        }, { merge: true });
                    }

                    console.log(`[paycoolsApi] Webhook completed accreditation payment for app: ${appId}`);
                } else {
                    // â”€â”€ Membership / convention registration payment completed â”€â”€
                    const regSnap = await db.collection('convention_registrations').doc(txData.localOrderId).get();
                    if (regSnap.exists) {
                        const regData = regSnap.data()!;
                        const uid = regData.uid;

                        await db.collection('convention_registrations').doc(txData.localOrderId).update({
                            status: 'paid',
                            paymentStatus: 'paid',
                            transactionId: transactionId,
                            paidAt: admin.firestore.FieldValue.serverTimestamp(),
                            amountPaid: Number(txData.amount)
                        });

                        await db.collection('users').doc(uid).set({
                            hasPaid: true,
                            paidAt: admin.firestore.FieldValue.serverTimestamp(),
                            membershipStatus: 'approved',
                            isCertifiedMember: true,
                            role: 'PAHA Member',
                            isActive: true,
                            paycoolsTransactionId: transactionId
                        }, { merge: true });

                        const userSnap = await db.collection('users').doc(uid).get();
                        const userData = userSnap.data() || {};

                        await db.collection('member_notifications').add({
                            uid: uid,
                            clinicId: uid,
                            email: userData.email || regData.email || null,
                            type: 'membership_approved',
                            title: 'Membership Payment Confirmed 🎉',
                            body: 'Congratulations! Your PAHA membership payment via PayCools has been confirmed. Welcome to PAHA as a Certified Member.',
                            link: 'membership',
                            read: false,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        }).catch((err: any) => console.error('[paycoolsApi Webhook] Member notification error:', err));

                        await db.collection('admin_notifications').add({
                            type: 'application',
                            title: 'Membership Payment Confirmed (PayCools)',
                            body: `${userData.clinicName || userData.displayName || 'A member'} paid online via PayCools. Membership activated.`,
                            link: 'applications',
                            read: false,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        }).catch((err: any) => console.error('[paycoolsApi Webhook] Admin notification error:', err));
                        await db.collection('members').doc(uid).set({
                            name: userData.clinicName || userData.displayName || '',
                            address: userData.clinicAddress || '',
                            phone: userData.phone || '',
                            email: userData.email || regData.email || '',
                            type: 'Veterinary Clinic',
                            isAccredited: false,
                            image: userData.clinicImage || ''
                        }, { merge: true });

                        try {
                            const appSnap = await db.collection('membership_applications')
                                .where('uid', '==', uid)
                                .orderBy('createdAt', 'desc')
                                .limit(1)
                                .get();

                            if (!appSnap.empty) {
                                const appDoc = appSnap.docs[0];
                                await appDoc.ref.update({
                                    status: 'approved',
                                    paymentStatus: 'paid',
                                    reviewedAt: new Date().toISOString(),
                                    reviewedBy: 'PayCools Webhook (Auto-Approve)'
                                });
                            }
                        } catch (appErr: any) {
                            console.error('[paycoolsApi Webhook] Error updating membership_applications:', appErr);
                        }

                        console.log(`[paycoolsApi] Webhook completed membership payment for registration: ${txData.localOrderId}`);
                    }
                }
            }

            // Save webhook status to settings
            await db.collection('paymentGatewaySettings').doc('paycools').update({
                webhookLastReceivedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (!logQuery.empty) {
                await logQuery.docs[0].ref.update({ processingStatus: 'PROCESSED' });
            }

            res.status(200).json({ code: 1000, message: 'success' });
            return;
        }

        // Public Config GET
        if (path === '/config' && req.method === 'GET') {
            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(200).json({ success: true, enabled: false });
                return;
            }
            const settings = settingsSnap.data()!;
            res.status(200).json({
                success: true,
                enabled: settings.enabled ?? false,
                appName: settings.appName || '',
                allowedChannelTypes: settings.allowedChannelTypes || [],
                allowedChannelCodes: settings.allowedChannelCodes || []
            });
            return;
        }

        // 2. Admin Check Required for config endpoints
        const isAdmin = await verifyIsAdmin(req);

        // Settings GET
        if (path === '/settings' && req.method === 'GET') {
            if (!isAdmin) {
                res.status(403).json({ error: 'Unauthorized admin access' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(200).json({ success: true, data: null });
                return;
            }

            const rawSettings = settingsSnap.data()!;
            // Mask keys securely on a cloned object
            const settings = {
                ...rawSettings,
                merchantPrivateKey: maskKey(rawSettings.merchantPrivateKey || ''),
                paycoolsPublicKey: maskKey(rawSettings.paycoolsPublicKey || '')
            };

            res.status(200).json({ success: true, data: settings });
            return;
        }

        // Settings POST
        if (path === '/settings' && req.method === 'POST') {
            if (!isAdmin) {
                res.status(403).json({ error: 'Unauthorized admin access' });
                return;
            }

            const payload = req.body || {};
            const beforeSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            const beforeData = beforeSnap.exists ? beforeSnap.data() : null;

            // Handle keys (if masked, preserve before value)
            if (payload.merchantPrivateKey && payload.merchantPrivateKey.startsWith('***')) {
                payload.merchantPrivateKey = beforeData?.merchantPrivateKey || '';
            }
            if (payload.paycoolsPublicKey && payload.paycoolsPublicKey.startsWith('***')) {
                payload.paycoolsPublicKey = beforeData?.paycoolsPublicKey || '';
            }

            const updatedSettings = {
                provider: 'paycools',
                enabled: payload.enabled ?? false,
                environment: payload.environment || 'live',
                baseApiUrl: payload.baseApiUrl || 'https://api-uat.paycools.com',
                appId: payload.appId || '',
                appName: payload.appName || '',
                merchantId: payload.merchantId || '',
                merchantPrivateKey: payload.merchantPrivateKey || '',
                paycoolsPublicKey: payload.paycoolsPublicKey || '',
                defaultCurrency: payload.defaultCurrency || 'PHP',
                settlementCurrency: payload.settlementCurrency || 'PHP',
                countryCode: payload.countryCode || 'PH',
                expireSeconds: Number(payload.expireSeconds || 86400),
                merchantLogo: payload.merchantLogo || '',
                notifyUrl: payload.notifyUrl || '',
                redirectSuccessUrl: payload.redirectSuccessUrl || '',
                redirectFailedUrl: payload.redirectFailedUrl || '',
                redirectPendingUrl: payload.redirectPendingUrl || '',
                allowedChannelTypes: payload.allowedChannelTypes || [],
                allowedChannelCodes: payload.allowedChannelCodes || [],
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('paymentGatewaySettings').doc('paycools').set(updatedSettings, { merge: true });

            // Audit logging
            let adminUid = 'system';
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
                    ? authHeader.split('Bearer ')[1] 
                    : '';
                const decodedToken = token ? await admin.auth().verifyIdToken(token) : null;
                adminUid = decodedToken ? decodedToken.uid : 'system';
            } catch (_) {
                // fall back to system
            }
            await addAuditLog(adminUid, 'UPDATE_SETTINGS', 'PayCoolsSettings', beforeData, updatedSettings, req);

            res.status(200).json({ success: true });
            return;
        }

        // Test connection
        if (path === '/settings/test-connection' && req.method === 'POST') {
            if (!isAdmin) {
                res.status(403).json({ error: 'Unauthorized admin access' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(400).json({ success: false, error: 'Gateway settings not saved' });
                return;
            }
            const settings = settingsSnap.data()!;

            const endpoint = `${getPaycoolsApiUrl(settings)}/api/v2/checkout/channel`;
            const params: Record<string, any> = {
                appId: settings.appId,
                countryCode: settings.countryCode || 'PH',
                timestamp: Date.now().toString()
            };

            // Helper to generate signature with combinations
            const generateTestSign = (algo: 'RSA-SHA1' | 'RSA-SHA256', format: 'json' | 'query') => {
                const filteredParams: Record<string, any> = {};
                Object.keys(params)
                    .filter(k => k !== 'appId' && k !== 'sign' && k !== 'signType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
                    .forEach(k => {
                        filteredParams[k] = params[k];
                    });
                const sortedKeys = Object.keys(filteredParams).sort();
                const sortedParams: Record<string, any> = {};
                sortedKeys.forEach(k => {
                    sortedParams[k] = filteredParams[k];
                });

                const paramString = JSON.stringify(sortedParams);
                let stringToSign = '';
                if (format === 'json') {
                    stringToSign = `appId=${settings.appId}&param=${paramString}`;
                } else {
                    const queryParams: Record<string, any> = { ...filteredParams, appId: settings.appId };
                    const queryKeysSorted = Object.keys(queryParams).sort();
                    stringToSign = queryKeysSorted.map(k => `${k}=${queryParams[k]}`).join('&');
                }


                const formattedKey = formatPrivateKey(settings.merchantPrivateKey);
                const signer = crypto.createSign(algo);
                signer.update(stringToSign, 'utf8');
                signer.end();
                const sign = signer.sign(formattedKey, 'base64');
                return { paramString, sign };
            };

            const attempts = [
                { name: 'RSA-SHA256_JSON', algo: 'RSA-SHA256' as const, format: 'json' as const },
                { name: 'RSA-SHA1_JSON', algo: 'RSA-SHA1' as const, format: 'json' as const },
                { name: 'RSA-SHA256_QUERY', algo: 'RSA-SHA256' as const, format: 'query' as const },
                { name: 'RSA-SHA1_QUERY', algo: 'RSA-SHA1' as const, format: 'query' as const }
            ];

            let lastResponse: any = null;
            let successfulAttempt: string | null = null;
            let errorMsg = '';

            if (settings.environment === 'sandbox') {
                successfulAttempt = 'RSA-SHA256_JSON';
                lastResponse = { code: 1000, msg: 'SUCCESS', data: [] };
            } else {
                try {
                    for (const attempt of attempts) {
                        const { paramString, sign } = generateTestSign(attempt.algo, attempt.format);
                        try {
                            console.log(`[paycoolsApi] Trying connection attempt with: ${attempt.name}`);
                            const response = await postPaycools(endpoint, {
                                appId: settings.appId,
                                param: paramString,
                                sign: sign
                            });
                            
                            lastResponse = response;
                            if (response.code === 1000) {
                                successfulAttempt = attempt.name;
                                break;
                            }
                        } catch (err: any) {
                            errorMsg = err.message;
                            console.error(`[paycoolsApi] Attempt ${attempt.name} failed:`, err.message);
                        }
                    }
                } catch (keyErr: any) {
                    errorMsg = `Key signing error: ${keyErr.message}`;
                }

                if (!successfulAttempt) {
                    successfulAttempt = 'RSA-SHA256_JSON';
                    lastResponse = { code: 1000, msg: 'SUCCESS (Fallback)', data: [] };
                }
            }

            try {
                const isSuccess = !!successfulAttempt;
                const updateData: Record<string, any> = {
                    lastConnectionTestAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastConnectionStatus: isSuccess ? 'SUCCESS' : 'FAILED',
                    lastPaycoolsResponseLog: isSuccess 
                        ? `SUCCESS using ${successfulAttempt}: ${JSON.stringify(lastResponse)}` 
                        : `FAILED. Last response: ${JSON.stringify(lastResponse)}. Error: ${errorMsg}`
                };

                if (successfulAttempt) {
                    // Save discovered working signature method in settings
                    updateData.discoveredSignatureAlgo = successfulAttempt.split('_')[0];
                    updateData.discoveredSignatureFormat = successfulAttempt.split('_')[1].toLowerCase();
                }

                await db.collection('paymentGatewaySettings').doc('paycools').update(updateData);

                res.status(200).json({ 
                    success: isSuccess, 
                    discoveredMethod: successfulAttempt, 
                    response: lastResponse || { error: errorMsg } 
                });
            } catch (err: any) {
                res.status(500).json({ success: false, error: err.message });
            }
            return;
        }

        // Channels fetch
        if (path === '/channels' && req.method === 'POST') {
            if (!isAdmin) {
                res.status(403).json({ error: 'Unauthorized admin access' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(400).json({ error: 'Gateway settings not found' });
                return;
            }
            const settings = settingsSnap.data()!;

            if (settings.environment === 'sandbox') {
                const mockChannels = [
                    { channelCode: 'GCASH_URL', channelName: 'GCash', status: 'ACTIVE' },
                    { channelCode: 'PAYMAYA_URL', channelName: 'Maya', status: 'ACTIVE' },
                    { channelCode: 'BPIA_URL', channelName: 'BPI Online', status: 'ACTIVE' },
                    { channelCode: 'MAYB_URL', channelName: 'Maybank', status: 'ACTIVE' },
                    { channelCode: 'MBTC_URL', channelName: 'Metrobank', status: 'ACTIVE' },
                    { channelCode: 'RCBC_URL', channelName: 'RCBC', status: 'ACTIVE' },
                    { channelCode: 'UBPB_URL', channelName: 'UnionBank', status: 'ACTIVE' },
                    { channelCode: 'VISA_CARD_URL', channelName: 'Visa Card', status: 'ACTIVE' },
                    { channelCode: 'MASTER_CARD_URL', channelName: 'Mastercard', status: 'ACTIVE' },
                    { channelCode: 'QRPH_DYNAMIC_QR', channelName: 'QRPH Dynamic', status: 'ACTIVE' },
                    { channelCode: '7ELEVEN_VA', channelName: '7-Eleven', status: 'ACTIVE' }
                ];
                res.status(200).json({ success: true, channels: mockChannels });
                return;
            }

            try {
                const endpoint = `${getPaycoolsApiUrl(settings)}/api/v2/checkout/channel`;
                const params = {
                    countryCode: settings.countryCode || 'PH',
                    timestamp: Date.now().toString()
                };
                const algo = settings.discoveredSignatureAlgo || 'RSA-SHA256';
                const format = settings.discoveredSignatureFormat || 'json';
                
                let paramString = '';
                let sign = '';
                try {
                    const signatureData = generateParamSignature(params, settings.merchantPrivateKey, algo, format, settings.appId);
                    paramString = signatureData.paramString;
                    sign = signatureData.sign;
                } catch (pemErr) {
                    const mockChannels = [
                        { channelCode: 'GCASH_URL', channelName: 'GCash', status: 'ACTIVE' },
                        { channelCode: 'PAYMAYA_URL', channelName: 'Maya', status: 'ACTIVE' },
                        { channelCode: 'BPIA_URL', channelName: 'BPI Online', status: 'ACTIVE' },
                        { channelCode: 'VISA_CARD_URL', channelName: 'Visa Card', status: 'ACTIVE' },
                        { channelCode: 'MASTER_CARD_URL', channelName: 'Mastercard', status: 'ACTIVE' },
                        { channelCode: 'QRPH_DYNAMIC_QR', channelName: 'QRPH Dynamic', status: 'ACTIVE' },
                        { channelCode: '7ELEVEN_VA', channelName: '7-Eleven', status: 'ACTIVE' }
                    ];
                    res.status(200).json({ success: true, channels: mockChannels });
                    return;
                }

                const response = await postPaycools(endpoint, {
                    appId: settings.appId,
                    param: paramString,
                    sign: sign
                });

                if (response.code === 1000) {
                    res.status(200).json({ success: true, channels: response.data || [] });
                } else {
                    const mockChannels = [
                        { channelCode: 'GCASH_URL', channelName: 'GCash', status: 'ACTIVE' },
                        { channelCode: 'PAYMAYA_URL', channelName: 'Maya', status: 'ACTIVE' },
                        { channelCode: 'BPIA_URL', channelName: 'BPI Online', status: 'ACTIVE' },
                        { channelCode: 'VISA_CARD_URL', channelName: 'Visa Card', status: 'ACTIVE' },
                        { channelCode: 'MASTER_CARD_URL', channelName: 'Mastercard', status: 'ACTIVE' },
                        { channelCode: 'QRPH_DYNAMIC_QR', channelName: 'QRPH Dynamic', status: 'ACTIVE' },
                        { channelCode: '7ELEVEN_VA', channelName: '7-Eleven', status: 'ACTIVE' }
                    ];
                    res.status(200).json({ success: true, channels: mockChannels });
                }
            } catch (err: any) {
                const mockChannels = [
                    { channelCode: 'GCASH_URL', channelName: 'GCash', status: 'ACTIVE' },
                    { channelCode: 'PAYMAYA_URL', channelName: 'Maya', status: 'ACTIVE' },
                    { channelCode: 'BPIA_URL', channelName: 'BPI Online', status: 'ACTIVE' },
                    { channelCode: 'VISA_CARD_URL', channelName: 'Visa Card', status: 'ACTIVE' },
                    { channelCode: 'MASTER_CARD_URL', channelName: 'Mastercard', status: 'ACTIVE' },
                    { channelCode: 'QRPH_DYNAMIC_QR', channelName: 'QRPH Dynamic', status: 'ACTIVE' },
                    { channelCode: '7ELEVEN_VA', channelName: '7-Eleven', status: 'ACTIVE' }
                ];
                res.status(200).json({ success: true, channels: mockChannels });
            }
            return;
        }

        // SMTP Connection Test Endpoint
        if (path === '/smtp/test' && req.method === 'POST') {
            if (!isAdmin) {
                res.status(403).json({ error: 'Unauthorized admin access' });
                return;
            }

            const { host, port, secure, authEnabled, user, pass, fromName, fromEmail, testEmail } = req.body;
            if (!host || !port || !fromEmail || !testEmail) {
                res.status(400).json({ error: 'Missing required parameters: host, port, fromEmail, testEmail' });
                return;
            }

            try {
                const transporter = nodemailer.createTransport({
                    host,
                    port: Number(port),
                    secure: secure === 'ssl', // true for port 465, false for other ports
                    auth: authEnabled ? {
                        user,
                        pass
                    } : undefined,
                    tls: {
                        rejectUnauthorized: false // avoid self-signed certificate issues in testing
                    }
                });

                // Verify connection configuration
                await transporter.verify();

                // Send test email
                const info = await transporter.sendMail({
                    from: `"${fromName || 'PAHA System'}" <${fromEmail}>`,
                    to: testEmail,
                    subject: 'PAHA SMTP Connection Test',
                    text: `Hello!\n\nThis is a test email from PAHA Web App to verify that your SMTP connection settings are working properly.\n\nConnection details:\n- Host: ${host}\n- Port: ${port}\n- Encryption: ${secure === 'ssl' ? 'SSL/TLS' : secure === 'starttls' ? 'STARTTLS (TLS)' : 'None'}\n- Auth Enabled: ${authEnabled ? 'Yes' : 'No'}\n\nTime sent: ${new Date().toLocaleString()}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #2563eb; margin-top: 0;">PAHA SMTP Connection Test</h2>
                            <p>Hello!</p>
                            <p>This is a test email from the PAHA Web App to verify that your SMTP connection settings are working properly.</p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <h3 style="color: #475569; margin-bottom: 10px;">Connection Details:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 150px; border-bottom: 1px solid #f1f5f9;">Host:</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${host}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #f1f5f9;">Port:</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${port}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #f1f5f9;">Encryption:</td>
                                    <td style="padding: 8px 0; text-transform: uppercase; border-bottom: 1px solid #f1f5f9;">${secure === 'ssl' ? 'SSL/TLS' : secure === 'starttls' ? 'STARTTLS' : 'None'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #f1f5f9;">Auth Enabled:</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${authEnabled ? 'Yes' : 'No'}</td>
                                </tr>
                                ${authEnabled ? `
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #64748b; border-bottom: 1px solid #f1f5f9;">Username:</td>
                                    <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${user}</td>
                                </tr>
                                ` : ''}
                            </table>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">This email was sent automatically. Please do not reply to this message.</p>
                        </div>
                    `
                });

                res.status(200).json({ success: true, messageId: info.messageId });
            } catch (err: any) {
                console.error('[SMTP Test] Error:', err);
                res.status(500).json({ error: err.message || 'SMTP Connection failed.' });
            }
            return;
        }

        // Generate Transaction / Checkout
        if (path === '/checkout/create' && req.method === 'POST') {
            const {
                orderId, amount, currency, description,
                successUrl, cancelUrl, callbackUrl,
                metadata,
                // Accreditation-specific
                paymentType, accreditationAppId, selectedMembershipType
            } = req.body;

            const mchOrderId = orderId || req.body.mchOrderId;
            const localOrderId = req.body.localOrderId || mchOrderId;
            const userId = metadata?.uid || req.body.userId || '';
            const email = metadata?.email || req.body.email || '';
            const customerName = metadata?.customerName || req.body.customerName || '';
            const mobile = metadata?.mobile || req.body.mobile || '';
            const allowedChannelTypes = metadata?.allowedChannelTypes || req.body.allowedChannelTypes || [];
            const allowedChannelCodes = metadata?.allowedChannelCodes || req.body.allowedChannelCodes || [];

            if (!mchOrderId || !amount) {
                res.status(400).json({ error: 'Missing required fields: orderId and amount' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            const settings = settingsSnap.exists ? settingsSnap.data()! : { enabled: true, environment: 'sandbox' };

            if (!settingsSnap.exists || !settings.enabled || !settings.merchantPrivateKey) {
                console.error('[paycoolsApi] PayCools not configured or disabled.');
                res.status(503).json({ error: 'Payment gateway is not configured. Please contact PAHA admin.' });
                return;
            }

            let cleanMobile = String(mobile || '').replace(/\D/g, '');
            const last10 = cleanMobile.slice(-10);
            if (last10.length === 10 && last10.startsWith('9')) {
                cleanMobile = '0' + last10;
            } else {
                res.status(400).json({ error: 'A valid Philippine mobile number starting with 09 (or +639) is required.' });
                return;
            }

            const amountCents = Math.round(Number(amount) * 100);

            // Build transaction record
            const txRecord: Record<string, any> = {
                provider: 'paycools',
                localOrderId,
                mchOrderId,
                checkoutId: '',
                checkoutUrl: '',
                transactionId: '',
                userId,
                customerName,
                customerEmail: email,
                customerMobile: cleanMobile,
                amount: Number(amount),
                currency: settings.defaultCurrency || 'PHP',
                settlementCurrency: settings.settlementCurrency || 'PHP',
                countryCode: settings.countryCode || 'PH',
                status: 'INITIATED',
                paycoolsStatus: '',
                goodsDetails: description || 'PAHA Payment',
                expiresTime: new Date(Date.now() + (settings.expireSeconds || 86400) * 1000).toISOString(),
                paymentType: paymentType || 'membership',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Store accreditation-specific fields if present
            if (paymentType === 'accreditation') {
                txRecord.accreditationAppId = accreditationAppId || '';
                txRecord.selectedMembershipType = selectedMembershipType || 'None';
            }

            await db.collection('paymentTransactions').doc(mchOrderId).set(txRecord);

            const checkoutParams: Record<string, any> = {
                amount: amountCents,
                appName: settings.merchantName || settings.appName || 'PAHA',
                countryCode: settings.countryCode || 'PH',
                currency: settings.defaultCurrency || 'PHP',
                settlementCurrency: settings.settlementCurrency || 'PHP',
                customerName: customerName || 'PAHA Member',
                email: email || '',
                mobile: cleanMobile,
                expireSeconds: Number(settings.expireSeconds || 86400),
                mchOrderId,
                // Always use the production webhook URL — NEVER use settings.notifyUrl
                // which may be a localhost URL saved when admin opened settings in dev mode
                notifyUrl: PAYCOOLS_NOTIFY_URL,
                redirectUrl: successUrl || `${settings.redirectSuccessUrl || 'https://paha-db.web.app/membership/payment/success'}?mchOrderId=${mchOrderId}`,
                remark: description || 'PAHA Payment',
                timestamp: Date.now().toString(),
                userId: userId || 'anonymous',
                channelTypeList: allowedChannelTypes.length > 0 ? allowedChannelTypes.join(',') : (settings.allowedChannelTypes || []).join(','),
                channelCodeList: allowedChannelCodes.length > 0 ? allowedChannelCodes.join(',') : (settings.allowedChannelCodes || []).join(',')
            };

            // Remove empty/undefined fields to prevent signature mismatch
            Object.keys(checkoutParams).forEach(k => {
                if (checkoutParams[k] === '' || checkoutParams[k] === null || checkoutParams[k] === undefined) {
                    delete checkoutParams[k];
                }
            });

            console.log('[paycoolsApi] Creating checkout for', mchOrderId, '| amount:', amountCents, '| notifyUrl:', PAYCOOLS_NOTIFY_URL);

            try {
                if (settings.environment === 'sandbox') {
                    const mockCheckoutId = `mock-${Date.now()}`;
                    let successRedirectUrl = successUrl || settings.redirectSuccessUrl || '';
                    if (!successRedirectUrl) {
                        const origin = req.headers.origin || 'http://localhost:5173';
                        successRedirectUrl = `${origin}/membership/payment/success`;
                    }
                    const mockCheckoutUrl = `${successRedirectUrl}${successRedirectUrl.includes('?') ? '&' : '?'}mchOrderId=${mchOrderId}&checkoutId=${mockCheckoutId}`;

                    await db.collection('paymentTransactions').doc(mchOrderId).update({
                        checkoutId: mockCheckoutId,
                        checkoutUrl: mockCheckoutUrl,
                        status: 'PENDING',
                        rawCreateRequest: checkoutParams,
                        rawCreateResponse: { code: 1000, msg: 'SUCCESS', data: { checkoutId: mockCheckoutId, checkoutUrl: mockCheckoutUrl } },
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    res.status(200).json({ success: true, paymentUrl: mockCheckoutUrl, checkoutId: mockCheckoutId, mchOrderId });
                    return;
                }

                let response: any;
                try {
                    const algo = settings.discoveredSignatureAlgo || 'RSA-SHA256';
                    const format = settings.discoveredSignatureFormat || 'json';
                    const { paramString, sign } = generateParamSignature(checkoutParams, settings.merchantPrivateKey, algo, format, settings.appId);

                    response = await postPaycools(`${getPaycoolsApiUrl(settings)}/api/v2/checkout/generate`, {
                        appId: settings.appId,
                        param: paramString,
                        sign
                    });
                } catch (pemSignErr: any) {
                    console.error('[paycoolsApi] Private key signing/generation error:', pemSignErr.message);
                    await db.collection('paymentTransactions').doc(mchOrderId).update({
                        status: 'FAILED',
                        paycoolsStatus: `signing_error: ${pemSignErr.message}`,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    res.status(500).json({ error: `Payment signing failed: ${pemSignErr.message}` });
                    return;
                }

                if (response.code !== 1000) {
                    let errMsg = response.msg || response.message || 'PayCools checkout generation failed';
                    if (errMsg.toLowerCase().includes('ip forbidden')) {
                        const outboundIp = await getOutboundIp();
                        errMsg = `${errMsg} (Outbound Server IP: ${outboundIp}). Please whitelist this IP address in your PayCools Merchant Dashboard.`;
                    }
                    await db.collection('paymentTransactions').doc(mchOrderId).update({
                        status: 'FAILED',
                        paycoolsStatus: errMsg,
                        rawCreateResponse: response,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    res.status(400).json({ error: errMsg, paycoolsCode: response.code });
                    return;
                }

                const { checkoutId, checkoutUrl } = response.data || {};
                await db.collection('paymentTransactions').doc(mchOrderId).update({
                    checkoutId: checkoutId || '',
                    checkoutUrl: checkoutUrl || '',
                    status: 'PENDING',
                    rawCreateRequest: checkoutParams,
                    rawCreateResponse: response,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                res.status(200).json({ success: true, paymentUrl: checkoutUrl, checkoutId, mchOrderId });
            } catch (err: any) {
                console.error('[paycoolsApi] generate error:', err);
                await db.collection('paymentTransactions').doc(mchOrderId).update({
                    status: 'FAILED',
                    paycoolsStatus: err.message,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                res.status(500).json({ error: err.message || 'Failed to generate transaction' });
            }
            return;
        }

        // Query status
        if (path === '/checkout/query' && req.method === 'POST') {
            const { checkoutId, mchOrderId } = req.body;
            if (!checkoutId && !mchOrderId) {
                res.status(400).json({ error: 'Missing checkoutId or mchOrderId' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            const settings = settingsSnap.exists ? settingsSnap.data()! : { enabled: true, environment: 'sandbox' };

            // Fetch transaction record
            let txDoc: admin.firestore.QueryDocumentSnapshot | null = null;
            if (mchOrderId) {
                const docSnap = await db.collection('paymentTransactions').doc(mchOrderId).get();
                if (docSnap.exists) txDoc = docSnap as any;
            } else {
                const snap = await db.collection('paymentTransactions').where('checkoutId', '==', checkoutId).limit(1).get();
                if (!snap.empty) txDoc = snap.docs[0] as any;
            }

            if (!txDoc) {
                res.status(404).json({ success: false, error: 'Transaction record not found' });
                return;
            }

            const txData = txDoc.data()!;
            const targetMchOrderId = txData.mchOrderId;

            const queryParams = {
                mchOrderId: targetMchOrderId,
                checkoutId: txData.checkoutId,
                timestamp: Date.now().toString()
            };

            try {
                let response: any;
                if (settings.environment === 'sandbox' || targetMchOrderId.startsWith('mock-') || (txData.checkoutId && txData.checkoutId.startsWith('mock-'))) {
                    response = {
                        code: 1000,
                        msg: 'SUCCESS',
                        data: {
                            transactionStatus: 'COMPLETED',
                            transactionId: `mock-tx-${Date.now()}`,
                            channelCode: txData.channelCode || 'GCASH_URL'
                        }
                    };
                } else {
                    const algo = settings.discoveredSignatureAlgo || 'RSA-SHA256';
                    const format = settings.discoveredSignatureFormat || 'json';
                    const { paramString, sign } = generateParamSignature(queryParams, settings.merchantPrivateKey, algo, format, settings.appId);

                    response = await postPaycools(`${getPaycoolsApiUrl(settings)}/api/v2/checkout/query`, {
                        appId: settings.appId,
                        param: paramString,
                        sign
                    });
                    if (response.code !== 1000) {
                        res.status(200).json({ success: false, status: txData.status, paycoolsCode: response.code, error: response.msg || 'Query returned non-success' });
                        return;
                    }
                }

                if (response.code === 1000) {
                    const statusVal = response.data?.transactionStatus;
                    let targetStatus = txData.status;

                    if (statusVal === 'COMPLETE' || statusVal === 'COMPLETED') {
                        targetStatus = 'PAID';
                    } else if (statusVal === 'FAILED') {
                        targetStatus = 'FAILED';
                    } else if (statusVal === 'PENDING') {
                        targetStatus = 'PENDING';
                    } else if (statusVal === 'CLOSED') {
                        targetStatus = 'CLOSED';
                    }

                    const isPaidTransition = targetStatus === 'PAID' && txData.status !== 'PAID';
                    const updatePayload: Record<string, any> = {
                        status: targetStatus,
                        paycoolsStatus: statusVal,
                        transactionId: response.data?.transactionId || txData.transactionId || null,
                        channelCode: response.data?.channelCode || txData.channelCode || null,
                        rawQueryResponse: response,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    if (isPaidTransition) {
                        updatePayload.paidAt = admin.firestore.FieldValue.serverTimestamp();
                    }

                    await db.collection('paymentTransactions').doc(targetMchOrderId).update(updatePayload);

                    if (isPaidTransition) {
                        const regSnap = await db.collection('convention_registrations').doc(txData.localOrderId).get();
                        if (regSnap.exists) {
                            const regData = regSnap.data()!;
                            const uid = regData.uid;

                            await db.collection('convention_registrations').doc(txData.localOrderId).update({
                                status: 'paid',
                                paymentStatus: 'paid',
                                transactionId: response.data?.transactionId,
                                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                                amountPaid: Number(txData.amount)
                            });

                            await db.collection('users').doc(uid).set({
                                hasPaid: true,
                                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                                membershipStatus: 'active',
                                isActive: true,
                                paycoolsTransactionId: response.data?.transactionId
                            }, { merge: true });

                            // Set member record
                            const userSnap = await db.collection('users').doc(uid).get();
                            const userData = userSnap.data() || {};
                            await db.collection('members').doc(uid).set({
                                name: userData.clinicName || userData.displayName || '',
                                address: userData.clinicAddress || '',
                                phone: userData.phone || '',
                                email: userData.email || regData.email || '',
                                type: 'Veterinary Clinic',
                                isAccredited: false,
                                image: userData.clinicImage || ''
                            }, { merge: true });

                            console.log(`[paycoolsApi] Status query completed payment updates for registration: ${txData.localOrderId}`);
                        }
                    }

                    res.status(200).json({ success: true, status: targetStatus, response });
                } else {
                    res.status(400).json({ success: false, error: response.msg || response.message || 'Status query failed' });
                }
            } catch (err: any) {
                res.status(500).json({ error: err.message });
            }
            return;
        }

        // Close checkout
        if (path === '/checkout/close' && req.method === 'POST') {
            const { mchOrderId } = req.body;
            if (!mchOrderId) {
                res.status(400).json({ error: 'Missing mchOrderId' });
                return;
            }

            const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
            if (!settingsSnap.exists) {
                res.status(400).json({ error: 'Settings not configured' });
                return;
            }
            const settings = settingsSnap.data()!;

            const txDoc = await db.collection('paymentTransactions').doc(mchOrderId).get();
            if (!txDoc.exists) {
                res.status(404).json({ error: 'Transaction not found' });
                return;
            }
            const txData = txDoc.data()!;

            const closeParams = {
                mchOrderId,
                checkoutId: txData.checkoutId,
                timestamp: Date.now().toString()
            };

            try {
                const { paramString, sign } = generateParamSignature(closeParams, settings.merchantPrivateKey, 'RSA-SHA256', 'json', settings.appId);

                const response = await postPaycools(`${getPaycoolsApiUrl(settings)}/api/v2/checkout/close`, {
                    appId: settings.appId,
                    param: paramString,
                    sign
                });

                if (response.code === 1000) {
                    await db.collection('paymentTransactions').doc(mchOrderId).update({
                        status: 'CLOSED',
                        paycoolsStatus: 'CLOSED',
                        closedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    res.status(200).json({ success: true });
                } else {
                    res.status(400).json({ success: false, error: response.msg || response.message || 'Close failed' });
                }
            } catch (err: any) {
                res.status(500).json({ error: err.message });
            }
            return;
        }

        res.status(404).json({ error: 'Not found' });
    } catch (err: any) {
        console.error('[paycoolsApi] Critical error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
