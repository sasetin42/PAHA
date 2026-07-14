import type { PaymentDetails, CreatePaymentResult } from '../types/payment';

export async function createPaycoolsPayment(details: PaymentDetails): Promise<CreatePaymentResult> {
    const response = await fetch('/api/paycools/checkout/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
            orderId:             details.orderId,
            amount:              details.amount,
            email:               details.metadata?.email        || '',
            mobile:              details.metadata?.mobile       || '',
            customerName:        details.metadata?.customerName || '',
            description:         details.description,
            allowedChannelTypes: details.metadata?.allowedChannelTypes || [],
            allowedChannelCodes: details.metadata?.allowedChannelCodes || [],
            userId:              details.metadata?.uid          || ''
        }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.paymentUrl) {
        return {
            success:    true,
            paymentUrl: data.paymentUrl,
            paymentId:  data.checkoutId || data.mchOrderId
        };
    }

    // Surface the real error from PayCools — no mock fallback
    const errorMsg = data.error || data.message || `Payment creation failed (HTTP ${response.status})`;
    console.error('[Paycools Service] API error:', errorMsg, data);
    return {
        success: false,
        error:   errorMsg
    };
}

export async function queryPaycoolsPayment(checkoutId: string, mchOrderId?: string): Promise<any> {
    const response = await fetch('/api/paycools/checkout/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ checkoutId, mchOrderId }),
    });

    if (response.ok) {
        return await response.json();
    }

    // Do NOT fake PAID — let the Firestore real-time listener handle status updates via webhook
    const data = await response.json().catch(() => ({}));
    console.warn('[Paycools Service] Query returned non-ok status:', response.status, data);
    return {
        success: false,
        status:  null,
        error:   data.error || `Query failed with HTTP ${response.status}`
    };
}
