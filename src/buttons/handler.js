import { useQueue } from 'discord-player';
import { checkVoice, checkDjRole } from '../guards/role-check.js';
import { buildNowPlayingEmbed } from '../embeds/now-playing.js';
import {
  buildPlayerControlsRow,
  buildPlayerControlsRow2,
  buildPlayerControlsRow3,
} from './player-controls.js';
import { buildQueueEmbed } from '../embeds/queue-embed.js';
import { buildQueueNavRow } from './queue-nav.js';
import { buildFilterSelectRow } from './filter-select.js';
import { buildPlaylistSelectRow } from './playlist-actions.js';
import { getPlaylists, addTrack, exportPlaylistCode } from '../database/models/playlist.js';
import { isUserPremium, isGuildPremium } from '../database/models/premium.js';
import { getFilter, applyFilter } from '../player/filters.js';
import { LOOP_MODE } from '../utils/constants.js';
import { fetchLyrics } from '../commands/music/lyrics.js';
import { baseEmbed } from '../embeds/builder.js';
import { logger } from '../utils/logger.js';

/**
 * Handle all button and select menu interactions.
 * @param {import('discord.js').Interaction} interaction
 */
export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const guild = interaction.guild;
  if (!guild) return;

  const queue = useQueue(guild.id);
  const customId = interaction.customId;

  // ─── Playback Controls that require active queue & voice check ─────────
  if (customId.startsWith('player_') || customId.startsWith('queue_page_')) {
    const vCheck = checkVoice(interaction);
    if (!vCheck.ok) {
      return interaction.reply({ content: vCheck.reason, ephemeral: true }).catch(() => {});
    }

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        content: '❌ Không có bài hát nào đang phát!',
        ephemeral: true,
      }).catch(() => {});
    }
  }

  try {
    switch (customId) {
      // ── Row 1 ───────────────────────────────────────────────────────
      case 'player_prev': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const history = queue.history;
        if (!history.tracks.size) {
          return interaction.reply({ content: '❌ Không có bài hát trước đó!', ephemeral: true });
        }
        await history.back();
        return interaction.reply({ content: '⏮️ Đang phát lại bài hát trước!', ephemeral: true });
      }

      case 'player_pause_resume': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const isPaused = queue.node.isPaused();
        if (isPaused) {
          queue.node.resume();
        } else {
          queue.node.pause();
        }

        if (queue.currentTrack) {
          const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
          const row1 = buildPlayerControlsRow(queue);
          const row2 = buildPlayerControlsRow2();
          const row3 = buildPlayerControlsRow3();
          await interaction.update({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
        }
        return;
      }

      case 'player_skip': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const current = queue.currentTrack;
        queue.node.skip();
        return interaction.reply({
          content: `⏭️ Đã bỏ qua **${current ? current.title : 'bài hát'}**!`,
          ephemeral: true,
        });
      }

      case 'player_stop': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        queue.delete();
        return interaction.reply({
          content: '⏹️ Đã dừng phát nhạc và xóa hàng đợi!',
          ephemeral: true,
        });
      }

      case 'player_loop': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const currentMode = queue.repeatMode;
        let nextMode;
        if (currentMode === LOOP_MODE.NONE)       nextMode = LOOP_MODE.TRACK;
        else if (currentMode === LOOP_MODE.TRACK) nextMode = LOOP_MODE.QUEUE;
        else                                      nextMode = LOOP_MODE.NONE;

        queue.setRepeatMode(nextMode);

        const labels = {
          [LOOP_MODE.NONE]:  'Tắt',
          [LOOP_MODE.TRACK]: 'Lặp lại bài hát (🔂)',
          [LOOP_MODE.QUEUE]: 'Lặp lại hàng đợi (🔁)',
        };

        if (queue.currentTrack) {
          const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
          const row1 = buildPlayerControlsRow(queue);
          const row2 = buildPlayerControlsRow2();
          const row3 = buildPlayerControlsRow3();
          await interaction.update({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
        }
        return interaction.followUp({ content: `🔁 Chế độ lặp: **${labels[nextMode]}**`, ephemeral: true }).catch(() => {});
      }

      case 'player_shuffle': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        queue.tracks.shuffle();
        return interaction.reply({
          content: `🔀 Đã xáo trộn **${queue.tracks.size}** bài trong hàng đợi!`,
          ephemeral: true,
        });
      }

      case 'player_voldown': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const currentVol = queue.node.volume;
        const newVol = Math.max(0, currentVol - 10);
        queue.node.setVolume(newVol);

        if (queue.currentTrack) {
          const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
          const row1 = buildPlayerControlsRow(queue);
          const row2 = buildPlayerControlsRow2();
          const row3 = buildPlayerControlsRow3();
          await interaction.update({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
        }
        return interaction.followUp({ content: `🔉 Âm lượng: **${newVol}%**`, ephemeral: true }).catch(() => {});
      }

      case 'player_volup': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const currentVol = queue.node.volume;
        const newVol = Math.min(200, currentVol + 10);
        queue.node.setVolume(newVol);

        if (queue.currentTrack) {
          const embed = buildNowPlayingEmbed(queue.currentTrack, queue);
          const row1 = buildPlayerControlsRow(queue);
          const row2 = buildPlayerControlsRow2();
          const row3 = buildPlayerControlsRow3();
          await interaction.update({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
        }
        return interaction.followUp({ content: `🔊 Âm lượng: **${newVol}%**`, ephemeral: true }).catch(() => {});
      }

      case 'player_queue': {
        const { embed, totalPages, currentPage } = buildQueueEmbed(queue, 0);
        const navRow = buildQueueNavRow(currentPage, totalPages);
        return interaction.reply({ embeds: [embed], components: [navRow], ephemeral: true });
      }

      case 'player_save': {
        const playlists = getPlaylists(interaction.user.id);
        if (!playlists.length) {
          return interaction.reply({
            content: '❌ Bạn chưa có playlist nào! Hãy dùng lệnh `ni!plsave <tên>` để tạo playlist trước.',
            ephemeral: true,
          });
        }
        const selectRow = buildPlaylistSelectRow(playlists);
        return interaction.reply({
          content: '📥 Chọn playlist bạn muốn thêm bài hát đang phát vào:',
          components: [selectRow],
          ephemeral: true,
        });
      }

      case 'player_lyrics': {
        await interaction.deferReply({ ephemeral: true });
        const track = queue.currentTrack;
        if (!track) return interaction.editReply('❌ Không có bài hát đang phát!');

        try {
          const result = await fetchLyrics(track.title, track.author);
          if (!result || !result.lyrics) {
            return interaction.editReply(`❌ Không tìm thấy lời bài hát cho **${track.title}**`);
          }
          const displayTitle = result.artist ? `${result.title} — ${result.artist}` : result.title;
          const truncated = result.lyrics.length > 3900 ? result.lyrics.slice(0, 3900) + '\n\n*(Lời bài hát quá dài, đã rút gọn...)*' : result.lyrics;

          const embed = baseEmbed({
            title: `📜 Lời bài hát: ${displayTitle}`,
            description: truncated,
            thumbnail: result.thumbnail || track.thumbnail,
            url: result.url || undefined,
            footer: { text: `Nguồn: ${result.source} • Ni Music Studio Engine` },
          });
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          return interaction.editReply(`❌ Lỗi tải lời bài hát: ${err.message}`);
        }
      }

      case 'player_filters_menu': {
        const row = buildFilterSelectRow(null);
        return interaction.reply({
          content: '🎛️ Chọn Audio Filter từ danh sách bên dưới:',
          components: [row],
          ephemeral: true,
        });
      }

      case 'player_export_code': {
        const tracks = queue.tracks.toArray();
        if (queue.currentTrack) tracks.unshift(queue.currentTrack);
        if (!tracks.length) {
          return interaction.reply({ content: '❌ Queue trống, không thể xuất mã code!', ephemeral: true });
        }

        const isPrem = isUserPremium(interaction.user.id) || isGuildPremium(guild.id);
        const { encodePlaylist, generateCode } = await import('../utils/playlist-codec.js');
        const { getDb } = await import('../database/db.js');
        const db = getDb();
        const liveCode = generateCode();
        const expiresAt = isPrem ? null : Math.floor(Date.now() / 1000) + 30 * 86400;
        const stmt = db.prepare(`
          INSERT INTO playlist_codes (code, playlist_id, creator_id, is_premium, data, created_at, expires_at)
          VALUES (?, NULL, ?, ?, ?, unixepoch(), ?)
        `);
        stmt.run(liveCode, interaction.user.id, isPrem ? 1 : 0, data, expiresAt);

        const exp = isPrem ? 'Vĩnh viễn' : '30 ngày';
        return interaction.reply({
          content: `📤 **Mã Code danh sách bài hát hiện tại:**\n\`${liveCode}\`\n\n📌 Nhập \`ni!plimport ${liveCode}\` để nghe lại bất kỳ lúc nào! (Hạn dùng: ${exp})`,
          ephemeral: true,
        });
      }

      // ── Select Menus ────────────────────────────────────────────────
      case 'select_filter': {
        const dj = checkDjRole(interaction);
        if (!dj.ok) return interaction.reply({ content: dj.reason, ephemeral: true });

        const selected = interaction.values[0];
        if (selected === 'none') {
          await applyFilter(queue, 'off');
          return interaction.update({ content: '🎛️ Đã tắt tất cả audio filters!', components: [] });
        }

        const f = getFilter(selected);
        if (!f) return interaction.update({ content: '❌ Filter không hợp lệ!', components: [] });

        await applyFilter(queue, selected);
        return interaction.update({ content: `🎛️ Đã kích hoạt filter: **${f.name}** ${f.emoji}`, components: [] });
      }

      case 'select_add_to_playlist': {
        const playlistId = parseInt(interaction.values[0], 10);
        const currentTrack = queue?.currentTrack;
        if (!currentTrack) {
          return interaction.update({ content: '❌ Không có bài hát đang phát!', components: [] });
        }

        addTrack(playlistId, {
          title: currentTrack.title,
          url: currentTrack.url,
          source: currentTrack.raw?.source || 'yt',
          duration: Math.floor((currentTrack.durationMS || 0) / 1000),
          author: currentTrack.author,
        });

        return interaction.update({
          content: `❤️ Đã thêm **${currentTrack.title}** vào playlist thành công!`,
          components: [],
        });
      }
    }

    // ── Pagination button: queue_page_X ──────────────────────────────
    if (customId.startsWith('queue_page_')) {
      const page = parseInt(customId.replace('queue_page_', ''), 10);
      const { embed, totalPages, currentPage } = buildQueueEmbed(queue, page);
      const navRow = buildQueueNavRow(currentPage, totalPages);
      return interaction.update({ embeds: [embed], components: [navRow] });
    }
  } catch (err) {
    logger.error('ButtonHandler', `Error handling ${customId}: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: `❌ Lỗi: ${err.message}`, ephemeral: true }).catch(() => {});
    }
  }
}
