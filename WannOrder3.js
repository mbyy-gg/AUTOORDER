const { Telegraf, Markup, session } = require("telegraf");
const axios = require("axios");
const fs = require("fs");
const cron = require('node-cron');
const path = require("path");
const qs = require("querystring");
const FormData = require("form-data");
const archiver = require("archiver");
const QRCode = require("qrcode");
const { Client } = require('ssh2');
const config = require("./config");
const { createdQris, cekStatus, toRupiah } = require("./lib/payment");
const { createCanvas, loadImage } = require('canvas');
const { Buffer } = require('buffer');
const moment = require('moment-timezone');
const { isTokenRegistered, OWNER_ID, TELEGRAM_BOT_TOKEN } = require('./ngapain');
const chalk = require('chalk');

const bot = new Telegraf(config.botToken);
bot.use(session({
    defaultSession: () => ({})
}));

function isPrivateChat(ctx) {
  return ctx.chat.type === 'private';
}

const globalNokos = {
  cachedServices: [],
  cachedCountries: {},
  lastServicePhoto: {},
  activeOrders: {}
};

// --- 1. KONFIGURASI WAJIB JOIN (HANYA USERNAME) ---
const REQUIRED_CHANNELS = [
    { id: '@seputarinfobotcoinalby' },
    { id: '@roompublicalbytzy' } // Ganti dengan username grup kamu
];

const hargaResellerVps = 100000;
const hargaAdminPanel = 10000;
const hargaResellerPanelLegal = 15000;
const hargaresellerPanelbiasa = 5000;
const hargaInstallPanel = 10000; 
// 2. LOGIKA PILIHAN ROLE (DINAMIS)
const ubotRoles = {
  "premium": { name: "Premium", price: 3000 }, 
  "seller": { name: "Selles Ubot", price: 5000 },
  "admin": { name: "Admin Ubot", price: 10000 }
};

async function requirePrivateChat(ctx, actionName) {
  if (!isPrivateChat(ctx)) {
    await ctx.answerCbQuery("❌ Perintah ini hanya bisa digunakan di Private Chat!", { show_alert: true });
    
    try {
      await ctx.reply("🚫 Fitur Tidak bisa Bisa Di Gunakan\n━━━━━━━━━━━━━━━━━━━━❍\n🚀 Hanya Bisa Di Gunakan Di\nPrivat Chat Bot!:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🤖 Chat Bot", url: `https://t.me/${bot.botInfo.username}` }]
          ]
        }
      });
    } catch (e) {}
    
    return false;
  }
  return true;
}

async function notifyOwnerNewUser(user) {
  try {
    const username = user.username ? `@${user.username}` : "-"
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim()
    const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    
    const users = loadUsers()
    const totalUsers = users.length

    const text = `<blockquote>` +
      `👤 <b>USER BARU TERDETEKSI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Nama :</b> ${name}\n` +
      `<b>Username :</b> ${username}\n` +
      `<b>ID :</b> <code>${user.id}</code>\n` +
      `<b>Waktu :</b> ${time}\n\n` +
      `📊 <b>Total User:</b> ${totalUsers}` +
      `</blockquote>`

    await bot.telegram.sendMessage(config.ownerId, text, { parse_mode: "HTML" })
  } catch (e) {
    console.log(`Error notifyOwner: ${e.message}`)
  }
}


global.subdomain = { 
    "storexyz.web.id": {
        zone: "6c8e7372366812fb4404f471ce6e8566",
        apitoken: "uTl_azdrB2b30hneCXvaXP0AfuMpMeFnzLHxrRN5"
    },
    "manhost.web.id": {
        zone: "ca3628f0e7c395c7c35e49b2f6b98869",
        apitoken: "SmaBNxRL8MKEiduNCbJ-VNSTsdHZ3wsHP_NEAGg0"
    },
    "ymzprivat.biz.id": {
        zone: "224d4a27f97d5895c8df248bd8d083bf",
        apitoken: "LhEpIRt1GG_CYUCGGxeQ7AkOELqy530vERBuvIN2"
    },
    "manhost.web.id": {
        zone: "ca3628f0e7c395c7c35e49b2f6b98869",
        apitoken: "SmaBNxRL8MKEiduNCbJ-VNSTsdHZ3wsHP_NEAGg0"
    },
    "ymzpterodactyl.biz.id": {
        zone: "c259026028b5a0a5cad9a4624a677f36", 
        apitoken: "iiRn_WvgI8inVMF2hJdDO06OvniBx9Hu1KF0IUJu"
    }, 
    "xyzraa.biz.id": {
        zone: "9fafb2671fa1a4f67a2044803e283780", 
        apitoken: "q54b8QI-LXyXkyGIW0W9MbcIsB6t558087L9to-Q"
    }, 
    "veyoradev.biz.id": {
        zone: "c03458c7996fa426258cb75be6d23716", 
        apitoken: "Lq9GCBQ6c5J1YuRm6DfymLuBUpXJJO1YN1zQlwJQ"
    }, 
    "kinzprivat.biz.id": {
     zone: "cfbff196cdd671efd6fcd2d8662f1028", 
     apitoken: "fmb9lwRjiEi_F5wPaEE3Ior5FgEA69SwyqvoupSj"
    },
    "myserverr.web.id": {
        zone: "2ebdbbf3d1edf834395d9596dd0e0d53",
        apitoken: "Yh87xMgv4zhQNOYZ49kBiVkM7Lf9DKmmm_xCrKP5"
    },
    "zonapanel.web.id": {
        zone: "b9acd64d7e7fa4cd2007139a8f2d4779", 
        apitoken: "G-Quh__J5ZpFi6NQSxbsySDVRko4gnZ3EhsvbNtX"
    }, 
    "hostsatoruu.biz.id": {
        zone: "30ea1aac05ca26dda61540e172f52ff4", 
        apitoken: "eZp1wNcc0Mj-btUQQ1cDIek2NZ6u1YW1Bxc2SB3z"
    },
    "antirusuhvvip.web.id": {
        zone: "22ad1338c3e1c8284d6d0559ea252db3",
        apitoken: "5V3cPFVlVq9GN1GRypddORenI9WTohsYYtZeiKDE"
    },
    "cyberpanel.web.id": {
        zone: "6bc7749cf7691424486e0b4edda5e021", 
        apitoken: "3fRXbZh0tlyIrwzklIONc-Fnvhkr65AQgMWQn0aE"
    },
    "hostingers-vvip.my.id": {
        zone: "2341ae01634b852230b7521af26c261f", 
        apitoken: "Ztw1ouD8_lJf-QzRecgmijjsDJODFU4b-y697lPw"
    }    
};

async function sendProductNotification(type, productData, addedBy) {
  try {
    if (!config.testimoniChannel || !config.testimoniChannel.trim()) {
      console.log("[INFO] Channel testimoni belum diatur di config.js");
      return;
    }

    const channel = config.testimoniChannel;
    
    // Format tanggal & waktu (Contoh: 27 Januari 2026, 07.56.40)
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/:/g, '.');
    const timestamp = `${dateStr}, ${timeStr}`;

    let message = "";
    let inlineKeyboard = [[{ text: "🛒 BELI SEKARANG", url: `https://t.me/${bot.botInfo.username}` }]];
    const photo = config.photosucces; 

    const escapeHTML = (text) => {
      if (!text) return "-";
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    const header = `🔔<b>STOK BARU TELAH DITAMBAHKAN</b>🔔\n<i>New Stock Notification</i>\n\n`;
    const footer = `\n────────────────────\n<b>SEGERA PESAN SEBELUM KEHABISAN 😊</b>\n\n<b>Order lewat bot »</b> @${bot.botInfo.username}`;

    if (type === "script") {
      message = header +
                `📦<b>TYPE:</b> 📁 SCRIPT\n` +
                `📛<b>NAME:</b> ${escapeHTML(productData.nama)}\n` +
                `💰<b>HARGA:</b> ${toRupiah(productData.harga)}\n` +
                `📄<b>FILE:</b> ${escapeHTML(productData.fileName || "-")}\n` +
                `👤<b>DI TAMBAHKAN OLEH:</b> ${escapeHTML(addedBy)}\n` +
                `🕒<b>WAKTU:</b> ${timestamp}` +
                footer;
    } 
    else if (type === "app") {
      // Urutan: TYPE, NAME, HARGA, FILE, DI TAMBAHKAN OLEH, WAKTU
      message = header +
                `📦<b>TYPE:</b> 💻 PRODUK LAINNYA\n` +
                `📛<b>NAME:</b> ${escapeHTML(productData.nama)}\n` +
                `💰<b>HARGA:</b> ${toRupiah(productData.harga)}\n` +
                `📄<b>FILE:</b> ${escapeHTML(productData.fileName || "-")}\n` +
                `👤<b>DI TAMBAHKAN OLEH:</b> ${escapeHTML(addedBy)}\n` +
                `🕒<b>WAKTU:</b> ${timestamp}` +
                footer;
    } 
    else if (type === "account") {
      // Urutan: UNTUK PRODUK, DESKRIPSI, STOK SEKARANG, DI TAMBAHKAN OLEH, WAKTU
      message = header +
                `📦<b>UNTUK PRODUK:</b> ${escapeHTML(productData.appName)}\n` +
                `📝<b>DESKRIPSI:</b> ${escapeHTML(productData.desc || "-")}\n` +
                `📊<b>STOK SEKARANG:</b> ${productData.newStock} akun\n` +
                `👤<b>DI TAMBAHKAN OLEH:</b> ${escapeHTML(addedBy)}\n` +
                `🕒<b>WAKTU:</b> ${timestamp}` +
                footer;
    }

    // Kirim Foto + Caption + Tombol Beli
    await bot.telegram.sendPhoto(channel, photo, {
      caption: message,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard }
    });

    console.log(`[SUCCESS] Notifikasi ${type} berhasil dikirim ke channel.`);
    
  } catch (error) {
    console.error("[ERROR] Gagal mengirim notifikasi:", error.message);
  }
}

// 1. Struktur Data Jadwal (Sesuai permintaan)
const jadwal = {
  Lampung: {
    subuh: '04:10',
    dhuha: '06:00',
    duhur: '11:52',
    ashar: '15:20',
    magrib: '17:59',
    isya: '19:15'
  },
  Jakarta: {
    subuh: '04:20',
    dhuha: '06:10',
    duhur: '12:05',
    ashar: '15:35',
    magrib: '18:05',
    isya: '19:22'
  }
};

const targetKota = "Lampung";
const pathUsers = './users.json';

// Quotes pendukung untuk template pesan
const quotes = {
  subuh: "Shalat subuh lebih baik daripada tidur.",
  duhur: "Tunaikanlah shalat saat matahari tergelincir.",
  ashar: "Jagalah shalat ashar agar amalanmu tidak terhapus.",
  magrib: "Segeralah berbuka dan tunaikan Magrib saat matahari terbenam.",
  isya: "Shalat Isya adalah cahaya di kegelapan malam."
};

// 2. Interval Pengecekan Otomatis
setInterval(async () => {
  const timeNow = moment().tz("Asia/Jakarta").format("HH:mm");
  const jadwalHariIni = jadwal[targetKota];

  if (!jadwalHariIni) return;

  for (let [sholat, waktu] of Object.entries(jadwalHariIni)) {
    if (timeNow === waktu) {
      
      // Load database user
      if (!fs.existsSync(pathUsers)) return console.log("❌ File users.json tidak ditemukan!");
      const userIds = JSON.parse(fs.readFileSync(pathUsers, 'utf8'));

      // Template Pesan Text (Sesuai permintaanmu)
      const pesanText = `🕌 <b>WAKTU SHOLAT ${sholat.toUpperCase()} TELAH TIBA</b>

<b>Saat waktu ${sholat} tiba, segeralah tunaikan kewajibanmu.</b>

⏰ <b>Waktu:</b> ${waktu} WIB
📍 <b>Wilayah:</b> ${targetKota} dan sekitarnya

<i>"${quotes[sholat] || 'Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.'}"</i>
(QS. Al-Ankabut: 45)

📚 <b>Keutamaan Sholat:</b>
• Mendapat pahala besar dari Allah
• Menjaga diri dari perbuatan maksiat
• Membersihkan hati dan pikiran
• Mendatangkan ketenangan jiwa

<b>Jangan tunda-tunda sholatmu! 🤲</b>
━━━━━━━━━━━━━━━━━━━━━━`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👑 Hubungi Owner", url: "https://t.me/albyy0x" }]
          ]
        }
      };

      console.log(`[AZAN] Mengirim notifikasi ${sholat} ke ${userIds.length} user...`);

      // Broadcast ke semua user
      for (const uid of userIds) {
        try {
          await bot.telegram.sendMessage(uid, pesanText, {
            parse_mode: "HTML",
            ...keyboard
          });
        } catch (e) {
          // Lewati jika user memblokir bot
        }
      }
      
      console.log(`✅ Notifikasi teks ${sholat} selesai dikirim.`);
      break; 
    }
  }
}, 60000);

// Variabel Panel
const jam = moment().tz('Asia/Jakarta').format('HH:mm:ss z');
const penghitung = moment().tz("Asia/Jakarta").format("dddd, D MMMM - YYYY");

async function getDropletStatus() {
  try {
    const apiKey = getDOApiKey();
    if (!apiKey || apiKey === "-") return null;

    // Ambil data akun dan droplet secara paralel
    const [accRes, dropletRes] = await Promise.all([
      fetch("https://api.digitalocean.com/v2/account", {
        headers: { Authorization: `Bearer ${apiKey}` }
      }),
      fetch("https://api.digitalocean.com/v2/droplets", {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
    ]);

    if (!accRes.ok || !dropletRes.ok) return null;

    const accData = await accRes.json();
    const drpData = await dropletRes.json();

    const limit = accData.account.droplet_limit;
    const used = drpData.droplets.length;

    return {
      email: accData.account.email || "Tidak ada",
      status: accData.account.status,
      limit: limit,
      used: used,
      remain: Math.max(0, limit - used)
    };
  } catch (e) {
    console.error("Error DigitalOcean API:", e.message);
    return null;
  }
}


// File saldo
const SALDO_DB = path.join(__dirname, 'database', 'saldo.json');

// ================= UTIL =================
function loadJSON(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file));
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


async function createVPSDroplet(userId, vpsData) {
  try {
    const apiDO = getDOApiKey();
    if (!apiDO) {
      return { success: false, msg: "API KEY DigitalOcean tidak ditemukan!" };
    }

    const sizeMap = {
      "2c2": "s-2vcpu-2gb-amd",
      "4c2": "s-2vcpu-4gb-amd",
      "8c4": "s-4vcpu-8gb-amd",
      "16c4": "s-4vcpu-16gb-amd",
      "16c8": "s-8vcpu-16gb-amd"
    };

    const size = sizeMap[vpsData.plan];
    if (!size) {
      return { success: false, msg: "PLAN VPS TIDAK VALID!" };
    }

    const osShort = (vpsData.osFamily || "ubuntu").toLowerCase();
    const regionShort = (vpsData.region || "sgp1").toLowerCase();
    const planShort = (vpsData.plan || "2c2").toLowerCase();
    const urut = String(Math.floor(Math.random() * 90) + 10);
    const hostname = `${osShort}-${planShort}-${regionShort}-${urut}`;
    const password = "Username" + size.replace(/s-|-/g, "").toUpperCase();

    const payload = {
      name: hostname,
      region: vpsData.region,
      size: size,
      image: vpsData.os,
      ipv6: true,
      backups: false,
      tags: ["Username -BuyVPS"],
      user_data: `#cloud-config
password: ${password}
chpasswd: { expire: False }`
    };

    console.log("Creating VPS with payload:", JSON.stringify(payload, null, 2));

    const resp = await axios.post("https://api.digitalocean.com/v2/droplets", payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiDO}`
      },
      timeout: 30000
    });

    if (resp.status !== 202) {
      return { success: false, msg: "Gagal membuat VPS: " + JSON.stringify(resp.data) };
    }

    const dropletId = resp.data.droplet.id;
    console.log(`VPS Created - ID: ${dropletId}, Hostname: ${hostname}`);

    await new Promise(r => setTimeout(r, 60000));

    const cek = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: { "Authorization": `Bearer ${apiDO}` },
      timeout: 10000
    });

    const dropletInfo = cek.data.droplet;
    const ip = dropletInfo?.networks?.v4?.[0]?.ip_address || "N/A";
    
    console.log(`VPS IP: ${ip}`);

    const vpsFolder = "./database";
    const vpsPath = `${vpsFolder}/data_vps.json`;

    if (!fs.existsSync(vpsFolder)) {
      fs.mkdirSync(vpsFolder, { recursive: true });
    }

    if (!fs.existsSync(vpsPath)) {
      fs.writeFileSync(vpsPath, JSON.stringify([], null, 2));
    }

    let vpsDB = [];
    try {
      vpsDB = JSON.parse(fs.readFileSync(vpsPath));
      if (!Array.isArray(vpsDB)) vpsDB = [];
    } catch (err) {
      vpsDB = [];
    }

    const created = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const paketInfo = {
      low: { garansi: 1, replace: 1 },
      medium: { garansi: 2, replace: 1 },
      high: { garansi: 3, replace: 1 }
    };

    const newVpsData = {
      userId: userId,
      username: vpsData.username || "-",
      hostname: hostname,
      ip: ip,
      password: password,
      region: vpsData.region,
      osFamily: vpsData.osFamily,
      os: vpsData.os,
      paket: vpsData.paket,
      plan: vpsData.plan,
      garansi: paketInfo[vpsData.paket]?.garansi || 7,
      replace: paketInfo[vpsData.paket]?.replace || 1,
      harga: vpsData.harga,
      dropletId: dropletId,
      created: created,
      penjual: bot.botInfo.username
    };

    vpsDB.push(newVpsData);
    fs.writeFileSync(vpsPath, JSON.stringify(vpsDB, null, 2));

    return {
      success: true,
      data: {
        hostname,
        ip,
        password,
        region: vpsData.region,
        os: vpsData.os,
        plan: vpsData.plan,
        garansi: paketInfo[vpsData.paket]?.garansi || 7,
        replace: paketInfo[vpsData.paket]?.replace || 1,
        created
      }
    };

  } catch (error) {
    console.error("Error creating VPS:", error);
    return { 
      success: false, 
      msg: error.response?.data?.message || error.message || "Unknown error" 
    };
  }
}







async function editMenuMessage(ctx, text, keyboard) {
  try {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      ...keyboard
    });
  } catch (e) {
    try {
      const newMsg = await safeReply(ctx, text, {
        parse_mode: "HTML",
        ...keyboard
      });
      
      try {
        if (ctx.callbackQuery) {
          await ctx.deleteMessage();
        }
      } catch (err) {}
      
      return newMsg;
    } catch (replyErr) {
      console.error("Edit menu error:", replyErr);
      return null;
    }
  }
}

async function editMenuMessageWithPhoto(ctx, photo, caption, keyboard) {
  try {
    await ctx.editMessageMedia({
      type: 'photo',
      media: photo,
      caption: caption,
      parse_mode: 'HTML'
    }, {
      parse_mode: "HTML",
      ...keyboard
    });
  } catch (e) {
    try {
      try {
        if (ctx.callbackQuery) {
          await ctx.deleteMessage();
        }
      } catch (err) {}
      
      await ctx.replyWithPhoto(photo, {
        caption: caption,
        parse_mode: "HTML",
        ...keyboard
      });
    } catch (replyErr) {
      console.error("Edit menu with photo error:", replyErr);
      return null;
    }
  }
}

async function safeSend(method, chatId, ...args) {
  try {
    return await bot.telegram[method](chatId, ...args);
  } catch (err) {
    const m = err?.response?.description || err?.description || err?.message || String(err);
    if (typeof m === 'string' && (m.toLowerCase().includes('user is deactivated') || m.toLowerCase().includes('bot was blocked') || m.toLowerCase().includes('blocked'))) {
      return null;
    }
    throw err;
  }
}

async function safeReply(ctx, text, extra = {}) {
  try {
    return await ctx.reply(text, extra);
  } catch (err) {
    const m = err?.response?.description || err?.description || err?.message || String(err);
    if (typeof m === 'string' && (m.toLowerCase().includes('user is deactivated') || m.toLowerCase().includes('bot was blocked') || m.toLowerCase().includes('blocked'))) {
      return null;
    }
    throw err;
  }
}

const USERS_DB = "./users.json";
const DB_PATH = "./database.json";
const MANUAL_PAYMENTS_DB = "./manual_payments.json";
const activeTransactions = {};
const userState = {};
const liveChatState = {};
const ownerReplyState = {};
const SMM_HISTORY_DB = "./database/smm_history.json";
const pathrasya = './database/produk.json';

function getSmmHistory(userId) {
  if (!fs.existsSync(SMM_HISTORY_DB)) fs.writeFileSync(SMM_HISTORY_DB, JSON.stringify({}));
  const db = JSON.parse(fs.readFileSync(SMM_HISTORY_DB));
  return db[userId] || [];
}

function saveSmmHistory(userId, orderData) {
  const db = JSON.parse(fs.readFileSync(SMM_HISTORY_DB));
  if (!db[userId]) db[userId] = [];
  db[userId].unshift(orderData); 
  fs.writeFileSync(SMM_HISTORY_DB, JSON.stringify(db, null, 2));
}

async function callSmmApi(path, params = {}) {
  try {
    const requestBody = {
        api_id: config.smm.apiId,
        api_key: config.smm.apiKey,
        ...params
    };

    const response = await axios.post(`${config.smm.baseUrl}${path}`, requestBody, {
        headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data;
  } catch (e) {
    console.error("SMM API Error:", e.message);
    return { status: false, msg: "Gagal connect ke server SMM" };
  }
}

let botStartTime = Date.now();

const TESTIMONI_CHANNEL = config.testimoniChannel || "";

async function createAndSendFullBackup(ctx = null, isAuto = false) {
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    .replace(/[\/:]/g, '-').replace(/, /g, '_');
  
  const backupName = `SC_FULL_${config.botName || 'Bot'}_${timestamp}.zip`;
  const backupPath = path.join(__dirname, backupName);
  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log(`[BACKUP] Memulai proses zip full SC...`);

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      try {
        const caption = isAuto 
          ? `♻️ <b>AUTO BACKUP SC</b>\n📅 ${timestamp}\n📦 Full Source Code (Tanpa node_modules)`
          : `📦 <b>BACKUP SOURCE CODE</b>\n📅 ${timestamp}\n✅ Full Folder Zip`;

        await bot.telegram.sendDocument(config.ownerId, {
          source: backupPath,
          filename: backupName
        }, { caption: caption, parse_mode: "HTML" });

        fs.unlinkSync(backupPath);
        if (ctx) await ctx.reply("✅ <b>Backup Full SC Terkirim!</b>", { parse_mode: "HTML" });
        resolve(true);
      } catch (err) {
        console.error("[BACKUP FAIL]", err);
        if (ctx) await ctx.reply("❌ Gagal kirim backup.");
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    archive.glob('**/*', {
      cwd: __dirname,
      ignore: [
        'node_modules/**', 
        '.git/**',
        'package-lock.json',
        '*.zip',
        'session/**'
      ]
    });

    archive.finalize();
  });
}

async function generateLocalQr(qrString) {
  try {
    return await QRCode.toBuffer(qrString, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error("QR Generate Error:", err);
    return null;
  }
}

async function sendStartInfoToChannel(user) {
  try {
    if (!TESTIMONI_CHANNEL) {
      console.log("[INFO] Channel testimoni belum diatur di config.js");
      return;
    }

    const cleanFirstName = cleanText(user.first_name || '');
    const cleanLastName = cleanText(user.last_name || '');
    const fullName = `${cleanFirstName} ${cleanLastName}`.trim();
    const username = user.username ? `@${user.username}` : '-';
    
    const now = new Date();
    const options = { 
      timeZone: 'Asia/Jakarta', 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const waktuWIB = now.toLocaleString('id-ID', options).replace(/\./g, ':');
    
    // PERBAIKAN TAG HTML DI SINI
    const startInfo = 
`<blockquote>𝗦𝗘𝗟𝗔𝗠𝗔𝗧 𝗗𝗔𝗧𝗔𝗡𝗚</blockquote>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
╭─ 👤 𝗜𝗡𝗙𝗢 𝗣𝗘𝗟𝗔𝗡𝗚𝗚𝗔𝗡
├ 🧑 𝗡𝗮𝗺𝗮: <b>${fullName}</b>
├ 🆔 𝗜𝗗: <code>${user.id}</code>
├ 📛 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: <b>${username}</b>
├ ⏰ 𝗪𝗮𝗸𝘁𝘂: <b>${waktuWIB}</b>
╰─
🏪 𝗦𝘁𝗼𝗿𝗲: <b>${config.botName || "Username AutoOrder"}</b>
💳 𝗣𝗮𝘆𝗺𝗲𝗻𝘁: <b>OTOMATIS & AMAN</b>
🖥️ 𝗣𝗮𝗻𝗲𝗹: <b>FAST • STABLE • 24/7</b>

<blockquote>📦 𝗟𝗮𝘆𝗮𝗻𝗮𝗻 𝗬𝗮𝗻𝗴 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮:</blockquote>
├ 🔹 <b><u>Panel Pterodactyl</u></b>
├ 🔹 <b><u>VPS Digitalocean</u></b>
╰ 🔹 <b><u>Layanan Digital Lainnya</u></b>
🔐 𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶 𝗔𝗺𝗮𝗻 • 𝗣𝗿𝗼𝘀𝗲𝘀 𝗖𝗲𝗽𝗮𝘁
✨ 𝗧𝗲𝗿𝗽𝗲𝗿𝗰𝗮𝘆𝗮 𝗥𝗶𝗯𝘂𝗮𝗻 𝗣𝗲𝗹𝗮𝗻𝗴𝗴𝗮𝗻`;

    await bot.telegram.sendMessage(TESTIMONI_CHANNEL, startInfo, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Beli Sekarang!", url: `https://t.me/${bot.botInfo.username}` }]
        ]
      }
    });

    console.log("[SUCCESS] Info start user baru berhasil dikirim ke channel");
  } catch (error) {
    console.error("[ERROR] Gagal mengirim info start ke channel:", error.message);
  }
}


function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\~/g, '\\~')
    .replace(/\`/g, '\\`')
    .replace(/\>/g, '\\>')
    .replace(/\#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/\=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/\!/g, '\\!')
    .trim();
}

/**
 * Mengambil jumlah saldo user dari database saldousers.json
 * @param {number|string} userId - ID Telegram user
 * @returns {number} - Jumlah saldo (default 0 jika tidak ada)
 */
function getSaldo(userId) {
  try {
    const dbPath = "./database/saldousers.json";
    
    // 1. Cek apakah file database ada
    if (!fs.existsSync(dbPath)) {
      return 0;
    }

    // 2. Baca file dan parse ke Object
    const data = fs.readFileSync(dbPath, "utf8");
    const saldoDB = JSON.parse(data);

    // 3. Kembalikan saldo user, pastikan formatnya Number
    return Number(saldoDB[userId]) || 0;
  } catch (error) {
    console.error("Error getSaldo:", error.message);
    return 0;
  }
}
function updateSaldo(userId, amount) {
  try {
    const dbPath = "./database/saldousers.json";
    const dir = "./database";

    // 1. Pastikan folder database ada
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 2. Baca file lama atau buat object baru jika belum ada
    let saldoDB = {};
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf8");
      saldoDB = JSON.parse(data);
    }

    // 3. Kalkulasi saldo baru (Saldo Lama + Nominal Baru)
    const currentSaldo = Number(saldoDB[userId]) || 0;
    const newSaldo = currentSaldo + amount;
    
    // Simpan ke object
    saldoDB[userId] = newSaldo;

    // 4. Tulis kembali ke file saldousers.json
    fs.writeFileSync(dbPath, JSON.stringify(saldoDB, null, 2));

    return newSaldo; // Mengembalikan angka saldo terbaru
  } catch (error) {
    console.error("Error updateSaldo:", error.message);
    return false;
  }
}

async function rumahOtpTransfer(nominal, config) {
  try {
    const reffId = `wd_rotp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const body = {
      api_key: config.RUMAHOTP,
      action: 'transfer',
      code: config.wd_balance.bank_code,
      target: config.wd_balance.destination_number,
      amount: parseInt(nominal),
      reff_id: reffId
    };

    const response = await axios.post("https://www.rumahotp.com/api/v2/h2h/transfer", qs.stringify(body), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!response.data || (response.data.success === false)) {
        throw new Error(response.data.message || "Gagal request ke API RumahOTP");
    }

    return response.data;
  } catch (error) {
    throw new Error(`Gagal WD RumahOTP: ${error.message}`);
  }
}

/**
 * Fungsi Helper untuk mengubah angka ke format Rupiah
 * Digunakan oleh createReceipt dan bagian lainnya.
 */
function rupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}


function createReceipt(input = {}) {
  const sanitize = v => String(v ?? "").replace(/[<>]/g, "").trim()

  const dashed = (ctx, x1, x2, y) => {
    ctx.save()
    ctx.setLineDash([6, 8])
    ctx.lineWidth = 2
    ctx.strokeStyle = "#bdbdbd"
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
    ctx.restore()
  }

  const wrap = (ctx, text, maxWidth) => {
    const words = String(text || "").split(/\s+/)
    const lines = []
    let line = ""
    for (const w of words) {
      const t = line ? line + " " + w : w
      if (ctx.measureText(t).width <= maxWidth) line = t
      else {
        if (line) lines.push(line)
        line = w
      }
    }
    if (line) lines.push(line)
    return lines
  }

  const drawBarcode = (ctx, x, y, w, h) => {
    ctx.fillStyle = "#fff"
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = "#111"
    const bars = 120
    const gap = w / bars
    for (let i = 0; i < bars; i++) {
      const tall = (i % 9 === 0 || i % 13 === 0) ? 0.92 : 0.62
      const bw = (i % 5 === 0) ? 3 : 2
      const bh = h * tall
      ctx.fillRect(x + i * gap, y + (h - bh) / 2, bw, bh)
    }
  }

  const now = new Date()
  const tanggal = sanitize(input.tanggal || now.toLocaleDateString("id-ID"))
  const jam = sanitize(input.jam || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))

  const nominal = Number(input.nominal || 0)
  const fee = Number(input.fee ?? 300)
  const total = nominal + fee

  const data = {
    trx: sanitize(input.trx || ("TRX-" + Date.now().toString().slice(-8))),
    status: sanitize(input.status || "BERHASIL"),
    metode: sanitize(input.metode || "QRIS (Pakasir)"),
    username: sanitize(input.username || "User"),
    userId: sanitize(input.userId || "-"),
    item: sanitize(input.item || "-"),
    nominal,
    fee,
    total,
    tanggal,
    jam
  }

  const W = 980
  const H = 1300
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#f2f2f2"
  ctx.fillRect(0, 0, W, H)

  const cardX = 60
  const cardY = 50
  const cardW = W - 120
  const cardH = H - 100
  const r = 26

  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.moveTo(cardX + r, cardY)
  ctx.lineTo(cardX + cardW - r, cardY)
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r)
  ctx.lineTo(cardX + cardW, cardY + cardH - r)
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH)
  ctx.lineTo(cardX + r, cardY + cardH)
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r)
  ctx.lineTo(cardX, cardY + r)
  ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY)
  ctx.closePath()
  ctx.fill()

  const pad = 54
  const L = cardX + pad
  const R = cardX + cardW - pad
  const colLabel = L
  const colMid = L + 250
  const colRight = R

  let y = cardY + 70

  ctx.textAlign = "center"
  ctx.fillStyle = "#111"
  ctx.font = "bold 52px serif"
  ctx.fillText("Auto Order", cardX + cardW / 2, y)
  y += 46

  ctx.font = "700 20px monospace"
  ctx.fillStyle = "#222"
  ctx.fillText("STRUK TRANSAKSI", cardX + cardW / 2, y)
  y += 34

  dashed(ctx, L, R, y)
  y += 52

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"

  const kv = (label, value) => {
    ctx.textAlign = "left"
    ctx.fillText(label, colLabel, y)
    ctx.textAlign = "right"
    ctx.fillText(value, colRight, y)
    y += 34
  }

  kv("NO TRX", data.trx)
  kv("STATUS", data.status)
  kv("TANGGAL", data.tanggal)
  kv("JAM", data.jam)

  y += 10
  dashed(ctx, L, R, y)
  y += 50

  ctx.textAlign = "left"
  ctx.font = "bold 20px monospace"
  ctx.fillStyle = "#111"
  ctx.fillText("INFORMASI PEMBELI", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"

  ctx.textAlign = "left"
  ctx.fillText("• Username :", colLabel, y)
  ctx.textAlign = "left"
  const uLines = wrap(ctx, data.username, (colRight - colMid) - 10)
  ctx.fillText(uLines[0] || "-", colMid, y)
  y += 36
  if (uLines[1]) {
    ctx.textAlign = "left"
    ctx.fillText(uLines[1], colMid, y)
    y += 36
  }

  ctx.textAlign = "left"
  ctx.fillText("• User ID", colLabel, y)
  ctx.textAlign = "left"
  ctx.fillText(data.userId, colMid, y)
  y += 42

  y += 6
  dashed(ctx, L, R, y)
  y += 50

  ctx.textAlign = "left"
  ctx.font = "bold 20px monospace"
  ctx.fillStyle = "#111"
  ctx.fillText("ITEM", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"
  ctx.textAlign = "left"
  ctx.fillText("• Nama", colLabel, y)
  ctx.textAlign = "left"
  const iLines = wrap(ctx, data.item, (colRight - colMid) - 10)
  ctx.fillText(iLines[0] || "-", colMid, y)
  y += 36
  if (iLines[1]) {
    ctx.textAlign = "left"
    ctx.fillText(iLines[1], colMid, y)
    y += 36
  }

  y += 10
  dashed(ctx, L, R, y)
  y += 50

  ctx.textAlign = "left"
  ctx.font = "bold 20px monospace"
  ctx.fillStyle = "#111"
  ctx.fillText("INFORMASI TRANSAKSI", colLabel, y)
  y += 42

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"

  const moneyRow = (left, amt) => {
    ctx.textAlign = "left"
    ctx.fillText("• " + left, colLabel, y)
    ctx.textAlign = "left"
    ctx.fillText(amt, colMid, y)
    ctx.textAlign = "right"
    ctx.fillText(amt, colRight, y)
    y += 36
  }

  moneyRow("Nominal", rupiah(data.nominal))
  moneyRow("Biaya Admin", rupiah(data.fee))
  moneyRow("Total Bayar", rupiah(data.total))

  y += 10
  dashed(ctx, L, R, y)
  y += 46

  ctx.font = "700 18px monospace"
  ctx.fillStyle = "#111"

  ctx.textAlign = "left"
  ctx.fillText("Metode", colLabel, y)
  ctx.textAlign = "left"
  ctx.fillText(data.metode, colMid, y)
  ctx.textAlign = "right"
  ctx.fillText(data.trx, colRight, y)
  y += 36

  ctx.textAlign = "left"
  ctx.fillText("Status", colLabel, y)
  ctx.textAlign = "left"
  ctx.fillText(data.status, colMid, y)
  ctx.textAlign = "right"
  ctx.fillText(data.trx, colRight, y)
  y += 36

  y += 14
  dashed(ctx, L, R, y)
  y += 56

  const barX = L + 10
  const barW = (R - L) - 20
  const barH = 120
  drawBarcode(ctx, barX, y, barW, barH)
  y += barH + 60

  ctx.textAlign = "center"
  ctx.fillStyle = "#111"
  ctx.font = "700 22px monospace"
  ctx.fillText("Terima kasih sudah melakukan order - @albyy0x", cardX + cardW / 2, y)
  y += 36
  ctx.fillStyle = "#555"
  ctx.font = "600 18px monospace"
  ctx.fillText("Simpan struk ini sebagai bukti transaksi.", cardX + cardW / 2, y)

  return canvas.toBuffer("image/png")
}

// FUNGSI UTAMA
// 1. Fungsi untuk generate ID Transaksi Custom
function generateTrxId() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Username-${result}`;
}

async function sendTestimoniKeChannel(userName, userId, productName, amount) {
  try {
    if (!config.testimoniChannel) return;

    // Generate ID sesuai permintaan
    const idTransaksi = generateTrxId();

    const fee = 300; 
    const total = amount + fee;
    const now = new Date();
    
    const inputStruk = {
      username: userName,
      userId: userId,
      item: productName,
      nominal: amount,
      fee: fee,
      trx: idTransaksi,
      // UBAH: Sekarang hanya QRIS saja
      metode: "QRIS", 
      status: "BERHASIL",
      tanggal: now.toLocaleDateString("id-ID"),
      jam: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };

    const receiptBuffer = await createReceipt(inputStruk);

    const captionText = 
      `<blockquote><b>🔔 NOTIFIKASI TRANSAKSI SUCCESS</b>\n\n` +
      `<b>Pembeli</b>\n` +
      `└ Username: ${userName}\n` +
      `└ User ID: <code>${userId}</code>\n\n` +
      `<b>Membeli</b>\n` +
      `└ Item: ${productName}\n\n` +
      `<b>Transaksi</b>\n` +
      `└ Nominal: ${toRupiah(amount)}\n` +
      `└ Biaya Admin: ${toRupiah(fee)}\n` +
      `└ Total: <b>${toRupiah(total)}</b>\n` +
      `└ Metode: ${inputStruk.metode}\n` + // Mengambil dari inputStruk.metode ("QRIS")
      `└ Order ID: <code>${idTransaksi}</code>\n` +
      `└ Status: Success</blockquote>`;

    await bot.telegram.sendPhoto(config.testimoniChannel, { source: receiptBuffer }, {
      caption: captionText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 𝗕𝗘𝗟𝗜 𝗟𝗔𝗚𝗜", url: `https://t.me/${bot.botInfo.username}` }]
        ]
      }
    });

    console.log(`[SUCCESS] Testimoni ${idTransaksi} terkirim.`);
  } catch (error) {
    console.error("[ERROR] Testimoni Gagal:", error.message);
  }
}


async function sendtestivps(
  userId,
  produk,
  spesifikasi,
  tipePaket,
  harga,
  metodePembayaran
) {
  try {
    if (!TESTIMONI_CHANNEL) return;

    const caption = `
🔥 <b>Transaksi VPS Selesai Dilakukan</b>
━━━━━━━━━━━━━━━━

🆔 <b>ID PEMBELI</b> : <code>${userId}</code>
🛍️ <b>PRODUK</b> : ${produk}
📦 <b>SPESIFIKASI</b> : ${spesifikasi}
📊 <b>TYPE PAKET</b> : ${tipePaket}
💰 <b>HARGA</b> : ${toRupiah(harga)}
🏦 <b>PEMBAYARAN</b> : ${metodePembayaran}
🧾 <b>TOTAL</b> : ${toRupiah(harga)}

<b>Terimakasih telah mempercayai layanan kami
😊 Senang bertransaksi dengan anda</b>
━━━━━━━━━━━━━━━━
⚠️ <i>Untuk membeli VPS secara otomatis silahkan klik tombol dibawah ini</i>
`;

    await bot.telegram.sendPhoto(
      TESTIMONI_CHANNEL,
      config.buyvpsinfofoto,
      {
        caption,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛒 𝗕𝗨𝗬 𝗩𝗣𝗦",
                url: `https://t.me/${bot.botInfo.username}`
              }
            ]
          ]
        }
      }
    );

    console.log("[SUCCESS] Testimoni VPS terkirim");
  } catch (err) {
    console.log("[ERROR] Send testimoni gagal:", err.message);
  }
}


function readManualPayments() {
  if (!fs.existsSync(MANUAL_PAYMENTS_DB)) {
    fs.writeFileSync(MANUAL_PAYMENTS_DB, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(MANUAL_PAYMENTS_DB));
}

function saveManualPayments(data) {
  fs.writeFileSync(MANUAL_PAYMENTS_DB, JSON.stringify(data, null, 2));
}

function getBotStats() {
  try {
    const users = loadUsers();
    const totalUsers = users.length;

    const uptime = Date.now() - botStartTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalUsers,
      runtime: `${days}d ${hours}h ${minutes}m`,
      botName: config.botName || "BOT TELEGRAM",
      ownerName: config.ownerName || "Owner",
      backupCount: "Auto" 
    };
  } catch (e) {
    return {
      totalUsers: "Error",
      runtime: "Unknown",
      botName: config.botName || "BOT TELEGRAM",
      ownerName: config.ownerName || "Owner",
      backupCount: "-"
    };
  }
}

function formatUserCard(ctx, msg) {
  const username = ctx.from.username ? `@${ctx.from.username}` : '-';
  return `<b>📩 𝐏𝐞𝐬𝐚𝐧 𝐝𝐚𝐫𝐢 𝐮𝐬𝐞𝐫</b>\n<b>Username :</b> ${username}\n<b>ID User :</b> ${ctx.from.id}\n\n<b>Pesan :</b>\n${msg}`;
}

bot.on("document", async (ctx, next) => {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (state?.step === "WAITING_SCRIPT_FILE" && userId === config.ownerId) {
    const doc = ctx.message.document;

    if (!doc.file_name.endsWith(".zip"))
      return safeReply(ctx, "<blockquote>❌ File harus format .zip!</blockquote>", { parse_mode: "HTML" });

    userState[userId] = {
      step: "WAITING_SCRIPT_DETAIL",
      file_id: doc.file_id,
      temp_fileName: doc.file_name.replace(/\s/g, "_"),
    };

    return safeReply(ctx, `<blockquote>✅ <b>File diterima!</b>\n<b>Kirim detail:</b>\nNama | Harga | Deskripsi</blockquote>`, { parse_mode: "HTML" });
  }

  return next();
});

const DO_DB_PATH = path.join(__dirname, "database/akundo.json");

function loadDOAccounts() {
  if (!fs.existsSync(DO_DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DO_DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveDOAccounts(accounts) {
  try {
    fs.writeFileSync(DO_DB_PATH, JSON.stringify(accounts, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal simpan DO DB:", e.message);
  }
}

let doAccounts = loadDOAccounts();
let botUsername = "";
bot.telegram.getMe().then((me) => { botUsername = me.username; });

bot.action("add_akun_do", async (ctx) => {
  const userId = ctx.from.id;
  
  // 1. Cek apakah yang klik benar-benar owner
  if (userId !== Number(config.ownerId)) {
    return ctx.answerCbQuery("❌ Akses ditolak! Khusus Owner.", { show_alert: true });
  }

  try {
    // 2. Set state user ke mode menunggu input akun DO
    userState[userId] = { step: "WAITING_ADD_DO" };

    // 3. Ubah pesan atau kirim pesan baru berisi instruksi
    const instruksi = 
      "<b>📥 INPUT DATA AKUN DIGITALOCEAN</b>\n\n" +
      "Silakan kirim data akun dengan format berikut:\n" +
      "<code>email | password | auth | link login | price | nama produk</code>\n\n" +
      "<blockquote><b>Contoh:</b>\n" +
      "user@mail.com | pass123 | 2FA123 | https://cloud.digitalocean.com/login | 50000 | DO 100$</blockquote>\n\n" +
      "<i>💡 Tips: Kamu bisa kirim banyak akun sekaligus (satu akun per baris).</i>\n" +
      "────────────────────\n" +
      "Ketik /cancel untuk membatalkan.";

    await ctx.editMessageText(instruksi, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Batal", "menu_owner")]
      ])
    });

    return ctx.answerCbQuery();
  } catch (e) {
    console.error(e);
    ctx.reply("❌ Terjadi kesalahan saat memulai input.");
  }
});

bot.action("del_akun_do", async (ctx) => {
  if (ctx.from.id !== Number(config.ownerId)) return ctx.answerCbQuery("❌ Akses ditolak.");
  
  // Ambil hanya akun yang belum terpakai (atau semua, tergantung kebutuhanmu)
  // Di sini saya asumsikan menampilkan akun yang belum terjual saja
  const available = doAccounts.filter(acc => !acc.used);

  if (available.length === 0) {
    return ctx.editMessageText(
      "<blockquote>❌ <b>Belum ada stok akun DO yang tersedia.</b></blockquote>", 
      { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) }
    );
  }

  // Buat tombol list berdasarkan email. 
  // Kita simpan index asli dari array doAccounts agar akurat saat dihapus.
  const buttons = doAccounts.map((acc, i) => {
    // Hanya tampilkan tombol jika akun belum digunakan
    if (!acc.used) {
      return [Markup.button.callback(`🗑️ ${acc.email} (${acc.product})`, `confirm_del_do_${i}`)];
    }
    return null;
  }).filter(Boolean); // Hapus baris yang null

  buttons.push([Markup.button.callback("🔙 Kembali", "menu_owner")]);

  await ctx.editMessageText("<blockquote><b>🗑️ Pilih akun DO yang ingin dihapus dari database:</b></blockquote>", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(buttons)
  }).catch(() => {});
});

bot.action(/confirm_del_do_(\d+)/, async (ctx) => {
  if (ctx.from.id !== Number(config.ownerId)) return ctx.answerCbQuery("❌ Akses ditolak.");

  try {
    const idx = parseInt(ctx.match[1]);
    const targetAcc = doAccounts[idx];

    if (!targetAcc) {
      return ctx.answerCbQuery("❌ Akun tidak ditemukan atau sudah terhapus.");
    }

    // Proses hapus dari array
    const removed = doAccounts.splice(idx, 1)[0];
    
    // Simpan ke file JSON
    saveDOAccounts(doAccounts);

    await ctx.answerCbQuery(`✅ Berhasil menghapus ${removed.email}`);
    
    // Kirim konfirmasi teks
    await ctx.editMessageText(
      `<blockquote><b>✔️ Akun DO Berhasil Dihapus</b>\n\n` +
      `<b>📧 Email:</b> <code>${removed.email}</code>\n` +
      `<b>🖥️ Produk:</b> ${removed.product}</blockquote>`, 
      { 
        parse_mode: "HTML", 
        ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali ke List", "del_akun_do")]]) 
      }
    ).catch(() => {
      ctx.reply("✅ Akun berhasil dihapus.");
    });

  } catch (e) {
    console.error("del_do error:", e);
    ctx.answerCbQuery("❌ Terjadi kesalahan.");
  }
});



bot.command("listakun", async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== Number(config.ownerId)) return ctx.reply("❌ Hanya owner yang bisa melihat daftar akun DO.");

  if (!doAccounts.length) return ctx.reply("📭 Database akun DO kosong.");

  let msgText = `🖥️ *DAFTAR AKUN DIGITALOCEAN*\n─────────────────────────\n`;
  doAccounts.forEach((acc, i) => {
    msgText += `🔹 Akun ${i + 1}\n`;
    msgText += `📧 Email   : ${acc.email}\n`;
    msgText += `🔑 Password: ${acc.password}\n`;
    msgText += `🛡️ Auth   : ${acc.auth}\n`;
    msgText += `💰 Harga   : ${toRupiah(acc.price)}\n`;
    msgText += `📌 Status  : ${acc.used ? "Terpakai" : "Tersedia"}\n`;
    msgText += `─────────────────────────\n`;
  });

  ctx.reply(msgText, { parse_mode: "Markdown" });
});

bot.command("pesan", async (ctx) => {
  const raw = ctx.message.text || "";
  const msg = raw.replace(/^\/pesan(@\w+)?\s*/i, "").trim();

  if (!msg) {
    liveChatState[ctx.from.id] = { step: "WAITING_MESSAGE" };
    return safeReply(ctx, "📝 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗲𝘁𝗶𝗸 𝗣𝗲𝘀𝗮𝗻 𝗔𝗻𝗱𝗮 𝗨𝗻𝘁𝘂𝗸 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 𝗞𝗲 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>\n❌ 𝗞𝗲𝘁𝗶𝗸 /batal 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗣𝗲𝘀𝗮𝗻", { parse_mode: "HTML" });
  }

  return sendToOwner(ctx, msg);
});

bot.command("batal", (ctx) => {
  if (liveChatState[ctx.from.id]?.step === "WAITING_MESSAGE") {
    delete liveChatState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗣𝗲𝗻𝗴𝗶𝗿𝗶𝗺𝗮𝗻 𝗣𝗲𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.");
  }
  if (ownerReplyState[ctx.from.id]) {
    delete ownerReplyState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗠𝗼𝗱𝗲 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗢𝘄𝗻𝗲𝗿 𝗗𝗶𝗵𝗲𝗻𝘁𝗶𝗸𝗮𝗻.");
  }
  if (userState[ctx.from.id]?.step === "WAITING_BROADCAST" && ctx.from.id === config.ownerId) {
    delete userState[ctx.from.id];
    return safeReply(ctx, "❌ 𝗕𝗿𝗼𝗮𝗱𝗰𝗮𝘀𝘁 𝗗𝗶𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.");
  }
  return; 
});

bot.on("text", async (ctx, next) => {
  try {
    const st = liveChatState[ctx.from.id];
    if (st && st.step === "WAITING_MESSAGE") {
      const text = ctx.message.text;
      delete liveChatState[ctx.from.id];
      return await sendToOwner(ctx, text);
    }
  } catch (e) {}
  return next();
});

async function sendToOwner(ctx, messageText) {
  try {
    const owner = config.ownerId;
    const layout = formatUserCard(ctx, messageText);
    await bot.telegram.sendMessage(owner, layout, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📨 𝗕𝗮𝗹𝗮𝘀 𝗣𝗲𝘀𝗮𝗻 𝗨𝘀𝗲𝗿", callback_data: `reply_${ctx.from.id}` }]
        ]
      }
    });
    await safeReply(ctx, "✅ <b>𝗣𝗲𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗗𝗶𝗸𝗶𝗿𝗶𝗺𝗸𝗮𝗻 𝗞𝗲𝗽𝗮𝗱𝗮 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", { parse_mode: "HTML" });
  } catch (err) {
    return safeReply(ctx, "❌ 𝗣𝗲𝗻𝗴𝗶𝗿𝗶𝗺𝗮𝗻 𝗣𝗲𝘀𝗮𝗻 𝗚𝗮𝗴𝗮𝗹, 𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗘𝗿𝗿𝗼𝗿 𝗦𝗶𝘀𝘁𝗲𝗺.");
  }
}

bot.action(/reply_(\d+)/, async (ctx) => {
  try {
    if (String(ctx.from.id) !== String(config.ownerId)) {
      await ctx.answerCbQuery("❌ 𝗛𝗮𝗻𝘆𝗮 𝗢𝘄𝗻𝗲𝗿 𝗦𝗮𝗷𝗮 𝗬𝗮𝗻𝗴 𝗕𝗶𝘀𝗮 𝗠𝗲𝗺𝗯𝗮𝗹𝗮𝘀 𝗣𝗲𝘀𝗮𝗻 𝗨𝘀𝗲𝗿.", { show_alert: true });
      return;
    }
    const targetId = ctx.match[1];
    ownerReplyState[ctx.from.id] = { target: targetId, step: "WAITING_REPLY" };
    await ctx.answerCbQuery();
    await safeReply(ctx, "✉️ <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗔𝗻𝗱𝗮 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴!</b>\n━━━━━━━━━━━━━━━━━━━━❍\n<b>🌸 𝗝𝗲𝗻𝗶𝘀 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗕𝗶𝘀𝗮 𝗕𝗲𝗿𝘂𝗽𝗮 :</b>\n<b>➥ 𝗧𝗲𝗸𝘀 | 𝗙𝗼𝘁𝗼 | 𝗩𝗶𝗱𝗲𝗼 | 𝗙𝗶𝗹𝗲</b>\n<b>➥ 𝗞𝗲𝘁𝗶𝗸 /batal 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.</b>", { parse_mode: "HTML" });
  } catch (e) {}
});

async function forwardReplyToUser(ownerCtx, targetUserId, messageType, payload) {
  try {
    if (messageType === "text") {
      await bot.telegram.sendMessage(targetUserId, `💬 <b>𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗗𝗮𝗿𝗶 𝗢𝘄𝗻𝗲𝗿:</b>\n\n${payload}`, { parse_mode: "HTML" });
      await ownerCtx.reply("✅ 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗕𝗲𝗿𝗵𝗮𝘀𝗶𝗹 𝗧𝗲𝗿𝗸𝗶𝗿𝗶𝗺 𝗦𝗲𝗯𝗮𝗴𝗮𝗶 𝗧𝗲𝗸𝘀.");
      return;
    }
  } catch (e) {
    await ownerCtx.reply("❌ 𝗚𝗮𝗴𝗮𝗹 𝗠𝗲𝗻𝗴𝗶𝗿𝗶𝗺 𝗕𝗮𝗹𝗮𝘀𝗮𝗻 𝗞𝗲 𝗨𝘀𝗲𝗿.");
  }
}

bot.on("text", async (ctx, next) => {
  try {
    const st = ownerReplyState[ctx.from.id];
    if (st && st.step === "WAITING_REPLY") {
      const target = st.target;
      const text = ctx.message.text;
      delete ownerReplyState[ctx.from.id];
      await forwardReplyToUser(ctx, target, "text", text);
      return;
    }
  } catch (e) {}
  return next();
});

function getFileExtension(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["js"].includes(ext)) return "javascript";
    if (["py"].includes(ext)) return "python";
    if (["html","htm"].includes(ext)) return "html";
    if (["css"].includes(ext)) return "css";
    if (["json"].includes(ext)) return "json";
    if (["zip","rar","7z","tar","gz"].includes(ext)) return "archive";
    return "text";
}

async function downloadFile(fileId) {
    try {
        const fileLink = await bot.telegram.getFileLink(fileId);
        const res = await axios.get(fileLink, { responseType: "arraybuffer" });
        return res.data;
    } catch (err) {
        throw new Error("Gagal download file: " + err.message);
    }
}

function getFileContent(buffer) {
    try {
        return Buffer.from(buffer).toString("utf8");
    } catch (err) {
        throw new Error("Gagal membaca file: " + err.message);
    }
}

async function analyzeErrorWithGemini(codeContent, fileName) {
    try {
        if (getFileExtension(fileName) === "archive") {
            return "❌ <b>File adalah arsip (zip/rar), bukan file kode.</b>\nSilakan ekstrak dulu dan kirim file kode individual (js, py, html, css, json).";
        }
        
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `Deteksi error pada file bernama ${fileName}. Berikan hasilnya dalam format:

\`\`\`${getFileExtension(fileName)}
(kode atau analisis singkat di sini)
\`\`\`

JANGAN beri penjelasan panjang. Singkat & jelas saja.

Isi file:
${codeContent}
`
                    }]
                }]
            }
        );
        return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
        throw new Error("Gemini error: " + err.message);
    }
}

async function fixErrorWithGemini(codeContent, fileName) {
    try {
        if (getFileExtension(fileName) === "archive") {
            throw new Error("File adalah arsip (zip/rar), bukan file kode. Silakan ekstrak dulu.");
        }
        
        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `Perbaiki error dalam file ${fileName} dan kirimkan hanya kode final:\n\n${codeContent}`
                    }]
                }]
            }
        );
        return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
        throw new Error("Gemini error: " + err.message);
    }
}

const premiumUsers = new Set([config.ownerId]);
let userLimits = new Map();

function updateUserLimit(userId) {
    if (premiumUsers.has(userId)) return 999;
    const now = userLimits.get(userId) || config.USER_LIMIT;
    const sisa = now - 1;
    userLimits.set(userId, sisa);
    return sisa;
}

function getUserLimit(userId) {
    return premiumUsers.has(userId) ? "Unlimited" : (userLimits.get(userId) || config.USER_LIMIT);
}

function loadUsers() {
  if (!fs.existsSync(USERS_DB)) {
    fs.writeFileSync(USERS_DB, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(USERS_DB));
}

function saveUsers(list) {
  fs.writeFileSync(USERS_DB, JSON.stringify(list, null, 2));
}

function checkAndAddUser(user) {
  const users = loadUsers();
  const isNewUser = !users.includes(user.id);
  
  if (isNewUser) {
    users.push(user.id);
    saveUsers(users);
    
    notifyOwnerNewUser(user);
    sendStartInfoToChannel(user);
    
    return true;
  }
  return false;
}

bot.on("message", (ctx, next) => {
  try {
    checkAndAddUser(ctx.from);
  } catch (e) {
    console.error("[ERROR] Error adding user:", e);
  }
  return next();
});

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    // Inisialisasi Database dengan struktur lengkap
    const initialDb = {
      isPanelOpen: true,
      users: {},      // PENTING: Agar data point & refCount bisa disimpan
      scripts: [],
      apps: [],
      referral_scripts: [], // Tambahkan ini agar tidak error saat load script ref
      paymentMethod: config.payment?.method || 'pakasir'
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
  }
  
  // Membaca file
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}


function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getActivePaymentMethod() {
  const db = readDb();
  return (db && db.paymentMethod) ? db.paymentMethod : 'pakasir';
}
function setActivePaymentMethod(method) {
  const db = readDb();
  db.paymentMethod = method;
  saveDb(db);
}

function getDOApiKey() {
  const db = readDb();
  return db.integrations?.digitalOcean?.token || config.ApiDO1;
}

function getPanelConfig() {
  const db = readDb();
  const over = db.integrations?.panel || {};
  return {
    domain: over.domain || config.panel.domain,
    apikey: over.apikey || config.panel.apikey,
    nestId: config.panel.nestId,
    eggId: config.panel.eggId,
    locationId: config.panel.locationId,
    startup: config.panel.startup,
    image: config.panel.image
  };
}

async function fetchEggConfig(panelCfg) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${panelCfg.apikey}`
  };
  const url = `${panelCfg.domain}/api/application/nests/${panelCfg.nestId}/eggs/${panelCfg.eggId}?include=variables`;
  const res = await axios.get(url, { headers });
  return res.data?.attributes || {};
}

function generateRandomPassword(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// --- FUNGSI HELPER ADD DATABASE ---
function addAccessInstall(userId) {
    const path = "./database/installpanel.json";
    let data = [];
    if (fs.existsSync(path)) {
        data = JSON.parse(fs.readFileSync(path, "utf8"));
    }
    if (!data.includes(userId)) {
        data.push(userId);
        fs.writeFileSync(path, JSON.stringify(data, null, 2));
    }
}


async function createAdminUser(username) {
  try {
    const panelCfg = getPanelConfig();
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${panelCfg.apikey}`
    };

    const password = generateRandomPassword(12);
    const email = `${username.toLowerCase()}@admin.com`;

    const payload = {
      email,
      username: username.toLowerCase(),
      first_name: username,
      last_name: "Admin",
      language: "en",
      password: password,
      root_admin: true 
    };

    const res = await axios.post(`${panelCfg.domain}/api/application/users`, payload, { headers });
    return { success: true, data: { ...res.data.attributes, password, login: panelCfg.domain } };
  } catch (error) {
     const errMsg = error.response?.data?.errors?.[0]?.detail || error.response?.data?.message || error.message;
     return { success: false, msg: errMsg };
  }
}




async function createPanelAccount(username, ram, disk, cpu) {
  try {
    const panelCfg = getPanelConfig();
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${panelCfg.apikey}`
    };
    const password = username + "001";
    const email = `${username.toLowerCase()}@gmail.com`;

    const userRes = await axios.post(`${panelCfg.domain}/api/application/users`, {
      email, username: username.toLowerCase(), first_name: username, last_name: "User", language: "en", password
    }, { headers });

    const user = userRes.data.attributes;

    await axios.post(`${panelCfg.domain}/api/application/servers`, {
      name: `${username} Server`,
      user: user.id,
      egg: panelCfg.eggId,
      docker_image: panelCfg.image,
      startup: panelCfg.startup,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
      limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
      feature_limits: { databases: 1, backups: 1, allocations: 1 },
      deploy: { locations: [panelCfg.locationId], dedicated_ip: false, port_range: [] }
    }, { headers });

    return { success: true, data: { username: user.username, password, login: panelCfg.domain } };
  } catch (error) {
    return { success: false, msg: error.response?.data?.errors?.[0]?.detail || error.message };
  }
}

// ================= FUNCTION KEYBOARD DINAMIS =================
function getMainMenu(userId) {
  let buttons = [
    [
      { text: "🛒 ☇ SHOP MENU", callback_data: "shop_menu" },
      { text: "🛠️ ☇ TOOLS MENU", callback_data: "menu_tools" }
    ],
    [
      { text: "💰 ☇ DEPOSIT MENU", callback_data: "topup_saldos" },
      { text: "💸 ☇ CEK SALDO", callback_data: "check_saldo_user" }
    ],
    [
      { text: "🎁 ☇ DONASI", callback_data: "donasi_menu" },
      { text: "🔧 ☇ INSTALL MENU", callback_data: "menu_install" }
    ],
    [
      { text: "🎫 ☇ VOUCHER", callback_data: "my_voucher" },
      { text: "📜 ☇ RIWAYAT TRANSAKSI", callback_data: "riwayat_trx_user" }
    ],
    [
      { text: "👥 ☇ ROOM PUBLIC", url: config.GroupOwner },
      { text: "📢 ☇ INFORMATION", url: config.ChannelOwner }
    ],
    [
      { text: "👑 ☇ DEVELOPER", callback_data: "menu_owner_contact" },
      { text: "💎 ☇ REFEAL MENU", callback_data: "referral" } 
    ]
  ];

  if (String(userId) === String(config.ownerId)) {
    buttons.push([
      { text: "⚙️ ☇ OWNER MENU", callback_data: "menu_owner" }
    ]);
  }

  return { inline_keyboard: buttons };
}


const REF_DB = './referral/referral.json';

// Helper Database Referral
function loadRefDB() {
    if (!fs.existsSync(REF_DB)) fs.writeFileSync(REF_DB, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(REF_DB, 'utf-8'));
}
function saveRefDB(data) {
    fs.writeFileSync(REF_DB, JSON.stringify(data, null, 2));
}

bot.start(async (ctx) => {
    try {
        const userId = ctx.from.id;
        const startPayload = ctx.startPayload; 
        
        const db = readDb();
        const refData = loadRefDB(); 

        if (!db.users) db.users = {};

        if (startPayload && !refData[userId]) {
            const referrerId = parseInt(startPayload);

            if (referrerId && referrerId !== userId && db.users[referrerId]) {
                db.users[referrerId].refCount = (db.users[referrerId].refCount || 0) + 1;
                db.users[referrerId].coin = (db.users[referrerId].coin || 0) + 1;
                
                refData[userId] = { 
                    refBy: referrerId, 
                    date: new Date().toLocaleString('id-ID'),
                    status: "Success"
                };
                
                saveDb(db);
                saveRefDB(refData);

                ctx.telegram.sendMessage(referrerId, 
                    `<b>🔔 NOTIFIKASI REFERRAL</b>\n\n` +
                    `<blockquote>Teman baru bergabung lewat linkmu!\n` +
                    `🎁 Bonus: <b>+1 Point</b>\n` +
                    `📊 Total Point: <b>${db.users[referrerId].coin} Point</b></blockquote>`, 
                    { parse_mode: 'HTML' }
                ).catch(() => {});
            }
        }

        if (!db.users[userId]) {
            db.users[userId] = { coin: 0, joined: true, refBy: null, refCount: 0 };
            saveDb(db);
        }

        const cleanFirstName = cleanText(ctx.from.first_name || "Pengguna");
        const stats = getBotStats();

        try {
            const stickerMsg = await ctx.replyWithSticker("CAACAgIAAxkBAAIGdmlbaxAn4zRo0RQGgi5cQzgoWUtJAAI9HAACW3e4SkETZOKxO0N2OAQ");
            setTimeout(() => { ctx.telegram.deleteMessage(ctx.chat.id, stickerMsg.message_id).catch(() => {}); }, 1200);
        } catch {}

        const saldoData = loadJSON(SALDO_DB) || {};
        const totalSaldo = Object.values(saldoData).reduce((a, b) => a + b, 0);
        const totalTransaksi = Object.keys(saldoData).length; 
        const userStatus = saldoData[userId] ? "💎 VIP Customer" : "👤 Guest / Member";

        const welcomeText = `<blockquote>───《 ❝ 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 ❞ 》─── 

[ 📊 <b>𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗕𝗢𝗧</b> ]
➥ Uptime : <code>${stats.runtime}</code>
➥ Total User : <code>${stats.totalUsers} Member</code>
➥ Total Pendapat: <code>${toRupiah(totalSaldo)}</code>
➥ Total Transaksi : <code>${totalTransaksi} Transaction</code>
➥ Version : 1.𝟢.𝟢 - Premium

[ 👤 <b>𝗣𝗥𝗢𝗙𝗜𝗟 𝗣𝗘𝗡𝗚𝗚𝗨𝗡𝗔</b> ]
➥ User ID : <code>${userId}</code>
➥ Name : <b>${cleanFirstName}</b>
➥ Status : <b>${userStatus}</b>
━━━━━━━━━━━━━━━━━━━━━━━
[ <b>🚀 𝗥𝗘𝗔𝗗𝗬 𝗧𝗢 𝗢𝗥𝗗𝗘𝗥?</b> ]
<b>Sistem kami bekerja 24/7 secara instan.</b>

🛒 𝘒𝘭𝘪𝘬 𝘣𝘶𝘵𝘵𝘰𝘯 𝘥𝘪 𝘣𝘢𝘸𝘢𝘩 𝘶𝘯𝘵𝘶𝘬 𝘮𝘦𝘭𝘪𝘩𝘢𝘵 𝘱𝘳𝘰𝘥𝘶𝘬:</blockquote>`;

        const payload = { 
            parse_mode: "HTML", 
            reply_markup: getMainMenu(userId) 
        };
        
        if (config.menuEffects && ctx.chat?.type === "private") {
            payload.message_effect_id = config.menuEffects[Math.floor(Math.random() * config.menuEffects.length)];
        }

        try {
            if (config.startPhoto) {
                await ctx.replyWithPhoto(config.startPhoto, { caption: welcomeText, ...payload });
            } else {
                await ctx.reply(welcomeText, payload);
            }
        } catch (e) {
            await ctx.reply(welcomeText, payload);
        }

    } catch (err) {
        console.error("Bot Start Error:", err);
    }
});

bot.action("referral", async (ctx) => {
    let refText = '';
    let refButtons = {};

    try {
        const userId = ctx.from.id;
        const botInfo = await ctx.telegram.getMe();
        const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        
        const db = readDb(); 
        const userData = db.users[userId] || { coin: 0, refCount: 0 };
        const refLink = `https://t.me/${botInfo.username}?start=${userId}`;
        
        refText = `🎁 <b>SISTEM REFERRAL — Referral - Script - Bot</b>\n\n` +
                  `Halo <b>${username}</b> 👋\n` +
                  `Ajak teman & dapatkan bonus otomatis!\n\n` +
                  `📊 <b>STATISTIK ANDA</b>\n` +
                  `├ 👥 Teman Bergabung : <b>${userData.refCount || 0} Orang</b>\n` +
                  `├ 💸 Total Bonus     : <b>${userData.coin || 0} Point</b>\n` +
                  `└ 💎 Status          : <b>Affiliate</b>\n\n` +
                  `🔗 <b>LINK REFERRAL</b>\n` +
                  `<code>${refLink}</code>\n\n` +
                  `📌 <b>CARA KERJA</b>\n` +
                  `1️⃣ Bagikan link referral Anda\n` +
                  `2️⃣ Pastikan teman klik tombol START\n` +
                  `3️⃣ Bonus +1 Point otomatis masuk 🎉`;

        refButtons = {
            inline_keyboard: [
                [{ 
                    text: "🚀 BAGIKAN LINK", 
                    url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Ayo gabung! Bot layanan VPS & Botz terbaik 24/7.")}` 
                }],
                [{ text: "🎁 TUKAR POINT SEKARANG", callback_data: "tukar_point" }], 
                [{ text: "⬅️ KEMBALI", callback_data: "back_home" }]
            ]
        };

        await ctx.deleteMessage().catch(() => {});

        return await ctx.replyWithPhoto(config.startPhoto, {
            caption: refText,
            parse_mode: 'HTML',
            reply_markup: refButtons
        });

    } catch (err) {
        console.error("Error Menu Referral:", err);
        if (refText) {
            ctx.reply(refText, { 
                parse_mode: 'HTML', 
                reply_markup: refButtons 
            }).catch(() => {});
        } else {
            ctx.answerCbQuery("❌ Terjadi kesalahan pada sistem referral.");
        }
    }
});

bot.action("menu_scripts", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_scripts')) return;
  
  const db = readDb();
  if ((db.scripts || []).length === 0) {
    await editMenuMessage(ctx, "🚫 <b>𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗦𝗰𝗿𝗶𝗽𝘁 𝗕𝗼𝘁 𝗬𝗮𝗻𝗴 𝗗𝗶𝗷𝘂𝗮𝗹 𝗢𝗹𝗲𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home" }]
        ]
      }
    });
    return;
  }
  
  const buttons = db.scripts.map((item, index) => {
    return [{ text: `${item.nama} - ${toRupiah(item.harga)}`, callback_data: `buy_sc_${index}` }];
  });
  
  buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home" }]);
  
  await editMenuMessage(ctx, "<b>📂 𝗣𝗶𝗹𝗶𝗵 𝗦𝗰𝗿𝗶𝗽𝘁 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗲𝗹𝗶 :</b>", {
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action("menu_apps", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_apps')) return;
  
  const db = readDb();
  if ((db.apps || []).length === 0) {
    await editMenuMessage(ctx, "🚫 <b>𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗕𝗲𝗹𝘂𝗺 𝗔𝗱𝗮 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗬𝗮𝗻𝗴 𝗗𝗶𝗷𝘂𝗮𝗹 𝗢𝗹𝗲𝗵 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home" }]
        ]
      }
    });
    return;
  }
  
  const buttons = db.apps.map((app, i) => {
    const stock = (app.accounts || []).length;
    return [{ text: `${app.nama} (${stock} stok) - ${toRupiah(app.harga)}`, callback_data: `buy_app_${i}` }];
  });
  
  buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home" }]);
  
  await editMenuMessage(ctx, "<b>📱 𝗗𝗮𝗳𝘁𝗮𝗿 𝗔𝗽𝗽𝘀 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 :</b>", {
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action("menu_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'menu_panel')) return;
  
  const db = readDb();
  if (!db.isPanelOpen) {
    await editMenuMessage(ctx, "<b>🚫 𝗠𝗼𝗵𝗼𝗻 𝗠𝗮𝗮𝗳, 𝗦𝘁𝗼𝗸 𝗣𝗮𝗻𝗲𝗹 𝗕𝗲𝗹𝘂𝗺 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮 𝗨𝗻𝘁𝘂𝗸 𝗦𝗮𝗮𝘁 𝗜𝗻𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶 𝗡𝗮𝗻𝘁𝗶</b>.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "back_home" }]
        ]
      }
    });
    return;
  }

  userState[ctx.from.id] = { step: "WAITING_USERNAME_PANEL" };

  await editMenuMessage(ctx,
    "<b>🍂 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗶𝗿𝗶𝗺 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 𝗨𝗻𝘁𝘂𝗸 𝗣𝗮𝗻𝗲𝗹 𝗬𝗮𝗻𝗴 𝗜𝗻𝗴𝗶𝗻 𝗞𝗮𝗺𝘂 𝗕𝗲𝗹𝗶 𝗗𝗲𝗻𝗴𝗮𝗻 𝗠𝗶𝗻𝗶𝗺𝗮𝗹 𝟱-𝟴 𝗛𝘂𝗿𝘂𝗳.</b>\n",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗠𝗲𝗺𝗯𝗲𝗹𝗶 𝗣𝗮𝗻𝗲𝗹", callback_data: "back_home" }]
        ]
      }
    }
  );

  setTimeout(() => {
    const st = userState[ctx.from.id];
    if (st && st.step === "WAITING_USERNAME_PANEL") {
      delete userState[ctx.from.id];
      safeReply(ctx, "❌ <b>𝗪𝗮𝗸𝘁𝘂 𝗦𝘂𝗱𝗮𝗵 𝗛𝗮𝗯𝗶𝘀!</b>\n🚀 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗕𝘂𝘆 𝗣𝗮𝗻𝗲𝗹 𝗟𝗮𝗴𝗶.", { parse_mode: "HTML" });
    }
  }, 60000);
});

bot.action("shop_menu", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'shop_menu')) return;

  const shopText = `<blockquote>✦ ─────────────── ✦
  <b>Albyy ʙᴀɪʏʟᴇs ᴋᴀᴛᴀʟᴏɢ (1/2)</b>
✦ ─────────────── ✦

👋🏻 <b>Pilih Kategori Produk</b>
Silakan jelajahi daftar layanan terbaik kami.

[ 🛒 <b>𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 - 𝗣𝗚 𝟭</b> ]
➥ ⚡ 𝗣𝗿𝗼𝘀𝗲𝘀 : <code>Serba Otomatis</code>
➥ 🛡️ 𝗚𝗮𝗿𝗮𝗻𝘀𝗶 : <code>Terjamin Aman</code>

━━━━━━━━━━━━━━━━━━━━━━━
Klik tombol <b>Next ➔</b> untuk melihat
layanan lainnya.</blockquote>`;

  const shopKeyboard = {
    inline_keyboard: [
      [
        { text: "📁 ☇ SCRIPT", callback_data: "menu_scripts" },
        { text: "🖥️ ☇ VPS", callback_data: "buyvps_start" }
      ],
      [
        { text: "🌐 ☇ DIGITAL OCEAN", callback_data: "menu_digitalocean" },
        { text: "🕊️ ☇ RESS PANEL LEGAL", callback_data: "buyrespanel_pay_qris" }
      ],
      [
        { text: "🪅 ☇ RESELLER VPS", callback_data: "buyresvps_pay_qris" },
        { text: "📪 ☇ VPS LEGAL", callback_data: "menu_vps" }
      ],
      [
        { text: "🛠️ ☇ BUY INSTALL PANEL", callback_data: "buy_install_panel" },
        { text: "📱 ☇ BUY APPS PREMIUM", callback_data: "menu_apps" }
      ],
      [
        { text: "🔙 Home", callback_data: "back_home" },
        { text: "Next ➔", callback_data: "shop_menu_2" }
      ]
    ]
  };

  try {
    await editMenuMessageWithPhoto(ctx, config.startPhoto, shopText, {
      parse_mode: "HTML",
      reply_markup: shopKeyboard
    });
  } catch (err) {
    await ctx.reply(shopText, { parse_mode: "HTML", reply_markup: shopKeyboard });
  }
});


bot.action("shop_menu_2", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'shop_menu_2')) return;

  const shopText2 = `<blockquote>✦ ─────────────── ✦
  <b>Albyy ʙᴀɪʏʟᴇs ᴋᴀᴛᴀʟᴏɢ (2/2)</b>
✦ ─────────────── ✦

👋🏻 <b>Layanan Tambahan</b>
Berikut adalah sisa daftar layanan digital
yang tersedia di sistem kami.

[ 🛒 <b>𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 - 𝗣𝗚 𝟮</b> ]
➥ ⚡ 𝗣𝗿𝗼𝘀𝗲𝘀 : <code>Serba Otomatis</code>
➥ 🕒 𝗨𝗽𝘁𝗶𝗺𝗲 : <code>Online 24/7</code>

━━━━━━━━━━━━━━━━━━━━━━━
Klik tombol <b>⬅ Prev</b> untuk kembali
ke daftar layanan sebelumnya.</blockquote>`;

  const shopKeyboard2 = {
    inline_keyboard: [
      [
        { text: "🤝 ☇ BUY PARTNER", callback_data: "menu_partner_pribadi" },
        { text: "🏠 ☇ BUY ADMIN CHANNEL", callback_data: "menu_admin_ch" }
      ],
      [
        { text: "📡 ☇ BUY PANEL LEGAL", callback_data: "menu_panel" },
        { text: "🕊️ ☇ RESELLER PANEL", callback_data: "buyrespane_biasal_pay_qris" }
      ],
      [
        { text: "🤖 ☇ BUY UBOT", callback_data: "buyubot_pay_qris" },
        { text: "📱☇ BUY NOKOS", callback_data: "choose_service" }
      ],
      [
      { text: "🔥 ☇ BUY SUNTIK SOSMED", callback_data: "smm_menu" },
      { text: "🛒 ☇ KATALOG PRODUK", callback_data: "menu_produk" }
      ],
      [
        { text: "⬅ Prev", callback_data: "shop_menu" },
        { text: "🔙 Home", callback_data: "back_home" }
      ]
    ]
  };

  try {
    await editMenuMessageWithPhoto(ctx, config.startPhoto, shopText2, {
      parse_mode: "HTML",
      reply_markup: shopKeyboard2
    });
  } catch (err) {
    await ctx.reply(shopText2, { parse_mode: "HTML", reply_markup: shopKeyboard2 });
  }
});


bot.action("menu_install", async (ctx) => {
  const userId = ctx.from.id;
  const accessPath = "./database/installpanel.json";
  
  // 1. Ambil data list user yang sudah beli
  let accessList = [];
  if (fs.existsSync(accessPath)) {
    try {
      accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
    } catch (e) {
      accessList = [];
    }
  }

  // 2. Logika Proteksi: Jika bukan owner DAN tidak ada di list pembeli
  if (userId !== config.ownerId && !accessList.includes(userId)) {
    return ctx.answerCbQuery("⚠️ Kamu belum membeli Akses Install Panel!", { show_alert: true });
  }

  // 3. Tampilan Menu Lengkap (Core, Theme, & Protect)
  await editMenuMessage(ctx, 
    `<blockquote><b>🦖 PTERODACTYL ECOSYSTEM</b>
<i>Automatic Server Deployment System</i>

<b>〔 INSTALLER MENU 〕</b>
🚀 /subdo     -   (Auto Setup Panel & Node DNS)
🛠️ /installpanel - (Deploy Install Panel, Wings & Node)
🧹 /uninstallpanel - (Deep Clean Pterodactyl Files)
⚡ /swings    -   (Sync Token & Start Wings)
🛡️ /installprotectall - (Protect Panel 1-9)

<b>〔 THEME & PROTECTION 〕</b>
🎨 /installtemanightcore - (Nightcore Theme)
🎭 /installreviactly - (Reviactly Theme)

📌 <b>System Notes:</b>
• Use <b>Ubuntu 20/22</b> or <b>Debian 11/12</b>
• Fresh OS recommended for stability
• Developer: <b>@albyy0x</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Kembali", callback_data: "back_home" }]
        ]
      }
    }
  );
});


bot.action("menu_tools", async (ctx) => {
  await editMenuMessage(ctx, 
    `<blockquote><b>╭━━━✧「 𝗧𝗢𝗢𝗟𝗦 𝗠𝗘𝗡𝗨 」✧━━━❍</b>
<b>┃ 🎬 𝗬𝗼𝘂𝘁𝘂𝗯𝗲 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /ytsearch <i>(Searching YouTube)</i>
<b>┃ └⌑</b> /ytmp3 <i>(Audio)</i>
<b>┃</b>
<b>┃ 🎥 𝗧𝗶𝗸𝗧𝗼𝗸 𝗠𝗲𝗻𝘂</b>
<b>┃ └⌑</b> /tiktokmp4 <i>(Video)</i>
<b>┃</b>
<b>┃ 📝 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /checkerror
<b>┃ └⌑</b> /fixerror
<b>┃</b>
<b>┃ 🛠️ 𝗧𝗼𝗼𝗹𝘀 𝗠𝗲𝗻𝘂</b>
<b>┃ ├⌑</b> /makeqr
<b>┃ ├⌑</b> /ssweb
<b>┃ ├⌑</b> /shorten
<b>┃ ├⌑</b> /react <i>(React WA Channel)</i>
<b>┃ ├⌑</b> /qc <i>(Quote Creator)</i>
<b>┃ ├⌑</b> /brat <i>(Brat Sticker)</i>
<b>┃ └⌑</b> /tourl <i>(Upload to URL)</i>
<b>╰━━━━━━━━━━━━━━━━━━━━━━❍</b></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 BACK", callback_data: "back_home" }]
        ]
      }
    }
  );
});

bot.action("menu_owner_contact", async (ctx) => {
  await editMenuMessage(ctx,
    `<blockquote><b>📞「 𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗢𝗪𝗡𝗘𝗥 𝗕𝗢𝗧 」</b></blockquote>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━━❍</b>\n` +
    `<b>🍂 𝗡𝗮𝗺𝗲 :</b> ${config.ownerName || "𝗔𝗱𝗺𝗶𝗻"}\n` +
    `<b>📲 𝗪𝗵𝗮𝘁𝘀𝗮𝗽𝗽 :</b> ${config.ownerWa}\n` +
    `<b>✈️ 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 :</b> ${config.ownerUser}\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━━❍</b>\n` +
    `📩 𝗞𝗮𝗺𝘂 𝗟𝗶𝗺𝗶𝘁? 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗹𝗶𝗸 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 :\n`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 CHAT OWNER", callback_data: "send_message_owner" }],
          [{ text: "🔙 BACK", callback_data: "back_home" }]
        ]
      }
    }
  );
});

bot.action("send_message_owner", async (ctx) => {
  liveChatState[ctx.from.id] = { step: "WAITING_MESSAGE" };
  await editMenuMessage(ctx, 
    "📝 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗞𝗲𝘁𝗶𝗸 𝗣𝗲𝘀𝗮𝗻 𝗨𝗻𝘁𝘂𝗸 𝗗𝗶𝗸𝗶𝗿𝗶𝗺 𝗞𝗲𝗽𝗮𝗱𝗮 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁.</b>\n<b>🍂 𝗧𝗲𝗸𝗮𝗻 𝗕𝘂𝘁𝘁𝗼𝗻 𝗕𝗮𝘁𝗮𝗹 𝗗𝗶𝗯𝗮𝘄𝗮𝗵 𝗨𝗻𝘁𝘂𝗸 𝗠𝗲𝗺𝗯𝗮𝘁𝗮𝗹𝗸𝗮𝗻.</b>",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ BATALKAN", callback_data: "back_home" }]
        ]
      }
    }
  );
});

bot.action("back_home", async (ctx) => {
  const userId = ctx.from.id;
  const cleanFirstName = cleanText(ctx.from.first_name || "Pengguna");
  const stats = getBotStats();

  await ctx.answerCbQuery().catch(() => {});

  const saldoData = loadJSON(SALDO_DB) || {};
  const totalSaldo = Object.values(saldoData).reduce((a, b) => a + b, 0);
  const totalTransaksi = Object.keys(saldoData).length; 

  // LOGIKA STATUS VIP
  const hasPurchased = saldoData[userId] ? true : false; 
  const userStatus = hasPurchased ? "💎 VIP Customer" : "👤 Guest / Member";

  // ================= WELCOME TEXT =================
  const welcomeText = `<blockquote>───《 ❝ 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 ❞ 》─── 

[ 📊 <b>𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗕𝗢𝗧</b> ]
➥ Uptime : <code>${stats.runtime}</code>
➥ Total User : <code>${stats.totalUsers} Member</code>
➥ Total Pendapat: <code>${toRupiah(totalSaldo)}</code>
➥ Total Transaksi : <code>${totalTransaksi} Transaction</code>
➥ Version : 7.𝟢.𝟢 - 𝖵𝗂𝗉 𝖡𝗎𝗒 𝖮𝗇𝗅𝗒

[ 👤 <b>𝗣𝗥𝗢𝗙𝗜𝗟 𝗣𝗘𝗡𝗚𝗚𝗨𝗡𝗔</b> ]
➥ User ID : <code>${userId}</code>
➥ Name : <b>${cleanFirstName}</b>
➥ Status : <b>${userStatus}</b>
━━━━━━━━━━━━━━━━━━━━━━━
[ <b>🚀 𝗥𝗘𝗔𝗗𝗬 𝗧𝗢 𝗢𝗥𝗗𝗘𝗥?</b> ]
<b>Sistem kami bekerja 24/7 secara instan. 
Pilih kategori di bawah, selesaikan pembayaran, 
dan terima pesanan Anda dalam hitungan detik!</b>

🛒 𝘒𝘭𝘪𝘬 𝘣𝘶𝘵𝘵𝘰𝘯 𝘥𝘪 𝘣𝘢𝘸𝘢𝘩 𝘶𝘯𝘵𝘶𝘬 𝘮𝘦𝘭𝘪𝘩𝘢𝘵 𝘱𝘳𝘰𝘥𝘶𝘬:</blockquote>`;

  const markup = getMainMenu(userId);

  try {
    if (config.startPhoto) {
      // JIKA ADA FOTO: Gunakan editMessageCaption agar foto tidak hilang
      await ctx.editMessageCaption(welcomeText, {
        parse_mode: "HTML",
        reply_markup: markup
      }).catch(async () => {
        // Jika gagal edit caption (misal pesan sebelumnya tidak ada foto), 
        // maka kirim ulang pesan baru dengan foto
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.startPhoto, {
          caption: welcomeText,
          parse_mode: "HTML",
          reply_markup: markup
        });
      });
    } else {
      // JIKA TIDAK ADA FOTO: Gunakan edit biasa
      await ctx.editMessageText(welcomeText, {
        parse_mode: "HTML",
        reply_markup: markup
      });
    }
  } catch (err) {
    console.error("[ERROR] Failed to edit message in back_home:", err.message);
    await ctx.reply(welcomeText, { parse_mode: "HTML", reply_markup: markup });
  }
});

function showOwnerMenu(ctx) {
  if (ctx.from.id !== config.ownerId) 
    return safeReply(ctx, "<blockquote>🚫 𝗞𝗮𝗺𝘂 𝗕𝘂𝗸𝗮𝗻 𝗢𝘄𝗻𝗲𝗿 𝗕𝗼𝘁!</blockquote>", { parse_mode: "HTML" });

  safeReply(ctx, `<blockquote><b>🌸───「 ❝ 𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨 ❞ 」───🌸</b>\n<b>➥ Silahkan Tekan Button Dibawah:</b></blockquote>`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [ Markup.button.callback("Panel Online/Offline", "owner_panel") ],
        [ Markup.button.callback("📢 Broadcast", "owner_broadcast") ],
        [ Markup.button.callback("📊 Statistik Global", "list_stats") ], 
        [
          Markup.button.callback("📦 Add Produk", "add_produk"),
          Markup.button.callback("🗑 Delete Produk", "del_produk")
        ],
        [
          Markup.button.callback("➕ Add Script", "add_script"),
          Markup.button.callback("🗑 Delete Script", "del_script")
        ],
        // --- MENU REFERRAL SCRIPT ---
        [
          Markup.button.callback("🎁 Add Script Ref", "add_script_referral"),
          Markup.button.callback("🗑 Del Script Ref", "del_script_referral")
        ],
        // ----------------------------
        [
          Markup.button.callback("📱 Add App", "add_app"),
          Markup.button.callback("🗑 Delete App", "del_app")
        ],
        [
          Markup.button.callback("➕ Add Account", "owner_add_account"),
          Markup.button.callback("🗑 Delete Account", "owner_del_account")
        ],
        [
          Markup.button.callback("🌐 Add Akun DO", "start_add_do"),
          Markup.button.callback("🗑 Del Akun DO", "del_akun_do")
        ],
        [
          Markup.button.callback("🖥️ Add VPS", "start_add_vps"),
          Markup.button.callback("🗑️ Del VPS", "del_vps_list")
        ],
        [ Markup.button.callback("🔑 Integrasi", "menu_integrations") ],
        [ Markup.button.callback("🖥️ List VPS Orders", "list_vps_orders") ],
        [ Markup.button.callback("📃 List App", "list_apps") ],
        [ Markup.button.callback("💳 Ganti Payment", "change_payment") ],
        [ Markup.button.callback("🧾 Manual Payments", "manual_payments_menu") ],
        [ Markup.button.callback("💰 Withdraw RumahOTP", "wd_rumahotp_start") ],        
        [ Markup.button.callback("💾 Backup Script", "backup_database") ],
        [ Markup.button.callback("🐦 Add Voucher Promo", "add_promo") ],                
        [ Markup.button.callback("🔙 Kembali", "back_home") ]
      ])
    }
  );
}


bot.action("menu_owner", (ctx) => {
  ctx.answerCbQuery().catch(()=>{});
  showOwnerMenu(ctx);
});

bot.action("buy_admin_panel_monthly", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_admin_panel')) return;
  userState[ctx.from.id] = { step: "WAITING_USERNAME_ADMIN_PANEL" };
  await editMenuMessage(ctx, 
    "<blockquote>👤 <b>Kirim username untuk akun Admin Panel:</b>\n\nSyarat:\n- Minimal 4 karakter\n- Hanya huruf dan angka</blockquote>", 
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Batalkan", callback_data: "shop_menu" }]
        ]
      }
    }
  );
});

bot.action("menu_partner_pribadi", async (ctx) => {
  if (!await requirePrivateChat(ctx, "menu_partner_pribadi")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId);
  const hargaPartnerpribadi = 10000;

  userState[userId] = {
    partnerpribadi: {
      price: hargaPartnerpribadi,
      itemName: "Partner Pribadi (PERMANEN)"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<b>🔓 JOIN PT PRIBADI Username FAMOUS</b>
<b>━━━━━━━━━━━━━━━━━━━━━━</b>

<b>〔 💎 BENEFIT PT PRIBADI 〕</b>
ᯤ <b>Deskripsi :</b> <a href="https://telegra.ph/premium-02-12-8">CLICK DISINI</a>
ᯤ <b>Status :</b> Permanen

<b>〔 💰 RINCIAN HARGA 〕</b>
➥ <b>Produk   :</b> Partner Pribadi 
➥ <b>Status    :</b> Permanen (Sekali Bayar)
➥ <b>Harga     :</b> <code>${toRupiah(hargaPartnerpribadi)}</code>
➥ <b>Saldo Mu  :</b> <code>${toRupiah(saldoUser)}</code>

<b>━━━━━━━━━━━━━━━━━━━━━━</b>
<i>Silakan pilih metode pembayaran di bawah :</i>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 Bayar via Saldo (Instan)", callback_data: "partnerpribadi_pay_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "partnerpribadi_confirm_pay" }],
        [{ text: "🔙 Kembali", callback_data: "back_home" }]
      ]
    }
  });
});

bot.action("partnerpribadi_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const data = userState[userId]?.partnerpribadi;

  if (!data) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < data.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membeli akses ini!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= data.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ PEMBAYARAN BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Saldo dipotong: <b>${toRupiah(data.price)}</b>\n` +
    `💼 Sisa Saldo   : <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Link akses grup sedang dikirimkan...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Link Grup ke User
  await sendProductToUser(ctx, {
    type: "partner_pribadi",
    itemName: data.itemName
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 PARTNER PRIBADI TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 PEMBELI 〕</b>\n` +
    `➥ <b>Nama    :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID :</b> <code>${userId}</code>\n\n` +
    `<b>〔 💳 TRANSAKSI 〕</b>\n` +
    `➥ <b>Produk  :</b> Partnerpribadi\n` +
    `➥ <b>Harga   :</b> <code>${toRupiah(data.price)}</code>\n` +
    `➥ <b>Metode  :</b> Potong Saldo\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>⚡ Member baru telah masuk grup via saldo!</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus sesuai permintaan
});

bot.action("partnerpribadi_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;

  // Pastikan pengecekan Private Chat
  if (typeof isPrivateChat === 'function' && !isPrivateChat(ctx)) {
    await ctx.answerCbQuery?.();
    return safeReply(ctx, "❌ <b>Hanya bisa dilakukan di Private Chat!</b>", { parse_mode: "HTML" });
  }

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Panggil handlePayment standar tanpa jeda teks loading
  await handlePayment(
    ctx,
    10000, 
    "Partner Pribadi (PERMANEN)", 
    {
      type: "partner_pribadi", 
      price: 10000,
      itemName: "Partner Pribadi (PERMANEN)",
      partnerpribadiData: {
        price: 10000,
        duration: "PERMANEN"
      }
    }
  );
});


bot.action("buy_admin_panel_monthly", async (ctx) => {
    if (!await requirePrivateChat(ctx, 'buy_admin_panel')) return;
    await handlePayment(ctx, config.reseller.adminPanel.monthly, "Admin Panel Monthly", {
        type: "admin_panel_monthly",
        duration: 30,
        price: config.reseller.adminPanel.monthly
    });
});

bot.action("menu_admin_ch", async (ctx) => {
  if (!await requirePrivateChat(ctx, "menu_admin_ch")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId);
  const hargaAdminch = 5000;

  userState[userId] = {
    adminCh: {
      price: hargaAdminch,
      itemName: "Admin ch (PERMANEN)"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<b>🤖 AKSES ADMIN CH (Username)</b>
<b>━━━━━━━━━━━━━━━━━━━━━━</b>

<b>〔 💎 BENEFIT ADMIN CH 〕</b>
• Spek ch https://t.me/ 
• Ch no suntik
• Full buyer
• Pasti balmod klo usaha 
• No spam, hrus jeda

<b>〔 💰 RINCIAN HARGA 〕</b>
➥ <b>Produk   :</b> Admin Ch
➥ <b>Status    :</b> Permanen (Akses Selamanya)
➥ <b>Harga     :</b> <code>${toRupiah(hargaAdminch)}</code>
➥ <b>Saldo Mu  :</b> <code>${toRupiah(saldoUser)}</code>

<b>━━━━━━━━━━━━━━━━━━━━━━</b>
<i>Silakan pilih metode pembayaran di bawah :</i>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 Bayar via Saldo (Instan)", callback_data: "adminch_pay_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "adminch_confirm_pay" }],
        [{ text: "🔙 Kembali", callback_data: "back_home" }]
      ]
    }
  });
});


bot.action("adminch_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const data = userState[userId]?.adminCh;

  if (!data) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < data.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membeli akses ini!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= data.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ PEMBAYARAN BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Saldo dipotong: <b>${toRupiah(data.price)}</b>\n` +
    `💼 Sisa Saldo   : <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Akses adminch sedang dikirimkan ke chat ini...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Produk (Source Code/Link Group) ke User
  await sendProductToUser(ctx, {
    type: "adminch",
    itemName: data.itemName
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 ADMIN CH TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 PEMBELI 〕</b>\n` +
    `➥ <b>Nama    :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID :</b> <code>${userId}</code>\n\n` +
    `<b>〔 💳 TRANSAKSI 〕</b>\n` +
    `➥ <b>Produk  :</b> Adminch\n` +
    `➥ <b>Harga   :</b> <code>${toRupiah(data.price)}</code>\n` +
    `➥ <b>Metode  :</b> Potong Saldo\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>⚡ Penjualan baru terdeteksi melalui saldo!</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus sesuai permintaan
});

bot.action("adminch_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;
  const data = userState[userId]?.adminCh;

  if (!data) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks loading
  await handlePayment(
    ctx,
    data.price,
    data.itemName,
    {
      type: "adminch",
      price: data.price,
      itemName: data.itemName
    }
  );
});

bot.action("smm_menu", async (ctx) => {
    const userId = ctx.from.id;
    const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
    const saldo = saldoData[userId] || 0;
    
    // Mengambil data user
    const firstName = ctx.from.first_name || "User";
    const username = ctx.from.username ? `@${ctx.from.username}` : "Tidak ada username";

    const text = `<blockquote>━━━━━━━━━━━━━━━━━━━━━
🔥 <b>𝗦𝗨𝗡𝗧𝗜𝗞 𝗦𝗢𝗦𝗜𝗔𝗟 𝗠𝗘𝗗𝗜𝗔</b> 🔥
━━━━━━━━━━━━━━━━━━━━━

𝗧𝗶𝗻𝗴𝗸𝗮𝘁𝗸𝗮𝗻 𝗣𝗼𝗽𝘂𝗹𝗮𝗿𝗶𝘁𝗮𝘀 𝗔𝗸𝘂𝗻𝗺𝘂  
𝖥𝗈𝗅𝗅𝗈𝗐𝖾𝗋𝗌 • 𝖫𝗂𝗄𝖾𝗌 • 𝖵𝗂𝖾𝗐𝗌 • 𝖲𝗎𝖻𝗌𝖼𝗋𝗂𝖻𝖾𝗋

━━━━━━━━━━━━━━━━━━━━━
👤 <b>𝖭𝖺𝗆𝖺 :</b> ${firstName}
🆔 <b>𝖴𝗌𝖾𝗋𝗇𝖺𝗆𝖾 :</b> ${username}
💰 <b>𝖲𝖺𝗅𝖽𝗈 :</b> ${toRupiah(saldo)}

━━━━━━━━━━━━━━━━━━━━━

🚀 <b>𝖫𝖠𝖸𝖠𝖭𝖠𝖭 𝖳𝖤𝖱𝖲𝖤𝖣𝖨𝖠</b>
• 𝖯𝗋𝗈𝗌𝖾𝗌 𝖢𝖾𝗉𝖺𝗍 & 𝖮𝗍𝗈𝗆𝖺𝗍𝗂𝗌
• 𝖧𝖺𝗋𝗀𝖺 𝖡𝖾𝗋𝗌𝖺𝗁𝖺𝖻𝖺𝗍
• 𝖠𝗆𝖺𝗇 & 𝖳𝖾𝗋𝗉𝖾𝗋𝖼𝖺𝗒𝖺

━━━━━━━━━━━━━━━━━━━━━
𝖲𝗂𝗅𝖺𝗄𝖺𝗇 𝖯𝗂𝗅𝗂𝗁 𝖬𝖾𝗇𝗎 𝖣𝗂 𝖡𝖺𝗐𝖺𝗁  
𝖣𝖺𝗇 𝖬𝗎𝗅𝖺𝗂 𝖮𝗋𝖽𝖾𝗋 𝖲𝖾𝗄𝖺𝗋𝖺𝗇𝗀 🚀
━━━━━━━━━━━━━━━━━━━━━</blockquote>`;

    await editMenuMessage(ctx, text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "➕ DEPOSIT", callback_data: "topup_nokos" }],
                [{ text: "🛒 LAYANAN", callback_data: "smm_services_0" }],
                [{ text: "📜 RIWAYAT ORDER", callback_data: "smm_history" }],
                [{ text: "🔍 STATUS ORDER", callback_data: "smm_check_status" }],
                [{ text: "🔙 BACK", callback_data: "back_home" }]
            ]
        }
    });
});

bot.action("list_vps_orders", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang boleh melihat order VPS!", { show_alert: true });
  }
  
  const vpsPath = "./database/data_vps.json";
  
  if (!fs.existsSync(vpsPath)) {
    return safeReply(ctx, "<blockquote>📭 Belum ada data VPS yang terjual.</blockquote>", { 
      parse_mode: "HTML" 
    });
  }
  
  try {
    const vpsDB = JSON.parse(fs.readFileSync(vpsPath));
    
    if (!Array.isArray(vpsDB) || vpsDB.length === 0) {
      return safeReply(ctx, "<blockquote>📭 Belum ada data VPS yang terjual.</blockquote>", { 
        parse_mode: "HTML" 
      });
    }
    
    let message = "<b>📋 DAFTAR ORDER VPS</b>\n\n";
    
    vpsDB.forEach((vps, i) => {
      message += `<b>${i + 1}. ${vps.hostname}</b>\n`;
      message += `<code>   User:</code> ${vps.username} (${vps.userId})\n`;
      message += `<code>   IP:</code> ${vps.ip}\n`;
      message += `<code>   Region:</code> ${vps.region}\n`;
      message += `<code>   Paket:</code> ${vps.paket}\n`;
      message += `<code>   Harga:</code> ${toRupiah(vps.harga)}\n`;
      message += `<code>   Tanggal:</code> ${vps.created}\n\n`;
    });
    
    await safeReply(ctx, message, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Kembali", "menu_owner")]
      ])
    });
    
  } catch (error) {
    console.error("Error reading VPS data:", error);
    safeReply(ctx, "<blockquote>❌ Gagal membaca data VPS.</blockquote>", { 
      parse_mode: "HTML" 
    });
  }
});

bot.action("backup_database", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang boleh backup!", { show_alert: true });
  }
  
  await ctx.answerCbQuery("⏳ Memproses Full Backup...", { show_alert: false });
  await safeReply(ctx, "<blockquote>📦 <b>Sedang mempacking seluruh Source Code & Database...</b>\n<i>Mohon tunggu, proses tergantung ukuran file.</i></blockquote>", { parse_mode: "HTML" });
  
  createAndSendFullBackup(ctx, false);
});

bot.action("list_stats", async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Akses Ditolak: Hanya Owner!", { show_alert: true });
  }
  
  const historyPath = "./database/historytrx.json";
  const SALDO_DB = "./database/saldousers.json";
  const DONASI_DB = "./database/donasi.json";
  
  try {
    // 1. Ambil Data
    const stats = getBotStats(); 
    const saldoData = fs.existsSync(SALDO_DB) ? JSON.parse(fs.readFileSync(SALDO_DB, 'utf8')) : {};
    const donasiData = fs.existsSync(DONASI_DB) ? JSON.parse(fs.readFileSync(DONASI_DB, 'utf8')) : {};
    
    let historyDB = [];
    if (fs.existsSync(historyPath)) historyDB = JSON.parse(fs.readFileSync(historyPath, 'utf8'));

    // 2. Kalkulasi
    const totalSaldoBot = Object.values(saldoData).reduce((a, b) => a + (Number(b) || 0), 0);
    const totalDonasi = Object.values(donasiData).reduce((a, b) => a + (Number(b) || 0), 0);

    // 3. Bangun Pesan
    let message = "<b>───「 🖥️ DASHBOARD STATISTIK 」───</b>\n\n";
    
    message += "<b>📊 RINGKASAN DATA:</b>\n";
    message += `<blockquote>➥ Total User    : ${stats.totalUsers} Member\n`;
    message += `➥ Total Trx     : ${historyDB.length} Success\n`;
    message += `➥ Total Saldo   : ${toRupiah(totalSaldoBot)}\n`;
    message += `➥ Total Donasi  : ${toRupiah(totalDonasi)}</blockquote>\n\n`;
    
    // --- SECTION: RIWAYAT TRANSAKSI ---
    message += "<b>📜 RIWAYAT TRANSAKSI TERAKHIR</b>\n";
    if (historyDB.length === 0) {
      message += "<blockquote><i>Belum ada riwayat transaksi.</i></blockquote>\n";
    } else {
      message += "<blockquote>";
      const recentHistory = historyDB.slice(-5).reverse();
      recentHistory.forEach((trx, i) => {
        message += `${i + 1}. <code>${trx.userId}</code> | ${trx.productName}\n`;
      });
      message += "</blockquote>\n";
    }

    // --- SECTION: TOP DEPOSIT ---
    message += "<b>💰 TOP DEPOSIT (RANKING)</b>\n";
    const topDeposit = Object.entries(saldoData).sort(([, a], [, b]) => b - a).slice(0, 5);
    if (topDeposit.length === 0) {
      message += "<blockquote><i>Tidak ada data saldo.</i></blockquote>\n";
    } else {
      message += "<blockquote>";
      topDeposit.forEach(([uId, total], i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤";
        message += `${medal} <code>${uId}</code> - ${toRupiah(total)}\n`;
      });
      message += "</blockquote>\n";
    }

    // --- SECTION: TOP DONATUR ---
    message += "<b>❤️ TOP DONATUR (DERMAWAN)</b>\n";
    const topDonors = Object.entries(donasiData).sort(([, a], [, b]) => b - a).slice(0, 5);
    if (topDonors.length === 0) {
      message += "<blockquote><i>Belum ada donatur.</i></blockquote>\n";
    } else {
      message += "<blockquote>";
      topDonors.forEach(([uId, total], i) => {
        message += `${i + 1}. <code>${uId}</code> | ${toRupiah(total)}\n`;
      });
      message += "</blockquote>";
    }

    // Proteksi Karakter
    if (message.length > 4000) message = message.substring(0, 3900) + "...";

    await safeReply(ctx, message, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Kembali ke Menu", "menu_owner")]
      ])
    });
    
  } catch (error) {
    console.error(error);
    safeReply(ctx, "<blockquote>❌ Gagal mengambil data statistik!</blockquote>", { parse_mode: "HTML" });
  }
});


bot.action("my_voucher", async (ctx) => {
  const userId = ctx.from.id;
  const promoPath = './database/promo.json';

  // 1. Cek apakah file promo.json ada
  if (!fs.existsSync(promoPath)) {
    const textNoFile = `<blockquote>✦ ─────────────── ✦
  <b> Albyy ʙᴀɪʏʟᴇᴀ ᴠᴏᴜᴄʜᴇʀ</b>
✦ ─────────────── ✦

📲 <b>Belum ada voucher tersedia.</b>
Tunggu owner membuat promo baru untuk mendapatkan potongan harga menarik!

━━━━━━━━━━━━━━━━━━━━━━━
Nantikan update promo di channel info kami.</blockquote>`;

    return editMenuMessage(ctx, textNoFile, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔍 Cek Status Voucher", "cek_voucher_input")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
      ])
    });
  }

  const promoDB = JSON.parse(fs.readFileSync(promoPath, 'utf8'));
  const allPromoKeys = Object.keys(promoDB);
  const availableVouchers = allPromoKeys.filter(key => promoDB[key].used < promoDB[key].max);

  // 2. Jika tidak ada promo yang tersisa
  if (availableVouchers.length === 0) {
    const textEmpty = `<blockquote>✦ ─────────────── ✦
  <b>Albyy ʙᴀɪʏʟᴇs ᴠᴏᴜᴄʜᴇʀ</b>
✦ ─────────────── ✦

📲 <b>Semua voucher telah habis.</b>
Maaf, semua kuota promo saat ini sudah diklaim oleh pengguna lain.

━━━━━━━━━━━━━━━━━━━━━━━
Nantikan promo menarik berikutnya!</blockquote>`;

    return editMenuMessage(ctx, textEmpty, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔍 Cek Status Voucher", "cek_voucher_input")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
      ])
    });
  }

  // 3. Tampilkan daftar voucher (Klaim)
  let msg = `<blockquote>✦ ─────────────── ✦
  <b>Albyy ʙᴀɪʏʟᴇs ᴠᴏᴜᴄʜᴇʀ</b>
✦ ─────────────── ✦\n\n`;
  
  msg += `Berikut daftar kode promo aktif:\n\n`;

  availableVouchers.forEach((key, i) => {
    const data = promoDB[key];
    const sisa = data.max - data.used;
    msg += `<b>${i + 1}. 🎫 𝗞𝗼𝗱𝗲:</b> <code>${key}</code>\n`;
    msg += `   ﹂💰 𝗗𝗶𝘀𝗸𝗼𝗻: ${toRupiah(data.discount)}\n`;
    msg += `   ﹂👥 𝗦𝗶𝘀𝗮: ${sisa} User\n`;
    msg += `   ﹂📌 𝗞𝗹𝗮𝗶𝗺: <code>/claim ${key}</code>\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━━━
Cara Pakai: Salin kode di atas lalu ketik 
saat melakukan transaksi atau klik cek status.</blockquote>`;

  return editMenuMessage(ctx, msg, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔍 Cek Status Voucher", "cek_voucher_input")],
      [Markup.button.callback("🔙 Kembali", "back_home")]
    ])
  });
});


bot.action("cek_voucher_input", async (ctx) => {
  const userId = ctx.from.id;
  
  // Set state agar bot tahu user sedang ingin mengecek voucher
  userState[userId] = { step: "WAITING_VOUCHER_CHECK" };

  const checkText = `<blockquote>✦ ─────────────── ✦
  <b>Albyy ʙᴀɪʏʟᴇs ᴠᴀʟɪᴅᴀsɪ</b>
✦ ─────────────── ✦

🔍 <b>Pengecekan Kode Voucher</b>
Silakan ketik atau tempel <b>Kode Voucher</b> 
yang ingin Anda cek status validasinya.

[ 💡 <b>𝗖𝗢𝗡𝗧𝗢𝗛 𝗜𝗡𝗣𝗨𝗧</b> ]
➥ <code>DISKON10K</code>
➥ <code>PROMOUsername</code>

━━━━━━━━━━━━━━━━━━━━━━━
Ketik <b>Batal</b> atau klik tombol di bawah 
jika ingin membatalkan pengecekan.</blockquote>`;

  try {
    await editMenuMessage(ctx, checkText, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Batal & Kembali", "my_voucher")]
      ])
    });
  } catch (e) {
    console.error("[ERROR] cek_voucher_input:", e.message);
    // Fallback jika edit gagal
    await ctx.reply(checkText, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Batal & Kembali", "my_voucher")]
      ])
    });
  }
});


bot.action("owner_panel", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  db.isPanelOpen = !db.isPanelOpen;
  saveDb(db);
  const status = db.isPanelOpen ? "🟢 ONLINE" : "🔴 OFFLINE";
  safeReply(ctx, `<blockquote><b>Status panel sekarang:</b> ${status}</blockquote>`, { parse_mode: "HTML" });
});

// 1. ACTION HANDLER
bot.action("owner_broadcast", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  ctx.answerCbQuery().catch(() => {});
  
  userState[ctx.from.id] = { step: "WAITING_BROADCAST" };
  
  return ctx.reply("<blockquote>📢 <b>Silakan kirim pesan broadcast (teks, foto, atau video).</b>\nKetik /batal untuk membatalkan.</blockquote>", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("❌ Batalkan Broadcast", "cancel_broadcast")]
    ])
  });
});

// 2. MESSAGE HANDLER
bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (state?.step === "WAITING_BROADCAST" && userId === config.ownerId) {
    
    // Batalkan jika mengetik /batal
    if (ctx.message.text === "/batal") {
      delete userState[userId];
      await ctx.reply("<blockquote>❌ <b>Broadcast dibatalkan.</b></blockquote>", { parse_mode: "HTML" });
      return; 
    }

    userState[userId].step = "PROCESSING";

    const users = loadUsers(); 
    const totalTarget = users.length;
    let berhasil = 0;
    let gagal = 0;
    const failedIds = [];
    const startTime = Date.now();

    // Pesan status awal
    const statusMsg = await ctx.reply("<blockquote>⌛ <b>Memulai Broadcast...</b>\n<i>Sedang memproses antrean...</i></blockquote>", { parse_mode: "HTML" });

    for (let i = 0; i < totalTarget; i++) {
      const uid = users[i];
      
      try {
        // Meneruskan pesan (Teks, Foto, Video, dll)
        // Kita gunakan ctx.message.message_id langsung dari konteks saat ini
        await ctx.telegram.forwardMessage(uid, ctx.chat.id, ctx.message.message_id);
        berhasil++;
      } catch (e) {
        gagal++;
        failedIds.push(uid);
      }

      // Jeda anti-flood (Telegram limit: 30 msg/sec)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update progress setiap 15 user agar tidak kena limit edit message
      if (i % 15 === 0 || i === totalTarget - 1) {
        const persen = Math.floor(((i + 1) / totalTarget) * 100);
        try {
          await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
            `<blockquote><b>📣 Broadcast Berjalan...</b>\n\n` +
            `🔄 <b>PROSES:</b> ${persen}%\n` +
            `📊 <b>PROGRESS:</b> ${i + 1}/${totalTarget}\n\n` +
            `🟢 <b>Berhasil:</b> ${berhasil}\n` +
            `🔴 <b>Gagal:</b> ${gagal}</blockquote>`, 
            { parse_mode: "HTML" }
          );
        } catch (err) {}
      }
    }

    // Pembersihan database user yang tidak aktif
    if (failedIds.length > 0) {
      const updatedUsers = users.filter(id => !failedIds.includes(id));
      saveUsers(updatedUsers); 
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const finishDate = new Date().toLocaleString('id-ID');

    // Hapus pesan progress lama
    try { await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch (e) {}

    // Laporan Akhir
    await ctx.reply(
      `<blockquote>✅ <b>Broadcast Selesai!</b>\n\n` +
      `📫 <b>Total Target:</b> ${totalTarget}\n` +
      `🟢 <b>Berhasil:</b> ${berhasil}\n` +
      `🔴 <b>Gagal (Dihapus):</b> ${gagal}\n` +
      `⌚ <b>Durasi:</b> ${duration} detik\n` +
      `🗓️ <b>Selesai:</b> ${finishDate}</blockquote>`, 
      { parse_mode: "HTML" }
    );

    // Pin pesan yang baru saja di-broadcast
    try { await ctx.pinChatMessage(ctx.message.message_id); } catch (e) {}

    delete userState[userId];
    return; 
  }
  
  return next(); 
});


bot.action("cancel_broadcast", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  if (userState[ctx.from.id]?.step === "WAITING_BROADCAST") {
    delete userState[ctx.from.id];
    safeReply(ctx, "❌ Broadcast dibatalkan.");
    showOwnerMenu(ctx);
  }
});

bot.action("buyvps_start", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_start')) return;

  // Mengambil sisa slot langsung dari API (mengembalikan angka remain)
  const sisaVPS = await getDropletStatus();

  // Jika sisa slot 0 atau API error (mengembalikan 0)
  if (sisaVPS <= 0) {
    return editMenuMessage(ctx,
`<blockquote>🚫 <b>𝗦𝗧𝗢𝗞 𝗩𝗣𝗦 𝗦𝗨𝗗𝗔𝗛 𝗛𝗔𝗕𝗜𝗦!</b> 
<b>━━━━━━━━━━━━━━━━━━━━⨳</b>
📨 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗛𝘂𝗯𝘂𝗻𝗴𝗶 𝗢𝘄𝗻𝗲𝗿</b>
<b>𝗨𝗻𝘁𝘂𝗸 𝗦𝗲𝗴𝗲𝗿𝗮 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗩𝗣𝗦.</b></blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 BACK", callback_data: "shop_menu" }]]
        }
      }
    );
  }

  // --- TAMPILKAN MENU JIKA STOK MASIH TERSEDIA ---
  await editMenuMessage(ctx,
`🛒 <b>𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬 𝗩𝗜𝗥𝗧𝗨𝗔𝗟 𝗣𝗥𝗜𝗩𝗔𝗧𝗘 𝗦𝗘𝗥𝗩𝗘𝗥</b>
<b>❍━━━━━━━━━━━━━━━━━━━━━━❍</b>
🟢 <b>𝗟𝗢𝗪 𝗩𝗣𝗦</b>
▪️ 𝗚𝗮𝗿𝗮𝗻𝘀𝗶: <i>𝟭 𝗛𝗮𝗿𝗶 𝘂𝗻𝘁𝘂𝗸 𝘀𝘂𝘀𝗽𝗲𝗻</i>
▪️ 𝗥𝗲𝗽𝗹𝗮𝗰𝗲: <i>𝟭𝘅 𝗝𝗶𝗸𝗮 𝗴𝗮𝗿𝗮𝗻𝘀𝗶 𝗺𝗮𝘀𝗶𝗵 𝗮𝗸𝘁𝗶𝗳</i>
▪️ 𝗛𝗮𝗿𝗴𝗮: <b>${toRupiah(config.hargaVPS.low['2c2'])}</b>
<b>❍━━━━━━━━━━━━━━━━━━━━━━❍</b>
🟡 <b>𝗠𝗘𝗗𝗜𝗨𝗠 𝗩𝗣𝗦</b>
▪️ 𝗚𝗮𝗿𝗮𝗻𝘀𝗶: <i>𝟮 𝗛𝗮𝗿𝗶</i>
▪️ 𝗥𝗲𝗽𝗹𝗮𝗰𝗲: <i>𝟭𝘅 𝗝𝗶𝗸𝗮 𝗴𝗮𝗿𝗮𝗻𝘀𝗶 𝗺𝗮𝘀𝗶𝗵 𝗮𝗸𝘁𝗶𝗳</i>
▪️ 𝗛𝗮𝗿𝗴𝗮: <b>${toRupiah(config.hargaVPS.medium['2c2'])}</b>
<b>❍━━━━━━━━━━━━━━━━━━━━━━❍</b>
🔴 <b>𝗛𝗜𝗚𝗛 𝗩𝗣𝗦</b>
▪️ 𝗚𝗮𝗿𝗮𝗻𝘀𝗶: <i>𝟯 𝗛𝗮𝗿𝗶</i>
▪️ 𝗥𝗲𝗽𝗹𝗮𝗰𝗲: <i>𝟭𝘅 𝗝𝗶𝗸𝗮 𝗴𝗮𝗿𝗮𝗻𝘀𝗶 𝗺𝗮𝘀𝗶𝗵 𝗮𝗸𝘁𝗶𝗳</i>
▪️ 𝗛𝗮𝗿𝗴𝗮: <b>${toRupiah(config.hargaVPS.high['2c2'])}</b>
<b>❍━━━━━━━━━━━━━━━━━━━━━━❍</b>
✨ <b>𝗣𝗟𝗘𝗔𝗦𝗘 𝗦𝗘𝗟𝗘𝗖𝗧 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬</b>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🟢 LOW VPS", callback_data: "buyvps_pkg:low" }],
          [{ text: "🟡 MEDIUM VPS", callback_data: "buyvps_pkg:medium" }],
          [{ text: "🔴 HIGH VPS", callback_data: "buyvps_pkg:high" }],
          [{ text: "🔙 BACK", callback_data: "shop_menu" }]
        ]
      }
    }
  );
});

bot.action(/buyvps_pkg:(low|medium|high)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_pkg')) return;
  
  const paket = ctx.match[1];
  const userId = ctx.from.id;
  
  const statusDO = await getDropletStatus();

  if (!statusDO || statusDO.remain <= 0) {
    return editMenuMessage(ctx,
`<b>❌ 𝗦𝘁𝗼𝗰𝗸 𝗧𝗲𝗹𝗮ห 𝗛𝗮𝗯𝗶𝘀</b>

<b>Mohon Maaf Sebesar-besarnya 🙏</b>
<b>Stok VPS kami sudah habis (Limit Tercapai) 😞</b>

<b>Silahkan hubungi ADMIN untuk meminta restock VPS.</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "buyvps_start" }]]
        }
      }
    );
  }

  if (!userState[userId]) userState[userId] = {};
  userState[userId].vpsData = { paket };

  const dataHarga = config.hargaVPS?.[paket] || {};
  const listRam = [
    { id: 1, label: "2GB 2 CPU | 60GB SSD | 3TB BW", plan: "2c2" },
    { id: 2, label: "4GB 2 CPU | 80GB SSD | 4TB BW", plan: "4c2" },
    { id: 3, label: "8GB 4 CPU | 160GB SSD | 5TB BW", plan: "8c4" },
    { id: 4, label: "16GB 4 CPU | 200GB SSD | 8TB BW", plan: "16c4" },
    { id: 5, label: "16GB 8 CPU | 320GB SSD | 6TB BW", plan: "16c8" }
  ].map(x => ({ ...x, harga: dataHarga[x.plan] || 0 }));

  let teks = `<b>PILIH SPESIFIKASI VPS🖥️</b>\n`;
  teks += `<b>━━━━━━━━━━━━━</b>\n`;

  for (const item of listRam) {
    teks += `<b>[ ${item.id} ] ${item.label}</b>\n` +
            `<b>╰┈➤ Rp ${item.harga.toLocaleString("id-ID")} IDR</b>\n` +
            `<b>━━━━━━━━━━━━━</b>\n`;
  }

  teks += `\n<b>━━━━━━━━━━━━━</b>\n`;
  teks += `<b>✅STOK TERSEDIA : ${statusDO.remain} VPS</b>\n`;
  teks += `<b>━━━━━━━━━━━━━</b>`;

  const numericButtons = listRam.map(v => ({
    text: `${v.id}`,
    callback_data: `buyvps_ram:${v.plan}`
  }));

  const keyboard = [
    numericButtons,
    [{ text: "⬅️ Kembali", callback_data: "buyvps_start" }]
  ];

  await editMenuMessage(ctx, teks, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});


bot.action(/buyvps_ram:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_ram')) return;
  
  const plan = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.plan = plan;
  }

  // List OS sesuai urutan di foto
  const osFamily = [
    { id: 1, name: "UBUNTU", key: "ubuntu" },
    { id: 2, name: "DEBIAN", key: "debian" },
    { id: 3, name: "CENTOS", key: "centos" },
    { id: 4, name: "AIMALINUX", key: "almalinux" },
    { id: 5, name: "FEDORA", key: "fedora" },
    { id: 6, name: "ROCKYLINUX", key: "rocky" },
  ];

  // Format teks pesan sesuai gambar
  let teks = `<b>PILIH OS IMAGE VPS ⚙️</b>\n`;
  teks += `<b>──────────────────</b>\n\n`;

  osFamily.forEach(os => {
    teks += `${os.id}  ${os.name}\n`;
  });

  teks += `\n<b>──────────────────</b>`;

  // Membuat tombol angka dengan susunan grid 3 kolom (1-2-3 / 4-5-6)
  const buttons = osFamily.map(os => ({
    text: `${os.id}`,
    callback_data: `buyvps_osfamily:${os.key}`
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) {
    keyboard.push(buttons.slice(i, i + 3)); // Mengelompokkan tiap 3 tombol ke satu baris
  }

  // Tambahkan tombol kembali di paling bawah
  keyboard.push([
    { text: "⬅️ Kembali", callback_data: `buyvps_pkg:${userState[userId]?.vpsData?.paket}` }
  ]);

  await editMenuMessage(ctx, teks, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});

bot.action(/buyvps_osfamily:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_osfamily')) return;
  
  const osKey = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.osFamily = osKey;
  }

  const osVersions = {
    ubuntu: [
      { name: "UBUNTU 22.04", slug: "ubuntu-22-04-x64" },
      { name: "UBUNTU 24.04", slug: "ubuntu-24-04-x64" },
      { name: "UBUNTU 25.04", slug: "ubuntu-25-04-x64" },
    ],
    debian: [
      { name: "DEBIAN 12", slug: "debian-12-x64" },
      { name: "DEBIAN 13", slug: "debian-13-x64" },
    ],
    centos: [
      { name: "CENTOS STREAM 9", slug: "centos-stream-9-x64" },
    ],
    fedora: [
      { name: "FEDORA 42", slug: "fedora-42-x64" },
    ],
    almalinux: [
      { name: "ALMALINUX 8", slug: "almalinux-8-x64" },
      { name: "ALMALINUX 9", slug: "almalinux-9-x64" },
    ],
    rocky: [
      { name: "ROCKY LINUX 8", slug: "rockylinux-8-x64" },
      { name: "ROCKY LINUX 9", slug: "rockylinux-9-x64" },
    ]
  };

  const versionList = osVersions[osKey] || [];

  // Teks header dan list dibuat huruf besar semua
  let teks = `<b>PILIH OS VERSION VPS ⚙️</b>\n`;
  teks += `<b>━━━━━━━━━━━━━</b>\n\n`;

  versionList.forEach((v, index) => {
    teks += ` <b>${index + 1}  ${v.name.toUpperCase()}</b>\n`;
  });

  teks += `\n<b>━━━━━━━━━━━━━</b>`;

  // Tombol angka grid 3 kolom
  const buttons = versionList.map((v, index) => ({
    text: `${index + 1}`,
    callback_data: `buyvps_os:${v.slug}`
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) {
    keyboard.push(buttons.slice(i, i + 3));
  }

  keyboard.push([
    { text: "⬅️ Kembali", callback_data: `buyvps_ram:${userState[userId]?.vpsData?.plan}` }
  ]);

  await editMenuMessage(ctx, teks, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});


bot.action(/buyvps_os:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_os')) return;
  
  const osSlug = ctx.match[1];
  const userId = ctx.from.id;
  
  if (userState[userId]?.vpsData) {
    userState[userId].vpsData.os = osSlug;
  }

  const vpsRegions = [
    { id: "sgp1", name: "SINGAPORE" },
    { id: "nyc3", name: "NEW YORK" },
    { id: "sfo3", name: "SAN FRANCISCO" },
    { id: "ams3", name: "AMSTERDAM" },
    { id: "lon1", name: "LONDON" },
    { id: "fra1", name: "FRANKFURT" },
    { id: "tor1", name: "TORONTO" },
    { id: "blr1", name: "BANGALORE" },
    { id: "syd1", name: "SYDNEY" },
    { id: "atl1", name: "ATLANTA" }
  ];

  let text = `<b>PILIH REGION VPS📍</b>\n`;
  text += `<b>━━━━━━━━━━━━━</b>\n\n`;
  
  vpsRegions.forEach((r, i) => {
    const num = i + 1;
    const padding = num < 10 ? " " : "";
    text += ` <b>${padding}${num}  ${r.name}</b>\n`;
  });

  text += `\n<b>━━━━━━━━━━━━━</b>`;

  const buttons = vpsRegions.map((r, i) => ({
    text: `${i + 1}`,
    callback_data: `buyvps_region:${r.id}`
  }));

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 5) {
    keyboard.push(buttons.slice(i, i + 5));
  }

  keyboard.push([
    { text: "⬅️ KEMBALI", callback_data: `buyvps_osfamily:${userState[userId]?.vpsData?.osFamily}` }
  ]);

  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});


// --- HELPER: RENDER TEKS KONFIRMASI ---
const renderKonfirmasiVPS = (vpsData) => {
  // Pastikan qty dan harga selalu ada nilainya (default 0 atau 1) agar tidak error toLocaleString
  const qty = vpsData.qty || 1;
  const hargaSatuan = vpsData.harga || 0; 
  const totalHarga = hargaSatuan * qty;
  
  const spek = (vpsData.labelSpec || "").split('|'); 
  const ram = spek[0]?.trim() || "-";
  const cpu = spek[1]?.trim().replace("VCPU", "").replace("CPU", "") || "-";
  const ssd = spek[2]?.trim() || "-";
  const bw = spek[3]?.trim() || "-";

  return `<b>KONFIRMASI PESANAN ANDA🛠</b>
<b>━━━━━━━━━━━━━</b>

⚙️<b>RAM VPS :</b> ${ram}
🪪<b>CORE VPS :</b> ${cpu}
🖥<b>SSD VPS :</b> ${ssd}
📊<b>BW VPS :</b> ${bw}
📟<b>TYPE PAKET :</b> ${(vpsData.paket || "LOW").toUpperCase()}
🌐<b>GARANSI VPS :</b> 1 Hari
♻️<b>REPLACE JIKA MATI :</b> 1x Kali
🔄<b>KUANTITAS :</b> ${qty}
💰<b>HARGA / 1PCS :</b> Rp ${hargaSatuan.toLocaleString("id-ID")}

💰<b>Total Pembayaran :</b> Rp ${totalHarga.toLocaleString("id-ID")} IDR
<b>━━━━━━━━━━━━━</b>`;
};

// --- ACTION: SAAT PILIH REGION ---
bot.action(/buyvps_region:(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_region')) return;
  
  const region = ctx.match[1];
  const userId = ctx.from.id;
  
  if (!userState[userId]?.vpsData) return ctx.answerCbQuery("❌ Session Hilang");

  const vpsData = userState[userId].vpsData;
  vpsData.region = region;
  vpsData.qty = 1; 

  // --- VALIDASI ULANG HARGA ---
  // Pastikan harga diambil kembali dari config jika di vpsData ternyata kosong
  if (!vpsData.harga) {
    vpsData.harga = config.hargaVPS?.[vpsData.paket]?.[vpsData.plan] || 0;
  }

  const specList = {
    "2c2": "2GB | 2 CPU | 60GB | 3TB",
    "4c2": "4GB | 2 CPU | 80GB | 4TB",
    "8c4": "8GB | 4 CPU | 160GB | 5TB",
    "16c4": "16GB | 4 CPU | 200GB | 8TB",
    "16c8": "16GB | 8 CPU | 320GB | 6TB"
  };

  vpsData.labelSpec = specList[vpsData.plan] || "-";
  
  // Memanggil fungsi render dengan data yang sudah divalidasi
  const caption = renderKonfirmasiVPS(vpsData);

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➖", callback_data: "vps_qty_minus" },
          { text: `${vpsData.qty}`, callback_data: "vps_qty_show" },
          { text: "➕", callback_data: "vps_qty_plus" }
        ],
        [{ text: "💰 BAYAR VIA SALDO", callback_data: "buyvps_pay_saldo" }],
        [{ text: "🏦 BAYAR VIA QRIS", callback_data: "buyvps_pay_qris" }],
        [{ text: "⬅️ KEMBALI", callback_data: `buyvps_os:${vpsData.os}` }]
      ]
    }
  });
});

// --- ACTION: UPDATE QUANTITY PLUS ---
bot.action("vps_qty_plus", async (ctx) => {
  const userId = ctx.from.id;
  const vpsData = userState[userId]?.vpsData;
  if (!vpsData) return ctx.answerCbQuery("❌ Session Hilang");

  vpsData.qty = (vpsData.qty || 1) + 1;
  if (vpsData.qty > 10) vpsData.qty = 10; // Limit maksimal beli sekali checkout

  await ctx.editMessageText(renderKonfirmasiVPS(vpsData), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➖", callback_data: "vps_qty_minus" },
          { text: `${vpsData.qty}`, callback_data: "vps_qty_show" },
          { text: "➕", callback_data: "vps_qty_plus" }
        ],
        [{ text: "💰 BAYAR VIA SALDO", callback_data: "buyvps_pay_saldo" }],
        [{ text: "🏦 BAYAR VIA QRIS", callback_data: "buyvps_pay_qris" }],
        [{ text: "⬅️ KEMBALI", callback_data: `buyvps_os:${vpsData.os}` }]
      ]
    }
  }).catch(() => {});
  ctx.answerCbQuery();
});

// --- ACTION: UPDATE QUANTITY MINUS ---
bot.action("vps_qty_minus", async (ctx) => {
  const userId = ctx.from.id;
  const vpsData = userState[userId]?.vpsData;
  if (!vpsData) return ctx.answerCbQuery("❌ Session Hilang");

  vpsData.qty = Math.max(1, (vpsData.qty || 1) - 1);

  await ctx.editMessageText(renderKonfirmasiVPS(vpsData), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➖", callback_data: "vps_qty_minus" },
          { text: `${vpsData.qty}`, callback_data: "vps_qty_show" },
          { text: "➕", callback_data: "vps_qty_plus" }
        ],
        [{ text: "💰 BAYAR VIA SALDO", callback_data: "buyvps_pay_saldo" }],
        [{ text: "🏦 BAYAR VIA QRIS", callback_data: "buyvps_pay_qris" }],
        [{ text: "⬅️ KEMBALI", callback_data: `buyvps_os:${vpsData.os}` }]
      ]
    }
  }).catch(() => {});
  ctx.answerCbQuery();
});

// --- ACTION: SHOW QTY INFO ---
bot.action("vps_qty_show", (ctx) => {
  const qty = userState[ctx.from.id]?.vpsData?.qty || 1;
  ctx.answerCbQuery(`Jumlah Pesanan: ${qty}`, { show_alert: false });
});

bot.action(/smm_services_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("⏳ Memuat layanan...").catch(()=>{});
    
    const res = await callSmmApi('/services'); 
    
    let services = [];
    if (res.status === true && res.data) services = res.data;
    else if (Array.isArray(res)) services = res;
    else if (res.services) services = res.services;

    if (!services || services.length === 0) {
        return ctx.reply("❌ Gagal mengambil layanan. Cek Config API ID/Key.");
    }

    const categories = [...new Set(services.map(s => s.category))];
    const perPage = 5;
    const paginated = categories.slice(page * perPage, (page + 1) * perPage);

    const buttons = paginated.map((cat) => [
        Markup.button.callback(`📂 ${cat}`, `smm_cat_${categories.indexOf(cat)}_0`)
    ]);

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback('⬅️ 𝗣𝗿𝗲𝘃', `smm_services_${page - 1}`));
    if ((page + 1) * perPage < categories.length) nav.push(Markup.button.callback('Next ➡️', `smm_services_${page + 1}`));
    if (nav.length > 0) buttons.push(nav);
    buttons.push([Markup.button.callback('🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶', 'smm_menu')]);

    await editMenuMessage(ctx, "<b>📂 𝗣𝗜𝗟𝗜𝗛 𝗞𝗔𝗧𝗘𝗚𝗢𝗥𝗜 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 :</b>", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
    });
});

bot.action(/smm_cat_(\d+)_(\d+)/, async (ctx) => {
    const catIndex = parseInt(ctx.match[1]);
    const page = parseInt(ctx.match[2]);
    
    const res = await callSmmApi('/services');
    let services = res.data || res.services || (Array.isArray(res) ? res : []);
    
    const categories = [...new Set(services.map(s => s.category))];
    const targetCat = categories[catIndex];
    const filtered = services.filter(s => s.category === targetCat);
    
    const perPage = 5;
    const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

    let text = `<b>📦 𝖪𝖠𝖳𝖤𝖦𝖮𝖱𝖨 : ${targetCat}</b>\n\n`;
    const buttons = paginated.map(s => {
        text += `🆔 <b>𝖨𝖣 : ${s.id}</b>\n🏷 ${s.name}\n💰 ${toRupiah(s.price)}/1000\nMin: ${s.min} | Max: ${s.max}\n\n`;
        return [Markup.button.callback(`𝖡𝖾𝗅𝗂 𝖨𝖣: ${s.id}`, `smm_buy_${s.id}`)];
    });

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback('⬅️ 𝗣𝗿𝗲𝘃', `smm_cat_${catIndex}_${page - 1}`));
    if ((page + 1) * perPage < filtered.length) nav.push(Markup.button.callback('Next ➡️', `smm_cat_${catIndex}_${page + 1}`));
    if (nav.length > 0) buttons.push(nav);
    buttons.push([Markup.button.callback('🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶', `smm_services_0`)]);

    try { await ctx.deleteMessage(); } catch(e){}
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
});

bot.action(/smm_buy_(\d+)/, async (ctx) => {
    const serviceId = ctx.match[1];
    userState[ctx.from.id] = { step: "SMM_WAITING_LINK", serviceId: serviceId };
    
    await editMenuMessage(ctx, 
        `🔗 <b>𝗦𝗜𝗟𝗔𝗛𝗞𝗔𝗡 𝗞𝗜𝗥𝗜𝗠 𝗟𝗜𝗡𝗞 𝗧𝗔𝗥𝗚𝗘𝗧</b>\n\n☘︎ Silakan kirim link/username target untuk layanan ID <b>${serviceId}</b>.\n\n<i>Ketik /batal untuk membatalkan.</i>`, 
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[Markup.button.callback('❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻', 'smm_menu')]] }
        }
    );
});

bot.action("smm_history", async (ctx) => {
    const history = getSmmHistory(ctx.from.id);
    if (history.length === 0) return ctx.answerCbQuery("Belum ada riwayat.", { show_alert: true });

    let msg = "<b>📜 𝟱 𝗥𝗜𝗪𝗔𝗬𝗔𝗧 𝗧𝗘𝗥𝗔𝗞𝗛𝗜𝗥</b>\n\n";
    history.slice(0, 5).forEach(h => {
        msg += `🆔 <b>#${h.orderId}</b>\n📦 ${h.serviceName}\n💰 ${h.price}\n📅 ${h.date}\n\n`;
    });

    await editMenuMessage(ctx, msg, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[Markup.button.callback('🔙 Kembali', 'smm_menu')]] }
    });
});

bot.action("smm_check_status", (ctx) => {
    userState[ctx.from.id] = { step: "SMM_WAITING_STATUS_ID" };
    ctx.reply("🔍 <b>Kirim ID Pesanan:</b>", { 
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[Markup.button.callback('❌ Batal', 'smm_menu')]] } 
    });
});

bot.action("smm_exec_order", async (ctx) => {
    const userId = ctx.from.id;
    const pending = userState[userId]?.pendingOrder;

    if (!pending) {
        return ctx.answerCbQuery("❌ Sesi habis, ulangi pesanan.", { show_alert: true });
    }

    const dbSaldoPath = "./database/saldoOtp.json";
    const saldoData = JSON.parse(fs.readFileSync(dbSaldoPath, "utf8") || "{}");
    const userSaldo = saldoData[userId] || 0;

    if (userSaldo < pending.price) {
        return ctx.answerCbQuery("❌ Saldo tidak cukup!", { show_alert: true });
    }

    await ctx.editMessageText("⏳ <b>Memproses pesanan...</b>", { parse_mode: "HTML" });

    const orderRes = await callSmmApi('/order', {
        service: pending.serviceId,
        target: pending.target,
        quantity: pending.quantity
    });

    if (orderRes.status === true) {
        saldoData[userId] = userSaldo - pending.price;
        fs.writeFileSync(dbSaldoPath, JSON.stringify(saldoData, null, 2));

        const orderId = orderRes.order;
        saveSmmHistory(userId, {
            orderId: orderId, 
            serviceName: pending.serviceName,
            price: toRupiah(pending.price),
            date: new Date().toLocaleString("id-ID")
        });

        await ctx.editMessageText(
            `✅ <b>𝗢𝗥𝗗𝗘𝗥 𝗦𝗨𝗞𝗦𝗘𝗦!</b>\n` +
            `├⌑ 🆔 <b>𝖨𝖣 𝖮𝗋𝖽𝖾𝗋 :</b> <code>${orderId}</code>\n` +
            `├⌑ 📦 <b>𝖫𝖺𝗒𝖺𝗇𝖺𝗇 :</b> ${pending.serviceName}\n` +
            `├⌑ 💰 <b>𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(pending.price)}\n` +
            `└⌑ 📉 <b>𝖲𝗂𝗌𝖺 𝖲𝖺𝗅𝖽𝗈:</b> ${toRupiah(saldoData[userId])}`,
            { 
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali ke Menu", callback_data: "smm_menu" }]] }
            }
        );
    } else {
        const errorMsg = orderRes.msg || "Gagal memproses order.";
        await ctx.editMessageText(
            `❌ <b>𝗢𝗥𝗗𝗘𝗥 𝗚𝗔𝗚𝗔𝗟!</b>\n└⌑ Alasan: ${errorMsg}\n\n<i>Saldo tidak terpotong.</i>`,
            { 
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: [[{ text: "🔙 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶", callback_data: "smm_menu" }]] }
            }
        );
    }
    
    delete userState[userId];
});

const SCRIPT_REF_PATH = './referral/referral_scripts.json';

// Fungsi untuk Membaca Database Script Referral
function loadScriptRef() {
    try {
        if (!fs.existsSync(SCRIPT_REF_PATH)) {
            // Jika file tidak ada, buat file baru dengan array kosong
            fs.writeFileSync(SCRIPT_REF_PATH, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(SCRIPT_REF_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Gagal load database script referral:", e);
        return [];
    }
}

// Fungsi untuk Menyimpan Database Script Referral
function saveScriptRef(data) {
    try {
        fs.writeFileSync(SCRIPT_REF_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("Gagal save database script referral:", e);
        return false;
    }
}


// HANDLER PENERIMAAN FILE & DETAIL
bot.on("document", async (ctx, next) => {
  const userId = ctx.from.id;
  const state = userState[userId];

  if (userId !== config.ownerId) return next();

  // Step 1: Terima File ZIP
  if (state?.step === "WAITING_SCRIPT_FILE_REF") {
    const doc = ctx.message.document;
    if (!doc.file_name.endsWith(".zip")) return ctx.reply("<blockquote>❌ File harus format .zip!</blockquote>", { parse_mode: "HTML" });

    userState[userId] = {
      step: "WAITING_SCRIPT_DETAIL_REF",
      file_id: doc.file_id,
      temp_fileName: doc.file_name.replace(/\s/g, "_"),
    };
    return ctx.reply(`<blockquote>✅ <b>File diterima!</b>\n\nKirim detail dengan format:\n<b>Nama | Harga Point | Deskripsi</b>\n\nContoh: <i>Script VPS | 15 | Script Auto Install</i></blockquote>`, { parse_mode: "HTML" });
  }

  return next();
});

// ACTION BUTTON UNTUK OWNER
bot.action("add_script_referral", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_SCRIPT_FILE_REF" };
  ctx.reply(`<blockquote><b>📥 TAMBAH SCRIPT REFERRAL</b>\n\nSilahkan kirim file <b>.zip</b> sekarang.</blockquote>`,
    { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 Batal", callback_data: "menu_owner" }]] } }
  );
});

bot.action("del_script_referral", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  const scripts = loadScriptRef(); // Membaca referral_scripts.json

  if (scripts.length === 0) {
    return ctx.editMessageText("<blockquote>❌ <b>Belum ada script referral yang tersedia.</b></blockquote>", {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "menu_owner" }]]
      }
    });
  }

  // Membuat daftar tombol script yang ada
  const buttons = scripts.map((sc, i) => ([{ 
    text: `❌ [ ${sc.point} Poin ] ${sc.nama}`, 
    callback_data: `delref_sc_${i}` 
  }]));

  buttons.push([{ text: "🔙 Kembali", callback_data: "menu_owner" }]);

  ctx.editMessageText("<blockquote><b>🗑️ PILIH SCRIPT REFERRAL UNTUK DIHAPUS:</b>\n\n<i>Klik pada nama script untuk menghapusnya secara permanen.</i></blockquote>", { 
    parse_mode: "HTML", 
    reply_markup: { inline_keyboard: buttons } 
  }).catch(() => {
      ctx.reply("<blockquote><b>🗑️ Pilih script referral yang mau dihapus:</b></blockquote>", { 
        parse_mode: "HTML", 
        reply_markup: { inline_keyboard: buttons } 
      });
  });
});

bot.action(/delref_sc_(\d+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  try {
    const idx = parseInt(ctx.match[1]);
    const scripts = loadScriptRef();
    const sc = scripts[idx];

    if (!sc) {
      return await ctx.answerCbQuery("❌ Script sudah tidak ada.");
    }

    // Hapus script berdasarkan index
    const deletedName = sc.nama;
    scripts.splice(idx, 1);
    saveScriptRef(scripts); // Simpan perubahan ke referral_scripts.json

    await ctx.answerCbQuery(`✅ ${deletedName} berhasil dihapus!`);
    
    // Tampilkan pesan sukses
    await ctx.editMessageText(`<blockquote><b>✔️ BERHASIL DIHAPUS</b>\n\nScript <code>${deletedName}</code> telah dihapus dari daftar referral.</blockquote>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "del_script_referral" }]]
      }
    }).catch(() => { 
      ctx.reply("✔️ Script referral berhasil dihapus."); 
    });

  } catch (e) {
    console.error("del_script_referral error:", e);
    ctx.answerCbQuery("❌ Gagal menghapus script.");
  }
});


// ACTION: Tampilkan Daftar Script yang bisa ditukar
bot.action("tukar_point", async (ctx) => {
    try {
        const scripts = loadScriptRef();
        
        // FIX: Panggil database DULU sebelum variabel lain
        const db = readDb(); 
        const userId = ctx.from.id;
        const firstName = ctx.from.first_name;

        // FIX: Pastikan folder users ada agar tidak TypeError
        if (!db.users) db.users = {};
        if (!db.users[userId]) db.users[userId] = { coin: 0, refCount: 0 };

        if (scripts.length === 0) return ctx.answerCbQuery("❌ Belum ada script tersedia saat ini.", { show_alert: true });

        const userPoints = db.users[userId]?.coin || 0;

        // Teks Menu (Tetap sesuai permintaanmu)
        let menuText = `🎁 <b>PENUKARAN POINT REFERRAL — Premium Script</b>\n\n` +
                       `Halo <b>${firstName}</b> 👋\n` +
                       `Kumpulkan point sebanyak-banyaknya dan tukarkan dengan koleksi script premium kami secara gratis!\n\n` +
                       `📊 <b>STATISTIK POIN ANDA</b>\n` +
                       `├ ID Pengguna : <code>${userId}</code>\n` +
                       `└ Saldo Point : <b>${userPoints} Point</b>\n\n` +
                       `📋 <b>DAFTAR SCRIPT TERSEDIA :</b>\n` +
                       `Silahkan pilih salah satu produk di bawah ini. Pastikan point Anda cukup untuk melakukan penukaran. Sistem akan mengirimkan file secara otomatis setelah point dipotong.\n\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `<i>"Semakin banyak teman yang bergabung, semakin banyak script premium yang bisa kamu miliki!"</i>`;

        const buttons = scripts.map(s => ([{ 
            text: `[ ${s.point} Point ] [ ${s.nama} ]`, 
            callback_data: `buy_ref_${s.id}` 
        }]));
        
        buttons.push([{ text: "⬅️ KEMBALI KE MENU", callback_data: "referral" }]);

        await ctx.deleteMessage().catch(() => {});

        return await ctx.replyWithPhoto(config.startPhoto, {
            caption: menuText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        });

    } catch (err) {
        console.error("Error Menu Tukar Point:", err);
        ctx.answerCbQuery("❌ Gagal memuat daftar script.");
    }
});

bot.action(/^buy_ref_(\d+)$/, async (ctx) => {
    try {
        const scriptId = parseInt(ctx.match[1]);
        const userId = ctx.from.id;
        const firstName = ctx.from.first_name;
        const username = ctx.from.username ? `@${ctx.from.username}` : "User";
        
        const scripts = loadScriptRef();
        const db = readDb(); // FIX: Inisialisasi db di awal

        // FIX: Proteksi agar tidak undefined saat baca coin
        if (!db.users) db.users = {};
        if (!db.users[userId]) db.users[userId] = { coin: 0, refCount: 0 };

        const script = scripts.find(s => s.id === scriptId);

        if (!script) return ctx.answerCbQuery("❌ Script tidak ditemukan atau sudah dihapus.");

        const userPoints = db.users[userId]?.coin || 0;

        if (userPoints < script.point) {
            return ctx.answerCbQuery(`⚠️ Point kamu belum cukup!\nButuh: ${script.point} Pt | Milikmu: ${userPoints} Pt`, { show_alert: true });
        }

        // Eksekusi potong poin
        db.users[userId].coin -= script.point;
        saveDb(db); // Gunakan saveDb(db) agar data tersimpan permanen

        await ctx.answerCbQuery("✅ Transaksi Berhasil! Cek pesan di bawah.");
        await ctx.replyWithDocument(script.file_id, {
            caption: `<blockquote><b>🎁 PENUKARAN REFERRAL SUKSES!</b>\n\n` +
                     `📦 <b>Produk:</b> <code>${script.nama}</code>\n` +
                     `💰 <b>Biaya:</b> <code>${script.point} Point</code>\n` +
                     `📝 <b>Deskripsi:</b> <i>${script.deskripsi}</i>\n\n` +
                     `<i>Terima kasih telah aktif menggunakan program referral kami! File sudah siap di atas.</i></blockquote>`,
            parse_mode: "HTML"
        });

        // Notifikasi Channel
        const textChannel = `<b>🔥 PENUKARAN REFERRAL BARU!</b>\n\n` +
                            `<blockquote>👤 <b>Pembeli:</b> ${firstName} (${username})\n` +
                            `🎁 <b>Produk:</b> <code>${script.nama}</code>\n` +
                            `💎 <b>Harga:</b> <code>${script.point} Point Referral</code>\n` +
                            `📅 <b>Tanggal:</b> ${new Date().toLocaleString('id-ID')} WIB</blockquote>\n\n` +
                            `<b>Mau script gratis juga? Ajak temanmu bergabung sekarang dan kumpulkan pointnya! 🚀</b>`;

        if (config.testimoniChannel) {
            ctx.telegram.sendMessage(config.testimoniChannel, textChannel, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "🎁 Tukar Point Sekarang", url: `https://t.me/${ctx.botInfo.username}` }]] }
            }).catch(() => {});
        }

        // Notifikasi Owner
        const textOwner = `<b>📢 LOG PENUKARAN SCRIPT</b>\n\n` +
                          `➥ <b>User:</b> ${firstName} (<code>${userId}</code>)\n` +
                          `➥ <b>Produk:</b> ${script.nama}\n` +
                          `➥ <b>Sisa Point User:</b> ${db.users[userId].coin} Point`;

        ctx.telegram.sendMessage(config.ownerId, textOwner, { parse_mode: "HTML" }).catch(() => {});

    } catch (e) {
        console.error("Error Tukar Script:", e);
        ctx.answerCbQuery("❌ Terjadi kesalahan sistem.").catch(() => {});
    }
});

bot.action("add_script", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_SCRIPT_FILE" };
  safeReply(ctx, `<blockquote><b>📥 CARA TAMBAH SCRIPT</b>\n\n<b>1. Silahkan kirim file *.zip* sekarang.</b>\n<b>2. Setelah file terkirim, bot akan meminta detail produk.</b></blockquote>`,
    { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Batal", "menu_owner")]]) }
  );
});

bot.action("add_produk", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  
  userState[ctx.from.id] = { step: "WAITING_PRODUCT_TEXT" };
  
  const instruction = 
    `<blockquote><b>📦 TAMBAH PRODUK (SINGLE / BULK)</b>\n\n` +
    `Silahkan kirim detail dengan format:\n` +
    `<code>ISI | NAMA | HARGA | TOTAL</code>\n\n` +
    `<b>💡 Contoh Single (1 Produk):</b>\n` +
    `<code>Akun1:Pass1 | Netflix | 25000 | 1</code>\n\n` +
    `<b>🚀 Contoh Bulk (Banyak Sekaligus):</b>\n` +
    `<code>IsiA, IsiB | NamaA, NamaB | 1000, 2000 | 2</code>\n\n` +
    `<i>Note: Gunakan koma ( , ) untuk memisahkan antar produk jika memilih bulk add.</i></blockquote>`;

  safeReply(ctx, instruction, { 
    parse_mode: "HTML", 
    ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Batal", "menu_owner")]]) 
  });
});

bot.action("add_promo", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  
  userState[ctx.from.id] = { step: "WAITING_PROMO_DATA" };
  
  return safeReply(ctx, 
    "<b>───「 🎟️ BUAT KODE PROMO 」───</b>\n\n" +
    "Silakan kirim detail promo dengan format:\n" +
    "<code>KODE | KUOTA | DISKON</code>\n\n" +
    "📌 <b>Contoh:</b>\n" +
    "<code>HEMAT9K | 10 | 9000</code>\n\n" +
    "<i>Artinya kode HEMAT9K bisa dipakai 10 orang dengan diskon Rp 9.000</i>", 
    { 
      parse_mode: "HTML", 
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Batal", "menu_owner")]]) 
    }
  );
});

bot.action("pakai_promo", (ctx) => {
  userState[ctx.from.id] = { step: "WAITING_PROMO_INPUT" };
  
  return safeReply(ctx, 
    "<b>───「 🎫 INPUT KODE PROMO 」───</b>\n\n" +
    "Silakan ketik <b>Kode Promo</b> yang kamu miliki untuk mendapatkan diskon khusus.", 
    { 
      parse_mode: "HTML", 
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Batal", "back_home")]]) 
    }
  );
});

bot.action("add_app", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_APP_TEXT" };
  safeReply(ctx, "<blockquote><b>✏️ Kirim detail App Premium dengan format:</b>\n<code>Nama | Harga | Deskripsi</code>\n\n<b>Contoh:</b>\n<code>CANVA PRO | 3500 | Akses premium aktif</code></blockquote>", { parse_mode: "HTML" });
});

bot.action("del_script", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  if (db.scripts.length === 0) return ctx.editMessageText("Belum ada produk script.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]));

  const buttons = db.scripts.map((sc, i) => [Markup.button.callback(`❌ ${sc.nama}`, `delete_sc_${i}`)]);
  buttons.push([Markup.button.callback("🔙 Kembali", "menu_owner")]);
  ctx.editMessageText("<blockquote><b>🗑️ Pilih script yang mau dihapus:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) })
    .catch(() => {
      safeReply(ctx, "<blockquote><b>🗑️ Pilih script yang mau dihapus:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
    });
});

bot.action("del_produk", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  
  // Baca database produk.json
  let dbProduk = [];
  if (fs.existsSync(pathrasya)) {
    dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  }

  if (dbProduk.length === 0) {
    return ctx.editMessageText("<blockquote>❌ <b>Belum ada produk terdaftar.</b></blockquote>", { 
      parse_mode: "HTML", 
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) 
    });
  }

  // Generate tombol: Nama Produk + Jumlah Stok
  const buttons = dbProduk.map((p) => {
    const stockCount = p.stok ? p.stok.length : 0;
    return [Markup.button.callback(`❌ ${p.nama} (${stockCount} Pcs)`, `confirm_del_prod_${p.id}`)];
  });

  buttons.push([Markup.button.callback("🔙 Kembali", "menu_owner")]);

  ctx.editMessageText("<blockquote><b>🗑️ Pilih produk yang mau dihapus:</b>\n<i>Klik produk untuk melihat detail stok.</i></blockquote>", { 
    parse_mode: "HTML", 
    ...Markup.inlineKeyboard(buttons) 
  });
});

bot.action(/^confirm_del_prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  let dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const pIndex = dbProduk.findIndex(p => p.id == productId);
  const item = dbProduk[pIndex];

  if (!item) return ctx.answerCbQuery("Produk tidak ditemukan!");

  const stockCount = item.stok.length;

  // JIKA STOK HANYA 1: Langsung hapus produknya dari list
  if (stockCount <= 1) {
    dbProduk.splice(pIndex, 1);
    fs.writeFileSync(pathrasya, JSON.stringify(dbProduk, null, 2));
    await ctx.answerCbQuery("✅ Produk berhasil dihapus!");
    return ctx.editMessageText(`<blockquote>✅ <b>Produk ${item.nama} telah dihapus!</b></blockquote>`, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "del_produk")]])
    });
  }

  // JIKA STOK LEBIH DARI 1: Munculkan pilihan nomor stok
  const stockButtons = [];
  item.stok.forEach((isi, i) => {
    // Tombol angka 1, 2, 3...
    stockButtons.push(Markup.button.callback(`${i + 1}`, `del_stok_id_${productId}_idx_${i}`));
  });

  // Susun tombol angka maksimal 5 per baris
  const keyboard = [];
  for (let i = 0; i < stockButtons.length; i += 5) {
    keyboard.push(stockButtons.slice(i, i + 5));
  }
  
  // Tambahkan tombol Hapus Semua di bawah angka
  keyboard.push([Markup.button.callback("🗑️ Hapus Semua (Satu Produk)", `del_all_prod_${productId}`)]);
  keyboard.push([Markup.button.callback("🔙 Batal", "del_produk")]);

  ctx.editMessageText(`<blockquote><b>📦 Produk: ${item.nama}</b>\n\nProduk ini memiliki <b>${stockCount} stok</b>.\nSilahkan pilih nomor stok yang ingin dihapus:</blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(keyboard)
  });
});

// Hapus stok spesifik berdasarkan index
bot.action(/^del_stok_id_(.+)_idx_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const stockIndex = parseInt(ctx.match[2]);
  
  let dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const pIndex = dbProduk.findIndex(p => p.id == productId);
  const item = dbProduk[pIndex];

  if (!item) return ctx.answerCbQuery("Produk tidak ditemukan!");

  // Hapus item pada index tersebut
  item.stok.splice(stockIndex, 1);

  // Jika setelah dihapus stok jadi kosong, hapus produknya sekalian (opsional)
  if (item.stok.length === 0) {
    dbProduk.splice(pIndex, 1);
  }

  fs.writeFileSync(pathrasya, JSON.stringify(dbProduk, null, 2));
  await ctx.answerCbQuery("✅ Stok nomor " + (stockIndex + 1) + " dihapus!");
  
  // Refresh menu
  return ctx.editMessageText(`<blockquote>✅ <b>Stok nomor ${stockIndex + 1} berhasil dihapus!</b></blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "del_produk")]])
  });
});

// Hapus keseluruhan produk (Bulk Delete)
bot.action(/^del_all_prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  let dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const newDb = dbProduk.filter(p => p.id != productId);

  fs.writeFileSync(pathrasya, JSON.stringify(newDb, null, 2));
  await ctx.answerCbQuery("✅ Produk dihapus total!");
  
  return ctx.editMessageText(`<blockquote>✅ <b>Produk berhasil dihapus dari database!</b></blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "del_produk")]])
  });
});


bot.action("del_app", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const db = readDb();
  if ((db.apps || []).length === 0) return ctx.editMessageText("Belum ada app.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]));

  const buttons = db.apps.map((a, i) => [Markup.button.callback(`❌ ${a.nama}`, `delete_app_${i}`)]);
  buttons.push([Markup.button.callback("🔙 Kembali", "menu_owner")]);
  ctx.editMessageText("<blockquote><b>🗑️ Pilih app yang mau dihapus:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
});

bot.action("menu_integrations", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("Set API DigitalOcean", "owner_set_do")],
    [Markup.button.callback("Set API Panel", "owner_set_panel")],
    [Markup.button.callback("🔙 Kembali", "menu_owner")]
  ]);
  safeReply(ctx, "<b>Integrasi</b>\nPilih yang ingin diset:", { parse_mode: "HTML", ...kb });
});

bot.action("owner_set_do", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_SET_DO_TOKEN" };
  safeReply(ctx, "Kirim DigitalOcean API Token (Bearer):", { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) });
});

bot.action("owner_set_panel", (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  userState[ctx.from.id] = { step: "WAITING_SET_PANEL" };
  safeReply(ctx, "<b>Format:</b>\n<code>domain|apikey</code>", { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) });
});

bot.action("list_apps", (ctx) => {
  const db = readDb();
  if ((db.apps || []).length === 0) return safeReply(ctx, "Tidak ada app.");
  const isOwner = ctx.from.id === config.ownerId;
  db.apps.forEach((x, i) => {
    const stock = (x.accounts || []).length;
    const text = `<blockquote><b>📱 ${x.nama}</b>\n<b>Harga:</b> ${toRupiah(x.harga)}\n<b>Stock:</b> ${stock}\n${x.deskripsi || ''}</blockquote>`;
    const buttons = [];
    if (isOwner) {
      buttons.push([ Markup.button.callback("📄 List Account", `list_accounts_${i}`) ]);
    }
    safeReply(ctx, text, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  });
});

bot.action("buyvps_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const vpsData = userState[userId]?.vpsData;

  if (!vpsData) return ctx.answerCbQuery("❌ Data order tidak ditemukan!", true);

  // --- 1. CEK STOK REAL-TIME ---
  const statusDO = await getDropletStatus();
  const sisaStok = statusDO?.remain || 0;
  const qtyBeli = vpsData.qty || 1;

  // Jika stok benar-benar habis (0)
  if (sisaStok <= 0) {
    return editMenuMessage(ctx,
`<blockquote>🚫 <b>𝗦𝗧𝗢𝗞 𝗩𝗣𝗦 𝗦𝗨𝗗𝗔𝗛 𝗛𝗔𝗕𝗜𝗦!</b> 
<b>━━━━━━━━━━━━━━━━━━━━</b>
📨 <b>𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗛𝘂𝗯𝘂𝗻𝗴𝗶 𝗢𝘄𝗻𝗲𝗿</b>
<b>𝗨𝗻𝘁𝘂𝗸 𝗦𝗲𝗴𝗲𝗿𝗮 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗩𝗣𝗦.</b></blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 BACK", callback_data: "buyvps_start" }]]
        }
      }
    );
  }

  // Jika stok ada tapi tidak cukup untuk jumlah yang dibeli (misal stok 5 beli 7)
  if (qtyBeli > sisaStok) {
    return ctx.answerCbQuery(
      `❌ Stok tidak cukup!\n\nSisa stok saat ini hanya ${sisaStok} VPS, sedangkan Anda ingin membeli ${qtyBeli} VPS.`, 
      { show_alert: true }
    );
  }

  // --- 2. CEK SALDO USER ---
  const totalHarga = vpsData.harga * qtyBeli;
  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < totalHarga) {
    return ctx.answerCbQuery(`❌ Saldo tidak mencukupi!\nTotal: ${toRupiah(totalHarga)}\nSaldo Anda: ${toRupiah(userSaldo)}`, true);
  }

  // --- 3. EKSEKUSI POTONG SALDO ---
  saldoDB[userId] -= totalHarga;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(
    `<b>✅ PEMBAYARAN BERHASIL</b>\n\n` +
    `Total: <b>${toRupiah(totalHarga)}</b>\n` +
    `Jumlah: <b>${qtyBeli} Unit</b>\n\n` +
    `<i>Pesanan VPS sedang diproses oleh sistem...</i>`, 
    { parse_mode: "HTML" }
  );

  // --- 4. KIRIM PRODUK ---
  await sendProductToUser(ctx, {
    type: "vps",
    vpsData: { ...vpsData, totalHarga }
  });
  
  // --- 5. KIRIM TESTIMONI ---
  await sendTestimoniKeChannel(
    userName, 
    userId, 
    `VPS ${vpsData.paket.toUpperCase()} (${qtyBeli}X)`, 
    totalHarga
  );

  // --- 6. NOTIF OWNER ---
  const ownerMsg = 
    `<b>🚀 VPS TERJUAL (SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 BUYER 〕</b>\n` +
    `➥ <b>Nama :</b> ${userName}\n` +
    `➥ <b>ID   :</b> <code>${userId}</code>\n\n` +
    `<b>〔 🖥️ DETAIL VPS 〕</b>\n` +
    `➥ <b>Paket :</b> ${vpsData.paket.toUpperCase()}\n` +
    `➥ <b>Qty   :</b> ${qtyBeli} Unit\n` +
    `➥ <b>Region:</b> ${vpsData.region}\n` +
    `➥ <b>OS    :</b> ${vpsData.os}\n\n` +
    `<b>〔 💳 PEMBAYARAN 〕</b>\n` +
    `➥ <b>Total :</b> <code>${toRupiah(totalHarga)}</code>\n` +
    `➥ <b>Sisa  :</b> ${toRupiah(saldoDB[userId])}\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
});


bot.action("buyvps_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buyvps_pay_qris')) return;
  
  const userId = ctx.from.id;
  const vpsData = userState[userId]?.vpsData;

  if (!vpsData) {
    return ctx.answerCbQuery("❌ Data VPS tidak ditemukan!", { show_alert: true });
  }

  // Mengambil kuantitas, default ke 1 jika tidak ada
  const qtyBeli = vpsData.qty || 1;
  
  // Menghitung total nominal berdasarkan kuantitas
  const nominalTotal = vpsData.harga * qtyBeli;

  // Mengubah Item Name agar mencantumkan (xJumlah)
  const itemName = `VPS ${vpsData.paket.toUpperCase()} (x${qtyBeli}) - ${vpsData.plan} - ${vpsData.region}`;

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Eksekusi pembayaran dengan nominal total dan info kuantitas
  await handlePayment(ctx, nominalTotal, itemName, {
    type: "vps",
    vpsData: { ...vpsData, totalHarga: nominalTotal }
  });
});


bot.action("manual_payments_menu", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  ctx.answerCbQuery().catch(()=>{});
  
  const payments = readManualPayments();
  const pendingCount = payments.filter(p => p.status === "pending").length;
  
  safeReply(ctx, `<blockquote><b>🧾 𝗠𝗲𝗻𝘂 𝗣𝗮𝘆𝗺𝗲𝗻𝘁 𝗠𝗮𝗻𝘂𝗮𝗹</b>\n<b>𝖯𝖾𝗇𝖽𝗂𝗇𝗀:</b> ${pendingCount}</blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("📋 𝗟𝗶𝘀𝘁 𝗣𝗲𝗻𝗱𝗶𝗻𝗴", "list_pending_payments") ],
      [ Markup.button.callback("📜 𝗔𝗹𝗹 𝗣𝗮𝘆𝗺𝗲𝗻𝘁", "list_all_payments") ],
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]
    ])
  });
});

bot.action("check_saldo_user", async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
  const username = ctx.from.username ? `@${ctx.from.username}` : "Tidak Ada";
  const saldo = getSaldo(userId);

  await ctx.answerCbQuery();

  await editMenuMessage(ctx, 
    `<blockquote><b>📊 𝗨𝗦𝗘𝗥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 𝗗𝗔𝗦𝗛𝗕𝗢𝗔𝗥𝗗</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>〔 👤 𝗗𝗘𝗧𝗔𝗜𝗟 𝗔𝗞𝗨𝗡 〕</b>
➥ <b>First Name :</b> <code>${firstName}</code>
➥ <b>Username   :</b> <code>${username}</code>
➥ <b>User ID    :</b> <code>${userId}</code>

<b>〔 💳 𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗔𝗟𝗗𝗢 〕</b>
➔ <b>Total :</b> <code>${toRupiah(saldo)}</code>

━━━━━━━━━━━━━━━━━━━━━━
<i>"Data akun Anda tersinkronisasi otomatis dengan sistem keamanan kami."</i></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "➕ TOP UP", callback_data: "topup_saldos" },
            { text: "🛒 SHOP MENU", callback_data: "shop_menu" }
          ],
          [{ text: "🔙 BACK", callback_data: "back_home" }]
        ]
      }
    }
  );
});

bot.action("riwayat_trx_user", async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
  const historyPath = './database/historytrx.json';
  
  await ctx.answerCbQuery();

  // --- LOGIKA AMBIL HISTORY ---
  let listHistory = "<i>Belum ada riwayat transaksi.</i>";
  
  if (fs.existsSync(historyPath)) {
    try {
      const allHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      // Filter hanya milik user ini dan ambil 5 transaksi terakhir
      const userHistory = allHistory
        .filter(trx => trx.userId === userId)
        .reverse() // Supaya yang terbaru di atas
        .slice(0, 5); // Ambil 5 saja agar pesan tidak terlalu panjang

      if (userHistory.length > 0) {
        listHistory = userHistory.map((trx, i) => {
          return `${i + 1}. <b>${trx.productName}</b>\n   └ 📅 <code>${trx.timestamp}</code>\n   └ 💰 <code>${toRupiah(trx.price)}</code>`;
        }).join("\n\n");
      }
    } catch (e) {
      console.error("Gagal membaca history:", e.message);
      listHistory = "⚠️ <i>Gagal memuat riwayat.</i>";
    }
  }

  // --- TAMPILKAN DASHBOARD ---
  await editMenuMessage(ctx, 
    `<blockquote><b>📊 𝗨𝗦𝗘𝗥 𝗧𝗥𝗔𝗡𝗦𝗔𝗖𝗧𝗜𝗢𝗡 𝗛𝗜𝗦𝗧𝗢𝗥𝗬</b>
━━━━━━━━━━━━━━━━━━━━━━

<b>〔 👤 𝗗𝗘𝗧𝗔𝗜𝗟 𝗔𝗞𝗨𝗡 〕</b>
➥ <b>User :</b> <code>${firstName}</code>
➥ <b>ID   :</b> <code>${userId}</code>

<b>〔 📜 𝟱 𝗧𝗥𝗔𝗡𝗦𝗔𝗞𝗦𝗜 𝗧𝗘𝗥𝗔𝗞𝗛𝗜𝗥 〕</b>
${listHistory}

━━━━━━━━━━━━━━━━━━━━━━
<i>"Data diperbarui otomatis setiap kali transaksi berhasil."</i></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🛍️ BELI LAGI", callback_data: "shop_menu" }
          ],
          [{ text: "🔙 BACK", callback_data: "back_home" }]
        ]
      }
    }
  );
});


bot.action("list_pending_payments", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  
  const payments = readManualPayments();
  const pending = payments.filter(p => p.status === "pending");
  
  if (pending.length === 0) {
    safeReply(ctx, "✅ Tidak ada pembayaran pending.");
    return showOwnerMenu(ctx);
  }
  
  let message = "<b>📋 Pembayaran Pending</b>\n\n";
  pending.forEach((p, i) => {
    message += `<b>${i+1}. ${p.userName} (${p.userId})</b>\n`;
    message += `<code>   Item:</code> ${p.itemName}\n`;
    message += `<code>   Amount:</code> ${toRupiah(p.amount)}\n`;
    message += `<code>   Time:</code> ${new Date(p.timestamp).toLocaleString()}\n`;
    message += `   [Verify](tg://user?id=${p.userId})\n\n`;
  });
  
  safeReply(ctx, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "manual_payments_menu") ]
    ])
  });
});

bot.action("list_all_payments", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  
  const payments = readManualPayments();
  
  if (payments.length === 0) {
    safeReply(ctx, "📭 Belum ada riwayat pembayaran manual.");
    return showOwnerMenu(ctx);
  }
  
  let message = "<b>📜 Riwayat Semua Pembayaran Manual</b>\n\n";
  payments.forEach((p, i) => {
    const statusEmoji = p.status === "approved" ? "✅" : p.status === "rejected" ? "❌" : "⏳";
    message += `<b>${i+1}. ${statusEmoji} ${p.userName}</b>\n`;
    message += `<code>   Item:</code> ${p.itemName}\n`;
    message += `<code>   Amount:</code> ${toRupiah(p.amount)}\n`;
    message += `<code>   Status:</code> ${p.status}\n`;
    message += `<code>   Time:</code> ${new Date(p.timestamp).toLocaleString()}\n\n`;
  });
  
  safeReply(ctx, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("🔙 Kembali", "manual_payments_menu") ]
    ])
  });
});
bot.action("change_payment", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  ctx.answerCbQuery().catch(()=>{});
  
  const active = getActivePaymentMethod();
  
  safeReply(ctx, `<blockquote><b>🔧 Payment aktif saat ini:</b> <code>${active.toUpperCase()}</code>\n<b>Pilih payment baru:</b></blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [ Markup.button.callback("💳 𝗣𝗮𝗸𝗮𝘀𝗶𝗿 (𝗢𝘁𝗼𝗺𝗮𝘁𝗶𝘀)", "set_payment_pakasir") ],
      [ Markup.button.callback("👨‍💼 𝗠𝗮𝗻𝘂𝗮𝗹 (𝗤𝗥𝗜𝗦 𝗙𝗼𝘁𝗼)", "set_payment_manual") ],
      [ Markup.button.callback("🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", "menu_owner") ]
    ])
  });
});

bot.action("set_payment_pakasir", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  setActivePaymentMethod("pakasir");
  safeReply(ctx, "<blockquote>✅ <b>Payment berhasil diganti ke PAKASIR</b></blockquote>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
});

bot.action("set_payment_manual", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  setActivePaymentMethod("manual");
  safeReply(ctx, "<blockquote>✅ <b>Payment berhasil diganti ke MANUAL (QRIS FOTO)</b></blockquote>", { parse_mode: "HTML" });
  showOwnerMenu(ctx);
});


bot.action(/buy_sc_(\d+)/, async (ctx) => {
  try {
    if (!await requirePrivateChat(ctx, 'buy_sc')) return;

    const index = parseInt(ctx.match[1]);
    const db = readDb();
    const item = db.scripts[index];
    const userId = ctx.from.id;
    const saldoUser = getSaldo(userId);

    if (!item || !item.file_id)
      return safeReply(ctx, "❌ Script tidak ditemukan / file hilang.");

    // Simpan data script sementara ke state
    userState[userId] = {
      buyScript: {
        index: index,
        nama: item.nama,
        harga: item.harga
      }
    };

    const captionMenu = `<b>🛒 KONFIRMASI PEMBELIAN SCRIPT</b>
<b>━━━━━━━━━━━━━━━━━━━━━</b>

<b>〔 📂 DETAIL SCRIPT 〕</b>
➥ <b>Nama    :</b> ${item.nama}
➥ <b>Harga   :</b> <code>${toRupiah(item.harga)}</code>

<b>〔 👤 INFO SALDO 〕</b>
➥ <b>Saldo Mu :</b> <code>${toRupiah(saldoUser)}</code>

<b>━━━━━━━━━━━━━━━━━━━━━</b>
<i>Silakan pilih metode pembayaran di bawah:</i>`;

    await ctx.editMessageText(captionMenu, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("💰 Bayar via Saldo", "pay_script_saldo")],
        [Markup.button.callback("🏦 Bayar via QRIS", "pay_script_qris")],
        [Markup.button.callback("🔙 Batal", "menu_scripts")] // Sesuaikan callback menu script kamu
      ])
    });

  } catch (err) {
    console.error(err);
  }
});

bot.action("pay_script_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const state = userState[userId]?.buyScript;

  if (!state) return ctx.answerCbQuery("❌ Sesi habis, ulangi order.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < state.harga) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membeli script ini!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= state.harga;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(`<b>✅ BERHASIL!</b> Saldo terpotong <code>${toRupiah(state.harga)}</code>.\n<i>Mengirim file script...</i>`, { parse_mode: "HTML" });

  // Kirim Produk (Gunakan sendProductToUser agar otomatis mengirim file_id)
  await sendProductToUser(ctx, {
    type: "script",
    index: state.index
  });

  // --- NOTIF OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 SCRIPT TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 BUYER 〕</b>\n` +
    `➥ <b>Nama :</b> ${userName}\n` +
    `➥ <b>ID   :</b> <code>${userId}</code>\n\n` +
    `<b>〔 📂 SCRIPT 〕</b>\n` +
    `➥ <b>Item :</b> ${state.nama}\n` +
    `➥ <b>Total:</b> <code>${toRupiah(state.harga)}</code>\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus sesuai permintaan
});


bot.action("pay_script_qris", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyScript;

  if (!state) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  const db = readDb();
  const item = db.scripts[state.index];

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks loading "Menyiapkan..."
  await handlePayment(
    ctx, 
    item.harga, 
    "Script: " + item.nama, 
    {
      type: "script",
      index: state.index
    }
  );
});



bot.action(/buy_app_(\d+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'buy_app')) return;
  
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const stock = (app.accounts || []).length;
  if (stock <= 0) return ctx.answerCbQuery("❌ Stock habis.");

  userState[ctx.from.id] = {
    step: "PURCHASE_APP",
    appIndex: idx,
    qty: 1,
    message: null
  };

  const base = parseInt(app.harga) || 0;
  const qty = 1;
  const total = calcTotalPrice(base, qty);
  const caption = renderPurchaseText(app, qty, total);
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 Buy Now", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 Batal", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/app_qty_minus_(\d+)/, async (ctx) => {
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  if (!userState[uid] || userState[uid].step !== "PURCHASE_APP" || userState[uid].appIndex !== idx) {
    userState[uid] = { step: "PURCHASE_APP", appIndex: idx, qty: 1, message: null };
  }
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("❌ App tidak ditemukan.");
    return;
  }
  userState[uid].qty = Math.max(1, (userState[uid].qty || 1) - 1);
  const qty = userState[uid].qty;
  const base = parseInt(app.harga) || 0;
  const stock = (app.accounts || []).length;
  if (qty > stock) userState[uid].qty = stock;
  const total = calcTotalPrice(base, userState[uid].qty);
  const caption = renderPurchaseText(app, userState[uid].qty, total);

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${userState[uid].qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 Buy Now", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 Batal", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/choose_service(_page_(\d+))?/, async (ctx) => {
  const page = ctx.match[2] ? parseInt(ctx.match[2]) : 1;
  const perPage = 20;
  const apiKey = config.RUMAHOTP;

  try {
    if (!ctx.match[2]) {
       await ctx.editMessageCaption("⏳ <b>Memuat daftar layanan...</b>", { parse_mode: "HTML" }).catch(() => {});
    }

    if (globalNokos.cachedServices.length === 0) {
      const res = await axios.get("https://www.rumahotp.com/api/v2/services", { headers: { "x-apikey": apiKey } });
      if (res.data.success) globalNokos.cachedServices = res.data.data;
    }

    const services = globalNokos.cachedServices;
    const totalPages = Math.ceil(services.length / perPage);
    const start = (page - 1) * perPage;
    const list = services.slice(start, start + perPage);

    const buttons = list.map(srv => [{
      text: `${srv.service_name}`,
      callback_data: `service_${srv.service_code}`
    }]);

    const nav = [];
    if (page > 1) nav.push({ text: "⬅️ 𝗣𝗿𝗲𝘃", callback_data: `choose_service_page_${page - 1}` });
    if (page < totalPages) nav.push({ text: "➡️ NEXT", callback_data: `choose_service_page_${page + 1}` });
    if (nav.length) buttons.push(nav);

    buttons.push([{ text: "💰 DEPOSIT", callback_data: "topup_nokos" }]); 
    buttons.push([{ text: "🔙 BACK", callback_data: "shop_menu" }]);

    const caption = `<b>📱 𝗗𝗔𝗙𝗧𝗔𝗥 𝗔𝗣𝗟𝗜𝗞𝗔𝗦𝗜 𝗢𝗧𝗣</b>\n\nSilakan pilih aplikasi:\nHalaman ${page}/${totalPages}`;

    globalNokos.lastServicePhoto[ctx.from.id] = { chatId: ctx.chat.id, messageId: ctx.callbackQuery.message.message_id };

    if (config.ppthumb && !ctx.match[2]) {
       await editMenuMessageWithPhoto(ctx, config.ppthumb, caption, { reply_markup: { inline_keyboard: buttons } });
    } else {
       await ctx.editMessageCaption(caption, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    }

  } catch (error) {
    console.error(error);
    await ctx.answerCbQuery("❌ Gagal memuat layanan.");
  }
});

bot.action(/service_(.+)/, async (ctx) => {
  const serviceId = ctx.match[1];
  const apiKey = config.RUMAHOTP;

  await ctx.editMessageCaption("⏳ <b>Memuat negara...</b>", { parse_mode: "HTML" }).catch(() => {});

  try {
    if (!globalNokos.cachedCountries[serviceId]) {
      const res = await axios.get(`https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`, {
        headers: { "x-apikey": apiKey }
      });
      if (res.data.success) {
         globalNokos.cachedCountries[serviceId] = res.data.data.filter(x => x.pricelist && x.pricelist.length > 0);
      }
    }

    const countries = globalNokos.cachedCountries[serviceId] || [];
    if (countries.length === 0) return ctx.editMessageCaption("❌ Negara tidak tersedia.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text: "🔙 Kembali", callback_data: "choose_service"}]] } });

    const slice = countries.slice(0, 20);
    
    const buttons = slice.map(c => [{
      text: `${c.name} (${c.stock_total})`,
      callback_data: `country_${serviceId}_${c.iso_code}_${c.number_id}`
    }]);

    buttons.push([{ text: "🔙 KEMBALI", callback_data: "choose_service" }]);

    await ctx.editMessageCaption(`<b>🌍 𝗣𝗜𝗟𝗜𝗛 𝗡𝗘𝗚𝗔𝗥𝗔</b>\nLayanan ID: ${serviceId}`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (e) {
    ctx.answerCbQuery("Error memuat negara");
  }
});

bot.action(/country_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, serviceId, iso, numberId] = ctx.match;
  const apiKey = config.RUMAHOTP;
  const untung = config.UNTUNG_NOKOS || 500;

  await ctx.editMessageCaption("⏳ <b>Memuat harga...</b>", { parse_mode: "HTML" }).catch(() => {});

  try {
    let countryData = globalNokos.cachedCountries[serviceId]?.find(c => String(c.number_id) === String(numberId));
    
    if (!countryData) {
       const res = await axios.get(`https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`, { headers: { "x-apikey": apiKey } });
       countryData = res.data.data.find(c => String(c.number_id) === String(numberId));
    }

    if (!countryData) return ctx.answerCbQuery("Negara data error");

    const providers = (countryData.pricelist || [])
      .filter(p => p.available && p.stock > 0)
      .map(p => {
        const finalPrice = (parseInt(p.price) || 0) + untung;
        return { ...p, finalPrice };
      })
      .sort((a, b) => a.finalPrice - b.finalPrice);

    if (providers.length === 0) return ctx.editMessageCaption("❌ Stok kosong untuk negara ini.", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text: "🔙 Kembali", callback_data: `service_${serviceId}`}]] } });

    const buttons = providers.map(p => [{
      text: `${toRupiah(p.finalPrice)} (Stok: ${p.stock})`,
      callback_data: `buy_nokos_${numberId}_${p.provider_id}_${serviceId}_${p.finalPrice}`
    }]);

    buttons.push([{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `service_${serviceId}` }]);

    await ctx.editMessageCaption(`<b>💵 𝗣𝗜𝗟𝗜𝗛 𝗛𝗔𝗥𝗚𝗔</b>\n𝗡𝗲𝗴𝗮𝗿𝗮 : ${countryData.name}\n\n𝗣𝗶𝗹𝗶𝗵 𝗛𝗮𝗿𝗴𝗮 𝗬𝗮𝗻𝗴 𝗞𝗮𝗺𝘂 𝗠𝗮𝘂 :`, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });

  } catch (e) {
    ctx.answerCbQuery("Gagal memuat harga");
  }
});

bot.action(/buy_nokos_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, price] = ctx.match;
  
  const buttons = [
    [{ text: "✅ 𝗞𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿 (𝗥𝗮𝗻𝗱𝗼𝗺 𝗢𝗽𝗲𝗿𝗮𝘁𝗼𝗿)", callback_data: `confirm_nokos_${numberId}_${providerId}_${serviceId}_any_${price}` }],
    [{ text: "📡 𝗣𝗶𝗹𝗶𝗵 𝗢𝗽𝗲𝗿𝗮𝘁𝗼𝗿 𝗧𝗲𝗿𝘁𝗲𝗻𝘁𝘂", callback_data: `operator_${numberId}_${providerId}_${serviceId}_${price}` }],
    [{ text: "🔙 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "choose_service" }]
  ];

  await ctx.editMessageCaption(`<b>🛒 𝗞𝗢𝗡𝗙𝗢𝗥𝗠𝗔𝗦𝗜 𝗢𝗥𝗗𝗘𝗥</b>\n└⌑ 💰 𝖧𝖺𝗋𝗀𝖺 : ${toRupiah(price)}\n\n𝖫𝖺𝗇𝗃𝗎𝗍𝗄𝖺𝗇 𝖮𝗋𝖽𝖾𝗋`, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
});

bot.action(/operator_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, price] = ctx.match;
  const apiKey = config.RUMAHOTP;

  try {
     const countryData = globalNokos.cachedCountries[serviceId]?.find(c => String(c.number_id) === String(numberId));
     if (!countryData) return ctx.answerCbQuery("Data negara hilang, ulangi dari awal.");

     const res = await axios.get(`https://www.rumahotp.com/api/v2/operators?country=${encodeURIComponent(countryData.name)}&provider_id=${providerId}`, { headers: { "x-apikey": apiKey } });
     
     const ops = res.data.data || [];
     if(ops.length === 0) return ctx.answerCbQuery("Operator spesifik tidak tersedia, gunakan random.");

     const buttons = ops.map(op => [{
        text: op.name,
        callback_data: `confirm_nokos_${numberId}_${providerId}_${serviceId}_${op.id}_${price}`
     }]);
     buttons.push([{text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: `buy_nokos_${numberId}_${providerId}_${serviceId}_${price}`}]);

     await ctx.editMessageCaption(`<b>📡 𝗣𝗜𝗟𝗜𝗛 𝗢𝗣𝗘𝗥𝗔𝗧𝗢𝗥</b>\n└⌑ 𝖯𝗋𝗈𝗏𝗂𝖽𝖾𝗋 𝖨𝖣 : ${providerId}`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
     });

  } catch(e) {
     ctx.answerCbQuery("Gagal load operator");
  }
});

bot.action(/confirm_nokos_(.+)_(.+)_(.+)_(.+)_(.+)/, async (ctx) => {
  const [_, numberId, providerId, serviceId, operatorId, priceStr] = ctx.match;
  const price = parseInt(priceStr);
  const userId = ctx.from.id;
  const apiKey = config.RUMAHOTP;

  const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
  const userSaldo = saldoData[userId] || 0;

  if (userSaldo < price) {
    return ctx.answerCbQuery("🚫 𝗦𝗮𝗹𝗱𝗼 𝗞𝗮𝗺𝘂 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴 𝗥𝗽.𝟬, 𝗝𝗮𝗱𝗶 𝗗𝗲𝗽𝗼𝘀𝗶𝘁 𝗧𝗲𝗿𝗹𝗲𝗯𝗶𝗵 𝗗𝗮ჰ𝘂𝗹𝘂.", { show_alert: true });
  }

  // --- LOGIKA DETEKSI NEGARA ---
  const countryData = globalNokos.cachedCountries[serviceId]?.find(c => String(c.number_id) === String(numberId));
  const detectedCountry = countryData ? countryData.name : "Indonesia"; 
  // -----------------------------

  await ctx.editMessageCaption("⏳ <b>𝗦𝗲𝗱𝗮𝗻𝗴 𝗠𝗲𝗺𝗽𝗿𝗼𝘀𝗲𝘀 𝗣𝗲𝗺𝗯𝗲𝗹𝗶𝗮𝗻...</b>", { parse_mode: "HTML" }).catch(()=>{});

  try {
    saldoData[userId] = userSaldo - price;
    fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));

    let url = `https://www.rumahotp.com/api/v2/orders?number_id=${numberId}&provider_id=${providerId}`;
    if (operatorId && operatorId !== 'any') {
        url += `&operator_id=${operatorId}`;
    }
    
    const res = await axios.get(url, { headers: { "x-apikey": apiKey } });

    if (!res.data.success) {
      saldoData[userId] += price;
      fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));
      
      const errMsg = res.data.message || res.data.msg || "Stok habis atau gangguan provider";
      
      return ctx.editMessageCaption(`❌ <b>𝗢𝗿𝗱𝗲𝗿 𝗚𝗮𝗴𝗮𝗹 :</b> ${errMsg}\n└⌑ 𝖲𝖺𝗅𝖽𝗈 𝖡𝖾𝗋𝗁𝖺𝗌𝗂𝗅 𝖣𝗂𝗄𝖾𝗆𝖻𝖺𝗅𝗂𝗄𝖺𝗇`, { 
          parse_mode: "HTML", 
          reply_markup: { inline_keyboard: [[{text:"🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data:"choose_service"}]] } 
      });
    }

    const d = res.data.data;
    
    // Simpan data negara dan detail lainnya untuk dibaca di check_sms
    globalNokos.activeOrders[d.order_id] = {
      userId,
      price,
      country: detectedCountry, // Negara otomatis terdeteksi
      appName: d.service,
      operatorName: d.operator || "Any",
      messageId: ctx.callbackQuery.message.message_id,
      startTime: Date.now()
    };

    const text = `✅ <b>𝗢𝗥𝗗𝗘𝗥 𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟</b>\n├⌑ 🆔 𝖨𝖣 : <code>${d.order_id}</code>\n├⌑ 📞 𝖭𝗈𝗆𝗈𝗋: <code>${d.phone_number}</code>\n├⌑ 📱 𝖠𝗉𝗉𝗌 : ${d.service}\n├⌑ 💰 𝖧𝖺𝗋𝗀𝖺 : ${toRupiah(price)}\n└⌑ ⏳ 𝖲𝗍𝖺𝗍𝗎𝗌 : Menunggu 𝖪𝗈𝖽𝖾 𝖲𝖬𝖲...`;

    await ctx.editMessageCaption(text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📩 𝗖𝗲𝗸 𝗦𝗠𝗦", callback_data: `check_sms_${d.order_id}` }],
          [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: `cancel_sms_${d.order_id}` }]
        ]
      }
    });

  } catch (e) {
    console.error("Order Error:", e);
    const saldoCurrent = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8") || "{}");
    saldoCurrent[userId] = (saldoCurrent[userId] || 0) + price;
    fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoCurrent, null, 2));

    ctx.editMessageCaption(`❌ <b>𝗦𝘆𝘀𝘁𝗲𝗺 𝗘𝗿𝗿𝗼𝗿 :</b> ${e.message}\n└⌑ 𝖲𝖺𝗅𝖽𝗈 𝖡𝖾𝗋𝗁𝖺𝗌𝗂𝗅 𝖣𝗂𝗄𝖾𝗆𝖻𝖺ليكান.`);
  }
});


bot.action(/check_sms_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const apiKey = config.RUMAHOTP;

  try {
    const res = await axios.get(`https://www.rumahotp.com/api/v1/orders/get_status?order_id=${orderId}`, {
       headers: { "x-apikey": apiKey }
    });

    const d = res.data.data;
    
    // Cek jika OTP sudah masuk
    if (d.status === "completed" || (d.otp_code && d.otp_code !== "-")) {
       
       const info = globalNokos.activeOrders[orderId] || {};
       
       // 1. Update pesan di chat user (User melihat OTP asli tanpa sensor)
       await ctx.editMessageCaption(`✅ <b>𝗦𝗠𝗦 𝗗𝗜𝗧𝗘𝗥𝗜𝗠𝗔!</b>\n├⌑ 📞 𝖭𝗈𝗆𝗈𝗋 : <code>${d.phone_number}</code>\n├⌑ 💬 <b>𝖮𝖳𝖯 :</b> <code>${d.otp_code}</code>\n└⌑ ⏳ 𝖲𝗍𝖺𝗍𝗎𝗌 : 𝖳𝗋𝖺𝗇𝗌𝖺𝗄𝗌𝗂 𝖲𝖾𝗅𝖾𝗌𝖺𝗂.`, { parse_mode: "HTML" });

       // 2. Persiapan data untuk Testimoni Channel
       const moment = require('moment-timezone');
       const waktuText = moment().tz("Asia/Jakarta").locale('id').format("dddd, D MMMM YYYY [pukul] HH:mm [WIB]");
       
       // Sensor data untuk publik
       const censoredPhone = d.phone_number.slice(0, 6) + "xxxx" + d.phone_number.slice(-2);
       const censoredOtp = d.otp_code.length > 3 ? d.otp_code.slice(0, 3) + "***" : "***";
       const userUname = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
       const censoredUser = userUname.length > 3 ? userUname.slice(0, 3) + "..." : userUname;

       const testiMsg = `📩✨ <b>TRANSAKSI OTP SELESAI</b>

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📘 <b>DETAIL LAYANAN</b> ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 📱 Aplikasi  : ${info.serviceName || d.service}
┃ 🌍 Negara    : ${info.country || 'Indonesia'}
┃ 📡 Operator  : ${info.operatorName || d.operator || 'Telkomsel'}
┃ 💰 Harga     : ${toRupiah(info.price || 0)}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🧾 <b>INFORMASI PESANAN</b> ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🆔 Order ID : <code>${orderId}</code>
┃ ☎️ Nomor    : <code>${censoredPhone}</code> 🔒
┃ 🔐 Kode OTP : <code>${censoredOtp}</code> 🔒
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👤 <b>DATA PEMBELI</b> ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🪪 ID User  : <code>${ctx.from.id}</code>
┃ 👤 Username : ${censoredUser} 🔒
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⏰ <b>WAKTU PEMESANAN</b> ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🗓️ ${waktuText}
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

💙 Terima kasih telah menggunakan
✨ <b>RUMAHOTP — OTP Cepat & Aman</b>`;

       // 3. Kirim ke Channel Testimoni dengan FOTO (config.succestrxotp)
       if (config.testimoniChannel) {
         await ctx.telegram.sendPhoto(config.testimoniChannel, config.succestrxotp, {
           caption: testiMsg,
           parse_mode: "HTML",
           reply_markup: {
             inline_keyboard: [
               [{ text: "🛒 Order OTP Sekarang", url: `https://t.me/${ctx.botInfo.username}` }],
               [{ text: "👨‍💻 Developer", url: "https://t.me/albyy0x" }]
             ]
           }
         });
       }

       // Hapus dari antrean aktif
       delete globalNokos.activeOrders[orderId];

    } else if (d.status === 'processing') {
       await ctx.answerCbQuery("⏳ 𝗦𝗠𝗦 𝗕𝗲𝗹𝘂𝗺 𝗠𝗮𝘀𝘂𝗸, 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗖𝗼𝗯𝗮 𝗟𝗮𝗴𝗶", { show_alert: false });
    } else {
       await ctx.editMessageCaption(`ℹ️ 𝗦𝘁𝗮𝘁𝘂𝘀 𝗢𝗿𝗱𝗲𝗿 : ${d.status}`, { parse_mode: "HTML" });
    }
  } catch(e) {
    console.error("Error check_sms:", e);
    ctx.answerCbQuery("Gagal mengecek status.");
  }
});


bot.action(/cancel_sms_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const apiKey = config.RUMAHOTP;
  const userId = ctx.from.id;

  const orderInfo = globalNokos.activeOrders[orderId];
  if (orderInfo && (Date.now() - orderInfo.startTime < 300000)) {
      return ctx.answerCbQuery("⏳ Tunggu 5 menit baru bisa cancel!", { show_alert: true });
  }

  try {
    const res = await axios.get(`https://www.rumahotp.com/api/v1/orders/set_status?order_id=${orderId}&status=cancel`, {
       headers: { "x-apikey": apiKey }
    });

    if (res.data.success) {
       if (orderInfo) {
          const saldoData = JSON.parse(fs.readFileSync("./database/saldoOtp.json", "utf8"));
          saldoData[userId] = (saldoData[userId] || 0) + orderInfo.price;
          fs.writeFileSync("./database/saldoOtp.json", JSON.stringify(saldoData, null, 2));
          delete globalNokos.activeOrders[orderId];
       }
       await ctx.editMessageCaption("✅ <b>Order Dibatalkan & Saldo Direfund.</b>", { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{text:"🔙 Menu", callback_data:"choose_service"}]] } });
    } else {
       ctx.answerCbQuery("Gagal cancel: " + res.data.message);
    }
  } catch(e) {
    ctx.answerCbQuery("Error cancel");
  }
});

bot.action("topup_nokos", async (ctx) => {
    if (ctx.chat.type !== 'private') {
        return ctx.reply("❌ Menu deposit hanya bisa diakses via Private Chat (PC).", {
            reply_markup: {
                inline_keyboard: [[{ text: "📩 𝗖𝗵𝗮𝘁 𝗕𝗼𝘁 𝗦𝗲𝗸𝗮𝗿𝗮𝗻𝗴", url: `https://t.me/${bot.botInfo.username}` }]]
            }
        });
    }

    const userId = ctx.from.id;
    userState[userId] = { step: "WAITING_TOPUP_RUMAHOTP" };

    await editMenuMessage(ctx, 
        `💰 <b>DEPOSIT SALDO</b>\n\nSilakan masukkan nominal deposit (Hanya Angka).\nMinimal: Rp 2.000\n\nContoh: <code>2000</code>`, 
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗗𝗲𝗽𝗼𝘀𝗶𝘁", callback_data: "shop_menu" }]
                ]
            }
        }
    );
});

bot.action(/batal_depo_rumahotp_(.+)/, async (ctx) => {
   const depoId = ctx.match[1];
   const apiKey = config.RUMAHOTP;
   try {
     await axios.get(`https://www.rumahotp.com/api/v1/deposit/cancel?deposit_id=${depoId}`, { headers: { "x-apikey": apiKey } });
     await ctx.deleteMessage();
     await ctx.reply("✅ Deposit dibatalkan.", {reply_markup: {inline_keyboard: [[{text:"🔙 Menu", callback_data:"shop_menu"}]]}});
   } catch(e) {
     ctx.answerCbQuery("Gagal batal");
   }
});

bot.action(/app_qty_plus_(\d+)/, async (ctx) => {
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  if (!userState[uid] || userState[uid].step !== "PURCHASE_APP" || userState[uid].appIndex !== idx) {
    userState[uid] = { step: "PURCHASE_APP", appIndex: idx, qty: 1, message: null };
  }
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("❌ App tidak ditemukan.");
    return;
  }
  const stock = (app.accounts || []).length;
  userState[uid].qty = (userState[uid].qty || 1) + 1;
  if (userState[uid].qty > stock) userState[uid].qty = stock;
  const total = calcTotalPrice(parseInt(app.harga) || 0, userState[uid].qty);
  const caption = renderPurchaseText(app, userState[uid].qty, total);

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [ 
          { text: "➖", callback_data: `app_qty_minus_${idx}` }, 
          { text: `${userState[uid].qty}`, callback_data: `app_qty_show_${idx}` }, 
          { text: "➕", callback_data: `app_qty_plus_${idx}` } 
        ],
        [ { text: "🛒 Buy Now", callback_data: `app_buy_now_${idx}` } ],
        [ { text: "🔙 Batal", callback_data: "back_home" } ]
      ]
    }
  };

  await editMenuMessage(ctx, caption, {
    parse_mode: "HTML",
    ...keyboard
  });
  
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/app_qty_show_(\d+)/, (ctx) => {
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/app_buy_now_(\d+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'app_buy_now')) return;
  
  const uid = ctx.from.id;
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const stock = (app.accounts || []).length;
  const st = userState[uid];
  if (!st || st.step !== "PURCHASE_APP" || st.appIndex !== idx) {
    userState[uid] = { step: "PURCHASE_APP", appIndex: idx, qty: 1, message: null };
  }
  const qty = Math.max(1, userState[uid].qty || 1);
  if (qty > stock) return ctx.answerCbQuery("❌ Jumlah melebihi stock.");
  const total = calcTotalPrice(parseInt(app.harga) || 0, qty);

  await handlePayment(ctx, total, `App: ${app.nama} x${qty}`, {
    type: "app",
    idx: idx,
    qty: qty,
    total: total
  });

  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/pay_panel_(\d+)_(\d+)_(.+)/, async (ctx) => {
  if (!await requirePrivateChat(ctx, 'pay_panel')) return;
  
  const userId = ctx.from.id;
  const ram = parseInt(ctx.match[1]);
  const price = parseInt(ctx.match[2]);
  const username = ctx.match[3];
  const saldoUser = getSaldo(userId);

  // Simpan ke state untuk proses saldo nanti
  userState[userId] = {
    buyPanel: { ram, price, username }
  };

  const ramLabel = ram === 0 ? "Unlimited" : (ram / 1024) + " GB";

  const captionMenu = `<b>🛒 KONFIRMASI PEMBUATAN PANEL</b>
<b>━━━━━━━━━━━━━━━━━━━━━</b>

<b>〔 🖥️ DETAIL PANEL 〕</b>
➥ <b>Username :</b> <code>${username}</code>
➥ <b>RAM      :</b> ${ramLabel}
➥ <b>Harga    :</b> <code>${toRupiah(price)}</code>

<b>〔 👤 INFO SALDO 〕</b>
➥ <b>Saldo Mu :</b> <code>${toRupiah(saldoUser)}</code>

<b>━━━━━━━━━━━━━━━━━━━━━</b>
<i>Silakan pilih metode pembayaran di bawah:</i>`;

  await ctx.editMessageText(captionMenu, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("💰 Bayar via Saldo (Instan)", "pay_panel_saldo")],
      [Markup.button.callback("🏦 Bayar via QRIS (Otomatis)", "pay_panel_qris")],
      [Markup.button.callback("🔙 Batal", "menu_panel")]
    ])
  });
});

bot.action("pay_panel_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const state = userState[userId]?.buyPanel;

  if (!state) return ctx.answerCbQuery("❌ Sesi habis, ulangi order.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < state.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membuat panel!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= state.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(`<b>✅ BERHASIL!</b> Saldo terpotong <code>${toRupiah(state.price)}</code>.\n<i>Sedang membuat akun panel...</i>`, { parse_mode: "HTML" });

  // Kirim ke sendProductToUser (Tipe panel akan memicu create user di Pterodactyl)
  await sendProductToUser(ctx, {
    type: "panel",
    username: state.username,
    ram: state.ram,
    price: state.price
  });

  // --- NOTIF OWNER KECE ---
  const ramLabel = state.ram === 0 ? "Unlimited" : (state.ram / 1024) + " GB";
  const ownerMsg = 
    `<b>🚀 PANEL TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 BUYER 〕</b>\n` +
    `➥ <b>Nama :</b> ${userName}\n` +
    `➥ <b>ID   :</b> <code>${userId}</code>\n\n` +
    `<b>〔 🖥️ PANEL 〕</b>\n` +
    `➥ <b>User :</b> <code>${state.username}</code>\n` +
    `➥ <b>RAM  :</b> ${ramLabel}\n` +
    `➥ <b>Total:</b> <code>${toRupiah(state.price)}</code>\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus sesuai permintaan
});

bot.action("pay_panel_qris", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyPanel;

  if (!state) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  const ramLabel = state.ram === 0 ? "Unlimited" : (state.ram / 1024) + " GB";

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks loading
  await handlePayment(
    ctx, 
    state.price, 
    `Panel RAM ${ramLabel}`, 
    {
      type: "panel",
      username: state.username,
      ram: state.ram,
      price: state.price
    }
  );
});

bot.on('audio', async (ctx) => {
  console.log('Audio File ID:', ctx.message.audio.file_id);
  console.log('Audio Metadata:', {
    title: ctx.message.audio.title,
    performer: ctx.message.audio.performer,
    duration: ctx.message.audio.duration
  });
});

bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (["📁 ☇ 𝗦𝗰𝗿𝗶𝗽𝘁", "📱 ☇ 𝗔𝗽𝗽𝘀", "📡 ☇ 𝗣𝗮𝗻𝗲𝗹", "🛠 ☇ 𝗧𝗼𝗼𝗹𝘀", "🌸 ☇ 𝗢𝘄𝗻𝗲𝗿"].includes(text)) {
    return next();
  }
  
  if (userState[userId]?.step === "WAITING_USERNAME_ADMIN_PANEL") {
    if (!/^[a-zA-Z0-9]+$/.test(text))
        return ctx.reply("<blockquote>⚠️ <b>Username hanya boleh huruf & angka!</b></blockquote>", { parse_mode: "HTML" });
    
    if (text.length < 4)
        return ctx.reply("<blockquote>⚠️ <b>Username minimal 4 karakter!</b></blockquote>", { parse_mode: "HTML" });

    const username = text;
    delete userState[userId].step;

    const price = config.reseller.adminPanel.monthly;
    const itemName = "Admin Panel (Bulanan)";
    const productData = { 
        type: "admin_panel_monthly", 
        price, 
        duration: 30,
        username: username 
    };
    
    return handlePayment(ctx, price, itemName, productData);
  }
  
  // --- 1. HANDLE OWNER INPUT PROMO ---
// --- 1. HANDLE OWNER INPUT PROMO ---
if (userState[userId]?.step === "WAITING_PROMO_DATA") {
  const parts = text.split('|').map(p => p.trim());
  if (parts.length !== 3) return ctx.reply("❌ Format salah! Gunakan: KODE | KUOTA | DISKON");

  const [kode, kuota, diskon] = parts;
  const promoPath = './database/promo.json';
  const kodeUpper = kode.toUpperCase();
  
  let promoDB = {};
  if (fs.existsSync(promoPath)) promoDB = JSON.parse(fs.readFileSync(promoPath, 'utf8'));

  promoDB[kodeUpper] = {
    max: parseInt(kuota),
    used: 0,
    discount: parseInt(diskon)
  };

  fs.writeFileSync(promoPath, JSON.stringify(promoDB, null, 2));
  delete userState[userId];
  
  // Pesan Konfirmasi ke Owner
  await ctx.reply(`✅ <b>PROMO BERHASIL DIBUAT!</b>\n\n🎫 Kode: <code>${kodeUpper}</code>\n👥 Kuota: ${kuota}\n💰 Diskon: ${toRupiah(diskon)}`, { parse_mode: "HTML" });

  // --- OTOMATIS KIRIM KE CHANNEL ---
  if (config.testimoniChannel) {
    const textChannel = 
      `🎁 <b>KODE PROMO BARU TERSEDIA!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Buruan pakai kodenya sebelum kehabisan!\n\n` +
      `🎫 Kode Promo: <code>${kodeUpper}</code>\n` +
      `💰 Potongan: <b>${toRupiah(diskon)}</b>\n` +
      `👥 Kuota: <b>${kuota} User</b>\n\n` +
      `📌 <b>Cara Pakai:</b>\n` +
      `Ketik <code>/claim ${kodeUpper}</code> di Chat Bot.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 @${bot.botInfo.username}`;

    try {
      await bot.telegram.sendMessage(config.testimoniChannel, textChannel, { parse_mode: "HTML" });
    } catch (e) {
      console.log("Gagal kirim ke channel:", e.message);
    }
  }
  return;
}

if (userState[userId]?.step === "WAITING_PRODUCT_TEXT" && userId === config.ownerId) {
  const text = ctx.message.text;
  const parts = text.split("|").map(item => item.trim());

  // Validasi format: Harus ada 4 bagian (ISI | NAMA | HARGA | TOTAL)
  if (parts.length < 4) {
    safeReply(ctx, "<blockquote>❌ <b>Format Salah!</b>\n\nGunakan:\n<code>ISI | NAMA | HARGA | TOTAL</code>\n\n<b>Contoh (Bulk 2 Produk):</b>\n<code>AkunNet, AkunSpot | Netflix, Spotify | 25000, 15000 | 2</code></blockquote>", { parse_mode: "HTML" });
    return;
  }

  const [rawIsi, rawNama, rawHarga, rawTotal] = parts;
  
  // Pecah masing-masing bagian berdasarkan koma
  const listIsi = rawIsi.split(",").map(s => s.trim()).filter(s => s !== "");
  const listNama = rawNama.split(",").map(s => s.trim()).filter(s => s !== "");
  const listHarga = rawHarga.split(",").map(s => s.trim()).filter(s => s !== "");
  const totalBarang = parseInt(rawTotal.replace(/[^0-9]/g, ""));

  // Validasi kecocokan jumlah data dengan TOTAL yang diinput
  if (listIsi.length !== totalBarang || listNama.length !== totalBarang || listHarga.length !== totalBarang) {
    return safeReply(ctx, `<blockquote>❌ <b>Data Tidak Sinkron!</b>\n\nJumlah Isi, Nama, atau Harga tidak sesuai dengan jumlah TOTAL (<b>${totalBarang}</b>) yang kamu masukkan.\n\nPastikan jika Total 2, maka nama dan harga juga ada 2 (dipisah koma).</blockquote>`, { parse_mode: "HTML" });
  }

  try {
    let dbProduk = [];
    if (fs.existsSync(pathrasya)) {
      dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
    }

    // Looping untuk memproses dan menyimpan setiap produk
    for (let i = 0; i < totalBarang; i++) {
      const hargaAngka = parseInt(listHarga[i].replace(/[^0-9]/g, ""));
      
      const newProduct = {
        id: Date.now() + i, // ID Unik
        nama: listNama[i],
        harga: hargaAngka,
        stok: [listIsi[i]], // Masuk sebagai array stok (isi 1)
        createdAt: new Date().toISOString()
      };

      dbProduk.push(newProduct);
      
      // Kirim Notifikasi per produk ke Channel
      sendProductNotification("produk", newProduct, ctx.from.first_name);
    }

    // Simpan semua produk baru ke file
    fs.writeFileSync(pathrasya, JSON.stringify(dbProduk, null, 2));

    delete userState[userId];

    safeReply(ctx, `<blockquote>✅ <b>Bulk Add Berhasil!</b>\n\nBerhasil menyimpan <b>${totalBarang}</b> produk berbeda ke database.</blockquote>`, { parse_mode: "HTML" });
    
  } catch (error) {
    console.error(error);
    safeReply(ctx, "❌ Gagal menyimpan ke database.");
  }

  return;
}


// --- HANDLE USER INPUT PROMO (TEXT VERSION) ---
if (userState[userId]?.step === "WAITING_PROMO_INPUT") {
  const kodeInput = text.toUpperCase().trim();
  const promoPath = './database/promo.json';
  const userName = ctx.from.first_name || "User";

  // 1. Cek file database
  if (!fs.existsSync(promoPath)) {
    ctx.reply("❌ Belum ada promo tersedia.");
    return;
  }

  let promoDB = JSON.parse(fs.readFileSync(promoPath, 'utf8'));
  const promo = promoDB[kodeInput];

  // 2. Validasi Kode
  if (!promo) {
    ctx.reply("❌ Kode promo tidak valid!");
    return;
  }

  // 3. Validasi Kuota
  if (promo.used >= promo.max) {
    ctx.reply("❌ Kuota promo ini sudah habis!");
    return;
  }

  // 4. Simpan ke state user & hapus step waiting
  userState[userId] = { 
    ...userState[userId],
    activePromo: kodeInput 
  };
  delete userState[userId].step;

  // --- NOTIFIKASI OWNER SAJA ---
  const msgOwner = `<b>🔔 PROMO DI-KLAIM</b>\n\n` +
                   `👤 <b>User:</b> ${userName} (<code>${userId}</code>)\n` +
                   `🎫 <b>Kode:</b> <code>${kodeInput}</code>\n` +
                   `💰 <b>Diskon:</b> ${toRupiah(promo.discount)}`;
  
  bot.telegram.sendMessage(config.ownerId, msgOwner, { parse_mode: "HTML" }).catch(() => {});

  // 5. Balasan Sukses ke User
  ctx.reply(
    `✅ <b>KODE PROMO TERPASANG!</b>\n\n` +
    `🎫 Kode: <code>${kodeInput}</code>\n` +
    `💰 Potongan: <b>-${toRupiah(promo.discount)}</b>\n\n` +
    `<i>Silakan pilih produk yang ingin dibeli, diskon akan otomatis memotong harga.</i>`,
    { 
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🛍️ Belanja Sekarang", "shop_menu")],
        [Markup.button.callback("🏠 Menu Utama", "back_home")]
      ])
    }
  );
  return;
}

// --- HANDLE CEK VOUCHER INPUT ---
if (userState[userId]?.step === "WAITING_VOUCHER_CHECK") {
  const kodeInput = text.toUpperCase().trim();
  const promoPath = './database/promo.json';

  // 1. Cek database
  if (!fs.existsSync(promoPath)) {
    ctx.reply("❌ Data promo tidak tersedia.");
    delete userState[userId]; // Bersihkan state jika DB tidak ada
    return;
  }

  let promoDB = JSON.parse(fs.readFileSync(promoPath, 'utf8'));
  const data = promoDB[kodeInput];

  // 2. Jika kode tidak ditemukan
  if (!data) {
    ctx.reply(`❌ <b>Voucher "${kodeInput}" tidak ditemukan!</b>\nPastikan penulisan benar atau hubungi owner.`, { parse_mode: "HTML" });
    delete userState[userId];
    return;
  }

  // 3. Kalkulasi sisa kuota
  const sisa = data.max - data.used;
  const status = sisa > 0 ? "✅ MASIH BERLAKU" : "❌ SUDAH HABIS";

  // 4. Hapus state agar user bisa kembali normal
  delete userState[userId];

  // 5. Kirim Hasil Detail
  ctx.reply(
    "<b>🔍 HASIL CEK VOUCHER</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    `🎫 <b>Kode:</b> <code>${kodeInput}</code>\n` +
    `💰 <b>Potongan:</b> ${toRupiah(data.discount)}\n` +
    `👥 <b>Sisa Kuota:</b> ${sisa} User\n` +
    `📊 <b>Status:</b> ${status}\n\n` +
    (sisa > 0 ? `👉 Ketik <code>/claim ${kodeInput}</code> untuk menggunakan.` : `😔 Maaf, voucher ini sudah tidak bisa digunakan.`),
    { 
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🛍️ Belanja Sekarang", "shop_menu")],
        [Markup.button.callback("🔙 Kembali", "my_voucher")]
      ])
    }
  );
  return;
}

if (userState[userId]?.step === "SMM_WAITING_LINK") {
    if (ctx.chat.type !== 'private') return next();

    userState[userId].link = text;
    userState[userId].step = "SMM_WAITING_QTY";
    
    return ctx.reply("🔢 <b>𝗠𝗔𝗦𝗨𝗞𝗔𝗡 𝗝𝗨𝗠𝗟𝗔𝗛 :</b>\n\n└⌑ 𝖤𝗑𝖺𝗆𝗉𝗅𝖾 : 𝟣𝟢𝟢𝟢", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: '❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻', callback_data: 'smm_menu' }]] }
    });
}

if (userState[userId]?.step === "SMM_WAITING_QTY" && ctx.chat.type === 'private') {
    const qty = parseInt(text);

    if (isNaN(qty) || qty <= 0) {
        return ctx.reply("❌ <b>𝗛𝗮𝗿𝘂𝘀 𝗕𝗲𝗿𝘂𝗽𝗮 𝗔𝗻𝗴𝗸𝗮</b>\n\n└⌑ 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖬𝖺𝗌𝗎𝗄𝖺𝗇 𝖩𝗎𝗆𝗅𝖺𝗁 𝖸𝖺𝗇𝗀 𝖵𝖺𝗅𝗂𝖽.", {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: "smm_menu" }]] }
        });
    }

    const state = userState[userId];
    const res = await callSmmApi('/services');
    // Perbaikan operator OR
    let services = res.services || res.data || [];
    const service = services.find(s => s.id == state.serviceId);
    
    if (!service) {
        delete userState[userId];
        return ctx.reply("❌ 𝗟𝗮𝘆𝗮𝗻𝗮𝗻 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻/𝗕𝗲𝗿𝘂𝗯𝗮𝗵.");
    }

    // Perbaikan Template Literal (Backtick)
    if (qty < service.min || qty > service.max) {
        return ctx.reply(`❌ <b>𝗝𝘂𝗺𝗹𝗮𝗵 𝗧𝗶𝗱𝗮𝗸 𝗦𝗲𝘀𝘂𝗮𝗶</b>\n├⌑ 𝖬𝗂𝗇 : ${service.min}\n└⌑ 𝖬𝖺𝗑 : ${service.max}`, { parse_mode: "HTML" });
    }

    const totalPrice = (parseFloat(service.price) / 1000) * qty;
    const dbSaldoPath = "./database/saldoOtp.json";
    const saldoData = JSON.parse(fs.readFileSync(dbSaldoPath, "utf8") || "{}");
    const userSaldo = saldoData[userId] || 0;

    if (userSaldo < totalPrice) {
        delete userState[userId];
        return ctx.reply(`<blockquote>❌ <b>𝗦𝗔𝗟𝗗𝗢 𝗧𝗜𝗗𝗔𝗞 𝗖𝗨𝗞𝗨𝗣!</b>\n\n╭⌑ 💰 𝖡𝗎𝗍𝗎𝗁 : ${toRupiah(totalPrice)}\n├⌑ 💳 𝖲𝖺𝗅𝖽𝗈 𝖪𝖺𝗆𝗎 : ${toRupiah(userSaldo)}\n\n╰⌑ 🍂 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖣𝖾𝗉𝗈𝗌𝗂𝗍 𝖳𝖾𝗅𝖾𝖻𝗂𝗁 𝖣𝖺𝗁𝗎𝗅𝗎.</blockquote>`, { 
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: '➕ 𝗜𝘀𝗶 𝗦𝗮𝗹𝗱𝗼', callback_data: 'topup_nokos' }]] }
        });
    }

    userState[userId].pendingOrder = {
        serviceId: state.serviceId,
        serviceName: service.name,
        target: state.link,
        quantity: qty,
        price: totalPrice
    };

    // Perbaikan string concatenation yang berantakan
    await ctx.reply(
        `🚀 <b>𝗞𝗢𝗡𝗙𝗜𝗥𝗠𝗔𝗦𝗜 𝗣𝗘𝗦𝗔𝗡𝗔𝗡</b>\n\n` +
        `├⌑ 📦 <b>𝖫𝖺𝗒𝖺𝗇𝖺𝗇 :</b> ${service.name}\n` +
        `├⌑ 🔗 <b>𝖳𝖺𝗋𝗀𝖾𝗍 :</b> ${state.link}\n` +
        `├⌑ 🔢 <b>𝖩𝗎𝗆𝗅𝖺𝗁 :</b> ${qty}\n` +
        `└⌑ 💰 <b>𝖳𝗈𝗍𝖺𝗅 𝖧𝖺𝗋𝗀𝖺 :</b> ${toRupiah(totalPrice)}\n\n` +
        `<i>📝 𝖭𝗈𝗍𝖾 : 𝖲𝗂𝗅𝖺𝗁𝗄𝖺𝗇 𝖯𝖺𝗌𝗍𝗂𝗄𝖺𝗇 𝖯𝖾𝗌𝖺𝗇𝖺𝗇 𝖡𝖾𝗇𝖺𝗋 𝖲𝖾𝖻𝖾𝗅𝗎𝗆 𝖫𝖺𝗇𝗃ucu𝗍!</i>`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ 𝗞𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘀𝗶 𝗢𝗿𝗱𝗲𝗿", callback_data: "smm_exec_order" }],
                    [{ text: "❌ 𝗕𝗮𝘁𝗮𝗹𝗸𝗮𝗻", callback_data: "smm_menu" }]
                ]
            }
        }
    );
    return;
}

if (userState[userId]?.step === "SMM_WAITING_STATUS_ID") {
    if (ctx.chat.type !== 'private') return next();

    const orderId = text;
    const res = await callSmmApi('/status', { id: orderId });
    
    if (res.status === true || res.data) {
        ctx.reply(`📊 <b>𝗦𝗧𝗔𝗧𝗨𝗦 𝗢𝗥𝗗𝗘𝗥 #${orderId}</b>\n├⌑ 𝖲𝗍𝖺𝗍𝗎𝗌 : <b>${res.data?.status || res.order_status}</b>\n├⌑ 𝖲𝗍𝖺𝗋𝗍 : ${res.data?.start_count || '-'}\n└⌑ 𝖲𝗂𝗌𝖺 : ${res.data?.remains || '-'}`, { parse_mode: "HTML" });
    } else {
        ctx.reply("❌ 𝗗𝗮𝘁𝗮 𝗧𝗶𝗱𝗮𝗸 𝗗𝗶𝘁𝗲𝗺𝘂𝗸𝗮𝗻/𝗘𝗿𝗿𝗼𝗿.", { parse_mode: "HTML" });
    }
    delete userState[userId];
    return;
}

if (userState[userId]?.step === "WAITING_WD_RUMAHOTP_NOMINAL") {
    const nominal = parseInt(text.replace(/[^0-9]/g, ''));

    if (isNaN(nominal) || nominal < 1000) {
      return safeReply(ctx, "<blockquote>❌ <b>Nominal tidak valid!</b>\nMasukkan angka saja (Min 1000).</blockquote>", { parse_mode: "HTML" });
    }

    delete userState[userId];

    const waitMsg = await safeReply(ctx, "⏳ <b>Sedang menembak API H2H RumahOTP...</b>", { parse_mode: "HTML" });

    try {
      const res = await rumahOtpTransfer(nominal, config);

      const trxId = res.data?.id || res.id || "Unknown";
      const status = res.data?.status || res.status || "Pending";
      const message = res.message || "Permintaan dikirim";

      let replyText = `<blockquote>✅ <b>WD RUMAHOTP SUKSES!</b>\n\n`;
      replyText += `<b>Nominal:</b> ${toRupiah(nominal)}\n`;
      replyText += `<b>Tujuan:</b> ${config.wd_balance.destination_number} (${config.wd_balance.bank_code})\n`;
      replyText += `<b>Trx ID:</b> <code>${trxId}</code>\n`;
      replyText += `<b>Status:</b> <code>${status.toUpperCase()}</code>\n`;
      replyText += `<b>Note:</b> ${message}</blockquote>`;

      await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, replyText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[{ text: "🔙 Menu Owner", callback_data: "menu_owner" }]]
        }
      });

    } catch (err) {
      console.error("WD RumahOTP Fail:", err);

      await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null,
        `<blockquote>❌ <b>GAGAL WD RUMAHOTP</b>\n\n<b>Error:</b> ${err.message}\n\n<i>Pastikan saldo RumahOTP cukup dan Endpoint API benar.</i></blockquote>`,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 Menu Owner", callback_data: "menu_owner" }]]
            }
        }
      );
    }
    return;
  }

if (userState[userId]?.step === "WAITING_TOPUP_RUMAHOTP") {
    const amount = parseInt(text);
    if (isNaN(amount) || amount < 2000) {
        return safeReply(ctx, "❌ Minimal deposit Rp 2.000 dan harus angka!");
    }

    delete userState[userId];

    const loading = await safeReply(ctx, "🔄 <b>Membuat QRIS RumahOTP...</b>", { parse_mode: "HTML" });
    const apiKey = config.RUMAHOTP;
    const fee = config.UNTUNG_DEPOSIT || 500;
    const totalRequest = amount + fee;

    try {
        const res = await axios.get(`https://www.rumahotp.com/api/v2/deposit/create?amount=${totalRequest}&payment_id=qris`, {
            headers: { "x-apikey": apiKey }
        });

        await ctx.deleteMessage(loading.message_id).catch(() => {});

        if (!res.data.success) {
            return safeReply(ctx, "❌ Gagal membuat QRIS. Coba lagi nanti.");
        }

        const d = res.data.data;
        const caption = `<b>💳 TAGIHAN DEPOSIT</b>\n\n🆔 ID: <code>${d.id}</code>\n💰 Total Bayar: <b>Rp ${toRupiah(d.total)}</b>\n(Termasuk biaya admin)\n\n📥 Masuk Saldo: Rp ${toRupiah(amount)}\n\n⚠️ <b>Bayar sesuai nominal TOTAL (sampai digit terakhir)!</b>\nOtomatis cek status...`;

        const msgQris = await ctx.replyWithPhoto(d.qr_image, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ Batalkan", callback_data: `batal_depo_rumahotp_${d.id}` }]] }
        });

        let checks = 0;
        const maxChecks = 120;
        const checkInterval = setInterval(async () => {
            checks++;
            if (checks > maxChecks) {
                clearInterval(checkInterval);
                return;
            }

            try {
                const checkRes = await axios.get(`https://www.rumahotp.com/api/v2/deposit/get_status?deposit_id=${d.id}`, {
                    headers: { "x-apikey": apiKey }
                });

                if (checkRes.data && checkRes.data.success) {
                    const status = checkRes.data.data.status;

                    if (status === 'success' || status === 'paid') {
                        clearInterval(checkInterval);

                        const dbPath = "./database/saldoOtp.json";
                        let saldoDB = {};
                        try { saldoDB = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch (e) {}

                        saldoDB[userId] = (saldoDB[userId] || 0) + amount;
                        fs.writeFileSync(dbPath, JSON.stringify(saldoDB, null, 2));

                        // 1. Hapus pesan QRIS dan kirim notif ke user
                        await ctx.deleteMessage(msgQris.message_id).catch(() => {});
                        await ctx.reply(`✅ <b>DEPOSIT SUKSES!</b>\n\n💰 Diterima: Rp ${toRupiah(amount)}\n💼 Total Saldo: Rp ${toRupiah(saldoDB[userId])}`, { parse_mode: "HTML" });

                        // 2. Kirim Log ke Channel (Sesuai Foto)
                        if (config.testimoniChannel) {
                            const moment = require('moment-timezone');
                            const waktuLog = moment().tz("Asia/Jakarta").format("D/M/YYYY, HH.mm.ss");
                            
                            const logMsg = `✅ <b>LOG DEPOSIT SUKSES</b>\n\n<blockquote>💰 <b>Nominal:</b> Rp ${toRupiah(amount)}\n📅 <b>Waktu:</b> ${waktuLog}\n🆔 <b>ID:</b> <code>${d.id}</code>\n\n<i>Saldo otomatis ditambahkan.</i></blockquote>`;

                            await ctx.telegram.sendPhoto(config.testimoniChannel, config.succesdepootp, {
                                caption: logMsg,
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "✅ DEPOSIT SELESAI", url: `https://t.me/${ctx.botInfo.username}` }],
                                        [{ text: "🛒 Order Sekarang", url: `https://t.me/${ctx.botInfo.username}` }]
                                    ]
                                }
                            });
                        }

                        bot.telegram.sendMessage(config.ownerId, `🔔 User ${userId} Deposit Rp ${amount} via RumahOTP`).catch(() => {});

                    } else if (status === 'cancelled' || status === 'failed') {
                        clearInterval(checkInterval);
                        await ctx.deleteMessage(msgQris.message_id).catch(() => {});
                        await ctx.reply("❌ Deposit dibatalkan/gagal.");
                    }
                }
            } catch (e) {
                console.log("Error cek deposit:", e.message);
            }
        }, 5000);

    } catch (e) {
        console.error(e);
        safeReply(ctx, "❌ Error API RumahOTP");
    }
    return;
}

  // Cek jika user sedang dalam proses input nominal deposit
  if (userState[userId]?.step === "WAITING_TOPUP") {
    const amount = parseInt(text);

    // Validasi input
    if (isNaN(amount) || amount < 1000) {
       return safeReply(ctx, "<b>❌ NOMINAL TIDAK VALID</b>\n\nMinimal deposit adalah <b>Rp 1.000</b>. Silakan kirim ulang nominal berupa angka saja.", { parse_mode: "HTML" });
    }
    
    // Hapus state agar tidak double input
    delete userState[userId];

    // Panggil fungsi handleDeposit yang sudah kita buat tadi
    await handleDeposit(ctx, amount);
    return;
  }
  
    // Handler untuk input nominal donasi
  if (userState[userId]?.step === "WAITING_DONASI") {
    const amount = parseInt(text);

    // Validasi input minimal Rp 500
    if (isNaN(amount) || amount < 500) {
       return safeReply(ctx, "<b>⚠️ NOMINAL TERLALU KECIL</b>\n\nMinimal donasi adalah <b>Rp 500</b>. Silakan kirim ulang nominal berupa angka saja (Contoh: 500).", { parse_mode: "HTML" });
    }
    
    // Hapus state agar tidak terjadi input ganda
    delete userState[userId];

    // Panggil fungsi handleDonasi yang menyimpan ke database/donasi.json
    await handleDonasi(ctx, amount);
    return;
  }
  
  
  if (userState[userId]?.step === "WAITING_USERNAME_PANEL") {
    if (!/^[a-zA-Z0-9]+$/.test(text))
        return ctx.reply("<blockquote>⚠️ <b>Username hanya boleh huruf & angka!</b></blockquote>", { parse_mode: "HTML" });

    const username = text;
    delete userState[userId].step;

    const hargaGb = config.hargaPanel.perGB;
    const hargaUnli = config.hargaPanel.unlimited;

    let listRam = [];

    for (let gb = 1; gb <= 10; gb++) {
        const ramMB = gb * 1024;
        const price = gb * hargaGb;

        listRam.push({
            label: `${gb}GB - ${toRupiah(price)}`,
            ram: ramMB,
            price
        });
    }

    listRam.push({
        label: `UNLIMITED (${toRupiah(hargaUnli)})`,
        ram: 0,
        price: hargaUnli
    });

    const buttons = listRam.map(p => {
        return [{ text: p.label, callback_data: `pay_panel_${p.ram}_${p.price}_${username}` }];
    });

    buttons.push([{ text: "🔙 Batal", callback_data: "back_home" }]);

    return ctx.reply(
        `<blockquote><b>🛠️ Pilih Spesifikasi untuk user ${username}</b></blockquote>`,
        {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        }
    );
  }

if (userState[userId]?.step === "WAITING_SCRIPT_DETAIL") {
  const state = userState[userId];
  const text = ctx.message.text || ""; // Pastikan text ada
  const parts = text.split("|").map(x => x.trim());
  
  if (parts.length !== 3) {
    return safeReply(ctx, "<blockquote>❌ Format detail salah! Gunakan: Nama | Harga (angka) | Deskripsi</blockquote>", { parse_mode: "HTML" });
  }
  
  const [nama, hargaStr, deskripsi] = parts;
  const harga = parseInt(hargaStr);
  
  if (isNaN(harga) || harga <= 0) {
    return safeReply(ctx, "<blockquote>❌ Harga harus angka positif!</blockquote>", { parse_mode: "HTML" });
  }
  
  try {
    const db = readDb();
    
    // --- BAGIAN FIX ---
    // Jika db.scripts belum didefinisikan di JSON, buat array kosong dulu
    if (!db.scripts || !Array.isArray(db.scripts)) {
      db.scripts = [];
    }
    // ------------------

    const scriptData = {
      nama: nama,
      harga: harga,
      deskripsi: deskripsi,
      file_id: state.file_id, 
      fileName: state.temp_fileName     };
    
    db.scripts.push(scriptData);
    saveDb(db);
    
    const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    
    sendProductNotification("script", scriptData, addedBy);
    
    safeReply(ctx, `<blockquote><b>✅ Sukses Menambah Script!</b>\n\n<b>📂 Nama:</b> <code>${nama}</code>\n<b>💰 Harga:</b> <code>${toRupiah(harga)}</code>\n<b>📄 File:</b> <code>${state.temp_fileName}</code>\n\n📢 Notifikasi telah dikirim ke channel!</blockquote>`, { 
      parse_mode: "HTML" 
    });
    
  } catch (e) {
    console.error("Error saat simpan script:", e);
    safeReply(ctx, "❌ Gagal menyimpan data script ke database.");
  }
  
  delete userState[userId];
  return;
}

// Handler untuk memproses teks detail script referral
if (userState[userId]?.step === "WAITING_SCRIPT_DETAIL_REF") {
  const state = userState[userId];
  const text = ctx.message.text || ""; 
  const parts = text.split("|").map(x => x.trim());
  
  if (parts.length !== 3) {
    return safeReply(ctx, "<blockquote>❌ Format detail salah!\n<b>Gunakan:</b> Nama | Point (angka) | Deskripsi</blockquote>", { parse_mode: "HTML" });
  }
  
  const [nama, pointStr, deskripsi] = parts;
  const pointHarga = parseInt(pointStr);
  
  if (isNaN(pointHarga) || pointHarga <= 0) {
    return safeReply(ctx, "<blockquote>❌ Jumlah Point harus angka positif!</blockquote>", { parse_mode: "HTML" });
  }
  
  try {
    const dbRef = loadScriptRef();

    const scriptData = {
      id: Date.now(), 
      nama: nama,
      point: pointHarga,
      deskripsi: deskripsi,
      file_id: state.file_id, 
      fileName: state.temp_fileName 
    };
    
    dbRef.push(scriptData);
    saveScriptRef(dbRef);
    
    // --- NOTIFIKASI UNTUK OWNER ---
    safeReply(ctx, `<blockquote><b>✅ Sukses Menambah Script Referral!</b>\n\n<b>📂 Nama:</b> <code>${nama}</code>\n<b>🎁 Harga:</b> <code>${pointHarga} Point</code>\n\n📢 Notifikasi publik telah dikirim ke channel!</blockquote>`, { 
      parse_mode: "HTML" 
    });

    // --- NOTIFIKASI KE CHANNEL (TEKS KECE) ---
    const textChannel = `<b>🚀 UPDATE HADIAH REFERRAL BARU!</b>\n\n` +
                        `Halo Sobat <b>${ctx.botInfo.first_name}</b>! Ada script premium baru nih yang bisa kalian dapetin secara <b>GRATIS</b> cuma modal ajak teman! 🔥\n\n` +
                        `<blockquote>📦 <b>Produk:</b> <code>${nama}</code>\n` +
                        `💎 <b>Harga:</b> <code>${pointHarga} Point</code>\n` +
                        `📝 <b>Keterangan:</b> <i>${deskripsi}</i></blockquote>\n\n` +
                        `<b>Gimana caranya?</b>\n` +
                        `Cukup bagikan link referral kamu, kumpulkan pointnya, dan langsung sikat scriptnya di menu <b>Referral Point</b>! ⚡️`;

    const channelMarkup = {
        inline_keyboard: [
            [{ text: "🎁 Ambil Script Sekarang", url: `https://t.me/${ctx.botInfo.username}?start` }]
        ]
    };

    if (config.testimoniChannel) {
        ctx.telegram.sendMessage(config.testimoniChannel, textChannel, { 
            parse_mode: "HTML", 
            reply_markup: channelMarkup 
        }).catch(() => {
            console.log("Gagal kirim notif ke channel, cek ID channel di config.");
        });
    }
    
  } catch (e) {
    console.error("Error saat simpan script referral:", e);
    safeReply(ctx, "❌ Gagal menyimpan data script ke database referral.");
  }
  
  delete userState[userId];
  return;
}


if (userState[userId]?.step === "WAITING_ADD_VPS") {
  if (userId !== Number(config.ownerId)) return;

  const lines = text.split("\n").map(v => v.trim()).filter(Boolean);
  let totalAdded = 0;
  let addedNames = new Set();
  let lastPrice = 0;

  for (const line of lines) {
    const parts = line.split("|").map(x => x.trim());
    if (parts.length < 4) continue;

    const [ip, password, priceStr, product] = parts;
    const price = parseInt(priceStr);
    if (isNaN(price)) continue;

    const idUnik = `VPS-${Math.floor(1000 + Math.random() * 9000)}`;
    vpsAccounts.push({
      id: idUnik,
      ip,
      password,
      price,
      product,
      used: false
    });

    addedNames.add(product);
    lastPrice = price;
    totalAdded++;
  }

  if (totalAdded === 0) return safeReply(ctx, "❌ Format salah atau data tidak valid!");

  saveVPSAccounts(vpsAccounts);

  // Kirim Konfirmasi ke Owner
  await safeReply(ctx, `<blockquote><b>✅ VPS BERHASIL DITAMBAHKAN</b>\n\nTotal: ${totalAdded} akun\nProduk: ${[...addedNames].join(", ")}</blockquote>`, { parse_mode: "HTML" });

  // Format Promo Channel
  const botUser = ctx.botInfo.username;
  const promoMsg = `🔔<b>STOK BARU TELAH DITAMBAHKAN</b>🔔\n<i>New VPS Notification</i>\n\n` +
                `📦 <b>PRODUK:</b> ${[...addedNames].join(", ")}\n` +
                `📊 <b>TOTAL STOK:</b> ${vpsAccounts.filter(a => !a.used).length} vps\n` +
                `💰 <b>HARGA:</b> ${toRupiah(lastPrice)}\n` +
                `────────────────────\n` +
                `<b>Order lewat bot »</b> @${botUser}`;

  const promoKb = Markup.inlineKeyboard([[Markup.button.url("🛒 BELI SEKARANG", `https://t.me/${botUser}`)]]);

  if (config.testimoniChannel && config.buyvpsfoto) {
    await ctx.telegram.sendPhoto(config.testimoniChannel, config.buyvpsfoto, { caption: promoMsg, parse_mode: "HTML", ...promoKb }).catch(()=>{});
  }

  delete userState[userId];
  return;
}

  if (userState[userId]?.step === "WAITING_APP_TEXT") {
  if (userId !== config.ownerId) return next();
  
  const parts = text.split("|").map(x => x.trim());
  if (parts.length !== 3) {
    return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan: Nama | Harga | Deskripsi</blockquote>", { parse_mode: "HTML" });
  }
  
  const [nama, hargaStr, deskripsi] = parts;
  const harga = parseInt(hargaStr);
  
  if (isNaN(harga) || harga <= 0) {
    return safeReply(ctx, "<blockquote>❌ Harga harus angka positif!</blockquote>", { parse_mode: "HTML" });
  }
  
  try {
    const db = readDb();
    const newApp = {
      nama,
      harga,
      deskripsi,
      accounts: [] 
    };
    
    db.apps.push(newApp);
    saveDb(db);
    const idx = db.apps.length - 1;
    
    const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    
    sendProductNotification("app", newApp, addedBy);
    
    await safeReply(ctx, `<blockquote><b>✅ App Premium ditambahkan!</b>\n<b>📱 ${nama}</b>\n<b>Stock:</b> 0\n\n📢 Notifikasi telah dikirim ke channel!</blockquote>`, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [ Markup.button.callback("📄 List Account", `list_accounts_${idx}`) ],
        [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
      ])
    });
    
  } catch (e) {
    console.error(e);
    safeReply(ctx, "❌ Gagal menyimpan data app ke database.");
  }
  
  delete userState[userId];
  return;
}

if (userState[userId]?.step === "WAITING_ADD_DO") {
  if (userId !== Number(config.ownerId)) return next();

  const lines = text.split("\n").map(v => v.trim()).filter(Boolean);
  const addedProducts = new Set();
  let totalAddedCount = 0;
  
  // Array untuk menampung akun yang valid di sesi ini saja (untuk ringkasan chat)
  let detailMsg = `<b>✅ AKUN DIGITALOCEAN BERHASIL DITAMBAHKAN!</b>\n\n`;

  try {
    // 1. Proses setiap baris input
    for (const line of lines) {
      const parts = line.split("|").map(x => x.trim());
      
      // Validasi 6 bagian: email | pw | auth | link | price | product
      if (parts.length < 6) continue;

      const [email, password, auth, loginLink, priceStr, product] = parts;
      const price = parseInt(priceStr);

      if (isNaN(price)) continue;

      // 2. Simpan ke database (Asumsi variabel doAccounts global atau dari readDb)
      doAccounts.push({
        email,
        password,
        auth,
        loginLink,
        price,
        product,
        used: false
      });

      addedProducts.add(product);
      totalAddedCount++;

      // Bangun pesan detail untuk owner
      detailMsg += `📧 <b>Email:</b> <code>${email}</code>\n`;
      detailMsg += `🔑 <b>Pass:</b> <code>${password}</code>\n`;
      detailMsg += `🛡️ <b>Auth:</b> <code>${auth}</code>\n`;
      detailMsg += `🔗 <b>Link:</b> <a href="${loginLink}">Login Link</a>\n`;
      detailMsg += `💰 <b>Harga:</b> ${toRupiah(price)}\n`;
      detailMsg += `🖥️ <b>Produk:</b> ${product}\n`;
      detailMsg += `────────────────────\n`;
    }

    if (totalAddedCount === 0) {
      return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan:\nemail | password | auth | link login | price | nama produk</blockquote>", { parse_mode: "HTML" });
    }

    // 3. Simpan Database
    saveDOAccounts(doAccounts);

    // 4. Kirim Ringkasan ke Owner
    await safeReply(ctx, detailMsg, { 
      parse_mode: "HTML", 
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Kembali ke Menu", "menu_owner")]
      ])
    });

    // 5. Format & Kirim Pesan Promo (Notifikasi Channel)
    const now = new Date();
    const timestamp = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) + 
                      `, ${now.toLocaleTimeString("id-ID", { hour12: false }).replace(/:/g, '.')}`;
    
    const totalStokSekarang = doAccounts.filter(a => !a.used).length;
    const productList = [...addedProducts].join(", ");

    const promoMsg = `🔔<b>STOK BARU TELAH DITAMBAHKAN</b>🔔\n<i>New Stock Notification</i>\n\n` +
                  `📦<b>PRODUK:</b> ${productList}\n` +
                  `📝<b>DESKRIPSI:</b> ${config.rulesdo || "-"}\n\n` +
                  `📊<b>STOK TOTAL:</b> ${totalStokSekarang} akun\n` +
                  `👤<b>DI TAMBAHKAN OLEH:</b> ${ctx.from.first_name}\n` +
                  `🕒<b>WAKTU:</b> ${timestamp}\n` +
                  `────────────────────\n` +
                  `<b>SEGERA PESAN SEBELUM KEHABISAN 😊</b>\n\n` +
                  `<b>Order lewat bot »</b> @${ctx.botInfo.username}`;

    const promoKeyboard = Markup.inlineKeyboard([
      [Markup.button.url("🛒 BELI SEKARANG", `https://t.me/${ctx.botInfo.username}`)]
    ]);

    // Kirim ke Channel
    if (config.testimoniChannel) {
      try {
        await ctx.telegram.sendPhoto(config.testimoniChannel, config.buydofoto, {
          caption: promoMsg,
          parse_mode: "HTML",
          ...promoKeyboard
        });
      } catch (e) { console.error("Gagal kirim ke channel:", e.message); }
    }

    // Kirim ulang promo ke owner sebagai preview
    await ctx.telegram.sendPhoto(ctx.from.id, config.buydofoto, {
      caption: promoMsg,
      parse_mode: "HTML",
      ...promoKeyboard
    });

  } catch (e) {
    console.error(e);
    safeReply(ctx, "❌ Terjadi kesalahan saat memproses data akun.");
  }

  // Bersihkan state setelah selesai
  delete userState[userId];
  return;
}


  if (userState[userId]?.step === "WAITING_ADD_ACCOUNT") {
  if (userId !== config.ownerId) return next();
  
  const st = userState[userId];
  const parts = text.split("|").map(x => x.trim());
  
  if (parts.length !== 4) {
    return safeReply(ctx, "<blockquote>❌ Format salah! Gunakan: username|password|link akses|deskripsi</blockquote>", { parse_mode: "HTML" });
  }
  
  const [usernameA, passwordA, linkA, descA] = parts;
  
  try {
    const db = readDb();
    const app = db.apps[st.appIndex];
    
    if (!app) {
      return safeReply(ctx, "❌ App tidak ditemukan / sudah dihapus.");
    }
    
    app.accounts = app.accounts || [];
    app.accounts.push({ 
      user: usernameA, 
      pass: passwordA, 
      link: linkA, 
      desc: descA 
    });
    
    saveDb(db);
    const stockNow = app.accounts.length;
    
    const addedBy = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const accountData = {
      appName: app.nama,
      username: usernameA,
      password: passwordA,
      link: linkA,
      desc: descA,
      newStock: stockNow
    };
    
    sendProductNotification("account", accountData, addedBy);
    
    safeReply(ctx, `<blockquote><b>✅ Akun ditambahkan!</b>\n<b>Stock sekarang:</b> ${stockNow}\n\n📢 Notifikasi telah dikirim ke channel!</blockquote>`, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [ Markup.button.callback("➕ Tambah lagi", `owner_add_account`) ],
        [ Markup.button.callback("📃 List App Premium", "list_apps") ],
        [ Markup.button.callback("🔙 Kembali ke Owner Menu", "menu_owner") ]
      ])
    });
    
  } catch (e) {
    console.error(e);
    safeReply(ctx, "❌ Gagal menambahkan akun ke database.");
  }
  
  delete userState[userId];
  return;
}
  if (userState[userId]?.step === "WAITING_SET_DO_TOKEN") {
    if (userId !== config.ownerId) return next();
    const db = readDb();
    db.integrations = db.integrations || {};
    db.integrations.digitalOcean = { token: text.trim() };
    saveDb(db);
    delete userState[userId];
    return safeReply(ctx, "<b>DigitalOcean API Token disimpan.</b>", { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) });
  }

  if (userState[userId]?.step === "WAITING_SET_PANEL") {
    if (userId !== config.ownerId) return next();
    const parts = text.split("|").map(s => s.trim());
    if (parts.length !== 2) {
      return safeReply(ctx, "Format salah. Gunakan: <code>domain|apikey</code>", { parse_mode: "HTML" });
    }
    const [domain, apikey] = parts;
    const db = readDb();
    db.integrations = db.integrations || {};
    db.integrations.panel = { domain, apikey };
    saveDb(db);
    delete userState[userId];
    return safeReply(ctx, "<b>Panel API disimpan.</b>", { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) });
  }

  return next();
});

async function downloadQrisImage(url) {
  try {
    console.log("[DEBUG] Downloading QRIS image from:", url);
    
    if (!url || !url.startsWith('http')) {
      throw new Error('URL QRIS tidak valid: ' + url);
    }
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Gambar QRIS kosong');
    }
    
    console.log("[DEBUG] QRIS image downloaded successfully, size:", response.data.length, "bytes");
    return Buffer.from(response.data);
    
  } catch (error) {
    console.error("[ERROR] Failed to download QRIS image:", error.message);
    console.error("[ERROR] URL:", url);
    return null;
  }
}

async function handleDeposit(ctx, nominal) {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const activePaymentMethod = typeof getActivePaymentMethod === 'function' ? getActivePaymentMethod() : "pakasir";

  // ================= 1. CEK JIKA PAYMENT MANUAL AKTIF =================
  if (activePaymentMethod === "manual") {
    return safeReply(ctx, 
      "<b>───「 ⚠️ AKSES DITOLAK 」───</b>\n\n" +
      "<i>Mohon maaf, fitur Deposit Saldo tidak mendukung pembayaran via Manual.</i>\n\n" +
      "💡 <b>Solusi:</b>\n" +
      "• Silahkan hubungi @albyy0x untuk bantuan top-up manual.\n" +
      "• Tunggu hingga owner mengaktifkan QRIS Otomatis.", 
      { parse_mode: "HTML" }
    );
  }

  // ================= 2. DEPOSIT PAKASIR (OTOMATIS) =================
  const paymentConfig = config.pakasir;
  const msgLoading = await safeReply(ctx, "<blockquote>🔄 <b>Menyiapkan QRIS Deposit...</b></blockquote>", { parse_mode: "HTML" });

  let qrisData = await createdQris(nominal, paymentConfig);
  if (!qrisData) {
    await new Promise(r => setTimeout(r, 1000));
    qrisData = await createdQris(nominal, paymentConfig);
  }

  try { await ctx.deleteMessage(msgLoading.message_id); } catch (e) {}

  if (!qrisData) {
    return safeReply(ctx, "<blockquote>❌ <b>Gagal memproses QRIS.</b></blockquote>", { parse_mode: "HTML" });
  }

  let photoToSend = null;

  try {
    const qrString = qrisData.qr_string;

    // --- LOGIKA CANVAS (JANGAN DIUBAH) ---
if (qrString) {
  try {
    const canvas = createCanvas(1000, 1000); 
    const g = canvas.getContext('2d');

    // --- 1. DEEP SPACE BACKGROUND ---
    const bgGrad = g.createRadialGradient(500, 500, 0, 500, 500, 1000);
    bgGrad.addColorStop(0, '#1a1f35'); // Biru gelap navy
    bgGrad.addColorStop(1, '#050508'); // Hitam pekat
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, 1000, 1000);

    // --- 2. SCANLINE EFFECT (Tekstur Monitor) ---
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    g.lineWidth = 1;
    for (let i = 0; i < 1000; i += 4) {
        g.beginPath();
        g.moveTo(0, i); g.lineTo(1000, i);
        g.stroke();
    }
    g.restore();

    // --- 3. HEXAGONAL MESH (Enhanced) ---
    const drawHexGrid = () => {
        g.save();
        g.strokeStyle = 'rgba(0, 210, 255, 0.08)';
        g.shadowBlur = 5; g.shadowColor = '#00d2ff';
        const size = 50;
        for (let y = 0; y < 1100; y += size * 1.5) {
            for (let x = 0; x < 1100; x += size * Math.sqrt(3)) {
                const off = (Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                g.beginPath();
                for (let i = 0; i < 6; i++) {
                    let angle = (Math.PI / 3) * i;
                    g.lineTo(x + off + size * Math.cos(angle), y + size * Math.sin(angle));
                }
                g.closePath();
                g.stroke();
            }
        }
        g.restore();
    };
    drawHexGrid();

    // --- 4. THE MASTER FRAME (Cyber Shield) ---
    // Outer Neon Glow
    g.save();
    g.shadowBlur = 40; g.shadowColor = '#00d2ff';
    g.lineWidth = 3;
    g.strokeStyle = '#00d2ff';
    // Gambar border dengan aksen terpotong di pojok
    g.beginPath();
    g.roundRect(165, 165, 670, 670, 45);
    g.stroke();
    
    // Glass Effect dengan Refleksi Cahaya
    const glassGrad = g.createLinearGradient(165, 165, 835, 835);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glassGrad.addColorStop(0.5, 'rgba(230, 245, 255, 0.95)');
    glassGrad.addColorStop(1, 'rgba(180, 220, 255, 0.9)');
    g.fillStyle = glassGrad;
    g.fill();
    
    // Aksen kilatan cahaya di pojok kiri atas kaca
    const shine = g.createLinearGradient(200, 200, 400, 400);
    shine.addColorStop(0, 'rgba(255,255,255,0.4)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fill();
    g.restore();

    // --- 5. RENDER QR ---
    const qrBuffer = await QRCode.toBuffer(qrString, { 
        margin: 1, 
        width: 580,
        color: { dark: '#0a0f1e', light: '#00000000' } 
    });
    const qrImage = await loadImage(qrBuffer);
    // Tambahkan sedikit shadow lembut di bawah QR agar "mengambang"
    g.save();
    g.shadowBlur = 15; g.shadowColor = 'rgba(0,0,0,0.2)';
    g.drawImage(qrImage, 210, 210, 580, 580);
    g.restore();

    // --- 6. FLOATING HUD ELEMENTS ---
    g.fillStyle = '#ff0044';
    g.font = 'bold 14px Monospace';
    g.fillText('SECURE ENCRYPTION: AES-256', 220, 200);
    g.textAlign = 'right';
    g.fillText('STATUS: VERIFIED', 780, 200);

    // --- 7. HEADER & TYPOGRAPHY ---
    g.textAlign = 'center';
    g.letterSpacing = "4px";
    g.font = 'bold 22px Courier New';
    g.fillStyle = '#00d2ff';
    g.shadowBlur = 10; g.shadowColor = '#00d2ff';
    g.fillText('▼ SYSTEM READY FOR UPLINK ▼', 500, 75);

    // Title dengan Gradient Silver-Blue
    const titleGrad = g.createLinearGradient(0, 100, 0, 160);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#a0c4ff');
    g.fillStyle = titleGrad;
    g.font = 'italic 900 85px Arial';
    g.fillText('ACCESS GRANTED', 500, 145);

    // --- 8. FOOTER: BRANDING ---
    // Reseller Badge Chrome Style
    g.shadowBlur = 15; g.shadowColor = '#ff0044';
    g.fillStyle = '#ff0044';
    g.beginPath();
    g.roundRect(360, 845, 280, 45, 5);
    g.fill();
    
    g.fillStyle = '#ffffff';
    g.font = '900 22px Arial';
    g.letterSpacing = "1px";
    g.fillText('QRIS PAKASIR', 500, 876);

    // Ultra Large Text: RASYA (Customized)
    const rasyaGrad = g.createLinearGradient(0, 910, 0, 990);
    rasyaGrad.addColorStop(0, '#ffffff');
    rasyaGrad.addColorStop(0.5, '#00d2ff');
    rasyaGrad.addColorStop(1, '#0055ff');
    
    g.shadowBlur = 25; g.shadowColor = 'rgba(0, 210, 255, 0.8)';
    g.font = 'italic 900 145px Arial'; // Ukuran disesuaikan agar lebih dominan
    g.fillStyle = rasyaGrad;
    g.fillText('Auto Order', 500, 980);

    // --- 9. CORNER HUD BRACKETS ---
    const drawCyberCorner = (x, y, r1) => {
        g.save();
        g.translate(x, y);
        g.rotate(r1);
        g.strokeStyle = '#ff0044';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(0, 120); g.lineTo(0, 0); g.lineTo(120, 0);
        g.stroke();
        // Cyber Dot
        g.fillStyle = '#00d2ff';
        g.shadowBlur = 10; g.shadowColor = '#00d2ff';
        g.fillRect(-10, -10, 20, 20);
        g.restore();
    };
    drawCyberCorner(40, 40, 0); // TL
    drawCyberCorner(960, 40, Math.PI / 2); // TR
    drawCyberCorner(40, 960, -Math.PI / 2); // BL
    drawCyberCorner(960, 960, Math.PI); // BR

    photoToSend = { source: canvas.toBuffer('image/jpeg', { quality: 1.0 }) };
  } catch (e) {
    console.error("Gagal membuat canvas:", e);
  }
}


    // --- LOGIKA FALLBACK ---
    if (!photoToSend) {
      if (qrisData.imageqris instanceof Buffer) {
        photoToSend = { source: qrisData.imageqris };
      } else if (qrisData.qr_string && qrisData.qr_string.trim().length > 0) {
        const qrBuffer = await QRCode.toBuffer(qrisData.qr_string);
        photoToSend = { source: qrBuffer };
      }
    }

    const orderId = qrisData.idtransaksi || qrisData.id;
    const totalBayar = qrisData.nominal || nominal;
    const biayaAdmin = totalBayar - nominal;

    const captionDepo = `<b>🏦 QRIS PAYMENT GATEWAY (PAKASIR)</b>
<b>━━━━━━━━━━━━━━━━━━━━━</b>

<b>〔 📝 RINCIAN PEMBAYARAN 〕</b>
➥ <b>ID Pembayaran :</b> <code>${orderId}</code>
➥ <b>Jumlah Depo  :</b> <code>${toRupiah(nominal)}</code>
➥ <b>Biaya Layanan :</b> <code>${toRupiah(biayaAdmin)}</code>
➥ <b>Total Bayar   :</b> <code>${toRupiah(totalBayar)}</code>

<b>〔 ⏳ STATUS TRANSAKSI 〕</b>
➥ <b>Masa Berlaku  :</b> 60 Menit
➥ <b>Metode        :</b> QRIS Scan All Payment
➥ <b>Proses        :</b> Otomatis (Instant)

<b>〔 💡 INSTRUKSI SCAN 〕</b>
1. <b>Screenshot</b> QR Code yang muncul.
2. Buka aplikasi <b>DANA, OVO, GOPAY</b> atau <b>M-Banking</b>.
3. Arahkan Scan ke gambar QR.

<b>━━━━━━━━━━━━━━━━━━━━━</b>
<i>Powered by @albyy0x</i>`;

    const msgQris = await ctx.replyWithPhoto(photoToSend, {
      caption: captionDepo,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([[Markup.button.callback("❌ Batalkan Transaksi", "cancel_trx")]])
    });

    activeTransactions[userId] = {
      id: orderId,
      amount: totalBayar,
      status: 'pending',
      messageId: msgQris.message_id,
      paymentMethod: activePaymentMethod
    };

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (!activeTransactions[userId] || attempts > 72) {
        clearInterval(interval);
        return;
      }

      try {
        const isPaid = await cekStatus(orderId, totalBayar, paymentConfig);
        if (isPaid) {
          clearInterval(interval);
          try { await ctx.deleteMessage(activeTransactions[userId].messageId); } catch (e) {}
          delete activeTransactions[userId];

          const dbPath = "./database/saldousers.json";
          let saldoDB = {};
          if (fs.existsSync(dbPath)) saldoDB = JSON.parse(fs.readFileSync(dbPath, "utf8"));
          
          saldoDB[userId] = (saldoDB[userId] || 0) + nominal;
          fs.writeFileSync(dbPath, JSON.stringify(saldoDB, null, 2));

          await ctx.reply(
            `<b>✅ DEPOSIT BERHASIL DIKONFIRMASI!</b>\n\n` +
            `📦 <b>Diterima :</b> ${toRupiah(nominal)}\n` +
            `💰 <b>Total Saldo :</b> ${toRupiah(saldoDB[userId])}\n\n` +
            `<i>Saldo telah ditambahkan otomatis. Terima kasih!</i>`, 
            { parse_mode: "HTML" }
          );

          const textToReport = 
            `🚀 <b>NOTIFIKASI DEPOSIT BERHASIL</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `👤 <b>Pembeli:</b> ${userName}\n` +
            `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
            `💰 <b>Nominal:</b> ${toRupiah(nominal)}\n` +
            `💳 <b>Metode:</b> QRIS ${activePaymentMethod}\n` +
            `🧾 <b>Order ID:</b> <code>${orderId}</code>\n` +
            `📅 <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n` +
            `✨ <b>Status:</b> Success / Paid\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>Terima kasih telah berlangganan!</i>`;

          try {
            const msgToOwner = await bot.telegram.sendMessage(config.ownerId, textToReport, { parse_mode: "HTML" });
            if (config.testimoniChannel && msgToOwner) {
              await bot.telegram.forwardMessage(config.testimoniChannel, config.ownerId, msgToOwner.message_id);
            }
          } catch (e) {}
        }
      } catch (e) { console.log("Cek depo error:", e.message); }
    }, 5000);

  } catch (error) {
    console.error(error);
    safeReply(ctx, "❌ <b>Gagal memproses transaksi.</b>");
  }
}

async function handleDonasi(ctx, nominal) {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const activePaymentMethod = typeof getActivePaymentMethod === 'function' ? getActivePaymentMethod() : "pakasir";

  // ================= 1. CEK JIKA PAYMENT MANUAL AKTIF =================
  if (activePaymentMethod === "manual") {
    return safeReply(ctx, 
      "<b>───「 ⚠️ AKSES DITOLAK 」───</b>\n\n" +
      "<i>Mohon maaf, fitur Donasi Otomatis sedang tidak tersedia via Manual.</i>\n\n" +
      "💡 <b>Solusi:</b>\n" +
      "• Silahkan hubungi @albyy0x jika ingin berdonasi secara langsung.\n" +
      "• Tunggu hingga sistem QRIS Otomatis kembali aktif.", 
      { parse_mode: "HTML" }
    );
  }

  // ================= 2. DONASI PAKASIR (OTOMATIS) =================
  const paymentConfig = config.pakasir;
  const msgLoading = await safeReply(ctx, "<blockquote>🔄 <b>Membuat QRIS...</b></blockquote>", { parse_mode: "HTML" });

  let qrisData = await createdQris(nominal, paymentConfig);
  if (!qrisData) {
    await new Promise(r => setTimeout(r, 1000));
    qrisData = await createdQris(nominal, paymentConfig);
  }

  try { await ctx.deleteMessage(msgLoading.message_id); } catch (e) {}

  if (!qrisData) {
    return safeReply(ctx, "<blockquote>❌ <b>Gagal membuat QRIS.</b></blockquote>", { parse_mode: "HTML" });
  }

  let photoToSend = null;

  try {
    const qrString = qrisData.qr_string;

    // --- LOGIKA CANVAS (JANGAN DIUBAH) ---
if (qrString) {
  try {
    const canvas = createCanvas(1000, 1000); 
    const g = canvas.getContext('2d');

    // --- 1. DEEP SPACE BACKGROUND ---
    const bgGrad = g.createRadialGradient(500, 500, 0, 500, 500, 1000);
    bgGrad.addColorStop(0, '#1a1f35'); // Biru gelap navy
    bgGrad.addColorStop(1, '#050508'); // Hitam pekat
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, 1000, 1000);

    // --- 2. SCANLINE EFFECT (Tekstur Monitor) ---
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    g.lineWidth = 1;
    for (let i = 0; i < 1000; i += 4) {
        g.beginPath();
        g.moveTo(0, i); g.lineTo(1000, i);
        g.stroke();
    }
    g.restore();

    // --- 3. HEXAGONAL MESH (Enhanced) ---
    const drawHexGrid = () => {
        g.save();
        g.strokeStyle = 'rgba(0, 210, 255, 0.08)';
        g.shadowBlur = 5; g.shadowColor = '#00d2ff';
        const size = 50;
        for (let y = 0; y < 1100; y += size * 1.5) {
            for (let x = 0; x < 1100; x += size * Math.sqrt(3)) {
                const off = (Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                g.beginPath();
                for (let i = 0; i < 6; i++) {
                    let angle = (Math.PI / 3) * i;
                    g.lineTo(x + off + size * Math.cos(angle), y + size * Math.sin(angle));
                }
                g.closePath();
                g.stroke();
            }
        }
        g.restore();
    };
    drawHexGrid();

    // --- 4. THE MASTER FRAME (Cyber Shield) ---
    // Outer Neon Glow
    g.save();
    g.shadowBlur = 40; g.shadowColor = '#00d2ff';
    g.lineWidth = 3;
    g.strokeStyle = '#00d2ff';
    // Gambar border dengan aksen terpotong di pojok
    g.beginPath();
    g.roundRect(165, 165, 670, 670, 45);
    g.stroke();
    
    // Glass Effect dengan Refleksi Cahaya
    const glassGrad = g.createLinearGradient(165, 165, 835, 835);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glassGrad.addColorStop(0.5, 'rgba(230, 245, 255, 0.95)');
    glassGrad.addColorStop(1, 'rgba(180, 220, 255, 0.9)');
    g.fillStyle = glassGrad;
    g.fill();
    
    // Aksen kilatan cahaya di pojok kiri atas kaca
    const shine = g.createLinearGradient(200, 200, 400, 400);
    shine.addColorStop(0, 'rgba(255,255,255,0.4)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fill();
    g.restore();

    // --- 5. RENDER QR ---
    const qrBuffer = await QRCode.toBuffer(qrString, { 
        margin: 1, 
        width: 580,
        color: { dark: '#0a0f1e', light: '#00000000' } 
    });
    const qrImage = await loadImage(qrBuffer);
    // Tambahkan sedikit shadow lembut di bawah QR agar "mengambang"
    g.save();
    g.shadowBlur = 15; g.shadowColor = 'rgba(0,0,0,0.2)';
    g.drawImage(qrImage, 210, 210, 580, 580);
    g.restore();

    // --- 6. FLOATING HUD ELEMENTS ---
    g.fillStyle = '#ff0044';
    g.font = 'bold 14px Monospace';
    g.fillText('SECURE ENCRYPTION: AES-256', 220, 200);
    g.textAlign = 'right';
    g.fillText('STATUS: VERIFIED', 780, 200);

    // --- 7. HEADER & TYPOGRAPHY ---
    g.textAlign = 'center';
    g.letterSpacing = "4px";
    g.font = 'bold 22px Courier New';
    g.fillStyle = '#00d2ff';
    g.shadowBlur = 10; g.shadowColor = '#00d2ff';
    g.fillText('▼ SYSTEM READY FOR UPLINK ▼', 500, 75);

    // Title dengan Gradient Silver-Blue
    const titleGrad = g.createLinearGradient(0, 100, 0, 160);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#a0c4ff');
    g.fillStyle = titleGrad;
    g.font = 'italic 900 85px Arial';
    g.fillText('ACCESS GRANTED', 500, 145);

    // --- 8. FOOTER: BRANDING ---
    // Reseller Badge Chrome Style
    g.shadowBlur = 15; g.shadowColor = '#ff0044';
    g.fillStyle = '#ff0044';
    g.beginPath();
    g.roundRect(360, 845, 280, 45, 5);
    g.fill();
    
    g.fillStyle = '#ffffff';
    g.font = '900 22px Arial';
    g.letterSpacing = "1px";
    g.fillText('QRIS PAKASIR', 500, 876);

    // Ultra Large Text: RASYA (Customized)
    const rasyaGrad = g.createLinearGradient(0, 910, 0, 990);
    rasyaGrad.addColorStop(0, '#ffffff');
    rasyaGrad.addColorStop(0.5, '#00d2ff');
    rasyaGrad.addColorStop(1, '#0055ff');
    
    g.shadowBlur = 25; g.shadowColor = 'rgba(0, 210, 255, 0.8)';
    g.font = 'italic 900 145px Arial'; // Ukuran disesuaikan agar lebih dominan
    g.fillStyle = rasyaGrad;
    g.fillText('Auto Order', 500, 980);

    // --- 9. CORNER HUD BRACKETS ---
    const drawCyberCorner = (x, y, r1) => {
        g.save();
        g.translate(x, y);
        g.rotate(r1);
        g.strokeStyle = '#ff0044';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(0, 120); g.lineTo(0, 0); g.lineTo(120, 0);
        g.stroke();
        // Cyber Dot
        g.fillStyle = '#00d2ff';
        g.shadowBlur = 10; g.shadowColor = '#00d2ff';
        g.fillRect(-10, -10, 20, 20);
        g.restore();
    };
    drawCyberCorner(40, 40, 0); // TL
    drawCyberCorner(960, 40, Math.PI / 2); // TR
    drawCyberCorner(40, 960, -Math.PI / 2); // BL
    drawCyberCorner(960, 960, Math.PI); // BR

    photoToSend = { source: canvas.toBuffer('image/jpeg', { quality: 1.0 }) };
  } catch (e) {
    console.error("Gagal membuat canvas:", e);
  }
}


    // --- LOGIKA FALLBACK AGAR TIDAK ERROR ---
    if (!photoToSend) {
      if (qrisData.imageqris instanceof Buffer) {
        photoToSend = { source: qrisData.imageqris };
      } else if (qrisData.qr_string && qrisData.qr_string.trim().length > 0) {
        const qrBuffer = await QRCode.toBuffer(qrisData.qr_string);
        photoToSend = { source: qrBuffer };
      }
    }

    const orderId = qrisData.idtransaksi || qrisData.id;
    const totalBayar = qrisData.nominal || nominal;
    const biayaAdmin = totalBayar - nominal;

    const captionDonasi = `<blockquote><b>───「 🎁 DUKUNGAN DONASI 」───</b>

<b>〔 📝 RINCIAN DONASI 〕</b>
➥ <b>ID Transaksi :</b> <code>${orderId}</code>
➥ <b>Nominal     :</b> <code>${toRupiah(nominal)}</code>
➥ <b>Biaya Admin   :</b> <code>${toRupiah(biayaAdmin)}</code>
➥ <b>Total Bayar   :</b> <code>${toRupiah(totalBayar)}</code>

<b>〔 ⏳ MASA BERLAKU 〕</b>
➥ <b>Waktu Scan    :</b> 60 Menit
➥ <b>Metode        :</b> QRIS (All Payment)
➥ <b>Status        :</b> Otomatis Terdeteksi

<b>〔 💡 CARA BERDONASI 〕</b>
1. Scan QR Code di atas menggunakan E-Wallet/M-Banking.
2. Pastikan nominal sesuai agar sistem bisa verifikasi.
3. Tunggu hingga pesan konfirmasi sukses muncul.

<b>━━━━━━━━━━━━━━━━━━━━━</b>
<i>Kebaikanmu sangat berarti bagi kami. @</i></blockquote>`;

    const msgQris = await ctx.replyWithPhoto(photoToSend, {
      caption: captionDonasi,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([[Markup.button.callback("❌ BATALKAN DONASI", "cancel_donasi")]])
    });

    activeTransactions[userId] = {
      id: orderId,
      amount: totalBayar,
      status: 'pending',
      messageId: msgQris.message_id,
      paymentMethod: activePaymentMethod
    };

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (!activeTransactions[userId] || attempts > 72) {
        clearInterval(interval);
        return;
      }

      try {
        const isPaid = await cekStatus(orderId, totalBayar, paymentConfig);
        if (isPaid) {
          clearInterval(interval);
          try { await ctx.deleteMessage(activeTransactions[userId].messageId); } catch (e) {}
          delete activeTransactions[userId];

          const dirPath = "./database";
          const dbPath = path.join(dirPath, "donasi.json");
          if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

          let donasiDB = {};
          if (fs.existsSync(dbPath)) {
            try { donasiDB = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch (e) { donasiDB = {}; }
          }
          
          donasiDB[userId] = (donasiDB[userId] || 0) + nominal;
          fs.writeFileSync(dbPath, JSON.stringify(donasiDB, null, 2));

          const thanksMessage = 
            `<b>───「 ❤️ DONASI DITERIMA 」───</b>\n\n` +
            `ʜᴀʟᴏ <b>${userName}</b>, ᴛᴇʀɪᴍᴀ ᴋᴀꜱɪʜ ʏᴀɴɢ ᴛᴀᴋ ᴛᴇʀʜɪɴɢɢᴀ ᴀᴛᴀꜱ ᴅᴜᴋᴜɴɢᴀɴɴʏᴀ!\n\n` +
            `<b>〔 ɪɴꜰᴏʀᴍᴀꜱɪ ᴅᴏɴᴀꜱɪ 〕</b>\n` +
            `➥ <b>ᴊᴜᴍʟᴀʜ :</b> <pre>${toRupiah(nominal)}</pre>\n` +
            `➥ <b>ᴛᴏᴛᴀʟ ᴅᴏɴᴀꜱɪ ᴀɴᴅᴀ :</b> <pre>${toRupiah(donasiDB[userId])}</pre>\n\n` +
            `✨ <i>"Terima kasih sudah menjadi bagian dari perjalanan kami. Semoga rezekinya mengalir deras seperti air, dilancarkan segala urusannya, dan dibalas dengan kebaikan yang berlipat ganda oleh Allah SWT. Sehat selalu ya kak!"</i> ✨\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<b>With Love:</b> @albyy0x`;

          await ctx.reply(thanksMessage, { parse_mode: "HTML" });

          try {
            await ctx.replyWithSticker("CAACAgIAAxkBAAIQDWmPBc5FXl_yjDnRxP-8Hi5yoHpWAAJxFQACwGS4Su6Xv_Scp-RSOgQ");
          } catch (e) {}

          const textToReport = 
            `🎁 <b>NOTIFIKASI DONASI MASUK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `👤 <b>Donatur:</b> ${userName}\n` +
            `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
            `💰 <b>Nominal:</b> ${toRupiah(nominal)}\n` +
            `💳 <b>Metode:</b> QRIS ${activePaymentMethod}\n` +
            `📅 <b>Waktu:</b> ${new Date().toLocaleString("id-ID")}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`;

          try {
            const msgToOwner = await bot.telegram.sendMessage(config.ownerId, textToReport, { parse_mode: "HTML" });
            if (config.testimoniChannel && msgToOwner) {
              await bot.telegram.forwardMessage(config.testimoniChannel, config.ownerId, msgToOwner.message_id);
            }
          } catch (e) {}
        }
      } catch (e) { console.log("Cek donasi error:", e.message); }
    }, 5000);

  } catch (error) {
    console.error(error);
    safeReply(ctx, "❌ <b>Gagal memproses donasi.</b>");
  }
}


bot.action("donasi_menu", async (ctx) => {
  if (!isPrivateChat(ctx)) {
    return ctx.answerCbQuery("❌ Gunakan Private Chat!");
  }
  
  // Set user ke step menunggu nominal donasi
  userState[ctx.from.id] = { step: "WAITING_DONASI" };

  await editMenuMessage(ctx, 
    "<b>───「 🎁 DUKUNGAN DONASI 」───</b>\n\n" +
    "Terima kasih atas niat baikmu untuk mendukung kami. Silakan kirim <b>Nominal</b> donasi yang ingin kamu berikan.\n\n" +
    "📌 <b>Ketentuan:</b>\n" +
    "• Minimal Donasi: <code>Rp 500</code>\n" +
    "• Format: <code>Angka saja (Contoh: 5000)</code>\n" +
    "• Metode: <b>QRIS Otomatis (Pakasir)</b>\n\n" +
    "<i>Kebaikan kecilmu sangat berarti bagi perkembangan bot ini.</i>", 
    { 
      parse_mode: "HTML",
      reply_markup: { 
        inline_keyboard: [
          [{ text: "❌ Batalkan", callback_data: "back_home" }]
        ] 
      }
    }
  );
});


bot.action("topup_saldos", async (ctx) => {
  if (!isPrivateChat(ctx)) {
    return ctx.answerCbQuery("❌ Gunakan Private Chat!");
  }
  
  // Set user ke step menunggu nominal
  userState[ctx.from.id] = { step: "WAITING_TOPUP" };

  await editMenuMessage(ctx, 
    "<b>───「 💳 TOP UP SALDO 」───</b>\n\n" +
    "Silakan kirim <b>Nominal</b> deposit yang kamu inginkan.\n\n" +
    "📌 <b>Ketentuan:</b>\n" +
    "• Minimal Deposit: <code>Rp 1.000</code>\n" +
    "• Format: <code>Angka saja (Contoh: 10000)</code>\n" +
    "• Metode: <b>QRIS Otomatis (Pakasir)</b>\n\n" +
    "<i>Ketik nominal sekarang atau klik batal...</i>", 
    { 
      parse_mode: "HTML",
      reply_markup: { 
        inline_keyboard: [
          [{ text: "❌ Batalkan", callback_data: "back_home" }]
        ] 
      }
    }
  );
});

bot.command("claim", async (ctx) => {
  if (!isPrivateChat(ctx)) return ctx.reply("❌ Command ini hanya bisa digunakan di Private Chat.");

  const text = ctx.message.text.replace(/^\/claim\s*/i, "").trim();
  
  if (!text) {
    return ctx.reply("❌ <b>Format Salah!</b>\n\nGunakan: <code>/claim NAMA_KODE</code>\nContoh: <code>/claim HEMAT9K</code>", { parse_mode: "HTML" });
  }

  const kodeInput = text.toUpperCase();
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || "User";
  const promoPath = './database/promo.json';
  const voucherPath = './database/voucher.json';
  
  // 1. Cek ketersediaan file promo
  if (!fs.existsSync(promoPath)) {
    return ctx.reply("❌ Belum ada promo tersedia saat ini.");
  }
  
  let promoDB = JSON.parse(fs.readFileSync(promoPath, 'utf8'));
  const promo = promoDB[kodeInput];

  // 2. Validasi Kode Promo
  if (!promo) {
    return ctx.reply("❌ <b>Kode Promo tidak ditemukan!</b>", { parse_mode: "HTML" });
  }

  if (promo.used >= promo.max) {
    return ctx.reply("❌ <b>Yah, kuota promo ini sudah habis!</b>", { parse_mode: "HTML" });
  }

  // 3. LOGIKA SIMPAN KE VOUCHER.JSON (DATABASE PERMANEN)
  let voucherDB = {};
  if (fs.existsSync(voucherPath)) {
    voucherDB = JSON.parse(fs.readFileSync(voucherPath, 'utf8'));
  }

  // Opsional: Cek jika user sudah klaim kode yang sama sebelumnya agar tidak double claim
  if (voucherDB[userId] && voucherDB[userId].activePromo === kodeInput) {
    return ctx.reply("⚠️ <b>Kamu sudah mengklaim kode ini!</b>\nSilakan gunakan pada pembelian berikutnya.", { parse_mode: "HTML" });
  }

  // Simpan data klaim user
  voucherDB[userId] = {
    activePromo: kodeInput,
    discount: promo.discount,
    claimedAt: new Date().toISOString()
  };

  // Tulis kembali ke file voucher.json
  fs.writeFileSync(voucherPath, JSON.stringify(voucherDB, null, 2));

  // Update kuota di promo.json (Opsional, agar kuota berkurang saat diklaim)
  // promoDB[kodeInput].used += 1;
  // fs.writeFileSync(promoPath, JSON.stringify(promoDB, null, 2));

  // --- NOTIFIKASI KE OWNER ---
  const msgOwner = `<b>🔔 NOTIF KLAIM PROMO</b>\n\n` +
                   `👤 <b>User:</b> ${userName} (<code>${userId}</code>)\n` +
                   `🎫 <b>Kode:</b> <code>${kodeInput}</code>\n` +
                   `💰 <b>Diskon:</b> ${toRupiah(promo.discount)}\n` +
                   `📊 <b>Sisa Kuota:</b> ${promo.max - promo.used}`;
  
  bot.telegram.sendMessage(config.ownerId, msgOwner, { parse_mode: "HTML" }).catch(() => {});

  // --- NOTIFIKASI KE CHANNEL ---
  if (config.testimoniChannel) {
    const msgChannel = `<b>🎟️ KODE PROMO BERHASIL DI-KLAIM!</b>\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `👤 <b>User:</b> ${userName.substring(0, 3)}***\n` +
                       `🎫 <b>Kode:</b> <code>${kodeInput}</code>\n` +
                       `💰 <b>Potongan:</b> ${toRupiah(promo.discount)}\n\n` +
                       `🔥 <i>Segera gunakan kode promomu sebelum kuota habis!</i>\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `🛒 @${bot.botInfo.username}`;
    
    bot.telegram.sendMessage(config.testimoniChannel, msgChannel, { parse_mode: "HTML" }).catch(() => {});
  }

  // --- BALASAN KE USER ---
  return ctx.reply(
    `✅ <b>BERHASIL KLAIM KODE PROMO!</b>\n\n` +
    `🎫 Kode: <code>${kodeInput}</code>\n` +
    `💰 Potongan: <b>-${toRupiah(promo.discount)}</b>\n\n` +
    `<i>Voucher telah disimpan di database. Diskon akan otomatis memotong harga pada pembelian selanjutnya.</i>`,
    { 
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🛍️ Belanja Sekarang", "shop_menu")],
        [Markup.button.callback("🏠 Menu Utama", "back_home")]
      ])
    }
  );
});


// ===================== ADD SALDO (PURE TEXT) =====================
bot.command("addsaldo", async (ctx) => {
  try {
    // ====================== HANYA OWNER ======================
    if (String(ctx.from.id) !== String(config.ownerId)) {
      return ctx.reply("❌ Hanya owner yang bisa menambahkan saldo user.");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
      return ctx.reply("<b>Format Salah!</b>\nContoh: <code>/addsaldo [id] [jumlah]</code>", { parse_mode: "HTML" });
    }

    const targetId = args[1];
    const amount = parseInt(args[2]);

    if (isNaN(amount)) return ctx.reply("❌ Nominal harus angka.");

    const newSaldo = updateSaldo(targetId, amount);

    if (newSaldo !== false) {
      const msgOwner = 
        `🔔 <b>SALDO BERHASIL DITAMBAHKAN</b>\n` +
        `<i>Manual Adjustment Success</i>\n\n` +
        `🗓 <b>TANGGAL:</b> ${new Date().toLocaleString("id-ID")}\n` +
        `👤 <b>TARGET ID:</b> <code>${targetId}</code>\n` +
        `➕ <b>NOMINAL:</b> ${toRupiah(amount)}\n` +
        `📊 <b>TOTAL SEKARANG:</b> ${toRupiah(newSaldo)}\n` +
        `────────────────────\n` +
        `<b>Status:</b> 🟢 <i>Updated Successfully</i>`;

      await ctx.reply(msgOwner, { parse_mode: "HTML" });

      bot.telegram.sendMessage(targetId, 
        `🎁 <b>SALDO MASUK!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Hai, Admin telah menambahkan saldo ke akunmu.\n\n` +
        `💰 <b>Masuk:</b> ${toRupiah(amount)}\n` +
        `💳 <b>Sisa Saldo:</b> ${toRupiah(newSaldo)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Silakan cek di menu saldo!</i>`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  } catch (err) {
    console.error(err);
  }
});

// ===================== DEL SALDO (PURE TEXT) =====================
bot.command("delsaldo", async (ctx) => {
  try {
    // ====================== HANYA OWNER ======================
    if (String(ctx.from.id) !== String(config.ownerId)) {
      return ctx.reply("❌ Hanya owner yang bisa mengurangi saldo user.");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
      return ctx.reply("<b>Format Salah!</b>\nContoh: <code>/delsaldo [id] [jumlah]</code>", { parse_mode: "HTML" });
    }

    const targetId = args[1];
    const amount = parseInt(args[2]);

    if (isNaN(amount)) return ctx.reply("❌ Nominal harus angka.");

    const newSaldo = updateSaldo(targetId, -amount);

    if (newSaldo !== false) {
      const msgOwner = 
        `⚠️ <b>SALDO BERHASIL DIKURANGI</b>\n` +
        `<i>Manual Adjustment Success</i>\n\n` +
        `🗓 <b>TANGGAL:</b> ${new Date().toLocaleString("id-ID")}\n` +
        `👤 <b>TARGET ID:</b> <code>${targetId}</code>\n` +
        `➖ <b>NOMINAL:</b> ${toRupiah(amount)}\n` +
        `📊 <b>TOTAL SEKARANG:</b> ${toRupiah(newSaldo)}\n` +
        `────────────────────\n` +
        `<b>Status:</b> 🔴 <i>Reduced Successfully</i>`;

      await ctx.reply(msgOwner, { parse_mode: "HTML" });

      bot.telegram.sendMessage(targetId, 
        `🛑 <b>PENGURANGAN SALDO</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Saldo kamu telah dikurangi oleh Admin.\n\n` +
        `🔻 <b>Dipotong:</b> ${toRupiah(amount)}\n` +
        `💳 <b>Sisa Saldo:</b> ${toRupiah(newSaldo)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: "HTML" }
      ).catch(() => {});
    }
  } catch (err) {
    console.error(err);
  }
});



// ================= HANDLE PAYMENT =================
// --- FUNGSI HELPER PEMBERSIH (Tambahkan ini agar rapi) ---
function clearUserSession(userId) {
  delete activeTransactions[userId];
  if (typeof userState !== 'undefined' && userState[userId]) {
    delete userState[userId];
  }
}

// --- FUNGSI HELPER HISTORY (Letakkan di luar handlePayment) ---
function saveHistoryTrx(userId, itemName, price) {
  const historyPath = './database/historytrx.json';
  try {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database');
    let historyDB = [];
    if (fs.existsSync(historyPath)) {
      historyDB = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    historyDB.push({
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      userId: userId,
      productName: itemName,
      price: price
    });
    fs.writeFileSync(historyPath, JSON.stringify(historyDB, null, 2));
  } catch (e) {
    console.error("Gagal update historytrx.json:", e.message);
  }
}

async function handlePayment(ctx, nominal, itemName, productData) {
  if (!isPrivateChat(ctx)) {
    await ctx.answerCbQuery?.();
    return safeReply(ctx, "❌ <b>Pembayaran hanya bisa dilakukan di Private Chat!</b>\n\n💬 Silakan chat saya di private: https://t.me/" + bot.botInfo.username, { parse_mode: "HTML" });
  }

  const userId = ctx.from.id;
  
  // ================= LOGIKA AUTO VOUCHER =================
  const voucherPath = './database/voucher.json';
  let diskon = 0;
  let kodeVoucher = null;
  let hargaAwal = nominal;
  let txtPotongan = "";

  if (fs.existsSync(voucherPath)) {
    try {
      let voucherDB = JSON.parse(fs.readFileSync(voucherPath, 'utf8'));
      if (voucherDB[userId]) {
        kodeVoucher = voucherDB[userId].activePromo;
        diskon = voucherDB[userId].discount;
        
        if (diskon >= nominal) {
          diskon = 0;
          txtPotongan = `\n⚠️ <b>Voucher Tidak Berlaku (Harga produk < Diskon)</b>`;
        } else {
          txtPotongan = `\n🧾 <b>Potongan Voucher:</b> -${toRupiah(diskon)}`;
          nominal = Math.max(100, nominal - diskon);
        }
      }
    } catch (e) {
      console.error("Gagal membaca database voucher:", e.message);
    }
  }
  // ========================================================

  if (activeTransactions[userId]) {
    return safeReply(ctx, "<blockquote>⚠️ <b>Ada transaksi pending.</b>\nBila ingin memulai baru, batalkan transaksi sebelumnya.</blockquote>", { 
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([[Markup.button.callback("❌ Batalkan Transaksi", "cancel_trx")]])
    });
  }

  const activePaymentMethod = typeof getActivePaymentMethod === 'function' ? getActivePaymentMethod() : "pakasir";
  
  // ================= LOGIKA MANUAL =================
  if (activePaymentMethod === "manual") {
    if (!config.manualQrisPhoto) {
      return safeReply(ctx, "<blockquote>❌ <b>QRIS manual belum diatur oleh owner.</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
    }
    
    const fee = Math.floor(Math.random() * 100);
    const totalBayar = nominal + fee;
    const orderIdManual = "MANUAL-" + Date.now();
    
    const msgManual = await ctx.replyWithPhoto(config.manualQrisPhoto, {
      caption: `<blockquote>🏦 <b>QRIS PAYMENT MANUAL</b> 🏦
━━━━━━━━━━━━━━━━━━━━━
🧾 <b>ID Pembayaran:</b> <code>${orderIdManual}</code>
💰 <b>Jumlah Harga:</b> ${toRupiah(hargaAwal)}${txtPotongan}
🧾 <b>Biaya Admin:</b> ${toRupiah(fee)}
💳 <b>Total Pembayaran:</b> <code>${toRupiah(totalBayar)}</code>
⏰ <b>Status:</b> Menunggu Bukti

• 🧩 <b>Item:</b> <code>${itemName}</code>

💡 <b>Panduan Pembayaran:</b>
1. Scan kode QR di atas
2. Bayar <b>PAS</b> sesuai nominal total
3. Kirim <b>Foto Bukti Transfer</b> ke bot ini
4. Admin akan memproses pesananmu segera

⚠️ <b>Catatan:</b>
• Simpan ID Pembayaran untuk referensi
• Transaksi diproses manual oleh Admin
• Klik tombol di bawah jika ingin membatalkan</blockquote>`,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Batalkan", "cancel_trx")]
      ])
    });
    
    activeTransactions[userId] = { id: orderIdManual, amount: totalBayar, status: 'pending_manual', messageId: msgManual.message_id, paymentMethod: 'manual', kodeVoucher };
    userState[userId] = { step: "PAYMENT_MANUAL_PENDING", itemName, amount: totalBayar, productData, nominal, orderId: orderIdManual, kodeVoucher };
    return;
  }

  // ================= LOGIKA OTOMATIS (PAKASIR + FULL CANVAS) =================
  const paymentConfig = config.pakasir;
  const msgLoading = await safeReply(ctx, "<blockquote>🔄 <b>Membuat QRIS...</b></blockquote>", { parse_mode: "HTML" });

  let qrisData = await createdQris(nominal, paymentConfig);
  if (!qrisData) {
    await new Promise(r => setTimeout(r, 1000));
    qrisData = await createdQris(nominal, paymentConfig);
  }

  try { await ctx.deleteMessage(msgLoading.message_id); } catch (e) {}

  if (!qrisData) {
    return safeReply(ctx, "<blockquote>❌ <b>Gagal membuat QRIS.</b></blockquote>", { parse_mode: "HTML" });
  }

  let photoToSend = null;

  try {
    const qrString = qrisData.qr_string;

    // --- LOGIKA CANVAS (JANGAN DIUBAH) ---
if (qrString) {
  try {
    const canvas = createCanvas(1000, 1000); 
    const g = canvas.getContext('2d');

    // --- 1. DEEP SPACE BACKGROUND ---
    const bgGrad = g.createRadialGradient(500, 500, 0, 500, 500, 1000);
    bgGrad.addColorStop(0, '#1a1f35'); // Biru gelap navy
    bgGrad.addColorStop(1, '#050508'); // Hitam pekat
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, 1000, 1000);

    // --- 2. SCANLINE EFFECT (Tekstur Monitor) ---
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    g.lineWidth = 1;
    for (let i = 0; i < 1000; i += 4) {
        g.beginPath();
        g.moveTo(0, i); g.lineTo(1000, i);
        g.stroke();
    }
    g.restore();

    // --- 3. HEXAGONAL MESH (Enhanced) ---
    const drawHexGrid = () => {
        g.save();
        g.strokeStyle = 'rgba(0, 210, 255, 0.08)';
        g.shadowBlur = 5; g.shadowColor = '#00d2ff';
        const size = 50;
        for (let y = 0; y < 1100; y += size * 1.5) {
            for (let x = 0; x < 1100; x += size * Math.sqrt(3)) {
                const off = (Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                g.beginPath();
                for (let i = 0; i < 6; i++) {
                    let angle = (Math.PI / 3) * i;
                    g.lineTo(x + off + size * Math.cos(angle), y + size * Math.sin(angle));
                }
                g.closePath();
                g.stroke();
            }
        }
        g.restore();
    };
    drawHexGrid();

    // --- 4. THE MASTER FRAME (Cyber Shield) ---
    // Outer Neon Glow
    g.save();
    g.shadowBlur = 40; g.shadowColor = '#00d2ff';
    g.lineWidth = 3;
    g.strokeStyle = '#00d2ff';
    // Gambar border dengan aksen terpotong di pojok
    g.beginPath();
    g.roundRect(165, 165, 670, 670, 45);
    g.stroke();
    
    // Glass Effect dengan Refleksi Cahaya
    const glassGrad = g.createLinearGradient(165, 165, 835, 835);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glassGrad.addColorStop(0.5, 'rgba(230, 245, 255, 0.95)');
    glassGrad.addColorStop(1, 'rgba(180, 220, 255, 0.9)');
    g.fillStyle = glassGrad;
    g.fill();
    
    // Aksen kilatan cahaya di pojok kiri atas kaca
    const shine = g.createLinearGradient(200, 200, 400, 400);
    shine.addColorStop(0, 'rgba(255,255,255,0.4)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.fill();
    g.restore();

    // --- 5. RENDER QR ---
    const qrBuffer = await QRCode.toBuffer(qrString, { 
        margin: 1, 
        width: 580,
        color: { dark: '#0a0f1e', light: '#00000000' } 
    });
    const qrImage = await loadImage(qrBuffer);
    // Tambahkan sedikit shadow lembut di bawah QR agar "mengambang"
    g.save();
    g.shadowBlur = 15; g.shadowColor = 'rgba(0,0,0,0.2)';
    g.drawImage(qrImage, 210, 210, 580, 580);
    g.restore();

    // --- 6. FLOATING HUD ELEMENTS ---
    g.fillStyle = '#ff0044';
    g.font = 'bold 14px Monospace';
    g.fillText('SECURE ENCRYPTION: AES-256', 220, 200);
    g.textAlign = 'right';
    g.fillText('STATUS: VERIFIED', 780, 200);

    // --- 7. HEADER & TYPOGRAPHY ---
    g.textAlign = 'center';
    g.letterSpacing = "4px";
    g.font = 'bold 22px Courier New';
    g.fillStyle = '#00d2ff';
    g.shadowBlur = 10; g.shadowColor = '#00d2ff';
    g.fillText('▼ SYSTEM READY FOR UPLINK ▼', 500, 75);

    // Title dengan Gradient Silver-Blue
    const titleGrad = g.createLinearGradient(0, 100, 0, 160);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#a0c4ff');
    g.fillStyle = titleGrad;
    g.font = 'italic 900 85px Arial';
    g.fillText('ACCESS GRANTED', 500, 145);

    // --- 8. FOOTER: BRANDING ---
    // Reseller Badge Chrome Style
    g.shadowBlur = 15; g.shadowColor = '#ff0044';
    g.fillStyle = '#ff0044';
    g.beginPath();
    g.roundRect(360, 845, 280, 45, 5);
    g.fill();
    
    g.fillStyle = '#ffffff';
    g.font = '900 22px Arial';
    g.letterSpacing = "1px";
    g.fillText('QRIS PAKASIR', 500, 876);

    // Ultra Large Text: RASYA (Customized)
    const rasyaGrad = g.createLinearGradient(0, 910, 0, 990);
    rasyaGrad.addColorStop(0, '#ffffff');
    rasyaGrad.addColorStop(0.5, '#00d2ff');
    rasyaGrad.addColorStop(1, '#0055ff');
    
    g.shadowBlur = 25; g.shadowColor = 'rgba(0, 210, 255, 0.8)';
    g.font = 'italic 900 145px Arial'; // Ukuran disesuaikan agar lebih dominan
    g.fillStyle = rasyaGrad;
    g.fillText('Auto Order', 500, 980);

    // --- 9. CORNER HUD BRACKETS ---
    const drawCyberCorner = (x, y, r1) => {
        g.save();
        g.translate(x, y);
        g.rotate(r1);
        g.strokeStyle = '#ff0044';
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(0, 120); g.lineTo(0, 0); g.lineTo(120, 0);
        g.stroke();
        // Cyber Dot
        g.fillStyle = '#00d2ff';
        g.shadowBlur = 10; g.shadowColor = '#00d2ff';
        g.fillRect(-10, -10, 20, 20);
        g.restore();
    };
    drawCyberCorner(40, 40, 0); // TL
    drawCyberCorner(960, 40, Math.PI / 2); // TR
    drawCyberCorner(40, 960, -Math.PI / 2); // BL
    drawCyberCorner(960, 960, Math.PI); // BR

    photoToSend = { source: canvas.toBuffer('image/jpeg', { quality: 1.0 }) };
  } catch (e) {
    console.error("Gagal membuat canvas:", e);
  }
}

    // --- LOGIKA FALLBACK AGAR TIDAK ERROR ---
    if (!photoToSend) {
      if (qrisData.imageqris instanceof Buffer) {
        photoToSend = { source: qrisData.imageqris };
      } else if (qrisData.qr_string && qrisData.qr_string.trim().length > 0) {
        const qrBuffer = await QRCode.toBuffer(qrisData.qr_string);
        photoToSend = { source: qrBuffer };
      }
    }

    if (!photoToSend) throw new Error("Gagal generate photo QRIS");

    const orderId = qrisData.idtransaksi || qrisData.id;
    const totalBayarPakasir = qrisData.nominal || nominal;
    const feePakasir = totalBayarPakasir - nominal;

    const msgQris = await ctx.replyWithPhoto(photoToSend, {
      caption: `<blockquote>🏦 <b>QRIS PAYMENT OTOMATIS (PAKASIR)</b> 🏦
━━━━━━━━━━━━━━━━━━━━━
🧾 <b>ID Pembayaran:</b> <code>${orderId}</code>
💰 <b>Jumlah Harga:</b> ${toRupiah(hargaAwal)}${txtPotongan}
🧾 <b>Biaya Admin:</b> ${toRupiah(feePakasir)}
💳 <b>Total Pembayaran:</b> <code>${toRupiah(totalBayarPakasir)}</code>
⏰ <b>Masa Aktif:</b> 60 Menit

• 🧩 <b>Order ID:</b> <code>${orderId}</code>

💡 <b>Panduan Pembayaran:</b>
1. Buka aplikasi e-wallet / m-banking
2. Scan kode QR di atas
3. Konfirmasi pembayaran

⚠️ <b>Catatan:</b>
• Transaksi otomatis batal setelah 60 menit
• Klik tombol di bawah jika ingin membatalkan</blockquote>`,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([[Markup.button.callback("❌ Batalkan", "cancel_trx")]])
    });

    activeTransactions[userId] = { id: orderId, amount: totalBayarPakasir, status: 'pending', messageId: msgQris.message_id, paymentMethod: 'pakasir', paymentConfig, kodeVoucher };

    let attempts = 0;
    const maxAttempts = 72;
    const interval = setInterval(async () => {
      attempts++;
      if (!activeTransactions[userId]) { clearInterval(interval); return; }
      if (attempts > maxAttempts) {
        clearInterval(interval);
        if (activeTransactions[userId]) {
          try { await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {}); } catch (e) {}
          clearUserSession(userId);
          await safeReply(ctx, "<blockquote>❌ <b>Waktu pembayaran habis.</b></blockquote>", { parse_mode: "HTML" });
        }
        return;
      }

      try {
        const isPaid = await cekStatus(orderId, totalBayarPakasir, paymentConfig);
        if (isPaid) {
          clearInterval(interval);
          saveHistoryTrx(userId, itemName, nominal);
          
          if (kodeVoucher && fs.existsSync(voucherPath)) {
            let dbV = JSON.parse(fs.readFileSync(voucherPath, 'utf8'));
            delete dbV[userId];
            fs.writeFileSync(voucherPath, JSON.stringify(dbV, null, 2));
          }

          const targetMsgId = activeTransactions[userId]?.messageId;
          clearUserSession(userId);
          try { if (targetMsgId) await ctx.deleteMessage(targetMsgId).catch(() => {}); } catch (e) {}
          
          const saldoData = loadJSON(SALDO_DB);
          saldoData[userId] = (saldoData[userId] || 0) + nominal;
          saveJSON(SALDO_DB, saldoData);

          const userName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
          sendTestimoniKeChannel(userName, userId, itemName, nominal);

          try {
            await bot.telegram.sendMessage(config.ownerId, `<b>💰 PEMBAYARAN SUKSES</b>\n\n<b>👤 User:</b> ${ctx.from.first_name}\n<b>🛒 Item:</b> ${itemName}\n<b>💵 Harga:</b> ${toRupiah(nominal)}`, { parse_mode: "HTML" });
          } catch (ownerErr) {}

          await sendProductToUser(ctx, productData);
          try { await ctx.replyWithSticker("CAACAgIAAxkBAAIQDWmPBc5FXl_yjDnRxP-8Hi5yoHpWAAJxFQACwGS4Su6Xv_Scp-RSOgQ"); } catch (stkErr) {}
          createAndSendFullBackup(null, true).catch(() => {});
        }
      } catch (error) {
        if (attempts > 10) {
          clearInterval(interval);
          if (activeTransactions[userId]) {
            clearUserSession(userId);
            await safeReply(ctx, "<blockquote>⚠️ <b>Terjadi gangguan sistem pembayaran.</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
          }
        }
      }
    }, 5000);

  } catch (error) {
    console.error("[ERROR] Failed to send QRIS photo:", error.message);
    clearUserSession(userId);
    let errorMessage = `<b>⚠️ GAGAL MENAMPILKAN QRIS</b>\n\n`;
    errorMessage += `<b>Item:</b> ${itemName}\n`;
    errorMessage += `<b>Total:</b> ${toRupiah(nominal)}\n`;
    errorMessage += `<b>ID Transaksi:</b> ${qrisData?.idtransaksi || qrisData?.id || '-'}\n`;
    if (qrisData?.qr_string && qrisData.qr_string.length < 500) {
      errorMessage += `<b>QR String:</b>\n<code>${qrisData.qr_string}</code>\n\n`;
    }
    errorMessage += `<i>Silakan hubungi owner.</i>`;
    await safeReply(ctx, errorMessage, { parse_mode: "HTML" });
  }
}

bot.action("wd_rumahotp_start", async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  const infoWd = config.wd_balance || {};

  userState[ctx.from.id] = { step: "WAITING_WD_RUMAHOTP_NOMINAL" };

  await editMenuMessage(ctx,
    `<blockquote><b>🏦 CAIRKAN RUMAHOTP (H2H)</b>\n\n` +
    `<b>Tujuan WD (Config):</b>\n` +
    `Bank: <code>${infoWd.bank_code || '-'}</code>\n` +
    `No: <code>${infoWd.destination_number || '-'}</code>\n` +
    `A/N: <code>${infoWd.destination_name || '-'}</code>\n\n` +
    `<i>Silakan ketik nominal yang ingin dicairkan (Angka saja).</i>\n` +
    `<i>Contoh: 50000</i></blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Batalkan", callback_data: "menu_owner" }]
        ]
      }
    }
  );
});

bot.command(["withdraw", "wd"], async (ctx) => {
  if (ctx.from.id !== config.ownerId) return;

  const args = ctx.message.text.split(" ");
  const nominal = parseInt(args[1]);

  if (!nominal || isNaN(nominal) || nominal < 1000) {
    return ctx.reply("<blockquote>💰 <b>Gunakan:</b> <code>/withdraw [nominal]</code>\nMinimal Rp 1.000</blockquote>", { parse_mode: "HTML" });
  }

  try {
    const waitMsg = await ctx.reply("⏳ <b>Memproses withdraw...</b>", { parse_mode: "HTML" });
    
    const atlConfig = {
      apiAtlantic: config.ApikeyAtlantic,
      wd_balance: config.wd_balance
    };

    const res = await atlanticTransfer(nominal, atlConfig);

    if (!res.status) throw new Error(res.message);

    const data = res.data;
    const caption = `<blockquote>✅ <b>PERMINTAAN WITHDRAW DIBUAT</b>\n\n` +
      `<b>Reff ID:</b> <code>${data.reff_id}</code>\n` +
      `<b>Transfer ID:</b> <code>${data.id}</code>\n` +
      `<b>Tujuan:</b> ${data.nomor_tujuan} (${data.nama})\n` +
      `<b>Nominal:</b> ${toRupiah(data.nominal)}\n` +
      `<b>Fee:</b> ${toRupiah(data.fee)}\n\n` +
      `<i>Menunggu konfirmasi transfer...</i></blockquote>`;

    await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, caption, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Cek Status WD", `check_wd_${data.id}`)]
      ])
    });

  } catch (err) {
    ctx.reply(`❌ <b>Error:</b> ${err.message}`, { parse_mode: "HTML" });
  }
});

bot.action(/check_wd_(.+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("Bukan Owner!");
  const wdId = ctx.match[1];
  
  try {
    const res = await atlanticTransferStatus(wdId, config.ApikeyAtlantic);
    const status = res.data?.status || "processing";
    
    await ctx.answerCbQuery(`Status: ${status.toUpperCase()}`);
    
    if (status === "success") {
      await ctx.editMessageCaption(`<blockquote>✅ <b>WD BERHASIL!</b>\nID: <code>${wdId}</code>\nStatus: <b>SUCCESS</b></blockquote>`, { parse_mode: "HTML" });
    }
  } catch (e) {
    ctx.answerCbQuery("Gagal cek status.");
  }
});

bot.action("menu_wd_info", (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    return ctx.answerCbQuery("❌ Hanya owner yang bisa melihat info WD!", { show_alert: true });
  }
  
  function sensorString(input, visibleCount = 3, maskChar = 'X') {
    if (!input || input.length <= visibleCount) return input || "Tidak tersedia";
    const visiblePart = input.slice(0, visibleCount);
    const maskedPart = maskChar.repeat(input.length - visibleCount);
    return visiblePart + maskedPart;
  }
  
  function sensorWithSpace(str, visibleCount = 3, maskChar = 'X') {
    if (!str) return "Tidak tersedia";
    let result = '';
    let count = 0;
    for (let char of str) {
      if (char === ' ') {
        result += char;
      } else if (count < visibleCount) { 
        result += char; 
        count++; 
      } else {
        result += maskChar;
      }
    }
    return result;
  }
  
  const wdInfo = config.wd_balance || {};
  
  const infoText = `<blockquote><b>💰 INFO WITHDRAW</b>\n\n` +
    `<b>Bank/E-Wallet:</b> ${wdInfo.bank_code || "Belum diatur"}\n` +
    `<b>Tujuan:</b> ${sensorString(wdInfo.destination_number)}\n` +
    `<b>Nama:</b> ${sensorWithSpace(wdInfo.destination_name)}\n\n` +
    `Ketik <code>/withdraw [jumlah]</code> untuk menarik saldo.\n` +
    `<b>Contoh:</b> <code>/withdraw 50000</code>\n` +
    `<b>Minimal:</b> Rp 1.000</blockquote>`;
  
  ctx.editMessageText(infoText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Kembali", callback_data: "menu_owner" }]
      ]
    }
  }).catch(() => {
    ctx.reply(infoText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Kembali", callback_data: "menu_owner" }]
        ]
      }
    });
  });
  
  ctx.answerCbQuery();
});

bot.command("cancel", (ctx) => cancelTransaction(ctx));
bot.action("cancel_trx", (ctx) => cancelTransaction(ctx));

async function cancelTransaction(ctx) {
  const userId = ctx.from.id;
  
  if (activeTransactions[userId]) {
    // Ambil info voucher dari data transaksi yang sedang berjalan
    const usedVoucher = activeTransactions[userId].kodeVoucher;
    
    try {
      if (activeTransactions[userId].messageId) {
        await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {});
      }
    } catch (e) {}
    
    // Tentukan pesan berdasarkan ada/tidaknya voucher
    let pesanBatal;
    if (usedVoucher) {
      pesanBatal = `<blockquote>✅ <b>Transaksi dibatalkan.</b>\n🎟️ Voucher <code>${usedVoucher}</code> kamu tetap tersedia untuk digunakan kembali.</blockquote>`;
    } else {
      pesanBatal = "<blockquote>✅ <b>Transaksi dibatalkan.</b></blockquote>";
    }
    
    // Bersihkan session transaksi
    clearUserSession(userId);
    
    await safeReply(ctx, pesanBatal, { parse_mode: "HTML" });
  } else {
    // Pastikan userState tetap dibersihkan meskipun activeTransactions tidak ada
    if (userState[userId]) delete userState[userId];
    await safeReply(ctx, "<blockquote>⚠️ <b>Tidak ada transaksi aktif.</b></blockquote>", { parse_mode: "HTML" });
  }
  
  if (ctx.updateType === 'callback_query') {
    try {
      await ctx.answerCbQuery();
    } catch (e) {}
  }
}


bot.action("cancel_donasi", (ctx) => cancelTransactiondonasi(ctx));

// Handler untuk fitur Donasi Ulang
bot.action(/redonasi_(\d+)/, async (ctx) => {
  const nominal = parseInt(ctx.match[1]);
  await ctx.answerCbQuery("Membuat ulang QRIS...");
  // Panggil fungsi handleDonasi dengan nominal yang sama
  return handleDonasi(ctx, nominal);
});

async function cancelTransactiondonasi(ctx) {
  const userId = ctx.from.id;
  
  // Ambil nominal terakhir jika ada sebelum dihapus
  const lastNominal = activeTransactions[userId]?.amount || userState[userId]?.nominal || userState[userId]?.amount;

  if (activeTransactions[userId] || (userState[userId] && userState[userId].step === "WAITING_DONASI")) {
    
    try {
      if (activeTransactions[userId] && activeTransactions[userId].messageId) {
        await ctx.deleteMessage(activeTransactions[userId].messageId).catch(() => {});
      }
    } catch (e) {}
    
    // Bersihkan sesi
    clearUserSession(userId);
    if (userState[userId]) delete userState[userId];
    
    // Siapkan keyboard (Jika ada nominal sebelumnya, munculkan tombol Donasi Ulang)
    const keyboard = [];
    if (lastNominal) {
      keyboard.push([Markup.button.callback(`🎁 Donasi Ulang (${toRupiah(lastNominal)})`, `redonasi_${lastNominal}`)]);
    }
    keyboard.push([Markup.button.callback("🔙 Kembali ke Menu", "back_home")]);

    await safeReply(ctx, "<blockquote>✅ <b>Niat baikmu tetap kami hargai. Donasi telah dibatalkan.</b></blockquote>", { 
      parse_mode: "HTML",
      ...Markup.inlineKeyboard(keyboard)
    });

  } else {
    if (userState[userId]) delete userState[userId];
    await safeReply(ctx, "<blockquote>⚠️ <b>Tidak ada proses donasi yang sedang berjalan.</b></blockquote>", { 
      parse_mode: "HTML" 
    });
  }
  
  if (ctx.updateType === 'callback_query') {
    try { await ctx.answerCbQuery(); } catch (e) {}
  }
}


bot.action(/delete_sc_(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1]);
    const db = readDb();
    const sc = db.scripts[idx];

    if (!sc) {
      await ctx.answerCbQuery("❌ Script tidak ditemukan.");
      return;
    }

    db.scripts.splice(idx, 1);
    saveDb(db);

    await ctx.answerCbQuery("✅ Script berhasil dihapus!");
    await ctx.editMessageText("✔️ Script berhasil dihapus.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]))
      .catch(()=>{ safeReply(ctx, "✔️ Script berhasil dihapus."); });

  } catch (e) {
    console.error("delete_sc error:", e);
  }
});

bot.action(/delete_app_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return;
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) {
    ctx.answerCbQuery("❌ App tidak ditemukan.");
    return showOwnerMenu(ctx);
  }
  db.apps.splice(idx, 1);
  saveDb(db);
  ctx.answerCbQuery(`✅ App ${app?.nama || 'Item'} berhasil dihapus.`);
  showOwnerMenu(ctx);
});

bot.action(/list_accounts_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const accounts = app.accounts || [];
  let txt = `<b>📄 List Accounts - ${app.nama}</b>\n<b>Stock:</b> ${accounts.length}\n\n`;
  if (!accounts.length) txt += "<i>Belum ada akun.</i>\n";
  accounts.forEach((a, i) => {
    txt += `<b>${i+1}.</b> ${a.user} | ${a.pass} | ${a.link} | ${a.desc || '-'}\n`;
  });
  safeReply(ctx, txt, { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
});

bot.action("owner_add_account", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const db = readDb();
  if (!db.apps || db.apps.length === 0) return safeReply(ctx, "<blockquote>❌ <b>Belum ada app yang terdaftar.</b> Tambahkan app terlebih dahulu.</blockquote>", { parse_mode: "HTML" });
  const buttons = db.apps.map((a, i) => [ Markup.button.callback(`${a.nama} (${(a.accounts||[]).length} stok)`, `owner_add_account_to_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 Kembali", "menu_owner") ]);
  safeReply(ctx, "<blockquote><b>Pilih aplikasi untuk menambah akun:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/owner_add_account_to_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  if (!db.apps[idx]) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  userState[ctx.from.id] = { step: "WAITING_ADD_ACCOUNT", appIndex: idx };
  safeReply(ctx, "<blockquote><b>✏️ Kirim akun dengan format:</b>\n<code>username|password|link akses|deskripsi</code></blockquote>", { parse_mode: "HTML" });
  ctx.answerCbQuery().catch(()=>{});
});

bot.action("owner_del_account", (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const db = readDb();
  if (!db.apps || db.apps.length === 0) return safeReply(ctx, "<blockquote>❌ <b>Belum ada app yang terdaftar.</b></blockquote>", { parse_mode: "HTML" });
  const buttons = db.apps.map((a, i) => [ Markup.button.callback(`${a.nama} (${(a.accounts||[]).length} stok)`, `owner_del_account_choose_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 Kembali", "menu_owner") ]);
  safeReply(ctx, "<blockquote><b>Pilih aplikasi untuk menghapus akun:</b></blockquote>", { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/owner_del_account_choose_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const idx = parseInt(ctx.match[1]);
  const db = readDb();
  const app = db.apps[idx];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  const accounts = app.accounts || [];
  if (!accounts.length) return safeReply(ctx, "<blockquote>❌ <b>Tidak ada akun pada aplikasi ini.</b></blockquote>", { parse_mode: "HTML" });
  const buttons = accounts.map((acc, i) => [ Markup.button.callback(`🗑 ${i+1}. ${acc.user} - ${acc.desc || '-'}`, `owner_delete_acc_${idx}_${i}`) ]);
  buttons.push([ Markup.button.callback("🔙 Kembali", "menu_owner") ]);
  safeReply(ctx, `<blockquote><b>Pilih akun yang ingin dihapus dari ${app.nama}:</b></blockquote>`, { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) });
  ctx.answerCbQuery().catch(()=>{});
});

bot.action(/owner_delete_acc_(\d+)_(\d+)/, (ctx) => {
  if (ctx.from.id !== config.ownerId) return ctx.answerCbQuery("❌ Bukan Owner!");
  const appIndex = parseInt(ctx.match[1]);
  const accIndex = parseInt(ctx.match[2]);
  const db = readDb();
  const app = db.apps[appIndex];
  if (!app) return ctx.answerCbQuery("❌ App tidak ditemukan.");
  if (!app.accounts || !app.accounts[accIndex]) return ctx.answerCbQuery("❌ Akun tidak ditemukan.");
  const removed = app.accounts.splice(accIndex, 1);
  saveDb(db);
  ctx.answerCbQuery("✅ Akun dihapus.");
  safeReply(ctx, `<blockquote><b>✅ Akun ${removed[0].user} telah dihapus dari ${app.nama}</b></blockquote>`, { parse_mode: "HTML" });
});

async function sendProductToUser(ctx, productData) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const userNameFull = `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim();

    // ================= 1. SCRIPT =================
    if (productData.type === "script") {
      const db = readDb();
      const item = db.scripts[productData.index];

      if (!item) {
        return safeReply(ctx, "<blockquote>❌ <b>Script tidak ditemukan!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }

      if (!item.file_id) {
        return safeReply(ctx, "<blockquote>❌ <b>File script tidak tersedia!</b> Silakan hubungi owner.</blockquote>", { parse_mode: "HTML" });
      }

      await safeReply(ctx, "<blockquote>✅ <b>Pembayaran valid! Mengirim file...</b></blockquote>", { parse_mode: "HTML" });

      await ctx.replyWithDocument(item.file_id, {
        caption:
          `<b>───「 📦 SCRIPT PURCHASE 」───</b>\n\n` +
          `<b>📦 Produk:</b> ${item.nama}\n` +
          `<b>💰 Harga:</b> ${toRupiah(item.harga)}\n` +
          `<b>📝 Deskripsi:</b>\n${item.deskripsi || "Tidak ada deskripsi"}\n\n` +
          `<i>Terima kasih telah berbelanja!</i>`,
        filename: item.fileName || `${item.nama}.zip`,
        parse_mode: "HTML",
      });

      sendTestimoniKeChannel(userNameFull, userId, `Script: ${item.nama}`, item.harga);

    // ================= 2. APP (STOK AKUN) =================
    } else if (productData.type === "app") {
      const db = readDb();
      const app = db.apps[productData.idx];

      if (!app) {
        return safeReply(ctx, "<blockquote>❌ <b>Aplikasi tidak ditemukan!</b></blockquote>", { parse_mode: "HTML" });
      }

      app.accounts = app.accounts || [];

      if (app.accounts.length < productData.qty) {
        return safeReply(ctx, `<blockquote>❌ <b>Stok tidak mencukupi!</b>\nStok tersedia: ${app.accounts.length}</blockquote>`, { parse_mode: "HTML" });
      }

      const taken = [];
      for (let i = 0; i < productData.qty; i++) {
        const acc = app.accounts.shift();
        if (acc) taken.push(acc);
      }
      saveDb(db);

      let msg = `<b>───「 🛒 PURCHASE SUCCESS 」───</b>\n\n` +
                `<blockquote><b>✅ Transaksi Sukses</b>\n\n` +
                `<b>» Produk :</b> ${app.nama}\n` +
                `<b>» Jumlah Beli :</b> ${productData.qty}\n` +
                `<b>» Total Harga :</b> ${toRupiah(productData.total)}</blockquote>\n\n`;

      taken.forEach((a, i) => {
        msg += `<b>— Akun ${i + 1} —</b>\n` +
               `<b>Username:</b> <code>${a.user}</code>\n` +
               `<b>Password:</b> <code>${a.pass}</code>\n` +
               `<b>Link Akses:</b> ${a.link}\n` +
               `<b>Deskripsi:</b> ${a.desc || "-"}\n\n`;
      });

      safeReply(ctx, msg, { parse_mode: "HTML" });
      sendTestimoniKeChannel(userNameFull, userId, `App: ${app.nama} x${productData.qty}`, productData.total);

    // ================= 3. PANEL (AUTO CREATE) =================
    } else if (productData.type === "panel") {
      await ctx.reply("<blockquote>⏳ <b>Sedang membuat akun panel...</b></blockquote>", { parse_mode: "HTML" });

      let disk, cpu;
      if (productData.ram === 0) {
        disk = 0; cpu = 0;
      } else {
        const gb = productData.ram / 1024;
        disk = gb * 2048; cpu = gb * 50;
      }

      const result = await createPanelAccount(productData.username, productData.ram, disk, cpu);

      if (result.success) {
        const d = result.data;
        await ctx.reply(
          `<b>───「 ✅ PANEL SUCCESS 」───</b>\n\n` +
          `<blockquote><b>👤 User:</b> <code>${productData.username}</code>\n` +
          `<b>🆔 ID:</b> <code>${d.username}</code>\n` +
          `<b>🔑 PW:</b> <code>${d.password}</code>\n` +
          `<b>🌐 Login:</b> ${d.login}</blockquote>`,
          { parse_mode: "HTML" }
        );
        sendTestimoniKeChannel(userNameFull, userId, `Panel ${productData.ram === 0 ? "Unlimited" : productData.ram / 1024 + "GB"}`, productData.price);
      } else {
        await ctx.reply(`<blockquote>⚠️ <b>Gagal:</b> ${result.msg}</blockquote>`, { parse_mode: "HTML" });
      }
      
    // ================= 4. DIGITAL OCEAN =================
} else if (productData.type === "do") {
  // 1. Ambil data dari database DigitalOcean
  const availableAccounts = doAccounts.filter(a => !a.used && a.product === productData.productName);

  if (availableAccounts.length < productData.qty) {
    return safeReply(ctx, `<blockquote>❌ <b>Stok tidak mencukupi!</b>\nStok tersedia: ${availableAccounts.length}</blockquote>`, { parse_mode: "HTML" });
  }

  // 2. Ambil akun sejumlah qty yang dibeli
  const taken = [];
  let count = 0;
  
  for (let i = 0; i < doAccounts.length; i++) {
    if (!doAccounts[i].used && doAccounts[i].product === productData.productName) {
      doAccounts[i].used = true; // Tandai sudah terpakai
      taken.push(doAccounts[i]);
      count++;
      if (count === productData.qty) break;
    }
  }

  // 3. Simpan perubahan stok ke database permanen
  saveDOAccounts(doAccounts); 

  // 4. Susun pesan sukses dengan teks Garansi
  let msg = `<b>───「 🛒 PURCHASE SUCCESS 」───</b>\n\n` +
            `<blockquote><b>✅ Transaksi Sukses</b>\n\n` +
            `<b>» Produk :</b> ${productData.productName}\n` +
            `<b>» Jumlah Beli :</b> ${productData.qty}\n` +
            `<b>» Total Harga :</b> ${toRupiah(productData.total)}\n` +
            `<b>» Garansi :</b> No Garansi</blockquote>\n\n`;

  taken.forEach((a, i) => {
    msg += `<b>— Akun ${i + 1} —</b>\n` +
           `<b>Email:</b> <code>${a.email}</code>\n` +
           `<b>Password:</b> <code>${a.password}</code>\n` +
           `<b>Auth:</b> <code>${a.auth}</code>\n` +
           `<b>Link Akses:</b> ${a.loginLink || "-"}\n\n`;
  });

  // 5. Kirim pesan dan testimoni
  await safeReply(ctx, msg, { parse_mode: "HTML", disable_web_page_preview: true });
  
  const userNameFull = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
  sendTestimoniKeChannel(userNameFull, userId, `DO: ${productData.productName} x${productData.qty}`, productData.total);

    // ================= 5. PARTNERPRIBADI/ GROUP =================
    } else if (productData.type === "partner_pribadi") {
      const amount = productData.price || 0;
      const productName = productData.itemName || "Partner Pribadi";
      const groupLink = "https://t.me/addlist/XAgMr416B98xYzY1"; 

      await safeReply(ctx,
        `<b>───「 🛒 PURCHASE SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>PEMBAYARAN BERHASIL!</b>\n\n` +
        `<b>💰 Produk:</b> ${productName}\n` +
        `<b>💳 Jumlah:</b> ${toRupiah(amount)}</blockquote>\n\n` +
        `🔗 <b>LINK GROUP:</b>\n${groupLink}\n\n` +
        `<b>───「 📌 INSTRUKSI 」───</b>\n` +
        `1. Join group diatas\n` +
        `2. Baca rules group\n` +
        `3. Check pinned message untuk tutorial\n` +
        `4. Enjoy!\n\n` +
        `📞 <b>Support:</b> @albyy0x`,
        { parse_mode: "HTML" }
      );
      sendTestimoniKeChannel(userNameFull, userId, productName, amount);

    // ================= 6. VPS STOK =================
    } else if (productData.type === "vps_stok") {
      const data = productData.vpsStokData || productData;
      const accounts = data.accounts || [];
      const productName = data.product || "PREMIUM VPS";

      let msg = `<b>───「 🛍️ PURCHASE SUCCESS 」───</b>\n\n` +
                ` Berikut detail data <b>${productName}</b> Anda:\n\n`;

      accounts.forEach((a, i) => {
        msg += `<b>┏━━━━━━━◥ 📦 VPS #${i + 1} ◤━━━━━━━┓</b>\n` +
               `<b>┃ ᯤ IP Address :</b> <code>${a.ip}</code>\n` +
               `<b>┃ ᯤ Password   :</b> <code>${a.password}</code>\n` +
               `<b>┃ ᯤ Login User  :</b> <code>root</code>\n` +
               `<b>┗━━━━━━━━━━━━━━━━━━━━━━━━━┛</b>\n\n`;
      });

      msg += `<blockquote>💡 <b>Tips:</b> Segera ganti password demi keamanan.</blockquote>`;
      await ctx.reply(msg, { parse_mode: "HTML" });
      const totalPrice = (accounts[0]?.price || 0) * accounts.length;
      sendTestimoniKeChannel(userNameFull, userId, `VPS Stok: ${productName}`, totalPrice);

    // ================= 7. SELLER PANEL =================
    } else if (productData.type === "seller_panel") {
      const data = productData.panelData || productData;
      const msgSeller = 
        `<b>───「 🛒 PAYMENT SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>SELLER PANEL LEGAL DIPROSES</b>\n\n` +
        `<b>📦 Produk :</b> Reseller Panel\n` +
        `<b>⏳ Durasi :</b> ${data.durasi || "Permanen"}\n` +
        `<b>💰 Harga  :</b> ${toRupiah(data.price)}\n` +
        `<b>🔗 Link   :</b> ${config.resellerpanelLegal}</blockquote>\n\n` +
        `<b>───「 📌 NOTE 」───</b>\n` +
        `<i>Seller panel akan diaktifkan admin. Silakan tunggu.</i>`;

      await ctx.reply(msgSeller, { parse_mode: "HTML" });
      sendTestimoniKeChannel(userNameFull, userId, `Reseller Panel Legal`, data.price);
      
      } else if (productData.type === "install_panel_access") {
    // 1. Daftarkan user ke database akses install panel
    addAccessInstall(userId); 

    const data = productData.panelData || productData;
    const msgSeller = 
        `<b>───「 🛒 PAYMENT SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>AKSES INSTALL PANEL AKTIF</b>\n\n` +
        `<b>📦 Produk :</b> Acces Instal Panel Sepuasnya\n` +
        `<b>⏳ Durasi :</b> Permanen\n` +
        `<b>💰 Harga  :</b> ${toRupiah(data.price)}\n\n` +
        `<b>Gunakan Perintah:</b>\n` +
        `<code>/installpanel ipvps|pass|dompnl|domnode|ram</code></blockquote>\n\n` +
        `<b>───「 📌 NOTE 」───</b>\n` +
        `<i>Sekarang kamu bebas menginstall panel di VPS manapun!</i>`;

    // 2. Kirim pesan sukses ke user
    await ctx.reply(msgSeller, { parse_mode: "HTML" });

    // 3. Kirim testimoni otomatis ke channel
    sendTestimoniKeChannel(userNameFull, userId, `Acces Install Panel Sepuasnya`, data.price);

      
    } else if (productData.type === "seller_panel_biasa") {
      const data = productData.panelData || productData;
      const msgSeller = 
        `<b>───「 🛒 PAYMENT SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>RESELLER PANEL BIASA DIPROSES</b>\n\n` +
        `<b>📦 Produk :</b> Reseller Panel\n` +
        `<b>⏳ Durasi :</b> ${data.durasi || "Permanen"}\n` +
        `<b>💰 Harga  :</b> ${toRupiah(data.price)}\n` +
        `<b>🔗 Link   :</b> ${config.resellerPanelbiasa}</blockquote>\n\n` +
        `<b>───「 📌 NOTE 」───</b>\n` +
        `<i>Seller panel akan diaktifkan admin. Silakan tunggu.</i>`;

      await ctx.reply(msgSeller, { parse_mode: "HTML" });
      sendTestimoniKeChannel(userNameFull, userId, `Reseller Panel Biasa`, data.price);
      
} else if (productData.type === "produk") {
  const dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const productIndex = dbProduk.findIndex(p => p.id == productData.id);
  const item = dbProduk[productIndex];

  // VALIDASI: Wajib pakai return agar tidak lanjut ke bawah jika stok kosong
  if (!item || item.stok.length < productData.quantity) {
    safeReply(ctx, "<blockquote>❌ <b>Stok tidak mencukupi!</b></blockquote>", { parse_mode: "HTML" });
    return; // Berhenti di sini jika stok kurang
  }

  // 1. Ambil stok sesuai jumlah pembelian dan hapus dari array (splice)
  const terjual = item.stok.splice(0, productData.quantity);
  
  // 2. Simpan perubahan stok ke database/produk.json
  fs.writeFileSync(pathrasya, JSON.stringify(dbProduk, null, 2));

  // 3. Kirim isi produknya saja
  await ctx.reply(`${terjual.join("\n")}`);

  // 4. Kirim Caption Detail Pembelian
  const msgProduk = 
    `<b>───「 📦 PAYMENT SUCCESS 」───</b>\n\n` +
    `<blockquote>✅ <b>PRODUK BERHASIL TERKIRIM</b>\n\n` +
    `<b>📦 Produk :</b> ${item.nama}\n` +
    `<b>💰 Harga  :</b> ${toRupiah(item.harga * productData.quantity)}</blockquote>\n\n` +
    `<b>───「 📌 NOTE 」───</b>\n` +
    `<i>Terima kasih telah berbelanja! Produk sudah terkirim di atas.</i>`;

  await ctx.reply(msgProduk, { parse_mode: "HTML" });

  // 5. Kirim Testimoni
  sendTestimoniKeChannel(userNameFull, userId, `Produk: ${item.nama} (x${productData.quantity})`, item.harga);

      } else if (productData.type === "buy_ubot") {
      
      const data = productData.panelData || productData;
      const roleName = data.name || "Premium"; // Mengambil nama role dari data
      
      const msgSeller = 
        `<b>───「 🛒 PAYMENT SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>UBOT ${roleName.toUpperCase()} DIPROSES</b>\n\n` +
        `<b>👤 Role   :</b> ${roleName}\n` + // Menambahkan baris Role
        `<b>📦 Produk :</b> Ubot ${roleName}\n` +
        `<b>⏳ Durasi :</b> ${data.durasi || "Permanen"}\n` +
        `<b>💰 Harga  :</b> ${toRupiah(data.price)}\n` +
        `<b>🔗 Link   :</b> ${config.buyubot}</blockquote>\n\n` +
        `<b>───「 📌 NOTE 」───</b>\n` +
        `<i>Akses role akan diaktifkan admin. Silakan tunggu.</i>`;

      await ctx.reply(msgSeller, { parse_mode: "HTML" });
      sendTestimoniKeChannel(userNameFull, userId, `Ubot ${roleName}`, data.price);

    // ================= 8. ADMINCH =================
    } else if (productData.type === "adminch") {
      const amount = productData.price || 0;
      const productName = productData.itemName || "Admin Ch";
      const groupLink = "https://t.me/"; 
      const channelUsername = "@"; 

      // 1. KIRIM PESAN SUKSES TRANSAKSI DULU
      const msgSuccess = 
        `<b>───「 🛒 TRANSACTION SUCCESS 」───</b>\n\n` +
        `<blockquote>✨ <b>PEMBAYARAN DITERIMA</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 <b>Produk :</b> ${productName}\n` +
        `💰 <b>Total  :</b> ${toRupiah(amount)}\n` +
        `✅ <b>Status :</b> Terverifikasi</blockquote>\n\n` +
        `🔗 <b>LINK AKSES CHANNEL:</b>\n${groupLink}\n\n` +
        `<i>Mohon tunggu sebentar, sistem sedang memproses hak akses admin Anda...</i>`;

      await safeReply(ctx, msgSuccess, { parse_mode: "HTML" });

      // 2. KIRIM PESAN PROSES ADMIN
      const statusMsg = await ctx.reply(`<b>⏳ SYSTEM:</b> Sedang mendaftarkan ID Anda sebagai Admin di ${channelUsername}...`, { parse_mode: "HTML" });

      try {
        // Efek jeda 2 detik agar proses terlihat real
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. EKSEKUSI PROSES ADMININ
        await ctx.telegram.promoteChatMember(channelUsername, userId, {
          can_manage_chat: true,
          can_post_messages: true,
          can_edit_messages: true,
          can_delete_messages: false,
          can_invite_users: true,
        });

        // 4. UBAH PESAN PROSES MENJADI BERHASIL
        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
          `<b>✅ PROSES SELESAI!</b>\n\n` +
          `Sistem berhasil mengangkat Anda menjadi Admin di ${channelUsername}.\n` +
          `Silahkan cek fitur posting Anda. Enjoy!`, 
          { parse_mode: "HTML" }
        );

        sendTestimoniKeChannel(userNameFull, userId, productName, amount);

      } catch (error) {
        // 5. HANDLING JIKA BELUM JOIN
        if (error.description && error.description.includes("user not found")) {
          await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
            `<b>❌ AUTO-ADMIN GAGAL</b>\n\n` +
            `Sistem tidak menemukan ID Anda di channel.\n` +
            `📍 <b>Wajib Join Dulu:</b> ${groupLink}\n\n` +
            `<i>Silahkan join, lalu lapor ke @albyy0x untuk klaim manual.</i>`, 
            { parse_mode: "HTML" }
          );
        } else {
          console.error("Error Admin:", error);
          await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, "❌ Terjadi kesalahan internal sistem saat aktivasi admin.");
        }
      }

    // ================= 9. RESELLER VPS =================
    } else if (productData.type === "reseller_vps") {
      const data = productData.resellerData || productData;
      const msgReseller = 
        `<b>───「 🛒 PURCHASE SUCCESS 」───</b>\n\n` +
        `<blockquote>✅ <b>RESELLER VPS AKTIF</b>\n\n` +
        `<b>📦 Produk  :</b> ${data.itemName || "Reseller VPS"}\n` +
        `<b>💎 Status  :</b> ${data.status || "Permanent"}\n` +
        `<b>💰 Harga   :</b> ${toRupiah(data.price)}\n` +
        `<b>🌐 Link    :</b> ${config.resvps}</blockquote>\n\n` +
        `<b>───「 📋 DETAIL AKSES 」───</b>\n` +
        `<b>⏰ Batas Waktu :</b> <code>${data.batasWaktu || "No Limit"}</code>\n` +
        `<b>📌 Note        :</b> Hubungi admin untuk akses reseller.`;

      await ctx.reply(msgReseller, { parse_mode: "HTML" });
      sendTestimoniKeChannel(userNameFull, userId, `Reseller VPS`, data.price);

    // ================= 10. AUTO CREATE VPS =================
} else if (productData.type === "vps") {
  let loadingMsg;
  let result;
  const qty = productData.vpsData.qty || 1; // Mengambil jumlah kuantitas
  const vpsResults = []; // Menampung hasil VPS yang berhasil

  try {
    loadingMsg = await ctx.reply(
      `<blockquote>⏳ <b>Sedang membuat ${qty} unit VPS DigitalOcean...</b>\nProses ini membutuhkan waktu ±60 detik per unit.</blockquote>`,
      { parse_mode: "HTML" }
    );

    // --- PROSES LOOPING PEMBUATAN VPS SESUAI QTY ---
    for (let i = 0; i < qty; i++) {
      productData.vpsData.username = username;
      // Memanggil fungsi pembuat droplet
      result = await createVPSDroplet(userId, productData.vpsData);
      
      if (result.success) {
        vpsResults.push(result.data);
      } else {
        // Jika satu gagal, kita hentikan loop atau catat errornya
        break; 
      }
    }

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {}

    // --- JIKA PROSES BERHASIL (MINIMAL 1 VPS JADI) ---
    if (vpsResults.length > 0) {
      const paketInfo = {
        low: { garansi: 1, replace: 1 },
        medium: { garansi: 2, replace: 1 },
        high: { garansi: 3, replace: 1 },
      };

      const paket = productData.vpsData.paket;

      // Kirim detail untuk setiap VPS yang berhasil dibuat
      for (const [index, data] of vpsResults.entries()) {
        const detailVPS = `<blockquote>✅ <b>VPS BERHASIL DIBUAT! (${index + 1}/${vpsResults.length})</b></blockquote>

<blockquote>🖥️ <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗗𝗔𝗧𝗔 𝗩𝗣𝗦</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 IP ADDRESS:</b> <code>${data.ip}</code>
<b>🆔 USERNAME:</b> <code>root</code>
<b>🔐 PASSWORD:</b> <code>${data.password}</code>
<b>🧩 HOSTNAME:</b> ${data.hostname}
<b>🌍 REGION:</b> ${data.region.toUpperCase()}
<b>💿 OS:</b> ${data.os.toUpperCase()}</blockquote>

<blockquote>🛍️ <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗣𝗘𝗠𝗕𝗘𝗟𝗜𝗔𝗡</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>📦 PAKET :</b> ${paket.toUpperCase()}
<b>💾 SPESIFIKASI :</b> ${productData.vpsData.plan}
<b>💰 HARGA :</b> ${toRupiah(productData.vpsData.harga)}
<b>🛡️ GARANSI :</b> ${paketInfo[paket].garansi} Hari
<b>♻️ REPLACE :</b> ${paketInfo[paket].replace === -1 ? "Unlimited" : paketInfo[paket].replace + "x"}
<b>📅 TANGGAL :</b> ${data.created}
<b>👤 PEMBELI :</b> ${username}
<b>🤝 PENJUAL :</b> @${bot.botInfo.username}</blockquote>`;

        await ctx.reply(detailVPS, { parse_mode: "HTML" });
      }

      // Pesan instruksi login
      await ctx.reply(
        `<blockquote>📌 <b>INFORMASI PENTING</b>
━━━━━━━━━━━━━━━━━━━━━━
• Gunakan IP yang tertera di atas untuk akses VPS
• Login dengan username <code>root</code> dan password masing-masing
• VPS sudah ready untuk digunakan
• Wajib masuk channel klaim garansi, jika batas garansinya masih adaa, kalo dah lewat GARANSI nya dah tidak bisa replace !!!!!
https://t.me/
• Jika ada masalah, silakan hubungi admin</blockquote>`,
        { parse_mode: "HTML" }
      );

      // Notifikasi ke Owner dan Testimoni (Hanya jika sukses)
      if (vpsResults.length === qty) {
        try {
          await bot.telegram.sendMessage(
            config.ownerId,
            `<b>💰 VPS TERJUAL!</b>\n\n` +
            `<b>👤 Pembeli:</b> ${username} (${userId})\n` +
            `<b>📦 Qty:</b> ${vpsResults.length} Unit\n` +
            `<b>📦 Paket:</b> ${paket.toUpperCase()}\n` +
            `<b>💰 Harga Satuan:</b> ${toRupiah(productData.vpsData.harga)}\n` +
            `<b>💵 Total Transaksi:</b> ${toRupiah(productData.vpsData.harga * qty)}`
          );
        } catch (e) {}

        // Kirim Testimoni
        sendTestimoniKeChannel(username, userId, `VPS ${paket.toUpperCase()} (x${qty}) - ${productData.vpsData.plan}`, productData.vpsData.harga * qty);
      }
    } 
    
    // --- JIKA HASIL AKHIR GAGAL ATAU SEBAGIAN GAGAL ---
    if (!result.success || vpsResults.length < qty) {
      await ctx.reply(
        `<blockquote>❌ <b>Gagal membuat VPS:</b> ${result.msg || "Stok/Limit API Bermasalah"}</blockquote>`,
        { parse_mode: "HTML" }
      );

      await ctx.reply(
        `<blockquote>⚠️ <b>TRANSAKSI BERMASALAH</b>\n\n` +
        `Berhasil dibuat: ${vpsResults.length} unit.\n` +
        `Gagal dibuat: ${qty - vpsResults.length} unit.\n\n` +
        `Silakan hubungi admin untuk bantuan atau proses refund sisa saldo.</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

  } catch (error) {
    try {
      if (loadingMsg?.message_id) {
        await ctx.deleteMessage(loadingMsg.message_id);
      }
    } catch (e) {}

    await ctx.reply(
      `<blockquote>❌ <b>Error sistem VPS:</b> ${error.message}</blockquote>`,
      { parse_mode: "HTML" }
    );

    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        `<b>🚨 ERROR BUAT VPS!</b>\n\n` +
        `<b>👤 User:</b> ${username} (${userId})\n` +
        `<b>💰 Transaksi:</b> ${toRupiah(productData.vpsData.harga * qty)}\n` +
        `<b>❌ Error:</b> ${error.message}\n` +
        `<b>📦 Paket:</b> ${productData.vpsData.paket.toUpperCase()}\n` +
        `<b>💾 Plan:</b> ${productData.vpsData.plan}\n` +
        `<b>🌍 Region:</b> ${productData.vpsData.region}\n\n` +
        `<i>Silakan handle manual!</i>`,
        { parse_mode: "HTML" }
      );
    } catch (e) {}

  } finally {
    if (userState[userId]?.vpsData) {
      delete userState[userId].vpsData;
    }
  }

    } else if (
      productData.type.startsWith("reseller_") ||
      productData.type.startsWith("admin_")
    ) {
      if (productData.type.includes("admin_panel")) {
        await ctx.reply("⏳ <b>Sedang membuat akun Admin Panel...</b>", {
          parse_mode: "HTML",
        });

        const cleanUsername = (ctx.from.username || `user${userId}`).replace(
          /[^a-zA-Z0-9]/g,
          ""
        );

        const result = await createAdminUser(cleanUsername);

        if (result.success) {
          const d = result.data;
          await ctx.reply(
            `<blockquote><b>✅ ADMIN PANEL BERHASIL DIBUAT</b>\n\n<b>👤 Username:</b> <code>${d.username}</code>\n<b>📧 Email:</b> <code>${d.email}</code>\n<b>🔑 Password:</b> <code>${d.password}</code>\n<b>🌐 Login:</b> ${d.login}</blockquote>`,
            { parse_mode: "HTML" }
          );

          const userName = `${ctx.from.first_name || ""} ${
            ctx.from.last_name || ""
          }`.trim();
          sendTestimoniKeChannel(
            userName,
            userId,
            "Admin Panel Pterodactyl",
            productData.price
          );
        } else {
          await ctx.reply(
            `<blockquote>⚠️ <b>Gagal membuat Admin Panel:</b> ${result.msg}</blockquote>`,
            { parse_mode: "HTML" }
          );
        }
      } else {
        await ctx.reply(
          "<blockquote>⚠️ <b>Produk reseller belum diimplementasikan.</b></blockquote>",
          { parse_mode: "HTML" }
        );
      }
    }
  } catch (error) {
    console.error("[ERROR] Error sending product:", error);
    safeReply(
      ctx,
      "<blockquote>❌ <b>Gagal mengirim produk.</b> Silakan hubungi owner.</blockquote>",
      { parse_mode: "HTML" }
    );
  }
}

bot.on("photo", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const state = userState[userId];
    
    if (state?.step === "PAYMENT_MANUAL_PENDING") {
      const photos = ctx.message.photo || [];
      if (photos.length === 0) {
        await ctx.reply("❌ Foto tidak ditemukan. Silakan kirim ulang.");
        return;
      }
      
      const bestPhoto = photos[photos.length - 1];
      
      const paymentData = {
        userId: userId,
        userName: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
        userUsername: ctx.from.username ? `@${ctx.from.username}` : '-',
        itemName: state.itemName,
        amount: state.amount,
        nominal: state.nominal,
        proofPhotoId: bestPhoto.file_id,
        timestamp: Date.now(),
        status: "pending",
        productData: state.productData
      };
      
      const payments = readManualPayments();
      const paymentIndex = payments.length;
      payments.push(paymentData);
      saveManualPayments(payments);
      
      delete userState[userId];
      
      try {
        await bot.telegram.sendPhoto(config.ownerId, paymentData.proofPhotoId, {
          caption: `<blockquote><b>🧾 BUKTI PEMBAYARAN MANUAL</b>\n\n<b>👤 User:</b> ${paymentData.userName}\n<b>🆔 ID:</b> ${paymentData.userId}\n<b>📛 Username:</b> ${paymentData.userUsername}\n\n<b>🛒 Item:</b> ${paymentData.itemName}\n<b>💰 Amount:</b> ${toRupiah(paymentData.amount)}\n<b>⏰ Time:</b> ${new Date(paymentData.timestamp).toLocaleString()}\n\n<i>Verifikasi pembayaran ini:</i></blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Terima & Kirim Produk", callback_data: `approve_payment_${paymentIndex}` },
                { text: "❌ Tolak", callback_data: `reject_payment_${paymentIndex}` }
              ]
            ]
          }
        });
        
        await ctx.reply("<blockquote>✅ <b>Bukti pembayaran telah dikirim ke owner!</b>\nSilakan tunggu verifikasi. Status akan diberitahu.</blockquote>", { parse_mode: "HTML" });
        
      } catch (ownerError) {
        console.error("[ERROR] Error sending to owner:", ownerError);
        await ctx.reply("<blockquote>❌ <b>Gagal mengirim bukti ke owner.</b> Silakan coba lagi atau hubungi owner langsung.</blockquote>", { parse_mode: "HTML" });
        userState[userId] = state;
      }
      
      return;
    }
    
  } catch (e) {
    console.error("[ERROR] Payment proof error:", e);
    try {
      await ctx.reply("<blockquote>❌ <b>Terjadi kesalahan saat memproses bukti pembayaran.</b> Silakan coba lagi.</blockquote>", { parse_mode: "HTML" });
    } catch (replyError) {
      console.error("[ERROR] Cannot send error message:", replyError);
    }
  }
});

bot.action(/approve_payment_(\d+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    await ctx.answerCbQuery("❌ Hanya owner yang boleh verifikasi!", { show_alert: true });
    return;
  }
  
  const paymentIndex = parseInt(ctx.match[1]);
  const payments = readManualPayments();
  const payment = payments[paymentIndex];
  
  if (!payment) {
    await ctx.answerCbQuery("❌ Pembayaran tidak ditemukan!", { show_alert: true });
    return;
  }
  
  if (payment.status !== "pending") {
    await ctx.answerCbQuery("❌ Pembayaran sudah diverifikasi!", { show_alert: true });
    return;
  }
  
  payment.status = "approved";
  payment.approvedBy = ctx.from.id;
  payment.approvedAt = Date.now();
  saveManualPayments(payments);
  
  try {
    await ctx.editMessageCaption(`<blockquote><b>✅ PEMBAYARAN DITERIMA</b>\n\n<b>👤 User:</b> ${payment.userName}\n<b>🛒 Item:</b> ${payment.itemName}\n<b>💰 Amount:</b> ${toRupiah(payment.amount)}\n<b>⏰ Approved:</b> ${new Date(payment.approvedAt).toLocaleString()}</blockquote>`,
      { parse_mode: "HTML" });
  } catch (e) {
    console.error("[ERROR] Failed to edit message caption:", e);
  }
  
  try {
    await bot.telegram.sendMessage(payment.userId, 
      `<blockquote><b>✅ Pembayaran Anda telah diterima!</b>\n\n<b>Item:</b> ${payment.itemName}\n<b>Amount:</b> ${toRupiah(payment.amount)}\n\n<i>Sedang mengirim produk...</i></blockquote>`,
      { parse_mode: "HTML" }
    );
    
    const fakeCtx = {
      from: { 
        id: payment.userId, 
        first_name: payment.userName.split(' ')[0] || payment.userName,
        last_name: payment.userName.split(' ').slice(1).join(' ') || ''
      },
      reply: (text, extra) => bot.telegram.sendMessage(payment.userId, text, extra),
      replyWithDocument: (file_id, extra) => bot.telegram.sendDocument(payment.userId, file_id, extra)
    };
    
    if (payment.productData) {
      await sendProductToUser(fakeCtx, payment.productData);
      
      sendTestimoniKeChannel(payment.userName, payment.userId, payment.itemName, payment.amount);
      
      await bot.telegram.sendMessage(config.ownerId,
        `<blockquote><b>📦 Produk telah dikirim ke user</b>\n\n<b>👤 User:</b> ${payment.userName}\n<b>🆔 ID:</b> ${payment.userId}\n<b>🛒 Item:</b> ${payment.itemName}\n<b>💰 Amount:</b> ${toRupiah(payment.amount)}</blockquote>`,
        { parse_mode: "HTML" }
      );
    }
    
    await ctx.answerCbQuery("✅ Pembayaran diterima dan produk dikirim!");
    
  } catch (error) {
    console.error("[ERROR] Error in payment approval:", error);
    await bot.telegram.sendMessage(config.ownerId, 
      `<blockquote><b>⚠️ Error saat memproses pembayaran untuk ${payment.userName} (${payment.userId}):</b> ${error.message}\n\n<i>Silakan kirim produk manual ke user.</i></blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

bot.action(/reject_payment_(\d+)/, async (ctx) => {
  if (ctx.from.id !== config.ownerId) {
    await ctx.answerCbQuery("❌ Hanya owner yang boleh verifikasi!", { show_alert: true });
    return;
  }
  
  const paymentIndex = parseInt(ctx.match[1]);
  const payments = readManualPayments();
  const payment = payments[paymentIndex];
  
  if (!payment) {
    await ctx.answerCbQuery("❌ Pembayaran tidak ditemukan!", { show_alert: true });
    return;
  }
  
  if (payment.status !== "pending") {
    await ctx.answerCbQuery("❌ Pembayaran sudah diverifikasi!", { show_alert: true });
    return;
  }
  
  payment.status = "rejected";
  payment.rejectedBy = ctx.from.id;
  payment.rejectedAt = Date.now();
  saveManualPayments(payments);
  
  try {
    await ctx.editMessageCaption(`<blockquote><b>❌ PEMBAYARAN DITOLAK</b>\n\n<b>👤 User:</b> ${payment.userName}\n<b>🛒 Item:</b> ${payment.itemName}\n<b>💰 Amount:</b> ${toRupiah(payment.amount)}\n<b>⏰ Rejected:</b> ${new Date(payment.rejectedAt).toLocaleString()}</blockquote>`,
      { parse_mode: "HTML" });
  } catch (e) {
    console.error("[ERROR] Failed to edit message caption:", e);
  }
  
  try {
    await bot.telegram.sendMessage(payment.userId, 
      `<blockquote><b>❌ Pembayaran Anda ditolak!</b>\n\n<b>Alasan:</b> Bukti transfer tidak valid / nominal tidak sesuai.\n<i>Silakan hubungi owner untuk informasi lebih lanjut.</i></blockquote>`,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    console.error("[ERROR] Failed to send rejection message to user:", e);
  }
  
  await ctx.answerCbQuery("❌ Pembayaran ditolak!");
});

bot.command('installprotectall', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;

    // --- 1. LOGIKA PENGECEKAN JOIN CHANNEL ---
    try {
        let notJoined = [];
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }

    // --- 2. CEK LISENSI (DATABASE JSON) & OWNER ---
    const accessPath = "./database/installpanel.json";
    let accessList = [];
    if (fs.existsSync(accessPath)) {
        accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
    }

    const isOwner = userId === config.ownerId;
    const hasAccess = accessList.includes(userId);

    if (!isOwner && !hasAccess) {
        return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum memiliki lisensi fitur Protect All. Silahkan hubungi Admin.</blockquote>`);
    }

    // --- 3. VALIDASI INPUT DATA ---
    const text = ctx.payload;

    if (!text || !text.includes("|")) {
        return ctx.replyWithHTML(`📖 <b>TUTORIAL PROTECT ALL</b>\n\nFormat:\n<code>/installprotectall ip|password</code>\n\nContoh:\n<code>/installprotectall 1.2.3.4|pass123</code>`, { reply_to_message_id: ctx.message.message_id });
    }

    const [ipvps, pwvps] = text.split("|").map(i => i.trim());

    if (!ipvps || !pwvps) {
        return ctx.reply("⚠️ IP atau Password tidak boleh kosong!");
    }

    // --- 4. EKSEKUSI SSH BERANTAI ---
    const scripts = [
        'installprotect1', 'installprotect2', 'installprotect3',
        'installprotect4', 'installprotect5', 'installprotect6',
        'installprotect7', 'installprotect8', 'installprotect9'
    ];

    let statusMsg = await ctx.replyWithHTML(`⏳ <b>Menghubungkan ke VPS</b> <code>${ipvps}</code>...`);
    
    const conn = new Client();

    conn.on('ready', async () => {
        await ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `⚙️ <b>Koneksi Berhasil!</b>\nMemulai instalasi berantai (1-9)...`, { parse_mode: 'HTML' });

        for (let i = 0; i < scripts.length; i++) {
            const scriptName = scripts[i];
            const scriptURL = `https://raw.githubusercontent.com/yogzdev877/protectyogz/refs/heads/main/${scriptName}`;
            
            await ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `🚀 <b>Sedang Menginstall:</b> <code>${scriptName}</code> (${i+1}/${scripts.length})`, { parse_mode: 'HTML' });

            await new Promise((resolve) => {
                conn.exec(`curl -fsSL ${scriptURL} | bash`, (err, stream) => {
                    if (err) {
                        ctx.reply(`❌ Gagal mengeksekusi ${scriptName}: ${err.message}`);
                        return resolve();
                    }

                    stream.on('close', () => {
                        resolve();
                    });
                    
                    // Kita tidak mengirim output setiap saat agar tidak terkena limit telegram
                    stream.on('data', (data) => { /* console.log(data.toString()) */ });
                    stream.stderr.on('data', (data) => { /* console.error(data.toString()) */ });
                });
            });
        }

        conn.end();
        ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
        
        ctx.replyWithHTML(`
✅ <b>PROTECT ALL INSTALLED</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 SERVER INFO</b>
  ◈ <b>IP Server :</b> <code>${ipvps}</code>
  ◈ <b>Scripts    :</b> 1 Sampai 9
  ◈ <b>Status     :</b> Sukses Terpasang

<blockquote>Semua lapisan proteksi telah dikonfigurasi secara otomatis!</blockquote>`);

        // Log ke Owner
        ctx.telegram.sendMessage(config.ownerId, `🔔 <b>LOG PROTECT ALL</b>\nUser: ${sender.first_name}\nIP: ${ipvps}\nStatus: Selesai`, { parse_mode: 'HTML' });

    }).on('error', (err) => {
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `❌ <b>Koneksi Gagal!</b>\n${err.message}`, { parse_mode: 'HTML' });
    }).connect({
        host: ipvps,
        port: 22,
        username: 'root',
        password: pwvps,
        readyTimeout: 30000
    });
});



bot.command('installpanel', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;
    const text = ctx.payload; // Mengambil argumen setelah perintah /installpanel

    // --- 1. LOGIKA PENGECEKAN JOIN (DIPERTAHANKAN) ---
    try {
        let notJoined = [];
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }
    
// --- CEK APAKAH USER SUDAH BELI AKSES ATAU OWNER ---
const accessPath = "./database/installpanel.json";
let accessList = [];
if (fs.existsSync(accessPath)) {
    accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
}

// Jika bukan owner DAN tidak ada di list akses, maka tolak
if (ctx.from.id !== config.ownerId && !accessList.includes(userId)) {
    return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum membeli lisensi fitur installasi otomatis ini. Silahkan beli di menu layanan.</blockquote>`);
}

    if (!text) {
        return ctx.replyWithMarkdown(`❗ *FORMAT SALAH*

Gunakan format:
\`/installpanel ipvps|password|domainpnl|domainnode|ramvps\`

📌 Contoh:
\`/installpanel 1.1.1.1|password123|panel.domain.com|node.domain.com|8000\`
➡️ Contoh ramvps:
• 4000 = 4GB
• 8000 = 8GB
`, { parse_mode: "Markdown" });
    }

    const t = text.split('|');
    if (t.length < 5) {
        return ctx.replyWithMarkdown(`❗ *ARGUMEN KURANG LENGKAP*
Gunakan pemisah \`|\` sesuai format.`);
    }

    // --- 3. LOGIKA SSH & INSTALASI (MENGGUNAKAN STRUKTUR KODE KEDUA) ---
    const [ipvps, passwd, subdomain, domainnode, ramvps] = t;
    const connSettings = { host: ipvps, port: 22, username: "root", password: passwd };
    const password = 'admin'; // Password panel default
    const command = 'bash <(curl -s https://pterodactyl-installer.se)';
    const commandWings = 'bash <(curl -s https://pterodactyl-installer.se)';
    const conn = new Client();

    let lastMsgId = null;

    conn.on('ready', async () => {
        // Kirim pesan awal dan simpan ID-nya
        const msg1 = await ctx.reply(`🚀 PROSES INSTALL PANEL SEDANG BERLANGSUNG, MOHON TUNGGU 5-10 MENIT`);
        lastMsgId = msg1.message_id;

        conn.exec(command, (err, stream) => {
            if (err) return ctx.reply(`❌ SSH Error: ${err.message}`);

            stream.on('close', async (code, signal) => {
                console.log(`Panel install stream closed: ${code}, ${signal}`);
                // Hapus pesan lama, kirim pesan baru
                await ctx.telegram.deleteMessage(chatId, lastMsgId).catch(() => {});
                const msg2 = await ctx.reply(`🛠️ PROSES INSTALL WINGS, MOHON TUNGGU 5 MENIT`);
                lastMsgId = msg2.message_id;

                installWings(conn);
            }).on('data', (data) => {
                handlePanelInstallationInput(data, stream, subdomain, password);
            }).stderr.on('data', (data) => console.log('STDERR:', data.toString()));
        });
    }).on('error', (err) => {
        ctx.reply(`❌ **Koneksi Gagal:** ${err.message}`);
    }).connect(connSettings);

    // --- INTERNAL FUNCTIONS ---

    function installWings(conn) {
        conn.exec(commandWings, (err, stream) => {
            if (err) throw err;

            stream.on('close', async (code, signal) => {
                console.log(`Wings install stream closed: ${code}, ${signal}`);
                await ctx.telegram.deleteMessage(chatId, lastMsgId).catch(() => {});
                const msg3 = await ctx.reply(`📡 MEMULAI CREATE NODE & LOCATION`);
                lastMsgId = msg3.message_id;

                createNode(conn);
            }).on('data', (data) => {
                handleWingsInstallationInput(data, stream, domainnode, subdomain);
            }).stderr.on('data', (data) => console.log('STDERR:', data.toString()));
        });
    }

    function createNode(conn) {
        const cmdBash = `${config.bash}`; // Menggunakan config.bash sesuai kode kedua Anda
        conn.exec(cmdBash, (err, stream) => {
            if (err) throw err;

            stream.on('close', async () => {
                await ctx.telegram.deleteMessage(chatId, lastMsgId).catch(() => {});
                const msg4 = await ctx.reply(`⚙️ GENERATE CONFIG & START WINGS`);
                lastMsgId = msg4.message_id;

                const cmdCfg = `cd /var/www/pterodactyl && php artisan p:node:configuration 1 > /etc/pterodactyl/config.yml && chmod 600 /etc/pterodactyl/config.yml && systemctl restart wings`;

                conn.exec(cmdCfg, async (err3, stream2) => {
                    if (err3) {
                        await ctx.telegram.deleteMessage(chatId, lastMsgId).catch(() => {});
                        return ctx.reply(`❌ Gagal generate config / start wings:\n${err3.message}`);
                    }

                    stream2.on("exit", async () => {
                        await ctx.telegram.deleteMessage(chatId, lastMsgId).catch(() => {});
                        sendPanelData();
                        conn.end();
                    });
                });
            }).on('data', (data) => {
                handleNodeCreationInput(data, stream, domainnode, ramvps);
            }).stderr.on('data', (data) => {
                console.log('Node STDERR:', data.toString());
            });
        });
    }

    function sendPanelData() {
        ctx.replyWithHTML(`
<b>Install Panel Selesai Berikut Data Anda</b>

<b>Data Vps Anda</b>
🌐 Ip Vps: <code>${ipvps}</code>
🔐 Password: <code>${passwd}</code>

<b>📦 Berikut Detail Akun Panel Kamu:</b>

👤 <b>Username:</b> <code>admin</code>
🔐 <b>Password:</b> <code>${password}</code>
🌐 <b>Domain:</b> ${subdomain}

━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Jangan Lupa SS DONE</blockquote>
━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Notifikasi ke Owner
        const notifyText = `🔔 <b>LOG: INSTALLASI BERHASIL</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n<b>User:</b> ${sender.first_name}\n<b>IP VPS:</b> <code>${ipvps}</code>\n<b>Domain:</b> ${subdomain}`;
        ctx.telegram.sendMessage(config.ownerId, notifyText, { parse_mode: 'HTML' });
    }

    // ========== HANDLER INTERAKSI SHELL (DARI KODE KEDUA) ==========
    function handlePanelInstallationInput(data, stream, subdomain, password) {
        const str = data.toString();
        if (str.includes('Input')) {
            stream.write('0\n\n\n1248\nAsia/Jakarta\nadmin@gmail.com\nadmin@gmail.com\nadmin\nadmin\nadmin\n');
            stream.write(`${password}\n`);
            stream.write(`${subdomain}\n`);
            stream.write('y\ny\ny\ny\ny\n\n1\n');
        }
        if (str.includes("Select the appropriate number")) stream.write("1\n");
        if (str.includes("Still assume SSL")) stream.write("y\n");
        if (str.includes('Please read the Terms of Service')) stream.write('y\n');
    }

    function handleWingsInstallationInput(data, stream, domainnode, subdomain) {
        const str = data.toString();
        if (str.includes('Input')) {
            stream.write('1\ny\ny\ny\n');
            stream.write(`${subdomain}\n`);
            stream.write('y\nuser\n1248\ny\n');
            stream.write(`${domainnode}\n`);
            stream.write('y\nadmin@gmail.com\ny\n');
        }
        if (str.includes("automatically configure HTTPS using Let's Encrypt")) stream.write("y\n");
        if (str.includes("Proceed with installation?")) stream.write("y\n");
        if (str.includes("Proceed anyways")) stream.write("y\n");
    }

    function handleNodeCreationInput(data, stream, domainnode, ramvps) {
        // Perhatikan bagian teks "@albyy0x" dari kode kedua Anda
        stream.write(`${config.tokeninstall}\n4\nSGP\nJangan Lupa Support @albyy0x\n`);
        stream.write(`${domainnode}\nNODES\n${ramvps}\n${ramvps}\n1\n`);
    }
});


bot.command('uninstallpanel', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;

    // --- 2. LOGIKA PENGECEKAN JOIN ---
    try {
        let notJoined = [];
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }
    
    // --- CEK APAKAH USER SUDAH BELI AKSES ATAU OWNER ---
const accessPath = "./database/installpanel.json";
let accessList = [];
if (fs.existsSync(accessPath)) {
    accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
}

// Jika bukan owner DAN tidak ada di list akses, maka tolak
if (ctx.from.id !== config.ownerId && !accessList.includes(userId)) {
    return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum membeli lisensi fitur installasi otomatis ini. Silahkan beli di menu layanan.</blockquote>`);
}


    // --- 3. LOGIKA UTAMA UNINSTALL (LANJUT JIKA SUDAH JOIN) ---
    const text = ctx.payload; 
  
    // Validasi Input
    if (!text || !text.includes('|')) {
        return ctx.replyWithMarkdown(`❌ *FORMAT SALAH!*

Gunakan format:
\`/uninstallpanel ip|password\`

📌 Contoh:
\`/uninstallpanel 1.1.1.1|pass123\``);
    }

    const [ip, password] = text.split("|");
    const { Client } = require('ssh2'); // Pastikan library ssh2 sudah di-import
    const conn = new Client();

    // Pesan Awal
    let statusMsg = await ctx.replyWithMarkdown(`📡 *ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ ᴋᴇ ᴠᴘꜱ:* \`${ip}\`\nꜱɪʟᴀʜᴋᴀɴ ᴛᴜɴɢɢᴜ ᴘʀᴏꜱᴇꜱ ᴘᴇɴɢʜᴀᴘᴜꜱᴀɴ...`);

    conn.on("ready", () => {
        // Update status saat berhasil konek
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `⏳ *PROSES UNINSTALL SEDANG BERJALAN...*\nMohon jangan hentikan proses ini.`);

        conn.exec("bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
            if (err) {
                conn.end();
                return ctx.reply("❌ Gagal menjalankan script uninstaller.");
            }

            stream.on("close", (code) => {
                conn.end();
                if (code === 0) {
                    // Tampilan Berhasil yang Kece
                    const successText = `
✨ <b>UNINSTALL COMPLETED</b> ✨
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 SERVER DETAILS</b>
  ◈ <b>IP VPS :</b> <code>${ip}</code>
  ◈ <b>Status :</b> 🔴 Uninstalled

<b>📜 KETERANGAN</b>
  ◈ Panel & Wings telah dihapus.
  ◈ Database telah dibersihkan.
  ◈ VPS sekarang bersih dari Pterodactyl.
━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Pembersihan selesai secara total!</blockquote>`;
                    
                    ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
                    ctx.replyWithHTML(successText);
                    
                    // Kirim Notifikasi ke Owner
                    sendNotifyOwner(sender, ip);
                } else {
                    ctx.reply(`⚠️ Uninstaller selesai dengan kode ${code}. Cek manual vps jika ada sisa file.`);
                }
            });

            stream.on("data", (data) => {
                const out = data.toString();
                // Handler Interaksi Otomatis
                if (out.includes("Input 0-6")) stream.write("6\n");
                if (out.includes("Do you want to remove panel? (y/N)")) stream.write("y\n");
                if (out.includes("Do you want to remove Wings (daemon)? (y/N)")) stream.write("y\n");
                if (out.includes("Continue with uninstallation? (y/N)")) stream.write("y\n");
                if (out.includes("Choose the panel database")) stream.write("\n");
                if (out.includes("Is it the pterodactyl database? (y/N)")) stream.write("y\n");
                if (out.includes("Is it the pterodactyl user? (y/N)")) stream.write("y\n");
            });
        });
    }).on("error", (err) => {
        ctx.reply(`❌ **Gagal konek ke VPS:**\n${err.message}`);
    }).connect({
        host: ip,
        port: 22,
        username: "root",
        password: password,
        readyTimeout: 20000
    });

    // Fungsi Notifikasi ke Owner
    function sendNotifyOwner(user, ipVps) {
        const notifyText = `
🗑️ <b>LOG: UNINSTALL PANEL</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${user.first_name} (@${user.username || '-'})
🆔 <b>ID:</b> <code>${user.id}</code>
🌐 <b>IP VPS:</b> <code>${ipVps}</code>
⚠️ <b>Action:</b> Full Uninstallation
━━━━━━━━━━━━━━━━━━━━━━━`;
        
        ctx.telegram.sendMessage(config.ownerId, notifyText, { parse_mode: 'HTML' });
    }
});

bot.command('installreviactly', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;
    const msgId = ctx.message.message_id;

    // --- 1. LOGIKA PENGECEKAN JOIN CHANNEL ---
    try {
        let notJoined = [];
        // Pastikan REQUIRED_CHANNELS sudah didefinisikan di config/atas file
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }

    // --- 2. CEK LISENSI (DATABASE JSON) & OWNER/ADMIN ---
    const accessPath = "./database/installpanel.json";
    let accessList = [];
    if (fs.existsSync(accessPath)) {
        accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
    }

    // Cek apakah user adalah Owner atau ada di list akses
    const isOwner = userId === config.ownerId;
    const hasAccess = accessList.includes(userId);

    if (!isOwner && !hasAccess) {
        return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum membeli lisensi fitur installasi Reviactly ini. Silahkan beli di menu layanan.</blockquote>`);
    }

    // --- 3. VALIDASI INPUT DATA ---
    const text = ctx.payload; // Mengambil teks setelah command

    if (!text || !text.includes("|")) {
        return ctx.replyWithHTML(`📖 <b>TUTORIAL INSTALL REVIACTLY</b>\n\nFormat:\n<code>/installreviactly ip|password</code>\n\nContoh:\n<code>/installreviactly 1.2.3.4|mypass123</code>\n\n<i>Catatan: Jika port bukan 22, gunakan 1.2.3.4:2022|password</i>`, { reply_to_message_id: msgId });
    }

    let [ipvps, passwd] = text.split("|").map(a => a.trim());
    let port = 22;

    // Deteksi Port jika ada format IP:PORT
    if (ipvps.includes(":")) {
        const [host, portNum] = ipvps.split(":");
        ipvps = host;
        port = parseInt(portNum, 10) || 22;
    }

    if (!ipvps || !passwd) {
        return ctx.reply("⚠️ IP atau Password tidak boleh kosong!");
    }

    // --- 4. EKSEKUSI SSH ---
    let statusMsg = await ctx.replyWithHTML(`🌀 <b>Proses Install Tema Reviactly</b>\n📡 IP: <code>${ipvps}:${port}</code>\n⏳ Tunggu 1–10 menit...`);

    const conn = new Client();
    const command = "bash <(curl -s -k -L https://theme.sisherif.codes/install.sh)";

    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) {
                conn.end();
                return ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, "❌ Gagal menjalankan perintah di server.");
            }

            stream.on('data', (data) => {
                const output = data.toString();
                console.log(`[${ipvps}] ${output}`);
                
                // Automasi pilihan (Sesuai kode lama anda yang mengirim "2")
                try {
                    stream.write("2\n");
                } catch (e) {}
            });

            stream.on('close', (code) => {
                conn.end();
                const successMsg = `
✅ <b>INSTALL BERHASIL</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 SERVER INFO</b>
  ◈ <b>IP Server :</b> <code>${ipvps}</code>
  ◈ <b>Port      :</b> <code>${port}</code>
  ◈ <b>Tema      :</b> Reviactly Pterodactyl

<b>👤 INSTALLER</b>
  ◈ <b>User      :</b> ${sender.first_name} (@${sender.username || '-'})
━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Tema Reviactly telah berhasil terpasang di panel Anda.</blockquote>`;

                ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
                ctx.replyWithHTML(successMsg);

                // Kirim Log ke Owner
                ctx.telegram.sendMessage(config.ownerId, `🔔 <b>LOG INSTALL REVIACTLY</b>\nUser: ${sender.first_name}\nIP: ${ipvps}\nStatus: Success`, { parse_mode: 'HTML' });
            });

            stream.stderr.on('data', (data) => {
                console.log(`[STDERR ${ipvps}] ${data.toString()}`);
            });
        });

    }).on('error', (err) => {
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `❌ <b>Koneksi Gagal!</b>\nPeriksa IP, Port, atau Password VPS anda.\nError: ${err.message}`, { parse_mode: 'HTML' });
    }).connect({
        host: ipvps,
        port: port,
        username: 'root',
        password: passwd,
        readyTimeout: 20000
    });
});


bot.command('installtemanightcore', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;
    const msgId = ctx.message.message_id;

    // --- 1. LOGIKA PENGECEKAN JOIN CHANNEL ---
    try {
        let notJoined = [];
        // Pastikan REQUIRED_CHANNELS sudah didefinisikan di config/atas file
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }

    // --- 2. CEK LISENSI (DATABASE JSON) & OWNER ---
    const accessPath = "./database/installpanel.json";
    let accessList = [];
    if (fs.existsSync(accessPath)) {
        accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
    }

    // Gunakan config.ownerId sesuai dengan file config Anda
    const isOwner = userId === config.ownerId;
    const hasAccess = accessList.includes(userId);

    if (!isOwner && !hasAccess) {
        return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum memiliki lisensi fitur installasi tema ini. Silahkan hubungi Admin untuk aktivasi.</blockquote>`);
    }

    // --- 3. VALIDASI INPUT DATA ---
    // Mengambil teks setelah command /installtemanightcore
    const text = ctx.payload; 

    if (!text || !text.includes(",")) {
        return ctx.replyWithHTML(`📖 <b>TUTORIAL INSTALL THEME</b>\n\nFormat:\n<code>/installtemanightcore ip,password</code>\n\nContoh:\n<code>/installtemanightcore 192.168.1.1,p4ssw0rd</code>`, { reply_to_message_id: msgId });
    }

    const [ipvps, passwd] = text.split(",").map(a => a.trim());
    
    // --- 4. EKSEKUSI SSH & INSTALASI ---
    let statusMsg = await ctx.reply(`🔄 <b>Menghubungkan ke VPS ${ipvps}...</b>`, { parse_mode: 'HTML' });
    
    const conn = new Client();
    conn.on('ready', () => {
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `⏳ <b>Proses Instalasi Tema Nightcore...</b>\nSedang mengirim perintah ke server.`, { parse_mode: 'HTML' });

        conn.exec(`bash <(curl -s https://raw.githubusercontent.com/XieTyyOfc/themeinstaller/master/install.sh)`, (err, stream) => {
            if (err) {
                conn.end();
                return ctx.reply(`❌ Gagal mengeksekusi script instalasi.`);
            }

            stream.on('data', (data) => {
                const output = data.toString();
                
                // Automasi Input Interaktif
                if (output.includes("Masukkan token:")) {
                    stream.write("xietyofc\n");
                }
                if (output.includes("Pilih aksi:")) {
                    stream.write("1\n"); // Aksi Install
                }
                if (output.includes("Pilih tema yang ingin diinstall:")) {
                    stream.write("7\n"); // Pilih Nightcore/Stellar
                }
            });

            stream.on('close', (code) => {
                conn.end();
                ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
                
                const successMsg = `
✅ <b>INSTALLATION SUCCESS</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 VPS INFO</b>
  ◈ <b>IP Server :</b> <code>${ipvps}</code>
  ◈ <b>Theme     :</b> Nightcore (Stellar)
  ◈ <b>Status    :</b> Selesai

<b>👤 USER INFO</b>
  ◈ <b>Installer :</b> ${sender.first_name}
━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Tema berhasil terpasang! Silahkan cek panel anda.</blockquote>`;
                
                ctx.replyWithHTML(successMsg);

                // Kirim Log ke Owner
                ctx.telegram.sendMessage(config.ownerId, `🔔 <b>LOG INSTALL THEME</b>\nUser: ${sender.first_name} (${userId})\nIP: ${ipvps}\nStatus: Success`, { parse_mode: 'HTML' });
            });

            stream.stderr.on('data', (data) => {
                console.error('STDERR:', data.toString());
            });
        });

    }).on('error', (err) => {
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `❌ <b>Koneksi Gagal!</b>\nPeriksa kembali IP dan Password VPS anda.\nError: ${err.message}`, { parse_mode: 'HTML' });
    }).connect({
        host: ipvps,
        port: 22,
        username: 'root',
        password: passwd,
        readyTimeout: 30000
    });
});


bot.command('swings', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;

    // --- 2. LOGIKA PENGECEKAN JOIN ---
    try {
        let notJoined = [];
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }
    
    // --- CEK APAKAH USER SUDAH BELI AKSES ATAU OWNER ---
const accessPath = "./database/installpanel.json";
let accessList = [];
if (fs.existsSync(accessPath)) {
    accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
}

// Jika bukan owner DAN tidak ada di list akses, maka tolak
if (ctx.from.id !== config.ownerId && !accessList.includes(userId)) {
    return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum membeli lisensi fitur installasi otomatis ini. Silahkan beli di menu layanan.</blockquote>`);
}


    // --- 3. LOGIKA UTAMA /SWINGS (LANJUT JIKA SUDAH JOIN) ---
    const text = ctx.payload; 

    // Tutorial jika input kosong
    if (!text) {
        return ctx.replyWithMarkdown(`📖 *TUTORIAL START WINGS* 📖

Gunakan format:
\`/swings ipvps|password|token\`

🔧 Contoh:
\`/swings 123.45.67.89|mypassword|ptlc_xyz123\`
`, { reply_to_message_id: ctx.message.message_id });
    }

    // Validasi Split Data
    const t = text.split("|");
    if (t.length < 3) {
        return ctx.replyWithMarkdown(`❌ *Format salah!* Gunakan pemisah \`|\``);
    }

    const ipvps = t[0].trim();
    const passwd = t[1].trim();
    const token = t[2].trim();

    const { Client } = require('ssh2'); // Pastikan library ssh2 sudah di-import
    const conn = new Client();
    let statusMsg = await ctx.reply(`⚙️ Menghubungkan ke VPS...`);

    conn.on("ready", () => {
        ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `⏳ *PROSES CONFIGURE WINGS...*\nMohon tunggu sebentar.`);

        conn.exec(`${config.bash}`, (err, stream) => {
            if (err) {
                conn.end();
                return ctx.reply("❌ Error eksekusi command SSH.");
            }

            stream.on("close", (code) => {
                conn.end();
                if (code === 0) {
                    const successText = `
✨ <b>WINGS CONFIGURED SUCCESSFULLY</b> ✨
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 SERVER INFO</b>
  ◈ <b>IP Server :</b> <code>${ipvps}</code>
  ◈ <b>Status    :</b> 🟢 Wings Active

<b>🔑 AUTH DATA</b>
  ◈ <b>Token     :</b> <code>${token.substring(0, 8)}...</code>
  ◈ <b>Result    :</b> Node Synced

━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Node berhasil dikonfigurasi secara otomatis!</blockquote>
━━━━━━━━━━━━━━━━━━━━━━━`;

                    ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
                    ctx.replyWithHTML(successText);

                    const notifyText = `
🔔 <b>LOG: SWINGS START SUCCESS</b>
━━━━━━━━━━━━━━━━━━━━━━━
<b>USER:</b> ${sender.first_name} (@${sender.username || '-'})
<b>ID:</b> <code>${sender.id}</code>
<b>IP VPS:</b> <code>${ipvps}</code>
<b>ACTION:</b> Start Wings / Configure Node
━━━━━━━━━━━━━━━━━━━━━━━`;
                    
                    ctx.telegram.sendMessage(config.ownerId, notifyText, { parse_mode: 'HTML' });
                }
            });

            stream.on("data", (data) => {
                stream.write(`${config.tokeninstall}\n`);
                stream.write("3\n");
                stream.write(`${token}\n`);
            });
        });
    }).on("error", (err) => {
        ctx.reply(`❌ **Koneksi Gagal:** Pastikan IP dan Password VPS benar.`);
    }).connect({
        host: ipvps,
        port: 22,
        username: "root",
        password: passwd,
        readyTimeout: 20000
    });
});

bot.command('subdo', async (ctx) => {
    const chatId = ctx.chat.id;
    const sender = ctx.from;
    const userId = sender.id;

    // --- 1. LOGIKA PENGECEKAN JOIN ---
    try {
        let notJoined = [];
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat);
                }
            } catch (e) {
                notJoined.push(chat);
            }
        }

        if (notJoined.length > 0) {
            let listText = notJoined.map(c => `• ${c.id}`).join('\n');
            let buttons = notJoined.map(c => [{ 
                text: `Join ${c.id}`, 
                url: `https://t.me/${c.id.replace('@', '')}` 
            }]);
            buttons.push([{ text: "✅ Sudah Join", callback_data: "check_done" }]);

            return ctx.replyWithHTML(`🔒 <b>Channel And Grub Check Required!</b>\n\nJoin dulu:\n${listText}`, {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    } catch (err) {
        console.error("Join Check Error:", err);
    }
    
    // --- CEK APAKAH USER SUDAH BELI AKSES ATAU OWNER ---
const accessPath = "./database/installpanel.json";
let accessList = [];
if (fs.existsSync(accessPath)) {
    accessList = JSON.parse(fs.readFileSync(accessPath, "utf8"));
}

// Jika bukan owner DAN tidak ada di list akses, maka tolak
if (ctx.from.id !== config.ownerId && !accessList.includes(userId)) {
    return ctx.replyWithHTML(`<blockquote>❌ <b>AKSES DITOLAK</b>\n\nKamu belum membeli lisensi fitur installasi otomatis ini. Silahkan beli di menu layanan.</blockquote>`);
}


    // --- 2. LOGIKA UTAMA /SUBDO ---
    const text = ctx.payload; 

    if (!text || !text.includes("|")) {
        return ctx.replyWithMarkdown(`❌ *FORMAT SALAH*

Gunakan format:
\`/subdo name|ipvps\`

📌 Contoh:
\`/subdo Username|1.1.1.1\`

_Bot akan otomatis membuat:_
• Username.domain.com (Panel)
• node-Username.domain.com (Node)`);
    }

    const [name, ip] = text.split("|").map(i => i.trim());
    const dom = Object.keys(global.subdomain || {});

    if (dom.length === 0) return ctx.reply("❌ Tidak ada domain tersedia di database.");

    // Membuat tombol pilihan domain
    const inlineKeyboard = [];
    for (let i = 0; i < dom.length; i += 2) {
        const row = dom.slice(i, i + 2).map((d, index) => ({
            text: d,
            callback_data: `autocfg:${i + index}:${name}:${ip}`
        }));
        inlineKeyboard.push(row);
    }

    ctx.replyWithHTML(`<b>✨ AUTO DNS CONFIGURATION</b>\n\n<b>Name:</b> <code>${name}</code>\n<b>IP Target:</b> <code>${ip}</code>\n\nSilakan pilih domain utama:`, {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
});

// Catatan: Gunakan handler Bot.action('check_done') yang sudah kita buat sebelumnya 
// agar tombol "✅ Sudah Join" di command /subdo ini juga berfungsi.


// --- HANDLER TOMBOL SUDAH JOIN ---
bot.action('check_done', async (ctx) => {
    const userId = ctx.from.id;
    let notJoined = [];

    try {
        // 1. Pengecekan ulang
        for (const chat of REQUIRED_CHANNELS) {
            try {
                const member = await ctx.telegram.getChatMember(chat.id, userId);
                const status = member.status;
                if (!(status === 'member' || status === 'administrator' || status === 'creator')) {
                    notJoined.push(chat.id);
                }
            } catch (e) {
                notJoined.push(chat.id);
            }
        }

        // 2. Jika masih ada yang belum join
        if (notJoined.length > 0) {
            // Memberikan notifikasi alert di layar (tanpa kirim pesan chat)
            return ctx.answerCbQuery(`❌ GAGAL!\nSilakan join terlebih dahulu: ${notJoined.join(', ')}`, { show_alert: true });
        } 

        // 3. Jika SUDAH join semua
        // Munculkan notifikasi sukses di layar user
        await ctx.answerCbQuery("✅ Verifikasi Berhasil!", { show_alert: true });
        
        // Hapus pesan tombol join (agar bersih)
        return await ctx.deleteMessage().catch(() => {});

    } catch (err) {
        console.error("Action Error:", err);
        return ctx.answerCbQuery("⚠️ Terjadi kesalahan. Coba lagi.", { show_alert: true });
    }
});


// 2. Handler Tombol (Work untuk semua orang)
bot.action(/^autocfg:(\d+):(.+):(.+)$/, async (ctx) => {
    const domainIndex = parseInt(ctx.match[1]);
    const reqName = ctx.match[2].replace(/[^a-z0-9]/gi, "").toLowerCase();
    const ip = ctx.match[3];
    const dom = Object.keys(global.subdomain || {});
    const sender = ctx.from;

    const tld = dom[domainIndex];
    const configSub = global.subdomain[tld];

    // Beri feedback klik tombol
    await ctx.answerCbQuery("🚀 Sedang memproses DNS...");
    await ctx.editMessageText("⏳ <i>Generating DNS Records (Panel & Node)...</i>", { parse_mode: "HTML" });

    // Fungsi bantu untuk request ke Cloudflare
    const addDNS = (subName) => {
        return axios.post(
            `https://api.cloudflare.com/client/v4/zones/${configSub.zone}/dns_records`,
            {
                type: "A",
                name: `${subName}.${tld}`,
                content: ip,
                ttl: 1,
                proxied: false
            },
            {
                headers: {
                    "Authorization": `Bearer ${configSub.apitoken}`,
                    "Content-Type": "application/json"
                }
            }
        );
    };

    try {
        const panelPrefix = reqName;
        const nodePrefix = `node-${reqName}`;

        // Eksekusi pembuatan 2 DNS sekaligus
        const [resPanel, resNode] = await Promise.all([
            addDNS(panelPrefix),
            addDNS(nodePrefix)
        ]);

        if (resPanel.data.success && resNode.data.success) {
            const finalPanel = resPanel.data.result.name;
            const finalNode = resNode.data.result.name;

            const successText = `
✨ <b>SUBDOMAIN CONFIG SUCCESS</b> ✨
━━━━━━━━━━━━━━━━━━━━━━━
<b>🌐 HASIL GENERATE</b>
  ◈ <b>Panel :</b> <code>${finalPanel}</code>
  ◈ <b>Node  :</b> <code>${finalNode}</code>
  ◈ <b>IP VPS :</b> <code>${ip}</code>

<b>✅ STATUS</b>
  ◈ DNS Panel Created
  ◈ DNS Node Created
━━━━━━━━━━━━━━━━━━━━━━━
<blockquote>Gunakan domain ini untuk /installpanel</blockquote>
━━━━━━━━━━━━━━━━━━━━━━━`;

            await ctx.editMessageText(successText, { parse_mode: "HTML" });

            // Notifikasi Owner (Tanpa Emoji)
            const notifyText = `
LOG: AUTO SUBDOMAIN CREATED
---------------------------------------
USER: ${sender.first_name} (@${sender.username || '-'})
ID: ${sender.id}
PANEL: ${finalPanel}
NODE: ${finalNode}
IP: ${ip}
---------------------------------------`;
            
            ctx.telegram.sendMessage(config.ownerId, notifyText);
        }
    } catch (e) {
        const errorMsg = e.response?.data?.errors?.[0]?.message || e.message;
        ctx.editMessageText(`❌ <b>GAGAL MEMBUAT DNS</b>\n<code>${errorMsg}</code>`, { parse_mode: "HTML" });
    }
});

bot.command("ytsearch", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ");
  if (!query) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/ytsearch judul lagu / keyword</code></blockquote>", { parse_mode: "HTML" });

  try {
    await safeReply(ctx, "<blockquote>🔍 <b>Mencari video di YouTube...</b></blockquote>", { parse_mode: "HTML" });

    const api = `https://api-ralzz.vercel.app/search/youtube?apikey=ubot&q=${encodeURIComponent(query)}`;
    const res = await axios.get(api);

    if (!res.data || !res.data.result || res.data.result.length === 0) {
      return safeReply(ctx, "<blockquote>❌ <b>Tidak ada hasil ditemukan.</b></blockquote>", { parse_mode: "HTML" });
    }

    const results = res.data.result.slice(0, 10); 

    results.forEach((vid, i) => {
      const text =
`<b>🎬 ${vid.title}</b>
<b>👤 Channel:</b> ${vid.author?.name || "-"}
<b>⏱ Durasi:</b> ${vid.duration?.timestamp || "-"}
<b>👁 Views:</b> ${vid.views?.toLocaleString() || "-"}

<b>🔗</b> ${vid.url}`;

      safeReply(ctx, text, { parse_mode: "HTML" });
    });

  } catch (err) {
    console.error(err);
    safeReply(ctx, "<blockquote>❌ <b>Error mengambil data pencarian YouTube.</b></blockquote>", { parse_mode: "HTML" });
  }
});

bot.command("ssweb", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/ssweb url</code></blockquote>", { parse_mode: "HTML" });

  try {
    safeReply(ctx, "<blockquote>⏳ <b>Mengambil screenshot...</b></blockquote>", { parse_mode: "HTML" });

    const api = `https://api-ralzz.vercel.app/tools/ssweb?apikey=ubot&url=${encodeURIComponent(url)}`;
    const res = await axios.get(api);

    if (!res.data || !res.data.result) {
      return safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil screenshot.</b></blockquote>", { parse_mode: "HTML" });
    }

    await ctx.replyWithPhoto(res.data.result, {
      caption: "<blockquote>✅ <b>Screenshot berhasil!</b></blockquote>",
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error(err);
    safeReply(ctx, "<blockquote>❌ <b>Error: tidak bisa mengambil screenshot.</b></blockquote>", { parse_mode: "HTML" });
  }
});

bot.command("makeqr", async(ctx) => {
  const txt = ctx.message.text.replace("/makeqr", "").trim();
  if (!txt) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/makeqr teks</code></blockquote>", { parse_mode: "HTML" });
  ctx.replyWithPhoto(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(txt)}`);
});

bot.command("tiktokmp4", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote>❌ <b>Gunakan:</b> <code>/tiktok url</code></blockquote>", { parse_mode: "HTML" });
  try {
    safeReply(ctx, "<blockquote>⏳ <b>Mengambil video TikTok...</b></blockquote>", { parse_mode: "HTML" });
    const res = await axios.get(`https://api-ralzz.vercel.app/download/tiktok?apikey=ubot&url=${encodeURIComponent(url)}`);
    if (!res.data.result.video_sd) return safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil video!</b></blockquote>", { parse_mode: "HTML" });
    await ctx.replyWithVideo(res.data.video_sd, { caption: "<blockquote>✅ <b>TikTok Tanpa Watermark</b></blockquote>", parse_mode: "HTML" });
  } catch (e) { console.log(e); safeReply(ctx, "<blockquote>❌ <b>Error: tidak bisa download TikTok.</b></blockquote>", { parse_mode: "HTML" }); }
});

bot.command("ytmp3", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/ytmp3 url</code></blockquote>", { parse_mode: "HTML" });
  safeReply(ctx, "<blockquote>⏳ <b>Mengambil audio...</b></blockquote>", { parse_mode: "HTML" });
  try {
    const res = await axios.get(`https://api-ralzz.vercel.app/download/ytmp3v2?apikey=ubot&url=${encodeURIComponent(url)}`);
    await ctx.replyWithAudio(res.data.result, { caption: "<blockquote>🎵 <b>YouTube Audio Downloaded</b></blockquote>", parse_mode: "HTML" });
  } catch (e) { safeReply(ctx, "<blockquote>❌ <b>Gagal mengambil audio.</b></blockquote>", { parse_mode: "HTML" }); }
});

bot.command("shorten", async (ctx) => {
  const url = ctx.message.text.split(" ")[1];
  if (!url) return safeReply(ctx, "<blockquote><b>Gunakan:</b> <code>/shorten url</code></blockquote>", { parse_mode: "HTML" });
  try {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    safeReply(ctx, `<blockquote><b>🔗 Shortened URL:</b>\n${res.data}</blockquote>`, { parse_mode: "HTML" });
  } catch (e) { safeReply(ctx, "<blockquote>❌ <b>Gagal memendekkan URL.</b></blockquote>", { parse_mode: "HTML" }); }
});

bot.command("checkerror", async (ctx) => {
    if (!ctx.message.reply_to_message?.document)
        return safeReply(ctx, "<blockquote>❌ <b>Reply file untuk dianalisa!</b></blockquote>", { parse_mode: "HTML" });

    const file = ctx.message.reply_to_message.document;
    const fileId = file.file_id;
    const fileName = file.file_name;

    const limit = updateUserLimit(ctx.from.id);
    if (limit < 0) return safeReply(ctx, "<blockquote>❌ <b>Limit habis!</b> Upgrade ke premium.</blockquote>", { parse_mode: "HTML" });

    try {
        safeReply(ctx, "<blockquote>📥 <b>Mengunduh & menganalisa file...</b></blockquote>", { parse_mode: "HTML" });

        const buff = await downloadFile(fileId);
        const content = getFileContent(buff);

        const analysis = await analyzeErrorWithGemini(content, fileName);

        safeReply(ctx, `<b>📄 Hasil Analisis:</b>\n\n${analysis}\n\n<b>Sisa limit:</b> ${getUserLimit(ctx.from.id)}`,
            { parse_mode: "HTML" }
        );
    } catch (err) {
        safeReply(ctx, "<blockquote>❌ <b>Error:</b></blockquote>" + err.message, { parse_mode: "HTML" });
    }
});

bot.command("fixerror", async (ctx) => {
    if (!ctx.message.reply_to_message?.document)
        return safeReply(ctx, "❌ <b>Reply file untuk diperbaiki!</b>", { parse_mode: "HTML" });

    const file = ctx.message.reply_to_message.document;
    const fileId = file.file_id;
    const fileName = file.file_name;

    const limit = updateUserLimit(ctx.from.id);
    if (limit < 0) return safeReply(ctx, "❌ <b>Limit habis!</b> Upgrade ke premium.", { parse_mode: "HTML" });

    try {
        safeReply(ctx, "🔧 <b>Memperbaiki error dengan Gemini...</b>", { parse_mode: "HTML" });

        const buff = await downloadFile(fileId);
        const content = getFileContent(buff);

        const fixed = await fixErrorWithGemini(content, fileName);

        ctx.replyWithDocument(
            { source: Buffer.from(fixed), filename: `fixed_${fileName}` },
            { caption: `✔ <b>Error berhasil diperbaiki!</b>\n<b>Sisa limit:</b> ${getUserLimit(ctx.from.id)}`, parse_mode: "HTML" }
        );
    } catch (err) {
        safeReply(ctx, "❌ <b>Error:</b> " + err.message, { parse_mode: "HTML" });
    }
});

bot.command("qc", async (ctx) => {
  try {
    const reply = ctx.message.reply_to_message;

    if (!reply) {
      return ctx.reply(
        "❌ <b>Contoh penggunaan:</b> <code>/qc (reply pesan)</code>",
        { parse_mode: "HTML" }
      );
    }

    const target = reply.forward_from || reply.from;
    const username = target.first_name || "User";

    let avatarUrl = "https://files.catbox.moe/nwvkbt.png";

    try {
      const photos = await ctx.telegram.getUserProfilePhotos(target.id, 0, 1);

      if (photos.total_count > 0) {
        const file = await ctx.telegram.getFileLink(photos.photos[0][0].file_id);
        avatarUrl = file.href;
      }
    } catch (err) {
      console.log("Avatar fetch error:", err);
    }

    const messageText = reply.text || reply.caption || "(pesan tidak berisi teks)";

    const payload = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
      width: 512,
      height: 768,
      scale: 2,
      messages: [
        {
          entities: [],
          avatar: true,
          from: {
            id: target.id,
            name: username,
            photo: { url: avatarUrl },
          },
          text: messageText,
          replyMessage: {},
        },
      ],
    };

    const loading = await ctx.reply(
      `<blockquote>⏳ <b>Membuat sticker quote...</b></blockquote>`,
      { parse_mode: "HTML" }
    );

    const result = await axios.post(
      "https://bot.lyo.su/quote/generate",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const buffer = Buffer.from(result.data.result.image, "base64");

    await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);

    await ctx.replyWithSticker({ source: buffer });
  } catch (err) {
    console.error("QC ERROR:", err);
    return ctx.reply(
      `<blockquote>❌ <b>Terjadi kesalahan saat membuat sticker.</b></blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");

  if (!text) {
    return ctx.reply("❌ <b>Contoh:</b> <code>/brat (kata-kata)</code>", {
      parse_mode: "HTML"
    });
  }

  const chatId = ctx.chat.id;
  const tempFilePath = "./brat_temp.webp";

  try {
    await ctx.reply("<blockquote>⏳ <b>Membuat sticker, tunggu sebentar...</b></blockquote>", { parse_mode: "HTML" });

    const imageUrl = `https://kepolu-brat.hf.space/brat?q=${encodeURIComponent(text)}`;

    const downloadFile = async (url, dest) => {
      const writer = fs.createWriteStream(dest);

      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    };

    await downloadFile(imageUrl, tempFilePath);

    await ctx.replyWithSticker({ source: tempFilePath });

    fs.unlinkSync(tempFilePath);

  } catch (err) {
    console.error(err);
    ctx.reply("<blockquote>❌ <b>Terjadi kesalahan saat membuat sticker. Coba lagi nanti.</b></blockquote>", { parse_mode: "HTML" });
  }
});

async function uploadToCatbox(buffer, filename) {
  try {
    const form = new FormData();
    form.append('fileToUpload', buffer, { filename: filename });
    form.append('reqtype', 'fileupload');
    
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}


async function uploadToCatbox(buffer, filename = "file") {
  const form = new FormData();

  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, {
    filename: filename,
    contentType: "application/octet-stream",
  });

  const res = await axios.post(
    "https://catbox.moe/user/api.php",
    form,
    {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return res.data;
}

bot.command("tourl", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg) {
      return ctx.reply(
        `<blockquote>❌ <b>Balas sebuah pesan yang berisi file/audio/video dengan perintah /tourl</b></blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    if (
      !replyMsg.document &&
      !replyMsg.photo &&
      !replyMsg.video &&
      !replyMsg.audio &&
      !replyMsg.voice
    ) {
      return ctx.reply(
        `<blockquote>❌ <b>Pesan yang kamu balas tidak mengandung file/audio/video yang bisa diupload.</b></blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    let fileId, filename;

    if (replyMsg.document) {
      fileId = replyMsg.document.file_id;
      filename = replyMsg.document.file_name;
    } else if (replyMsg.photo) {
      const photoArray = replyMsg.photo;
      fileId = photoArray[photoArray.length - 1].file_id;
      filename = "photo.jpg";
    } else if (replyMsg.video) {
      fileId = replyMsg.video.file_id;
      filename = replyMsg.video.file_name || "video.mp4";
    } else if (replyMsg.audio) {
      fileId = replyMsg.audio.file_id;
      filename = replyMsg.audio.file_name || "audio.mp3";
    } else if (replyMsg.voice) {
      fileId = replyMsg.voice.file_id;
      filename = "voice.ogg";
    }

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;

    const res = await axios.get(fileUrl, {
  responseType: "arraybuffer",
  headers: {
    "User-Agent": "Mozilla/5.0"
  }
});

const buffer = Buffer.from(res.data);

if (!buffer || buffer.length === 0) {
  throw new Error("File buffer kosong");
}

    const catboxUrl = await uploadToCatbox(buffer, filename);

    await ctx.reply(
      `<blockquote>✅ <b>File berhasil diupload ke Catbox:</b>\n<code>${catboxUrl}</code></blockquote>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("tourl error:", err);
    
    const cleanError = err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    ctx.reply(
      `<blockquote>❌ <b>Gagal upload file:</b> ${cleanError}</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

function calcTotalPrice(basePrice, qty) {
  if (qty <= 1) return basePrice;
  return basePrice * qty;
}

function renderPurchaseText(app, qty, total) {
  const stock = (app.accounts || []).length;
  return `<b>• Produk :</b> ${app.nama}
<b>• Sisa Stok :</b> ${stock}
<b>• Deskripsi :</b> ${app.deskripsi || '-'}

──────────────

<b>• Jumlah :</b> ${qty}
<b>• Harga Satuan :</b> ${toRupiah(app.harga)}
<b>• Total Harga :</b> ${toRupiah(total)}

<i>Updated: ${new Date().toLocaleTimeString()}</i>`;
}

bot.action("buyresvps_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyresvps_pay_qris")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId); // Ambil saldo user saat ini

  userState[userId] = {
    resellerVps: {
      price: hargaResellerVps,
      status: "Permanen"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<blockquote><b>👑 AKSES RESELLER VPS (BY Username)</b>
━━━━━━━━━━━━━━━━━━━━━━
ᯤ <b>Deskripsi :</b> <a href="https://telegra.ph/resvps-01-17">Klik Detail Disini</a>
ᯤ <b>Status    :</b> Permanen
ᯤ <b>Harga     :</b> <code>${toRupiah(hargaResellerVps)}</code>

<b>〔 👤 INFO SALDO 〕</b>
➥ <b>Saldo Anda :</b> <code>${toRupiah(saldoUser)}</code>
━━━━━━━━━━━━━━━━━━━━━━
<i>Silahkan pilih metode pembayaran di bawah :</i></blockquote>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💰 Bayar via Saldo (Instan)", callback_data: "resvps_pay_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "resvps_confirm_pay" }],
        [{ text: "🔙 Kembali", callback_data: "shop_menu" }]
      ]
    }
  });
});
bot.action("resvps_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const reseller = userState[userId]?.resellerVps;

  if (!reseller) return ctx.answerCbQuery("❌ Sesi habis, silakan ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < reseller.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk menjadi Reseller VPS!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= reseller.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ AKTIVASI RESELLER BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Pembayaran : <b>${toRupiah(reseller.price)}</b>\n` +
    `💼 Sisa Saldo  : <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Akses reseller VPS kamu sedang diproses...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Produk/Akses ke User
  await sendProductToUser(ctx, {
    type: "reseller_vps",
    resellerData: reseller
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🌟 NEW RESELLER VPS (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 DATA MEMBER 〕</b>\n` +
    `➥ <b>Nama    :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID :</b> <code>${userId}</code>\n\n` +
    `<b>〔 💳 DETAIL TRANSAKSI 〕</b>\n` +
    `➥ <b>Produk  :</b> Reseller VPS\n` +
    `➥ <b>Harga   :</b> <code>${toRupiah(reseller.price)}</code>\n` +
    `➥ <b>Metode  :</b> Potong Saldo\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>⚡ Upgrade status reseller berhasil dikonfirmasi!</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Testimoni
  if (typeof sendTestimoniKeChannel === "function") {
    sendTestimoniKeChannel(userName, userId, "Upgrade Reseller VPS", reseller.price);
  }
});

bot.action("resvps_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;
  const reseller = userState[userId]?.resellerVps;

  if (!reseller) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  // Menjawab callback query agar efek loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks "Menyiapkan..."
  await handlePayment(
    ctx,
    reseller.price,
    "Join Reseller VPS",
    {
      type: "reseller_vps",
      resellerData: reseller
    }
  );
});

bot.action("buy_install_panel", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buy_install_panel")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId);

  userState[userId] = {
    installPanelAccess: {
      price: hargaInstallPanel,
      productName: "Akses Jasa Install Panel"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<blockquote><b>𝗔𝗞𝗦𝗘𝗦 𝗝𝗔𝗦𝗔 𝗜𝗡𝗦𝗧𝗔𝗟𝗟 𝗣𝗔𝗡𝗘𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━━
 <b>𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗔𝗸𝘀𝗲𝘀:</b>
 ├≫ Install Pterodactyl Otomatis
 ├≫ Auto Node Ijo
 ├≫ Install Protect 
 ├≫ Install Theme 
 ├≫ Support Auto SSL (Let's Encrypt)
 ├≫ Auto Create Node & Location
 ├≫ Sekali Bayar (Akses Permanen)
 └≫ Hemat Waktu & Anti Error
 └≫ Akses Sepuasnya 

 <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗢𝗥𝗗𝗘𝗥:</b>
 ➥ <b>Produk :</b> Jasa Install Panel
 ➥ <b>Harga  :</b> <code>${toRupiah(hargaInstallPanel)}</code>
 ➥ <b>Saldo  :</b> <code>${toRupiah(saldoUser)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
<i>Silahkan pilih metode pembayaran di bawah ini:</i></blockquote>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Bayar via Saldo (Instan)", callback_data: "pay_install_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "pay_install_qris" }],
        [{ text: "🔙 Kembali", callback_data: "shop_menu" }]
      ]
    }
  });
});

// --- HANDLE BAYAR VIA SALDO ---
bot.action("pay_install_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const item = userState[userId]?.installPanelAccess;

  if (!item) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < item.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi!", true);
  }

  // Potong Saldo
  saldoDB[userId] -= item.price;
  saveJSON("./database/saldousers.json", saldoDB);

  // --- LOGIKA ADD KE DATABASE AKSES ---
  addAccessInstall(userId);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(
    `<b>✅ PEMBELIAN BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Harga : <b>${toRupiah(item.price)}</b>\n\n` +
    `<i>Sekarang kamu bisa menggunakan command di bawah ini sepuasnya:</i>\n` +
    `<code>/installpanel ipvps|pass|domainpnl|domainnode|ram</code>`, 
    { parse_mode: "HTML" }
  );

  // Simpan ke history transaksi (Gunakan fungsi yang kamu punya sebelumnya)
  saveHistoryTrx(userId, item.productName, item.price);
});

// --- HANDLE BAYAR VIA QRIS ---
bot.action("pay_install_qris", async (ctx) => {
  const userId = ctx.from.id;
  const item = userState[userId]?.installPanelAccess;
  if (!item) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  await ctx.answerCbQuery();
  await handlePayment(ctx, item.price, item.productName, {
    type: "install_panel_access"
  });
});

bot.action("buyrespanel_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyrespanel_pay_qris")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId); // Pastikan fungsi ini tersedia untuk cek saldo

  userState[userId] = {
    resellerResellerPanelLegal: {
      price: hargaResellerPanelLegal,
      durasi: "PERMANEN"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<blockquote><b>𝗔𝗞𝗦𝗘𝗦 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 𝗟𝗘𝗚𝗔𝗟</b>
━━━━━━━━━━━━━━━━━━━━━━━━
 <b>𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗝𝗼𝗶𝗻:</b>
 ├≫ Harga Terjangkau Untuk Pemula
 ├≫ Bisa Menjual Panel Kembali
 ├≫ Jangan menjual panel harga murah
 ├≫ Vps aktif 1 bulan full 
 ├≫ Pt" 5k perbulan untuk memperpanjang vps nya 
 ├≫ Server antu delay 
 ├≫ Bisa Open Jasa Sewa/Run Bot
 ├≫ Cocok Buat Auto Order
 └≫ Jamin Balmod Kalo Ada Usaha

 <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗢𝗥𝗗𝗘𝗥:</b>
 ➥ <b>Produk :</b> Reseller Panel Legal
 ➥ <b>Durasi :</b> Permanen
 ➥ <b>Harga  :</b> <code>${toRupiah(hargaResellerPanelLegal)}</code>
 ➥ <b>Saldo  :</b> <code>${toRupiah(saldoUser)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
<i>Silahkan pilih metode pembayaran di bawah ini:</i></blockquote>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Bayar via Saldo (Instan)", callback_data: "respanel_pay_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "respanel_confirm_pay" }],
        [{ text: "🔙 Kembali", callback_data: "shop_menu" }]
      ]
    }
  });
});

bot.action("respanel_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const panel = userState[userId]?.resellerResellerPanelLegal;

  if (!panel) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < panel.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membeli Reseller Panel!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= panel.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ JOIN RESELLER BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Pembayaran : <b>${toRupiah(panel.price)}</b>\n` +
    `💼 Sisa Saldo  : <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Akses reseller panel kamu sedang diaktifkan...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Produk (Sesuaikan dengan fungsi sendProductToUser kamu)
  await sendProductToUser(ctx, {
    type: "seller_panel",
    panelData: panel
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 NEW RESELLER PANEL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 DATA RESELLER 〕</b>\n` +
    `➥ <b>Nama    :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID :</b> <code>${userId}</code>\n\n` +
    `<b>〔 💳 DETAIL TRANSAKSI 〕</b>\n` +
    `➥ <b>Produk  :</b> Reseller Panel\n` +
    `➥ <b>Harga   :</b> <code>${toRupiah(panel.price)}</code>\n` +
    `➥ <b>Metode  :</b> Potong Saldo\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>⚡ Member baru telah bergabung!</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus agar tidak muncul di channel
});

bot.action("respanel_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;
  const panel = userState[userId]?.resellerResellerPanelLegal;

  if (!panel) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks loading
  await handlePayment(
    ctx,
    panel.price,
    `Join Reseller Panel (Permanen)`,
    {
      type: "seller_panel",
      panelData: panel
    }
  );
});



/// DI SINI SET RESELLER PANEL BIASA ACCOUNT DIGITAL OCEAN

bot.action("buyrespane_biasal_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyrespane_biasal_pay_qris")) return;

  const userId = ctx.from.id;
  const saldoUser = getSaldo(userId); // Pastikan fungsi ini tersedia untuk cek saldo

  userState[userId] = {
    resellerPanelbiasa: {
      price: hargaresellerPanelbiasa,
      durasi: "PERMANEN"
    }
  };

  await ctx.answerCbQuery();

  const captionMenu = `<blockquote><b>𝗔𝗞𝗦𝗘𝗦 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 𝗕𝗜𝗔𝗦𝗔</b>
━━━━━━━━━━━━━━━━━━━━━━━━
 <b>𝗞𝗲𝘂𝗻𝘁𝘂𝗻𝗴𝗮𝗻 𝗝𝗼𝗶𝗻:</b>
 ├≫ Harga Terjangkau Untuk Pemula
 ├≫ Bisa Menjual Panel Kembali
 ├≫ Bebas creat asalkan di pake 
 ├≫ Anti pt"
 ├≫ Server anti delay 
 ├≫ Server ber protect anti colong file 
 ├≫ Bisa Open Jasa Sewa/Run Bot
 ├≫ Cocok Buat Auto Order
 └≫ Jamin Balmod Kalo Ada Usaha

 <b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗢𝗥𝗗𝗘𝗥:</b>
 ➥ <b>Produk :</b> Reseller Panel Biasa
 ➥ <b>Durasi :</b> Permanen
 ➥ <b>Harga  :</b> <code>${toRupiah(hargaresellerPanelbiasa)}</code>
 ➥ <b>Saldo  :</b> <code>${toRupiah(saldoUser)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
<i>Silahkan pilih metode pembayaran di bawah ini:</i></blockquote>`;

  await editMenuMessage(ctx, captionMenu, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Bayar via Saldo (Instan)", callback_data: "respanelbiasa_pay_saldo" }],
        [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "respanelbiasa_confirm_pay" }],
        [{ text: "🔙 Kembali", callback_data: "shop_menu" }]
      ]
    }
  });
});

bot.action("respanelbiasa_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const panel = userState[userId]?.resellerPanelbiasa;

  if (!panel) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < panel.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi untuk membeli Reseller Panel!", true);
  }

  // --- PROSES POTONG SALDO ---
  saldoDB[userId] -= panel.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ JOIN RESELLER PANEL BIASA BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Pembayaran : <b>${toRupiah(panel.price)}</b>\n` +
    `💼 Sisa Saldo  : <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Akses reseller panel biasa kamu sedang diaktifkan...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Produk (Sesuaikan dengan fungsi sendProductToUser kamu)
  await sendProductToUser(ctx, {
    type: "seller_panel_biasa",
    panelData: panel
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 NEW RESELLER PANEL BIASA (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 DATA RESELLER 〕</b>\n` +
    `➥ <b>Nama    :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID :</b> <code>${userId}</code>\n\n` +
    `<b>〔 💳 DETAIL TRANSAKSI 〕</b>\n` +
    `➥ <b>Produk  :</b> Reseller Panel biasa\n` +
    `➥ <b>Harga   :</b> <code>${toRupiah(panel.price)}</code>\n` +
    `➥ <b>Metode  :</b> Potong Saldo\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>⚡ Member baru telah bergabung!</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Bagian sendTestimoniKeChannel telah dihapus agar tidak muncul di channel
});

bot.action("respanelbiasa_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;
  const panel = userState[userId]?.resellerPanelbiasa;

  if (!panel) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa edit teks "Menyiapkan..."
  await handlePayment(
    ctx,
    panel.price,
    `Join Reseller Panel Biasa (Permanen)`,
    {
      type: "seller_panel_biasa",
      panelData: panel
    }
  );
});

bot.action("menu_digitalocean", async (ctx) => {
  if (!await requirePrivateChat(ctx, "menu_digitalocean")) return;

  await ctx.answerCbQuery();

  // 🔥 HAPUS MENU SEBELUMNYA (teks + tombol)
  try {
    await ctx.editMessageText(" ", {
      reply_markup: { inline_keyboard: [] }
    });
  } catch {}

  // 🔥 Ambil produk unik yang masih punya stok
  const products = [...new Set(
    doAccounts
      .filter(a => !a.used)
      .map(a => a.product)
  )];

  // 🔥 Pastikan stok > 0
  const availableProducts = products.filter(p =>
    doAccounts.some(a => !a.used && a.product === p)
  );

  // ❌ JIKA STOK KOSONG
  if (!availableProducts.length) {
    return editMenuMessage(
      ctx,
      "❌ <b>Stok DigitalOcean kosong</b>",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Kembali", callback_data: "shop_menu" }]
          ]
        }
      }
    );
  }

  // ✅ LIST PRODUK
  const buttons = availableProducts.map(p => {
    const accounts = doAccounts.filter(
      a => !a.used && a.product === p
    );

    const stock = accounts.length;
    const price = accounts[0]?.price || 0;

    return [{
      text: `${p} (${stock}) - ${toRupiah(price)}`,
      callback_data: `select_do|${p}`
    }];
  });

  buttons.push([{ text: "🔙 Kembali", callback_data: "shop_menu" }]);

  await editMenuMessage(
    ctx,
    "<b>🖥️ PILIH PRODUK DIGITAL OCEAN :</b>",
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    }
  );
});

bot.action(/^select_do\|(.+)$/, async (ctx) => {
  const productName = ctx.match[1];

  userState[ctx.from.id] = {
    buyDO: {
      product: productName,
      quantity: 1
    }
  };

  await ctx.answerCbQuery();
  await updateDOMessage(ctx);
});

async function updateDOMessage(ctx) {
  const state = userState[ctx.from.id]?.buyDO;
  if (!state) return;

  const { product, quantity } = state;

  const productAccounts = doAccounts.filter(
    a => !a.used && a.product === product
  );

  const stock = productAccounts.length;
  const unitPrice = productAccounts[0]?.price || 0;
  const total = unitPrice * quantity;

  const text = `
<blockquote><b>${product}</b></blockquote>
━━━━━━━━━━━━━
ᯤ <b>Deskripsi :</b> <a href="${config.rulesdo}">CLICK DISINI</a>
ᯤ <b>Kuantitas :</b> ${quantity}
ᯤ <b>Tersedia :</b> ${stock}
ᯤ <b>Harga :</b> ${toRupiah(unitPrice)}

<blockquote><b>➤ Total Pembayaran :</b> ${toRupiah(total)}</blockquote>
`;

  const inlineKeyboard = [

    [
      { text: "➖", callback_data: "do_minus" },
      { text: quantity.toString(), callback_data: "do_qty" },
      { text: "➕", callback_data: "do_plus" }
    ],

    ...(stock > 0 ? [[{ text: "💳 𝗕𝘂𝘆 𝗡𝗼𝘄", callback_data: "do_buy_now" }]] : []),

    [
      { text: "❌ 𝗕𝗮𝘁𝗮𝗹 𝗢𝗿𝗱𝗲𝗿", callback_data: "shop_menu" }
    ]
  ];

  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}
bot.action("do_plus", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyDO;
  if (!state) return ctx.answerCbQuery();

  const { product, quantity } = state;

  const stock = doAccounts.filter(
    a => !a.used && a.product === product
  ).length;

  if (quantity < stock) {
    state.quantity++;
  }

  await ctx.answerCbQuery();
  await updateDOMessage(ctx);
});
bot.action("do_minus", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyDO;
  if (!state) return ctx.answerCbQuery();

  if (state.quantity > 1) {
    state.quantity--;
  }

  await ctx.answerCbQuery();
  await updateDOMessage(ctx);
});

bot.action("do_buy_now", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyDO;

  if (!state) return ctx.answerCbQuery("❌ Sesi kedaluwarsa, ulangi order.");

  const { product, quantity } = state;
  const availableAccounts = doAccounts.filter(a => !a.used && a.product === product);

  if (availableAccounts.length < quantity) {
    return ctx.reply(`❌ <b>Stok tidak mencukupi!</b>\nStok tersedia: ${availableAccounts.length}`, { parse_mode: "HTML" });
  }

  const totalHarga = availableAccounts[0].price * quantity;
  const saldoUser = getSaldo(userId); // Pastikan fungsi get saldo tersedia

  await ctx.editMessageText(
    `<b>🛒 KONFIRMASI PEMBELIAN</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Produk:</b> DigitalOcean ${product}\n` +
    `🔢 <b>Jumlah:</b> ${quantity} Akun\n` +
    `💰 <b>Total:</b> ${toRupiah(totalHarga)}\n` +
    `💳 <b>Saldo Kamu:</b> ${toRupiah(saldoUser)}\n\n` +
    `<i>Pilih metode pembayaran di bawah:</i>`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("💰 Bayar via Saldo", "pay_do_saldo")],
        [Markup.button.callback("🏦 Bayar via QRIS", "pay_do_qris")],
        [Markup.button.callback("🔙 Batal", "back_home")]
      ])
    }
  );
});

bot.action("pay_do_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const state = userState[userId]?.buyDO;
  if (!state) return ctx.answerCbQuery("❌ Sesi habis, silakan ulangi.");

  const { product, quantity } = state;
  const availableAccounts = doAccounts.filter(a => !a.used && a.product === product);
  
  if (availableAccounts.length < quantity) {
    return ctx.reply("❌ <b>Maaf, stok tiba-tiba habis!</b>", { parse_mode: "HTML" });
  }

  const totalHarga = availableAccounts[0].price * quantity;
  
  // Load Saldo
  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < totalHarga) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi! Silakan Top Up dahulu.", true);
  }

  // --- PROSES TRANSAKSI ---
  saldoDB[userId] -= totalHarga;
  saveJSON("./database/saldousers.json", saldoDB);

  // Ambil data akun & tandai digunakan
  const selectedAccounts = availableAccounts.slice(0, quantity);
  selectedAccounts.forEach(acc => acc.used = true);
  
  // Jika kamu simpan akun DO di file, jangan lupa save:
  // saveJSON("./database/doAccounts.json", doAccounts); 

  await ctx.answerCbQuery("✅ Transaksi Berhasil!");
  
  await ctx.editMessageText(
    `<b>✅ PEMBAYARAN BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Saldo dipotong: <b>${toRupiah(totalHarga)}</b>\n` +
    `💼 Sisa saldo anda: <b>${toRupiah(saldoDB[userId])}</b>\n\n` +
    `<i>Pesanan sedang dikirim ke chat ini...</i>`, 
    { parse_mode: "HTML" }
  );

  // Kirim Produk ke User
  await sendProductToUser(ctx, {
    type: "do",
    accounts: selectedAccounts
  });

  // --- NOTIFIKASI OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 NOTIFIKASI PENJUALAN (SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 DATA PEMBELI 〕</b>\n` +
    `➥ <b>Nama     :</b> <code>${userName}</code>\n` +
    `➥ <b>User ID  :</b> <code>${userId}</code>\n\n` +
    `<b>〔 📦 DATA PRODUK 〕</b>\n` +
    `➥ <b>Produk   :</b> DigitalOcean ${product}\n` +
    `➥ <b>Jumlah   :</b> ${quantity} Akun\n` +
    `➥ <b>Total    :</b> <code>${toRupiah(totalHarga)}</code>\n\n` +
    `<b>〔 💳 STATUS SALDO 〕</b>\n` +
    `➥ <b>Metode   :</b> Potong Saldo (Internal)\n` +
    `➥ <b>Sisa     :</b> ${toRupiah(saldoDB[userId])}\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n` +
    `<i>Sistem Otomatis @albyy0x</i>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log(e));
  
  // Baris sendTestimoniKeChannel telah dihapus sesuai permintaan
});

bot.action("pay_do_qris", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyDO;
  if (!state) return ctx.answerCbQuery();

  const { product, quantity } = state;
  const availableAccounts = doAccounts.filter(a => !a.used && a.product === product);
  
  // Ambil akun sementara (booking)
  const selectedAccounts = availableAccounts.slice(0, quantity);
  const totalHarga = selectedAccounts[0].price * quantity;
  const itemName = `Akun DO: ${product} (x${quantity})`;

  await ctx.answerCbQuery();
  
  // Langsung lempar ke handlePayment Pakasir/Manual
  await handlePayment(
    ctx, 
    totalHarga, 
    itemName, 
    {
      type: "do",
      accounts: selectedAccounts
    }
  );
});


const VPS_DB_PATH = path.join(__dirname, "database/akuvps.json");

function loadVPSAccounts() {
  if (!fs.existsSync(VPS_DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(VPS_DB_PATH, "utf-8"));
  } catch { return []; }
}

function saveVPSAccounts(accounts) {
  try {
    fs.writeFileSync(VPS_DB_PATH, JSON.stringify(accounts, null, 2), "utf-8");
  } catch (e) { console.error("Gagal simpan VPS DB:", e.message); }
}

let vpsAccounts = loadVPSAccounts();

bot.action("menu_produk", async (ctx) => {
  await ctx.answerCbQuery();

  // Baca database produk.json
  let dbProduk = [];
  if (fs.existsSync(pathrasya)) {
    dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  }

  // JIKA DATABASE KOSONG
  if (dbProduk.length === 0) {
    const emptyMsg = `
╭───────────────────────╮
     <b>⚠️ STOK KOSONG ⚠️</b>
╰───────────────────────╯

<blockquote>Maaf saat ini belum ada produk yang tersedia.</blockquote>

💬 <b>Hubungi Admin:</b> @${bot.botInfo.username}`;

    return editMenuMessage(ctx, emptyMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu" }]]
      }
    });
  }

  // TAMPILAN KATALOG
  let menuText = `<blockquote>🛍️ Semua Catalog Produk</blockquote>\n━━━━━━━━━━━━━\n`;
  const numberButtons = [];

  dbProduk.forEach((p, index) => {
    const number = index + 1;
    // Menghitung jumlah stok dari panjang array 'stok'
    const stock = p.stok ? p.stok.length : 0; 
    const status = stock > 0 ? "✅" : "🚫";

    menuText += `[ ${number} ] ${p.nama.toUpperCase()} ${status}\n`;
    menuText += `  ╰┈➤ ʜᴀʀɢᴀ : ${toRupiah(p.harga)}\n`;
    menuText += `  ╰┈➤ ᴛᴇʀꜱᴇᴅɪᴀ : ${stock} pcs\n━━━━━━━━━━━━━\n`;

    numberButtons.push({
      text: `${number}`,
      callback_data: `select_prod|${p.id}`
    });
  });

  menuText += `<blockquote>🛍️ Pilih Produk Yang Anda Inginkan :</blockquote>`;

  // Menyusun tombol angka (maksimal 5 per baris agar tidak kepotong di HP)
  const keyboard = [];
  const rows = [];
  for (let i = 0; i < numberButtons.length; i += 5) {
    rows.push(numberButtons.slice(i, i + 5));
  }
  rows.forEach(row => keyboard.push(row));

  // Menu Navigasi
  keyboard.push([
    { text: "🔙 Kembali", callback_data: "shop_menu" },
    { text: "🔍 Produk Lainnya", callback_data: "shop_menu" }
  ]);

  await editMenuMessage(ctx, menuText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});


bot.action(/^select_prod\|(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  userState[ctx.from.id] = { buyProd: { id: productId, quantity: 1 } };
  await updateProductMessage(ctx);
});

async function updateProductMessage(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyProd;
  if (!state) return;

  const dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const item = dbProduk.find(p => p.id == state.id);

  if (!item) return ctx.answerCbQuery("Produk tidak ditemukan!");

  const stock = item.stok ? item.stok.length : 0;
  const total = item.harga * state.quantity;

  const text = `<blockquote><b>${item.nama.toUpperCase()}</b></blockquote>
━━━━━━━━━━━━━
ᯤ <b>Deskripsi :</b>
Produk Digital Otomatis Aktif.

ᯤ <b>Kuantitas :</b> ${state.quantity}
ᯤ <b>Tersedia  :</b> ${stock} pcs
ᯤ <b>Harga     :</b> ${toRupiah(item.harga)}

<blockquote><b>➤ Total Pembayaran :</b> ${toRupiah(total)}
<b>➤ Total Pcs :</b> ${state.quantity} Pcs</blockquote>`;

  const inlineKeyboard = [
    [
      { text: "➖", callback_data: "prod_minus" },
      { text: state.quantity.toString(), callback_data: "prod_qty" },
      { text: "➕", callback_data: "prod_plus" }
    ],
    // Tombol Buy Now hanya muncul jika stok lebih dari 0
    ...(stock > 0 ? [[{ text: "💳 𝗕𝘂𝘆 𝗡𝗼𝘄", callback_data: `checkout_produk|${item.id}` }]] : []),
    [
      { text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_produk" }
    ]
  ];

  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

bot.action("prod_plus", async (ctx) => {
  const state = userState[ctx.from.id]?.buyProd;
  if (state) {
    state.quantity++;
    await updateProductMessage(ctx);
  }
});

bot.action("prod_minus", async (ctx) => {
  const state = userState[ctx.from.id]?.buyProd;
  if (state && state.quantity > 1) {
    state.quantity--;
    await updateProductMessage(ctx);
  }
});

bot.action(/^checkout_produk\|(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const productId = ctx.match[1];
  const state = userState[userId]?.buyProd;

  if (!state) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi order.");

  const dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const item = dbProduk.find(p => p.id == productId);

  if (!item) return ctx.answerCbQuery("❌ Produk tidak ditemukan.");

  const totalHarga = item.harga * state.quantity;
  const saldoUser = getSaldo(userId); 

  await ctx.editMessageText(
    `<b>🛒 KONFIRMASI PEMBELIAN</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 📋 DETAIL PESANAN 〕</b>\n` +
    `➥ <b>Produk   :</b> ${item.nama}\n` +
    `➥ <b>Jumlah   :</b> ${state.quantity} Pcs\n` +
    `➥ <b>Total    :</b> <code>${toRupiah(totalHarga)}</code>\n\n` +
    `<b>〔 👤 INFO SALDO 〕</b>\n` +
    `➥ <b>Saldo Mu :</b> <code>${toRupiah(saldoUser)}</code>\n\n` +
    `<i>Pilih metode pembayaran di bawah ini:</i>`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("💰 Bayar via Saldo", `pay_prod_saldo|${item.id}`)],
        [Markup.button.callback("🏦 Bayar via QRIS", `pay_prod_qris|${item.id}`)],
        [Markup.button.callback("🔙 Batal", "menu_produk")]
      ])
    }
  );
});

bot.action(/^pay_prod_saldo\|(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const productId = ctx.match[1];
  const state = userState[userId]?.buyProd;
  
  if (!state) return ctx.answerCbQuery("❌ Sesi habis.");

  const dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const item = dbProduk.find(p => p.id == productId);
  
  if (!item || item.stok.length < state.quantity) {
    return ctx.answerCbQuery("❌ Maaf, stok mendadak habis atau tidak cukup.", true);
  }

  const totalHarga = item.harga * state.quantity;
  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < totalHarga) {
    return ctx.answerCbQuery("❌ Saldo tidak cukup! Silakan Top Up.", true);
  }

  // --- EKSEKUSI ---
  saldoDB[userId] -= totalHarga;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(`<b>✅ BERHASIL!</b> Saldo terpotong <code>${toRupiah(totalHarga)}</code>. Mengirim produk...`, { parse_mode: "HTML" });

  // Kirim Produk (Logic yang memotong array stok)
  await sendProductToUser(ctx, {
    type: "produk",
    id: item.id,
    quantity: state.quantity
  });

  // --- NOTIF OWNER ---
  const ownerMsg = 
    `<b>🛍️ PRODUK TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 BUYER 〕</b>\n` +
    `➥ <b>Nama :</b> ${userName}\n` +
    `➥ <b>ID   :</b> <code>${userId}</code>\n\n` +
    `<b>〔 📦 PRODUK 〕</b>\n` +
    `➥ <b>Item :</b> ${item.nama}\n` +
    `➥ <b>Qty  :</b> ${state.quantity} Pcs\n` +
    `➥ <b>Total:</b> <code>${toRupiah(totalHarga)}</code>\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log("Gagal lapor owner: " + e.message));
});

bot.action(/^pay_prod_qris\|(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const productId = ctx.match[1];
  const state = userState[userId]?.buyProd;
  if (!state) return ctx.answerCbQuery();

  const dbProduk = JSON.parse(fs.readFileSync(pathrasya, 'utf-8') || "[]");
  const item = dbProduk.find(p => p.id == productId);
  
  if (!item) return ctx.answerCbQuery("❌ Produk tidak ditemukan.");

  const totalHarga = item.harga * state.quantity;

  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran QRIS
  await handlePayment(
    ctx, 
    totalHarga, 
    `Produk: ${item.nama} (x${state.quantity})`, 
    {
      type: "produk",
      id: item.id,
      quantity: state.quantity
    }
  );
});

bot.action("menu_vps", async (ctx) => {
  await ctx.answerCbQuery();

  // Ambil semua list produk unik
  const allProducts = [...new Set(vpsAccounts.map(a => a.product))];

  // ===================== JIKA DATABASE BENAR-BENAR KOSONG =====================
  if (allProducts.length === 0) {
    const emptyMsg = `
╭───────────────────────╮
     <b>⚠️ STOK VPS KOSONG ⚠️</b>
╰───────────────────────╯

<blockquote>Maaf saat ini belum ada produk VPS yang terdaftar di database.</blockquote>

💬 <b>Hubungi Admin:</b> @${bot.botInfo.username}`;

    return editMenuMessage(ctx, emptyMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "shop_menu" }]]
      }
    });
  }

  // ===================== TAMPILAN KATALOG =====================
  let menuText = `<blockquote>🛍️ Semua Catalog Produk Vps</blockquote>\n━━━━━━━━━━━━━\n`;

  const numberButtons = []; // tombol angka satu baris

  allProducts.forEach((p, index) => {
    const stock = vpsAccounts.filter(a => !a.used && a.product === p).length;
    const status = stock > 0 ? "✅" : "🚫";
    const number = index + 1;

    menuText += `[ ${number} ] ${p.toUpperCase()} ${status}\n`;
    menuText += `  ╰┈➤ ᴛᴇʀꜱᴇᴅɪᴀ : ${stock} pcs\n━━━━━━━━━━━━━\n`;

    numberButtons.push({
      text: `${number}`,
      callback_data: `select_vps|${p}`
    });
  });

  menuText += `<blockquote>🛍️ Pilih Produk Yang Anda Inginkan :</blockquote>\nHalaman 1/1`;

  // ===================== KEYBOARD =====================
  const keyboard = [];

  // Baris 1: Tombol Angka (1 2 3 4 5)
  keyboard.push(numberButtons);

  // Baris 2: Navigasi Halaman (disiapkan walau 1 halaman)
  const page = 1;
  const totalPages = 1;
  const navRow = [];

  if (page > 1) {
    navRow.push({ text: "⬅️ Kembali", callback_data: `menu_vps_${page - 1}` });
  }
  if (page < totalPages) {
    navRow.push({ text: "Selanjutnya ➡️", callback_data: `menu_vps_${page + 1}` });
  }
  if (navRow.length > 0) keyboard.push(navRow);

  // Baris 3: Menu Utama
  keyboard.push([
    { text: "🔙 Kembali", callback_data: "shop_menu" },
    { text: "🔍 Produk Lainnya", callback_data: "shop_menu" }
  ]);

  await editMenuMessage(ctx, menuText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
});

bot.action(/^select_vps\|(.+)$/, async (ctx) => {
  const productName = ctx.match[1];
  userState[ctx.from.id] = { buyVPS: { product: productName, quantity: 1 } };
  await updateVpsMessage(ctx);
});
async function updateVpsMessage(ctx) {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyVPS;
  if (!state) return;

  const { product, quantity } = state;

  // Filter akun yang tersedia untuk produk ini
  const productAccounts = vpsAccounts.filter(
    a => !a.used && a.product === product
  );

  const stock = productAccounts.length;
  const unitPrice = productAccounts[0]?.price || 0;
  const total = unitPrice * quantity;


  const text = `<blockquote><b>${product.toUpperCase()}</b></blockquote>
━━━━━━━━━━━━━
ᯤ <b>Deskripsi :
• FREE INSTAL 
• VPS TAHAN LAMA
• FREE PASANG PROTECT 
• GARANSI ON 5 DAY
• FREE INSTAL NODE / WINGS
• DO SUS = GARANSI HANGUS</b>
ᯤ <b>Kuantitas :</b> ${quantity}
ᯤ <b>Tersedia :</b> ${stock}
ᯤ <b>Harga :</b> ${toRupiah(unitPrice)}

<blockquote><b>➤ Total Pembayaran :</b> ${toRupiah(total)}</blockquote>`;

  const inlineKeyboard = [
    [
      { text: "➖", callback_data: "vps_minus" },
      { text: quantity.toString(), callback_data: "vps_qty" },
      { text: "➕", callback_data: "vps_plus" }
    ],
    // Tombol Buy Now hanya muncul jika stok > 0
    ...(stock > 0 ? [[{ text: "💳 𝗕𝘂𝘆 𝗡𝗼𝘄", callback_data: "vps_buy_now" }]] : []),
    [
      { text: "🔙 𝗞𝗲𝗺𝗯𝗮𝗹𝗶", callback_data: "menu_vps" }
    ]
  ];

  await editMenuMessage(ctx, text, {
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

// ===================== ADD PRODUK (MULTI LINE) =====================
bot.action("start_add_vps", async (ctx) => {
  if (ctx.from.id !== Number(config.ownerId)) return ctx.answerCbQuery("❌ Akses ditolak.");
  userState[ctx.from.id] = { step: "WAITING_ADD_VPS" };
  
  await ctx.editMessageText(
    "<b>📥 INPUT DATA VPS</b>\n\n" +
    "Silakan kirim data dengan format:\n" +
    "<code>IP | Password | Harga | Nama Produk</code>\n\n" +
    "<i>Contoh: 127.0.0.1 | admin123 | 50000 | VPS SG 2GB</i>\n" +
    "────────────────────\n" +
    "Ketik /cancel untuk membatalkan.",
    { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Batal", "menu_owner")]]) }
  );
});

bot.command("listproduk", async (ctx) => {
  if (String(ctx.from.id) !== String(config.ownerId)) 
    return ctx.reply("❌ Hanya owner yang bisa melihat daftar produk.");

  if (vpsAccounts.length === 0) 
    return ctx.reply("Database Kosong.");

  let msg = "<b>📋 DAFTAR PRODUK VPS</b>\n\n";
  vpsAccounts.forEach((a, i) => {
    msg += `${i + 1}. <code>${a.id}</code> | ${a.product} | ${a.used ? "🔴 Terpakai" : "🟢 Tersedia"} | ${toRupiah(a.price)}\n`;
    if (msg.length > 3800) { 
      ctx.reply(msg, { parse_mode: "HTML" }); 
      msg = ""; 
    }
  });
  if (msg) ctx.reply(msg, { parse_mode: "HTML" });
});

bot.action("del_vps_list", async (ctx) => {
  if (ctx.from.id !== Number(config.ownerId)) return ctx.answerCbQuery("❌ Akses ditolak.");

  const available = vpsAccounts.filter(a => !a.used);
  if (available.length === 0) {
    return ctx.editMessageText("<blockquote>❌ <b>Database VPS Kosong atau sudah terpakai semua.</b></blockquote>", 
      { parse_mode: "HTML", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "menu_owner")]]) });
  }

  const buttons = vpsAccounts.map((a, i) => {
    if (!a.used) {
      return [Markup.button.callback(`🗑️ ${a.product} (${a.ip})`, `confirm_del_vps_${i}`)];
    }
    return null;
  }).filter(Boolean);

  buttons.push([Markup.button.callback("🔙 Kembali", "menu_owner")]);

  await ctx.editMessageText("<blockquote><b>🗑️ Pilih VPS yang ingin dihapus:</b></blockquote>", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard(buttons.slice(0, 10)) // Limit 10 per page if needed
  });
});
bot.action(/confirm_del_vps_(\d+)/, async (ctx) => {
  const idx = parseInt(ctx.match[1]);
  const removed = vpsAccounts[idx];

  if (!removed) return ctx.answerCbQuery("❌ Produk tidak ditemukan.");

  vpsAccounts.splice(idx, 1);
  saveVPSAccounts(vpsAccounts);

  await ctx.answerCbQuery(`✅ Hapus: ${removed.product}`);
  await ctx.editMessageText(`<blockquote><b>✔️ VPS Berhasil Dihapus</b>\n\n<b>ID:</b> ${removed.id}\n<b>IP:</b> ${removed.ip}\n<b>Produk:</b> ${removed.product}</blockquote>`, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali ke List", "del_vps_list")]])
  });
});

bot.action("vps_plus", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyVPS;
  if (!state) return ctx.answerCbQuery();

  const { product, quantity } = state;

  // Hitung stok yang tersedia di database
  const stock = vpsAccounts.filter(
    a => !a.used && a.product === product
  ).length;

  // Cek jika jumlah yang mau dibeli sudah mencapai batas stok
  if (quantity >= stock) {
    return ctx.answerCbQuery(`❌ Stok cuma ${stock}`, { show_alert: true });
  }

  // Jika masih ada stok, tambahkan quantity
  state.quantity++;
  
  await ctx.answerCbQuery(); // Hilangkan loading di button
  await updateVpsMessage(ctx);
});
bot.action("vps_minus", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyVPS;
  if (!state) return ctx.answerCbQuery();

  if (state.quantity > 1) {
    state.quantity--;
  }

  await ctx.answerCbQuery();
  await updateVpsMessage(ctx);
});

bot.action("vps_buy_now", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyVPS;

  if (!state) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi order.");

  const { product, quantity } = state;
  const availableVPS = vpsAccounts.filter(a => !a.used && a.product === product);

  if (availableVPS.length < quantity) {
    return ctx.reply(`❌ <b>Stok tidak mencukupi!</b>\nTersedia: ${availableVPS.length}`, { parse_mode: "HTML" });
  }

  const totalHarga = availableVPS[0].price * quantity;
  const saldoUser = getSaldo(userId); 

  await ctx.editMessageText(
    `<b>🛒 KONFIRMASI PEMBELIAN VPS</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 📋 DETAIL PESANAN 〕</b>\n` +
    `➥ <b>Produk   :</b> VPS ${product}\n` +
    `➥ <b>Jumlah   :</b> ${quantity} Unit\n` +
    `➥ <b>Total    :</b> <code>${toRupiah(totalHarga)}</code>\n\n` +
    `<b>〔 👤 INFO SALDO 〕</b>\n` +
    `➥ <b>Saldo Mu :</b> <code>${toRupiah(saldoUser)}</code>\n\n` +
    `<i>Pilih metode pembayaran di bawah ini:</i>`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("💰 Bayar via Saldo", "pay_vps_saldo")],
        [Markup.button.callback("🏦 Bayar via QRIS", "pay_vps_qris")],
        [Markup.button.callback("🔙 Batal", "back_home")]
      ])
    }
  );
});

bot.action("pay_vps_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const state = userState[userId]?.buyVPS;
  if (!state) return ctx.answerCbQuery("❌ Sesi habis.");

  const { product, quantity } = state;
  const availableVPS = vpsAccounts.filter(a => !a.used && a.product === product);
  
  // Validasi stok ulang sebelum potong saldo
  if (availableVPS.length < quantity) {
    return ctx.answerCbQuery("❌ Maaf, stok mendadak habis.", true);
  }

  const totalHarga = availableVPS[0].price * quantity;
  
  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < totalHarga) {
    return ctx.answerCbQuery("❌ Saldo tidak cukup! Silakan Top Up.", true);
  }

  // --- EKSEKUSI ---
  saldoDB[userId] -= totalHarga;
  saveJSON("./database/saldousers.json", saldoDB);

  const selectedVPS = availableVPS.slice(0, quantity);
  selectedVPS.forEach(acc => acc.used = true);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  await ctx.editMessageText(`<b>✅ BERHASIL!</b> Saldo terpotong <code>${toRupiah(totalHarga)}</code>. Mengirim produk...`, { parse_mode: "HTML" });

  // Kirim Produk
  await sendProductToUser(ctx, {
    type: "vps_stok",
    vpsStokData: { product, accounts: selectedVPS }
  });

  // --- NOTIF OWNER KECE ---
  const ownerMsg = 
    `<b>🚀 VPS TERJUAL (VIA SALDO)</b>\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
    `<b>〔 👤 BUYER 〕</b>\n` +
    `➥ <b>Nama :</b> ${userName}\n` +
    `➥ <b>ID   :</b> <code>${userId}</code>\n\n` +
    `<b>〔 📦 PRODUK 〕</b>\n` +
    `➥ <b>Item :</b> VPS ${product}\n` +
    `➥ <b>Qty  :</b> ${quantity}\n` +
    `➥ <b>Total:</b> <code>${toRupiah(totalHarga)}</code>\n\n` +
    `<b>━━━━━━━━━━━━━━━━━━━━━</b>`;

  bot.telegram.sendMessage(config.ownerId, ownerMsg, { parse_mode: "HTML" }).catch(e => console.log("Gagal lapor owner: " + e.message));
  
  // Baris sendTestimoniKeChannel telah dihapus sesuai permintaan
});


bot.action("pay_vps_qris", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId]?.buyVPS;
  if (!state) return ctx.answerCbQuery();

  const { product, quantity } = state;
  const availableVPS = vpsAccounts.filter(a => !a.used && a.product === product);
  
  const selectedVPS = availableVPS.slice(0, quantity);
  const totalHarga = selectedVPS[0].price * quantity;

  // Menjawab callback query agar loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa edit teks loading
  await handlePayment(
    ctx, 
    totalHarga, 
    `VPS: ${product} (x${quantity})`, 
    {
      type: "vps_stok",
      vpsStokData: { product, accounts: selectedVPS }
    }
  );
});


// 1. MENU UTAMA PEMILIHAN ROLE UBOT
bot.action("buyubot_pay_qris", async (ctx) => {
  if (!await requirePrivateChat(ctx, "buyubot_role_select")) return;
  await ctx.answerCbQuery();

  const captionRole = `<b>🎖️ SILAHKAN PILIH ROLE UBOT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Pilih role yang ingin Anda beli. Setiap role memiliki fitur dan keuntungan yang berbeda.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━`;

  await editMenuMessage(ctx, captionRole, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "PREMIUM", callback_data: "select_role_premium" }],
        [{ text: "SELLES UBOT", callback_data: "select_role_seller" }],
        [{ text: "ADMIN UBOT", callback_data: "select_role_admin" }],
        [{ text: "KEMBALI", callback_data: "shop_menu" }]
      ]
    }
  });
});

Object.keys(ubotRoles).forEach(roleKey => {
  bot.action(`select_role_${roleKey}`, async (ctx) => {
    const userId = ctx.from.id;
    const role = ubotRoles[roleKey];
    const saldoUser = getSaldo(userId);

    // Simpan ke state agar terbaca saat bayar
    userState[userId] = {
      ubotData: {
        name: role.name,
        price: role.price,
        durasi: "PERMANEN"
      }
    };

    await ctx.answerCbQuery();

    const captionPay = `<blockquote><b>𝗗𝗘𝗧𝗔𝗜𝗟 𝗢𝗥𝗗𝗘𝗥 𝗨𝗕𝗢𝗧</b>
━━━━━━━━━━━━━━━━━━━━━━━━
 ➥ <b>Role   :</b> ${role.name}
 ➥ <b>Durasi :</b> Permanen
 ➥ <b>Harga  :</b> <code>${toRupiah(role.price)}</code>
 ➥ <b>Saldo  :</b> <code>${toRupiah(saldoUser)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
<i>Silahkan pilih metode pembayaran di bawah ini:</i></blockquote>`;

    await editMenuMessage(ctx, captionPay, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Bayar via Saldo (Instan)", callback_data: "ubot_pay_saldo" }],
          [{ text: "🏦 Bayar via QRIS (Otomatis)", callback_data: "ubot_confirm_pay" }],
          [{ text: "🔙 Kembali", callback_data: "buyrespane_biasal_pay_qris" }]
        ]
      }
    });
  });
});

// 3. PROSES BAYAR VIA SALDO
bot.action("ubot_pay_saldo", async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const data = userState[userId]?.ubotData;

  if (!data) return ctx.answerCbQuery("❌ Sesi berakhir, ulangi.", true);

  let saldoDB = loadJSON("./database/saldousers.json");
  const userSaldo = saldoDB[userId] || 0;

  if (userSaldo < data.price) {
    return ctx.answerCbQuery("❌ Saldo tidak mencukupi!", true);
  }

  // Potong Saldo
  saldoDB[userId] -= data.price;
  saveJSON("./database/saldousers.json", saldoDB);

  await ctx.answerCbQuery("✅ Pembayaran Berhasil!");
  
  // Kirim Produk (Akan lari ke logika productData.type === "buy_ubot")
  await sendProductToUser(ctx, {
    type: "buy_ubot",
    name: data.name,
    price: data.price,
    durasi: data.durasi
  });
});

// 4. PROSES BAYAR VIA QRIS
bot.action("ubot_confirm_pay", async (ctx) => {
  const userId = ctx.from.id;
  const data = userState[userId]?.ubotData;

  if (!data) return ctx.answerCbQuery("❌ Data tidak ditemukan!", true);

  // Menjawab callback query agar efek loading di tombol hilang
  await ctx.answerCbQuery();

  // Langsung eksekusi pembayaran tanpa jeda teks "Menyiapkan..."
  await handlePayment(
    ctx,
    data.price,
    `Beli Ubot Role ${data.name}`,
    {
      type: "buy_ubot",
      name: data.name,
      price: data.price,
      durasi: data.durasi
    }
  );
});



bot.action("cancel_buy", async (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) return await ctx.answerCbQuery();

  delete userState[userId];

  await ctx.answerCbQuery("❌ Pembelian dibatalkan!", { show_alert: true });

  const chatId = ctx.chat.id;
  const msgId = ctx.update.callback_query.message.message_id;

  try {

    await ctx.telegram.deleteMessage(chatId, msgId);
  } catch (err) {

    await ctx.telegram.editMessageText(
      chatId,
      msgId,
      null,
      `<b>❌ Pembelian Admin Panel dibatalkan oleh user.</b>`,
      {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] }
      }
    );
  }
});

/**
 * 🛠 ERROR HANDLING
 */
bot.catch((err, ctx) => {
    console.error("Bot Error:", err);
    // Mengirim notifikasi ke chat jika terjadi error
    if (ctx && ctx.replyWithHTML) {
        ctx.replyWithHTML("<blockquote>❌ <b>Terjadi kesalahan.</b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    }
});
/**
 * 🚀 START ALL LOGIC
 */
async function startAll() {
  try {
    console.log(chalk.cyan('🚀 Starting Telegram Bot System...'));

    // PENTING: Pastikan nama file di panel Pterodactyl adalah rasyaaxinsa.js
    // Jika nama file kamu rasyaxinsa.js (satu 'a'), ubah baris di bawah ini.
    require('./WannOrder3.js');

    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    await bot.launch();
    
    console.log(chalk.green('✅ Telegram Bot berhasil dijalankan'));

    // Notifikasi Owner
    try {
      await bot.telegram.sendMessage(
        OWNER_ID,
        `🤖 *BOT ACTIVE* ✅\n\n` +
        `📅 Tanggal: ${new Date().toLocaleString('id-ID')}\n` +
        `⚡ Status: Online`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.log(chalk.yellow('⚠️ Gagal kirim notif owner.'));
    }

    // Auto Backup 2 Jam
    setInterval(() => {
      global.createAndSendFullBackup(null, true).catch(() => {});
    }, 2 * 60 * 60 * 1000);

  } catch (error) {
    console.error(chalk.green('❌ Gagal memulai bot:'), error);
    process.exit(1);
  }
}

const killBot = (reason) => {
  console.log(chalk.red('\n⛧ SYSTEM LOCKED ⛧'));
  console.log(chalk.red(reason));
  process.exit(1);
};

// ================= MAIN BOOT =================
(async () => {
  try {
    console.clear();
    console.log(chalk.cyan("===================================="));
    console.log(chalk.cyan("     BOT TOKEN PROTECTION SYSTEM"));
    console.log(chalk.cyan("====================================\n"));

    console.log(chalk.white("🔍 Mengecek BOT_TOKEN di GitHub..."));
    const valid = await isTokenRegistered(TELEGRAM_BOT_TOKEN);

    if (!valid) {
      killBot("❌ BOT_TOKEN tidak terdaftar!");
    }

    console.log(chalk.green("✅ BOT_TOKEN valid"));
    await startAll();

  } catch (err) {
    // Perbaikan error chalk.red is not a function
    console.log(chalk.green("❌ ERROR FATAL:"), err);
    process.exit(1);
  }
})();

// Graceful Shutdown
process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });
