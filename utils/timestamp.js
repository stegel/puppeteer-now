/**
 * Timestamp utilities for consistent local time formatting
 */

/**
 * Get formatted timestamp for directory names (local time)
 * Format: YYYY-MM-DD_HH-MM-SS
 *
 * @returns {string} Formatted timestamp suitable for directory/file names
 */
export function getLocalTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Get formatted timestamp for display in reports (local time)
 * Format: Month DD, YYYY HH:MM:SS (Timezone)
 *
 * @returns {string} Human-readable timestamp with timezone
 */
export function getReadableTimestamp() {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Get ISO-style timestamp in local time (for backwards compatibility)
 * Format: YYYY-MM-DDTHH:MM:SS
 *
 * @returns {string} ISO-style local timestamp
 */
export function getLocalISOTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
