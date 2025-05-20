const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ogmp3 } = require("../lib/youtubedl.js");

const LimitAud = 26 * 1024 * 1024; // 26MB cho audio
const LimitVid = 83 * 1024 * 1024; // 83MB cho video
const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_AUDIO_DIR = path.join(CACHE_DIR, "audio");
const CACHE_VIDEO_DIR = path.join(CACHE_DIR, "video");
const CACHE_THUMB_DIR = path.join(CACHE_DIR, "thumbnails");
const HISTORY_FILE = path.join(__dirname, "ythistory.json");

// Đảm bảo các thư mục cache tồn tại
[CACHE_AUDIO_DIR, CACHE_VIDEO_DIR, CACHE_THUMB_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Tải lịch sử cache từ file ythistory.json
let cacheHistory = {};
if (fs.existsSync(HISTORY_FILE)) {
    cacheHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

module.exports = {
    config: {
        name: "yt",
        aliases: ["playaudio", "playvideo"],
        version: "2.2",
        author: "Dương Api",
        countDown: 5,
        role: 0,
        description: {
            vi: "Tải audio (128kbps) hoặc video (480p) từ YouTube (-a hoặc -v), có lưu cache"
        },
        category: "media",
        guide: {
            vi: "{pn} <từ khóa hoặc link YouTube> [-a|-v]\nVí dụ:\n- {pn} Sơn Tùng M-TP -a\n- {pn} https://youtu.be/gBRi6aZJJN4 -v\n- {pn} cache: Hiển thị số lượng video và audio trong cache"
        }
    },

    langs: {
        vi: {
            missingInput: "Vui lòng nhập từ khóa hoặc link YouTube.",
            invalidType: "Vui lòng chọn -a (audio) hoặc -v (video).",
            searching: "🔍 Đang tìm kiếm: %1...",
            downloadingAudio: "🌀🎵 Đang tải audio: %1 (chất lượng: 128kbps)...",
            downloadingVideo: "🌀🎥 Đang tải video: %1 (chất lượng: 480p)...",
            tooLargeAudio: "Âm thanh nặng quá (>26MB), không thể tải.",
            tooLargeVideo: "Video nặng quá (>83MB), không thể tải.",
            notFound: "Không tìm thấy hoặc không tải được video/audio này.",
            error: "Lỗi: %1",
            cacheInfo: "Hệ thống bot hiện đang lưu trữ %1 video và %2 âm thanh."
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID } = event;
        const input = args.join(" ").trim().toLowerCase();

        // Kiểm tra lệnh .play cache
        if (input === ".play cache") {
            const audioCount = fs.readdirSync(CACHE_AUDIO_DIR).filter(file => file.endsWith(".mp3")).length;
            const videoCount = fs.readdirSync(CACHE_VIDEO_DIR).filter(file => file.endsWith(".mp4")).length;
            return message.reply(getLang("cacheInfo", videoCount, audioCount));
        }

        // Xử lý tải media
        const type = args.includes("-v") ? "video" : args.includes("-a") ? "audio" : null;
        if (!type) return message.reply(getLang("invalidType"));
        const query = args.filter(a => !a.startsWith("-")).join(" ");

        let url, title, thumbnail, cacheKey;
        if (ogmp3.isUrl(query)) {
            url = query;
            cacheKey = crypto.createHash("md5").update(url).digest("hex");
        } else {
            cacheKey = crypto.createHash("md5").update(query).digest("hex");
            message.reply(getLang("searching", query));
            try {
                const search = await yts({ query, regionCode: "VN" });
                if (!search.videos.length) return message.reply(getLang("notFound"));
                url = search.videos[0].url;
                title = search.videos[0].title;
                thumbnail = search.videos[0].thumbnail;
            } catch (e) {
                console.error(`Play: Error searching ${query}:`, e);
                return message.reply(getLang("notFound"));
            }
        }

        // Kiểm tra cache
        const mediaDir = type === "audio" ? CACHE_AUDIO_DIR : CACHE_VIDEO_DIR;
        const filePath = path.join(mediaDir, `${cacheKey}.${type === "audio" ? "mp3" : "mp4"}`);
        if (cacheHistory[cacheKey] && fs.existsSync(filePath)) {
            await message.reply(`🎵 Tệp của bạn yêu cầu có trong bộ nhớ tạm của bo\n💫Đang bắt đầu gửi ngay bây giờ.. \n⚜️Ytdownload by Dương Api`);
            await sendMedia(api, threadID, messageID, filePath);
            return;
        }

        // Tải mới nếu không có trong cache
        const limit = type === "audio" ? LimitAud : LimitVid;
        const quality = type === "audio" ? "128" : "480";
        const downloadingMsg = type === "audio" ? getLang("downloadingAudio", title || query) : getLang("downloadingVideo", title || query);
        const tooLargeMsg = type === "audio" ? getLang("tooLargeAudio") : getLang("tooLargeVideo");

        // Tải thumbnail và gửi thông báo tải
        const thumbnailPath = await downloadThumbnail(thumbnail, cacheKey);
        if (thumbnailPath) {
            try {
                await message.reply({
                    body: downloadingMsg,
                    attachment: fs.createReadStream(thumbnailPath)
                });
            } catch (e) {
                console.error(`Play: Error sending downloading message:`, e);
                await message.reply(downloadingMsg);
            }
        } else {
            await message.reply(downloadingMsg);
        }

        // Tải media
        try {
            const result = await ogmp3.download(url, quality, type);
            // Kiểm tra xem result có tồn tại không
            if (!result) {
                throw new Error("Download failed: result is undefined");
            }
            // Kiểm tra trạng thái tải
            if (!result.status) {
                throw new Error(result.error || "Download failed");
            }
            // Kiểm tra result.result và result.result.download
            if (!result.result || !result.result.download) {
                throw new Error("Download failed: missing result.download");
            }

            const fileSize = await getFileSize(result.result.download);
            if (fileSize > limit) return message.reply(tooLargeMsg);

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

            // Kiểm tra file có tồn tại và không rỗng không
            if (!fs.existsSync(filePath)) {
                throw new Error("File not found after download");
            }
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                throw new Error("Downloaded file is empty");
            }

            // Cập nhật ythistory.json
            cacheHistory[cacheKey] = {
                link: url,
                query: query,
                filePath: filePath,
                thumbnailPath: thumbnailPath,
                type: type,
                title: result.result.title || title,
                timestamp: Date.now()
            };
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(cacheHistory, null, 2));

            // Gửi media
            await sendMedia(api, threadID, messageID, filePath);
        } catch (e) {
            console.error(`Play: Error downloading media:`, e);
            await message.reply(getLang("error", e.message));
        }
    }
};

// Hàm tải thumbnail
async function downloadThumbnail(thumbnailUrl, cacheKey) {
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
        console.error(`Play: Error downloading thumbnail for ${cacheKey}:`, e);
        return null;
    }
}

// Hàm gửi media
async function sendMedia(api, threadID, messageID, filePath) {
    // Kiểm tra filePath trước khi gửi
    if (!fs.existsSync(filePath)) {
        throw new Error("File not found: " + filePath);
    }
    try {
        await api.sendMessage({
            body: "",
            attachment: fs.createReadStream(filePath)
        }, threadID, null, messageID);
    } catch (e) {
        console.error(`Play: Error sending media:`, e);
        throw e;
    }
}

// Hàm lấy kích thước tệp
async function getFileSize(url) {
    try {
        const response = await axios.head(url);
        return parseInt(response.headers["content-length"] || 0);
    } catch {
        return Infinity;
    }
}
