import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onInit } from 'firebase-functions/v2/core';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { paycoolsApi } from './paycoolsApi';

// Global options (no VPC connector — connector paha-vpc-con not provisioned in this project)
setGlobalOptions({});

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// ─── LIVE Production Credentials ─────────────────────────────────────────────
// Display URL stored in Firestore (shown in Admin Settings UI)
const PAYCOOLS_LIVE_URL = 'https://api.paycools.com.ph';
// Active API URL actually used for calls (AppId a56a7161d66d4ccc94085de8efe87945 is UAT-registered)
const PAYCOOLS_BASE_URL = 'https://api-uat.paycools.com';
const APP_ID = 'a56a7161d66d4ccc94085de8efe87945';
const APP_NAME = 'Proximatech Solutions Company';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDlfDzasibuLyCc
UbZAlVB/QkhS2md6PMivzDcDbyn7DrsBy8T5WIQuhHV9kWkFVz03R7mcjWKw7WQr
7ZQqPE9KXchXvHbgBVfF5L/kjna6k5niuEroiBS+G2AvdJLTTRzxPlmJSIDUbEle
IjB7N3pV8My3lHX5sB8SfTHeW0tWfSmJNB5XUqS42jXCRz7ogrx02hYkT039gai3
PchKTnRUSYA2TO4+8Vgo0QNxlY6HSZ+EDQ1FSuemZntc3WaDTLsmY8RiHKWaOJzj
Th16cYPrlVTG0qJ40wlfuVoPMlky7uO3cppfLBKlqJVSp3v0p97i/BnjrqCqH9N3
r7tCscl9AgMBAAECggEAElOtgSJTdUJ36RP7fpqOFFkE8Ueg65muxfSvULZlf2J0
m9bxUvUh5UcjIj/lHQ3pBSD/bpm5+nroPOaF0SkCL2RgS2VxMZXWUHxiuMw0fipV
0qM41EDd4IrLeoQQSmYGUYZ9sbbZFwh+LtGDLAFJDf5OPbunqk+e7k6SQiQ/VteU
Tn0ym4frH9WzVtfB3/QXkmyDjDbr5X3u6Qh3V2RcN3RURFRHQzurigF3x7qgowol
hdGlT/qBhzTLUH4/ZKOcq47DLQWP6/amnQL7mGwJPjdpH1uOe5Ke1Ib+lBF1FdPz
o/+KW2OdEvJgGyFQK8zD13X8rhwgK8yj9O9lETkcwQKBgQD9PQM6gkC/CZYKObNq
I56QLYUM8o5EmGUgRYyb0bY7L1ftR7z/IOCOCWTRlch1oP9zpb5q8ELF1bZY7xSK
8Wmss0PL4/sCIrwOJALcKxcYSizcfwc5j34D29rNGjg7YHQCvTQGTbi8bXzCFUOh
EOc2EDzGTlm9LNnFUVhF2RKOXQKBgQDn/OlmS5eCrnOVDVAsqao6B8plDqT/CbPI
j9pKdAcaQ97UYql8gbY7Inq1MgWr0QPltpT67l13wqq+tORovr9kac9zATJ5sbaf
BN4JT05W0GOiqH54VkebowCpdB1/SGG/WkRl3ZahBSATTomwwQ93iGaLGjpwCww0
JJigVfE1oQKBgGEnYjC1Pg/MprJ/lpSW28Nmo0/nUquAZ/OsmxhAqZAlRq9ywVCE
FYKImhRKSaDPRpHguaAfUw7BQfb2qkPwAGHQWKdFbMxR9SHbsPk00uRvuKxTU7tC
kM78LwJXF9G33GocmnP8p24q9x0iuVJ2wK2eJyLRdl48ccPgxGPvts3FAoGAarCJ
tp31JAiO53Gj+aZdvypuDmPZxeD0abyeq7cIvS+RfyOQxs3wvOlyfXpv2UDbBf4e
LfkJy1YfqG0QzotLAicXXNCkIgt07VUTuDxcztgvulK7NySW8iDY4RWhqzPioFon
MqHh8FOnGLn54Owo7NQyNK7vSTALgL+D4dkkgYECgYAfo83bC5ymVBBbcyF13Q46
Oe3AHQXEi5ONGJB3iuAsToIi4O2o6hJgUJYQG6D4o2hfw7MmTOOYQt54pEWMSOJq
7eYCH1Oh9tVHXbihXUKZuHyywRBdH/rHzSXRZ3eFCQLG8yiaIsRKmUTkljlQ+jd0
RHKXAAd5yGRzmNAG7EM7Kw==
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5Xw82rIm7i8gnFG2QJVQ
f0JIUtpnejzIr8w3A28p+w67AcvE+ViELoR1fZFpBVc9N0e5nI1isO1kK+2UKjxP
Sl3IV7x24AVXxeS/5I52upOZ4rhK6IgUvhtgL3SS000c8T5ZiUiA1GxJXiIwezd6
VfDMt5R1+bAfEn0x3ltLVn0piTQeV1KkuNo1wkc+6IK8dNoWJE9N/YGotz3ISk50
VEmANkzuPvFYKNEDcZWOh0mfhA0NRUrnpmZ7XN1mg0y7JmPEYhylmjic404denGD
65VUxtKieNMJX7laDzJZMu7jt3KaXywSpaiVUqd79Kfe4vwZ466gqh/Td6+7QrHJ
fQIDAQAB
-----END PUBLIC KEY-----`;

// ─── One-time startup: ensure Firestore has the correct LIVE credentials ──────
// Registered via onInit (not run at module load) so deploy-time static analysis,
// which has no credentials, never has to execute this Firestore call — it only
// runs once a real instance actually spins up to serve a request.
onInit(async () => {
    try {
        const docRef = db.collection('paymentGatewaySettings').doc('paycools');
        const snap = await docRef.get();

        const liveData: Record<string, any> = {
            appId: APP_ID,
            merchantId: 'E0222rb29PaW',
            merchantPrivateKey: PRIVATE_KEY,
            paycoolsPublicKey: PUBLIC_KEY,
            environment: 'live',
            baseApiUrl: PAYCOOLS_LIVE_URL,  // Store live URL for UI display
            defaultCurrency: 'PHP',
            settlementCurrency: 'PHP',
            countryCode: 'PH',
            expireSeconds: 86400,
            enabled: true,
            provider: 'paycools',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!snap.exists) {
            await docRef.set(liveData);
            console.log('[Paycools] Initialized live settings in Firestore.');
        } else {
            console.log('[Paycools] Settings already exist in Firestore. Skipping auto-sync to prevent overwriting custom credentials.');
        }

    } catch (e: any) {
        console.error('[Paycools Init] Error:', e.message);
    }
});

// ─── RSA-SHA256 Signing ───────────────────────────────────────────────────
function generatePaycoolsSignature(
    params: Record<string, string | number | undefined | null>,
    privateKey: string
): string {
    const signString = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'signType' && params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');

    console.log('[Paycools] EXACT RAW SIGN STRING (RSA):', signString);

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signString, 'utf8');
    signer.end();

    const signature = signer.sign(privateKey, 'base64');
    console.log('[Paycools] FINAL RSA SIGNATURE:', signature);
    return signature;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────
async function postJson(url: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'follow',
    });
    return await response.json();
}

export const createPaycoolsPayment = onRequest({ 
    cors: true,
}, async (req, res) => {
    try {
        const { orderId, amount, channelCode, email, mobile, customerName, callbackUrl, redirectUrl, description } = req.body;

        const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
        const settings = settingsSnap.exists ? settingsSnap.data()! : { 
            appId: APP_ID, 
            merchantPrivateKey: PRIVATE_KEY, 
            baseApiUrl: PAYCOOLS_BASE_URL, 
            appName: APP_NAME 
        };
        const activeAppId = settings.appId || APP_ID;
        const activePrivateKey = settings.merchantPrivateKey || PRIVATE_KEY;
        const activeBaseUrl = settings.baseApiUrl || PAYCOOLS_BASE_URL;
        const activeAppName = settings.appName || settings.merchantName || APP_NAME;

        let cleanMobile = String(mobile || '').replace(/\D/g, '');
        const last10 = cleanMobile.slice(-10);
        if (last10.length === 10 && last10.startsWith('9')) {
            cleanMobile = '63' + last10;
        } else {
            res.status(400).json({ success: false, error: 'A valid Philippine mobile number starting with 09 (or +639) is required.' });
            return;
        }

        const params: Record<string, string | number> = {
            amount:       Math.round(Number(amount) * 100),
            appName:      activeAppName,
            callbackUrl,
            channelCode:  channelCode,
            customerName: customerName,
            email:        email,
            mchOrderId:   orderId,
            mobile:       cleanMobile,
            redirectUrl,
            remark:       description || 'PAHA Membership Registration Fee',
            timestamp:    Date.now().toString(),
        };

        const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
            acc[key] = params[key];
            return acc;
        }, {} as Record<string, string | number>);

        const paramString = JSON.stringify(sortedParams);
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(paramString, 'utf8');
        const sign = signer.sign(activePrivateKey, 'base64');

        const response = await fetch(`${activeBaseUrl}/api/v2/checkout/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appId: activeAppId, sign, param: paramString }),
        });
        const result = await response.json();

        console.log('[Paycools] Response:', result);
        res.status(200).json(result);
    } catch (err: any) {
        console.error('[Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Create QR Payment ───────────────────────────────────────────────────
export const createPaycoolsQR = onRequest({ 
    cors: true,
}, async (req, res) => {
    try {
        const { orderId, amount, email, customerName, callbackUrl, description } = req.body;

        if (!orderId || !amount || !callbackUrl) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }

        const settingsSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
        const settings = settingsSnap.exists ? settingsSnap.data()! : { 
            appId: APP_ID, 
            merchantPrivateKey: PRIVATE_KEY, 
            baseApiUrl: PAYCOOLS_BASE_URL, 
            appName: APP_NAME 
        };
        const activeAppId = settings.appId || APP_ID;
        const activePrivateKey = settings.merchantPrivateKey || PRIVATE_KEY;
        const activeBaseUrl = settings.baseApiUrl || PAYCOOLS_BASE_URL;
        const activeAppName = settings.appName || settings.merchantName || APP_NAME;

        const amountCents = Math.round(Number(amount) * 100);

        const params: Record<string, string | number> = {
            appId:        activeAppId,
            appName:      activeAppName,
            mchOrderId:   orderId,
            channelCode:  'QRPH_DYNAMIC_QR',
            customerName: customerName || '',
            amount:       amountCents,
            callbackUrl,
            email:        email || '',
            remark:       description || 'PAHA Membership Fee',
        };

        const sign = generatePaycoolsSignature(params, activePrivateKey);
        const result = await postJson(`${activeBaseUrl}/api/v1/qrcode`, { ...params, sign });
        console.log('[Paycools QR] Response:', result);

        if (result.code !== 1000) {
            res.status(400).json({ success: false, error: result.message || result.msg || `QR failed (code: ${result.code})`, code: result.code });
            return;
        }

        res.status(200).json({
            success:       true,
            qrcodeContent: result.data?.qrcodeContent,
            qrcodeId:      result.data?.qrcodeId,
            qrLink:        result.data?.qrLink,
        });
    } catch (err: any) {
        console.error('[Paycools QR] error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Paycools Validate Callback ───────────────────────────────────────────
export const paycoolsValidate = onRequest({ cors: true }, async (req, res) => {
    try {
        const body: Record<string, string> = req.body;
        console.log('[Paycools Callback] Received:', body);

        const { mchOrderId, transactionId, transactionStatus, amount } = body;

        if (!mchOrderId) {
            res.status(200).json({ code: 1000, message: 'success' });
            return;
        }

        if (transactionStatus === 'COMPLETE' || transactionStatus === 'COMPLETED') {
            const orderSnap = await db.collection('convention_registrations').doc(mchOrderId).get();

            if (!orderSnap.exists) {
                console.error('[Paycools Callback] Order not found:', mchOrderId);
                res.status(200).json({ code: 1000, message: 'success' });
                return;
            }

            const uid    = orderSnap.data()!.uid as string;
            const paidAt = admin.firestore.FieldValue.serverTimestamp();

            await db.collection('users').doc(uid).set(
                { hasPaid: true, paidAt, membershipStatus: 'active', isActive: true, paycoolsTransactionId: transactionId },
                { merge: true }
            );

            await db.collection('convention_registrations').doc(mchOrderId).update({
                status: 'paid', transactionId, paidAt, amountPaid: Number(amount),
            });

            // Auto-approve the user's membership application
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
                    console.log(`[Paycools Callback] ✅ Membership application approved automatically for appId: ${appDoc.id}`);
                }
            } catch (appErr: any) {
                console.error('[Paycools Callback] Error auto-approving membership application:', appErr);
            }

            const userSnap = await db.collection('users').doc(uid).get();
            const userData = userSnap.data() || {};
            await db.collection('members').doc(uid).set({
                name:               userData.clinicName    || userData.displayName || '',
                address:            userData.clinicAddress || '',
                phone:              userData.phone         || '',
                email:              userData.email         || orderSnap.data()!.email || '',
                type:               'Veterinary Clinic',
                isAccredited:       false,
                image:              userData.clinicImage   || '',
                representativeName: userData.representativeName || userData.ownerName || '',
            }, { merge: true });

            console.log('[Paycools Callback] ✅ Account activated for uid:', uid);
        }

        res.status(200).json({ code: 1000, message: 'success' });
    } catch (err: any) {
        console.error('[Paycools Callback] Error:', err);
        res.status(200).json({ code: 1000, message: 'success' });
    }
});

// ─── Permanent Account Deletion (Admin Only) ──────────────────────────────
const SUPER_ADMIN_EMAILS = ['admin@paha.ph', 'admin@gmail.com', 'support@paha.ph', 'cesartrongcoso@gmail.com', 'admin@paha.com', 'john@paha.com', 'carl.smcc24@gmail.com'];

async function isCallerAdmin(uid: string, email?: string | null): Promise<boolean> {
    if (email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return true;
    const callerSnap = await db.collection('users').doc(uid).get();
    if (!callerSnap.exists) return false;
    const data = callerSnap.data() || {};
    return data.adminRole === 'admin' || data.adminRole === 'super_admin' || data.isAdmin === true;
}

/**
 * Verify the caller is an authenticated admin.
 * Primary path: `request.auth` — the callable SDK verifies the Firebase ID
 * token automatically. Fallback: an `idToken` field inside request.data
 * (sent by older clients), verified manually.
 * Authorization matches the app's convention: super-admin email allowlist,
 * or adminRole/isAdmin flags on the caller's users/{uid} document.
 */
async function verifyAdmin(request: any): Promise<{ uid: string; email: string }> {
    let callerUid: string | undefined = request.auth?.uid;
    let callerEmail: string | undefined = request.auth?.token?.email;

    if (!callerUid && request.data?.idToken) {
        try {
            const decoded = await admin.auth().verifyIdToken(request.data.idToken);
            callerUid = decoded.uid;
            callerEmail = decoded.email;
        } catch {
            throw new HttpsError('unauthenticated', 'Invalid or expired admin identity token.');
        }
    }

    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'You must be signed in as an administrator.');
    }

    if (!(await isCallerAdmin(callerUid, callerEmail))) {
        throw new HttpsError('permission-denied', 'Only administrators may permanently delete accounts.');
    }

    return { uid: callerUid, email: callerEmail || '' };
}

/**
 * Permanently and irreversibly deletes a member/applicant account:
 * their `users/{uid}` doc, all subcollections, every collection containing
 * their data (membership_applications, accreditation_applications,
 * event_registrations, chats, member_notifications, committee_members,
 * admin_notifications), their Storage files, and the Firebase Auth account.
 * Requires the calling admin to pass a valid ID token in the Authorization
 * header (obtain via: auth.currentUser.getIdToken()).
 */
export const deleteMemberAccount = onCall(async (request) => {
    const { uid: adminUid, email: adminEmail } = await verifyAdmin(request);

    let { uid, email } = request.data as { uid?: string; email?: string };
    const memberDocId = (request.data as any).memberDocId as string | undefined;
    if (!uid && !email) {
        throw new HttpsError('invalid-argument', 'A uid or email is required.');
    }

    // Resolve the missing half server-side — the Admin SDK can look up the
    // Auth account by email, which the client cannot. Without this, an
    // email-only request would delete directory data but leave the login
    // credentials (Auth account + users doc) alive.
    if (!uid && email) {
        try {
            uid = (await admin.auth().getUserByEmail(email)).uid;
        } catch { /* no auth account under this email */ }
        if (!uid) {
            const userByEmail = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!userByEmail.empty) uid = userByEmail.docs[0].id;
        }
    }
    if (!email && uid) {
        try {
            email = (await admin.auth().getUser(uid)).email || undefined;
        } catch { /* auth account already gone */ }
        if (!email) {
            const userSnap = await db.collection('users').doc(uid).get();
            email = userSnap.data()?.email;
        }
    }

    // Prevent an admin from deleting their own account by accident
    if (uid === adminUid) {
        throw new HttpsError('failed-precondition', 'You cannot delete your own admin account.');
    }

    const deletedCollections: Record<string, number> = {};

    const deleteByField = async (colName: string, field: string, value: string): Promise<number> => {
        const snap = await db.collection(colName).where(field, '==', value).get();
        if (snap.empty) return 0;
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        return snap.size;
    };

    const deleteByUidOrEmail = async (colName: string): Promise<number> => {
        let total = 0;
        if (uid) {
            total += await deleteByField(colName, 'uid', uid);
            total += await deleteByField(colName, 'userId', uid);
        }
        if (email) total += await deleteByField(colName, 'email', email);
        return total;
    };

    // 1. users/{uid} doc + representatives subcollection
    if (uid) {
        const repsSnap = await db.collection('users').doc(uid).collection('representatives').get();
        const batch = db.batch();
        repsSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('users').doc(uid));
        await batch.commit();
        deletedCollections.representatives = repsSnap.size;
        deletedCollections.users = 1;
    }

    // 2. membership_applications
    deletedCollections.membership_applications = await deleteByUidOrEmail('membership_applications');

    // 3. accreditation_applications (keyed by clinicId = the member's uid)
    deletedCollections.accreditation_applications = await deleteByUidOrEmail('accreditation_applications');
    if (uid) deletedCollections.accreditation_applications += await deleteByField('accreditation_applications', 'clinicId', uid);

    // 4. event_registrations (also keyed by attendeeEmail)
    deletedCollections.event_registrations = await deleteByUidOrEmail('event_registrations');
    if (email) deletedCollections.event_registrations += await deleteByField('event_registrations', 'attendeeEmail', email);

    // 5. Support chat thread — doc id IS the member's uid, with a messages subcollection
    if (uid) {
        const msgsSnap = await db.collection('chats').doc(uid).collection('messages').get();
        const msgBatch = db.batch();
        msgsSnap.docs.forEach(d => msgBatch.delete(d.ref));
        msgBatch.delete(db.collection('chats').doc(uid));
        await msgBatch.commit();
        deletedCollections.chats = 1;
        deletedCollections.chat_messages = msgsSnap.size;
    }

    // 5b. Public members directory entries linked to this account
    if (email) deletedCollections.members = await deleteByField('members', 'email', email);
    if (uid) {
        const memberByUid = await db.collection('members').doc(uid).get();
        if (memberByUid.exists) {
            await memberByUid.ref.delete();
            deletedCollections.members = (deletedCollections.members || 0) + 1;
        }
    }
    if (memberDocId) {
        const memberDoc = await db.collection('members').doc(memberDocId).get();
        if (memberDoc.exists) {
            await memberDoc.ref.delete();
            deletedCollections.members = (deletedCollections.members || 0) + 1;
        }
    }

    // 6. member_notifications
    deletedCollections.member_notifications = await deleteByUidOrEmail('member_notifications');

    // 7. admin_notifications targeted at this user
    if (uid) deletedCollections.admin_notifications = await deleteByField('admin_notifications', 'uid', uid);

    // 8. committee_members
    deletedCollections.committee_members = await deleteByUidOrEmail('committee_members');

    // 9. Storage files
    if (uid) {
        try {
            const bucket = admin.storage().bucket();
            await bucket.deleteFiles({ prefix: `users/${uid}/` });
            await bucket.deleteFiles({ prefix: `membership_documents/${uid}/` });
        } catch (storageErr) {
            console.error('[deleteMemberAccount] Storage cleanup error:', storageErr);
        }
    }

    // 10. Revoke refresh tokens + delete Firebase Auth account
    if (uid) {
        try {
            await admin.auth().revokeRefreshTokens(uid);
            console.log(`[deleteMemberAccount] Revoked refresh tokens for ${uid}`);
        } catch (revokeErr: any) {
            if (revokeErr.code !== 'auth/user-not-found') {
                console.error('[deleteMemberAccount] Revoke refresh tokens error:', revokeErr);
                throw new HttpsError('internal', 'Failed to revoke refresh tokens');
            }
        }

        try {
            await admin.auth().deleteUser(uid);
            console.log(`[deleteMemberAccount] Deleted Firebase Auth user: ${uid}`);
        } catch (authErr: any) {
            if (authErr.code !== 'auth/user-not-found') {
                console.error('[deleteMemberAccount] Auth deletion error:', authErr);
                throw new HttpsError('internal', 'Failed to delete Firebase Auth user');
            }
        }
    }

    console.log(`[deleteMemberAccount] Admin ${adminEmail} (${adminUid}) permanently deleted account uid=${uid} email=${email}`, deletedCollections);
    return { success: true, deleted: deletedCollections };
});

export { paycoolsApi };