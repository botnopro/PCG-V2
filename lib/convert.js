const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");

async function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
    return new Promise(async (resolve, reject) => {
        try {
            const tmpDir = path.join(__dirname, "../../tmp");
            await fs.mkdir(tmpDir, { recursive: true });

            // Tạo tên file duy nhất cho đầu vào và đầu ra
            const uniqueId = uuidv4();
            const tmpInput = path.join(tmpDir, `${uniqueId}_in.${ext}`);
            const tmpOutput = path.join(tmpDir, `${uniqueId}_out.${ext2}`);

            await fs.writeFile(tmpInput, buffer);

            // Thêm -vn để loại bỏ stream video
            const process = spawn("ffmpeg", [
                "-y",           // Ghi đè file đầu ra nếu tồn tại
                "-i", tmpInput, // File đầu vào
                "-vn",          // Loại bỏ stream video
                ...args,        // Các tham số xử lý âm thanh
                tmpOutput       // File đầu ra
            ]);

            let errorData = "";
            process.stderr.on("data", (data) => (errorData += data.toString()));

            process.on("error", (err) => {
                fs.unlink(tmpInput).catch(() => {});
                reject(new Error(`FFmpeg error: ${err.message}`));
            });

            process.on("close", async (code) => {
                try {
                    await fs.unlink(tmpInput); // Xóa file tạm đầu vào
                    if (code !== 0) {
                        await fs.unlink(tmpOutput).catch(() => {});
                        return reject(new Error(`FFmpeg exited with code ${code}: ${errorData}`));
                    }
                    const outputBuffer = await fs.readFile(tmpOutput);
                    await fs.unlink(tmpOutput); // Xóa file tạm đầu ra
                    resolve(outputBuffer);
                } catch (e) {
                    reject(new Error(`Error processing file: ${e.message}`));
                }
            });
        } catch (e) {
            reject(new Error(`Error initializing FFmpeg: ${e.message}`));
        }
    });
}

async function toAudio(buffer, ext) {
    return ffmpeg(buffer, [
        "-ac", "2",        // 2 kênh âm thanh (stereo)
        "-b:a", "128k",    // Bitrate 128k
        "-ar", "44100",    // Tần số mẫu 44.1kHz
        "-f", "mp3"        // Định dạng đầu ra MP3
    ], ext, "mp3");
}

// Các hàm khác như toPTT, toVideo giữ nguyên logic tương tự
module.exports = { ffmpeg, toAudio };
