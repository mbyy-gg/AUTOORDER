const axios = require("axios");
const QRCode = require("qrcode");

const PAKASIR_BASE = "https://app.pakasir.com/api";

const toRupiah = (angka) => {
  return Number(angka).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).replace("IDR", "Rp").trim();
};

function generateReffId() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TRX-${Date.now()}-${rand}`;
}

function sanitizeQrString(s) {
  if (!s || typeof s !== 'string') return null;
  const idx = s.indexOf('000201');
  if (idx !== -1) return s.slice(idx).trim();
  return s.trim();
}

async function downloadQrisImage(url) {
  try {
    if (!url || !url.startsWith('http')) return null;
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 10000, 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    return null;
  }
}

async function createdQris(harga, config) {
  const amount = Number(harga);
  const orderId = generateReffId();

  try {
    const payload = {
        project: config.project,
        order_id: orderId,
        amount: amount,
        api_key: config.apikey
    };

    console.log(`[PAKASIR] Creating transaction: Amount=${amount}, OrderID=${orderId}`);

    const { data } = await axios.post(`${PAKASIR_BASE}/transactioncreate/qris`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
    });

    if (!data || !data.payment) {
        console.error("[PAKASIR] Invalid response:", data);
        return null;
    }

    const payment = data.payment;
    const candidates = [payment.qr_string, payment.qr, data.qr_string, data.qr, payment.payment_number]
      .filter(v => typeof v === 'string' && v.trim().length > 0);
    let qrString = null;
    for (const c of candidates) {
      const emv = sanitizeQrString(c);
      if (emv && emv.startsWith('000201')) {
        qrString = emv;
        break;
      }
    }

    if (!qrString) {
        console.error("[PAKASIR] No valid QR string returned");
        return null;
    }

    const qrBuffer = await QRCode.toBuffer(qrString, { errorCorrectionLevel: 'M', width: 512, margin: 1 });

    return {
      idtransaksi: payment.order_id,
      jumlah: payment.total_payment,
      imageqris: qrBuffer,
      qr_string: qrString,
      nominal: payment.amount,
      expired_at: payment.expired_at
    };

  } catch (e) {
    console.error("[PAKASIR CREATE ERROR]", e.response?.data || e.message);
    return null;
  }
}

async function cekStatus(id, amount, config) {
  try {
    // id passed here is the order_id
    // Note: Pakasir API requires project, amount, order_id, api_key for transactiondetail
    // Ideally we should pass the exact amount expected.
    // 'amount' parameter in cekStatus comes from qrisData.jumlah which is total_payment (including fee if any)
    // But Pakasir transactiondetail might expect the original amount or the total?
    // Documentation says: transactiondetail?project={slug}&amount={amount}&order_id={order_id}...
    // The response example shows "amount": 22000 which matches the request.
    // If there is a fee, total_payment might be different.
    // In createdQris, we return `jumlah: payment.total_payment`.
    // In index.js, `cekStatus` is called with `qrisData.jumlah`.
    // So we are passing total_payment.
    // I should check if Pakasir expects the original amount or total amount in transactiondetail.
    // The documentation example: create amount 99000, response total_payment 100003.
    // transactiondetail example: amount 22000. It's ambiguous if this 22000 is original or total.
    // Usually status check by Order ID should be enough, but Pakasir requires amount.
    // I will assume it matches what was sent in create, which is the original amount.
    // BUT `cekStatus` receives `qrisData.jumlah` which is `total_payment`.
    // We might have a mismatch here.
    // However, I can try passing the amount received. If it fails, maybe I should store original amount.
    // createdQris returns `nominal: payment.amount` (original) and `jumlah: payment.total_payment`.
    // index.js passes `qrisData.jumlah`.
    
    // Let's look at index.js again.
    // const isPaid = await cekStatus(qrisData.idtransaksi, qrisData.jumlah, paymentConfig);
    
    // I should probably modify index.js to pass `qrisData.nominal` if Pakasir expects original amount.
    // OR I can modify `cekStatus` to try both or handle it.
    // But I can't easily change `cekStatus` signature in `index.js` without editing `index.js`.
    // I will edit `index.js` anyway to remove other payments. So I can fix this there.
    
    const url = `${PAKASIR_BASE}/transactiondetail?project=${config.project}&amount=${amount}&order_id=${id}&api_key=${config.apikey}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    if (data && data.transaction && data.transaction.status === 'completed') return true;
    return false;

  } catch (e) {
    if (e.response && e.response.status === 404) return false;
    console.error("[PAKASIR STATUS ERROR]", e.message);
    return false;
  }
}

module.exports = {
  createdQris,
  cekStatus,
  toRupiah,
  downloadQrisImage 
};
