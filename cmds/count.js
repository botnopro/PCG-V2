module.exports = {
    config: {
        name: "count",
        version: "1.9.1",
        author: "NTKhang, mod by Dương Sú",
        countDown: 5,
        role: 0,
        description: {
            vi: "Xem số lượng tin nhắn của thành viên (tính từ lúc bot vào nhóm)",
            en: "View message count of members (since bot joined group)"
        },
        category: "box chat",
        guide: {
            vi: "{pn}: Xem số tin nhắn của bạn\n"
                + "{pn} @tag: Xem số tin nhắn của người được tag\n"
                + "{pn} all: Xem số tin nhắn của tất cả thành viên (bao gồm 0 tin nhắn)\n"
                + "{pn} <số>: Xem thành viên có ít hơn <số> tin nhắn\n"
                + "{pn} find <số>: Xem thành viên có đúng <số> tin nhắn, reply với số thứ tự hoặc STT để kick\n"
                + "{pn} tag <số>: Tag thành viên có đúng <số> tin nhắn\n"
                + "{pn} find 0 hoặc tag 0: Xem hoặc tag thành viên chưa gửi tin nhắn",
            en: "{pn}: View your message count\n"
                + "{pn} @tag: View message count of tagged people\n"
                + "{pn} all: View message count of all members (including 0 messages)\n"
                + "{pn} <number>: View members with fewer than <number> messages\n"
                + "{pn} find <number>: View members with exactly <number> messages, reply with index or STT to kick\n"
                + "{pn} tag <number>: Tag members with exactly <number> messages\n"
                + "{pn} find 0 or tag 0: View or tag members who haven't sent messages"
        }
    },

    langs: {
        vi: {
            count: "Số tin nhắn của các thành viên:",
            page: "Trang [%1/%2]",
            reply: "Phản hồi tin nhắn này kèm số trang để xem tiếp hoặc số thứ tự/STT để kick",
            result: "%1 hạng %2 với %3 tin nhắn",
            yourResult: "Bạn đứng hạng %1 và đã gửi %2 tin nhắn trong nhóm này",
            invalidPage: "Số trang hoặc số thứ tự/STT không hợp lệ",
            lessThanCount: "Thành viên có ít hơn %1 tin nhắn:",
            noLessThanCount: "Không có ai có ít hơn %1 tin nhắn.",
            exactCount: "Thành viên có đúng %1 tin nhắn:",
            noExactCount: "Không có ai có đúng %1 tin nhắn.",
            zeroCount: "Thành viên chưa gửi tin nhắn: %1",
            kickSuccess: "Đã kick %1 khỏi nhóm.",
            kickFailed: "Không thể kick %1: %2",
            needAdmin: "Bot cần là quản trị viên để kick thành viên.",
            selfKick: "Không thể tự kick chính bạn!",
            botKick: "Không thể kick chính bot!",
            invalidNumber: "Vui lòng nhập số hợp lệ"
        },
        en: {
            count: "Number of messages of members:",
            page: "Page [%1/%2]",
            reply: "Reply with page number to view more or index/STT to kick",
            result: "%1 rank %2 with %3 messages",
            yourResult: "You are ranked %1 with %2 messages in this group",
            invalidPage: "Invalid page number or index/STT",
            lessThanCount: "Members with fewer than %1 messages:",
            noLessThanCount: "No one has fewer than %1 messages.",
            exactCount: "Members with exactly %1 messages:",
            noExactCount: "No one has exactly %1 messages.",
            zeroCount: "Members who haven't sent messages: %1",
            kickSuccess: "Kicked %1 from the group.",
            kickFailed: "Failed to kick %1: %2",
            needAdmin: "Bot needs to be an admin to kick members.",
            selfKick: "Cannot kick yourself!",
            botKick: "Cannot kick the bot itself!",
            invalidNumber: "Please enter a valid number"
        }
    },

    onStart: async function ({ args, threadsData, message, event, api, commandName, getLang }) {
        const { threadID, senderID } = event;
        const threadData = await threadsData.get(threadID);
        const { members } = threadData;
        const usersInGroup = (await api.getThreadInfo(threadID)).participantIDs;
        const botID = api.getCurrentUserID();
        let arraySort = [];

        // Lấy danh sách thành viên
        for (const user of members) {
            if (!usersInGroup.includes(user.userID)) continue;
            const charac = "️️️️️️️️️️️️️️️️️";
            arraySort.push({
                name: user.name.includes(charac) ? `Uid: ${user.userID}` : user.name,
                count: user.count,
                uid: user.userID
            });
        }

        // Sắp xếp và gán số thứ tự
        let stt = 1;
        arraySort.sort((a, b) => b.count - a.count);
        arraySort.forEach(item => item.stt = stt++);

        if (args[0]) {
            // Lệnh count all
            if (args[0].toLowerCase() == "all") {
                let msg = getLang("count");
                for (const item of arraySort) {
                    msg += `\n🔰 ${item.name}\n(Số: ${item.stt}) - ${item.count} tin nhắn`;
                }
                if (msg.length > 19999) {
                    msg = "";
                    let page = parseInt(args[1]) || 1;
                    const splitPage = global.utils.splitPage(arraySort, 50);
                    arraySort = splitPage.allPage[page - 1];
                    for (const item of arraySort) {
                        msg += `\n🔰 ${item.name}\n(Số: ${item.stt}) - ${item.count} tin nhắn`;
                    }
                    msg += `${getLang("page", page, splitPage.totalPage)}\n${getLang("reply")}\n`;
                    return message.reply(msg, (err, info) => {
                        if (err) return message.err(err);
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            splitPage,
                            author: senderID,
                            type: "page"
                        });
                    });
                }
                message.reply(msg);
            }
            else if (args[0].toLowerCase() == "nhohon") {
                const lessThanCount = parseInt(args[0].startsWith("<") ? args[0].slice(1) : args[1]);
                if (isNaN(lessThanCount)) return message.reply(getLang("invalidNumber"));
                let msg = getLang("lessThanCount", lessThanCount);
                const filtered = arraySort.filter(item => item.count < lessThanCount);
                if (!filtered.length) {
                    msg += `\n${getLang("noLessThanCount", lessThanCount)}`;
                    return message.reply(msg);
                }
                filtered.forEach((item, index) => {
                    msg += `\n🔰 ${item.name}\n(Số - ${item.count}) tin nhắn`;
                });
                return message.reply(msg);
            }
            else if (args[0].toLowerCase() == "find") {
                const exactCount = parseInt(args[1]);
                if (isNaN(exactCount)) return message.reply(getLang("invalidNumber"));
                let msg = getLang("exactCount", exactCount);
                const filtered = arraySort.filter(item => item.count === exactCount);
                if (!filtered.length) {
                    msg += `\n${getLang("noExactCount", exactCount)}`;
                    return message.reply(msg);
                }
                filtered.forEach((item, index) => {
                    msg += `\n🔰 ${item.name}\n(Số: ${item.stt}) - ${item.count} tin nhắn`;
                });
                return message.reply(msg, (err, info) => {
                    if (err) return message.err(err);
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        members: filtered,
                        author: senderID,
                        type: "kick"
                    });
                });
            }
            else if (args[0].toLowerCase() == "tag") {
                const exactCount = parseInt(args[1]);
                if (isNaN(exactCount)) return message.reply(getLang("invalidNumber"));
                const filtered = arraySort.filter(item => item.count === exactCount);
                if (!filtered.length) {
                    return message.reply(getLang("noExactCount", exactCount));
                }
                const mentions = filtered.map(item => ({ tag: `@${item.name}`, id: item.uid }));
                const msg = getLang("exactCount", exactCount) + "\n" + mentions.map(m => `🔰 ${m.tag}\n(Số: ${filtered.find(item => item.uid == m.id).stt}) - ${exactCount} tin nhắn\n`).join("");
                return message.reply({ body: msg, mentions });
            }
            else if (event.mentions) {
                let msg = "";
                for (const id in event.mentions) {
                    const findUser = arraySort.find(item => item.uid == id);
                    if (findUser) {
                        msg += `\n🔰 ${findUser.name}\n(Số: ${findUser.stt}) - ${findUser.count} tin nhắn`;
                    }
                }
                message.reply(msg);
            }
        }
        else {
            const findUser = arraySort.find(item => item.uid == senderID);
            return message.reply(getLang("yourResult", findUser.stt, findUser.count));
        }
    },

    onReply: async ({ message, event, Reply, commandName, api, threadsData, getLang }) => {
        const { senderID, body, threadID } = event;
        const { author, splitPage, members, type } = Reply;
        if (author != senderID) return;
        if (type === "page") {
            const page = parseInt(body);
            if (isNaN(page) || page < 1 || page > splitPage.totalPage) {
                return message.reply(getLang("invalidPage"));
            }
            let msg = getLang("count");
            const arraySort = splitPage.allPage[page - 1];
            for (const item of arraySort) {
                msg += `\n🔰 ${item.name}\n(Số: ${item.stt}) - ${item.count} tin nhắn`;
            }
            msg += `\n${getLang("page", page, splitPage.totalPage)}\n${getLang("reply")}`;
            message.reply(msg, (err, info) => {
                if (err) return message.err(err);
                message.unsend(Reply.messageID);
                global.GoatBot.onReply.set(info.messageID, {
                    commandName,
                    messageID: info.messageID,
                    splitPage,
                    author: senderID,
                    type: "page"
                });
            });
        }
        else if (type === "kick") {
            const input = parseInt(body);
            let user;
            if (input <= members.length) {
                user = members[input - 1];
            } else {
                user = members.find(item => item.stt === input);
            }
            if (!user) {
                return message.reply(getLang("invalidPage"));
            }
            const botID = api.getCurrentUserID();
            const adminIDs = await threadsData.get(threadID, "adminIDs");
            if (!adminIDs.includes(botID)) {
                return message.reply(getLang("needAdmin"));
            }
            if (user.uid === senderID) {
                return message.reply(getLang("selfKick"));
            }
            if (user.uid === botID) {
                return message.reply(getLang("botKick"));
            }
            try {
                await api.removeUserFromGroup(user.uid, threadID);
                await message.reply(getLang("kickSuccess", user.name));
            } catch (e) {
                await message.reply(getLang("kickFailed", user.name, e.message));
            }
        }
    },

    onChat: async ({ usersData, threadsData, event }) => {
        const { senderID, threadID } = event;
        const members = await threadsData.get(threadID, "members");
        const findMember = members.find(user => user.userID == senderID);
        if (!findMember) {
            members.push({
                userID: senderID,
                name: await usersData.getName(senderID),
                nickname: null,
                inGroup: true,
                count: 1
            });
        } else {
            findMember.count += 1;
        }
        await threadsData.set(threadID, members, "members");
    }
};
