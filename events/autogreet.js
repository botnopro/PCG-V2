const moment = require("moment");

module.exports = {
    config: {
        name: "autogreet",
        version: "1.5",
        author: "Dương Sú",
        role: 0,
        category: "system"
    },

    onStart: async function ({ api }) {
        console.log(`AutoGreet: Started at ${moment().format("YYYY-MM-DD HH:mm:ss")} (Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);

        const settings = {
            schedules: [
                { hour: 8, minute: 30, message: "🌞 Chào buổi sáng! ({time})" },
                { hour: 12, minute: 0, message: "☀️ Chào buổi trưa! ({time})" },
                { hour: 12, minute: 20, message: "😴 Ngủ trưa thôi :v ({time})" },
                { hour: 22, minute: 22, message: "🌄 Chào buổi toi!" }
            ],
            groups: []
        };

        const sendGreeting = (message, threadID) => {
            try {
                const time = moment().format("HH:mm A");
                const msg = message.replace("{time}", time);
                api.sendMessage(msg, threadID, (err) => {
                    if (err) {
                        console.error(`AutoGreet: Error sending to ${threadID} at ${moment().format("HH:mm:ss")}: ${err.message}`);
                    } else {
                        console.log(`AutoGreet: Sent "${msg}" to ${threadID} at ${moment().format("HH:mm:ss")}`);
                    }
                });
            } catch (err) {
                console.error(`AutoGreet: Send failed at ${moment().format("HH:mm:ss")}: ${err.message}`);
            }
        };

        let threads = [];
        try {
            threads = (await api.getThreadList(100, null, ["INBOX"])).filter(t => t.isGroup);
            console.log(`AutoGreet: Found ${threads.length} groups: ${threads.map(t => t.threadID).join(", ")}`);
        } catch (err) {
            console.error(`AutoGreet: Fetch threads failed: ${err.message}`);
        }

        const targets = settings.groups.length ? threads.filter(t => settings.groups.includes(t.threadID)) : threads;
        if (!targets.length) {
            console.warn("AutoGreet: No groups found");
            return;
        }

        setInterval(() => {
            const now = moment();
            const currentHour = now.hour();
            const currentMinute = now.minute();
            console.log(`AutoGreet: Checking time ${now.format("HH:mm:ss")}`);

            settings.schedules.forEach(schedule => {
                if (currentHour === schedule.hour && currentMinute === schedule.minute) {
                    console.log(`AutoGreet: Triggering "${schedule.message}" at ${now.format("HH:mm:ss")}`);
                    targets.forEach(t => sendGreeting(schedule.message, t.threadID));
                }
            });
        }, 30000); // Kiểm tra mỗi 30 giây
    }
};