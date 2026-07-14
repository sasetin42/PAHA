/**
 * Returns a high-quality relevant Unsplash placeholder image based on keywords in the event title or category.
 */
export function getEventFallbackImage(title: string, category: string = ''): string {
  const combined = `${title} ${category}`.toLowerCase();
  
  if (combined.includes('orthopedic') || combined.includes('trauma') || combined.includes('bone') || combined.includes('break') || combined.includes('surger')) {
    // Vet surgery/orthopedics - Veterinarian examining dog's leg
    return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop';
  }
  if (combined.includes('rabies') || combined.includes('vaccin') || combined.includes('shot') || combined.includes('dog') || combined.includes('cat') || combined.includes('immuniz')) {
    // Dog vaccination / rabies fight - Vet examining dog puppy
    return 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop';
  }
  if (combined.includes('seminar') || combined.includes('education') || combined.includes('wsava') || combined.includes('class') || combined.includes('learn') || combined.includes('lecture')) {
    // Continuing education / lecture hall - Teacher in seminar
    return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop';
  }
  if (combined.includes('meeting') || combined.includes('assembly') || combined.includes('paha') || combined.includes('officer') || combined.includes('gathering') || combined.includes('salu-salo') || combined.includes('friendship') || combined.includes('social')) {
    // Meeting room / gathering / friendship - Group gathering
    return 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop';
  }
  if (combined.includes('clinic') || combined.includes('hospital') || combined.includes('treatment') || combined.includes('care')) {
    // Vet examining animal
    return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop';
  }
  
  // Generic beautiful veterinary background - Vet clinic checkup
  return 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop';
}

/**
 * Truncates a description text to a default 15-word excerpt followed by an ellipsis if it exceeds the limit.
 */
export function getEventExcerpt(description: string, wordLimit: number = 15): string {
  if (!description) return 'Learn more about this veterinary event hosted by PAHA.';
  
  // Strip HTML tags if any exist
  const cleanText = description.replace(/<[^>]*>/g, '').trim();
  const words = cleanText.split(/\s+/);
  
  if (words.length <= wordLimit) {
    return cleanText;
  }
  
  return words.slice(0, wordLimit).join(' ') + '...';
}
