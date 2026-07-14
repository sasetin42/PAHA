import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
    const app = initializeApp({ credential: applicationDefault(), projectId: 'paha-db' });
    const db = getFirestore(app);

    const snapshot = await db.collection('paymentTransactions')
        .where('status', '==', 'FAILED')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

    if (snapshot.empty) {
        console.log('No failed transactions found.');
    } else {
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('--- TRANSACTION:', doc.id);
            console.log('Customer Name:', data.customerName);
            console.log('Amount:', data.amount);
            console.log('PayCools Status:', data.paycoolsStatus);
            console.log('Raw Response:', JSON.stringify(data.rawCreateResponse, null, 2));
            console.log('Raw Request:', JSON.stringify(data.rawCreateRequest, null, 2));
        });
    }
} catch (e) {
    console.error('Error running script:', e);
}
process.exit(0);
