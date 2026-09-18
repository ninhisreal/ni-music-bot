import assert from 'node:assert/strict';
import test from 'node:test';

test('bot lock recognizes only configured owner ID as administrator', async () => {
  process.env.OWNER_ID = 'immutable-owner-id';
  const { checkBotLock, isBotAdmin, lockBot, unlockBot } = await import('../src/guards/bot-lock.js');

  const guild = { ownerId: 'guild-owner-id' };
  const owner = { id: 'immutable-owner-id', username: 'renamed-owner' };
  const impersonator = { id: 'attacker-id', username: 'ninhisreal' };
  const guildOwner = { id: 'guild-owner-id', username: 'another-user' };

  assert.equal(isBotAdmin(owner, guild), true);
  assert.equal(isBotAdmin(impersonator, guild), false);
  assert.equal(isBotAdmin(guildOwner, guild), false);

  lockBot(impersonator);
  assert.equal(checkBotLock(impersonator, guild).allowed, false);
  assert.equal(checkBotLock(owner, guild).allowed, true);
  unlockBot(owner);
});
