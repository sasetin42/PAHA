/** Normalizes a PH phone number to a single "+63" prefix, collapsing any
 *  accidental double-prefixing (e.g. "+63+639171234567") from older, already-
 *  saved records so display stays correct even without a backfill script. */
export function cleanPhone(raw: string | null | undefined): string {
    if (!raw) return '';
    let digits = raw.trim();
    // Repeatedly strip leading "+63"/"63"/"0" so "+63+63917..." collapses fully.
    while (true) {
        if (digits.startsWith('+63')) { digits = digits.slice(3); continue; }
        if (digits.startsWith('63') && digits.length > 10) { digits = digits.slice(2); continue; }
        if (digits.startsWith('0') && digits.length > 10) { digits = digits.slice(1); continue; }
        break;
    }
    return digits ? `+63${digits}` : '';
}
