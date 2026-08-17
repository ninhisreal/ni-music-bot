/**
 * Lightweight logger với timestamps và colored output.
 * Levels: error > warn > info > debug
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', // red
  warn:  '\x1b[33m', // yellow
  info:  '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m',
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, tag, ...args) {
  if (LEVELS[level] > currentLevel) return;
  const color = COLORS[level];
  const reset = COLORS.reset;
  const prefix = `${color}[${timestamp()}] [${level.toUpperCase()}] [${tag}]${reset}`;
  console.log(prefix, ...args);
}

export const logger = {
  error: (tag, ...args) => log('error', tag, ...args),
  warn:  (tag, ...args) => log('warn',  tag, ...args),
  info:  (tag, ...args) => log('info',  tag, ...args),
  debug: (tag, ...args) => log('debug', tag, ...args),
};
