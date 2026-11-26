// Vercel Function: POST /api/check — chấm một câu tiếng Anh bằng Gemini (gói miễn phí của Google AI Studio).
// Cần biến môi trường GEMINI_API_KEY trên Vercel. Có thể đổi model bằng GEMINI_MODEL (mặc định gemini-flash-latest).
// Trả về JSON: status (correct | unnatural | context | incorrect), câu sửa, cách nói tự nhiên hơn, giải thích tiếng Việt.

const SYSTEM = `Bạn là giáo viên tiếng Anh giỏi, chấm câu cho người Việt trình độ A1–B1 đang luyện IELTS.
Nhiệm vụ: đánh giá MỘT câu tiếng Anh người học tự viết.
Quy tắc bắt buộc:
- Không đánh dấu câu đúng ngữ pháp thành sai chỉ vì có cách diễn đạt tự nhiên hơn. Khi đó dùng status "unnatural".
- Phân biệt lỗi ngữ pháp/chính tả/dùng từ (status "incorrect") với lỗi diễn đạt chưa tự nhiên ("unnatural").
- Nếu câu đúng hay không phụ thuộc ngữ cảnh (ví dụ a/the, thì), dùng "context" và giải thích từng ngữ cảnh.
- Nếu câu đúng và tự nhiên: status "correct", correction để chuỗi rỗng, KHÔNG tự sửa câu.
- Nếu có từ mục tiêu, kiểm tra người học dùng từ đó đúng nghĩa và đúng ngữ pháp chưa.
- Giải thích bằng tiếng Việt đơn giản, ngắn gọn (tối đa 3 câu), có so sánh với tiếng Việt nếu giúp dễ hiểu.
- "better": 1–2 câu tiếng Anh tự nhiên hơn hoặc cách nói khác cùng ý (có thể rỗng nếu câu đã tốt).
- "errors": mỗi lỗi gồm phần sai, phần đúng, lý do tiếng Việt ngắn. Rỗng nếu không có lỗi.
- "meaning": dịch câu (đã sửa nếu có) sang tiếng Việt tự nhiên.
- "tip": một mẹo nhớ ngắn tiếng Việt để lần sau không sai.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['correct', 'unnatural', 'context', 'incorrect'] },
    correction: { type: 'STRING' },
    better: { type: 'ARRAY', items: { type: 'STRING' } },
    explanation: { type: 'STRING' },
    errors: { type: 'ARRAY', items: { type: 'OBJECT', properties: { wrong: { type: 'STRING' }, right: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['wrong', 'right', 'why'] } },
    meaning: { type: 'STRING' },
    tip: { type: 'STRING' },
    usesWordCorrectly: { type: 'BOOLEAN' },
  },
  required: ['status', 'correction', 'better', 'explanation', 'errors', 'meaning', 'tip', 'usesWordCorrectly'],
};

const hits = new Map<string, { n: number; t: number }>();
const limited = (ip: string) => {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 3600_000) { hits.set(ip, { n: 1, t: now }); return false; }
  return ++h.n > 120;
};
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') || '';
  if (origin && !/^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/.test(origin)) return json({ error: 'forbidden' }, 403);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);
  let body: { sentence?: string; word?: string; meaning?: string; context?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sentence = String(body.sentence || '').trim().slice(0, 500);
  if (!sentence) return json({ error: 'empty' }, 400);
  const word = String(body.word || '').slice(0, 40), meaning = String(body.meaning || '').slice(0, 120), context = String(body.context || '').slice(0, 300);
  const user = `Câu của người học: "${sentence}"${word ? `\nTừ mục tiêu cần dùng: "${word}"${meaning ? ` (nghĩa: ${meaning})` : ''}` : ''}${context ? `\nNgữ cảnh / đề bài: ${context}` : ''}`;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    });
    if (r.status === 429) return json({ error: 'quota' }, 429);
    if (!r.ok) return json({ error: `gemini_${r.status}` }, 502);
    const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return json(JSON.parse(text));
  } catch {
    return json({ error: 'failed' }, 502);
  }
}
