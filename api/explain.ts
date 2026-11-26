// Vercel Function: POST /api/explain
// Nhờ Claude giải thích ngữ pháp / từ vựng của một câu tiếng Anh cho người Việt mới học.
// Cần biến môi trường ANTHROPIC_API_KEY trong Vercel (Settings → Environment Variables).
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM = `Bạn là giáo viên tiếng Anh kiên nhẫn cho người Việt trình độ mới bắt đầu (khoảng A1–A2, IELTS 2–3).
Trả lời HOÀN TOÀN bằng tiếng Việt, câu ngắn, từ ngữ đời thường, không dùng thuật ngữ khó (nếu bắt buộc thì giải thích ngay).
Khi giải thích một câu hoặc một điểm ngữ pháp, theo thứ tự:
1. Câu này nghĩa là gì (1 dòng).
2. Công thức (1 dòng, dạng: S + am/is/are + V-ing).
3. Tại sao lại dùng như vậy (2–3 câu, so sánh với tiếng Việt nếu giúp dễ hiểu).
4. Ví dụ ✅ Đúng và ❌ Sai (2–3 cặp, câu ngắn, đời thường).
5. Một mẹo nhớ ngắn.
Nếu người học hỏi tiếp, trả lời đúng câu hỏi đó, ngắn gọn, vẫn có ví dụ.
Dùng định dạng đơn giản: dòng mới, gạch đầu dòng "- ", **in đậm** cho chữ quan trọng. Không dùng bảng, không dùng tiêu đề #.
Tối đa khoảng 200 từ. Nếu câu tiếng Anh có lỗi, chỉ ra lỗi và cách sửa.`;

const MAX = { sentence: 400, topic: 120, question: 400, history: 6, histChars: 1500 };
type Turn = { role: 'user' | 'assistant'; content: string };

// Chống lạm dụng đơn giản: giới hạn số lượt mỗi IP trong bộ nhớ của từng phiên bản hàm
const hits = new Map<string, { n: number; t: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 3600_000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > 40;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') || '';
  if (origin && !/^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/.test(origin)) return json({ error: 'forbidden' }, 403);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return json({ error: 'Bạn hỏi nhiều quá trong 1 giờ, nghỉ chút rồi hỏi tiếp nhé.' }, 429);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'Chưa cài khóa AI (ANTHROPIC_API_KEY) trên Vercel.' }, 503);

  let body: { sentence?: string; topic?: string; question?: string; history?: Turn[] };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const sentence = String(body.sentence || '').slice(0, MAX.sentence).trim();
  const topic = String(body.topic || '').slice(0, MAX.topic).trim();
  const question = String(body.question || '').slice(0, MAX.question).trim();
  if (!sentence) return json({ error: 'thiếu câu' }, 400);

  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-MAX.history)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX.histChars) }));
  const first = `Câu tiếng Anh: "${sentence}"${topic ? `\nĐiểm ngữ pháp mình muốn hiểu: ${topic}` : ''}\n${question || 'Mình chưa hiểu, giải thích dễ hiểu hơn giúp mình.'}`;
  const messages: Turn[] = history.length ? [...history, { role: 'user', content: question || 'Giải thích thêm giúp mình.' }] : [{ role: 'user', content: first }];
  if (messages[0].role !== 'user') messages.unshift({ role: 'user', content: first });

  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    });
    if (res.stop_reason === 'refusal') return json({ error: 'AI không trả lời được câu này. Thử hỏi cách khác nhé.' }, 200);
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    return json({ text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'AI đang bận, thử lại sau ít phút.' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Lỗi AI (${e.status ?? 'mạng'}).` }, 502);
    return json({ error: 'Lỗi không xác định.' }, 500);
  }
}
