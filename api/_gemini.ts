// Dùng chung cho các Vercel Function: gọi Gemini (gói miễn phí) trả JSON theo schema, tự thử model kế tiếp khi quá tải.
// File bắt đầu bằng "_" nên Vercel không coi là một đường dẫn API.
export const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

import { quotaOn, take, who } from './_quota.js';

const hits = new Map<string, { n: number; t: number }>();
/** Chặn gọi từ trang lạ, giới hạn lượt theo IP, và (nếu đã cấu hình) bắt đăng nhập + trừ lượt AI theo người.
 *  Trả Response lỗi, hoặc null nếu hợp lệ. */
export async function guard(req: Request, perHour = 120, cost = 1): Promise<Response | null> {
  const origin = req.headers.get('origin') || '';
  if (origin && !/^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/.test(origin)) return json({ error: 'forbidden' }, 403);
  if (!process.env.GEMINI_API_KEY) return json({ error: 'not_configured' }, 503);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown', now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 3600_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > perHour) return json({ error: 'rate_limited' }, 429);
  if (quotaOn()) {
    const u = await who(req);
    if (!u) return json({ error: 'login_required', msg: 'Đăng nhập Google (⚙️ Cài đặt) để dùng các phần chấm/soạn bằng AI.' }, 401);
    try { const r = cost > 0 ? await take(u) : null; if (r) return json({ error: r.error, msg: r.msg }, r.status); }
    catch (e) { console.error('quota', e); /* lỗi đếm lượt: vẫn cho dùng */ }
  }
  return null;
}

/** fast = ưu tiên model nhanh (bài chấm dài). Mỗi model chờ tối đa ~30 giây rồi chuyển model khác. */
/** model → thời điểm được thử lại (sau khi báo hết lượt / không tồn tại) */
const COOL = new Map<string, number>();

export async function gemini(system: string, user: string, schema: unknown, temperature = 0.2, fast = false, perModelMs = 32_000, budgetMs = 100_000): Promise<Response> {
  const key = process.env.GEMINI_API_KEY!;
  // Gói miễn phí: Flash 20 lượt/ngày/model, Flash Lite 500 lượt/ngày/model → việc thường dùng Lite trước, việc cần chất lượng (fast = false) thử Flash trước
  const order = fast ? ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'] : ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const models = [...new Set([process.env.GEMINI_MODEL, ...order, 'gemini-flash-latest'].filter(Boolean) as string[])];
  const t0 = Date.now();
  let last = 0;
  // bỏ qua model vừa báo hết lượt (đỡ tốn lượt lỗi 429 và chờ lâu); nếu tất cả đều đang nghỉ thì vẫn thử hết
  const live = models.filter((m) => (COOL.get(m) || 0) < Date.now());
  for (const model of live.length ? live : models) {
    if (Date.now() - t0 > budgetMs) break;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), perModelMs);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
        }),
      });
      if (r.status === 429) {
        const body = await r.text().catch(() => '');
        // hết lượt theo NGÀY → nghỉ 1 giờ; hết lượt theo PHÚT → nghỉ 1 phút
        COOL.set(model, Date.now() + (/PerDay|per day|daily/i.test(body) ? 3600_000 : 60_000));
        last = 429; continue;
      }
      if (r.status === 404) COOL.set(model, Date.now() + 24 * 3600_000);
      if ([404, 500, 503].includes(r.status)) { last = r.status; continue; }
      if (!r.ok) return json({ error: `gemini_${r.status}` }, 502);
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      return json({ ...JSON.parse(text), model });
    } catch { last = -1; } finally { clearTimeout(timer); }
  }
  return json({ error: last === 429 ? 'quota' : 'busy' }, last === 429 ? 429 : 503);
}
