// Vercel Function: /api/admin — GET: lượt AI hôm nay của người đang đăng nhập (+ danh sách người học nếu là admin).
// POST (chỉ admin): { action: 'limit', uid, limit } đổi hạn mức một người; { action: 'remove', uid } xoá người khỏi danh sách.
import { json } from './_gemini.js';
import { db, IDLE_DAYS, quotaReason, LIMIT, MAX_USERS, members, ptDay, quotaOn, TOTAL_FREE, usage, who } from './_quota.js';

export async function GET(req: Request): Promise<Response> {
  if (!quotaOn()) return json({ enabled: false, reason: quotaReason, adminEmailSet: !!process.env.ADMIN_EMAIL });
  const u = await who(req);
  if (!u) return json({ enabled: true, login: false, adminEmailSet: !!process.env.ADMIN_EMAIL });
  const me = await usage(u);
  if (!u.admin) return json({ enabled: true, login: true, ...me });
  const list = await members(), day = ptDay();
  const users = list.map((q) => ({ uid: q.uid, email: q.email, name: q.name, used: q.day === day ? q.used : 0, limit: q.limit ?? LIMIT, last: q.last, joined: q.joined, total: q.total || 0 }))
    .sort((a, b) => b.used - a.used);
  const usedAll = users.reduce((s, x) => s + x.used, 0) + me.used, reserved = users.reduce((s, x) => s + x.limit, 0);
  return json({ enabled: true, login: true, ...me, day, users, max: MAX_USERS, idleDays: IDLE_DAYS, totalFree: TOTAL_FREE, usedAll, reserved, adminShare: Math.max(0, TOTAL_FREE - reserved) });
}

export async function POST(req: Request): Promise<Response> {
  if (!quotaOn()) return json({ error: 'not_configured' }, 503);
  const u = await who(req);
  if (!u || !u.admin) return json({ error: 'forbidden' }, 403);
  let b: { action?: string; uid?: string; limit?: number };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const uid = String(b.uid || '').slice(0, 128);
  if (!uid) return json({ error: 'bad_uid' }, 400);
  const ref = db().collection('quota').doc(uid);
  if (b.action === 'remove') { await ref.delete(); return json({ ok: true }); }
  if (b.action === 'limit') {
    const limit = Math.max(0, Math.min(500, Math.round(Number(b.limit) || 0)));
    await ref.set({ limit }, { merge: true }); return json({ ok: true, limit });
  }
  return json({ error: 'bad_action' }, 400);
}
