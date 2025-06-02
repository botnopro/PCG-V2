// scripts/lib/upload.js (hoặc tên file uploader của cậu)

const fetch = require('node-fetch'); // Đảm bảo cậu đã cài: npm install node-fetch@2
const FormData = require('form-data');   // Đảm bảo cậu đã cài: npm install form-data
const { fileTypeFromBuffer } = require('file-type'); // <<--- DÒNG NÀY QUAN TRỌNG! Với file-type@16.5.4, cách require này sẽ hoạt động tốt.

async function uploadImageToServer(buffer) {
    console.log("Uploader: Bắt đầu tải ảnh lên dịch vụ lưu trữ...");
    try {
        // Dòng này giờ đây sẽ tìm thấy hàm fileTypeFromBuffer ngon lành!
        const typeResult = await fileTypeFromBuffer(buffer); 
        const { ext, mime } = typeResult || { ext: 'png', mime: 'image/png' }; // Gán giá trị mặc định nếu typeResult là undefined

        const form = new FormData();
        // Quan trọng: Phải truyền buffer gốc, không phải toArrayBuffer() nếu hàm Blob không có sẵn hoặc không cần thiết cho FormData
        // FormData của thư viện 'form-data' có thể nhận trực tiếp Buffer.
        form.append('file', buffer, 'tmp.' + ext); 
        
        console.log(`Uploader: Đang tải lên file.io với ext: ${ext}, mime: ${mime}`);
        const res = await fetch('https://file.io/?expires=1d', {
            method: 'POST',
            body: form,
            // headers: form.getHeaders() // Quan trọng: Thêm headers cho FormData nếu dùng node-fetch với form-data
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
        throw uploadError;
    }
}

module.exports = { uploadImageToServer };
