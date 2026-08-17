/**
 * Generate ASCII progress bar.
 * Example: progressBar(45, 100, 14) → "▓▓▓▓▓▓░░░░░░░░"
 */
export function progressBar(current, total, width = 14) {
  if (!total || total <= 0) return '░'.repeat(width);
  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
