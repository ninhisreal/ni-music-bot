import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { COLORS, EMOJI } from '../utils/constants.js';
import { formatDuration } from '../utils/duration.js';
import { getSourceInfo } from './builder.js';

/**
 * Build search results embed with numbered entries.
 */
export function buildSearchResultsEmbed(tracks, query) {
  const lines = tracks.slice(0, 10).map((t, i) => {
    const src = getSourceInfo(t.url);
    const dur = t.duration || formatDuration(t.durationMS);
    const srcName = t.source ? t.source.toUpperCase() : src.name;
    return `${EMOJI.NUMS[i]} **${t.title.slice(0, 60)}** — \`${dur}\`\n   👤 ${t.author || 'Unknown'} | 🌐 \`${srcName}\``;
  });

  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`🔍 Kết quả tìm kiếm: "${query.slice(0, 100)}"`)
    .setDescription(lines.join('\n\n') || 'Không có kết quả.')
    .setFooter({ text: 'Chọn bài hát từ menu hoặc bấm nút đổi nền tảng • 🎵 Ni Music Bot' })
    .setTimestamp();
}

/**
 * Build playlist info embed.
 */
export function buildPlaylistEmbed(playlist, tracks, code = null) {
  const totalMs = tracks.reduce((a, t) => a + (t.duration || 0) * 1000, 0);
  const list = tracks.slice(0, 15).map((t, i) =>
    `\`${i + 1}.\` **${t.title.slice(0, 50)}** — \`${formatDuration(t.duration * 1000)}\``
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.spotify)
    .setTitle(`🎵 Playlist: ${playlist.name}`)
    .setDescription(list || '*Playlist trống*')
    .addFields(
      { name: '🎵 Số bài', value: String(tracks.length), inline: true },
      { name: '⏱️ Tổng thời gian', value: formatDuration(totalMs), inline: true },
    )
    .setFooter({ text: code ? `📤 Mã: ${code} • 🎵 Ni Music Bot` : '🎵 Ni Music Bot' })
    .setTimestamp();

  if (tracks.length > 15) {
    embed.addFields({ name: '...', value: `+${tracks.length - 15} bài nữa`, inline: false });
  }

  return embed;
}

/**
 * Build the comprehensive help embed showing all commands with shortcuts, examples and icons.
 * Each field is kept strictly under 1000 characters to comply with Discord API limits.
 *
 * @param {'all'|'music'|'playlist'|'admin'|'utility'} category
 * @returns {EmbedBuilder}
 */
export function buildHelpEmbed(category = 'all') {
  const embed = new EmbedBuilder()
    .setColor(COLORS.default)
    .setTitle('📖 Bảng Danh Sách Lệnh — Ni Music Bot')
    .setDescription('🎧 **Bot Nhạc Đa Nền Tảng Cao Cấp (Prefix `ni!`)**\nThứ tự tìm kiếm: `Deezer > Spotify > Apple Music > YouTube > SoundCloud`\n*(Dùng Menu bên dưới để lọc chi tiết từng nhóm)*')
    .setFooter({ text: '💡 Dùng ni!np để mở bảng 13 nút điều khiển không cần gõ lệnh • 🎵 Ni Music Bot' })
    .setTimestamp();

  if (category === 'all' || category === 'music') {
    embed.addFields(
      {
        name: '🎵 1. Phát Nhạc Cơ Bản',
        value: [
          '• `ni!play <tên/link>` (`ni!p`): Phát nhạc đa nguồn *(VD: `ni!p Nơi này có anh`)*',
          '• `ni!np`: Bảng điều khiển 13 nút bấm không cần gõ lệnh',
          '• `ni!search <tên>` (`ni!find`): Tìm 10 bài kèm nút đổi nền tảng',
          '• `ni!queue` (`ni!q`): Xem hàng đợi bài hát (có nút chuyển trang)',
          '• `ni!skip` (`ni!s`, `ni!next`): Bỏ qua bài hát đang phát',
          '• `ni!stop` (`ni!dc`, `ni!leave`): Dừng phát và rời phòng',
          '• `ni!pause` / `ni!resume`: Tạm dừng / Tiếp tục phát',
        ].join('\n'),
        inline: false,
      },
      {
        name: '⚡ 2. Tìm Kiếm Nhanh & Tinh Chỉnh',
        value: [
          '• `ni!dz <tên>`: Chỉ tìm từ **Deezer** *(VD: `ni!dz Sơn Tùng`)*',
          '• `ni!sp <tên>`: Chỉ tìm từ **Spotify** *(VD: `ni!sp Shape of you`)*',
          '• `ni!am <tên>`: Chỉ tìm từ **Apple Music** *(VD: `ni!am Lạc Trôi`)*',
          '• `ni!yt <tên>`: Chỉ tìm từ **YouTube Music** *(VD: `ni!yt Saigon Noir`)*',
          '• `ni!sc <tên>`: Chỉ tìm từ **SoundCloud** *(VD: `ni!sc EDM Remix`)*',
          '• `ni!vol <0-200>` (`ni!v`): Chỉnh âm lượng *(VD: `ni!vol 80`)*',
          '• `ni!seek <1:30>`: Tua nhạc đến vị trí bất kỳ',
          '• `ni!shuffle` (`ni!sh`): Xáo trộn hàng đợi',
          '• `ni!loop [track/queue/off]`: Lặp bài / hàng đợi',
          '• `ni!rm <vị trí>`: Xóa bài khỏi queue | `ni!mv <từ> <đến>`: Đổi vị trí',
          '• `ni!lyrics [tên]` (`ni!ly`): Xem lời bài hát (Genius)',
          '• `ni!fx [tên/off]`: Bộ lọc PCM *(bassboost, nightcore, vaporwave...)*',
          '• `ni!vs`: Vote skip | `ni!sleep <phút>`: Hẹn giờ tắt nhạc',
        ].join('\n'),
        inline: false,
      }
    );
  }

  if (category === 'all' || category === 'playlist') {
    embed.addFields({
      name: '💾 3. Playlist & Mã Code Chia Sẻ',
      value: [
        '• `ni!plsave <tên>`: Lưu toàn bộ queue thành Playlist cá nhân',
        '• `ni!plload <tên>`: Phát danh sách bài hát từ Playlist',
        '• `ni!pllist`: Xem danh sách tất cả Playlist của bạn',
        '• `ni!pldel <tên>`: Xóa một Playlist cá nhân',
        '• `ni!plexport <tên>`: **Xuất playlist thành Mã Code 8 ký tự**',
        '• `ni!plimport <mã>`: **Nhập Mã Code 8 ký tự để nghe lại playlist**',
        '• `ni!plshare <tên>`: Chia sẻ Playlist dạng Embed vào chat',
        '• `ni!tag <add/play/list>`: Quản lý & phát nhạc theo thẻ tâm trạng *(#chill)*',
      ].join('\n'),
      inline: false,
    });
  }

  if (category === 'all' || category === 'admin') {
    embed.addFields({
      name: '⚙️ 4. Quản Trị Server & Cài Đặt',
      value: [
        '• `ni!setup`: Cấu hình nhanh phòng voice & DJ Role',
        '• `ni!djrole [@role / clear]`: Chỉ định Role DJ quản lý bot',
        '• `ni!lockvc [#kênh / unlock]`: Khóa bot trong 1 phòng voice',
        '• `ni!config`: Cài đặt server & bật/tắt Auto-DJ nối bài tự động',
        '• `ni!schedule <set/view/clear>`: **Lên lịch phát playlist tự động (Premium)**',
        '• `ni!premium`: Xem trạng thái gói Premium của server',
      ].join('\n'),
      inline: false,
    });
  }

  if (category === 'all' || category === 'utility') {
    embed.addFields({
      name: '📊 5. Tiện Ích & Thống Kê',
      value: [
        '• `ni!help` (`ni!h`): Hiển thị bảng danh mục hướng dẫn này',
        '• `ni!ping` (`ni!latency`): Kiểm tra độ trễ mạng bot',
        '• `ni!mystats` (`ni!stats`): **Thống kê nghe nhạc: Tổng giờ, Top bài, Top ca sĩ**',
        '• `ni!history`: Lịch sử 20 bài gần nhất của server',
        '• `ni!lang <vi / en>`: Đổi ngôn ngữ bot (Tiếng Việt / English)',
        '• `ni!invite`: Lấy link mời bot vào server khác',
      ].join('\n'),
      inline: false,
    });
  }

  return embed;
}

/**
 * Build the interactive Help Category Select Menu Row.
 */
export function buildHelpSelectRow(activeCategory = 'all') {
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_help_category')
    .setPlaceholder('📑 Lọc danh mục lệnh chi tiết...');

  select.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel('Tất cả các lệnh (Tổng quan)')
      .setValue('all')
      .setEmoji('📖')
      .setDefault(activeCategory === 'all'),
    new StringSelectMenuOptionBuilder()
      .setLabel('1. Nhóm Phát Nhạc (18 lệnh)')
      .setValue('music')
      .setEmoji('🎵')
      .setDefault(activeCategory === 'music'),
    new StringSelectMenuOptionBuilder()
      .setLabel('2. Nhóm Playlist & Mã Code (8 lệnh)')
      .setValue('playlist')
      .setEmoji('💾')
      .setDefault(activeCategory === 'playlist'),
    new StringSelectMenuOptionBuilder()
      .setLabel('3. Nhóm Quản Trị Server (6 lệnh)')
      .setValue('admin')
      .setEmoji('⚙️')
      .setDefault(activeCategory === 'admin'),
    new StringSelectMenuOptionBuilder()
      .setLabel('4. Nhóm Tiện Ích & Thống Kê (6 lệnh)')
      .setValue('utility')
      .setEmoji('📊')
      .setDefault(activeCategory === 'utility')
  );

  return new ActionRowBuilder().addComponents(select);
}
