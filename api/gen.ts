// Vercel Function: POST /api/gen — tạo bài luyện MỚI mỗi lần (Gemini, gói miễn phí) theo kỹ năng, cấp độ, chủ đề IELTS.
// kind: reading | listening | speaking | writing. Đáp án phải có căn cứ trong bài; giải thích bằng tiếng Việt.
import { gemini, guard, json } from './_gemini.js';

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

export async function POST(req: Request): Promise<Response> {
  const bad = guard(req, 60); if (bad) return bad;
  let b: { kind?: string; cefr?: string; band?: string; topic?: string; avoid?: string[] };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const spec = SPEC[String(b.kind)];
  if (!spec) return json({ error: 'bad_kind' }, 400);
  const cefr = String(b.cefr || 'A2').slice(0, 4), band = String(b.band || '').slice(0, 8), topic = String(b.topic || 'daily life').slice(0, 60);
  const avoid = (Array.isArray(b.avoid) ? b.avoid : []).slice(0, 10).map((x) => String(x).slice(0, 80));
  const user = `Trình độ: ${cefr}${band ? ` (IELTS ${band})` : ''}. Chủ đề: ${topic}.${avoid.length ? `\nTránh lặp lại các bài đã làm có tiêu đề/ý: ${avoid.join('; ')}` : ''}\n${spec.rule}`;
  return gemini(BASE, user, spec.schema, 0.9);
}
