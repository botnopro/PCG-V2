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
        const settings = {
            timezone: "Asia/Ho_Chi_Minh", // Múi giờ Việt Nam
            schedules: [
              /* Ví dụ cơ bản về hàm gửi tin nhắn theo thời gian
              ví dụ 0 6 * * *
                   0 phút 6 giờ x ngày x tháng x năm
              {
                    time: "", // Điền thời gian (cron format, VD: "0 8 * * *" cho 8:00 AM)
                    message: "" // Điền lời chào (VD: "Chúc buổi sáng vui vẻ! ({time})")
                },
                */
                {
                    time: "0 8 * * *", // 8:00 AM
                    message: "🌞 Chào buổi sáng! Bắt đầu ngày mới thật năng động nhé! ({time})"
                },
                {
                    time: "0 12 * * *", // 12:00 PM
                    message: "☀️ Chào buổi trưa! Chúc mọi người ăn trưa ngon miệng! ({time})"
                },
                {
                    time: "40 12 * * *",
                    message: "Ngủ trưa thôi :v"
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
        const settings = {
            timezone: "Asia/Ho_Chi_Minh", // Múi giờ Việt Nam
            schedules: [
              /* Ví dụ cơ bản về hàm gửi tin nhắn theo thời gian
              ví dụ 0 6 * * *
                   0 phút 6 giờ x ngày x tháng x năm
              {
                    time: "", // Điền thời gian (cron format, VD: "0 8 * * *" cho 8:00 AM)
                    message: "" // Điền lời chào (VD: "Chúc buổi sáng vui vẻ! ({time})")
                },
                */
                {
                    time: "0 8 * * *", // 8:00 AM
                    message: "🌞 Chào buổi sáng! Bắt đầu ngày mới thật năng động nhé! ({time})"
                },
                {
                    time: "0 12 * * *", // 12:00 PM
                    message: "☀️ Chào buổi trưa! Chúc mọi người ăn trưa ngon miệng! ({time})"
                },
                {
                    time: "40 12 * * *",
                    message: "Ngủ trưa thôi :v"
                },
                {
                    time: "0 16 * * *", // 4:00 PM
                    message: "🌄 Chào buổi chiều! Thư giãn và tiếp tục công việc nào! ({time})"
                }
            ],
            groups: [] // Để trống: gửi tất cả nhóm; thêm threadID nếu muốn: ["123456789"]
        };

        // Gửi tin nhắn
        const sendGreeting = (message, threadID) => {
            const time = moment().tz(settings.timezone).format("HH:mm A");
            api.sendMessage(message.replace("{time}", time), threadID);
        };

        // Lấy danh sách nhóm
        const threads = (await api.getThreadList(100, null, ["INBOX"])).filter(t => t.isGroup);
        const targets = settings.groups.length ? threads.filter(t => settings.groups.includes(t.threadID)) : threads;

        // Lập lịch cho mỗi schedule
        settings.schedules.forEach(schedule => {
            if (schedule.time && schedule.message) {
                cron.schedule(schedule.time, () => {
                    targets.forEach(t => sendGreeting(schedule.message, t.threadID));
                }, { timezone: settings.timezone });
            }
        });
    }
};          },
                {
                    time: "0 16 * * *", // 4:00 PM
                    message: "🌄 Chào buổi chiều! Thư giãn và tiếp tục công việc nào! ({time})"
                }
            ],
            groups: [] // Để trống: gửi tất cả nhóm; thêm threadID nếu muốn: ["123456789"]
        };

        // Gửi tin nhắn
        const sendGreeting = (message, threadID) => {
            const time = moment().tz(settings.timezone).format("HH:mm A");
            api.sendMessage(message.replace("{time}", time), threadID);
        };

        // Lấy danh sách nhóm
        const threads = (await api.getThreadList(100, null, ["INBOX"])).filter(t => t.isGroup);
        const targets = settings.groups.length ? threads.filter(t => settings.groups.includes(t.threadID)) : threads;

        // Lập lịch cho mỗi schedule
        settings.schedules.forEach(schedule => {
            if (schedule.time && schedule.message) {
                cron.schedule(schedule.time, () => {
                    targets.forEach(t => sendGreeting(schedule.message, t.threadID));
                }, { timezone: settings.timezone });
            }
        });
    }
};
