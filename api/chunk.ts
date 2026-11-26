// Vercel Function: POST /api/chunk — HỌC THEO CỤM (Gemini, gói miễn phí).
// part "gen": đặt câu (~10 từ) hoặc đoạn ngắn (tối đa 20 từ) dùng các từ người học đang học, kèm bản dịch.
// part "grade": chấm bản dịch cả câu/đoạn của người học, sửa trọn vẹn, chỉ ra từng lỗi có giải thích.
import { gemini, guard, json } from './_gemini.js';

const GEN_SYS = `Bạn là giáo viên tiếng Anh cho người Việt, soạn bài HỌC TỪ VỰNG THEO CỤM: mỗi bài là một câu hoặc đoạn rất ngắn tự nhiên, đời thường, dùng các từ mục tiêu trong ngữ cảnh thật.
- Tiếng Anh tự nhiên như người bản xứ, đúng ngữ pháp 100%, đúng trình độ CEFR. Tiếng Việt tự nhiên, đủ dấu, dịch sát nghĩa.
- Đếm số từ tiếng Anh cẩn thận: KHÔNG vượt quá giới hạn số từ.
- Ngữ cảnh đa dạng: gia đình, công việc, trường học, du lịch, mua sắm, sức khoẻ, công nghệ, môi trường, nhiều quốc gia.`;
const GEN_SCHEMA = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  en: { type: 'STRING' }, vi: { type: 'STRING' },
  words: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, ipa: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['w', 'ipa', 'vi'] } },
}, required: ['en', 'vi', 'words'] } } }, required: ['items'] };

const GRADE_SYS = `Bạn là giáo viên tiếng Anh cho người Việt, chấm bài DỊCH cả câu/đoạn của người học.
- So bản dịch với câu gốc. Chấp nhận mọi cách dịch đúng nghĩa và đúng ngữ pháp, KHÔNG bắt buộc giống bản tham khảo. Không bao giờ đánh dấu sai một câu đúng.
- score 0–100: nghĩa (50%), ngữ pháp (30%), dùng đúng từ mục tiêu/từ tự nhiên (20%).
- verdict: "correct" (đúng, có thể khác bản tham khảo), "minor" (đúng ý nhưng có lỗi nhỏ/chưa tự nhiên), "wrong" (sai nghĩa hoặc sai ngữ pháp nghiêm trọng).
- corrected: VIẾT LẠI TRỌN VẸN bản dịch của người học đã sửa hết lỗi (giữ cách diễn đạt của họ khi có thể). natural: cách nói tự nhiên nhất của người bản xứ.
- errors: từng lỗi có thật: original (đoạn sai nguyên văn), corrected, type_vi (sai nghĩa, thiếu ý, thì, chia động từ, mạo từ, giới từ, trật tự từ, dùng từ, từ loại, số nhiều, chính tả…), explain_vi (quy tắc + vì sao, dễ hiểu, có ví dụ).
- used: các từ mục tiêu người học đã dùng đúng; missed: từ mục tiêu chưa dùng hoặc dùng sai.
- comment_vi: nhận xét ngắn, động viên, nói rõ cần chú ý gì.`;
const GRADE_SCHEMA = { type: 'OBJECT', properties: {
  score: { type: 'INTEGER' }, verdict: { type: 'STRING', enum: ['correct', 'minor', 'wrong'] },
  corrected: { type: 'STRING' }, natural: { type: 'STRING' },
  errors: { type: 'ARRAY', items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, corrected: { type: 'STRING' }, type_vi: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['original', 'corrected', 'type_vi', 'explain_vi'] } },
  used: { type: 'ARRAY', items: { type: 'STRING' } }, missed: { type: 'ARRAY', items: { type: 'STRING' } }, comment_vi: { type: 'STRING' },
}, required: ['score', 'verdict', 'corrected', 'natural', 'errors', 'used', 'missed', 'comment_vi'] };

const s = (x: unknown, n: number) => String(x ?? '').slice(0, n);

export async function POST(req: Request): Promise<Response> {
  const bad = guard(req, 120); if (bad) return bad;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const cefr = s(b.cefr || 'A2', 4);
  const words = (Array.isArray(b.words) ? b.words : []).slice(0, 40).map((x: unknown) => s(x, 40));
  if (b.part === 'gen') {
    const len = Math.min(20, Math.max(6, Number(b.len) || 10)), n = Math.min(6, Math.max(1, Number(b.n) || 5));
    const kind = len >= 16 ? 'một ĐOẠN rất ngắn gồm 2 câu liên kết' : 'một CÂU hoàn chỉnh';
    const user = `Trình độ: CEFR ${cefr}.
Từ mục tiêu người học đang học: ${words.join(', ') || '(tự chọn từ thông dụng)'}.
Soạn ${n} bài, mỗi bài là ${kind}, dài ${Math.max(6, len - 4)}–${len} từ tiếng Anh (tuyệt đối không quá ${len} từ).
Mỗi bài dùng ${len >= 16 ? '3–5' : '2–3'} từ mục tiêu khác nhau (chia đều để dùng hết các từ), giữ nguyên dạng hoặc chia đúng ngữ pháp.
words: liệt kê các từ mục tiêu đã dùng trong bài (w đúng dạng gốc), ipa giọng Anh dạng /.../, vi nghĩa trong ngữ cảnh.
Mã ngẫu nhiên: ${Math.random().toString(36).slice(2, 8)}.`;
    return gemini(GEN_SYS, user, GEN_SCHEMA, 0.9, true);
  }
  if (b.part === 'grade') {
    const dir = b.dir === 'en-vi' ? 'Anh → Việt' : 'Việt → Anh';
    const user = `Hướng dịch: ${dir}. Trình độ người học: CEFR ${cefr}.
Câu/đoạn gốc: """${s(b.source, 600)}"""
Bản dịch tham khảo: """${s(b.reference, 600)}"""
Từ mục tiêu: ${words.join(', ')}
BẢN DỊCH CỦA NGƯỜI HỌC: """${s(b.answer, 800)}"""`;
    return gemini(GRADE_SYS, user, GRADE_SCHEMA, 0.2, true);
  }
  if (b.part === 'meaning') {
    // Kiểm tra nhanh nghĩa: người học gõ nghĩa tiếng Việt của từ tiếng Anh — đúng nghĩa (kể cả từ đồng nghĩa, diễn đạt khác) là biết
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 100).map((x: { w?: string; vi?: string; a?: string }) => ({ w: s(x.w, 40), vi: s(x.vi, 160), a: s(x.a, 120) }));
    const user = `Với mỗi từ, xem người học có HIỂU ĐÚNG NGHĨA không. "vi" là các nghĩa trong từ điển, "a" là câu trả lời của người học.
- ok = true nếu câu trả lời đúng với BẤT KỲ nghĩa phổ biến nào của từ (chấp nhận từ đồng nghĩa, diễn đạt khác, viết thiếu dấu tiếng Việt, sai chính tả nhẹ, nghĩa rộng/hẹp hơn một chút nhưng đúng bản chất).
- ok = false nếu sai nghĩa, nghĩa ngược, nhầm với từ khác, hoặc quá chung chung không chứng tỏ biết từ.
- note_vi: rất ngắn (≤ 15 từ): nếu sai thì nói nghĩa đúng / nhầm với từ nào; nếu đúng có thể để "".
Trả results đúng thứ tự, đủ ${items.length} mục.
${JSON.stringify(items)}`;
    return gemini('Bạn là giáo viên tiếng Anh cho người Việt, chấm nghĩa từ vựng công bằng, không khắt khe về câu chữ.', user,
      { type: 'OBJECT', properties: { results: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, ok: { type: 'BOOLEAN' }, note_vi: { type: 'STRING' } }, required: ['w', 'ok', 'note_vi'] } } }, required: ['results'] },
      0.1, true);
  }
  return json({ error: 'bad_part' }, 400);
}
