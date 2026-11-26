// Vercel Function: /api/bank — KHO ĐỀ DÙNG CHUNG (Firestore, collection "exbank"): đề AI ai soạn cũng lưu lại cho mọi người.
// GET ?base=w03        → danh sách id đề của nhóm (tuần 1–12: wNN, các tuần sau theo band: b6.5…) + số lượng
// GET ?id=XXX          → nội dung một đề
// POST { base, cefr, band, exam } (cần đăng nhập) → lưu đề, trả id. Không tốn lượt AI. Mỗi nhóm chỉ giữ 3 đề mới nhất.
import { json } from './_gemini.js';
import { db, quotaOn, who } from './_quota.js';

const COL = 'exbank', KEEP = 3;
const okBase = (b: string) => /^(w\d{2}|b\d\.\d|u[a-z0-9-]{1,40})$/.test(b);

export async function GET(req: Request): Promise<Response> {
  if (!quotaOn()) return json({ items: [] });
  const u = new URL(req.url), base = u.searchParams.get('base') || '', id = u.searchParams.get('id') || '';
  if (id) {
    const d = await db().collection(COL).doc(id.slice(0, 64)).get();
    if (!d.exists) return json({ error: 'not_found' }, 404);
    const x = d.data() as { base: string; cefr: string; band: string; exam: string };
    return json({ id: d.id, base: x.base, cefr: x.cefr, band: x.band, exam: JSON.parse(x.exam) }, 200);
  }
  if (base === 'all') {
    // admin xem số đề mỗi nhóm
    const s = await db().collection(COL).select('base').get(), count: Record<string, number> = {};
    s.docs.forEach((d) => { const b = d.get('base'); count[b] = (count[b] || 0) + 1; });
    return json({ count });
  }
  if (!okBase(base)) return json({ error: 'bad_base' }, 400);
  const s = await db().collection(COL).where('base', '==', base).select('created').limit(200).get();
  return json({ items: s.docs.map((d) => ({ id: d.id, created: d.get('created') })).sort((a, b) => a.created - b.created) });
}

export async function POST(req: Request): Promise<Response> {
  if (!quotaOn()) return json({ error: 'not_configured' }, 503);
  const u = await who(req);
  if (!u) return json({ error: 'login_required' }, 401);
  let b: { base?: string; cefr?: string; band?: string; exam?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const base = String(b.base || ''), exam = JSON.stringify(b.exam || null);
  if (!okBase(base) || exam.length < 500 || exam.length > 300_000) return json({ error: 'bad_exam' }, 400);
  // kiểm tra sơ bộ cấu trúc đề
  const e = b.exam as { listening?: { questions?: unknown[] }; reading?: { questions?: unknown[] }; vocab?: { questions?: unknown[] }; writing?: { task?: string }; speaking?: { part2?: unknown } };
  if (!e.listening?.questions?.length || !e.reading?.questions?.length || !e.vocab?.questions?.length || !e.writing?.task || !e.speaking?.part2) return json({ error: 'bad_exam' }, 400);
  const ref = await db().collection(COL).add({ base, cefr: String(b.cefr || '').slice(0, 4), band: String(b.band || '').slice(0, 8), exam, by: u.uid, created: Date.now() });
  // Giữ tối đa KEEP đề mỗi nhóm (đề mới thay đề cũ nhất) để database không phình ra
  const all = await db().collection(COL).where('base', '==', base).select('created').get();
  const old = all.docs.sort((x, y) => (y.get('created') || 0) - (x.get('created') || 0)).slice(KEEP);
  await Promise.all(old.map((d) => d.ref.delete()));
  return json({ id: ref.id, removed: old.length });
}
