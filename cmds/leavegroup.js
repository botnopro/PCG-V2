module.exports = {
  config: {
    name: "out",
    version: "1.0",
    author: "Dương Sú",
    countDown: 5,
    role: 2,
    shortDescription: {
      vi: "Rời khỏi nhóm hoặc tất cả nhóm",
      en: "Leave a group or all groups"
    },
    description: {
      vi: "Rời khỏi nhóm hoặc tất cả nhóm, lưu ý lệnh 'all' không bao gồm nhóm tin nhắn yêu cầu hoặc nhóm spam.",
      en: "Leave the group/all groups, note that 'all' will not include message request/spam groups."
    },
    category: "system",
    guide: {
      vi: "{pn} [groupID/all]",
      en: "{pn} [groupID/all]"
    }
  },

  langs: {
    vi: {
      noThreadToOut: "Không có nhóm nào để rời.",
      invalidThreadIDs: "ID nhóm không hợp lệ.",
      confirm: "Thả bất kỳ cảm xúc nào vào tin nhắn này để xác nhận.",
      moderator: "Quản trị Bot",
      out: "⚠️ THÔNG BÁO ⚠️\n\nBot đã được nhận lệnh rời khỏi nhóm!\nLiên hệ @tag để biết thêm chi tiết.",
      successOut: "Đã rời khỏi {0} nhóm.",
      failOut: "Không thể rời khỏi nhóm:\n{0}",
      error: "Đã có lỗi xảy ra, vui lòng thử lại sau."
    },
    en: {
      noThreadToOut: "There is no group to leave.",
      invalidThreadIDs: "Invalid group IDs.",
      confirm: "React with any emoji to confirm.",
      moderator: "Bot Moderator",
      out: "⚠️ NOTICE ⚠️\n\nBot has been ordered to leave the group!\nContact @tag for more details.",
      successOut: "Left {0} groups.",
      failOut: "Unable to leave group:\n{0}",
      error: "An error has occurred, please try again later."
    }
  },

  onStart: async function ({ api, args, message, event, usersData, getLang }) {
    try {
      const input = args[0]?.toLowerCase();
      const threadIDs = [];

      if (input === "all") {
        const threadList = (await api.getThreadList(100, null, ["INBOX"])) || [];
        const validThreads = threadList.filter(
          (thread) => thread.threadID !== event.threadID && thread.isGroup && thread.isSubscribed
        );

        if (validThreads.length === 0) {
          return message.reply(getLang("noThreadToOut"));
        }

        threadIDs.push(...validThreads.map((thread) => thread.threadID));
      } else if (args.length > 0) {
        const inputThreadIDs = args
          .map((threadID) => threadID.replace(/[^0-9]/g, ""))
          .filter((arg) => arg.length >= 16 && !isNaN(arg));

        if (inputThreadIDs.length === 0) {
          return message.reply(getLang("invalidThreadIDs"));
        }

        threadIDs.push(...inputThreadIDs);
      } else {
        threadIDs.push(event.threadID);
      }

      console.log("Saving reaction data:", { threadIDs, author: event.senderID });
      const reply = await message.reply(getLang("confirm"));
      global.GoatBot.onReaction.set(reply.messageID, {
        threadIDs,
        author: event.senderID,
        commandName: this.config.name
      });

      return;
    } catch (e) {
      console.error("Error in onStart:", e);
      return message.reply(getLang("error"));
    }
  },

  onReaction: async function ({ api, event, message, usersData, getLang, Reaction }) {
    try {
      console.log("Reaction event:", event);
      console.log("Reaction data:", Reaction);

      const { threadIDs, author } = Reaction || {};
      if (!threadIDs || event.userID !== author) return;

      // Lấy UID và tên admin từ author (người yêu cầu lệnh)
      const adminUID = author;
      const adminData = await usersData.get(adminUID);
      const adminName = adminData?.name || getLang("moderator");
      const messageBody = getLang("out").replace("@tag", `@${adminName}`);
      const fail = [];
      for (const targetThreadID of threadIDs) {
        await api.sendMessage(
          {
            body: messageBody,
            mentions: [{ tag: `@${adminName}`, id: adminUID }]
          },
          targetThreadID
        );
        const result = await new Promise((resolve) => {
          api.removeUserFromGroup(api.getCurrentUserID(), targetThreadID, (err) => {
            if (err) {
              console.error("Error removing from group:", err);
              return resolve(null);
            }
            resolve(true);
          });
        });

        if (result === null) fail.push(targetThreadID);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const successCount = threadIDs.length - fail.length;
      const sendTarget = fail.includes(event.threadID) ? author : null;

      await message.send(getLang("successOut", successCount), sendTarget);
      if (fail.length > 0) {
        await message.send(getLang("failOut", fail.join("\n")), sendTarget);
      }

      global.GoatBot.onReaction.delete(event.messageID);
    } catch (e) {
      console.error("Error in onReaction:", e);
      return message.send(getLang("error"));
    }
  }
};
