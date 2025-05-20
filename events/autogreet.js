const moment = require("moment-timezone");

module.exports = {
    config: {
        name: "autogreet",
        version: "1.7",
        author: "Dương Sú",
        role: 0,
        category: "system"
    },

    onStart: async function ({ api }) {
        const timezone = "Asia/Ho_Chi_Minh"; // Múi giờ Việt Nam
        console.log(`AutoGreet: Started at ${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss")} (Timezone: ${timezone})`);

        const schedules = [
            { hour: 8, minute: 30, message: "🌞 Chào buổi sáng! ({time})" },
            { hour: 12, minute: 0, message: "☀️ Chào buổi trưa! ({time})" },
            { hour: 12, minute: 20, message: "😴 Ngủ trưa thôi :v ({time})" },
            { hour: 22, minute: 22, message: "🌄 Chào buổi tối! ({time})" }
        ];

        let threads = [];
        try {
            threads = (await api.getThreadList(100, null, ["INBOX"])).filter(t => t.isGroup);
            console.log(`AutoGreet: Found ${threads.length} groups`);
        } catch (err) {
            console.error("AutoGreet: Failed to get group list:", err.message);
            return;
        }

        const sendGreeting = (message) => {
            const time = moment().tz(timezone).format("HH:mm A");
            const finalMsg = message.replace("{time}", time);
            for (const thread of threads) {
                api.sendMessage(finalMsg, thread.threadID, err => {
                    if (err) console.error(`Send error to ${thread.threadID}:`, err.message);
                    else console.log(`Sent to ${thread.threadID} at ${time}`);
                });
            }
        };

        const scheduleMessage = (schedule) => {
            const now = moment().tz(timezone);
            const target = moment().tz(timezone).hour(schedule.hour).minute(schedule.minute).second(0);
            if (target.isBefore(now)) {
                target.add(1, 'day');
            }

            const delay = target.diff(now);
            console.log(`AutoGreet: Scheduling "${schedule.message}" at ${target.format("YYYY-MM-DD HH:mm:ss")}`);

            setTimeout(() => {
                sendGreeting(schedule.message);
                scheduleMessage(schedule); // Lặp lại cho ngày hôm sau
            }, delay);
        };

        schedules.forEach(scheduleMessage);
    }
};
