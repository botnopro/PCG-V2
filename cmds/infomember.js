const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "info",
    version: "2.0.0",
    author: "Dương Sú & Gemini",
    countDown: 5,
    role: 0,
    shortDescription: "Quản lý và xem thông tin người dùng",
    longDescription: "Thêm, sửa, xem thông tin cá nhân. Lệnh sẽ luôn hiển thị thông tin đã lưu kể cả khi không thể lấy dữ liệu bổ sung từ Facebook.",
    category: "Tiện ích",
    guide: `{pn} add - Thêm thông tin cá nhân\n`
         + `{pn} name <tên> - Sửa tên\n`
         + `{pn} nickname <biệt danh> - Sửa biệt danh\n`
         + `{pn} age <tuổi/năm sinh> - Sửa tuổi\n`
         + `{pn} hobby <sở thích> - Sửa sở thích\n`
         + `{pn} file - Sửa ảnh/video/GIF (chỉ để lưu, không hiển thị khi xem info)\n`
         + `{pn} [@tag] - Xem thông tin người được tag\n`
         + `{pn} me - Xem thông tin bản thân\n`
         + `{pn} - Xem thông tin bản thân`,
    packages: ["axios"]
  },

  onStart: async function ({ api, args, message, event, usersData, global, Threads }) {
    const { threadID, senderID, mentions, messageReply } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoDir)) {
      fs.mkdirSync(infoDir, { recursive: true });
    }

    let userInfo = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile)) : {};
    
    const toBoldItalicSerif = (text) => {
      const charMap = {
        'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ', 'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘', 'h': '𝕙', 'i': '𝕚', 'j': '𝕛', 'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟', 'o': '𝕠', 'p': '𝕡', 'q': '𝕢', 'r': '𝕣', 's': '𝕤', 't': '𝕥', 'u': '𝕦', 'v': '𝕧', 'w': '𝕨', 'x': '𝕩', 'y': '𝕪', 'z': '𝕫', '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝', '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡', ' ': ' ', ':': ':', '-': '-', '.': '.', '!': '!', '?': '?', ',': ',', '(': '(', ')': ')', '⚜': '⚜', '️': '️', 'ℹ': 'ℹ'
      };
      return text.split("").map(char => charMap[char] || char).join("");
    };
    try {
      if (args[0] === "add" || (args[0] === "name" && args[1]) || (args[0] === "nickname" && args[1]) || (args[0] === "age" && args[1]) || (args[0] === "hobby" && args[1]) || args[0] === "file") {
        const superscriptMap = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
        const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");
        if (args[0] === "add") { userInfo[senderID] = { ...userInfo[senderID], step: "name", prevSteps: [] }; fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply("Nhập tên của bạn :3"); }
        if (args[0] === "name" && args[1]) { if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"); const nameInput = args.slice(1).join(" ").trim(); if (nameInput.length > 20 || nameInput.includes("\n")) return message.reply("Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại"); userInfo[senderID].name = nameInput; fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply(`Đã sửa tên thành: ${nameInput}`); }
        if (args[0] === "nickname" && args[1]) { if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"); const nicknameInput = args.slice(1).join(" ").trim(); userInfo[senderID].nickname = nicknameInput; const nicknameWithAge = `${nicknameInput} ${toSuperscript(userInfo[senderID].age)}`; try { await api.changeNickname(nicknameWithAge, threadID, senderID); fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply(`Đã sửa biệt danh thành: ${nicknameInput}\n🔰Đã đổi tên bạn thành: ${nicknameWithAge}`); } catch (error) { console.error("Error changing nickname:", error); return message.reply(`⚠️Bị lỗi trong quá trình đổi tên\nĐã sửa biệt danh thành: ${nicknameInput}`); } }
        if (args[0] === "age" && args[1]) { if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"); let age; const inputAge = args[1].trim().toLowerCase(); const yearMatch = inputAge.match(/^(2k|2k[0-1][0-9]?|19[9][0-9]|20[0-1][0-9])$/); if (yearMatch) { let year = inputAge; if (year.startsWith("2k")) year = year === "2k" ? "2000" : `20${year.slice(2).padStart(2, "0")}`; else if (year.match(/^(19|20)\d$/)) year = year.padStart(4, "19"); year = parseInt(year); if (year >= 1990 && year <= 2019) { age = new Date().getFullYear() - year; } else { return message.reply("Năm sinh phải từ 1990 đến 2019:"); } } else { age = parseInt(inputAge); if (isNaN(age) || age < 6 || age > 120) { return message.reply("Tuổi phải là số hợp lệ: ví dụ 18 hoặc 2006"); } } userInfo[senderID].age = age; const nicknameWithAge = `${userInfo[senderID].nickname} ${toSuperscript(age)}`; try { await api.changeNickname(nicknameWithAge, threadID, senderID); fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply(`Đã sửa tuổi thành: ${age}\n🔰Đã đổi tên bạn thành: ${nicknameWithAge}`); } catch (error) { console.error("Error changing nickname:", error); return message.reply(`⚠️Bị lỗi trong quá trình đổi tên\nĐã sửa tuổi thành: ${age}`); } }
        if (args[0] === "hobby" && args[1]) { if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"); const hobbyInput = args.slice(1).join(" ").trim(); userInfo[senderID].hobby = hobbyInput; fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply(`Đã sửa sở thích thành: ${hobbyInput}`); }
        if (args[0] === "file") { if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"); if (!messageReply || !messageReply.attachments || !messageReply.attachments[0]) return message.reply("Vui lòng reply tin nhắn với một ảnh, video hoặc GIF (tối đa 14MB)!"); const attachment = messageReply.attachments[0]; const validTypes = ["photo", "video", "animated_image"]; if (!validTypes.includes(attachment.type)) return message.reply("Vui lòng reply với một ảnh, video hoặc GIF!"); const response = await axios.get(attachment.url, { responseType: "arraybuffer" }); if (Buffer.from(response.data).length > 14 * 1024 * 1024) return message.reply("File vượt quá 14MB, vui lòng gửi file nhỏ hơn!"); let ext; switch (attachment.type) { case "photo": ext = ".jpg"; break; case "video": ext = ".mp4"; break; case "animated_image": ext = ".gif"; break; } if (userInfo[senderID].attachment) { const oldFilePath = path.join(infoDir, userInfo[senderID].attachment); if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath); } const filePath = path.join(infoDir, `${senderID}_${Date.now()}${ext}`); fs.writeFileSync(filePath, Buffer.from(response.data)); userInfo[senderID].attachment = path.basename(filePath); fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2)); return message.reply("Đã sửa file thành công!"); }
        return;
      }
      
      // LOGIC XEM INFO (BẮT ĐẦU TỪ ĐÂY)
      let targetID = senderID;
      let mentionName = "bạn";
      if (Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
        mentionName = mentions[targetID].replace(/@/g, "");
      }
      if (!userInfo[targetID] || !userInfo[targetID].name) {
        const replyMsg = (targetID === senderID) 
          ? "Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký"
          : "Người dùng này chưa điền thông tin!";
        return message.reply(replyMsg);
      }
      const { name, nickname, age, hobby } = userInfo[targetID];
      let genderText = "Không thể lấy";
      let userRole = "Không thể lấy";
      let friendStatus = "Không thể lấy";
      let profileLink = "Không thể lấy";
      try {
        const fbInfo = await api.getUserInfo(targetID);
        const fbData = fbInfo[targetID];
        if (fbData) {
            genderText = (fbData.gender == 2) ? "Nam" : (fbData.gender == 1) ? "Nữ" : "Không xác định";
            friendStatus = fbData.isFriend ? "Đã kết bạn với Bot" : "Chưa kết bạn với Bot";
            profileLink = fbData.profileUrl;

            // Lấy chức vụ
            if ((global.config.ADMINBOT || []).includes(targetID)) {
                userRole = "Admin Bot";
            } else {
                const threadInfo = await Threads.getData(threadID) || {};
                if ((threadInfo.adminIDs || []).some(admin => admin.id === targetID)) {
                    userRole = "Quản trị viên";
                } else {
                    userRole = "Thành viên";
                }
            }
        }
      } catch (apiError) {
        console.error(`[INFO COMMAND] Không thể lấy dữ liệu API cho ID: ${targetID}. Lỗi:`, apiError.message);
      }
      const intro = (targetID === senderID) ? "của bạn" : `của ${mentionName}`;
      const msg = `${toBoldItalicSerif(`ℹ️Thông tin ${intro}:`)}\n`
                + `${toBoldItalicSerif("⚜️Tên:")} ${name || "Chưa có"}\n`
                + `${toBoldItalicSerif("⚜️Biệt danh:")} ${nickname || "Chưa có"}\n`
                + `${toBoldItalicSerif("⚜️Tuổi:")} ${age || "Chưa có"}\n`
                + `${toBoldItalicSerif("⚜️Giới tính:")} ${genderText}\n`
                + `${toBoldItalicSerif("⚜️Sở thích:")} ${hobby || "Chưa có"}\n`
                + `${toBoldItalicSerif("⚜️Chức vụ:")} ${userRole}\n`
                + `${toBoldItalicSerif("⚜️Tình trạng:")} ${friendStatus}\n`
                + `${toBoldItalicSerif("⚜️Link FB:")} ${profileLink}`;
      return api.sendMessage(msg, threadID);

    } catch (error) {
      console.error("Error in onStart:", error);
      return message.reply("Đã xảy ra lỗi không xác định, vui lòng thử lại sau!");
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
    const superscriptMap = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");
    const prompts = { name: "Nhập tên của bạn :3", nickname: "Biệt danh của bạn hoặc tên trong game là gì :b", age: "Vui lòng nhập năm sinh của bạn :>", hobby: "Sở thích của bạn là gì?", attachment: "Hãy gửi ảnh, video hoặc GIF (tối đa 14MB) để hoàn tất thông tin" };
    try {
      if (input === "cancel") {
        userInfo[senderID] = { ...userInfo[senderID], step: undefined, prevSteps: [] };
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Đã hủy quá trình điền thông tin!");
      }
      if (input === "back") {
        const prevSteps = userInfo[senderID].prevSteps || [];
        if (prevSteps.length === 0) return message.reply("Bạn đang ở bước đầu tiên, không thể quay lại!");
        const prevStep = prevSteps.pop();
        userInfo[senderID].step = prevStep;
        userInfo[senderID].prevSteps = prevSteps;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(prompts[prevStep]);
      }
      if (step === "name") {
        const nameInput = body.trim();
        if (nameInput.length > 20 || body.includes("\n")) return message.reply("Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại");
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
          if (year.startsWith("2k")) year = year === "2k" ? "2000" : `20${year.slice(2).padStart(2, "0")}`;
          else if (year.match(/^(19|20)\d$/)) year = year.padStart(4, "19");
          year = parseInt(year);
          if (year >= 1990 && year <= 2019) age = new Date().getFullYear() - year;
          else return message.reply("Năm sinh phải từ 1990 đến 2019:");
        } else {
          age = parseInt(inputAge);
          if (isNaN(age) || age < 6 || age > 120) return message.reply("Tuổi phải là số hợp lệ: ví dụ 18 hoặc 2006");
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
        if (!event.attachments || !event.attachments[0]) return message.reply("Vui lòng gửi một ảnh, video hoặc GIF! Gửi lại hoặc nhập 'cancel' để hủy:");
        const attachment = event.attachments[0];
        const validTypes = ["photo", "video", "animated_image"];
        if (!validTypes.includes(attachment.type)) return message.reply("Vui lòng gửi một ảnh, video hoặc GIF! Gửi lại hoặc nhập 'cancel' để hủy:");
        const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
        if (Buffer.from(response.data).length > 14 * 1024 * 1024) return message.reply("File vượt quá 14MB, vui lòng gửi file nhỏ hơn!");
        if (userInfo[senderID].attachment) {
          const oldFilePath = path.join(infoDir, userInfo[senderID].attachment);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        let ext;
        switch (attachment.type) { case "photo": ext = ".jpg"; break; case "video": ext = ".mp4"; break; case "animated_image": ext = ".gif"; break; }
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
