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
    shortDescription: "Thêm thông tin người dùng",
    longDescription: "Thêm thông tin cá nhân (tên, biệt danh, tuổi, sở thích, ảnh/video/GIF).",
    category: "utility",
    guide: `{pn} add - Them thong tin ca nhan\n`
         + `{pn} [@tag] - Xem thong tin nguoi duoc tag\n`
         + `{pn} me - Xem thong tin ban than\n`
         + `{pn} - Xem thong tin ban than\n`
         + `Nhap 'cancel' de huy khi dang them thong tin.`,
    packages: ["axios"]
  },

  onStart: async function ({ api, args, message, event, usersData }) {
    const { threadID, senderID, mentions } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoDir)) {
      fs.mkdirSync(infoDir, { recursive: true });
    }

    let userInfo = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile)) : {};

    if (args[0] === "add") {
      // Chỉ đặt step mới, giữ nguyên dữ liệu cũ nếu có
      userInfo[senderID] = { ...userInfo[senderID], step: "name" };
      fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
      return message.reply("Nhập tên của bạn :3");
    } else if (args[0] === "me" || args.length === 0) {
      if (!userInfo[senderID] || !userInfo[senderID].name) {
        return message.reply("Bạn chưa điền thông tin! vui lòng ghi .info add để đăng kí");
      }
      const { name, nickname, age, hobby, attachment } = userInfo[senderID];
      const msg = `ℹ️𝐓𝐡𝐨̂𝐧𝐠 𝐭𝐢𝐧 𝐜𝐮̉𝐚 𝐛𝐚̣𝐧:\n`
                + `⚜️𝐓𝐞̂𝐧: ${name}\n`
                + `⚜️𝐁𝐢𝐞̣̂𝐭 𝐝𝐚𝐧𝐡: ${nickname}\n`
                + `⚜️𝐓𝐮𝐨̂̉𝐢: ${age}\n`
                + `⚜️𝐒𝐨̛̉ 𝐭𝐡𝐢́𝐜𝐡: ${hobby}`;
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
      const msg = `ℹ️𝐓𝐡𝐨̂𝐧𝐠 𝐭𝐢𝐧 𝐜𝐮̉𝐚 ${mentions[targetID].replace(/@/g, "")}:\n`
                + `⚜️𝐓𝐞̂𝐧: ${name}\n`
                + `⚜️𝐁𝐢𝐞̣̂𝐭 𝐝𝐚𝐧𝐡: ${nickname}\n`
                + `⚜️�	T𝐮𝐨̂̉𝐢: ${age}\n`
                + `⚜️𝐒𝐨̛̉ 𝐭𝐡𝐢́𝐜𝐡: ${hobby}`;
      return api.sendMessage(
        { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
        threadID
      );
    } else {
      return message.reply("Cú pháp không hợp lệ! Sử dụng `.info`, `.info me`, `.info @tag`, hoặc `.info add`.");
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

    if (input === "cancel") {
      // Chỉ xóa step, giữ nguyên dữ liệu đã điền
      userInfo[senderID] = { ...userInfo[senderID], step: undefined };
      fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
      return message.reply("Đã hủy quá trình điền thông tin!");
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
          return message.reply("Tên tối đa 20 kí tự và không được xuống dòng, vui lòng nhập lại");
        }
        userInfo[senderID].name = nameInput;
        userInfo[senderID].step = "nickname";
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Biệt danh của bạn hoặc tên trong game là gì :b");
      } else if (step === "nickname") {
        userInfo[senderID].nickname = body.trim();
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
          return message.reply(`🔰Đã đổi tên bạn thành: ${nicknameWithAge}\n✅Bạn đã đăng kí thành công để xem thông tin gõ: \n .info me`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(`⚠️Bị lỗi trong quá trình đổi tên của bạn\n ✅Bạn đã đăng kí thành công để xem thông tin gõ: \n .info me`);
        }
      }
    } catch (error) {
      console.error("Error in onChat:", error);
      return message.reply("Đã xảy ra lỗi, vui lòng thử lại sau!");
    }
  }
};