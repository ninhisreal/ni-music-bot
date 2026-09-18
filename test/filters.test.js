import test from 'node:test';
import assert from 'node:assert/strict';
import { FILTERS, getFilter, listFilters, applyFilter } from '../src/player/filters.js';

test('FILTERS contains clean presets and no heavy dynaudnorm/loudnorm buffers', () => {
  const all = listFilters();
  assert.ok(all.length >= 6, 'Should have at least 6 standard filter presets');

  for (const item of Object.values(FILTERS)) {
    assert.ok(item.name, 'Filter must have a display name');
    assert.ok(item.emoji, 'Filter must have an emoji');
    if (item.ffmpeg) {
      // Must not contain dynaudnorm with 200 frames lookahead or loudnorm which breaks live streaming
      assert.equal(
        item.ffmpeg.includes('dynaudnorm=f=200'),
        false,
        `Filter "${item.name}" must not use dynaudnorm=f=200 lookahead`
      );
      assert.equal(
        item.ffmpeg.includes('loudnorm'),
        false,
        `Filter "${item.name}" must not use loudnorm in live streaming`
      );
    }
  }
});

test('getFilter retrieves presets case-insensitively and returns null for unknown', () => {
  assert.ok(getFilter('bassboost'));
  assert.ok(getFilter('BASSBOOST'));
  assert.ok(getFilter('nightcore'));
  assert.equal(getFilter('non_existent_xyz'), null);
});

test('applyFilter handles edge cases safely without throwing', async () => {
  // Null queue
  const resNull = await applyFilter(null, 'bassboost');
  assert.equal(resNull, false);

  // Mock queue with filters
  let filtersSet = null;
  const mockQueue = {
    filters: {
      ffmpeg: {
        setFilters: async (f) => { filtersSet = f; return true; },
      },
      equalizer: {
        resetEQ: () => {},
        disable: () => {},
      },
      resampler: {
        setSampleRate: () => {},
        disable: () => {},
      },
    },
  };

  const resOff = await applyFilter(mockQueue, 'off');
  assert.equal(resOff, true);
  assert.deepEqual(filtersSet, []);

  const resBass = await applyFilter(mockQueue, 'bassboost');
  assert.equal(resBass, true);
  assert.ok(filtersSet.length > 0);
});
