import { getSettings } from '../database/models/settings.js';
import { config } from '../config.js';
import { t, getLang } from '../utils/i18n.js';
import { getDb } from '../database/db.js';

/**
 * Check if the interaction author has the required DJ role.
 * Logic:
 *   - If no DJ role configured → allow everyone
 *   - If DJ role configured → require that role, ADMINISTRATOR perm, or bot owner
 *
 * @param {import('discord.js').ChatInputCommandInteraction|import('discord.js').Message} ctx
 * @param {boolean} strict - if true, always require DJ role even if not configured
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkDjRole(ctx, strict = false) {
  const guild   = ctx.guild;
  const member  = ctx.member;
  const userId  = ctx.user?.id || ctx.author?.id;
  const lang    = getLang(getDb(), guild?.id);

  // Bot owner always passes
  if (config.ownerId && userId === config.ownerId) return { ok: true };

  // Server admins always pass
  if (member?.permissions?.has('Administrator')) return { ok: true };

  const settings = getSettings(guild?.id);
  const djRoleId = settings.dj_role_id;

  if (!djRoleId && !strict) return { ok: true }; // No role configured — open to all

  if (!djRoleId && strict) {
    return { ok: false, reason: '❌ Lệnh này yêu cầu DJ Role. Dùng `/djrole` để thiết lập.' };
  }

  const hasRole = member?.roles?.cache?.has(djRoleId);
  if (hasRole) return { ok: true };

  const role = guild?.roles?.cache?.get(djRoleId);
  const roleName = role ? `<@&${djRoleId}>` : djRoleId;
  return {
    ok: false,
    reason: t(lang, 'admin.no_dj_role', { role: roleName }),
  };
}

/**
 * Check if the interaction author is in a voice channel.
 * If bot is already connected to a voice room, verifies they're in the SAME VC as the bot.
 *
 * @param {import('discord.js').ChatInputCommandInteraction|import('discord.js').Message} ctx
 * @param {boolean} requireSameChannel
 * @returns {{ ok: boolean, voiceChannel?: import('discord.js').VoiceChannel, reason?: string }}
 */
export function checkVoice(ctx, requireSameChannel = true) {
  const guild   = ctx.guild;
  const member  = ctx.member;

  if (!member?.voice?.channel) {
    return { ok: false, reason: '❌ Bạn cần tham gia vào một phòng Voice trước khi sử dụng lệnh!' };
  }

  const voiceChannel = member.voice.channel;

  // Check locked channel restriction
  const settings = getSettings(guild?.id);
  if (settings.locked_channel_id && voiceChannel.id !== settings.locked_channel_id) {
    const lockedCh = guild.channels.cache.get(settings.locked_channel_id);
    return {
      ok: false,
      reason: `🔒 Bot đã bị khóa vào kênh **${lockedCh?.name || settings.locked_channel_id}**!`,
    };
  }

  // If the bot is already connected in a voice channel, require the user to be in the same channel
  const botVoice = guild?.members?.me?.voice?.channel;
  if (botVoice && requireSameChannel && botVoice.id !== voiceChannel.id) {
    return {
      ok: false,
      reason: `❌ Bot đang phát nhạc ở phòng **${botVoice.name}**! Vui lòng vào cùng phòng với bot để sử dụng.`,
    };
  }

  return { ok: true, voiceChannel };
}

/**
 * Check if bot has permissions to join and speak in the given voice channel.
 */
export function checkBotPerms(voiceChannel) {
  const me = voiceChannel?.guild?.members?.me;
  if (!me) return { ok: false, reason: '❌ Không thể kiểm tra quyền bot.' };

  const perms = voiceChannel.permissionsFor(me);
  if (!perms?.has('Connect') || !perms?.has('Speak')) {
    return { ok: false, reason: '❌ Bot không có quyền Tham gia (Connect) hoặc Nói (Speak) trong kênh voice này!' };
  }
  return { ok: true };
}
