const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    config: {
        name: "fb",
        aliases: ["facebook", "fb", "facebookdl", "fbdl"],
        version: "1.3",
        author: "Dương Sú",
        countDown: 60, 
        role: 0,
        description: {
            vi: "Tải video từ Facebook hoặc Instagram"
        },
        category: "media",
        guide: {
            vi: "{pn} <URL>\nVí dụ:\n- {pn} https://www.facebook.com/watch?v=636541475139\n- {pn} https://fb.watch/dcXq_0CaHi/\n- {pn} https://www.instagram.com/p/abc123/"
        }
    },

    langs: {
        vi: {
            missingUrl: "🚫 Vui lòng nhập URL của video từ Facebook hoặc Instagram.",
            invalidUrl: "⚠️ URL không hợp lệ. Vui lòng nhập URL từ Facebook hoặc Instagram.",
            downloading: "⏱️ Đang tải video từ %1...",
            success: "✅ Tải video thành công!",
            error: "❌ Lỗi khi tải video: %1",
            apiError: "⚠️ Lỗi API (%1): %2",
            fileError: "⚠️ Lỗi khi lưu hoặc gửi file: %1"
        }
    },

    onStart: async function ({ api, event, args, message, getLang }) {
        const { threadID, messageID } = event;
        const url = args[0];

        // Cấu hình API nhúng trực tiếp
        const API_CONFIG = {
            neoxr: {
                url: "https://api.neoxr.eu/api",
                key: "GataDios"
            },
            dorratz: {
                url: "https://api.dorratz.com",
                key: null
            },
            siputzx: {
                url: "https://api.siputzx.my.id/api",
                key: null
            },
            lolhuman: {
                url: "https://api.lolhuman.xyz/api",
                key: "GataDios"
            }
        };

        // Kiểm tra URL
        if (!url) {
            return message.reply(getLang("missingUrl"));
        }
        const isFacebook = url.match(/facebook\.com|fb\.watch/);
        const isInstagram = url.match(/instagram\.com/);
        if (!isFacebook && !isInstagram) {
            return message.reply(getLang("invalidUrl"));
        }

        // Gửi thông báo đang tải
        const platform = isFacebook ? "Facebook" : "Instagram";
        await message.reply(getLang("downloading", platform));

        // Đường dẫn lưu file tạm thời
        const fileExtension = isInstagram ? "jpg" : "mp4"; // Instagram có thể trả về ảnh
        const fileName = `download_${Date.now()}.${fileExtension}`;
        const filePath = path.join(__dirname, "cache", fileName);

        try {
            let videoUrl;

            // Xử lý Facebook
            if (isFacebook) {
                // Thử API Neoxr
                try {
                    const api = await axios.get(`${API_CONFIG.neoxr.url}/fb?url=${url}&apikey=${API_CONFIG.neoxr.key}`);
                    const response = api.data;
                    if (response.status && Array.isArray(response.data)) {
                        const videoHD = response.data.find(video => video.quality === "HD")?.url;
                        const videoSD = response.data.find(video => video.quality === "SD")?.url;
                        videoUrl = videoHD || videoSD;
                    } else {
                        throw new Error("Không tìm thấy video từ Neoxr API.");
                    }
                } catch (e) {
                    console.error(`FBDL: Neoxr API Error:`, e);
                    await message.reply(getLang("apiError", "Neoxr", e.message));
                    // Thử API Dorratz
                    try {
                        const response = await axios.get(`${API_CONFIG.dorratz.url}/fbvideo?url=${url}`);
                        const data = response.data;
                        if (data.result) {
                            videoUrl = data.result.hd || data.result.sd;
                        } else {
                            throw new Error("Không tìm thấy video từ Dorratz API.");
                        }
                    } catch (e) {
                        console.error(`FBDL: Dorratz API Error:`, e);
                        await message.reply(getLang("apiError", "Dorratz", e.message));
                        // Thử API Siputzx
                        try {
                            const response = await axios.get(`${API_CONFIG.siputzx.url}/facebook?url=${url}`);
                            const data = response.data;
                            if (data.status && data.data) {
                                videoUrl = data.data.hd || data.data.sd;
                            } else {
                                throw new Error("Không tìm thấy video từ Siputzx API.");
                            }
                        } catch (e) {
                            console.error(`FBDL: Siputzx API Error:`, e);
                            await message.reply(getLang("apiError", "Siputzx", e.message));
                            // Thử API Lolhuman
                            try {
                                const response = await axios.get(`${API_CONFIG.lolhuman.url}/facebook?url=${url}&apikey=${API_CONFIG.lolhuman.key}`);
                                const data = response.data;
                                if (data.result) {
                                    videoUrl = data.result.hd || data.result.sd;
                                } else {
                                    throw new Error("Không tìm thấy video từ Lolhuman API.");
                                }
                            } catch (e) {
                                console.error(`FBDL: Lolhuman API Error:`, e);
                                await message.reply(getLang("apiError", "Lolhuman", e.message));
                                throw new Error("Không thể tải video từ Facebook qua tất cả API.");
                            }
                        }
                    }
                }
            }
            // Xử lý Instagram
            else if (isInstagram) {
                videoUrl = await downloadInstagram(url);
                if (!videoUrl) {
                    throw new Error("Không thể tải video từ Instagram.");
                }
            }

            if (!videoUrl) {
                throw new Error("Không tìm thấy link tải video.");
            }

            // Tải file
            const response = await axios({
                url: videoUrl,
                method: "GET",
                responseType: "stream"
            });

            // Đảm bảo thư mục cache tồn tại
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", () => reject(new Error("Lỗi khi lưu file.")));
            });

            // Kiểm tra file có tồn tại và không rỗng
            if (!fs.existsSync(filePath)) {
                throw new Error("File không được lưu thành công.");
            }
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                throw new Error("File tải về rỗng.");
            }

            // Gửi file
            await api.sendMessage({
                body: getLang("success"),
                attachment: fs.createReadStream(filePath)
            }, threadID, (err) => {
                fs.unlinkSync(filePath); // Xóa file sau khi gửi
                if (err) {
                    console.error(`FBDL: Error sending file:`, err);
                    api.sendMessage(getLang("fileError", err.message), threadID, null, messageID);
                }
            }, messageID);

        } catch (e) {
            console.error(`FBDL: Error:`, e);
            await message.reply(getLang("error", e.message));
        }
    }
};

// Hàm tải video Instagram
async function downloadInstagram(url_media) {
    const BASE_URL = "https://instasupersave.com/";
    try {
        const resp = await axios(BASE_URL);
        const cookie = resp.headers["set-cookie"];
        if (!cookie) throw new Error("Không lấy được cookie từ instasupersave.com");

        const session = cookie[0].split(";")[0].replace("XSRF-TOKEN=", "").replace("%3D", "");
        const config = {
            method: "post",
            url: `${BASE_URL}api/convert`,
            headers: {
                "origin": "https://instasupersave.com",
                "referer": "https://instasupersave.com/pt/",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52",
                "x-xsrf-token": session,
                "Content-Type": "application/json",
                "Cookie": `XSRF-TOKEN=${session}; instasupersave_session=${session}`
            },
            data: { url: url_media }
        };

        const response = await axios(config);
        const ig = [];
        if (Array.isArray(response.data)) {
            response.data.forEach(post => {
                ig.push(post.sd === undefined ? post.thumb : post.sd.url);
            });
        } else if (response.data.url && response.data.url.length > 0) {
            ig.push(response.data.url[0].url);
        } else {
            throw new Error("Không tìm thấy link video từ Instagram.");
        }
        return ig[0];
    } catch (e) {
        console.error(`Instagram Download Error:`, e);
        return null;
    }
}
