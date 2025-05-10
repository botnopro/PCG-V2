const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "info",
    version: "1.5",
    author: "Duong Su",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "Quản lý thông tin người dùng",
      en: "Manage user information"
    },
    longDescription: {
      vi: "Thêm hoặc xem thông tin cá nhân (tên, biệt danh, tuổi, sở thích, ảnh/video/GIF). Nhập 'cancel' để hủy quá trình.",
      en: "Add or view personal information (name, nickname, age, hobby, photo/video/GIF). Type 'cancel' to cancel the process."
    },
    category: "utility",
    guide: {
      vi: `{pn} add - Thêm thông tin cá nhân\n`
        + `{pn} [@tag] - Xem thông tin người được tag\n`
        + `{pn} me - Xem thông tin bản thân\n`
        + `{pn} - Xem thông tin bản thân\n`
        + `Nhập 'cancel' để hủy khi đang thêm thông tin.`,
      en: `{pn} add - Add personal information\n`
        + `{pn} [@tag] - View tagged user's information\n`
        + `{pn} me - View your information\n`
        + `{pn} - View your information\n`
        + `Type 'cancel' to cancel during the process.`
    },
    packages: ["axios"]
  },

  langs: {
    vi: {
      noInfo: "Bạn chưa điền thông tin! Vui lòng ghi {pn} add để đăng ký.",
      noInfoTarget: "Người dùng chưa điền thông tin!",
      invalidSyntax: "Cú pháp không hợp lệ! Sử dụng `{pn}`, `{pn} me`, `{pn} @tag`, hoặc `{pn} add`.",
      canceled: "Đã hủy quá trình điền thông tin!",
      nameTooLong: "Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại.",
      invalidAge: "Tuổi phải là số hợp lệ (6-120) hoặc năm sinh từ 1990 đến 2019.",
      invalidAttachment: "Vui lòng gửi một ảnh, video hoặc GIF (tối đa 14MB)! Gửi lại hoặc nhập 'cancel' để hủy.",
      fileTooLarge: "File vượt quá 14MB, vui lòng gửi file nhỏ hơn!",
      success: "✅ Đã đăng ký thông tin thành công!\nĐể xem thông tin, gõ: {pn} me",
      errorNickname: "⚠️ Lỗi khi đổi biệt danh, nhưng thông tin đã được lưu.",
      error: "Đã xảy ra lỗi, vui lòng thử lại sau!",
      userInfo: "ℹ️ Thông tin của {name}:\n"
              + "⚜️ Tên: {name}\n"
              + "⚜️ Biệt danh: {nickname}\n"
              + "⚜️ Tuổi: {age}\n"
              + "⚜️ Sở thích: {hobby}",
      prompt_name: "Nhập tên của bạn :3",
      prompt_nickname: "Biệt danh của bạn hoặc tên trong game là gì :b",
      prompt_age: "Vui lòng nhập năm sinh hoặc tuổi của bạn :>",
      prompt_hobby: "Sở thích của bạn là gì?",
      prompt_attachment: "Hãy gửi ảnh, video hoặc GIF (tối đa 14MB) để hoàn tất thông tin."
    },
    en: {
      noInfo: "You haven't filled in your information! Please use {pn} add to register.",
      noInfoTarget: "The user hasn't filled in their information!",
      invalidSyntax: "Invalid syntax! Use `{pn}`, `{pn} me`, `{pn} @tag`, or `{pn} add`.",
      canceled: "The information filling process has been canceled!",
      nameTooLong: "Name must be 20 characters or less and cannot contain newlines, please try again.",
      invalidAge: "Age must be a valid number (6-120) or birth year from 1990 to 2019.",
      invalidAttachment: "Please send a photo, video, or GIF (max 14MB)! Send again or type 'cancel' to cancel.",
      fileTooLarge: "File exceeds 14MB, please send a smaller file!",
      success: "✅ Successfully registered information!\nTo view your info, type: {pn} me",
      errorNickname: "⚠️ Error changing nickname, but your information has been saved.",
      error: "An error occurred, please try again later!",
      userInfo: "ℹ️ Information of {name}:\n"
              + "⚜️ Name: {name}\n"
              + "⚜️ Nickname: {nickname}\n"
              + "⚜️ Age: {age}\n"
              + "⚜️ Hobby: {hobby}",
      prompt_name: "Enter your name :3",
      prompt_nickname: "What's your nickname or in-game name? :b",
      prompt_age: "Please enter your birth year or age :>",
      prompt_hobby: "What are your hobbies?",
      prompt_attachment: "Please send a photo, video, or GIF (max 14MB) to complete your information."
    }
  },

  onStart: async function ({ api, args, message, event, usersData, getLang }) {
    const { threadID, senderID, mentions } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoDir)) {
      fs.mkdirSync(infoDir, { recursive: true });
    }

    let userInfo = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile)) : {};

    if (args[0] === "add") {
      userInfo[senderID] = { ...userInfo[senderID], step: "name" };
      fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
      return message.reply(getLang("prompt_name"));
    } else if (args[0] === "me" || args.length === 0) {
      if (!userInfo[senderID] || !userInfo[senderID].name) {
        return message.reply(getLang("noInfo"));
      }
      const { name, nickname, age, hobby, attachment } = userInfo[senderID];
      const msg = getLang("userInfo", { name, nickname, age, hobby });
      return api.sendMessage(
        { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
        threadID
      );
    } else if (Object.keys(mentions).length > 0) {
      const targetID = Object.keys(mentions)[0];
      if (!userInfo[targetID] || !userInfo[targetID].name) {
        return message.reply(getLang("noInfoTarget"));
      }
      const { name, nickname, age, hobby, attachment } = userInfo[targetID];
      const msg = getLang("userInfo", { name: mentions[targetID].replace(/@/g, ""), nickname, age, hobby });
      return api.sendMessage(
        { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
        threadID
      );
    } else {
      return message.reply(getLang("invalidSyntax"));
    }
  },

  onChat: async function ({ api, event, message, usersData, getLang }) {
    const { threadID, senderID, body } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoFile)) return;
    let userInfo = JSON.parse(fs.readFileSync(infoFile));

    if (!userInfo[senderID] || !userInfo[senderID].step) return;

    const step = userInfo[senderID].step;
    const input = body.trim().toLowerCase();

    if (input === "cancel") {
      userInfo[senderID] = { ...userInfo[senderID], step: undefined };
      fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
      return message.reply(getLang("canceled"));
    }

    const superscriptMap = {
      0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵",
      6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹"
    };
    const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");

    try {
      if (step === "name") {
        const nameInput = body.trim();
        if (nameInput.length > 20 || body.includes("\n")) {
          return message.reply(getLang("nameTooLong"));
        }
        userInfo[senderID].name = nameInput;
        userInfo[senderID].step = "nickname";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(getLang("prompt_nickname"));
      } else if (step === "nickname") {
        userInfo[senderID].nickname = body.trim();
        userInfo[senderID].step = "age";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(getLang("prompt_age"));
      } else if (step === "age") {
        let age;
        const inputAge = body.trim().toLowerCase();

        const yearMatch = inputAge.match(/^(2k|2k[0-1][0-9]?|19[9][0-9]|20[0-1][0-9])$/);
        if (yearMatch) {
          let year = inputAge;
          if (year.startsWith("2k")) {
            year = year === "2k" ? "2000" : `20${year.slice(2).padStart(2, "0")}`;
          } else if (year.match(/^(19|20)\d$/)) {
            year = year.padStart(4, "19");
          }
          year = parseInt(year);
          if (year >= 1990 && year <= 2019) {
            age = 2025 - year;
          } else {
            return message.reply(getLang("invalidAge"));
          }
        } else {
          age = parseInt(inputAge);
          if (isNaN(age) || age < 6 || age > 120) {
            return message.reply(getLang("invalidAge"));
          }
        }

        userInfo[senderID].age = age;
        userInfo[senderID].step = "hobby";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(getLang("prompt_hobby"));
      } else if (step === "hobby") {
        userInfo[senderID].hobby = body.trim();
        userInfo[senderID].step = "attachment";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(getLang("prompt_attachment"));
      } else if (step === "attachment") {
        if (!event.attachments || !event.attachments[0]) {
          return message.reply(getLang("invalidAttachment"));
        }

        const attachment = event.attachments[0];
        const validTypes = ["photo", "video", "animated_image"];
        if (!validTypes.includes(attachment.type)) {
          return message.reply(getLang("invalidAttachment"));
        }
        const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
        const fileSize = Buffer.from(response.data).length;
        const maxSize = 14 * 1024 * 1024; // 14MB

        if (fileSize > maxSize) {
          return message.reply(getLang("fileTooLarge"));
        }
        let ext;
        switch (attachment.type) {
          case "photo":
            ext = ".jpg";
            break;
          case "video":
            ext = ".mp4";
            break;
          case "animated_image":
            ext = ".gif";
            break;
        }

        const filePath = path.join(infoDir, `${senderID}_${Date.now()}${ext}`);
        fs.writeFileSync(filePath, Buffer.from(response.data));

        userInfo[senderID].attachment = path.basename(filePath);
        delete userInfo[senderID].step;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));

        const nicknameWithAge = `${userInfo[senderID].nickname} ${toSuperscript(userInfo[senderID].age)}`;
        try {
          await api.changeNickname(nicknameWithAge, threadID, senderID);
          return message.reply(getLang("success") + `\n🔰 Đã đổi biệt danh thành: ${nicknameWithAge}`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(getLang("success") + "\n" + getLang("errorNickname"));
        }
      }
    } catch (error) {
      console.error("Error in onChat:", error);
      return message.reply(getLang("error"));
    }
  }
};