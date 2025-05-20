const axios = require("axios");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const { ogmp3 } = require("../lib/youtubedl.js");
const LimitAud = 26 * 1024 * 1024; // 26MB for audio
const LimitVid = 83 * 1024 * 1024; // 83MB for video

module.exports = {
	config: {
		name: "yt",
		aliases: ["playaudio", "playvideo"],
		version: "1.9",
		author: "Dương Api",
		countDown: 5,
		role: 0,
		description: {
			vi: "Tải audio (128kbps) hoặc video (480p) từ YouTube (-a hoặc -v), đề xuất tại Việt Nam",
			en: "Download audio (128kbps) or video (480p) from YouTube (-a or -v), suggestions for Vietnam"
		},
		category: "media",
		guide: {
			vi: "{pn} <từ khóa hoặc link YouTube> [-a|-v]\nVí dụ:\n- {pn} Sơn Tùng M-TP -a\n- {pn} https://youtu.be/gBRi6aZJJN4 -v",
			en: "{pn} <keyword or YouTube link> [-a|-v]\nExamples:\n- {pn} Sơn Tùng M-TP -a\n- {pn} https://youtu.be/gBRi6aZJJN4 -v"
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
			ytdlError: "Lỗi YouTube: Không thể tải media, thử lại sau.",
			error: "Lỗi: %1"
		},
		en: {
			missingInput: "Please enter a keyword or YouTube link.",
			invalidType: "Please specify -a (audio) or -v (video).",
			searching: "🔍 Searching: %1...",
			downloadingAudio: "🌀🎵 Downloading audio: %1 (quality: 128kbps)...",
			downloadingVideo: "🌀🎥 Downloading video: %1 (quality: 480p)...",
			tooLargeAudio: "Audio too large (>26MB), cannot download.",
			tooLargeVideo: "Video too large (>83MB), cannot download.",
			notFound: "Video/audio not found or cannot be downloaded.",
			ytdlError: "YouTube error: Cannot download media, try again later.",
			error: "Error: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const { threadID, messageID } = event;
		const input = args.join(" ");
		if (!input) return message.reply(getLang("missingInput"));

		// Xác định loại tải (audio hoặc video)
		const type = args.includes("-v") ? "video" : args.includes("-a") ? "audio" : null;
		if (!type) return message.reply(getLang("invalidType"));
		const query = args.filter(a => !a.startsWith("-")).join(" ");

		let url, title, thumbnail, videoId;
		if (ogmp3.isUrl(query)) {
			url = query;
			videoId = ogmp3.youtube(query);
			try {
				const info = await yts({ videoId });
				if (!info) throw new Error("Video not found");
				title = info.title;
				thumbnail = info.thumbnail;
			} catch (e) {
				console.error(`Play: Error fetching video info for ${query}:`, e);
				return message.reply(getLang("notFound"));
			}
		} else {
			message.reply(getLang("searching", query));
			try {
				const search = await yts({ query, regionCode: "VN" });
				if (!search.videos.length) return message.reply(getLang("notFound"));
				url = search.videos[0].url;
				videoId = search.videos[0].videoId;
				title = search.videos[0].title;
				thumbnail = search.videos[0].thumbnail;
			} catch (e) {
				console.error(`Play: Error searching ${query}:`, e);
				return message.reply(getLang("notFound"));
			}
		}

		// Xác định chất lượng và giới hạn
		const quality = type === "audio" ? "128" : "480";
		const limit = type === "audio" ? LimitAud : LimitVid;
		const downloadingMsg = type === "audio" ? getLang("downloadingAudio", title) : getLang("downloadingVideo", title);
		const tooLargeMsg = type === "audio" ? getLang("tooLargeAudio") : getLang("tooLargeVideo");

		// Gửi thông báo tải kèm thumbnail
		try {
			await message.reply({
				body: downloadingMsg,
				attachment: (await axios({ url: thumbnail, responseType: "stream" })).data
			});
		} catch (e) {
			console.error(`Play: Error sending thumbnail for ${url}:`, e);
			await message.reply(downloadingMsg);
		}

		// Tải media
		let result;
		try {
			// Tăng số lần thử cho ogmp3
			for (let i = 0; i < 5; i++) {
				result = await ogmp3.download(url, quality, type);
				if (result.status) break;
				console.warn(`Play: ogmp3 attempt ${i + 1} failed for ${url} (videoId: ${videoId}):`, result.error);
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
			if (!result.status) throw new Error(result.error || "ogmp3 failed after 5 attempts");
			result = result.result;

			// Kiểm tra kích thước trước khi tải
			const fileSize = await getFileSize(result.download);
			if (fileSize > limit) {
				return message.reply(tooLargeMsg);
			}
		} catch (e) {
			console.error(`Play: ogmp3 failed for ${url} (videoId: ${videoId}, type: ${type}, quality: ${quality}):`, e);
			try {
				for (let i = 0; i < 2; i++) {
					const ytdlResult = await (type === "audio" ? ytMp3 : ytMp4)(url);
					result = { download: ytdlResult.result, title: ytdlResult.title, thumbnail };
					const fileSize = await getFileSize(result.download);
					if (fileSize <= limit) break;
					if (i === 1) return message.reply(tooLargeMsg);
					console.warn(`Play: ytdl-core attempt ${i + 1} failed for ${url} (videoId: ${videoId}): size too large`);
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} catch (err) {
				console.error(`Play: ytdl-core failed for ${url} (videoId: ${videoId}, type: ${type}):`, err);
				if (err.message.includes("Could not extract functions")) {
					return message.reply(getLang("ytdlError"));
				}
				return message.reply(getLang("notFound"));
			}
		}

		// Tải file về buffer
		let filePath;
		try {
			const response = await axios({
				url: result.download,
				method: "GET",
				responseType: "stream"
			});
			filePath = path.join(__dirname, `cache/${result.title.replace(/[^a-zA-Z0-9]/g, "_")}.${type === "audio" ? "mp3" : "mp4"}`);
			const writer = fs.createWriteStream(filePath);
			response.data.pipe(writer);

			await new Promise((resolve, reject) => {
				writer.on("finish", resolve);
				writer.on("error", reject);
			});

			// Kiểm tra file hợp lệ
			const stats = fs.statSync(filePath);
			if (stats.size === 0) throw new Error("File is empty");
		} catch (e) {
			console.error(`Play: Error downloading file from ${result.download} (videoId: ${videoId}):`, e);
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
			return message.reply(getLang("error", `Không tải được ${type === "audio" ? "audio" : "video"}.`));
		}

		// Gửi media (thử gửi video, fallback document nếu thất bại)
		try {
			for (let i = 0; i < 2; i++) {
				try {
					const messageObj = {
						body: "",
						attachment: fs.createReadStream(filePath)
					};
					await api.sendMessage(messageObj, threadID, () => {
						fs.unlinkSync(filePath);
					}, messageID);
					return;
				} catch (e) {
					if (i === 1 || type === "audio") throw e;
					console.warn(`Play: Retry sending ${type} as document for ${url} (videoId: ${videoId}):`, e);
					// Thử gửi video dưới dạng document
					const messageObj = {
						body: "",
						attachment: {
							type: "file",
							payload: {
								url: filePath,
								is_reusable: true
							},
							filename: `${result.title}.mp4`,
							mimeType: "video/mp4"
						}
					};
					await api.sendMessage(messageObj, threadID, () => {
						fs.unlinkSync(filePath);
					}, messageID);
					return;
				}
			}
		} catch (e) {
			console.error(`Play: Error sending ${type} for ${url} (videoId: ${videoId}, size: ${fs.statSync(filePath).size} bytes):`, e);
			fs.unlinkSync(filePath);
			return message.reply(getLang("error", `Không gửi được ${type === "audio" ? "audio" : "video"}: ${e.message}`));
		}
	}
};

// Hàm ytMp3
async function ytMp3(url) {
	return new Promise((resolve, reject) => {
		const userAgents = [
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
		];
		const options = {
			requestOptions: {
				headers: {
					"User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
				}
			}
		};
		ytdl.getInfo(url, options).then(async (info) => {
			const formats = info.formats.filter(f => f.mimeType.includes("audio"));
			if (!formats.length) return reject(new Error("No audio format found."));
			const audio = formats[0].url;
			const tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${audio}`);
			resolve({ result: tiny.data, title: info.videoDetails.title });
		}).catch(reject);
	});
}

// Hàm ytMp4
async function ytMp4(url) {
	return new Promise((resolve, reject) => {
		const userAgents = [
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
		];
		const options = {
			requestOptions: {
				headers: {
					"User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
				}
			}
		};
		ytdl.getInfo(url, options).then(async (info) => {
			const formats = info.formats.filter(f => f.container === "mp4" && f.hasVideo && f.hasAudio && f.qualityLabel === "480p");
			if (!formats.length) return reject(new Error("No 480p video format found."));
			const video = formats[0].url;
			const tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${video}`);
			resolve({ result: tiny.data, title: info.videoDetails.title });
		}).catch(reject);
	});
}

// Hàm getFileSize
async function getFileSize(url) {
	try {
		const response = await axios.head(url);
		return parseInt(response.headers["content-length"] || 0);
	} catch {
		return Infinity;
	}
}
