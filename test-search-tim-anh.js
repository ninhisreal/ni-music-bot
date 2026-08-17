import { Player, QueryType } from 'discord-player';
import { Client, GatewayIntentBits } from 'discord.js';
import { SoundCloudExtractor, SpotifyExtractor, AppleMusicExtractor } from '@discord-player/extractor';
import { searchByPlatform } from './src/player/youtube-strategy.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client, { skipFFmpeg: false });
await player.extractors.register(SoundCloudExtractor, {});
await player.extractors.register(SpotifyExtractor, {});
await player.extractors.register(AppleMusicExtractor, {});

console.log('Testing search for "tim anh lắm lối":');
const scRes = await player.search('tim anh lắm lối', { searchEngine: QueryType.SOUNDCLOUD_SEARCH });
console.log('SoundCloud results:');
for (let i = 0; i < Math.min(3, scRes.tracks?.length || 0); i++) {
  console.log(`  ${i}: "${scRes.tracks[i].title}" by ${scRes.tracks[i].author}`);
}

const spRes = await player.search('tim anh lắm lối', { searchEngine: QueryType.SPOTIFY_SEARCH });
console.log('Spotify results:');
for (let i = 0; i < Math.min(3, spRes.tracks?.length || 0); i++) {
  console.log(`  ${i}: "${spRes.tracks[i].title}" by ${spRes.tracks[i].author}`);
}

const resDeezer = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent('tim anh lắm lối')}&limit=3`).then(r=>r.json());
console.log('Deezer results:');
for (let i = 0; i < Math.min(3, resDeezer.data?.length || 0); i++) {
  console.log(`  ${i}: "${resDeezer.data[i].title}" by ${resDeezer.data[i].artist?.name}`);
}

process.exit(0);
