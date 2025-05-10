const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "info",
    version: "1.6",
    author: "Dương Sú",
    countDown: 5,
    role: 0,
    shortDescription: "Quản lý thông tin người dùng",
    longDescription: "Thêm, sửa, xem thông tin cá nhân (tên, biệt danh, tuổi, sở thích, ảnh/video/GIF). Nhập 'cancel' để hủy, 'back' để quay lại bước trước.",
    category: "Tiện ích",
    guide: `{pn} add - Thêm thông tin cá nhân\n`
         + `{pn} name <tên> - Sửa tên\n`
         + `{pn} nickname <biệt danh> - Sửa biệt danh\n`
         + `{pn} age <tuổi/năm sinh> - Sửa tuổi\n`
         + `{pn} hobby <sở thích> - Sửa sở thích\n`
         + `{pn} file - Sửa ảnh/video/GIF (reply với file)\n`
         + `{pn} [@tag] - Xem thông tin người được tag\n`
         + `{pn} me - Xem thông tin bản thân\n`
         + `{pn} - Xem thông tin bản thân\n`
         + `Nhập 'cancel' để hủy, 'back' để quay lại bước trước khi đang thêm thông tin.`,
    packages: ["axios"]
  },

  onStart: async function ({ api, args, message, event, usersData }) {
    const { threadID, senderID, mentions, messageReply } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoDir)) {
      fs.mkdirSync(infoDir, { recursive: true });
    }

    let userInfo = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile)) : {};

    const superscriptMap = {
      0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵",
      6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹"
    };
    const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");

    try {
      if (args[0] === "add") {
        userInfo[senderID] = { ...userInfo[senderID], step: "name", prevSteps: [] };
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Nhập tên của bạn :3");
      } else if (args[0] === "name" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        const nameInput = args.slice(1).join(" ").trim();
        if (nameInput.length > 20 || nameInput.includes("\n")) {
          return message.reply("Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại");
        }
        userInfo[senderID].name = nameInput;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(`Đã sửa tên thành: ${nameInput}`);
      } else if (args[0] === "nickname" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        const nicknameInput = args.slice(1).join(" ").trim();
        userInfo[senderID].nickname = nicknameInput;
        const nicknameWithAge = `${nicknameInput} ${toSuperscript(userInfo[senderID].age)}`;
        try {
          await api.changeNickname(nicknameWithAge, threadID, senderID);
          userInfo[senderID].nickname = nicknameInput;
          fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
          return message.reply(`Đã sửa biệt danh thành: ${nicknameInput}\n🔰Đã đổi tên bạn thành: ${nicknameWithAge}`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(`⚠️Bị lỗi trong quá trình đổi tên\nĐã sửa biệt danh thành: ${nicknameInput}`);
        }
      } else if (args[0] === "age" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        let age;
        const inputAge = args[1].trim().toLowerCase();

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
            return message.reply("Năm sinh phải từ 1990 đến 2019:");
          }
        } else {
          age = parseInt(inputAge);
          if (isNaN(age) || age < 6 || age > 120) {
            return message.reply("Tuổi phải là số hợp lệ: ví dụ 18 hoặc 2006");
          }
        }

        userInfo[senderID].age = age;
        const nicknameWithAge = `${userInfo[senderID].nickname} ${toSuperscript(age)}`;
        try {
          await api.changeNickname(nicknameWithAge, threadID, senderID);
          fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
          return message.reply(`Đã sửa tuổi thành: ${age}\n🔰Đã đổi tên bạn thành: ${nicknameWithAge}`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(`⚠️Bị lỗi trong quá trình đổi tên\nĐã sửa tuổi thành: ${age}`);
        }
      } else if (args[0] === "hobby" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        const hobbyInput = args.slice(1).join(" ").trim();
        userInfo[senderID].hobby = hobbyInput;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(`Đã sửa sở thích thành: ${hobbyInput}`);
      } else if (args[0] === "file") {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        if (!messageReply || !messageReply.attachments || !messageReply.attachments[0]) {
          return message.reply("Vui lòng reply tin nhắn với một ảnh, video hoặc GIF (tối đa 14MB)!");
        }

        const attachment = messageReply.attachments[0];
        const validTypes = ["photo", "video", "animated_image"];
        if (!validTypes.includes(attachment.type)) {
          return message.reply("Vui lòng reply với một ảnh, video hoặc GIF!");
        }

        // Tải file để kiểm tra kích thước
        const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
        const fileSize = Buffer.from(response.data).length;
        const maxSize = 14 * 1024 * 1024; // 14MB

        if (fileSize > maxSize) {
          return message.reply("File vượt quá 14MB, vui lòng gửi file nhỏ hơn!");
        }

        // Xác định đuôi file
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

        // Xóa file cũ nếu có
        if (userInfo[senderID].attachment) {
          const oldFilePath = path.join(infoDir, userInfo[senderID].attachment);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        const filePath = path.join(infoDir, `${senderID}_${Date.now()}${ext}`);
        fs.writeFileSync(filePath, Buffer.from(response.data));

        userInfo[senderID].attachment = path.basename(filePath);
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Đã sửa file thành công!");
      } else if (args[0] === "me" || args.length === 0) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        const { name, nickname, age, hobby, attachment } = userInfo[senderID];
        const msg = `ℹ️Thông tin của bạn:\n`
                  + `⚜️Tên: ${name}\n`
                  + `⚜️Biệt danh: ${nickname}\n`
                  + `⚜️Tuổi: ${age}\n`
                  + `⚜️Sở thích: ${hobby}`;
        return api.sendMessage(
          { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
          threadID
        );
      } else if (Object.keys(mentions).length > 0) {
        const targetID = Object.keys(mentions)[0];
        if (!userInfo[targetID] || !userInfo[targetID].name) {
          return message.reply("Người dùng chưa điền thông tin!");
        }
        const { name, nickname, age, hobby, attachment } = userInfo[targetID];
        const msg = `ℹ️Thông tin của ${mentions[targetID].replace(/@/g, "")}:\n`
                  + `⚜️Tên: ${name}\n`
                  + `⚜️Biệt danh: ${nickname}\n`
                  + `⚜️Tuổi: ${age}\n`
                  + `⚜️Sở thích: ${hobby}`;
        return api.sendMessage(
          { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
          threadID
        );
      } else {
        return message.reply("Cú pháp không hợp lệ! Sử dụng `.info`, `.info me`, `.info @tag`, `.info add`, `.info name <tên>`, `.info nickname <biệt danh>`, `.info age <tuổi>`, `.info hobby <sở thích>`, hoặc `.info file` (reply với file).");
      }
    } catch (error) {
      console.error("Error in onStart:", error);
      return message.reply("Đã xảy ra lỗi, vui lòng thử lại sau!");
    }
  },

  onChat: async function ({ api, event, message, usersData }) {
    const { threadID, senderID, body } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoFile)) return;
    let userInfo = JSON.parse(fs.readFileSync(infoFile));

    if (!userInfo[senderID] || !userInfo[senderID].step) return;

    const step = userInfo[senderID].step;
    const input = body.trim().toLowerCase();

    const superscriptMap = {
      0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵",
      6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹"
    };
    const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");

    const stepsOrder = ["name", "nickname", "age", "hobby", "attachment"];
    const prompts = {
      name: "Nhập tên của bạn :3",
      nickname: "Biệt danh của bạn hoặc tên trong game là gì :b",
      age: "Vui lòng nhập năm sinh của bạn :>",
      hobby: "Sở thích của bạn là gì?",
      attachment: "Hãy gửi ảnh, video hoặc GIF (tối đa 14MB) để hoàn tất thông tin"
    };

    try {
      if (input === "cancel") {
        userInfo[senderID] = { ...userInfo[senderID], step: undefined, prevSteps: [] };
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Đã hủy quá trình điền thông tin!");
      }

      if (input === "back") {
        const prevSteps = userInfo[senderID].prevSteps || [];
        if (prevSteps.length === 0) {
          return message.reply("Bạn đang ở bước đầu tiên, không thể quay lại!");
        }
        const prevStep = prevSteps.pop();
        userInfo[senderID].step = prevStep;
        userInfo[senderID].prevSteps = prevSteps;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(prompts[prevStep]);
      }

      if (step === "name") {
        const nameInput = body.trim();
        if (nameInput.length > 20 || body.includes("\n")) {
          return message.reply("Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại");
        }
        userInfo[senderID].name = nameInput;
        userInfo[senderID].prevSteps = userInfo[senderID].prevSteps || [];
        userInfo[senderID].prevSteps.push(step);
        userInfo[senderID].step = "nickname";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Biệt danh của bạn hoặc tên trong game là gì :b");
      } else if (step === "nickname") {
        userInfo[senderID].nickname = body.trim();
        userInfo[senderID].prevSteps.push(step);
        userInfo[senderID].step = "age";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Vui lòng nhập năm sinh của bạn :>");
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
            return message.reply("Năm sinh phải từ 1990 đến 2019:");
          }
        } else {
          age = parseInt(inputAge);
          if (isNaN(age) || age < 6 || age > 120) {
            return message.reply("Tuổi phải là số hợp lệ: ví dụ 18 hoặc 2006");
          }
        }

        userInfo[senderID].age = age;
        userInfo[senderID].prevSteps.push(step);
        userInfo[senderID].step = "hobby";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Sở thích của bạn là gì?");
      } else if (step === "hobby") {
        userInfo[senderID].hobby = body.trim();
        userInfo[senderID].prevSteps.push(step);
        userInfo[senderID].step = "attachment";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Hãy gửi ảnh, video hoặc GIF (tối đa 14MB) để hoàn tất thông tin");
      } else if (step === "attachment") {
        if (!event.attachments || !event.attachments[0]) {
          return message.reply("Vui lòng gửi một ảnh, video hoặc GIF! Gửi lại hoặc nhập 'cancel' để hủy:");
        }

        const attachment = event.attachments[0];
        const validTypes = ["photo", "video", "animated_image"];
        if (!validTypes.includes(attachment.type)) {
          return message.reply("Vui lòng gửi một ảnh, video hoặc GIF! Gửi lại hoặc nhập 'cancel' để hủy:");
        }

        // Tải file để kiểm tra kích thước
        const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
        const fileSize = Buffer.from(response.data).length;
        const maxSize = 14 * 1024 * 1024; // 14MB

        if (fileSize > maxSize) {
          return message.reply("File vượt quá 14MB, vui lòng gửi file nhỏ hơn!");
        }

        // Xóa file cũ nếu có
        if (userInfo[senderID].attachment) {
          const oldFilePath = path.join(infoDir, userInfo[senderID].attachment);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        // Xác định đuôi file
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
        userInfo[senderID].step = undefined;
        userInfo[senderID].prevSteps = [];
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        const nicknameWithAge = `${userInfo[senderID].nickname} ${toSuperscript(userInfo[senderID].age)}`;
        try {
          await api.changeNickname(nicknameWithAge, threadID, senderID);
          return message.reply(`🔰Đã đổi tên bạn thành: ${nicknameWithAge}\n✅Bạn đã đăng ký thành công để xem thông tin gõ: \n .info me`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(`⚠️Bị lỗi trong quá trình đổi tên của bạn\n ✅Bạn đã đăng ký thành công để xem thông tin gõ: \n .info me`);
        }
      }
    } catch (error) {
      console.error("Error in onChat:", error);
      return message.reply("Đã xảy ra lỗi, vui lòng thử lại sau!");
    }
  }
};