import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedMusicUrl, isPrivateIpOrHost } from '../src/utils/url-validator.js';

test('url-validator blocks internal/private addresses (SSRF prevention)', () => {
  assert.equal(isPrivateIpOrHost('localhost'), true);
  assert.equal(isPrivateIpOrHost('127.0.0.1'), true);
  assert.equal(isPrivateIpOrHost('10.0.0.1'), true);
  assert.equal(isPrivateIpOrHost('192.168.1.1'), true);
  assert.equal(isPrivateIpOrHost('172.16.0.1'), true);
  assert.equal(isPrivateIpOrHost('169.254.169.254'), true);
  assert.equal(isPrivateIpOrHost('0.0.0.0'), true);
  assert.equal(isPrivateIpOrHost('::1'), true);

  assert.equal(isAllowedMusicUrl('http://127.0.0.1:8080/evil'), false);
  assert.equal(isAllowedMusicUrl('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isAllowedMusicUrl('http://localhost/admin'), false);
});

test('url-validator allows whitelisted music service domains', () => {
  assert.equal(isAllowedMusicUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isAllowedMusicUrl('https://youtu.be/dQw4w9WgXcQ'), true);
  assert.equal(isAllowedMusicUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isAllowedMusicUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'), true);
  assert.equal(isAllowedMusicUrl('https://soundcloud.com/artist/track-name'), true);
  assert.equal(isAllowedMusicUrl('https://www.deezer.com/track/3135556'), true);
  assert.equal(isAllowedMusicUrl('https://music.apple.com/us/album/song/12345'), true);
});

test('url-validator rejects unknown or non-music domains', () => {
  assert.equal(isAllowedMusicUrl('https://evil-hacker.com/malware.mp3'), false);
  assert.equal(isAllowedMusicUrl('not-a-url'), false);
  assert.equal(isAllowedMusicUrl(''), false);
});
