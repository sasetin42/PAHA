// Script to reset hasPaid for a specific user by email
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const TARGET_EMAIL = 'carl.smcc24@gmail.com';

let app;
try {
    app = initializeApp({ credential: applicationDefault(), projectId: 'paha-db' });
} catch (e) {
    console.error('Could not init with ADC:', e.message);
    process.exit(1);
}

const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
    // Find user by email
    let uid;
    try {
        const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
        uid = userRecord.uid;
        console.log(`Found user: uid=${uid}, email=${userRecord.email}, emailVerified=${userRecord.emailVerified}`);
    } catch (e) {
        console.error('User not found:', e.message);
        process.exit(1);
    }

    // Update Firestore
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
        console.log('No Firestore profile found for this user.');
    } else {
        const data = snap.data();
        console.log('Current profile:', { hasPaid: data.hasPaid, membershipStatus: data.membershipStatus, isActive: data.isActive });
    }

    await userRef.set({
        hasPaid: false,
        membershipStatus: 'pending',
        isActive: false,
    }, { merge: true });

    console.log('✓ Account reset: hasPaid=false, membershipStatus=pending, isActive=false');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
