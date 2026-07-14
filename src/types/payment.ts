export interface PaymentConfig {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    merchantId: string;
}

export interface PaymentDetails {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    callbackUrl: string;
    metadata?: Record<string, any>;
}

export interface PaycoolsPaymentPayload {
    merchantId: string;
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    notifyUrl: string;
    sign?: string;
}

export interface CreatePaymentResult {
    success: boolean;
    paymentUrl?: string;
    paymentId?: string;
    qrcodeContent?: string;
    qrLink?: string;
    error?: string;
}

export interface PaycoolsWebhookPayload {
    paymentId: string;
    orderId: string;
    status: 'success' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
    signature: string;
}

export interface MembershipPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    description: string;
    features: string[];
}

// PAHA Membership Plan - ₱5,000 annually
export const PAHA_MEMBERSHIP_PLAN: MembershipPlan = {
    id: 'paha-regular-membership',
    name: 'PAHA Regular Membership',
    price: 5000,
    currency: 'PHP',
    interval: 'year',
    description: 'Full access to all PAHA member benefits including seminars, events, legal support, and network connections for one year.',
    features: [
        'Priority seminar access with discounted rates',
        'Free legal advice and consultation',
        'Professional networking opportunities',
        'Hotel & accommodation deals',
        'Free lectures at membership meetings',
        'Official PAHA badge and accreditation',
    ],
};
