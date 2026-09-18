# 📖 Hướng Dẫn Cài Đặt & Triển Khai (Setup & Deployment)

Tài liệu này hướng dẫn chi tiết cách chạy **Ni Music Bot** trên máy tính cá nhân (Local), hosting đám mây và điện thoại di động Android qua **Termux**.

---

## 1. Chuẩn Bị & Tạo Discord Bot

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Bấm **New Application** → Đặt tên bot (ví dụ: `Ni Music`).
3. Vào mục **Bot**:
   - Bấm **Reset Token** để lấy `DISCORD_TOKEN`. *(Nếu token từng bị lộ, bạn bắt buộc phải reset ngay).*
   - Bật đầy đủ 3 mục **Privileged Gateway Intents**:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent** (Bắt buộc để dùng lệnh prefix `ni!`)
4. Vào mục **OAuth2** → **URL Generator**:
   - Chọn Scopes: `bot`, `applications.commands`
   - Chọn Bot Permissions:
     - `Send Messages`, `Embed Links`, `Attach Files`
     - `Connect`, `Speak`, `Use Voice Activity`
     - `Manage Roles` (nếu dùng DJ role)
   - Copy đường link tạo ra và dán vào trình duyệt để mời Bot vào server của bạn.

---

## 2. Cài Đặt Môi Trường & Chạy Local / PC

### Yêu Cầu Hệ Thống:
- **Node.js >= 22.12.0** hoặc **Node.js 24.x** (Bắt buộc để tương thích với `@discordjs/voice` và sử dụng `node:sqlite` bản địa hiệu năng cao).
- **FFmpeg** đã được cài đặt trong PATH hệ thống.

### Bước 1: Chuẩn bị file `.env`
Tạo file `.env` tại thư mục gốc của bot:

```env
# Bắt buộc (Fail-closed)
DISCORD_TOKEN=bot_token_moi_cua_ban
CLIENT_ID=client_id_cua_ban
OWNER_ID=discord_user_id_cua_ban
ALLOWED_GUILD_ID=discord_server_id_cua_ban

# Tùy chọn
PREFIX=ni!
DEFAULT_LANGUAGE=vi
TEST_GUILD_ID=id_server_de_test_slash_command_tuc_thi
```

### Bước 2: Đăng ký Slash Commands
Chạy lệnh sau để đồng bộ toàn bộ Slash Commands lên Discord:
```bash
npm run deploy
```

### Bước 3: Chạy Kiểm Thử Tự Động (Unit Tests)
```bash
npm test
```

### Bước 4: Khởi động Bot
```bash
npm start
```

---

## 3. Hướng Dẫn Chạy Bền Bỉ Trên Điện Thoại Android (Termux 12GB RAM)

Thiết bị Android 12GB RAM hoàn toàn đủ sức chạy bot 24/7 mượt mà. Tuy nhiên, bạn cần ngăn chặn hệ điều hành Android ngắt kết nối mạng hoặc đưa ứng dụng vào chế độ ngủ (Doze Mode).

### Bước 1: Cài đặt Termux và công cụ
Mở Termux và chạy các lệnh:
```bash
pkg update -y
pkg install -y nodejs-lts git ffmpeg
```
Kiểm tra phiên bản Node: `node -v` (yêu cầu >= 22.12).

### Bước 2: Khóa Wake Lock (Chống tắt CPU khi tắt màn hình)
```bash
termux-wake-lock
```
*Lưu ý:* Vào **Cài đặt Android** → **Ứng dụng** → **Termux** → **Pin (Battery)** → Chọn **Không giới hạn (Unrestricted / Tắt tối ưu hóa pin)**.

### Bước 3: Cài đặt mã nguồn & Dependencies
```bash
git clone <url_repo>
cd "Discord Bot"
npm install
npm run deploy
```

### Bước 4: Chạy nền với PM2
Cài đặt PM2 để tự động khởi động lại bot nếu gặp sự cố hoặc tràn RAM:
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```
Các lệnh quản lý PM2 tiện lợi:
- Xem log hoạt động: `pm2 logs discord-music-bot`
- Kiểm tra trạng thái: `pm2 status`
- Khởi động lại bot: `pm2 restart discord-music-bot`

---

## 4. Danh Sách Lệnh Tiêu Biểu

| Lệnh Slash | Lệnh Prefix | Mô tả |
|---|---|---|
| `/play <query> [platform]` | `ni!p <tên/link>` | Phát nhạc trực tiếp từ YouTube, Spotify, Apple Music, Deezer, SoundCloud |
| `/nowplaying` | `ni!np` | Xem bảng điều khiển bài đang phát với **14+ nút bấm tương tác trực tiếp** |
| `/queue [page]` | `ni!q` | Xem hàng đợi phát nhạc kèm nút phân trang |
| `/playlist <list/create/play/view/delete/share/import>` | `ni!pl <subcommand>` | Hệ thống quản lý playlist và chia sẻ mã code hợp nhất |
| `/filter [name]` | `ni!fx <tên>` | 10+ bộ lọc DSP thời gian thực mượt mà (Bassboost, Nightcore, 8D, Treble...) |
| `/skip` | `ni!s` | Bỏ qua bài hát hiện tại |
| `/stop` | `ni!stop` | Dừng phát nhạc và dọn dẹp hàng đợi |
| `/volume <0-200>` | `ni!vol <0-200>` | Điều chỉnh âm lượng phát |
| `/lyrics` | `ni!ly` | Hiển thị lời bài hát |
