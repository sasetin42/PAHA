/**
 * Parses diverse date string formats into a JavaScript Date object.
 * Handles:
 * - ISO: "2026-04-07"
 * - Human: "October 15, 2025" or "Oct 15, 2025"
 * - Ranges: "Sept 2-4, 2025" (returns the start date)
 * - TBA or invalid: returns a date far in the future or null
 */
export const parseEventDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.toLowerCase().includes('tba')) return null;

    try {
        // Remove range part if it exists (e.g., "Sept 2-4, 2025" -> "Sept 2, 2025")
        // This regex looks for a digit followed by a dash and one or more digits, 
        // but needs to be careful about formats.
        // Let's handle the specific range format: "Month Day-Day, Year"
        let normalizedDate = dateStr.replace(/(\d+)-(\d+),/, '$1,');
        
        // Also handle "Month Day - Day, Year" with spaces
        normalizedDate = normalizedDate.replace(/(\d+)\s*-\s*(\d+),/, '$1,');

        // Try standard parsing
        const date = new Date(normalizedDate);
        if (!isNaN(date.getTime())) return date;

        // If it still fails, try to handle custom short months (e.g., "Sept")
        const monthMap: Record<string, string> = {
            'sept': 'September',
            'oct': 'October',
            'nov': 'November',
            'dec': 'December',
            'jan': 'January',
            'feb': 'February',
            'mar': 'March',
            'apr': 'April',
            'jun': 'June',
            'jul': 'July',
            'aug': 'August'
        };

        const firstWord = normalizedDate.split(' ')[0]?.toLowerCase();
        if (monthMap[firstWord]) {
            normalizedDate = normalizedDate.replace(new RegExp(firstWord, 'i'), monthMap[firstWord]);
            const retryDate = new Date(normalizedDate);
            if (!isNaN(retryDate.getTime())) return retryDate;
        }

        return null;
    } catch (e) {
        console.error(`Error parsing date string: ${dateStr}`, e);
        return null;
    }
};

/**
 * Sorts events by their date (closest to today first)
 */
export const sortEventsByDate = (events: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...events].sort((a, b) => {
        const dateA = parseEventDate(a.date);
        const dateB = parseEventDate(b.date);

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateA.getTime() - dateB.getTime();
    });
};
