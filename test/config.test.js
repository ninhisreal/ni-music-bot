import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validationProgram = [
  "import { validateProductionConfig } from './src/config.js';",
  'try {',
  '  validateProductionConfig();',
  '  process.exit(0);',
  '} catch (error) {',
  '  console.error(error.message);',
  '  process.exit(1);',
  '}',
].join('\n');

function validateProductionConfig(env) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', validationProgram], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DISCORD_TOKEN: 'test-token',
      CLIENT_ID: 'test-client-id',
      OWNER_ID: 'test-owner-id',
      ALLOWED_GUILD_ID: 'test-guild-id',
      ...env,
    },
  });
}

test('production startup rejects a missing OWNER_ID', () => {
  const result = validateProductionConfig({ OWNER_ID: '' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OWNER_ID/);
});

test('production startup rejects a missing ALLOWED_GUILD_ID', () => {
  const result = validateProductionConfig({ ALLOWED_GUILD_ID: '' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ALLOWED_GUILD_ID/);
});
