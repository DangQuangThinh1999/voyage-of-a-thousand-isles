// Vercel Function: POST /api/gen — tạo bài luyện MỚI mỗi lần (Gemini, gói miễn phí) theo kỹ năng, cấp độ, chủ đề IELTS.
// kind: reading | listening | speaking | writing. Đáp án phải có căn cứ trong bài; giải thích bằng tiếng Việt.
import { gemini, guard, json } from './_gemini.js';
import { db, quotaOn } from './_quota.js';

const BASE = `Bạn là người ra đề IELTS giàu kinh nghiệm, soạn bài cho người Việt luyện thi.
- Viết đúng trình độ CEFR được yêu cầu (từ vựng, độ dài câu, ngữ pháp). A1–A2 dùng câu ngắn, từ thông dụng; B2–C2 dùng văn phong học thuật như đề thật.
- Nội dung thực tế, hiện đại, đúng sự thật, không bịa số liệu gây hiểu lầm; tên người và địa điểm có thể hư cấu.
- Tiếng Việt (vi) tự nhiên, đủ dấu. Mọi đáp án phải suy ra được từ chính bài, không cần kiến thức ngoài.
- Mỗi lần tạo bài khác hẳn: góc nhìn, nhân vật, chi tiết mới.`;

const QUESTION = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['mcq', 'tfng', 'gap'] },
    q: { type: 'STRING' }, q_vi: { type: 'STRING' },
    options: { type: 'ARRAY', items: { type: 'STRING' } },
    answer: { type: 'INTEGER' },
    evidence: { type: 'STRING' }, why_vi: { type: 'STRING' },
  },
  required: ['type', 'q', 'q_vi', 'options', 'answer', 'evidence', 'why_vi'],
};
const SENT = { type: 'ARRAY', items: { type: 'OBJECT', properties: { en: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['en', 'vi'] } };
const VOCAB = { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, ipa: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['w', 'ipa', 'vi'] } };

const SPEC: Record<string, { rule: string; schema: unknown }> = {
  reading: {
    rule: `Soạn bài ĐỌC HIỂU kiểu IELTS: đoạn văn (mảng câu, mỗi câu kèm dịch) dài theo trình độ (A1: 6–8 câu ngắn; B1: 10–14 câu; C1–C2: 14–20 câu).
5–7 câu hỏi trộn các dạng: "mcq" (4 lựa chọn), "tfng" (options đúng là ["True","False","Not Given"]), "gap" (câu có ____, 4 lựa chọn từ).
answer là chỉ số (0-based) trong options. evidence là câu nguyên văn trong bài chứa căn cứ (với Not Given: câu gần nhất liên quan). why_vi giải thích ngắn vì sao.
vocab: 6–8 từ/cụm từ đáng học trong bài, có phiên âm Anh (British) dạng /.../.`,
    schema: { type: 'OBJECT', properties: { title: { type: 'STRING' }, passage: SENT, questions: { type: 'ARRAY', items: QUESTION }, vocab: VOCAB }, required: ['title', 'passage', 'questions', 'vocab'] },
  },
  listening: {
    rule: `Soạn bài NGHE kiểu IELTS (hội thoại hoặc độc thoại tự nhiên, có thể có 2 người nói, ghi tên người nói ở đầu câu như "Anna: ...").
script: mảng câu nói kèm dịch (A1: 6–8 câu; B1: 10–12; C1–C2: 12–16). gaps: 3–4 câu lấy từ script với một từ/cụm quan trọng thay bằng ____, kèm đáp án đúng (nhiều cách viết ngăn bằng |) và dịch.
questions: 4–5 câu "mcq" hoặc "tfng" giống phần đọc, evidence là câu trong script.
vocab: 5–7 từ đáng học có phiên âm.`,
    schema: { type: 'OBJECT', properties: { title: { type: 'STRING' }, script: SENT,
      gaps: { type: 'ARRAY', items: { type: 'OBJECT', properties: { sentence: { type: 'STRING' }, answer: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['sentence', 'answer', 'vi'] } },
      questions: { type: 'ARRAY', items: QUESTION }, vocab: VOCAB }, required: ['title', 'script', 'gaps', 'questions', 'vocab'] },
  },
  speaking: {
    rule: `Soạn bộ câu hỏi SPEAKING kiểu IELTS về chủ đề đã cho: part1 (4 câu ngắn về bản thân), part2 (cue card "Describe..." + 4 gợi ý "You should say"), part3 (4 câu thảo luận sâu hơn).
Mỗi câu có dịch. sample: một câu trả lời mẫu cho part1 câu đầu, đúng trình độ, 2–3 câu. useful: 6 cụm từ hữu ích kèm nghĩa.`,
    schema: { type: 'OBJECT', properties: {
      part1: SENT, part2: { type: 'OBJECT', properties: { cue: { type: 'STRING' }, vi: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['cue', 'vi', 'points'] },
      part3: SENT, sample: { type: 'STRING' }, useful: SENT }, required: ['part1', 'part2', 'part3', 'sample', 'useful'] },
  },
  writing: {
    rule: `Soạn một ĐỀ VIẾT. A1–A2: viết đoạn ngắn đời thường (60–100 từ). B1 trở lên: IELTS Writing Task 2 (250 từ) hoặc Task 1 dạng thư/mô tả (150 từ).
Có prompt (tiếng Anh), vi (dịch), minWords, ideas (4 ý tưởng gợi ý bằng tiếng Việt), useful (6 cụm từ/cấu trúc hữu ích tiếng Anh), outline (dàn ý 4 bước tiếng Việt).`,
    schema: { type: 'OBJECT', properties: { prompt: { type: 'STRING' }, vi: { type: 'STRING' }, minWords: { type: 'INTEGER' }, ideas: { type: 'ARRAY', items: { type: 'STRING' } },
      useful: { type: 'ARRAY', items: { type: 'STRING' } }, outline: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['prompt', 'vi', 'minWords', 'ideas', 'useful', 'outline'] },
  },
};

SPEC.sample = {
  rule: `Viết BÀI MẪU cho đề viết được cung cấp, đúng trình độ đã cho (A1–A2: câu ngắn, từ đơn giản; B1+: đúng chuẩn IELTS, đủ số từ yêu cầu).
sample: bài mẫu tiếng Anh (chia đoạn bằng dòng trống). vi: bản dịch tiếng Việt.
notes: 4–6 ghi chú tiếng Việt vì sao bài tốt (cấu trúc đoạn, từ nối, câu phức, từ vựng hay), mỗi ghi chú trích ví dụ từ bài.
vocab: 5–8 từ/cụm hay trong bài có phiên âm Anh /.../ và nghĩa.`,
  schema: { type: 'OBJECT', properties: { sample: { type: 'STRING' }, vi: { type: 'STRING' }, notes: { type: 'ARRAY', items: { type: 'STRING' } }, vocab: VOCAB }, required: ['sample', 'vi', 'notes', 'vocab'] },
};

export async function POST(req: Request): Promise<Response> {
  const bad = await guard(req, 60); if (bad) return bad;
  let b: { kind?: string; cefr?: string; band?: string; topic?: string; avoid?: string[] };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const spec = SPEC[String(b.kind)];
  if (!spec) return json({ error: 'bad_kind' }, 400);
  const cefr = String(b.cefr || 'A2').slice(0, 4), band = String(b.band || '').slice(0, 8), topic = String(b.topic || 'daily life').slice(0, b.kind === 'sample' ? 600 : 60);
  const avoid = (Array.isArray(b.avoid) ? b.avoid : []).slice(0, 10).map((x) => String(x).slice(0, 80));
  const user = `Trình độ: ${cefr}${band ? ` (IELTS ${band})` : ''}. ${b.kind === 'sample' ? 'Đề viết' : 'Chủ đề'}: ${topic}.${avoid.length ? `\nTránh lặp lại các bài đã làm có tiêu đề/ý: ${avoid.join('; ')}` : ''}\n${spec.rule}`;
  return gemini(BASE, user, spec.schema, b.kind === 'sample' ? 0.5 : 0.9);
}

// ---------- BÀI CỦA GIỜ NÀY: mỗi giờ, mỗi loại bài + trình độ có 1 bài mới, soạn 1 lần dùng chung cho mọi người ----------
// GET /api/gen?hourly=1&kind=reading&cefr=B1 → bài của giờ hiện tại (giờ Việt Nam). Chưa có thì soạn (không trừ lượt người học).
const ANGLES = ['a job interview at a tech company in Singapore', 'climate policy in a Nordic country', 'street food culture in Bangkok', 'a study on sleep and memory', 'remote work in Canada', 'overtourism in Venice', 'rice farming in the Mekong Delta', 'public transport in Tokyo',
  'a university lecture on marine biology', 'mental health at work in the UK', 'renewable energy in Germany', 'a customer complaint at a hotel in Sydney', 'volunteering in South Africa', 'e-sports in South Korea', 'housing costs for young people in Ireland', 'learning a second language as an adult',
  'food waste in supermarkets', 'the four-day work week', 'smart cities and privacy', 'a museum tour in Paris', 'healthy eating habits in Japan', 'coral reef restoration in Australia', 'a podcast about saving money', 'cycling in Amsterdam', 'a family tradition at Lunar New Year',
  'studying abroad in New Zealand', 'fake news and media literacy', 'a team meeting at a startup in India', 'coffee production in Brazil and Vietnam', 'ageing populations', 'space tourism', 'a radio interview with a young entrepreneur in Kenya', 'online shopping habits', 'a weekend trip in the Scottish Highlands'];
const GENRE: Record<string, string[]> = {
  reading: ['news article', 'research summary', 'magazine feature', 'blog post', 'opinion column', 'company report', 'IELTS-style academic passage'],
  listening: ['conversation between two friends', 'university lecture', 'radio interview', 'podcast segment', 'customer service phone call', 'team meeting', 'tour guide talk'],
  speaking: ['IELTS speaking test'], writing: ['IELTS writing task'],
};
const BANDS: Record<string, string> = { A1: '2.0–3.0', A2: '3.5–4.0', B1: '4.5–5.5', B2: '6.0–6.5', C1: '7.0–8.0', C2: '8.5–9.0' };
const vnHour = () => { const d = new Date(Date.now() + 7 * 3600_000); return d.toISOString().slice(0, 13).replace('T', '-'); };
const making = new Map<string, Promise<unknown>>();

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url), kind = String(u.searchParams.get('kind')), cefr = String(u.searchParams.get('cefr') || 'B1').slice(0, 2);
  if (!u.searchParams.has('hourly') || !SPEC[kind] || kind === 'sample' || !BANDS[cefr]) return json({ error: 'bad_request' }, 400);
  if (!quotaOn()) return json({ error: 'not_configured' }, 503);
  const slot = vnHour(), id = `${kind}_${cefr}_${slot}`, ref = db().collection('hourly').doc(id);
  const have = await ref.get();
  if (have.exists) return json({ slot, ...(JSON.parse(have.get('data')) as object) });
  // chưa có: soạn (cần đăng nhập, không trừ lượt), mỗi máy chủ chỉ soạn 1 lần cho cùng một giờ
  const bad = await guard(req, 120, 0); if (bad) return bad;
  if (!making.has(id)) making.set(id, (async () => {
    const h = parseInt(slot.slice(-2), 10) + parseInt(slot.slice(8, 10), 10) * 24;
    const angle = ANGLES[(h * 7 + kind.length * 3 + cefr.charCodeAt(1)) % ANGLES.length], genres = GENRE[kind], genre = genres[h % genres.length];
    const spec = SPEC[kind];
    const user = `Trình độ: ${cefr} (IELTS ${BANDS[cefr]}). Chủ đề: ${angle} (genre: ${genre}).\nTình huống phải chân thật, sát đời sống/đề thi thật, áp dụng được ngay.\n${spec.rule}`;
    const r = await gemini(BASE, user, spec.schema, 0.8);
    const d = await r.json() as Record<string, unknown>;
    if (!r.ok || d.error) throw new Error(String(d.error || r.status));
    const data = { ...d, _topic: angle, _genre: genre };
    await ref.set({ kind, cefr, slot, data: JSON.stringify(data), created: Date.now() });
    // dọn bài cũ hơn 2 ngày để database gọn
    try { const old = await db().collection('hourly').where('created', '<', Date.now() - 48 * 3600_000).limit(30).get(); await Promise.all(old.docs.map((x) => x.ref.delete())); } catch { /* bỏ qua */ }
    return data;
  })().finally(() => setTimeout(() => making.delete(id), 60_000)));
  try { const data = await making.get(id); return json({ slot, ...(data as object) }); }
  catch (e) { return json({ error: (e as Error).message === 'quota' ? 'quota' : 'busy' }, 503); }
}
