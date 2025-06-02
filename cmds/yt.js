const axios = require("axios");
const yts = require("yt-search");
const fs =require("fs");
const path = require("path");
const crypto = require("crypto");
const { ogmp3 } = require("../lib/youtubedl.js");

const LIMIT_AUD = 26 * 1024 * 1024;
const LIMIT_VID = 83 * 1024 * 1024;

const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_AUDIO_DIR = path.join(CACHE_DIR, "audio");
const CACHE_VIDEO_DIR = path.join(CACHE_DIR, "video");
const CACHE_THUMB_DIR = path.join(CACHE_DIR, "thumbnails");

const HISTORY_FILE_PATH = path.join(__dirname, "ythistory.json");

[CACHE_DIR, CACHE_AUDIO_DIR, CACHE_VIDEO_DIR, CACHE_THUMB_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

let cacheHistory = {};
try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
        const fileContent = fs.readFileSync(HISTORY_FILE_PATH, "utf8");
        if (fileContent) {
            cacheHistory = JSON.parse(fileContent);
        } else {
            console.warn("YT: File lịch sử rỗng, khởi tạo mới nha.");
        }
    }
} catch (err) {
    console.error("YT: Ui, đọc file lịch sử bị lỗi xíu:", err);
}

module.exports = {
    config: {
        name: "yt",
        aliases: ["play"],
        version: "2.7", 
        author: "Dương Api (có tớ phụ một tay nữa đó 💖)",
        countDown: 10,
        role: 0,
        description: {
            vi: "🌟 Tải audio/video từ YouTube siêu nhanh, tìm kiếm video cực đỉnh hoặc xem thông tin chi tiết video lung linh!",
        },
        category: "media",
        guide: {
            vi:
                "🎮 **Bí kíp xài lệnh nè cậu ơi:**\n" +
                "🔹 `{pn} <tên bài hát/link YouTube> [-a|-v]` (Ví dụ: `{pn} See Tình -a` để tải nhạc 🎶)\n" +
                "🔹 `{pn} -l <ID video>` (Ví dụ: `{pn} -l uIO0_7eo`): Tải nhanh theo ID video đó nha! 💨\n" +
                "🔹 `{pn} -s <tên bài hát>` hoặc `search <tên bài hát>`: Tìm kiếm 3 video xịn nhất, trả lời số để xem chi tiết nha! 🧐\n" +
                "🔹 `{pn} cache`: Xem kho báu video/audio đã lưu nè! 💎\n" +
                "📌 **Ví dụ nè:** `{pn} -s Chạy ngay đi`",
        },
    },

    langs: {
        vi: {
            missingInput: "⚠️ Cậu ơi, cậu quên nhập từ khóa, link YouTube hoặc ID video rồi kìa! Nhập lại giúp tớ nha. 🤔",
            invalidType: "❌ Cậu chọn `-a` (nghe nhạc 🎵) hay `-v` (xem video 📹) đây ta? Nói cho tớ biết với!",
            chooseType:
                "🎛️ Cậu muốn tải gì nè:\n" +
                "1. 🎵 Audio (Nghe nhạc thui!)\n" +
                "2. 📹 Video (Xem cả hình luôn!)\n" +
                "📩 Trả lời tớ số 1 hoặc 2 nha cậu. 😉",
            invalidChoice: "❌ Úi, lựa chọn này hong có trong danh sách rùi! Cậu chọn 1 (audio) hoặc 2 (video) giúp tớ nha. 🙏",
            searching: "🔍 Tớ đang lùng sục khắp YouTube tìm '%1' cho cậu đây... Đợi tớ một xíu xiu nha! 💨",
            searchResults:
                "🔍 Tadaaa! Tớ tìm thấy mấy cái này cho '%1' nè:\n%2\n📩 Cậu thích cái nào thì trả lời tớ số (1-3) để xem chi tiết nha. 😊",
            videoInfo:
                "📹 **Thông tin video xinh xẻo đây nè:**\n" +
                "📌 Tên cúng cơm: %1\n" +
                "👤 Cha đẻ: %2\n" +
                "👀 Lượt xem khủng: %3\n" +
                "🔗 Link đây nè: %4\n\n" +
                "🎛️ Giờ cậu muốn tải cái gì từ video này nè:\n" +
                "1. 🎵 Chỉ lấy nhạc thui!\n" +
                "2. 📹 Lấy cả video luôn!\n" +
                "📩 Nhắn tớ số 1 hoặc 2 nha. 😘",
            invalidVideoChoice: "❌ Số này lạ quá à, cậu chọn 1, 2 hoặc 3 trong danh sách trên giúp tớ nghen. 🤗",
            downloadingAudio: "🌀🎵 Tớ đang kéo nhạc '%1' (chất lượng 128kbps) về cho cậu đây... Chờ tớ một tí tẹo nữa thôi! 🎧",
            downloadingVideo: "🌀📹 Tớ đang tải video '%1' (chất lượng 480p) siêu nét cho cậu nè... Ráng đợi nha! 🍿",
            tooLargeAudio: "⚠️ Ui, file nhạc này 'bé bự' quá (>26MB) nên tớ không tải nổi rồi cậu ơi. 🥺 Cậu thử bài khác nhỏ hơn xem sao!",
            tooLargeVideo: "⚠️ Huhu, file video này 'siêu to khổng lồ' (>83MB) nên tớ đành bó tay. 😭 Cậu tìm video khác gọn nhẹ hơn nha!",
            notFound: "❌ Hic, tớ tìm hoài mà không thấy video/audio nào hoặc không tải được cậu ơi. Cậu thử từ khóa khác xem sao. 😥",
            error: "❌ Oái! Có lỗi %1 rồi cậu ơi. Cậu thử lại sau nha, đừng buồn tớ. 😢",
            cacheInfo: "💾 Kho báu của bot đang cất giữ %1 video 🎞️ và %2 audio 🎶 đó cậu!",
        },
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID, senderID } = event;
        const inputArgs = args.join(" ").trim();

        if (args.includes("-c") || args[0]?.toLowerCase() === "cache") {
            try {
                const audioCount = fs
                    .readdirSync(CACHE_AUDIO_DIR)
                    .filter((file) => file.endsWith(".mp3")).length;
                const videoCount = fs
                    .readdirSync(CACHE_VIDEO_DIR)
                    .filter((file) => file.endsWith(".mp4")).length;
                return message.reply(getLang("cacheInfo", videoCount, audioCount));
            } catch (err) {
                console.error("YT: Lỗi khi xem kho báu cache:", err);
                return message.reply(getLang("error", "Tớ không xem được kho báu rồi cậu ơi. 😭"));
            }
        }

        if (args.includes("-s") || args[0]?.toLowerCase() === "search") {
            const query = args.filter((a) => !a.startsWith("-") && a.toLowerCase() !== "search").join(" ");
            if (!query) return message.reply(getLang("missingInput"));

            await message.reply(getLang("searching", query));
            try {
                const search = await yts({ query, hl: "vi", gl: "VN" });
                if (!search.videos.length) return message.reply(getLang("notFound"));

                const videos = search.videos.slice(0, 3);
                let msg = getLang(
                    "searchResults",
                    query,
                    videos.map((v, i) => `${i + 1}. ${v.title} (${v.duration.timestamp}) - ${v.author.name}`).join("\n")
                );

                const attachments = [];
                for (const video of videos) {
                    try {
                        const cacheKeyForThumb = crypto.createHash("md5").update(video.url).digest("hex");
                        const thumbnailUrl = video.thumbnail || (video.image ? video.image : `http://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`);
                        const thumbnailPath = await downloadThumbnail(thumbnailUrl, cacheKeyForThumb);
                        if (thumbnailPath) attachments.push(fs.createReadStream(thumbnailPath));
                    } catch (thumbErr) {
                        console.error("YT: Tải ảnh thumbnail bị lỗi xíu:", thumbErr);
                    }
                }

                return message.reply({ body: msg, attachment: attachments }, (err, info) => {
                    if (err) {
                        console.error("YT: Gửi kết quả tìm kiếm bị lỗi:", err);
                        return message.reply(msg).then(newInfo => {
                             global.GoatBot.onReply.set(newInfo.messageID, {
                                commandName: this.config.name,
                                messageID: newInfo.messageID,
                                videos,
                                author: senderID,
                                type: "selectVideo",
                            });
                        }).catch(e => message.reply(getLang("error", "Tớ không gửi được kết quả tìm kiếm rồi. 😥")));
                    }
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: this.config.name,
                        messageID: info.messageID,
                        videos,
                        author: senderID,
                        type: "selectVideo",
                    });
                });
            } catch (e) {
                console.error(`YT: Lỗi khi tìm kiếm '${query}':`, e);
                return message.reply(getLang("notFound"));
            }
        }
        
        let videoIDForDownload;

        if (args.includes("-l")) {
            videoIDForDownload = args[args.indexOf("-l") + 1];
            if (!videoIDForDownload || !/^[A-Za-z0-9_-]{11}$/.test(videoIDForDownload)) {
                return message.reply(getLang("missingInput") + " (ID video không hợp lệ cậu ơi! 😟)");
            }
        } else {
            const queryOrUrl = args.filter(a => !a.startsWith("-a") && !a.startsWith("-v")).join(" ");
            if (!queryOrUrl) return message.reply(getLang("missingInput"));

            if (ogmp3.isUrl(queryOrUrl)) {
                videoIDForDownload = extractVideoID(queryOrUrl);
                if (!videoIDForDownload) return message.reply(getLang("notFound") + " (Link này lạ quá, tớ không tìm thấy video ID. 🤔)");
            } else {
                await message.reply(getLang("searching", queryOrUrl));
                try {
                    const search = await yts({ query: queryOrUrl, hl: "vi", gl: "VN" });
                    if (!search.videos.length) return message.reply(getLang("notFound"));
                    videoIDForDownload = search.videos[0].videoId;
                } catch (e) {
                    console.error(`YT: Lỗi khi tìm video đầu tiên cho '${queryOrUrl}':`, e);
                    return message.reply(getLang("notFound"));
                }
            }
        }
        
        if (!videoIDForDownload) return message.reply(getLang("notFound") + " (Tớ không xác định được video để tải. 🥺)");

        const cacheKeyForDownload = crypto.createHash("md5").update(`https://www.youtube.com/watch?v=${videoIDForDownload}`).digest("hex");
        
        const typeFlag = args.includes("-v") ? "video" : args.includes("-a") ? "audio" : null;

        if (typeFlag) {
             let title, thumbnail;
             try {
                 const videoInfo = await yts({ videoId: videoIDForDownload });
                 title = videoInfo.title;
                 thumbnail = videoInfo.thumbnail || (videoInfo.image ? videoInfo.image : `http://i.ytimg.com/vi/${videoIDForDownload}/hqdefault.jpg`);
             } catch (e) {
                 console.error(`YT: Lỗi lấy thông tin video ${videoIDForDownload}:`, e);
                 title = `Video ID: ${videoIDForDownload}`;
                 thumbnail = `http://i.ytimg.com/vi/${videoIDForDownload}/hqdefault.jpg`;
             }
            const mediaDir = typeFlag === "audio" ? CACHE_AUDIO_DIR : CACHE_VIDEO_DIR;
            const filePath = path.join(mediaDir, `${cacheKeyForDownload}.${typeFlag === "audio" ? "mp3" : "mp4"}`);

            if (cacheHistory[cacheKeyForDownload] && cacheHistory[cacheKeyForDownload].type === typeFlag && fs.existsSync(filePath)) {
                const { title: cachedTitle, thumbnailPath: cachedThumbnailPath } = cacheHistory[cacheKeyForDownload];
                const attachments = fs.existsSync(cachedThumbnailPath) ? [fs.createReadStream(cachedThumbnailPath)] : [];
                await message.reply({
                    body: `🎵 File "${cachedTitle}" (${typeFlag}) đã có trong kho báu của tớ rồi!\n💫 Gửi cho cậu ngay đây...\n⚜️ Ytdownload by Dương Api (và tớ nữa! 😜)`,
                    attachment: attachments,
                });
                await sendMedia(api, threadID, messageID, filePath, getLang);
                return;
            }
            await downloadMedia(api, threadID, messageID, `https://www.youtube.com/watch?v=${videoIDForDownload}`, typeFlag, cacheKeyForDownload, title, thumbnail, filePath, getLang);

        } else {
            return message.reply(getLang("chooseType"), (err, info) => {
                if (err) {
                    console.error("YT: Lỗi khi hỏi chọn loại tải:", err);
                    return message.reply(getLang("error", "Tớ không hỏi được cậu muốn tải gì rồi. 😟"));
                }
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    messageID: info.messageID,
                    videoID: videoIDForDownload,
                    cacheKey: cacheKeyForDownload,
                    author: senderID,
                    type: "download",
                });
            });
        }
    },

    onReply: async function ({ api, event, Reply, message, getLang }) {
        const { threadID, messageID, senderID, body } = event;
        const {
            author,
            type: replyType,
            videos,
            videoID: originalVideoID,
            cacheKey: originalCacheKey,
            messageID: replyMessageID,
        } = Reply;

        if (author !== senderID) return;

        try {
            await api.unsendMessage(replyMessageID);
        } catch (e) {
            console.error(`YT: Lỗi khi xóa tin nhắn ${replyMessageID} (chắc bị xóa rồi á):`, e);
        }

        if (replyType === "selectVideo") {
            const index = parseInt(body.trim()) - 1;
            if (isNaN(index) || index < 0 || index >= videos.length) {
                return message.reply(getLang("invalidVideoChoice"));
            }
            const selectedVideo = videos[index];
            const views = formatViews(selectedVideo.views);
            const shortUrl = `https://youtu.be/${selectedVideo.videoId}`;
            const currentCacheKey = crypto.createHash("md5").update(selectedVideo.url).digest("hex");
            const thumbnailUrl = selectedVideo.thumbnail || (selectedVideo.image ? selectedVideo.image : `http://i.ytimg.com/vi/${selectedVideo.videoId}/hqdefault.jpg`);
            const thumbnailPath = await downloadThumbnail(thumbnailUrl, currentCacheKey);
            const attachments = thumbnailPath ? [fs.createReadStream(thumbnailPath)] : [];
            const msg = getLang("videoInfo", selectedVideo.title, selectedVideo.author.name, views, shortUrl);
            
            return message.reply({ body: msg, attachment: attachments }, (err, info) => {
                if (err) {
                    console.error("YT: Gửi thông tin video bị lỗi:", err);
                    return message.reply(msg).then(newInfo => {
                        global.GoatBot.onReply.set(newInfo.messageID, {
                            commandName: this.config.name,
                            messageID: newInfo.messageID,
                            videoID: selectedVideo.videoId,
                            cacheKey: currentCacheKey,
                            author: senderID,
                            type: "download",
                        });
                    }).catch(e => message.reply(getLang("error", "Tớ không gửi được thông tin video. 😥")));
                }
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    messageID: info.messageID,
                    videoID: selectedVideo.videoId,
                    cacheKey: currentCacheKey,
                    author: senderID,
                    type: "download",
                });
            });

        } else if (replyType === "download") {
            const choice = parseInt(body.trim());
            if (isNaN(choice) || choice < 1 || choice > 2) {
                return message.reply(getLang("invalidChoice"));
            }
            const downloadType = choice === 1 ? "audio" : "video";
            const urlToDownload = `https://www.youtube.com/watch?v=${originalVideoID}`;
            const mediaDir = downloadType === "audio" ? CACHE_AUDIO_DIR : CACHE_VIDEO_DIR;
            const filePath = path.join(mediaDir, `${originalCacheKey}.${downloadType === "audio" ? "mp3" : "mp4"}`);

            try {
                let title, thumbnail;
                try {
                    const videoInfo = await yts({ videoId: originalVideoID });
                    title = videoInfo.title;
                    thumbnail = videoInfo.thumbnail || (videoInfo.image ? videoInfo.image : `http://i.ytimg.com/vi/${originalVideoID}/hqdefault.jpg`);
                } catch (e) {
                    console.error(`YT: Lỗi khi lấy thông tin video ${originalVideoID} (trong onReply):`, e);
                    title = urlToDownload;
                    thumbnail = `http://i.ytimg.com/vi/${originalVideoID}/hqdefault.jpg`;
                }

                if (cacheHistory[originalCacheKey] && cacheHistory[originalCacheKey].type === downloadType && fs.existsSync(filePath)) {
                    const { title: cachedTitle, thumbnailPath: cachedThumbnailPath } = cacheHistory[originalCacheKey];
                    const attachments = fs.existsSync(cachedThumbnailPath) ? [fs.createReadStream(cachedThumbnailPath)] : [];
                    await message.reply({
                        body: `🎵 File "${cachedTitle}" (${downloadType}) đã nằm sẵn trong kho rồi nè!\n💫 Gửi cho cậu liền tay...\n⚜️ Ytdownload by Dương Api (và tớ nữa! 😜)`,
                        attachment: attachments,
                    });
                    await sendMedia(api, threadID, messageID, filePath, getLang);
                    return;
                }

                await downloadMedia(api, threadID, messageID, urlToDownload, downloadType, originalCacheKey, title, thumbnail, filePath, getLang);
            } catch (err) {
                console.error("YT: Lỗi khi tải ở onReply:", err);
                return message.reply(getLang("error", "Tớ không tải được rồi, huhu. 😭"));
            }
        }
    },
};

async function downloadMedia(api, threadID, messageID, url, type, cacheKey, title, thumbnail, filePath, getLang) {
    const limit = type === "audio" ? LIMIT_AUD : LIMIT_VID;
    const quality = type === "audio" ? "128" : "480";
    const downloadingMsg = type === "audio" ? getLang("downloadingAudio", title || url) : getLang("downloadingVideo", title || url);
    const tooLargeMsg = type === "audio" ? getLang("tooLargeAudio") : getLang("tooLargeVideo");
    let sentMessageInfo;

    try {
        const thumbnailPath = await downloadThumbnail(thumbnail, cacheKey + "_media");
        if (thumbnailPath) {
            try {
                sentMessageInfo = await api.sendMessage({
                    body: downloadingMsg,
                    attachment: fs.createReadStream(thumbnailPath),
                }, threadID, null, messageID);
            } catch (e) {
                console.error(`YT: Gửi ảnh thumbnail khi tải bị lỗi:`, e);
                sentMessageInfo = await api.sendMessage(downloadingMsg, threadID, null, messageID);
            }
        } else {
            sentMessageInfo = await api.sendMessage(downloadingMsg, threadID, null, messageID);
        }

        const result = await ogmp3.download(url, quality, type);
        if (!result || !result.status || !result.result || !result.result.download) {
            if (sentMessageInfo && sentMessageInfo.messageID) await api.unsendMessage(sentMessageInfo.messageID).catch(e => console.error("YT: Lỗi xóa tin nhắn báo tải (1):", e));
            throw new Error(result?.error || "Tải xuống thất bại, không có link tải về. 😟");
        }

        const fileSize = await getFileSize(result.result.download);
        if (fileSize > limit) {
            if (sentMessageInfo && sentMessageInfo.messageID) await api.unsendMessage(sentMessageInfo.messageID).catch(e => console.error("YT: Lỗi xóa tin nhắn báo tải (2):", e));
            return api.sendMessage(tooLargeMsg, threadID, null, messageID);
        }

        const response = await axios({ url: result.result.download, method: "GET", responseType: "stream" });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", (err) => {
                console.error("YT: Lỗi khi ghi file:", err);
                reject(new Error("Ghi file bị lỗi mất rồi cậu ơi. 💔"));
            });
            response.data.on("error", (err) => {
                console.error("YT: Lỗi stream dữ liệu:", err);
                reject(new Error("Stream dữ liệu bị lỗi giữa chừng. 😫"));
            });
        });

        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            if (sentMessageInfo && sentMessageInfo.messageID) await api.unsendMessage(sentMessageInfo.messageID).catch(e => console.error("YT: Lỗi xóa tin nhắn báo tải (3):", e));
            throw new Error("File tải về bị rỗng hoặc không tồn tại. Kỳ lạ ghê! 🧐");
        }

        cacheHistory[cacheKey] = {
            link: url,
            query: title || url,
            filePath,
            thumbnailPath: thumbnailPath,
            type,
            title: result.result.title || title,
            timestamp: Date.now(),
        };
        try {
            fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(cacheHistory, null, 2));
        } catch (writeErr) {
            console.error("YT: Lỗi khi ghi file lịch sử:", writeErr);
        }
        if (sentMessageInfo && sentMessageInfo.messageID) await api.unsendMessage(sentMessageInfo.messageID).catch(e => console.error("YT: Lỗi xóa tin nhắn báo tải (4):", e));
        await sendMedia(api, threadID, messageID, filePath, getLang);
    } catch (e) {
        console.error(`YT: Lỗi to đùng khi tải media:`, e);
        if (sentMessageInfo && sentMessageInfo.messageID) await api.unsendMessage(sentMessageInfo.messageID).catch(err => console.error("YT: Lỗi xóa tin nhắn báo tải (5):", err));
        if (fs.existsSync(filePath) && (!fs.statSync(filePath) || fs.statSync(filePath).size === 0)) {
            try {
                fs.unlinkSync(filePath);
                console.log("YT: Đã dọn dẹp file lỗi:", filePath);
            } catch (delErr) {
                console.error("YT: Lỗi khi dọn dẹp file lỗi:", delErr);
            }
        }
        await api.sendMessage(getLang("error", e.message || "Tớ chịu thua, không tải được rồi. 😥"), threadID, null, messageID);
    }
}

async function downloadThumbnail(thumbnailUrl, cacheKey) {
    if (!thumbnailUrl) return null;
    const thumbnailPath = path.join(CACHE_THUMB_DIR, `${cacheKey}_thumb.jpg`);
    if (fs.existsSync(thumbnailPath)) return thumbnailPath;

    try {
        const response = await axios({ url: thumbnailUrl, method: "GET", responseType: "stream", timeout: 5000 });
        const writer = fs.createWriteStream(thumbnailPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve(thumbnailPath));
            writer.on("error", (err) => {
                console.error(`YT: Lỗi ghi file thumbnail cho ${cacheKey}:`, err);
                if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath).catch(e => {});
                reject(null);
            });
            response.data.on("error", (err) => {
                 console.error(`YT: Lỗi stream thumbnail cho ${cacheKey}:`, err);
                 if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath).catch(e => {});
                 reject(null);
            });
        });
    } catch (e) {
        console.error(`YT: Lỗi khi tải thumbnail cho ${cacheKey} từ ${thumbnailUrl}:`, e.message);
        return null;
    }
}

async function sendMedia(api, threadID, messageID, filePath, getLang) {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
        console.error("YT: File để gửi không tồn tại hoặc rỗng:", filePath);
        throw new Error(getLang("notFound", "File để gửi biến mất rồi cậu ơi. 🧙‍♂️"));
    }
    try {
        await api.sendMessage({
            body: "Của cậu đây! 🎁",
            attachment: fs.createReadStream(filePath),
        }, threadID, null, messageID);
    } catch (e) {
        console.error(`YT: Lỗi khi gửi media từ ${filePath}:`, e);
        if (e.message && e.message.includes("bytes")) {
             throw new Error(getLang("error", "File này 'to con' quá, tớ không gửi qua chat được rồi. Cậu thử cách khác nha! 🐘"));
        }
        throw e;
    }
}

async function getFileSize(url) {
    try {
        const response = await axios.head(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        return parseInt(response.headers["content-length"] || 0);
    } catch (e) {
        console.warn(`YT: Không lấy được content-length của ${url}:`, e.message);
        return 0;
    }
}

function extractVideoID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|yt\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function formatViews(views) {
    if (!views || isNaN(views)) return "N/A";
    if (views >= 1e9) return (views / 1e9).toFixed(1).replace(/\.0$/, '') + " tỷ";
    if (views >= 1e6) return (views / 1e6).toFixed(1).replace(/\.0$/, '') + " triệu";
    if (views >= 1e3) return (views / 1e3).toFixed(1).replace(/\.0$/, '') + "K";
    return views.toString();
}

