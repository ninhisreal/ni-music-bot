import { EmbedBuilder } from 'discord.js';
import { COLORS, SOURCES } from '../utils/constants.js';
import { detectSource } from '../player/youtube-strategy.js';

/**
 * Create a base embed with the bot's consistent styling.
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {number} [options.color]
 * @param {string} [options.thumbnail]
 * @param {string} [options.image]
 * @param {Array}  [options.fields]
 * @param {string} [options.footer]
 * @param {string} [options.url]
 * @returns {EmbedBuilder}
 */
export function baseEmbed({
  title, description, color = COLORS.default,
  thumbnail, image, fields = [], footer, url,
} = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();

  if (title)       embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail)   embed.setThumbnail(thumbnail);
  if (image)       embed.setImage(image);
  if (fields.length) embed.addFields(fields);
  if (url)         embed.setURL(url);

  embed.setFooter({ text: footer || '🎵 Ni Music Bot' });
  return embed;
}

/**
 * Get platform color from a track URL.
 */
export function getSourceColor(url) {
  const src = detectSource(url);
  return SOURCES[src]?.color ?? COLORS.default;
}

/**
 * Get platform name + emoji from URL.
 */
export function getSourceInfo(url) {
  const src = detectSource(url);
  return SOURCES[src] || SOURCES.unknown;
}

/** Quick success embed */
export function successEmbed(description) {
  return baseEmbed({ description, color: COLORS.success });
}

/** Quick error embed */
export function errorEmbed(description) {
  return baseEmbed({ description, color: COLORS.error });
}

/** Quick info embed */
export function infoEmbed(description, title) {
  return baseEmbed({ description, title, color: COLORS.info });
}
