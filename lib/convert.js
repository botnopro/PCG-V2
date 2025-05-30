const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

async function ffmpeg(buffer, args = [], ext = "", ext2 = "") {
    return new Promise(async (resolve, reject) => {
        try {
            const tmpDir = path.join(__dirname, "../../tmp");
            await fs.mkdir(tmpDir, { recursive: true });

            const tmpInput = path.join(tmpDir, `${Date.now()}.${ext}`);
            const tmpOutput = path.join(tmpDir, `${Date.now()}.${ext2}`);

            await fs.writeFile(tmpInput, buffer);

            const process = spawn("ffmpeg", [
                "-y",
                "-i", tmpInput,
                ...args,
                tmpOutput
            ]);

            let errorData = "";
            process.stderr.on("data", (data) => errorData += data.toString());

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
        "-vn",
        "-ac", "2",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "mp3"
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
