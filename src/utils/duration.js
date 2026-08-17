/**
 * Format milliseconds → human-readable duration string.
 * Examples: 185000 → "3:05"   |   3723000 → "1:02:03"
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format seconds → human-readable duration string.
 */
export function formatSeconds(sec) {
  return formatDuration((sec || 0) * 1000);
}

/**
 * Parse human duration string (e.g. "1:30", "90") → seconds.
 * Supports: "SS", "MM:SS", "HH:MM:SS"
 */
export function parseDuration(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/**
 * Format total seconds into "Xh Ym" for stats display.
 * Example: 4534 → "1h 15m"
 */
export function formatListeningTime(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}
