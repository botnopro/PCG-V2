module.exports = {
    config: {
        name: "count",
        version: "1.9.11",
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
                + "{pn} all: Xem số tin nhắn của tất cả thành viên\n"
                + "{pn} nhohon <số>: Xem thành viên có ≤ <số> tin nhắn\n"
                + "{pn} find <số>: (QTV) Xem thành viên có đúng <số> tin nhắn, reply với số thứ tự để kick\n"
                + "{pn} tag <số>: (QTV) Tag thành viên có đúng <số> tin nhắn\n"
                + "{pn} refresh: (QTV) Quét và cập nhật danh sách thành viên\n"
                + "{pn} find 0 hoặc tag 0: Xem hoặc tag thành viên chưa gửi tin nhắn",
            en: "{pn}: View your message count\n"
                + "{pn} @tag: View message count of tagged people\n"
                + "{pn} all: View message count of all members\n"
                + "{pn} nhohon <number>: View members with ≤ <number> messages\n"
                + "{pn} find <number>: (Admin) View members with exactly <number> messages, reply with index to kick\n"
                + "{pn} tag <number>: (Admin) Tag members with exactly <number> messages\n"
                + "{pn} refresh: (Admin) Scan and update member list\n"
                + "{pn} find 0 or tag 0: View or tag members who haven't sent messages"
        }
    },

    langs: {
        vi: {
            count: "Số tin nhắn của các thành viên:",
            page: "Trang [%1/%2]",
            reply: "Phản hồi tin nhắn này kèm số trang để xem tiếp hoặc số thứ tự để kick",
            result: "%1 hạng %2 với %3 tin nhắn",
            yourResult: "Bạn đứng hạng %1 và đã gửi %2 tin nhắn trong nhóm này",
            invalidPage: "Số thứ tự không hợp lệ, hãy nhập số từ 1 đến %1",
            emptyMemberList: "Danh sách thành viên trống, không thể kick",
            lessThanCount: "Thành viên có ≤ %1 tin nhắn:",
            noLessThanCount: "Không có ai có ≤ %1 tin nhắn",
            exactCount: "Thành viên có đúng %1 tin nhắn:",
            noExactCount: "Không có ai có đúng %1 tin nhắn",
            zeroCount: "Thành viên chưa gửi tin nhắn: %1",
            kickSuccess: "Đã kick %1 khỏi nhóm",
            kickFailed: "Không thể kick %1: %2",
            needAdmin: "Bot cần là quản trị viên để kick thành viên",
            selfKick: "Không thể tự kick chính bạn!",
            botKick: "Không thể kick chính bot!",
            invalidNumber: "Vui lòng nhập số hợp lệ",
            noPermission: "Bạn cần quyền quản trị viên hoặc trợ lý để sử dụng lệnh này",
            refreshSuccess: "Đã quét và cập nhật danh sách thành viên:",
            refreshNoChange: "Danh sách thành viên đã cập nhật, không có thay đổi"
        },
        en: {
            count: "Number of messages of members:",
            page: "Page [%1/%2]",
            reply: "Reply with page number to view more or index to kick",
            result: "%1 rank %2 with %3 messages",
            yourResult: "You are ranked %1 with %2 messages in this group",
            invalidPage: "Invalid index, please enter a number from 1 to %1",
            emptyMemberList: "Member list is empty, cannot kick",
            lessThanCount: "Members with ≤ %1 messages:",
            noLessThanCount: "No one has ≤ %1 messages",
            exactCount: "Members with exactly %1 messages:",
            noExactCount: "No one has exactly %1 messages",
            zeroCount: "Members who haven't sent messages: %1",
            kickSuccess: "Kicked %1 from the group",
            kickFailed: "Failed to kick %1: %2",
            needAdmin: "Bot needs to be an admin to kick members",
            selfKick: "Cannot kick yourself!",
            botKick: "Cannot kick the bot itself!",
            invalidNumber: "Please enter a valid number",
            noPermission: "You need admin or assistant permissions to use this command",
            refreshSuccess: "Scanned and updated member list:",
            refreshNoChange: "Member list is up to date, no changes"
        }
    },

    onStart: async function ({ args, threadsData, message, event, api, commandName, getLang, usersData }) {
        const { threadID, senderID } = event;
        const threadData = await threadsData.get(threadID);
        let { members, adminIDs } = threadData;
        const usersInGroup = (await api.getThreadInfo(threadID)).participantIDs;
        const botID = api.getCurrentUserID();
        let arraySort = [];
        const isAdmin = adminIDs.includes(senderID);
        const userData = await usersData.get(senderID);
        const userRole = userData?.role || 0;
        const prepareArraySort = (members) => {
            arraySort = [];
            let stt = 1;
            for (const user of members) {
                if (!usersInGroup.includes(user.userID)) continue;
                if (!user.userID || typeof user.count !== 'number') continue;
                const charac = "️️️️️️️️️️️️️️️️️";
                arraySort.push({
                    name: user.name.includes(charac) ? `Uid: ${user.userID}` : user.name,
                    count: user.count,
                    uid: user.userID
                });
            }
            arraySort.sort((a, b) => b.count - a.count);
            arraySort.forEach(item => item.stt = stt++);
            return arraySort;
        };
        if (args[0]?.toLowerCase() === "refresh") {
            if (!isAdmin && userRole < 1) {
                return message.reply(getLang("noPermission"));
            }
            const newMembers = [];
            for (const userID of usersInGroup) {
                const existingMember = members.find(m => m.userID === userID);
                const name = await usersData.getName(userID);
                newMembers.push({
                    userID,
                    name,
                    nickname: existingMember?.nickname || null,
                    inGroup: true,
                    count: existingMember?.count || 0
                });
            }
            await threadsData.set(threadID, newMembers, "members");
            members = newMembers;
            prepareArraySort(members);
            let msg = getLang("refreshSuccess");
            if (!arraySort.length) {
                msg = getLang("refreshNoChange");
            } else {
                for (const item of arraySort) {
                    msg += `\n🔰 ${item.name}\nSố: ${item.stt} - ${item.count} tin nhắn`;
                }
            }
            return message.reply(msg);
        }
        prepareArraySort(members);
        if (args[0]) {
            const command = args[0].toLowerCase();
            if (command === "all") {
                let msg = getLang("count");
                for (const item of arraySort) {
                    msg += `\n🔰 ${item.name}\nSố: ${item.stt} - ${item.count} tin nhắn`;
                }
                if (msg.length > 19999) {
                    msg = "";
                    let page = parseInt(args[1]) || 1;
                    const splitPage = global.utils.splitPage(arraySort, 50);
                    arraySort = splitPage.allPage[page - 1];
                    for (const item of arraySort) {
                        msg += `\n🔰 ${item.name}\nSố: ${item.stt} - ${item.count} tin nhắn`;
                    }
                    msg += `\n${getLang("page", page, splitPage.totalPage)}\n${getLang("reply")}`;
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
            // Lệnh count nhohon
            else if (command === "nhohon" || command.startsWith("<")) {
                let lessThanCount;
                if (command.startsWith("<")) {
                    lessThanCount = parseInt(args[0].slice(1));
                } else {
                    lessThanCount = parseInt(args[1]);
                }
                if (isNaN(lessThanCount) || lessThanCount < 0) return message.reply(getLang("invalidNumber"));
                let msg = getLang("lessThanCount", lessThanCount);
                const filtered = arraySort.filter(item => item.count <= lessThanCount);
                if (!filtered.length) {
                    msg += `\n${getLang("noLessThanCount", lessThanCount)}`;
                    return message.reply(msg);
                }
                filtered.forEach((item, index) => {
                    msg += `\n🔰 ${item.name}\nSố: ${item.stt} - ${item.count} tin nhắn`;
                });
                return message.reply(msg);
            }
            // Lệnh count find
            else if (command === "find") {
                if (!isAdmin && userRole < 1) {
                    return message.reply(getLang("noPermission"));
                }
                const exactCount = parseInt(args[1]);
                if (isNaN(exactCount)) return message.reply(getLang("invalidNumber"));
                let msg = getLang("exactCount", exactCount);
                const filtered = arraySort.filter(item => item.count === exactCount);
                if (!filtered.length) {
                    msg += `\n${getLang("noExactCount", exactCount)}`;
                    return message.reply(msg);
                }
                filtered.forEach((item, index) => {
                    msg += `\n🔰 ${item.name}\nSố: ${index + 1} - ${item.count} tin nhắn`;
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
            // Lệnh count tag
            else if (command === "tag") {
                if (!isAdmin && userRole < 1) {
                    return message.reply(getLang("noPermission"));
                }
                const exactCount = parseInt(args[1]);
                if (isNaN(exactCount)) return message.reply(getLang("invalidNumber"));
                const filtered = arraySort.filter(item => item.count === exactCount);
                if (!filtered.length) {
                    return message.reply(getLang("noExactCount", exactCount));
                }
                const mentions = filtered.map(item => ({ tag: `@${item.name}`, id: item.uid }));
                const msg = getLang("exactCount", exactCount) + "\n" + mentions.map(m => `🔰 ${m.tag}\nSố: ${filtered.findIndex(i => i.uid == m.id) + 1} - ${exactCount} tin nhắn`).join("\n");
                return message.reply({ body: msg, mentions });
            }
            // Lệnh count @tag
            else if (event.mentions) {
                let msg = "";
                for (const id in event.mentions) {
                    const findUser = arraySort.find(item => item.uid == id);
                    if (findUser) {
                        msg += `\n🔰 ${findUser.name}\nSố: ${findUser.stt} - ${findUser.count} tin nhắn`;
                    }
                }
                message.reply(msg);
            }
        }
        // Lệnh count cá nhân
        else {
            const findUser = arraySort.find(item => item.uid == senderID);
            return message.reply(getLang("yourResult", findUser.stt, findUser.count));
        }
    },

    onReply: async function ({ message, event, Reply, commandName, api, threadsData, getLang, usersData }) {
        const { senderID, body, threadID } = event;
        const { author, splitPage, members, type } = Reply;
        if (author !== senderID) return;

        // Xử lý phân trang
        if (type === "page") {
            const page = parseInt(body);
            if (isNaN(page) || page < 1 || page > splitPage.totalPage) {
                return message.reply(getLang("invalidPage", splitPage.totalPage));
            }
            let msg = getLang("count");
            const arraySort = splitPage.allPage[page - 1];
            for (const item of arraySort) {
                msg += `\n🔰 ${item.name}\nSố: ${item.stt} - ${item.count} tin nhắn`;
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
        // Xử lý kick
        else if (type === "kick") {
            if (!members || !Array.isArray(members) || members.length === 0) {
                console.log("onReply kick error: Invalid members list", { members });
                return message.reply(getLang("emptyMemberList"));
            }

            const input = parseInt(body.trim());
            if (isNaN(input) || input < 1 || input > members.length) {
                return message.reply(getLang("invalidPage", members.length));
            }

            const user = members[input - 1];
            if (!user || !user.uid) {
                return message.reply(getLang("invalidPage", members.length));
            }

            const botID = api.getCurrentUserID();
            const adminIDs = await threadsData.get(threadID, "adminIDs");
            const isAdmin = adminIDs.includes(senderID);
            const userData = await usersData.get(senderID);
            const userRole = userData?.role || 0;

            if (!isAdmin && userRole < 1) {
                return message.reply(getLang("noPermission"));
            }

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

    onChat: async function ({ usersData, threadsData, event }) {
        const { senderID, threadID } = event;
        const members = await threadsData.get(threadID, "members");
        const findMember = members.find(user => user.userID === senderID);
        if (!findMember) {
            members.push({
                userID: senderID,
                name: await usersData.getName(senderID),
                nickname: null,
                inGroup: true,
                count: 1
            });
        } else {
            findMember.count = (findMember.count || 0) + 1;
        }
        await threadsData.set(threadID, members, "members");
    }
};
