// ─── Balanced Threadpool for Audio Processing & Crypto ─────────────────
process.env.UV_THREADPOOL_SIZE = '4';

import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { config, validateProductionConfig } from './config.js';
import { initDb, flushDb } from './database/db.js';
import { setupPlayer } from './player/setup.js';
import { setupPlayerEvents, startMemoryWatchdog } from './player/events.js';
import { startScheduler } from './player/scheduled-playback.js';
import { loadCommands } from './commands/loader.js';
import { handleButtonInteraction } from './buttons/handler.js';
import { checkCooldown } from './guards/cooldown.js';
import { checkBotLock } from './guards/bot-lock.js';
import { isAuthorizedGuild, handleUnauthorizedGuild } from './guards/guild-guard.js';
import { getSettings } from './database/models/settings.js';
import { logger } from './utils/logger.js';

// ─── Initialize Discord Client (Minimal Intents) ────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Disable caching of unused data types to save RAM
  sweepers: {
    messages: { interval: 300, lifetime: 600 },    // Sweep messages older than 10min every 5min
    users: { interval: 600, filter: () => u => !u.bot && u.id !== config.ownerId },
  },
});

async function main() {
  logger.info('Bot', 'Starting Ni Music Bot v2.0 (Ultra-Performance Engine)...');
  validateProductionConfig();

  // 1. Initialize Pure-JS Database
  initDb();

  // 2. Setup Zero-Overhead Opus Pipeline
  await setupPlayer(client);
  setupPlayerEvents();

  // 3. Start Memory Watchdog (60s interval)
  startMemoryWatchdog();

  // 4. Load commands
  await loadCommands(client);

  // ─── Ready Event ──────────────────────────────────────────────────────
  client.once('clientReady', async () => {
    logger.info('Bot', `✅ ${client.user.tag} online | ${client.guilds.cache.size} guilds`);

    client.user.setActivity({
      name: 'ni!help | ni!p 🎵',
      type: ActivityType.Listening,
    });

    // Security audit: check all guilds
    for (const guild of client.guilds.cache.values()) {
      if (!isAuthorizedGuild(guild)) {
        await handleUnauthorizedGuild(guild);
      } else {
        logger.info('Security', `🛡️ Guild OK: "${guild.name}" (${guild.id})`);
      }
    }

    // Start scheduler
    startScheduler(client);

    // Log startup memory
    const mem = process.memoryUsage();
    logger.info('Bot', `📊 Startup Memory: Heap ${Math.round(mem.heapUsed / 1048576)}MB | RSS ${Math.round(mem.rss / 1048576)}MB`);
  });

  // ─── Guild Create (New server join) ───────────────────────────────────
  client.on('guildCreate', async (guild) => {
    if (!isAuthorizedGuild(guild)) {
      await handleUnauthorizedGuild(guild);
    } else {
      logger.info('Guild', `✅ Joined authorized: "${guild.name}" (${guild.id})`);
    }
  });

  // ─── Interactions (Buttons & Menus) ───────────────────────────────────
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.guild) return;

    if (!isAuthorizedGuild(interaction.guild)) {
      return handleUnauthorizedGuild(interaction.guild);
    }

    const lockCheck = checkBotLock(interaction.user, interaction.guild);
    if (!lockCheck.allowed) {
      return interaction.reply({ content: lockCheck.reason, ephemeral: true }).catch(() => {});
    }

    return handleButtonInteraction(interaction);
  });

  // ─── Prefix Commands (ni!...) ─────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (!isAuthorizedGuild(message.guild)) {
      return handleUnauthorizedGuild(message.guild);
    }

    let prefix = config.prefix;
    try {
      const settings = getSettings(message.guild.id);
      prefix = settings.prefix || config.prefix;
    } catch {}

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const lockCheck = checkBotLock(message.author, message.guild);
    if (!lockCheck.allowed) return message.reply(lockCheck.reason);

    const actualName = client.aliases.get(commandName) || commandName;
    const command = client.commands.get(actualName);
    if (!command?.executePrefix) return;

    const cd = checkCooldown(message.author.id, message.guild.id);
    if (!cd.ok) {
      return message.reply(`⏳ Chờ **${(cd.remainingMs / 1000).toFixed(1)}s**`);
    }

    try {
      await command.executePrefix(message, args);
    } catch (error) {
      logger.error('Command', `${commandName}: ${error.message}`);
      message.reply('❌ Đã xảy ra lỗi!').catch(() => {});
    }
  });

  // ─── Process Error Handling ───────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Process', `Unhandled Rejection: ${reason}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Process', `Uncaught Exception: ${error.message}`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────
  const shutdown = () => {
    logger.info('Bot', 'Shutting down...');
    flushDb();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // ─── Login ────────────────────────────────────────────────────────────
  await client.login(config.token);
}

main().catch((err) => {
  logger.error('Main', `Startup failed: ${err.message}`);
  process.exit(1);
});
