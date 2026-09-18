import { REST, Routes, Collection } from 'discord.js';
import { config } from './config.js';
import { loadCommands } from './commands/loader.js';
import { logger } from './utils/logger.js';

async function deploySlashCommands() {
  if (!config.token || config.token === 'YOUR_DISCORD_BOT_TOKEN') {
    logger.error('Deploy', '❌ Missing valid DISCORD_TOKEN in .env!');
    process.exit(1);
  }
  if (!config.clientId || config.clientId === 'YOUR_CLIENT_ID') {
    logger.error('Deploy', '❌ Missing valid CLIENT_ID in .env!');
    process.exit(1);
  }

  const mockClient = {
    commands: new Collection(),
    aliases: new Collection(),
  };

  logger.info('Deploy', 'Scanning commands for slash deployment...');
  await loadCommands(mockClient);

  const commandData = [];
  for (const [name, cmd] of mockClient.commands) {
    if (cmd.data && typeof cmd.data.toJSON === 'function') {
      commandData.push(cmd.data.toJSON());
    }
  }

  logger.info('Deploy', `Found ${commandData.length} slash commands to register.`);

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    // 1. If TEST_GUILD_ID is specified, deploy immediately to test guild (instant update)
    if (config.testGuildId) {
      logger.info('Deploy', `Registering slash commands to test guild: ${config.testGuildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.testGuildId),
        { body: commandData }
      );
      logger.info('Deploy', `✅ Successfully registered ${commandData.length} commands to Test Guild!`);
    }

    // 2. Deploy globally
    logger.info('Deploy', 'Registering slash commands globally across Discord...');
    const result = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commandData }
    );

    logger.info('Deploy', `✅ Successfully deployed ${result.length} global Slash commands!`);
  } catch (error) {
    logger.error('Deploy', `Failed to deploy slash commands: ${error.message}`);
    process.exit(1);
  }
}

deploySlashCommands();
