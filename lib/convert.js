const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

async function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
    return new Promise(async (resolve, reject) => {
        try {
            const tmpDir = path.join(__dirname, "../../tmp");
            await fs.mkdir(tmpDir, { recursive: true });

            // Tạo tên file duy nhất với hậu tố ngẫu nhiên
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const timestamp = Date.now();
            const tmpInput = path.join(tmpDir, `${timestamp}_${randomSuffix}_in.${ext}`);
            const tmpOutput = path.join(tmpDir, `${timestamp}_${randomSuffix}_out.${ext2}`);

            await fs.writeFile(tmpInput, buffer);

            const process = spawn("ffmpeg", [
                "-y", // Ghi đè file đầu ra
                "-i", tmpInput,
                ...args,
                tmpOutput
            ]);

            let errorData = "";
            process.stderr.on("data", (data) => (errorData += data.toString()));

            process.on("error", (err) => {
                fs.unlink(tmpInput).catch(() => {});
                reject(new Error(`FFmpeg error: ${err.message}`));
            });

            process.on("close", async (code) => {
                try {
                    await fs.unlink(tmpInput);
                    if (code !== 0) {
                        await fs.unlink(tmpOutput).catch(() => {});
                        return reject(new Error(`FFmpeg exited with code ${code}: ${errorData}`));
                    }
                    const outputBuffer = await fs.readFile(tmpOutput);
                    await fs.unlink(tmpOutput);
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
        "-vn", // Loại bỏ video
        "-ac", "2", // 2 kênh âm thanh
        "-b:a", "128k", // Bitrate 128kbps
        "-ar", "44100", // Tần số mẫu 44.1kHz
        "-f", "mp3" // Định dạng đầu ra
    ], ext, "mp3");
}

async function toPTT(buffer, ext) {
    return ffmpeg(buffer, [
        "-vn",
        "-c:a", "libopus",
        "-b:a", "128k",
        "-vbr", "on",
        "-compression_level", "10"
    ], ext, "opus");
}

async function toVideo(buffer, ext) {
    return ffmpeg(buffer, [
        "-c:v", "libx264",
        "-c:a", "aac",
        "-ab", "128k",
        "-ar", "44100",
        "-crf", "32",
        "-preset", "slow"
    ], ext, "mp4");
}

module.exports = { ffmpeg, toAudio, toPTT, toVideo };
