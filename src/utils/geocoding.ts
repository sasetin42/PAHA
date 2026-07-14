/**
 * Helper to simulate geocoding based on address keywords
 * In a real app, this would use the Google Maps Geocoding API or actual stored coordinates
 */
export const getCoordinates = (address: string, id: string): { lat: number, lng: number } => {
    const search = address.toLowerCase();

    // Base coordinates for major cities in Philippines
    let base = { lat: 14.5995, lng: 120.9842 }; // Default Manila

    if (search.includes('quezon city')) base = { lat: 14.6760, lng: 121.0437 };
    else if (search.includes('makati')) base = { lat: 14.5547, lng: 121.0244 };
    else if (search.includes('taguig') || search.includes('bgc')) base = { lat: 14.5500, lng: 121.0500 };
    else if (search.includes('pasig')) base = { lat: 14.5763, lng: 121.0851 };
    else if (search.includes('mandaluyong')) base = { lat: 14.5794, lng: 121.0359 };
    else if (search.includes('las piñas') || search.includes('las pinas')) base = { lat: 14.4445, lng: 120.9939 };
    else if (search.includes('alabang') || search.includes('muntinlupa')) base = { lat: 14.4180, lng: 121.0440 };
    else if (search.includes('parañaque') || search.includes('paranaque')) base = { lat: 14.4793, lng: 121.0084 };
    else if (search.includes('san juan')) base = { lat: 14.6000, lng: 121.0300 };
    else if (search.includes('marikina')) base = { lat: 14.6299, lng: 121.1009 };
    else if (search.includes('cebu')) base = { lat: 10.3157, lng: 123.8854 };
    else if (search.includes('davao')) base = { lat: 7.1907, lng: 125.4553 };
    else if (search.includes('cagayan de oro')) base = { lat: 8.4542, lng: 124.6319 };
    else if (search.includes('cavite')) base = { lat: 14.3900, lng: 120.9700 };
    else if (search.includes('laguna')) base = { lat: 14.2100, lng: 121.1600 };
    else if (search.includes('rizal') || search.includes('antipolo')) base = { lat: 14.5800, lng: 121.1700 };
    else if (search.includes('baguio')) base = { lat: 16.4023, lng: 120.5960 };
    else if (search.includes('general santos') || search.includes('gensan')) base = { lat: 6.1160, lng: 125.1720 };

    // Deterministic random jitter based on ID to avoid multiple clinics overlapping exactly
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latJitter = Math.sin(seed) * 0.015;
    const lngJitter = Math.cos(seed) * 0.015;

    return {
        lat: base.lat + latJitter,
        lng: base.lng + lngJitter
    };
};
