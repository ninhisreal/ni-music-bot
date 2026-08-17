# 📖 Hướng Dẫn Cài Đặt & Triển Khai (Setup & Deployment)

Tài liệu này hướng dẫn chi tiết cách chạy **Ni Music Bot** trên máy tính cá nhân (Local) và cách Deploy lên hosting miễn phí **WispByte**.

---

## 1. Chuẩn Bị & Tạo Discord Bot

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Bấm **New Application** → Đặt tên bot (ví dụ: `Ni Music`).
3. Vào mục **Bot**:
   - Bấm **Reset Token** để lấy `DISCORD_TOKEN`.
   - Bật đầy đủ 3 mục **Privileged Gateway Intents**:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent** (Bắt buộc để dùng lệnh prefix `ni!`)
4. Vào mục **OAuth2** → **URL Generator**:
   - Chọn Scopes: `bot`, `applications.commands`
   - Chọn Bot Permissions:
     - `Send Messages`, `Embed Links`, `Attach Files`
     - `Connect`, `Speak`, `Use Voice Activity`
     - `Manage Roles` (nếu cần DJ role)
   - Copy đường link tạo ra và dán vào trình duyệt để mời Bot vào server của bạn.

---

## 2. Cài Đặt Môi Trường & Chạy Local

### Bước 1: Chuẩn bị file `.env`
Tạo file `.env` tại thư mục gốc của bot và điền các thông tin:

```env
DISCORD_TOKEN=bot_token_cua_ban
CLIENT_ID=client_id_cua_ban
OWNER_ID=id_discord_cua_ban
PREFIX=ni!
DEFAULT_LANGUAGE=vi
```

*(Tùy chọn: Thêm `GENIUS_ACCESS_TOKEN` từ [Genius API](https://genius.com/api-clients) để tìm lời bài hát tốt hơn).*

### Bước 2: Đăng ký Slash Commands
Chạy lệnh sau một lần để đăng ký các lệnh Slash (`/`) với Discord:
```bash
npm run deploy
```

### Bước 3: Khởi động Bot
```bash
npm start
```
Bot sẽ hiển thị thông báo: `[INFO] [Bot] ✅ Logged in as Ni Music#1234!`

---

## 3. Hướng Dẫn Deploy Lên Hosting Miễn Phí WispByte

WispByte cung cấp hosting miễn phí 24/7 cho Discord Bot chạy Node.js.

### Bước 1: Tạo Server trên WispByte
1. Đăng ký tài khoản tại [WispByte](https://wispbyte.com).
2. Tạo một Server miễn phí mới và chọn **Node.js** (chọn Node.js 20 hoặc 22/24).

### Bước 2: Tải Source Code lên WispByte
1. Vào **File Manager** trên bảng điều khiển WispByte.
2. Upload toàn bộ source code của bot (trừ thư mục `node_modules` và file `data/bot.db` nếu có).
3. Tạo file `.env` trên File Manager của WispByte với `DISCORD_TOKEN` và `CLIENT_ID`.

### Bước 3: Cài đặt Dependencies & Khởi chạy
1. Mở tab **Console** trên WispByte.
2. Gõ lệnh cài đặt:
   ```bash
   npm install
   ```
3. Đăng ký Slash Commands:
   ```bash
   npm run deploy
   ```
4. Đặt **Startup Command** là:
   ```bash
   npm start
   ```
5. Bấm **Start** server. Bot sẽ hoạt động 24/7!

---

## 4. Danh Sách Lệnh Tiêu Biểu

| Lệnh Slash | Lệnh Prefix | Mô tả |
|---|---|---|
| `/play <query>` | `ni!p <tên/link>` | Phát nhạc đa nền tảng (YouTube Music, Spotify, Apple Music, Deezer...) |
| `/nowplaying` | `ni!np` | Xem bài đang phát + **Bảng 14+ nút bấm tương tác trực tiếp** |
| `/queue` | `ni!q` | Xem hàng đợi với nút chuyển trang phân trang |
| `/skip` | `ni!s` | Bỏ qua bài hát hiện tại |
| `/stop` | `ni!stop` | Dừng phát nhạc và xóa hàng đợi |
| `/pause` / `/resume` | `ni!pause` / `ni!resume` | Tạm dừng / Tiếp tục phát |
| `/volume <0-200>` | `ni!vol <0-200>` | Điều chỉnh âm lượng |
| `/seek <thời gian>` | `ni!seek <1:30>` | Tua đến vị trí cụ thể |
| `/filter <tên>` | `ni!filter <bassboost>` | Áp dụng 12+ hiệu ứng âm thanh (Nightcore, 8D, Bassboost...) |
| `/lyrics` | `ni!ly` | Hiển thị lời bài hát |
| `/artistinfo` | `ni!artist` | Xem thông tin chi tiết nghệ sĩ/ca sĩ |
| `/voteskip` | `ni!vs` | Bỏ phiếu skip theo tỷ lệ >50% |
| `/sleeptimer <phút>` | `ni!sleep <30>` | Hẹn giờ tự động tắt nhạc |
| `/playlist-save <tên>` | `ni!plsave <tên>` | Lưu hàng đợi hiện tại thành playlist cá nhân |
| `/playlist-load <tên>` | `ni!plload <tên>` | Tải và phát playlist cá nhân |
| `/playlist-export <tên>`| `ni!plexport <tên>`| **Xuất playlist thành mã code 8 ký tự** |
| `/playlist-import <mã>` | `ni!plimport <mã>` | **Nhập và phát playlist từ mã code 8 ký tự** |
| `/playlist-share <tên>` | `ni!plshare <tên>` | Chia sẻ playlist dạng Embed ra kênh chat |
| `/tag add/play/list` | `ni!tag ...` | Gắn tag tâm trạng/thể loại và tìm kiếm bài theo tag |
| `/djrole @role` | `ni!djrole @role` | Cài đặt quyền DJ |
| `/channellock #kênh` | `ni!lockvc #kênh` | Khóa bot vào một kênh thoại duy nhất |
| `/schedule set` | `ni!schedule ...` | Lên lịch phát nhạc tự động hàng ngày (Premium) |
| `/settings` | `ni!config` | Bật/tắt Auto-DJ, chỉnh âm lượng mặc định |
| `/stats` | `ni!stats` | Xem thống kê nghe nhạc chi tiết |
| `/history` | `ni!recent` | Xem lịch sử 20 bài gần nhất |
| `/language <vi/en>` | `ni!lang <vi/en>` | Chuyển đổi ngôn ngữ bot |
