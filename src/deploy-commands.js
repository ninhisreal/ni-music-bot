import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

async function clearSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    logger.info('Deploy', 'Clearing all global application (/) commands from Discord API...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] }
    );
    if (config.testGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.testGuildId),
        { body: [] }
      );
    }
    logger.info('Deploy', '✅ Successfully deleted all Slash commands! Bot is now Prefix-Only.');
  } catch (error) {
    logger.error('Deploy', `Failed to clear slash commands: ${error.message}`);
  }
}

clearSlashCommands();
