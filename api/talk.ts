// Vercel Function: POST /api/talk — giám khảo IELTS (Gemini) đáp lại câu trả lời nói của người học:
// lời đáp tự nhiên + câu hỏi tiếp, nhận xét tiếng Việt, câu trả lời tốt hơn dựa trên ý của người học, phát hiện đọc lại câu hỏi.
import { gemini, guard, json } from './_gemini.js';

const SYSTEM = `Bạn là giám khảo IELTS Speaking thân thiện, đang luyện nói với người Việt (trình độ được cho).
Đầu vào: câu hỏi, chữ máy nghe được từ câu trả lời của người học (có thể thiếu dấu câu, sai chính tả do nhận giọng nói).
Trả về:
- echo: true nếu người học chỉ đọc lại câu hỏi thay vì trả lời.
- reply: lời giám khảo nói lại bằng tiếng Anh, tự nhiên, ngắn (1–2 câu, đúng trình độ): phản hồi ý của người học rồi hỏi thêm 1 câu liên quan (như thi thật). Nếu echo: nhắc nhẹ và hỏi lại.
- feedback_vi: nhận xét tiếng Việt 2–3 câu: điểm tốt, lỗi chính (ngữ pháp, từ, độ dài), cách cải thiện cụ thể.
- better: câu trả lời tốt hơn dựa trên CHÍNH Ý của người học (không bịa ý khác), đúng trình độ, 2–3 câu tự nhiên. Nếu echo: một câu trả lời mẫu đơn giản.
- better_vi: dịch better.
- errors: lỗi trong câu trả lời (sai, đúng, lý do tiếng Việt). Bỏ qua lỗi dấu câu/viết hoa vì là văn nói.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    echo: { type: 'BOOLEAN' }, reply: { type: 'STRING' }, feedback_vi: { type: 'STRING' },
    better: { type: 'STRING' }, better_vi: { type: 'STRING' },
    errors: { type: 'ARRAY', items: { type: 'OBJECT', properties: { wrong: { type: 'STRING' }, right: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['wrong', 'right', 'why'] } },
  },
  required: ['echo', 'reply', 'feedback_vi', 'better', 'better_vi', 'errors'],
};

export async function POST(req: Request): Promise<Response> {
  const bad = guard(req); if (bad) return bad;
  let b: { question?: string; answer?: string; cefr?: string; part?: string };
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const q = String(b.question || '').slice(0, 400), a = String(b.answer || '').slice(0, 2000);
  if (!q || !a.trim()) return json({ error: 'empty' }, 400);
  const user = `Trình độ: ${String(b.cefr || 'A2').slice(0, 4)}. IELTS Speaking Part ${String(b.part || '1').slice(0, 1)}.\nCâu hỏi: "${q}"\nNgười học trả lời (máy nghe được): "${a}"`;
  return gemini(SYSTEM, user, SCHEMA, 0.5);
}
