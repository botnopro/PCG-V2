const fetch = require('node-fetch'); // Cần cài đặt: npm install node-fetch@2 (cho CommonJS)
const FormData = require('form-data'); // Cần cài đặt: npm install form-data
const { fileTypeFromBuffer } = require('file-type'); // Cần cài đặt: npm install file-type

async function uploadImageToServer(buffer) {
    console.log("Uploader: Bắt đầu tải ảnh lên dịch vụ lưu trữ...");
    // Ví dụ sử dụng file.io như trong code mẫu của cậu
    try {
        const { ext, mime } = await fileTypeFromBuffer(buffer) || { ext: 'png', mime: 'image/png' }; // Mặc định nếu không xác định được
        const form = new FormData();
        form.append('file', buffer, 'tmp.' + ext);
        
        console.log(`Uploader: Đang tải lên file.io với ext: ${ext}, mime: ${mime}`);
        const res = await fetch('https://file.io/?expires=1d', { // Ảnh sẽ hết hạn sau 1 ngày
            method: 'POST',
            body: form,
        });
        const json = await res.json();
        if (!json.success) {
            console.error("Uploader: file.io báo lỗi:", json);
            throw new Error(json.message || 'Lỗi khi tải ảnh lên file.io');
        }
        console.log("Uploader: Tải lên file.io thành công! Link:", json.link);
        return json.link;
    } catch (uploadError) {
        console.error("Uploader: Đã xảy ra lỗi trong quá trình tải ảnh:", uploadError);
        throw uploadError; // Ném lỗi ra để lệnh toanime xử lý
    }
}

module.exports = { uploadImageToServer };
