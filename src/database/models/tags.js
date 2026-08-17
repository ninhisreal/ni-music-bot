import { getDb } from '../db.js';

/** Add a tag to a track for a user. */
export function addTag(userId, trackUrl, trackTitle, tag) {
  const db = getDb();
  try {
    db.prepare(
      `INSERT OR IGNORE INTO song_tags (user_id, track_url, track_title, tag)
       VALUES (?, ?, ?, ?)`
    ).run(userId, trackUrl, trackTitle, tag.toLowerCase().trim());
    return true;
  } catch {
    return false;
  }
}

/** Remove a tag from a track. */
export function removeTag(userId, trackUrl, tag) {
  const db = getDb();
  const res = db.prepare(
    'DELETE FROM song_tags WHERE user_id = ? AND track_url = ? AND tag = ?'
  ).run(userId, trackUrl, tag.toLowerCase().trim());
  return res.changes > 0;
}

/** Get all tags for a track (by user). */
export function getTrackTags(userId, trackUrl) {
  const db = getDb();
  return db.prepare(
    'SELECT tag FROM song_tags WHERE user_id = ? AND track_url = ? ORDER BY tag ASC'
  ).all(userId, trackUrl).map(r => r.tag);
}

/** Find all tracks tagged with a given tag (by user). */
export function getTracksByTag(userId, tag) {
  const db = getDb();
  return db.prepare(
    `SELECT DISTINCT track_url, track_title
     FROM song_tags WHERE user_id = ? AND tag = ?
     ORDER BY created_at DESC`
  ).all(userId, tag.toLowerCase().trim());
}

/** Get most popular tags used by a user. */
export function getPopularTags(userId, limit = 10) {
  const db = getDb();
  return db.prepare(
    `SELECT tag, COUNT(*) as count
     FROM song_tags WHERE user_id = ?
     GROUP BY tag ORDER BY count DESC LIMIT ?`
  ).all(userId, limit);
}
