const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { create } = require('youtube-dl-exec');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const ytDlpPath = path.join(__dirname, '..', '..', 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const ytDlp = create(ytDlpPath, { shell: false, ffmpegLocation: ffmpegPath });
const CACHE = path.join(__dirname, 'cache');
fs.ensureDirSync(CACHE);

const audioOnlyReactions = new Map();

function convertHMS(sec) {
  sec = Number(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function cleanup(filePath) { 
  setTimeout(() => fs.unlink(filePath).catch(() => {}), 30000); 
}
function cleanYouTubeUrl(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    const domain = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname;
    if (domain === 'youtu.be') {
      const videoId = path.split('/')[1]?.substring(0, 11);
      if (videoId && videoId.length === 11) return `https://www.youtube.com/watch?v=${videoId}`;
      return url;
    }
    if (path.includes('/embed/')) {
      const match = path.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
      return url;
    }
    if (path.includes('/shorts/')) {
      const match = path.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (match) return `https://www.youtube.com/shorts/${match[1]}`;
      return url;
    }
    if (domain === 'music.youtube.com' && urlObj.searchParams.get('v')) {
      const videoId = urlObj.searchParams.get('v').substring(0, 11);
      return `https://music.youtube.com/watch?v=${videoId}`;
    }
    if (urlObj.searchParams.get('v')) {
      const videoId = urlObj.searchParams.get('v').substring(0, 11);
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    return url;
  } catch {
    return url;
  }
}
function isYouTubeMusic(url) {
  return /^https:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})$/.test(url);
}
function isYouTubeShorts(url) {
  return /^https:\/\/www\.youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})$/.test(url);
}

function isYouTubeDownloadableUrl(url) {
  const cleanUrl = cleanYouTubeUrl(url);
  return (
    /^https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})$/.test(cleanUrl) ||
    /^https:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})$/.test(cleanUrl) ||
    /^https:\/\/www\.youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})$/.test(cleanUrl)
  );
}

async function downloadVideoAndInfo(url) {
  const timestart = Date.now();
  console.log(`[YTDL] Bắt đầu download video: ${url}`);
  
  const info = await ytDlp(url, { dumpSingleJson: true });
  const duration = info.duration || 0;
  
  console.log(`[YTDL] Video info: ${info.title}, duration: ${duration}s`);
  
  if (duration > 600) {
    console.log(`[YTDL] Video quá dài: ${duration}s`);
    const error = new Error('Video quá dài, skip');
    error.shouldReact = true;
    throw error;
  }

  const outputPath = path.join(CACHE, `${info.id}.mp4`);
  const smartFormats = [
    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
    'bestvideo+bestaudio/best',
    'best[ext=mp4]',
    'best'
  ];

  let downloadSuccess = false;
  let usedFormat = '';

  for (const formatString of smartFormats) {
    try {
      console.log(`[YTDL] Thử format: ${formatString}`);
      await ytDlp(url, {
        format: formatString,
        output: outputPath,
        ffmpegLocation: ffmpegPath,
        mergeOutputFormat: 'mp4',
        noWarnings: true
      });

      if (fs.existsSync(outputPath)) {
        downloadSuccess = true;
        usedFormat = formatString;
        const stats = fs.statSync(outputPath);
        const actualMB = stats.size / 1048576;
        
        console.log(`[YTDL] Download thành công: ${actualMB.toFixed(2)}MB`);
        
        if (stats.size > 26214400) {
          fs.unlinkSync(outputPath);
          throw new Error(`⚠️ Video thực tế ${actualMB.toFixed(2)}MB, vượt quá 25MB!`);
        }
        break;
      }
    } catch (formatErr) {
      console.log(`[YTDL] Format ${formatString} failed: ${formatErr.message}`);
      if (formatErr.message.includes('vượt quá')) throw formatErr;
      continue;
    }
  }

  if (!downloadSuccess) {
    console.error('[YTDL] Tất cả format thất bại');
    throw new Error('All formats failed');
  }

  return {
    title: info.title,
    dur: info.duration,
    author: info.uploader || info.uploader_id || 'YouTube Channel',
    viewCount: info.view_count || 0,
    likes: info.like_count || 0,
    thumbnail: info.thumbnail,
    timestart,
    id: info.id,
    filePath: outputPath,
    type: 'video',
    usedFormat: usedFormat
  };
}

async function downloadMusicAndInfo(url) {
  const timestart = Date.now();
  console.log(`[YTDL] Bắt đầu download audio: ${url}`);
  
  const info = await ytDlp(url, { dumpSingleJson: true });
  const duration = info.duration || 0;
  
  if (duration > 1200) {
    console.log(`[YTDL] Audio quá dài: ${duration}s`);
    const error = new Error('Audio quá dài, skip');
    error.shouldReact = true;
    throw error;
  }

  const outputPath = path.join(CACHE, `${info.id}.m4a`);
  await ytDlp(url, {
    extractAudio: true,
    audioFormat: 'm4a',
    audioQuality: 0,
    output: outputPath,
    ffmpegLocation: ffmpegPath
  });

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    const actualMB = stats.size / 1048576;
    console.log(`[YTDL] Audio download thành công: ${actualMB.toFixed(2)}MB`);
    
    if (stats.size > 26214400) {
      fs.unlinkSync(outputPath);
      throw new Error(`⚠️ Audio thực tế ${actualMB.toFixed(2)}MB, vượt quá 25MB!`);
    }
  }

  return {
    title: info.title,
    dur: info.duration,
    author: info.uploader || info.uploader_id || 'YouTube Channel',
    viewCount: info.view_count || 0,
    likes: info.like_count || 0,
    thumbnail: info.thumbnail,
    timestart,
    id: info.id,
    filePath: outputPath,
    type: 'audio'
  };
}

async function getVideoInfo(url) {
  return await ytDlp(url, { dumpSingleJson: true });
}

async function sendVideoWithMetadata(api, data, threadID, messageID) {
  const timeUsed = Math.floor((Date.now() - data.timestart) / 1000);
  const stats = fs.statSync(data.filePath);
  const fileSizeMB = (stats.size / 1048576).toFixed(2);
  
  let msg = `> AUTODOWN: YouTube Video

📝 ${data.title}
📺 Kênh: ${data.author}
⏰ Thời lượng: ${convertHMS(data.dur)}
👁️ View: ${data.viewCount.toLocaleString()}
👍 Like: ${data.likes.toLocaleString()}
📦 Kích thước: ${fileSizeMB} MB
⏱️ Xử lý trong: ${timeUsed} giây`;

  const sendVideoWithRetry = (retryCount = 0) => {
    if (!fs.existsSync(data.filePath)) return;

    api.sendMessage({
      body: msg,
      attachment: fs.createReadStream(data.filePath)
    }, threadID, (err) => {
      if (err) {
        console.error(`[YTDL] Lỗi gửi video (attempt ${retryCount + 1}):`, err);
        if (retryCount < 2) {
          setTimeout(() => sendVideoWithRetry(retryCount + 1), 5000);
        } else {
          api.sendMessage("⚠️ Không thể gửi video do lỗi kết nối!", threadID);
          cleanup(data.filePath);
        }
      } else {
        console.log('[YTDL] Gửi video thành công');
        cleanup(data.filePath);
      }
    }, messageID);
  };

  setTimeout(sendVideoWithRetry, 3000);
}

async function sendAudioWithMetadata(api, data, threadID, messageID) {
  const timeUsed = Math.floor((Date.now() - data.timestart) / 1000);
  const stats = fs.statSync(data.filePath);
  const fileSizeMB = (stats.size / 1048576).toFixed(2);
  
  let attachment = null;
  const thumbPath = path.join(CACHE, `${data.id}-thumb.jpg`);
  
  try {
    const res = await axios.get(data.thumbnail, { responseType: 'stream' });
    const writer = fs.createWriteStream(thumbPath);
    await new Promise((resolve, reject) => {
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    attachment = fs.createReadStream(thumbPath);
  } catch (e) {
    console.log('[YTDL] Không thể tải thumbnail:', e.message);
  }

  api.sendMessage({
    body: `> AUTODOWN: YouTube Audio

🎵 ${data.title}
📺 Kênh: ${data.author}
⏰ Thời lượng: ${convertHMS(data.dur)}
👁️ View: ${data.viewCount.toLocaleString()}
👍 Like: ${data.likes.toLocaleString()}
📦 Kích thước: ${fileSizeMB} MB
⏱️ Xử lý trong: ${timeUsed} giây`,
    attachment
  }, threadID, async () => {
    if (fs.existsSync(thumbPath)) {
      try { fs.unlinkSync(thumbPath); } catch {}
    }
  }, messageID);

  setTimeout(() => {
    if (!fs.existsSync(data.filePath)) {
      return api.sendMessage("⚠️ Lỗi: File audio không tồn tại!", threadID);
    }

    api.sendMessage({
      attachment: fs.createReadStream(data.filePath)
    }, threadID, (err) => {
      if (!err) {
        console.log('[YTDL] Gửi audio thành công');
        cleanup(data.filePath);
      } else {
        console.error('[YTDL] Lỗi gửi audio, thử lại...', err);
        setTimeout(() => {
          api.sendMessage({
            attachment: fs.createReadStream(data.filePath)
          }, threadID, (retryErr) => {
            if (!retryErr) {
              console.log('[YTDL] Gửi audio thành công (retry)');
              cleanup(data.filePath);
            } else {
              console.error('[YTDL] Gửi audio thất bại (retry):', retryErr);
              api.sendMessage("⚠️ Không thể gửi file audio. Vui lòng thử lại!", threadID);
            }
          });
        }, 2000);
      }
    });
  }, 3000);
}

module.exports = {
  config: {
    name: "ytdl",
    aliases: [],
    version: "9.0",
    author: "Dương Sú",
    countDown: 0,
    role: 0,
    shortDescription: {
      vi: "Tự động tải video và âm thanh từ YouTube",
      en: "Auto download YouTube videos and audio"
    },
    longDescription: {
      vi: "Tự động phát hiện link YouTube và tải video/audio tương ứng",
      en: "Automatically detect YouTube links and download corresponding video/audio"
    },
    category: "media",
    guide: {
      vi: "Gửi link YouTube vào chat để tự động tải xuống",
      en: "Send YouTube link in chat to auto download"
    }
  },

  onStart: async function({ args, message, event, usersData, threadsData, api }) {
    return message.reply("📌 Lệnh này hoạt động tự động khi bạn gửi link YouTube vào chat!");
  },

  onReply: async function({ Reply, event, api }) {
    if (!Reply || event.messageReply?.messageID !== Reply.choiceMessageID) return;

    const choice = event.body.trim();
    if (!/^[12]$/.test(choice)) {
      return api.sendMessage("❌ Lựa chọn không hợp lệ! Vui lòng chọn số 1 (âm thanh) hoặc 2 (video).", event.threadID, event.messageID);
    }

    console.log(`[YTDL] User chọn: ${choice === "1" ? "audio" : "video"}`);
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      let data;
      if (choice === "1") {
        data = await downloadMusicAndInfo(Reply.url);
        await sendAudioWithMetadata(api, data, event.threadID, event.messageID);
      } else {
        data = await downloadVideoAndInfo(Reply.url);
        if (!data || !fs.existsSync(data.filePath)) return;
        await sendVideoWithMetadata(api, data, event.threadID, event.messageID);
      }

      api.setMessageReaction("✅", event.messageID, () => {}, true);
      
      if (Reply.choiceMessageID) {
        api.unsendMessage(Reply.choiceMessageID);
      }
    } catch (err) {
      console.error('[YTDL] Lỗi xử lý reply:', err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      
      if (err.shouldReact) return;
      
      if (err.message.includes('vượt quá')) {
        api.sendMessage(err.message, event.threadID, event.messageID);
      } else {
        api.sendMessage("⚠️ Đã xảy ra lỗi khi xử lý lựa chọn!", event.threadID, event.messageID);
      }

      if (Reply.choiceMessageID) {
        api.unsendMessage(Reply.choiceMessageID);
      }
    }
  },

  onReaction: async function({ Reaction, event, api }) {
    if (!Reaction || !audioOnlyReactions.has(Reaction.messageID)) return;

    const reactionData = audioOnlyReactions.get(Reaction.messageID);
    audioOnlyReactions.delete(Reaction.messageID);

    console.log('[YTDL] User react để tải audio');
    
    try {
      api.setMessageReaction("🎵", reactionData.originalMessageID, () => {}, true);
      api.setMessageReaction("⏳", Reaction.messageID, () => {}, true);

      const data = await downloadMusicAndInfo(reactionData.url);
      await sendAudioWithMetadata(api, data, event.threadID, reactionData.originalMessageID);

      api.setMessageReaction("✅", Reaction.messageID, () => {}, true);
      setTimeout(() => {
        api.unsendMessage(Reaction.messageID);
      }, 30000);
    } catch (err) {
      console.error('[YTDL] Lỗi xử lý reaction:', err);
      api.setMessageReaction("❌", Reaction.messageID, () => {}, true);
      
      if (err.shouldReact) return;
      
      if (err.message.includes('vượt quá')) {
        api.sendMessage(err.message, event.threadID, reactionData.originalMessageID);
      } else {
        api.sendMessage("⚠️ Đã xảy ra lỗi khi xử lý audio!", event.threadID, reactionData.originalMessageID);
      }

      setTimeout(() => {
        api.unsendMessage(Reaction.messageID);
      }, 5000);
    }
  },

  onChat: async function({ event, message, api, Reply, Reaction }) {
    const urlRegex = /(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/[^\s]+/gi;
    const match = event.body?.match(urlRegex);
    if (!match) return;

    const originalUrl = match[0];
    const cleanUrl = cleanYouTubeUrl(originalUrl);
    
    console.log(`[YTDL] Phát hiện URL: ${originalUrl} -> ${cleanUrl}`);

    if (!isYouTubeDownloadableUrl(cleanUrl)) {
      console.log('[YTDL] URL không hợp lệ để download');
      return;
    }

    try {
      if (isYouTubeMusic(cleanUrl)) {
        console.log('[YTDL] Xử lý YouTube Music');
        api.setMessageReaction("⏳", event.messageID, () => {}, true);
        
        const info = await ytDlp(cleanUrl, { dumpSingleJson: true });
        if ((info.duration || 0) > 1200) {
          api.setMessageReaction("❌", event.messageID, () => {}, true);
          return;
        }
        
        const data = await downloadMusicAndInfo(cleanUrl);
        await sendAudioWithMetadata(api, data, event.threadID, event.messageID);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
        return;
      }

      if (isYouTubeShorts(cleanUrl)) {
        console.log('[YTDL] Xử lý YouTube Shorts');
        api.setMessageReaction("⏳", event.messageID, () => {}, true);
        
        const data = await downloadVideoAndInfo(cleanUrl);
        await sendVideoWithMetadata(api, data, event.threadID, event.messageID);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
        return;
      }

      console.log('[YTDL] Xử lý YouTube video thường');
      const info = await getVideoInfo(cleanUrl);
      const duration = info.duration || 0;

      if (duration > 1200) {
        console.log(`[YTDL] Video quá dài: ${duration}s, skip`);
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return;
      }

      if (duration > 600) {
        console.log('[YTDL] Video dài, chỉ cho phép tải audio');
        
        let thumbnailAttachment = null;
        const tempThumbPath = path.join(CACHE, `temp_thumb_${Date.now()}.jpg`);
        try {
          const res = await axios.get(info.thumbnail, { responseType: 'stream' });
          const writer = fs.createWriteStream(tempThumbPath);
          await new Promise((resolve, reject) => {
            res.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          thumbnailAttachment = fs.createReadStream(tempThumbPath);
        } catch {}

        api.sendMessage({
          body: `📹 Video dài ${convertHMS(duration)} đã được phát hiện!

🎵 ${info.title}
📺 Kênh: ${info.uploader}
👁️ View: ${(info.view_count || 0).toLocaleString()}
👍 Like: ${(info.like_count || 0).toLocaleString()}

⚠️ Video quá dài để tải xuống, cậu chỉ có thể tải âm thanh.
👆 Hãy thả emoji bất kì vào tin nhắn này để tải âm thanh nhé!`,
          attachment: thumbnailAttachment
        }, event.threadID, (err, messageInfo) => {
          if (fs.existsSync(tempThumbPath)) {
            try { fs.unlinkSync(tempThumbPath); } catch {}
          }
          if (!err) {
            api.setMessageReaction("🎵", event.messageID, () => {}, true);
            audioOnlyReactions.set(messageInfo.messageID, {
              url: cleanUrl,
              info: info,
              originalMessageID: event.messageID
            });
            
            // Add to global handler for reactions
            if (!global.GoatBot.onReaction) global.GoatBot.onReaction = [];
            global.GoatBot.onReaction.push({
              messageID: messageInfo.messageID,
              commandName: this.config.name,
              author: event.senderID,
              url: cleanUrl
            });
          }
        }, event.messageID);
        return;
      }

      console.log('[YTDL] Video ngắn, cho phép chọn audio/video');
      let thumbnailAttachment = null;
      const tempThumbPath = path.join(CACHE, `temp_thumb_${Date.now()}.jpg`);
      try {
        const res = await axios.get(info.thumbnail, { responseType: 'stream' });
        const writer = fs.createWriteStream(tempThumbPath);
        await new Promise((resolve, reject) => {
          res.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        thumbnailAttachment = fs.createReadStream(tempThumbPath);
      } catch {}

      api.sendMessage({
        body: `📹 Video ${duration < 300 ? 'ngắn' : 'dài'} ${convertHMS(duration)} đã được phát hiện!

📝 ${info.title}
📺 Kênh: ${info.uploader}
👁️ View: ${(info.view_count || 0).toLocaleString()}
👍 Like: ${(info.like_count || 0).toLocaleString()}

> Cậu muốn tải theo dạng nào?
1️⃣ Âm thanh (.mp3; .m4a)
2️⃣ Video (.mp4)
> Hãy reply theo số 1 hoặc 2 nhé:`,
        attachment: thumbnailAttachment
      }, event.threadID, (err, messageInfo) => {
        if (fs.existsSync(tempThumbPath)) {
          try { fs.unlinkSync(tempThumbPath); } catch {}
        }
        if (!err) {
          api.setMessageReaction("⏳", messageInfo.messageID, () => {}, true);
          api.setMessageReaction("❓", event.messageID, () => {}, true);
          
          // Add to global handler for replies
          if (!global.GoatBot.onReply) global.GoatBot.onReply = [];
          global.GoatBot.onReply.push({
            messageID: messageInfo.messageID,
            commandName: this.config.name,
            author: event.senderID,
            choiceMessageID: messageInfo.messageID,
            url: cleanUrl
          });
        }
      }, event.messageID);

    } catch (err) {
      console.error('[YTDL] Lỗi xử lý YouTube URL:', err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      
      if (err.shouldReact) return;
      
      if (err.message.includes('vượt quá')) {
        api.sendMessage(err.message, event.threadID, event.messageID);
      } else {
        api.sendMessage("⚠️ Đã xảy ra lỗi khi xử lý link YouTube!", event.threadID, event.messageID);
      }
    }
  },

  onLoad: async function({ api }) {
    console.log('[YTDL] Module loaded');
    audioOnlyReactions.clear();
  }
};
