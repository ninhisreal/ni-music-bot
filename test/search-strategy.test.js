import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeYoutubeMusicUrl,
  detectSource,
  isAccurateMatch,
  resolveYoutubeOEmbed,
} from '../src/player/youtube-strategy.js';

test('normalizeYoutubeMusicUrl cleans radio mix and converts to standard watch URL', () => {
  const ytmUrl = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVMdQw4w9WgXcQ';
  const normalized = normalizeYoutubeMusicUrl(ytmUrl);
  assert.equal(normalized, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  assert.equal(normalizeYoutubeMusicUrl(standardUrl), standardUrl);
});

test('detectSource identifies music platforms correctly', () => {
  assert.equal(detectSource('https://www.youtube.com/watch?v=123'), 'youtube');
  assert.equal(detectSource('https://youtu.be/123'), 'youtube');
  assert.equal(detectSource('https://music.youtube.com/watch?v=123'), 'youtube');
  assert.equal(detectSource('https://open.spotify.com/track/123'), 'spotify');
  assert.equal(detectSource('https://soundcloud.com/user/track'), 'soundcloud');
  assert.equal(detectSource('https://www.deezer.com/track/123'), 'deezer');
  assert.equal(detectSource('https://music.apple.com/us/album/song/123'), 'applemusic');
  assert.equal(detectSource('https://example.com/unknown'), 'unknown');
});

test('isAccurateMatch verifies title similarity and rejects mismatched audio', () => {
  // Matching titles
  assert.equal(isAccurateMatch('See You Again (Official Music Video)', 'See You Again'), true);
  assert.equal(isAccurateMatch('Shape of You [Audio]', 'Shape of You'), true);
  assert.equal(isAccurateMatch('Waiting for Love - Avicii', 'Waiting for Love'), true);

  // Conflicting keywords: Remix vs Acoustic, Live vs Studio
  assert.equal(isAccurateMatch('Faded (Acoustic Version)', 'Faded (Remix)'), false);
  assert.equal(isAccurateMatch('Hello (Live in Concert)', 'Hello (Remix)'), false);
  assert.equal(isAccurateMatch('Completely Different Song', 'Shape of You'), false);
});

test('resolveYoutubeOEmbed times out safely and handles invalid URLs', async () => {
  const invalidResult = await resolveYoutubeOEmbed('https://invalid.youtube.fake/watch?v=000');
  assert.equal(invalidResult, null);
});
