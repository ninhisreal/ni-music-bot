/**
 * URL Validator & SSRF Guard.
 * Validates external music URLs and blocks private/internal IP access.
 */

const ALLOWED_MUSIC_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'music.youtube.com',
  'spotify.com',
  'open.spotify.com',
  'soundcloud.com',
  'm.soundcloud.com',
  'deezer.com',
  'music.apple.com',
  'itunes.apple.com',
];

const PRIVATE_IP_REGEXES = [
  /^localhost$/i,
  /^127(?:\.[0-9]+){1,3}$/,                     // 127.0.0.0/8 loopback
  /^10(?:\.[0-9]+){1,3}$/,                      // 10.0.0.0/8 private
  /^172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]+){2}$/, // 172.16.0.0/12 private
  /^192\.168(?:\.[0-9]+){1,2}$/,               // 192.168.0.0/16 private
  /^169\.254(?:\.[0-9]+){1,2}$/,               // Link-local / Cloud metadata (169.254.169.254)
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
];

/**
 * Check if a hostname/IP points to an internal/private address.
 * @param {string} host
 * @returns {boolean}
 */
export function isPrivateIpOrHost(host) {
  if (!host || typeof host !== 'string') return true;
  const cleanHost = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return PRIVATE_IP_REGEXES.some(regex => regex.test(cleanHost));
}

/**
 * Validate that a URL is a legitimate, allowed music service URL.
 * Prevents SSRF attacks and random URL fetching.
 * @param {string} inputUrl
 * @returns {boolean}
 */
export function isAllowedMusicUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return false;

  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateIpOrHost(hostname)) {
      return false;
    }

    return ALLOWED_MUSIC_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
