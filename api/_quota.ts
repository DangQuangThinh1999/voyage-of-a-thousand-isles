// Giới hạn lượt AI theo người (Firebase Auth + Firestore qua firebase-admin, chỉ máy chủ đọc/ghi).
// - Tối đa MAX_USERS người học (không tính admin), mỗi người LIMIT lượt/ngày (ngày theo giờ Thái Bình Dương = giờ Google đặt lại hạn mức).
// - Người 3 ngày không dùng: tự xoá khỏi danh sách → trống chỗ, lượt dồn về admin. Admin (ADMIN_EMAIL) không bị giới hạn theo người.
// Biến môi trường: FIREBASE_SERVICE_ACCOUNT (JSON khoá service account), ADMIN_EMAIL. Thiếu thì bỏ qua giới hạn (chạy như cũ).
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const MAX_USERS = 9, LIMIT = 100, IDLE_DAYS = 3, TOTAL_FREE = 1040;
const COL = 'quota';

let ready: boolean | null = null;
/** lý do chưa bật: missing (chưa có biến) | bad_json (dán sai) | init_failed */
export let quotaReason = '';
function init(): boolean {
  if (ready !== null) return ready;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) { quotaReason = 'missing'; return (ready = false); }
    let sa: Record<string, string>;
    try { sa = JSON.parse(raw.trim()); } catch { quotaReason = 'bad_json'; return (ready = false); }
    if (!getApps().length) initializeApp({ credential: cert(sa) });
    return (ready = true);
  } catch (e) { console.error('quota init', e); quotaReason = 'init_failed'; return (ready = false); }
}
export const quotaOn = () => init();
export const db = () => getFirestore();

/** Ngày theo giờ Thái Bình Dương (Google đặt lại hạn mức miễn phí lúc 0 giờ PT ≈ 15 giờ VN) */
export const ptDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
const daysAgo = (day: string) => Math.round((Date.parse(ptDay()) - Date.parse(day)) / 86400_000);

export interface Who { uid: string; email: string; name: string; admin: boolean }
/** Đọc người dùng từ header Authorization: Bearer <Firebase ID token> */
export async function who(req: Request): Promise<Who | null> {
  if (!init()) return null;
  const h = req.headers.get('authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  try {
    const t = await getAuth().verifyIdToken(tok);
    const email = (t.email || '').toLowerCase(), admins = (process.env.ADMIN_EMAIL || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
    return { uid: t.uid, email, name: String(t.name || email.split('@')[0] || 'Người học'), admin: admins.includes(email) };
  } catch { return null; }
}

export interface QDoc { email: string; name: string; day: string; used: number; last: string; limit?: number; joined: string; total?: number; /** admin mở khoá các mốc đang khoá (7.5+) cho người này */ unlock?: boolean }

/** Xoá người không dùng ≥ IDLE_DAYS ngày (trả về danh sách còn lại, không gồm admin) */
export async function members(): Promise<(QDoc & { uid: string })[]> {
  const snap = await db().collection(COL).get(), out: (QDoc & { uid: string })[] = [];
  for (const d of snap.docs) {
    const q = d.data() as QDoc & { admin?: boolean };
    if (q.admin) continue;
    if (daysAgo(q.last) >= IDLE_DAYS) { await d.ref.delete(); continue; }
    out.push({ uid: d.id, ...q });
  }
  return out;
}

/** Trừ 1 lượt. Trả null nếu được dùng, hoặc { error, status } nếu bị chặn */
export async function take(u: Who): Promise<{ error: string; status: number; msg?: string } | null> {
  const ref = db().collection(COL).doc(u.uid), day = ptDay();
  if (u.admin) {
    await ref.set({ email: u.email, name: u.name, admin: true, last: day }, { merge: true });
    return null;
  }
  const cur = await ref.get();
  if (!cur.exists) {
    const list = await members();
    if (list.length >= MAX_USERS) return { error: 'full', status: 403, msg: `App đã đủ ${MAX_USERS} người học. Liên hệ admin, hoặc chờ có người nghỉ (3 ngày không dùng sẽ trống chỗ).` };
  }
  return db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const q = (s.exists ? s.data() : { email: u.email, name: u.name, day, used: 0, last: day, joined: day }) as QDoc;
    const used = q.day === day ? q.used : 0, limit = q.limit ?? LIMIT;
    if (used >= limit) return { error: 'daily_limit', status: 429, msg: `Hôm nay bạn đã dùng hết ${limit} lượt AI. Lượt mới có lúc 15 giờ (giờ Việt Nam).` };
    tx.set(ref, { ...q, email: u.email, name: u.name, day, used: used + 1, last: day, total: (q.total || 0) + 1 }, { merge: true });
    return null;
  });
}

/** Lượt hôm nay của một người */
export async function usage(u: Who) {
  const s = await db().collection(COL).doc(u.uid).get(), q = s.exists ? (s.data() as QDoc) : null, day = ptDay();
  const used = q && q.day === day ? q.used : 0, limit = u.admin ? null : (q?.limit ?? LIMIT);
  return { admin: u.admin, unlock: u.admin || !!q?.unlock, used, limit, remaining: limit === null ? null : Math.max(0, limit - used), member: !!q || u.admin };
}
