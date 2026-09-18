import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations } from './migration.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../../data');
const DEFAULT_DB_PATH = join(DATA_DIR, 'bot_database.sqlite');
const LEGACY_JSON_PATH = join(DATA_DIR, 'bot_data.json');

mkdirSync(DATA_DIR, { recursive: true });

let db = null;

/**
 * Enhance DatabaseSync instance with transaction helper and compatibility utilities.
 * @param {DatabaseSync} database
 */
function enhanceDatabase(database) {
  if (typeof database.transaction !== 'function') {
    database.transaction = (fn) => {
      return (...args) => {
        database.exec('BEGIN IMMEDIATE');
        try {
          const result = fn(...args);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      };
    };
  }
  return database;
}

/**
 * Get active SQLite database connection.
 * Initializes the default database if not already connected.
 * @returns {DatabaseSync}
 */
export function getDb() {
  if (!db) {
    initDb();
  }
  return db;
}

/**
 * Initialize SQLite database connection and run migrations.
 * @param {string} [filePath]
 * @returns {DatabaseSync}
 */
export function initDb(filePath = DEFAULT_DB_PATH) {
  if (db) {
    return db;
  }

  const isMemory = filePath === ':memory:';
  db = new DatabaseSync(filePath);
  enhanceDatabase(db);

  applyMigrations(db, isMemory ? null : LEGACY_JSON_PATH);

  logger.info('DB', `Native SQLite connected at ${filePath} (WAL mode, transactions enabled)`);
  return db;
}

/**
 * Checkpoint WAL or perform clean flush on shutdown.
 */
export function flushDb() {
  if (db) {
    try {
      db.exec('PRAGMA wal_checkpoint(PASSIVE);');
    } catch {}
  }
}

/**
 * Close database connection.
 */
export function closeDb() {
  if (db) {
    try {
      flushDb();
      db.close();
    } catch {}
    db = null;
  }
}

/**
 * Prune historical data and expired share codes to keep database size optimal.
 */
export function pruneOldRecords() {
  const currentDb = getDb();
  try {
    // 1. Prune expired playlist codes
    const codesResult = currentDb.prepare(`
      DELETE FROM playlist_codes
      WHERE expires_at IS NOT NULL AND expires_at < unixepoch()
    `).run();

    // 2. Prune play history older than 30 days (30 * 86400 = 2592000s)
    const historyResult = currentDb.prepare(`
      DELETE FROM play_history
      WHERE played_at < (unixepoch() - 2592000)
    `).run();

    if (codesResult.changes > 0 || historyResult.changes > 0) {
      logger.info('DB', `Pruned ${codesResult.changes} expired codes, ${historyResult.changes} old history entries.`);
    }
  } catch (err) {
    logger.warn('DB', `Prune records warning: ${err.message}`);
  }
}
