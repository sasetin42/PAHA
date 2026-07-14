// Central helpers for emitting in-app notifications.
// Admin notifications land in `admin_notifications` (admin dashboard bell);
// member notifications land in `member_notifications` (member dashboard bell).
// `link` is a dashboard tab id the bell uses to navigate on click.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface NotifyPayload {
    type: string;
    title: string;
    body: string;
    link?: string;
}

export async function notifyAdmin(payload: NotifyPayload): Promise<void> {
    try {
        await addDoc(collection(db, 'admin_notifications'), {
            ...payload,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('[notifyAdmin] failed:', err);
    }
}

export async function notifyMember(memberUid: string, payload: NotifyPayload): Promise<void> {
    try {
        await addDoc(collection(db, 'member_notifications'), {
            ...payload,
            uid: memberUid,
            clinicId: memberUid,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('[notifyMember] failed:', err);
    }
}
