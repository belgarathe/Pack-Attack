/**
 * Format date consistently between server and client
 * Uses ISO string format to avoid hydration mismatches
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Return empty string for invalid dates
  if (isNaN(d.getTime())) {
    return '';
  }
  
  // Use ISO format and extract the parts we need
  // This ensures consistency between server and client
  const isoString = d.toISOString();
  const [datePart, timePart] = isoString.split('T');
  const [year, month, day] = datePart.split('-');
  const [time] = timePart.split('.');
  const [hour, minute] = time.split(':');
  
  // Format as MM/DD/YYYY HH:MM
  return `${month}/${day}/${year} ${hour}:${minute}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Returns absolute time to avoid hydration issues
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDate(date);
}
