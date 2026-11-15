// Cloud Functions cho Hải Trình Vạn Đảo: tạo đơn nạp xu (PayOS / VietQR) và nhận webhook xác nhận thanh toán.
// Khóa bí mật PayOS được lưu bằng Firebase Secret Manager, không bao giờ nằm trong code hay trong trình duyệt.
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const PayOS = require('@payos/node');

admin.initializeApp();
const db = admin.firestore();
const REGION = 'asia-southeast1';
const PAYOS_CLIENT_ID = defineSecret('PAYOS_CLIENT_ID');
const PAYOS_API_KEY = defineSecret('PAYOS_API_KEY');
const PAYOS_CHECKSUM_KEY = defineSecret('PAYOS_CHECKSUM_KEY');
const SECRETS = [PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY];

// Bảng giá do MÁY CHỦ quyết định — trình duyệt chỉ gửi mã gói.
const PACKS = {   // 1 xu = 100đ (gói lớn được tặng thêm)
  p10:  { vnd: 10000,  xu: 100 },
  p20:  { vnd: 20000,  xu: 200 },
  p50:  { vnd: 50000,  xu: 520 },
  p100: { vnd: 100000, xu: 1100 },
  p200: { vnd: 200000, xu: 2300 },
};

const payos = () => new PayOS(PAYOS_CLIENT_ID.value(), PAYOS_API_KEY.value(), PAYOS_CHECKSUM_KEY.value());

exports.createPayment = onCall({ region: REGION, secrets: SECRETS }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Cần đăng nhập trước khi nạp xu');
  const packId = req.data && req.data.pack;
  const pack = PACKS[packId];
  if (!pack) throw new HttpsError('invalid-argument', 'Gói nạp không hợp lệ');
  // orderCode của PayOS là số nguyên dương, tối đa 9007199254740991
  const orderCode = Number(String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 90) + 10));
  const back = typeof req.data.returnUrl === 'string' && /^https?:\/\//.test(req.data.returnUrl) ? req.data.returnUrl : 'http://localhost:8765/index.html';
  await db.doc(`orders/${orderCode}`).set({
    uid: req.auth.uid, pack: packId, xu: pack.xu, amount: pack.vnd, status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = await payos().createPaymentLink({
    orderCode, amount: pack.vnd, description: `NAP ${pack.xu} XU`.slice(0, 25),
    items: [{ name: `${pack.xu} xu Hai Trinh Van Dao`, quantity: 1, price: pack.vnd }],
    returnUrl: back, cancelUrl: back,
  });
  return { checkoutUrl: link.checkoutUrl, qrCode: link.qrCode, orderCode };
});

// Đặt URL của hàm này làm Webhook URL trong trang quản trị PayOS.
exports.payosWebhook = onRequest({ region: REGION, secrets: SECRETS }, async (req, res) => {
  try {
    const data = payos().verifyPaymentWebhookData(req.body); // ném lỗi nếu chữ ký sai
    if (!req.body || req.body.code !== '00' || data.code !== '00') { res.json({ ok: true }); return; }
    const ref = db.doc(`orders/${data.orderCode}`);
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return;                       // ví dụ: webhook thử nghiệm của PayOS
      const o = snap.data();
      if (o.status !== 'pending') return;             // chống cộng xu 2 lần
      if (Number(data.amount) !== o.amount) throw new Error('Số tiền không khớp');
      t.update(ref, { status: 'paid', paidAt: admin.firestore.FieldValue.serverTimestamp(), ref: data.reference || '' });
      t.set(db.doc(`users/${o.uid}`), { xu: admin.firestore.FieldValue.increment(o.xu) }, { merge: true });
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('payosWebhook', e);
    res.status(400).json({ ok: false });
  }
});
