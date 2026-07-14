import admin from 'firebase-admin';

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'paha-website'
    });
}
const db = admin.firestore();

async function checkDb() {
    console.log('--- Reading paymentGatewaySettings/paycools ---');
    const docSnap = await db.collection('paymentGatewaySettings').doc('paycools').get();
    if (docSnap.exists) {
        console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
        console.log('Document paymentGatewaySettings/paycools does not exist');
    }

    console.log('\n--- Reading recent paymentWebhookLogs ---');
    const logsSnap = await db.collection('paymentWebhookLogs').orderBy('receivedAt', 'desc').limit(5).get();
    if (logsSnap.empty) {
        console.log('No webhook logs found in paymentWebhookLogs collection');
    } else {
        logsSnap.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log('------------------------');
        });
    }
}

checkDb();
