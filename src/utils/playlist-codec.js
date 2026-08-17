import { deflateSync, inflateSync } from 'node:zlib';
import crypto from 'node:crypto';

// Base62 alphabet: 0-9, A-Z, a-z  → 62^8 ≈ 218 trillion unique codes
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random 8-character Base62 code.
 * Example output: "aB3xK9mQ"
 */
export function generateCode() {
  const bytes = crypto.randomBytes(6); // 48 bits
  let num = 0n;
  for (const b of bytes) num = (num << 8n) | BigInt(b);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += BASE62[Number(num % 62n)];
    num /= 62n;
  }
  return code;
}

/**
 * Encode an array of track objects to a compressed Buffer.
 * Minimizes field names to reduce payload size.
 *
 * @param {Array<{title, url, source, duration, author}>} tracks
 * @returns {Buffer}
 */
export function encodePlaylist(tracks) {
  const minimal = tracks.map(t => ({
    t: t.title,
    u: t.url,
    s: t.source || 'yt',
    d: t.duration || 0,
    a: t.author || t.artist || null,
  }));
  const json = JSON.stringify(minimal);
  return deflateSync(Buffer.from(json, 'utf8'));
}

/**
 * Decode a compressed Buffer back to an array of track objects.
 *
 * @param {Buffer|string} data - Buffer from encodePlaylist()
 * @returns {Array<{title, url, source, duration, author}>}
 */
export function decodePlaylist(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const json = inflateSync(buf).toString('utf8');
  const minimal = JSON.parse(json);
  return minimal.map(t => ({
    title:    t.t,
    url:      t.u,
    source:   t.s,
    duration: t.d,
    author:   t.a,
  }));
}
