/* eslint linebreak-style: 0 */
const Command = require(`${process.cwd()}/base/Command.js`);
const { MessageEmbed, Util } = require("discord.js");
const ytapi = require("simple-youtube-api"); 
const ytdl = require("ytdl-core");
const youtube = new ytapi("AIzaSyCqeZHQu2R-LrkPolNH_kfszTUjp3oUPls"); 

class Play extends Command {
  constructor(client) {
    super(client, {
      name: "play",
      description: "This command will allow the bot to play a song.",
      usage: "play <url|song-name>",
      category: "Music",
      cost: 5
    });
  }

  async run(message, args, level) { // eslint-disable-line no-unused-vars
    const url = args[0] ? args[0].replace(/<(.+)>/g, "$1") : "";
    if (!args[0]) {
      const embed = new MessageEmbed()
        .setAuthor("Error")
        .setDescription("Please list a song you would like to play")
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
    const voiceChannel = message.member.voiceChannel;
    if (!voiceChannel) {
      const embed = new MessageEmbed()
        .setAuthor("Error")
        .setDescription("I'm sorry but you need to be in a voice channel to play music!")
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT")) {
      const embed = new MessageEmbed()
        .setAuthor("Error")
        .setDescription("I cannot connect to your voice channel, make sure I have the proper permissions!")
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
    if (!permissions.has("SPEAK")) {
      const embed = new MessageEmbed()
        .setAuthor("Error")
        .setDescription("I cannot speak in this voice channel, make sure I have the proper permissions!")
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      const playlist = await youtube.getPlaylist(url);
      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
        await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
      }
      const embed = new MessageEmbed()
        .setAuthor("Playlist")
        .setDescription(`✅ Playlist: **${playlist.title}** has been added to the queue!`)
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      message.channel.send(embed);
    } else {
      let video;
      try {
        video = await youtube.getVideo(url);
      } catch (error) {
        const videos = await youtube.searchVideos(args.join(" "), 1);
        video = await youtube.getVideoByID(videos[0].id);          
      }
      return handleVideo(video, message, voiceChannel);
    }
  }
}

module.exports = Play;

async function handleVideo(video, message, voiceChannel, playlist = false) {
  const queue = message.client.playlists; 
  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    url: `https://www.youtube.com/watch?v=${video.id}`,
    channel: video.channel.title,
    channelurl: `https://www.youtube.com/channel/${video.channel.id}`,
    durationh: video.duration.hours,
    durationm: video.duration.minutes,
    durations: video.duration.seconds,
    thumbnail: video.thumbnails.default.url,
    author: message.author.username,
    requesterid: message.author.id
  };
  if (!queue.has(message.guild.id)) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
      loop: false
    };
    queue.set(message.guild.id, queueConstruct);
    queueConstruct.songs.push(song);
    try {
      const connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(message.guild, queueConstruct.songs[0]);
    } catch (error) {
      queue.delete(message.guild.id);
      const embed = new MessageEmbed()
        .setAuthor("Error")
        .setDescription(`An error has occured: ${error}`)
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
  } else {
    queue.get(message.guild.id).songs.push(song);
    if (playlist) return;
    else {
      const embed = new MessageEmbed()
        .setAuthor("Song added!")
        .setDescription(`✅ **${song.title}** has been added to the queue!`)
        .setColor(message.guild.me.roles.highest.color || 0x00AE86);
      return message.channel.send(embed);
    }
  }
  return;
}

function play(guild, song) {
  const queue = guild.client.playlists;
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = queue.get(guild.id).connection.play(ytdl(song.url))
    .on("end", () => {
      if (!serverQueue.loop) {
        queue.get(guild.id).songs.shift();
        setTimeout(() => {
          play(guild, queue.get(guild.id).songs[0]);
        }, 250); 
      } else {
        setTimeout(() => {
          play(guild, queue.get(guild.id).songs[0]);
        }, 250);		   
      }
    });
  dispatcher.setVolumeLogarithmic(queue.get(guild.id).volume / 5);
  let songdurm, songdurh, songdurs;
  if (song.durationm < 10) songdurm = "0"+song.durationm;
  if (song.durationm >= 10) songdurm = song.durationm;
  if (song.durations < 10) songdurs = "0"+song.durations;
  if (song.durations >= 10) songdurs = song.durations;
  if (song.durationh < 10) songdurh = "0"+song.durationh;
  if (song.durationh >= 10) songdurh = song.durationh;
  
  const embed = new MessageEmbed()
    .setTitle(song.channel)
    .setURL(song.channelurl)
    .setThumbnail(song.thumbnail)
    .setDescription(`[${song.title}](${song.url})`)
    .addField("__Duration__",`${songdurh}:${songdurm}:${songdurs}`, true)
    .addField("__Requested by__", song.author, true)
    .setColor(guild.member(guild.client.user.id).roles.highest.color || 0x00AE86);
  if (!serverQueue.loop) return queue.get(guild.id).textChannel.send(embed);
}