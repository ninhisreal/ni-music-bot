import { Player, QueryType } from 'discord-player';
import { Client, GatewayIntentBits } from 'discord.js';
import { SoundCloudExtractor, SpotifyExtractor, AppleMusicExtractor } from '@discord-player/extractor';
import { resolveYoutubeOEmbed } from './src/player/youtube-strategy.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client, { skipFFmpeg: false });
await player.extractors.register(SoundCloudExtractor, {});

const oembed = await resolveYoutubeOEmbed('https://youtu.be/WPkpO_8lWRs');
console.log('oEmbed Title:', oembed.title);
console.log('oEmbed Author:', oembed.author);

// Search SoundCloud with Title + Author
const query = `${oembed.title} ${oembed.author}`.trim();
console.log('Search Query:', query);
const res = await player.search(query, { searchEngine: QueryType.SOUNDCLOUD_SEARCH });
console.log('Found tracks:', res.tracks?.length);
for (let i = 0; i < Math.min(5, res.tracks?.length || 0); i++) {
  console.log(`  ${i}: "${res.tracks[i].title}" by ${res.tracks[i].author}`);
}

process.exit(0);
