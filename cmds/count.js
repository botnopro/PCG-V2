module.exports = {
	config: {
		name: "count",
		version: "1.7",
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
				+ "{pn} find <số>: Xem thành viên có ≤ <số> tin nhắn\n"
				+ "{pn} find 0: Tag thành viên chưa gửi tin nhắn",
			en: "{pn}: View your message count\n"
				+ "{pn} @tag: View message count of tagged people\n"
				+ "{pn} all: View message count of all members\n"
				+ "{pn} find <number>: View members with ≤ <number> messages\n"
				+ "{pn} find 0: Tag members who haven't sent messages"
		}
	},

	langs: {
		vi: {
			count: "Số tin nhắn của các thành viên:",
			page: "Trang [%1/%2]",
			reply: "Phản hồi tin nhắn này kèm số trang để xem tiếp",
			result: "%1 hạng %2 với %3 tin nhắn",
			yourResult: "Bạn đứng hạng %1 và đã gửi %2 tin nhắn trong nhóm này",
			invalidPage: "Số trang không hợp lệ",
			lowCount: "Thành viên có ≤ %1 tin nhắn:",
			zeroCount: "Thành viên chưa gửi tin nhắn: %1"
		},
		en: {
			count: "Number of messages of members:",
			page: "Page [%1/%2]",
			reply: "Reply with page number to view more",
			result: "%1 rank %2 with %3 messages",
			yourResult: "You are ranked %1 with %2 messages in this group",
			invalidPage: "Invalid page number",
			lowCount: "Members with ≤ %1 messages:",
			zeroCount: "Members who haven't sent messages: %1"
		}
	},

	onStart: async function ({ args, threadsData, message, event, api, commandName, getLang }) {
		const { threadID, senderID } = event;
		const threadData = await threadsData.get(threadID);
		const { members } = threadData;
		const usersInGroup = (await api.getThreadInfo(threadID)).participantIDs;
		let arraySort = [];
		for (const user of members) {
			if (!usersInGroup.includes(user.userID)) continue;
			const charac = "️️️️️️️️️️️️️️️️️";
			arraySort.push({
				name: user.name.includes(charac) ? `Uid: ${user.userID}` : user.name,
				count: user.count,
				uid: user.userID
			});
		}
		let stt = 1;
		arraySort.sort((a, b) => b.count - a.count);
		arraySort.map(item => item.stt = stt++);

		if (args[0]) {
			if (args[0].toLowerCase() == "all") {
				let msg = getLang("count");
				for (const item of arraySort) {
					if (item.count > 0) msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
				}
				if (msg.length > 19999) {
					msg = "";
					let page = parseInt(args[1]) || 1;
					const splitPage = global.utils.splitPage(arraySort, 50);
					arraySort = splitPage.allPage[page - 1];
					for (const item of arraySort) {
						if (item.count > 0) msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
					}
					msg += `\n${getLang("page", page, splitPage.totalPage)}\n${getLang("reply")}`;
					return message.reply(msg, (err, info) => {
						if (err) return message.err(err);
						global.GoatBot.onReply.set(info.messageID, { commandName, messageID: info.messageID, splitPage, author: senderID });
					});
				}
				message.reply(msg);
			}
			else if (args[0].toLowerCase() == "find") {
				const maxCount = parseInt(args[1]);
				if (isNaN(maxCount)) return message.reply("Vui lòng nhập số hợp lệ");
				if (maxCount === 0) {
					const zeroCount = arraySort.filter(item => item.count === 0);
					if (!zeroCount.length) return message.reply("Không có ai chưa gửi tin nhắn.");
					const mentions = zeroCount.map(item => ({ tag: `@${item.name}`, id: item.uid }));
					const msg = getLang("zeroCount", mentions.map(m => m.tag).join(", "));
					return message.reply({ body: msg, mentions });
				}
				let msg = getLang("lowCount", maxCount);
				const filtered = arraySort.filter(item => item.count <= maxCount);
				if (!filtered.length) msg += "\nKhông có ai có ≤ " + maxCount + " tin nhắn.";
				else for (const item of filtered) msg += `\n${item.name}: ${item.count}`;
				message.reply(msg);
			}
			else if (event.mentions) {
				let msg = "";
				for (const id in event.mentions) {
					const findUser = arraySort.find(item => item.uid == id);
					msg += `\n${getLang("result", findUser.name, findUser.stt, findUser.count)}`;
				}
				message.reply(msg);
			}
		}
		else {
			const findUser = arraySort.find(item => item.uid == senderID);
			return message.reply(getLang("yourResult", findUser.stt, findUser.count));
		}
	},

	onReply: ({ message, event, Reply, commandName, getLang }) => {
		const { senderID, body } = event;
		const { author, splitPage } = Reply;
		if (author != senderID) return;
		const page = parseInt(body);
		if (isNaN(page) || page < 1 || page > splitPage.totalPage) return message.reply(getLang("invalidPage"));
		let msg = getLang("count");
		const arraySort = splitPage.allPage[page - 1];
		for (const item of arraySort) {
			if (item.count > 0) msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
		}
		msg += `\n${getLang("page", page, splitPage.totalPage)}\n${getLang("reply")}`;
		message.reply(msg, (err, info) => {
			if (err) return message.err(err);
			message.unsend(Reply.messageID);
			global.GoatBot.onReply.set(info.messageID, { commandName, messageID: info.messageID, splitPage, author: senderID });
		});
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
		}
		else findMember.count += 1;
		await threadsData.set(threadID, members, "members");
	}
};
