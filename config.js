module.exports = {

  //======= Setting Telegram =======//
botToken: process.env.BOT_TOKEN || "8757635002:AAEcZS1BDyWnYVxgovgxZFoXhnZKkDqPdhY",
  ownerId: 5676072619,
  ownerName: "Albyy",
  ownerWa: "6283190118851",
  ownerUser: "@albyy0x",
  botName: "Auto Order Bot",
  startPhoto: "https://files.catbox.moe/bdrlld.jpg",
  photosucces: "https://files.catbox.moe/bdrlld.jpg", // foto send channel
  buyvpsfoto: "https://files.catbox.moe/bdrlld.jpg", // foto send channel
  buydofoto: "https://files.catbox.moe/bdrlld.jpg", // foto send channel
  buyvpsinfofoto: "https://files.catbox.moe/bdrlld.jpg", // foto send channel Buy Vps
  startAudio: "https://files.catbox.moe/kc5bwz.mp3",
  startAudioCaption: "Auto Order Bot",
  testimoniChannel: "@seputarinfobotcoinalby",
  ChannelOwner: "https://t.me/seputarinfobotcoinalby",
  GroupOwner: "https://t.me/roompublicalbytzy",
  resvps: "-",
  resellerpanelLegal: "https://t.me/alltieralby",
  buyubot: "-",
  rulesdo: "https://telegra.ph/DESKRIPSI-BUY-AKUN-DIGITAL-OCEAN-01-09",
  succesdepootp: "https://files.catbox.moe/gldf4o.jpg",
  succestrxotp: "https://files.catbox.moe/gldf4o.jpg",
  resellerPanelbiasa: "https://t.me/alltieralby",

  //======= Setting Pakasir =======//
  pakasir: {
    apikey: "Ppbg7PMZXXLp2dCNSOAxrxmiwBYNn0bA", // Ganti dengan API Key Pakasir Anda
    project: "albyy-store",   // Ganti dengan Project Slug Pakasir Anda
    mode: "api" // "api" atau "url" (Disarankan API untuk bot)
  },
   // --- PAYMENT ORKUT ---
  payment: {
    apikey: "ubot",
    username: "",
    token: ":"
  },

  //======= Setting Penarikan (WD) =======//
  wd_balance: {
    bank_code: "08386069902", // DANA, BCA, BRI, dll
    destination_number: "-",
    destination_name: "-",
  },
  
  // --- Suntik Sosmed Setting ( FayuPedia )
    smm: {
        apiId: '224635', 
        apiKey: 'jqtobr-hrijhc-j4kf5a-1qewpw-1vfcqg', 
        baseUrl: 'https://fayupedia.id/api' 
    },

  // --- Nokos Setting ( Rumah Otp )
  RUMAHOTP: "rk-dev-j4C05aK5F2WIsuuoqHLD1O6RdAHX1wmB",
  UNTUNG_NOKOS: 500,
  UNTUNG_DEPOSIT: 750,

  /// NGGAK TAU BUAT APA POKOK NYA BUAT START WINGS🗿🗿
  tokeninstall: "revan",
  bash: "bash <(curl https://raw.githubusercontent.com/zerodevxc/revan/refs/heads/main/install.sh)",

  menuEffects: [
    "5104841245755180586",
    "5107584321108051014",
    "5159385139981059251",
    "5046509860389126442"
  ],

  premiumEffects: [
    "5103512349875603456",
    "5109987654321009876",
    "5198877665544332211"
  ],

  //======= Manual QRIS =======//
  manualQrisPhoto: "",

  //======= Setting VPS =======//
  ApiDO1: "", // ganti api do lu
  hargaVPS: {
    low: {
      "2c2": 5000,
      "4c2": 5000,
      "8c4": 5000,
      "16c4": 5000,
      "16c8": 5000
    },
    medium: {
      "2c2": 10000,
      "4c2": 10000,
      "8c4": 10000,
      "16c4": 10000,
      "16c8": 10000
    },
    high: {
      "2c2": 15000,
      "4c2": 15000,
      "8c4": 15000,
      "16c4": 15000,
      "16c8": 15000
    }
  },

  //======= GEMINI SETTING =======//
  USER_LIMIT: 3,
  GEMINI_API_KEY: "AIzaSyAnElzKO6LjN30kGvMg-aqxa5t0iQ88spY",

  //======= Panel Setting =======//
  panel: {
    domain: "https://albyytzy.xwarcloud.my.id",
    apikey: "ptla_AobLopKuoAAu4lO8wdmIwME9um8zCXhMcdREW2uWEN6",
    nestId: 5,
    eggId: 15,
    locationId: 1,
    startup: "npm start",
    image: "ghcr.io/parkervcp/yolks:nodejs_18"
  },

  reseller: {
    adminPanel: {
      monthly: 15000
    }
  },

  //======= Harga Panel =======//
  hargaPanel: {
    unlimited: 7000,
    perGB: 500,
  }
};
