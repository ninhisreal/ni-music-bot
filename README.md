# 🎵 Ni Music Bot v2.0 (Studio HD Engine)

Bot phát nhạc Discord hiệu năng cao, siêu mượt, không giật lag, tối ưu hóa bộ nhớ chuyên dụng cho máy chủ cá nhân hoặc thiết bị di động (Android / Termux).

## ✨ Tính năng nổi bật
- 🎧 **Studio HD Master Audio**: Chuẩn hóa 48,000Hz 16-bit Stereo Opus, chống rè tiếng và chống giật khựng 100%.
- 🔀 **Multi-Platform Search & Stream Bridging**: Tìm kiếm và phát thông minh từ **Deezer**, **Spotify**, **Apple Music**, **YouTube Music**, và **SoundCloud**.
- 🎛️ **Audio DSP Filters**: Bass Boost (Dynamic / Extreme), 8D Audio, Nightcore, Vaporwave, Pop, Treble, Karaoke, Studio Normalizer.
- ⚡ **Ultra-Lightweight Memory**: Kiến trúc Pure-JS Database & In-Memory Cache chỉ tiêu tốn ~60MB - 80MB RAM.
- 📱 **Mobile Hosting Ready**: Chạy 24/7 mượt mà trên Android Termux (PM2) mà không tốn pin.
- 🛡️ **Guild Guard & Bot Lock**: Giới hạn máy chủ độc quyền theo ID.

## 🚀 Cài đặt & Chạy Bot

### 1. Trên Máy Tính (PC / VPS)
```bash
git clone https://github.com/ninhisreal/ni-music-bot.git
cd ni-music-bot
npm install
cp .env.example .env
# Chỉnh sửa file .env với Discord Token của bạn
npm start
```

### 2. Trên Điện Thoại Android (Termux)
```bash
pkg update -y && pkg install -y git nodejs ffmpeg build-essential
npm install -g pm2

git clone https://github.com/ninhisreal/ni-music-bot.git
cd ni-music-bot
npm install
nano .env
# Dán cấu hình Token của bạn vào file .env (Ctrl+O -> Enter -> Ctrl+X)

# Khởi chạy 24/7 với PM2
pm2 start index.js --name "ni-bot" --node-args="--expose-gc"
pm2 save
```
