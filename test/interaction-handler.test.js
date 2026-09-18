import assert from 'node:assert/strict';
import test from 'node:test';

function createInteraction(overrides = {}) {
  return {
    guild: { id: 'guild-1' },
    user: { id: 'user-1' },
    commandName: 'ping',
    isChatInputCommand: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,
    reply: async () => {},
    ...overrides,
  };
}

function createDependencies(overrides = {}) {
  return {
    commands: new Map(),
    isAuthorizedGuild: () => true,
    handleUnauthorizedGuild: async () => {},
    checkBotLock: () => ({ allowed: true }),
    checkCooldown: () => ({ ok: true }),
    handleButtonInteraction: async () => {},
    logger: { error: () => {} },
    ...overrides,
  };
}

test('dispatches an authorized slash command after shared cooldown check', async () => {
  const { createInteractionHandler } = await import('../src/interactions/handler.js');
  let executed = false;
  let cooldownArgs;
  const handler = createInteractionHandler(createDependencies({
    commands: new Map([['ping', { execute: async () => { executed = true; } }]]),
    checkCooldown: (userId, guildId) => {
      cooldownArgs = [userId, guildId];
      return { ok: true };
    },
  }));

  await handler(createInteraction());

  assert.equal(executed, true);
  assert.deepEqual(cooldownArgs, ['user-1', 'guild-1']);
});

test('routes button interactions to existing component handler after shared cooldown check', async () => {
  const { createInteractionHandler } = await import('../src/interactions/handler.js');
  let handled = false;
  let cooldownChecked = false;
  const handler = createInteractionHandler(createDependencies({
    checkCooldown: () => {
      cooldownChecked = true;
      return { ok: true };
    },
    handleButtonInteraction: async () => { handled = true; },
  }));

  await handler(createInteraction({
    isChatInputCommand: () => false,
    isButton: () => true,
  }));

  assert.equal(cooldownChecked, true);
  assert.equal(handled, true);
});

test('blocks command-bearing components during cooldown', async () => {
  const { createInteractionHandler } = await import('../src/interactions/handler.js');
  let handled = false;
  let response;
  const handler = createInteractionHandler(createDependencies({
    checkCooldown: () => ({ ok: false, remainingMs: 1500 }),
    handleButtonInteraction: async () => { handled = true; },
  }));

  await handler(createInteraction({
    isChatInputCommand: () => false,
    isStringSelectMenu: () => true,
    reply: async (payload) => { response = payload; },
  }));

  assert.equal(handled, false);
  assert.equal(response.ephemeral, true);
  assert.match(response.content, /1\.5s/);
});

test('contains slash-command execution errors and returns an ephemeral response', async () => {
  const { createInteractionHandler } = await import('../src/interactions/handler.js');
  let response;
  let logged;
  const handler = createInteractionHandler(createDependencies({
    commands: new Map([['ping', { execute: async () => { throw new Error('boom'); } }]]),
    logger: { error: (...args) => { logged = args; } },
  }));

  await handler(createInteraction({
    reply: async (payload) => { response = payload; },
  }));

  assert.equal(response.ephemeral, true);
  assert.equal(logged[0], 'Command');
  assert.match(logged[1], /ping: boom/);
});
