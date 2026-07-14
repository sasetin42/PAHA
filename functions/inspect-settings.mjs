import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
try {
    app = initializeApp({ credential: applicationDefault(), projectId: 'paha-db' });
} catch (e) {
    console.error('Could not init with ADC:', e.message);
    process.exit(1);
}

const db = getFirestore(app);

async function main() {
    const docRef = db.collection('paymentGatewaySettings').doc('paycools');
    const snap = await docRef.get();
    if (!snap.exists) {
        console.log('No paycools settings found in DB.');
        process.exit(0);
    }

    const data = snap.data();
    console.log('Current settings metadata:');
    console.log('  App ID:', data.appId);
    console.log('  Base API URL:', data.baseApiUrl);
    console.log('  Enabled:', data.enabled);
    console.log('  Environment:', data.environment);
    console.log('  Last connection status:', data.lastConnectionStatus);
    console.log('  Last connection response log:', data.lastPaycoolsResponseLog);

    const privateKey = data.merchantPrivateKey || '';
    const publicKey = data.paycoolsPublicKey || '';

    console.log('Private key starts with -----BEGIN:', privateKey.startsWith('-----BEGIN'));
    console.log('Private key length:', privateKey.length);

    if (privateKey && (privateKey.includes('\\n') || privateKey.includes('\r') || privateKey.startsWith('"') || privateKey.endsWith('"'))) {
        console.log('Sanitizing stored keys...');
        const cleanPrivate = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
        const cleanPublic = publicKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
        await docRef.update({
            merchantPrivateKey: cleanPrivate,
            paycoolsPublicKey: cleanPublic
        });
        console.log('✓ Keys updated & sanitized in Firestore.');
    } else {
        console.log('Keys are clean in DB.');
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
