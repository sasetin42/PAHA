/**
 * Normalizes and cleans a PH phone number value for user inputs:
 * - Strips non-digits
 * - If user pastes +639... or 639... (length > 10 starting with 63), strips leading 63
 * - Strips any leading zeros (e.g. "0917..." -> "917...")
 * - Caps length at 10 digits
 */
export function cleanPhoneInput(val: string | null | undefined): string {
    if (!val) return '';
    let digits = val.replace(/\D/g, '');
    while (digits.startsWith('63') && digits.length > 10) {
        digits = digits.slice(2);
    }
    digits = digits.replace(/^0+/, '');
    return digits.slice(0, 10);
}

/**
 * Formats a phone number stored in database or state for display in a 10-digit input box next to a +63 label/pill.
 */
export function formatPhoneForInput(val: string | null | undefined): string {
    return cleanPhoneInput(val);
}

/**
 * Prepares a phone number for storage in Firestore database (+63XXXXXXXXXX format).
 */
export function formatPhoneForDB(val: string | null | undefined): string {
    const digits = cleanPhoneInput(val);
    return digits ? `+63${digits}` : '';
}

/** Legacy / general normalization helper */
export function cleanPhone(raw: string | null | undefined): string {
    return formatPhoneForDB(raw);
}
