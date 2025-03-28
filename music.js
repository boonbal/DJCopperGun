const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytsr = require('yt-search');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const player = createAudioPlayer();
const connections = new Map();

// 봇 로그인 시
client.once('ready', () => {
    console.log(`${client.user.tag}이 로그인 하였습니다!`);
});

// 메시지에 반응하는 부분
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.split(' ');

    // !입장 명령어로 음성 채널에 들어가기
    if (args[0] === '!입장') {
        if (message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });
            connections.set(message.guild.id, connection);
            message.reply('음성 채널에 들어왔어요!');
        } else {
            message.reply('음성 채널에 먼저 들어가세요!');
        }
    }

    // !꺼져 명령어로 음성 채널에서 나가기
    if (args[0] === '!꺼져') {
        const connection = connections.get(message.guild.id);
        if (connection) {
            connection.destroy();
            connections.delete(message.guild.id);
            message.reply('음성 채널에서 나갔어요!');
        } else {
            message.reply('먼저 음성 채널에 들어가야 해요!');
        }
    }

    // !틀어 명령어로 음악 재생하기
    if (args[0] === '!틀어') {
        const query = args.slice(1).join(' ');
        if (!query) {
            message.reply('재생할 음악 제목을 입력하세요!');
            return;
        }

        const connection = connections.get(message.guild.id);
        if (!connection) {
            message.reply('음성 채널에 먼저 들어가세요!');
            return;
        }

        const video = await searchYouTube(query);
        if (!video) {
            message.reply('해당하는 음악을 찾을 수 없어요!');
            return;
        }

        playMusic(connection, video.url);
        message.reply(`음악을 재생해요: ${video.title}`);
    }
});

// 유튜브에서 음악 검색
async function searchYouTube(query) {
    const results = await ytsr(query);
    if (results && results.items.length > 0) {
        return results.items[0]; // 첫 번째 결과 반환
    }
    return null;
}

// 음악 재생
function playMusic(connection, url) {
    const stream = spawn(ffmpeg, [
        '-re', '-i', url,
        '-vn', '-ac', '2', '-b:a', '192k', '-f', 'mp3', 'pipe:1'
    ]);

    const resource = createAudioResource(stream.stdout);
    player.play(resource);

    connection.subscribe(player);
}

// 봇 로그인
client.login(process.env.TOKEN);
