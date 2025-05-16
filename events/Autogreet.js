const cron = require("node-cron");
const moment = require("moment-timezone");

module.exports = {
    config: {
        name: "autogreet",
        version: "1.0",
        author: "Dương Sú",
        role: 0,
        category: "system",
        shortDescription: "Tự động gửi lời chào buổi sáng, trưa, chiều",
        guide: "Điền lời chào và thời gian trong settings"
    },

    onStart: async function ({ api }) {
        // Ví dụ cơ bản về hàm gửi tin nhắn theo thời gian
        // VD: "0 6 * * *" chạy lúc 0 phút, 6 giờ (6:00 AM)
        // Định dạng: minute hour * * *
        const settings = {
            timezone: "Asia/Ho_Chi_Minh",
            schedules: [
                {
                    time: "30 8 * * *", // 8:30 AM
                    message: "🌞 Chào buổi sáng! Bắt đầu ngày mới thật năng động nhé! ({time})"
                },
                {
                    time: "0 12 * * *", // 12:00 PM
                    message: "☀️ Chào buổi trưa! Chúc mọi người ăn trưa ngon miệng! ({time})"
                },
                {
                    time: "25 12 * * *", // 12:20 PM
                    message: "😴 Ngủ trưa thôi :v ({time})"
                },
                {
                    time: "0 16 * * *", // 4:00 PM
                    message: "🌄 Chào buổi chiều! Thư giãn và tiếp tục công việc nào! ({time})"
                }
            ],
            groups: [] // Để trống: gửi tất cả nhóm; thêm threadID: ["123456789"]
        };

        // Gửi tin nhắn
        const sendGreeting = (message, threadID) => {
            const time = moment().tz(settings.timezone).format("HH:mm A");
            api.sendMessage(message.replace("{time}", time), threadID);
        };

        // Lấy danh sách nhóm
        const threads = (await api.getThreadList(100, null, ["INBOX"])).filter(t => t.isGroup);
        const targets = settings.groups.length ? threads.filter(t => settings.groups.includes(t.threadID)) : threads;

        // Lập lịch
        settings.schedules.forEach(schedule => {
            if (schedule.time && schedule.message) {
                cron.schedule(schedule.time, () => {
                    targets.forEach(t => sendGreeting(schedule.message, t.threadID));
                }, { timezone: settings.timezone });
            }
        });
    }
};
