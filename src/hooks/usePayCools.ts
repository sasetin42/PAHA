const CLOUD_FN_URL = 'https://us-central1-paha-db.cloudfunctions.net/createPaycoolsPayment';

export type ChannelCode = 'GCASH_URL' | 'QRPH_DYNAMIC_QR' | 'PH_INSTAPAY' | 'PH_CARD';

export interface PayCoolsPayload {
    mchOrderId:   string;
    amount:       number;       // in PHP (pesos) — function converts to centavos
    customerName: string;
    email:        string;
    mobile:       string;       // with country code e.g. "639XX..."
    channelCode:  ChannelCode;
    redirectUrl:  string;
    callbackUrl:  string;
    remark?:      string;
}

export function usePayCools() {
    const initiatePayment = async (payload: PayCoolsPayload): Promise<void> => {
        let data: any;

        try {
            const res = await fetch(CLOUD_FN_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    orderId:      payload.mchOrderId,
                    amount:       payload.amount,
                    channelCode:  payload.channelCode,
                    email:        payload.email,
                    mobile:       payload.mobile,
                    customerName: payload.customerName,
                    callbackUrl:  payload.callbackUrl,
                    redirectUrl:  payload.redirectUrl,
                    description:  payload.remark || 'PAHA Membership Fee',
                }),
            });

            data = await res.json();
        } catch (err: any) {
            throw new Error('Unable to reach payment gateway. Please check your connection and try again.');
        }

        if (!data.success || !data.paymentUrl) {
            throw new Error(data.error || 'Payment gateway did not return a payment URL.');
        }

        window.location.href = data.paymentUrl;
    };

    return { initiatePayment };
}
