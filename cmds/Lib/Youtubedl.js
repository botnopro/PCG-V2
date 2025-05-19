const axios = require("axios");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const { ogmp3 } = require("../lib/youtubedl.js");
const LimitAud = 725 * 1024 * 1024; // 725MB

module.exports = {
	config: {
		name: "play",
		version: "1.0",
		author: "Grok",
		countDown: 5,
		role: 0,
		description: {
			vi: "Tải audio từ YouTube (hỗ trợ tìm kiếm hoặc link)",
			en: "Download audio from YouTube (supports search or link)"
		},
		category: "media",
		guide: {
			vi: "{pn} <từ khóa hoặc link YouTube>",
			en: "{pn} <keyword or YouTube link>"
		}
	},

	langs: {
		vi: {
			missingInput: "Vui lòng nhập từ khóa hoặc link YouTube.",
			searching: "Đang tìm kiếm: %1...",
			noResult: "Không tìm thấy video phù hợp cho: %1.",
			downloading: "Đang tải audio: %1...",
			tooLarge: "File quá lớn (>725MB), gửi dưới dạng document.",
			error: "Lỗi khi tải audio: %1"
		},
		en: {
			missingInput: "Please enter a keyword or YouTube link.",
			searching: "Searching: %1...",
			noResult: "No video found for: %1.",
			downloading: "Downloading audio: %1...",
			tooLarge: "File too large (>725MB), sending as document.",
			error: "Error downloading audio: %1"
		}
	},

	onStart: async function ({ api, event, args, message, getLang }) {
		const { threadID, messageID } = event;
		const input = args.join(" ");
		if (!input) return message.reply(getLang("missingInput"));

		let url, title;
		if (ogmp3.isUrl(input)) {
			url = input;
			try {
				const info = await yts({ videoId: ogmp3.youtube(input) });
				title = info.title;
			} catch (e) {
				console.error(`Play: Error fetching video info for ${input}:`, e);
				return message.reply(getLang("error", "Không lấy được thông tin video."));
			}
		} else {
			message.reply(getLang("searching", input));
			try {
				const search = await yts(input);
				if (!search.videos.length) return message.reply(getLang("noResult", input));
				url = search.videos[0].url;
				title = search.videos[0].title;
			} catch (e) {
				console.error(`Play: Error searching ${input}:`, e);
				return message.reply(getLang("error", "Lỗi khi tìm kiếm."));
			}
		}

		message.reply(getLang("downloading", title));
		let result;
		try {
			result = await ogmp3.download(url, "320", "audio");
			if (!result.status) throw new Error(result.error);
			result = result.result;
		} catch (e) {
			console.error(`Play: ogmp3 failed for ${url}:`, e);
			try {
				const ytdlResult = await ytMp3(url);
				result = { download: ytdlResult.result, title: ytdlResult.title };
			} catch (err) {
				console.error(`Play: ytdl-core failed for ${url}:`, err);
				return message.reply(getLang("error", err.message));
			}
		}

		const fileSize = await getFileSize(result.download);
		const isLarge = fileSize > LimitAud;
		const msgOptions = {
			body: isLarge ? getLang("tooLarge") : `🎵 ${result.title}`
		};

		try {
			if (isLarge) {
				await api.sendMessage({
					body: msgOptions.body,
					attachment: { url: result.download },
					mimeType: "audio/mpeg",
					fileName: `${result.title}.mp3`
				}, threadID, null, messageID);
			} else {
				await api.sendMessage({
					body: msgOptions.body,
					attachment: { url: result.download }
				}, threadID, null, messageID);
			}
		} catch (e) {
			console.error(`Play: Error sending audio for ${url}:`, e);
			return message.reply(getLang("error", "Không gửi được audio."));
		}
	}
};

// Hàm ytMp3
async function ytMp3(url) {
	return new Promise((resolve, reject) => {
		ytdl.getInfo(url).then(async (info) => {
			const formats = info.formats.filter(f => f.mimeType === 'audio/webm; codecs="opus"');
			if (!formats.length) return reject(new Error("No audio format found."));
			const audio = formats[0].url;
			const tiny = await axios.get(`https://tinyurl.com/api-create.php?url=${audio}`);
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
		return 0;
	}
}
