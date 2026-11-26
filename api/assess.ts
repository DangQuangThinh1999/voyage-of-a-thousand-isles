// Vercel Function: POST /api/assess — chấm một bài NÓI dài theo chủ đề (Gemini): điểm 4 tiêu chí IELTS,
// từng câu sai (câu gốc → câu sửa → loại lỗi → giải thích), từ vựng đã dùng / nên dùng, bài đã sửa, bài mẫu nâng cấp.
import { gemini, guard, json } from './_gemini.js';

const SYSTEM = `Bạn là giám khảo IELTS Speaking và giáo viên tiếng Anh cho người Việt. Chấm bài NÓI dài của người học (chữ do máy nhận giọng nói, có thể thiếu dấu câu và đôi chỗ nghe nhầm; đừng trừ điểm dấu câu/viết hoa, và nếu một từ rõ ràng do máy nghe nhầm thì ghi chú "có thể do máy nghe nhầm").
Chấm đúng theo mô tả band IELTS, công bằng, so với trình độ mục tiêu.
- bands: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy (thang 0–9, bước 0.5) + comment_vi cụ thể, có trích ví dụ từ bài. Pronunciation không chấm được từ chữ, bỏ qua.
- overall: trung bình 3 tiêu chí (bước 0.5).
- errors: liệt kê TẤT CẢ lỗi, từng câu: original (nguyên văn câu có lỗi), corrected (câu đã sửa), type (một trong: tense, agreement, article, preposition, word order, word choice, word form, plural, missing word, extra word, collocation, other), type_vi (tên loại lỗi tiếng Việt), explain_vi (giải thích dễ hiểu vì sao sai và quy tắc đúng).
- used_vocab: các từ trong danh sách gợi ý mà người học đã dùng đúng. missed_vocab: từ gợi ý chưa dùng.
- upgrade_vocab: 5 từ/cụm nâng cao thay cho từ đơn giản người học đã dùng (w, ipa Anh /.../, vi, replaces, example).
- corrected: toàn bộ bài đã sửa lỗi nhưng giữ ý và văn phong người học.
- model: bài mẫu nâng cấp lên khoảng 1 band cao hơn, giữ ý chính của người học.
- strengths_vi: 2–3 điểm mạnh. next_vi: 3 việc cụ thể cần luyện tiếp.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall: { type: 'NUMBER' },
    bands: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, band: { type: 'NUMBER' }, comment_vi: { type: 'STRING' } }, required: ['name', 'band', 'comment_vi'] } },
    errors: { type: 'ARRAY', items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, corrected: { type: 'STRING' }, type: { type: 'STRING' }, type_vi: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['original', 'corrected', 'type', 'type_vi', 'explain_vi'] } },
    used_vocab: { type: 'ARRAY', items: { type: 'STRING' } },
    missed_vocab: { type: 'ARRAY', items: { type: 'STRING' } },
    upgrade_vocab: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, ipa: { type: 'STRING' }, vi: { type: 'STRING' }, replaces: { type: 'STRING' }, example: { type: 'STRING' } }, required: ['w', 'ipa', 'vi', 'replaces', 'example'] } },
    corrected: { type: 'STRING' }, model: { type: 'STRING' },
    strengths_vi: { type: 'ARRAY', items: { type: 'STRING' } }, next_vi: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['overall', 'bands', 'errors', 'used_vocab', 'missed_vocab', 'upgrade_vocab', 'corrected', 'model', 'strengths_vi', 'next_vi'],
};

export async function POST(req: Request): Promise<Response> {
  const bad = guard(req, 40); if (bad) return bad;
  let b: { task?: string; text?: string; cefr?: string; vocab?: string[]; seconds?: number };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const text = String(b.text || '').slice(0, 6000);
  if (text.trim().split(/\s+/).length < 5) return json({ error: 'too_short' }, 400);
  const user = `Trình độ mục tiêu: ${String(b.cefr || 'A2').slice(0, 4)}.
Đề: ${String(b.task || '').slice(0, 600)}
Từ vựng gợi ý: ${(Array.isArray(b.vocab) ? b.vocab : []).slice(0, 12).join(', ')}
Thời gian nói: ${Math.round(Number(b.seconds) || 0)} giây.
Bài nói (máy nghe được): "${text}"`;
  return gemini(SYSTEM, user, SCHEMA, 0.2);
}
