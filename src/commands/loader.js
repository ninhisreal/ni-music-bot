import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load all commands from subdirectories (music, playlist, admin, utility).
 * Populates client.commands and client.aliases.
 *
 * @param {import('discord.js').Client} client
 */
export async function loadCommands(client) {
  client.commands = new Collection();
  client.aliases = new Collection();

  const categories = ['music', 'playlist', 'admin', 'utility'];
  let totalCount = 0;

  for (const cat of categories) {
    const catPath = join(__dirname, cat);
    let files = [];
    try {
      files = readdirSync(catPath).filter(f => f.endsWith('.js'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(catPath, file);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);
        const command = module.default || module;

        if (!command.data || !command.execute) {
          logger.warn('CommandLoader', `Command at ${file} missing data or execute`);
          continue;
        }

        const name = command.data.name;
        client.commands.set(name, command);
        totalCount++;

        // Register aliases for prefix commands (ni!)
        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            client.aliases.set(alias, name);
          }
        }
      } catch (err) {
        logger.error('CommandLoader', `Failed to load ${file}: ${err.message}`);
      }
    }
  }

  logger.info('CommandLoader', `Loaded ${totalCount} commands with ${client.aliases.size} aliases`);
}
