const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ogmp3 } = require("../lib/youtubedl.js");
const LimitAud = 26 * 1024 * 1024;
const LimitVid = 83 * 1024 * 1024; 
const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_AUDIO_DIR = path.join(CACHE_DIR, "audio");
const CACHE_VIDEO_DIR = path.join(CACHE_DIR, "video");
const CACHE_THUMB_DIR = path.join(CACHE_DIR, "thumbnails");
const HISTORY_FILE_PATH = path.join(__dirname, "ythistory.json");
[CACHE_DIR, CACHE_AUDIO_DIR, CACHE_VIDEO_DIR, CACHE_THUMB_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
let cacheHistory = {};
if (fs.existsSync(HISTORY_FILE_PATH)) {
    cacheHistory = JSON.parse(fs.readFileSync(HISTORY_FILE_PATH, "utf8"));
}

module.exports = {
    config: {
        name: "yt",
        aliases: ["play"],
        version: "2.5",
        author: "Dương Api",
        countDown: 10,
        role: 0,
        description: {
            vi: "🌟 Tải audio/video từ YouTube, tìm kiếm video hoặc xem thông tin chi tiết video"
        },
        category: "media",
        guide: {
            vi: "🎮 **Cách dùng lệnh:**\n"
                + "🔹 `{pn} <từ khóa hoặc link YouTube> [-a|-v]`\n"
                + "🔹 `{pn} -l <ID video>` (VD: uIO0_7eo): Yêu cầu tải audio/video theo ID video\n"
                + "🔹 `{pn} -s <từ khóa>` hoặc `search <từ khóa>`: Tìm kiếm 3 video, trả lời số thứ tự để xem chi tiết\n"
                + "🔹 `{pn} cache`: Xem số lượng file video/audio đã lưu trong cache\n"
                + "📌 **Ví dụ:** `{pn} -s Sơn Tùng`"
        }
    },

    langs: {
        vi: {
            missingInput: "⚠️ Vui lòng nhập từ khóa, link YouTube hoặc ID video với -l/-s.",
            invalidType: "❌ Vui lòng chọn -a (audio) hoặc -v (video).",
            chooseType: "🎛️ Chọn loại:\n"
                + "1. 🎵 Audio\n"
                + "2. 📹 Video\n"
                + "📩 Vui lòng trả lời với số (1 hoặc 2).",
            invalidChoice: "❌ Lựa chọn không hợp lệ, vui lòng trả lời 1 (audio) hoặc 2 (video).",
            searching: "🔍 Đang tìm kiếm: %1...",
            searchResults: "🔍 Kết quả tìm kiếm cho '%1':\n%2\n📩 Vui lòng trả lời với số (1-3) để xem chi tiết.",
            videoInfo: "📹 **Thông tin video**:\n"
                + "📌 Tiêu đề: %1\n"
                + "👤 Tác giả: %2\n"
                + "👀 Lượt xem: %3\n"
                + "🔗 Link: %4\n\n"
                + "🎛️ Chọn định dạng muốn tải:\n"
                + "1. 🎵 Âm thanh\n"
                + "2. 📹 Video\n"
                + "📩 Vui lòng trả lời với số (1 hoặc 2).",
            invalidVideoChoice: "❌ Số video không hợp lệ, vui lòng trả lời 1, 2 hoặc 3.",
            downloadingAudio: "🌀🎵 Đang tải audio: %1 (chất lượng: 128kbps)...",
            downloadingVideo: "🌀📹 Đang tải video: %1 (chất lượng: 480p)...",
            tooLargeAudio: "⚠️ File audio quá lớn (>26MB), không thể tải.",
            tooLargeVideo: "⚠️ File video quá lớn (>83MB), không thể tải.",
            notFound: "❌ Không tìm thấy video/audio hoặc không thể tải.",
            error: "❌ Lỗi: %1",
            cacheInfo: "💾 Hệ thống bot hiện đang lưu trữ %1 video và %2 audio."
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID } = event;
        const input = args.join(" ").trim().toLowerCase();
        if (args.includes("-c") || args]0] === "cache") {
            const audioCount = fs.readdirSync(CACHE_AUDIO_DIR).filter(file => file.endsWith(".mp3")).length;
            const videoCount = fs.readdirSync(CACHE_VIDEO_DIR).filter(file => file.endsWith(".mp4")).length;
            return message.reply(getLang("cacheInfo", videoCount, audioCount));
        }
        if (args.includes("-s") || args[0] === "search") {
            const query = args.filter(a => !a.startsWith("-") && a !== "search").join(" ");
            if (!query) return message.reply(getLang("missingInput"));
            message.reply(getLang("searching", query));
            try {
                const search = await yts({ query, regionCode: "VN" });
                if (!search.videos.length) return message.reply(getLang("notFound"));
                const videos = search.videos.slice(0, 3);
                let msg = getLang("searchResults", query, videos.map((v, i) => `${i + 1}. ${v.title} - ${v.author.name}`).join("\n"));
                const attachments = [];
                for (const video of videos) {
                    const cacheKey = crypto.createHash("md5").update(video.url).digest("hex");
                    const thumbnailPath = await downloadThumbnail(video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`, cacheKey);
                    if (thumbnailPath) attachments.push(fs.createReadStream(thumbnailPath));
                }
                return message.reply({ body: msg, attachment: attachments }, (err, info) => {
                    if (err) return message.err(err);
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: "yt",
                        messageID: info.messageID,
                        videos,
                        author: event.senderID,
                        type: "selectVideo"
                    });
                });
            } catch (e) {
                console.error(`YT: Lỗi khi tìm kiếm ${query}:`, e);
                return message.reply(getLang("notFound"));
            }
        }
        if (args.includes("-l")) {
            const videoID = args[args.indexOf("-l") + 1];
            if (!videoID || !/^[A-Za-z0-9_-]{11}$/.test(videoID)) {
                return message.reply(getLang("missingInput"));
            }
            const url = `https://www.youtube.com/watch?v=${videoID}`;
            const cacheKey = crypto.createHash("md5").update(url).digest("hex");
            return message.reply(getLang("chooseType"), (err, info) => {
                if (err) return message.err(err);
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: "yt",
                    messageID: info.messageID,
                    videoID,
                    cacheKey,
                    author: event.senderID,
                    type: "download"
                });
            });
        }
        const type = args.includes("-v") ? "video" : args.includes("-a") ? "audio" : null;
        if (!type) return message.reply(getLang("invalidType"));
        const query = args.filter(a => !a.startsWith("-")).join(" ");
        if (!query) return message.reply(getLang("missingInput"));
        let url, title, thumbnail, cacheKey;
        if (ogmp3.isUrl(query)) {
            url = query;
            cacheKey = crypto.createHash("md5").update(url).digest("hex");
            const videoID = extractVideoID(url);
            if (!videoID) return message.reply(getLang("notFound"));
            try {
                const search = await yts({ videoId: videoID });
                title = search.title;
                thumbnail = search.thumbnail || `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`;
            } catch (e) {
                console.error(`YT: Lỗi khi lấy thông tin video ${videoID}:`, e);
                title = query;
                thumbnail = `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`;
            }
        } else {
            cacheKey = crypto.createHash("md5").update(query).digest("hex");
            message.reply(getLang("searching", query));
            try {
                const search = await yts({ query, regionCode: "VN" });
                if (!search.videos.length) return message.reply(getLang("notFound"));
                url = search.videos[0].url;
                title = search.videos[0].title;
                thumbnail = search.videos[0].thumbnail || `https://img.youtube.com/vi/${extractVideoID(url)}/hqdefault.jpg`;
            } catch (e) {
                console.error(`YT: Lỗi khi tìm kiếm ${query}:`, e);
                return message.reply(getLang("notFound"));
            }
        }
        const mediaDir = type === "audio" ? CACHE_AUDIO_DIR : CACHE_VIDEO_DIR;
        const filePath = path.join(mediaDir, `${cacheKey}.${type === "audio" ? "mp3" : "mp4"}`);
        if (cacheHistory[cacheKey] && fs.existsSync(filePath)) {
            const { title: cachedTitle, thumbnailPath } = cacheHistory[cacheKey];
            const attachments = fs.existsSync(thumbnailPath) ? [fs.createReadStream(thumbnailPath)] : [];
            await message.reply({
                body: `🎵 File "${cachedTitle}" đã có trong cache\n💫 Đang gửi ngay...\n⚜️ Ytdownload by Dương Api`,
                attachment: attachments
            });
            await sendMedia(api, threadID, messageID, filePath);
            return;
        }
        await downloadMedia(api, threadID, messageID, url, type, cacheKey, title, thumbnail, filePath, getLang);
    },
    onReply: async function ({ api, event, Reply, message, getLang }) {
        const { threadID, messageID, senderID } = event;
        const { author, type, videos, videoID, cacheKey, messageID: replyMessageID } = Reply;
        if (author !== senderID) return;

        if (type === "selectVideo") {
            const index = parseInt(event.body.trim()) - 1;
            if (isNaN(index) || index < 0 || index >= videos.length) {
                return message.reply(getLang("invalidVideoChoice"));
            }
            try {
                await api.unsendMessage(replyMessageID);
            } catch (e) {
                console.error(`YT: Lỗi khi xóa tin nhắn tìm kiếm ${replyMessageID}:`, e);
            }
            const video = videos[index];
            const views = formatViews(video.views);
            const shortUrl = `https://youtu.be/${video.videoId}`;
            const cacheKey = crypto.createHash("md5").update(video.url).digest("hex");
            const thumbnailPath = await downloadThumbnail(video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`, cacheKey);
            const attachments = thumbnailPath ? [fs.createReadStream(thumbnailPath)] : [];
            const msg = getLang("videoInfo", video.title, video.author.name, views, shortUrl);
            return message.reply({ body: msg, attachment: attachments }, (err, info) => {
                if (err) return message.err(err);
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: "yt",
                    messageID: info.messageID,
                    videoID: video.videoId,
                    cacheKey,
                    author: event.senderID,
                    type: "download"
                });
            });
        } else if (type === "download") {
            const choice = parseInt(event.body.trim());
            if (isNaN(choice) || choice < 1 || choice > 2) {
                return message.reply(getLang("invalidChoice"));
            }
            try {
                await api.unsendMessage(replyMessageID);
            } catch (e) {
                console.error(`YT: Lỗi khi xóa tin nhắn chọn loại ${replyMessageID}:`, e);
            }
            const type = choice === 1 ? "audio" : "video";
            const url = `https://www.youtube.com/watch?v=${videoID}`;
            const mediaDir = type === "audio" ? CACHE_AUDIO_DIR : CACHE_VIDEO_DIR;
            const filePath = path.join(mediaDir, `${cacheKey}.${type === "audio" ? "mp3" : "mp4"}`);
            let title, thumbnail;
            try {
                const search = await yts({ videoId: videoID });
                title = search.title;
                thumbnail = search.thumbnail || `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`;
            } catch (e) {
                console.error(`YT: Lỗi khi lấy thông tin video ${videoID}:`, e);
                title = url;
                thumbnail = `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`;
            }
            if (cacheHistory[cacheKey] && fs.existsSync(filePath)) {
                const { title: cachedTitle, thumbnailPath } = cacheHistory[cacheKey];
                const attachments = fs.existsSync(thumbnailPath) ? [fs.createReadStream(thumbnailPath)] : [];
                await message.reply({
                    body: `🎵 File "${cachedTitle}" đã có trong cache\n💫 Đang gửi ngay...\n⚜️ Ytdownload by Dương Api`,
                    attachment: attachments
                });
                await sendMedia(api, threadID, messageID, filePath);
                return;
            }
            await downloadMedia(api, threadID, messageID, url, type, cacheKey, title, thumbnail, filePath, getLang);
        }
    }
};
async function downloadMedia(api, threadID, messageID, url, type, cacheKey, title, thumbnail, filePath, getLang) {
    const limit = type === "audio" ? LimitAud : LimitVid;
    const quality = type === "audio" ? "128" : "480";
    const downloadingMsg = type === "audio" ? getLang("downloadingAudio", title || url) : getLang("downloadingVideo", title || url);
    const tooLargeMsg = type === "audio" ? getLang("tooLargeAudio") : getLang("tooLargeVideo");

    await api.sendMessage(downloadingMsg, threadID, null, messageID);

    try {
        const result = await ogmp3.download(url, quality, type);
        if (!result || !result.status || !result.result || !result.result.download) {
            throw new Error(result?.error || "Download failed");
        }
        const fileSize = await getFileSize(result.result.download);
        if (fileSize > limit) return api.sendMessage(tooLargeMsg, threadID, null, messageID);
        const response = await axios({
            url: result.result.download,
            method: "GET",
            responseType: "stream"
        });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            throw new Error("Downloaded file is invalid");
        }
        cacheHistory[cacheKey] = {
            link: url,
            query: title || url,
            filePath,
            thumbnailPath: await downloadThumbnail(thumbnail, cacheKey),
            type,
            title: result.result.title || title,
            timestamp: Date.now()
        };
        fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(cacheHistory, null, 2));
        await sendMedia(api, threadID, messageID, filePath);
    } catch (e) {
        console.error(`YT: Error downloading media:`, e);
        await api.sendMessage(getLang("error", e.message), threadID, null, messageID);
    }
}
async function downloadThumbnail(thumbnailUrl, cacheKey) {
    if (!thumbnailUrl) return null;
    const thumbnailPath = path.join(CACHE_THUMB_DIR, `${cacheKey}_thumb.jpg`);
    if (fs.existsSync(thumbnailPath)) return thumbnailPath;
    try {
        const response = await axios({
            url: thumbnailUrl,
            method: "GET",
            responseType: "stream"
        });
        const writer = fs.createWriteStream(thumbnailPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
        return thumbnailPath;
    } catch (e) {
        console.error(`YT: Lỗi khi tải thumbnail cho ${cacheKey}:`, e);
        return null;
    }
}
async function sendMedia(api, threadID, messageID, filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    try {
        const messageOptions = {
            body: "",
            attachment: fs.createReadStream(filePath)
        };
        await api.sendMessage(messageOptions, threadID, null, messageID);
    } catch (e) {
        console.error(`YT: Error sending media:`, e);
        throw e;
    }
}
async function getFileSize(url) {
    try {
        const response = await axios.head(url);
        return parseInt(response.headers["content-length"] || 0);
    } catch {
        return Infinity;
    }
}
function extractVideoID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
function formatViews(views) {
    if (views >= 1e6) return (views / 1e6).toFixed(1) + "M";
    if (views >= 1e3) return (views / 1e3).toFixed(1) + "K";
    return views.toString();
}
