import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNowPlayingEmbed } from '../src/embeds/now-playing.js';
import { buildQueueEmbed } from '../src/embeds/queue-embed.js';

test('buildNowPlayingEmbed formats playing track embed correctly', () => {
  const mockTrack = {
    title: 'Test Song',
    author: 'Test Artist',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    duration: '3:33',
    durationMS: 213000,
    requestedBy: { tag: 'User#1234', displayAvatarURL: () => 'https://avatar.png' },
  };

  const mockQueue = {
    node: {
      volume: 80,
      playbackTime: 45000,
      isPaused: () => false,
    },
    repeatMode: 0,
    filters: { ffmpeg: { filters: [] } },
  };

  const embed = buildNowPlayingEmbed(mockTrack, mockQueue);
  assert.ok(embed);
  const json = embed.toJSON();
  assert.equal(json.title, 'Test Song');
  assert.equal(json.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(json.description.includes('Test Artist'));
  assert.equal(json.author.name, '▶️ Đang phát');
});

test('buildNowPlayingEmbed reflects paused status when audio is paused', () => {
  const mockTrack = {
    title: 'Paused Song',
    author: 'Some Artist',
    url: 'https://www.youtube.com/watch?v=123',
    durationMS: 180000,
    requestedBy: { username: 'User2' },
  };

  const mockQueue = {
    node: {
      volume: 50,
      playbackTime: 30000,
      isPaused: () => true,
    },
    repeatMode: 1,
    filters: { ffmpeg: { filters: ['bassboost'] } },
  };

  const embed = buildNowPlayingEmbed(mockTrack, mockQueue);
  const json = embed.toJSON();
  assert.equal(json.author.name, '⏸️ Đang tạm dừng');
  assert.ok(json.description.includes('bassboost'));
});

test('buildQueueEmbed handles empty queue and paginated tracks safely', () => {
  const emptyQueue = {
    tracks: { toArray: () => [] },
    currentTrack: null,
  };

  const { embed: emptyEmbed, totalPages } = buildQueueEmbed(emptyQueue, 0);
  assert.equal(totalPages, 1);
  assert.ok(emptyEmbed.toJSON().description.includes('Hàng đợi trống'));

  const populatedQueue = {
    tracks: {
      toArray: () => [
        { title: 'Track 1', url: 'https://yt.com/1', duration: '3:00', durationMS: 180000 },
        { title: 'Track 2', url: 'https://yt.com/2', duration: '4:00', durationMS: 240000 },
      ],
    },
    currentTrack: {
      title: 'Current Track',
      url: 'https://yt.com/curr',
      duration: '2:30',
      author: 'Current Artist',
    },
  };

  const { embed: popEmbed } = buildQueueEmbed(populatedQueue, 0);
  const popJson = popEmbed.toJSON();
  assert.ok(popJson.description.includes('Current Track'));
  assert.ok(popJson.description.includes('Track 1'));
  assert.ok(popJson.description.includes('Track 2'));
});
