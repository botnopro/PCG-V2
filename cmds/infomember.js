const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "info",
    version: "1.7",
    author: "Dương Sú & Gemini",
    countDown: 5,
    role: 0,
    shortDescription: "Quản lý và xem thông tin người dùng",
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
  onStart: async function ({ api, args, message, event, usersData, global, Threads }) {
    const { threadID, senderID, mentions, messageReply } = event;
    const infoDir = path.join(__dirname, "../../info");
    const infoFile = path.join(infoDir, "info.json");

    if (!fs.existsSync(infoDir)) {
      fs.mkdirSync(infoDir, { recursive: true });
    }
    let userInfo = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile)) : {};
    const superscriptMap = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    const toSuperscript = (num) => String(num).split("").map(digit => superscriptMap[digit]).join("");
    const toBoldItalicSerif = (text) => {
      const charMap = {
  'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺',
  'H': '𝐻', 'I': '𝐼', 'J': '𝐽', 'K': '𝐾', 'L': '𝐿', 'M': '𝑀',
  'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆',
  'T': '𝑇', 'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍',
  'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔',
  'h': 'ℎ', 'i': '𝑖', 'j': '𝑗', 'k': '𝑘', 'l': '𝑙', 'm': '𝑚',
  'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠',
  't': '𝑡', 'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'ă': '𝑎̆', 'â': '𝑎̂', 'đ': '𝑑', 'ê': '𝑒̂', 'ô': '𝑜̂', 'ơ': '𝑜̛', 'ư': '𝑢̛',
  'á': '𝑎́', 'à': '𝑎̀', 'ả': '𝑎̉', 'ã': '𝑎̃', 'ạ': '𝑎̣',
  'ấ': '𝑎̂́', 'ầ': '𝑎̂̀', 'ẩ': '𝑎̂̉', 'ẫ': '𝑎̂̃', 'ậ': '𝑎̣̂',
  'ắ': '𝑎̆́', 'ằ': '𝑎̆̀', 'ẳ': '𝑎̆̉', 'ẵ': '𝑎̆̃', 'ặ': '𝑎̣̆',
  'é': '𝑒́', 'è': '𝑒̀', 'ẻ': '𝑒̉', 'ẽ': '𝑒̃', 'ẹ': '𝑒̣',
  'ế': '𝑒̂́', 'ề': '𝑒̂̀', 'ể': '𝑒̂̉', 'ễ': '𝑒̂̃', 'ệ': '𝑒̣̂',
  'ó': '𝑜́', 'ò': '𝑜̀', 'ỏ': '𝑜̉', 'õ': '𝑜̃', 'ọ': '𝑜̣',
  'ố': '𝑜̂́', 'ồ': '𝑜̂̀', 'ổ': '𝑜̂̉', 'ỗ': '𝑜̂̃', 'ộ': '𝑜̣̂',
  'ớ': '𝑜̛́', 'ờ': '𝑜̛̀', 'ở': '𝑜̛̉', 'ỡ': '𝑜̛̃', 'ợ': '𝑜̛̣',
  'ú': '𝑢́', 'ù': '𝑢̀', 'ủ': '𝑢̉', 'ũ': '𝑢̃', 'ụ': '𝑢̣',
  'ứ': '𝑢̛́', 'ừ': '𝑢̛̀', 'ử': '𝑢̛̉', 'ữ': '𝑢̛̃', 'ự': '𝑢̛̣',
  'ý': '𝑦́', 'ỳ': '𝑦̀', 'ỷ': '𝑦̉', 'ỹ': '𝑦̃', 'ỵ': '𝑦̣',
  ' ': ' ', '.': '.', ',': ',', '!': '!', '?': '?', ':': ':', '-': '-', '(': '(', ')': ')'
};
      return text.split("").map(char => charMap[char] || char).join("");
    };

    try {
      if (args[0] === "add") {
        userInfo[senderID] = { ...userInfo[senderID], step: "name", prevSteps: [] };
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Nhập tên của bạn :3");
      } 
      else if (args[0] === "name" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        const nameInput = args.slice(1).join(" ").trim();
        if (nameInput.length > 20 || nameInput.includes("\n")) return message.reply("Tên tối đa 20 ký tự và không được xuống dòng, vui lòng nhập lại");
        userInfo[senderID].name = nameInput;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(`Đã sửa tên thành: ${nameInput}`);
      } else if (args[0] === "nickname" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        const nicknameInput = args.slice(1).join(" ").trim();
        userInfo[senderID].nickname = nicknameInput;
        const nicknameWithAge = `${nicknameInput} ${toSuperscript(userInfo[senderID].age)}`;
        try {
          await api.changeNickname(nicknameWithAge, threadID, senderID);
          fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
          return message.reply(`Đã sửa biệt danh thành: ${nicknameInput}\n🔰Đã đổi tên bạn thành: ${nicknameWithAge}`);
        } catch (error) {
          console.error("Error changing nickname:", error);
          return message.reply(`⚠️Bị lỗi trong quá trình đổi tên\nĐã sửa biệt danh thành: ${nicknameInput}`);
        }
      } else if (args[0] === "age" && args[1]) {
        if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        let age;
        const inputAge = args[1].trim().toLowerCase();
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
        if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        const hobbyInput = args.slice(1).join(" ").trim();
        userInfo[senderID].hobby = hobbyInput;
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply(`Đã sửa sở thích thành: ${hobbyInput}`);
      } else if (args[0] === "file") {
        if (!userInfo[senderID] || !userInfo[senderID].name) return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        if (!messageReply || !messageReply.attachments || !messageReply.attachments[0]) return message.reply("Vui lòng reply tin nhắn với một ảnh, video hoặc GIF (tối đa 14MB)!");
        const attachment = messageReply.attachments[0];
        const validTypes = ["photo", "video", "animated_image"];
        if (!validTypes.includes(attachment.type)) return message.reply("Vui lòng reply với một ảnh, video hoặc GIF!");
        const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
        if (Buffer.from(response.data).length > 14 * 1024 * 1024) return message.reply("File vượt quá 14MB, vui lòng gửi file nhỏ hơn!");
        let ext;
        switch (attachment.type) { case "photo": ext = ".jpg"; break; case "video": ext = ".mp4"; break; case "animated_image": ext = ".gif"; break; }
        if (userInfo[senderID].attachment) {
          const oldFilePath = path.join(infoDir, userInfo[senderID].attachment);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        const filePath = path.join(infoDir, `${senderID}_${Date.now()}${ext}`);
        fs.writeFileSync(filePath, Buffer.from(response.data));
        userInfo[senderID].attachment = path.basename(filePath);
        fs.writeFileSync(infoFile, JSON.stringify(userInfo, null, 2));
        return message.reply("Đã sửa file thành công!");
      } 
      else if (args[0] === "me" || args.length === 0) {
        if (!userInfo[senderID] || !userInfo[senderID].name) {
          return message.reply("Bạn chưa điền thông tin! Vui lòng ghi .info add để đăng ký");
        }
        try {
          const { name, nickname, age, hobby, attachment } = userInfo[senderID];
          const fbInfo = await api.getUserInfo(senderID);
          const fbData = fbInfo[senderID];
          let genderText = (fbData.gender == 2) ? "Nam" : (fbData.gender == 1) ? "Nữ" : "Không xác định";
          let userRole = "Thành viên";
          if ((global.config.ADMINBOT || []).includes(senderID)) {
            userRole = "Admin Bot";
          } else {
            const threadInfo = await Threads.getData(threadID) || {};
            if ((threadInfo.adminIDs || []).some(admin => admin.id === senderID)) {
              userRole = "Quản trị viên";
            }
          }
          const friendStatus = fbData.isFriend ? "Đã kết bạn với Bot" : "Chưa kết bạn với Bot";
          const profileLink = fbData.profileUrl;
          const msg = `${toBoldItalicSerif("ℹ️Thông tin của bạn:")}\n`
                    + `${toBoldItalicSerif("⚜️Tên:")} ${name || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Biệt danh:")} ${nickname || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Tuổi:")} ${age || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Giới tính:")} ${genderText}\n`
                    + `${toBoldItalicSerif("⚜️Sở thích:")} ${hobby || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Chức vụ:")} ${userRole}\n`
                    + `${toBoldItalicSerif("⚜️Tình trạng:")} ${friendStatus}\n`
                    + `${toBoldItalicSerif("⚜️Link FB:")} ${profileLink}`;
          return api.sendMessage(
            { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
            threadID
          );
        } catch (apiError) {
          console.error("Lỗi khi lấy dữ liệu API cho '.info me':", apiError);
          return message.reply("Không thể lấy dữ liệu từ Facebook, vui lòng thử lại sau.");
        }
      } 
      else if (Object.keys(mentions).length > 0) {
        const targetID = Object.keys(mentions)[0];
        if (!userInfo[targetID] || !userInfo[targetID].name) {
          return message.reply("Người dùng chưa điền thông tin!");
        }
        try {
          const { name, nickname, age, hobby, attachment } = userInfo[targetID];
          const fbInfo = await api.getUserInfo(targetID);
          const fbData = fbInfo[targetID];
          let genderText = (fbData.gender == 2) ? "Nam" : (fbData.gender == 1) ? "Nữ" : "Không xác định";
          let userRole = "Thành viên";
          if ((global.config.ADMINBOT || []).includes(targetID)) {
            userRole = "Admin Bot";
          } else {
            const threadInfo = await Threads.getData(threadID) || {};
            if ((threadInfo.adminIDs || []).some(admin => admin.id === targetID)) {
              userRole = "Quản trị viên";
            }
          }
          const friendStatus = fbData.isFriend ? "Đã kết bạn với Bot" : "Chưa kết bạn với Bot";
          const profileLink = fbData.profileUrl;
          const msg = `${toBoldItalicSerif(`ℹ️Thông tin của ${mentions[targetID].replace(/@/g, "")}:`)}\n`
                    + `${toBoldItalicSerif("⚜️Tên:")} ${name || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Biệt danh:")} ${nickname || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Tuổi:")} ${age || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Giới tính:")} ${genderText}\n`
                    + `${toBoldItalicSerif("⚜️Sở thích:")} ${hobby || "Chưa có"}\n`
                    + `${toBoldItalicSerif("⚜️Chức vụ:")} ${userRole}\n`
                    + `${toBoldItalicSerif("⚜️Tình trạng:")} ${friendStatus}\n`
                    + `${toBoldItalicSerif("⚜️Link FB:")} ${profileLink}`;
          return api.sendMessage(
            { body: msg, attachment: attachment ? fs.createReadStream(path.join(infoDir, attachment)) : null },
            threadID
          );
        } catch (apiError) {
          console.error("Lỗi khi lấy dữ liệu API cho '.info @tag':", apiError);
          return message.reply("Không thể lấy dữ liệu từ Facebook cho người dùng này, vui lòng thử lại sau.");
        }
      } 
      else {
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
