// Vercel Function: POST /api/check — chấm một câu tiếng Anh bằng Gemini (gói miễn phí của Google AI Studio).
// Cần biến môi trường GEMINI_API_KEY trên Vercel. Có thể đổi model bằng GEMINI_MODEL (mặc định gemini-3.8-flash, có dự phòng).
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

import { gemini, guard, json } from './_gemini.js';

export async function POST(req: Request): Promise<Response> {
  const bad = guard(req); if (bad) return bad;
  let body: { sentence?: string; word?: string; meaning?: string; context?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const sentence = String(body.sentence || '').trim().slice(0, 500);
  if (!sentence) return json({ error: 'empty' }, 400);
  const word = String(body.word || '').slice(0, 40), meaning = String(body.meaning || '').slice(0, 120), context = String(body.context || '').slice(0, 300);
  const user = `Câu của người học: "${sentence}"${word ? `\nTừ mục tiêu cần dùng: "${word}"${meaning ? ` (nghĩa: ${meaning})` : ''}` : ''}${context ? `\nNgữ cảnh / đề bài: ${context}` : ''}`;
  return gemini(SYSTEM, user, SCHEMA);
}
