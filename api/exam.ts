// Vercel Function: POST /api/exam — soạn ĐỀ KIỂM TRA mới mỗi lần (Gemini, gói miễn phí) và CHẤM bài một lần khi nộp.
// part: lr (Nghe + Đọc) | vg (Từ vựng + Ngữ pháp) | ws (đề Viết + Nói, kèm bài mẫu) | grade (chấm Viết + Nói, sửa trọn bài)
// Đề soạn theo đúng vốn từ người học đã học, trình độ hiện tại và mức IELTS cần đạt; mọi câu có đáp án + căn cứ + giải thích.
import { gemini, guard, json } from './_gemini.js';

const BASE = `Bạn là người ra đề IELTS chuyên nghiệp (từng ra đề cho Cambridge/British Council/IDP), soạn ĐỀ KIỂM TRA cho người Việt.
Nguyên tắc bắt buộc:
- Đúng trình độ CEFR và mức IELTS được yêu cầu, hơi khó hơn trình độ hiện tại một chút để thử thách (nhưng vẫn làm được nếu đã học kỹ).
- Ưu tiên dùng các TỪ ĐÃ HỌC được cung cấp; từ ngoài danh sách phải thông dụng hơn hoặc ngang trình độ.
- Ngữ cảnh thật, chính xác: tình huống đời sống/học thuật ở nhiều quốc gia (Anh, Úc, Canada, Mỹ, New Zealand, Ireland, Singapore, Ấn Độ, Nam Phi...). Sự thật phải đúng; tên người, công ty có thể hư cấu.
- Tiếng Anh tự nhiên như người bản xứ, đúng ngữ pháp 100%. Tiếng Việt tự nhiên, đủ dấu.
- Mỗi câu hỏi chỉ có MỘT đáp án đúng, suy ra được từ chính đề. Có evidence (trích nguyên văn câu chứa căn cứ) và why_vi (giải thích dễ hiểu: vì sao đáp án đúng, vì sao các lựa chọn khác sai).
- Mỗi lần soạn phải khác hẳn: chủ đề phụ, nhân vật, quốc gia, chi tiết mới.`;

/** Một câu hỏi: mcq (4 lựa chọn), tfng (True/False/Not Given), type (gõ đáp án) */
const Q = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING', enum: ['mcq', 'tfng', 'type'] },
    q: { type: 'STRING' }, q_vi: { type: 'STRING' },
    options: { type: 'ARRAY', items: { type: 'STRING' } },
    answer: { type: 'INTEGER' },
    answer_text: { type: 'STRING' },
    ipa: { type: 'STRING' },
    evidence: { type: 'STRING' }, why_vi: { type: 'STRING' },
  },
  required: ['type', 'q', 'q_vi', 'options', 'answer', 'answer_text', 'ipa', 'evidence', 'why_vi'],
};
const SENT = { type: 'ARRAY', items: { type: 'OBJECT', properties: { en: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['en', 'vi'] } };
const QRULE = `Quy ước câu hỏi: type "mcq" → options 4 lựa chọn, answer = chỉ số đúng (0-based), answer_text = "".
type "tfng" → options đúng là ["True","False","Not Given"], answer = chỉ số.
type "type" (gõ đáp án, tối đa 3 từ) → TUYỆT ĐỐI KHÔNG dùng tên người, tên riêng khó đánh vần (tên người, tên công ty, tên đường lạ) làm đáp án gõ; đáp án gõ phải là từ thông dụng, số, ngày giờ, giá tiền hoặc từ vựng đã học. Tên người chỉ được xuất hiện trong mcq. options = [], answer = -1, answer_text = đáp án (các cách viết đúng khác ngăn bằng |, ví dụ "small|little"), ipa = phiên âm Anh của đáp án chính dạng /.../.
Với mcq/tfng: ipa = "".`;

const SPEC: Record<string, { rule: string; schema: unknown }> = {
  lr: {
    rule: `Soạn 2 phần:
1) listening: bài NGHE kiểu IELTS (hội thoại 2 người hoặc độc thoại), accent ghi quốc gia giọng nói (vd "British", "Australian"). script: mảng câu, mỗi câu bắt đầu bằng tên người nói "Tên: ..." nếu là hội thoại, kèm dịch vi. Độ dài: A1 8–10 câu; A2 10–12; B1 12–16; B2+ 16–22.
   questions: 6 câu trộn: 2–3 "type" (điền từ nghe được: số, giờ, giá tiền, ngày tháng, từ khoá thông dụng — KHÔNG phải tên người; q có ____), còn lại "mcq"/"tfng". evidence là câu trong script.
2) reading: bài ĐỌC kiểu IELTS (bài báo, quảng cáo, email, bài khoa học phổ thông tuỳ trình độ), source mô tả nguồn/kiểu bài và quốc gia. passage: mảng câu kèm dịch. Độ dài: A1 7–9 câu; A2 9–12; B1 12–16; B2+ 16–24.
   questions: 7 câu trộn "mcq", "tfng" (có ít nhất 1 Not Given) và 1–2 "type" (điền từ trong bài, q có ____). evidence là câu nguyên văn trong bài.
${QRULE}`,
    schema: { type: 'OBJECT', properties: {
      listening: { type: 'OBJECT', properties: { title: { type: 'STRING' }, accent: { type: 'STRING' }, script: SENT, questions: { type: 'ARRAY', items: Q } }, required: ['title', 'accent', 'script', 'questions'] },
      reading: { type: 'OBJECT', properties: { title: { type: 'STRING' }, source: { type: 'STRING' }, passage: SENT, questions: { type: 'ARRAY', items: Q } }, required: ['title', 'source', 'passage', 'questions'] },
    }, required: ['listening', 'reading'] },
  },
  vg: {
    rule: `Soạn phần TỪ VỰNG & NGỮ PHÁP: 12 câu, dùng chủ yếu các từ đã học, trộn các dạng:
- 4 câu "type": cho nghĩa tiếng Việt + câu ngữ cảnh tiếng Anh có ____, gõ đúng từ (q ví dụ: "My ____ is a doctor. (mẹ)"). Đáp án là từ trong danh sách đã học, có ipa.
- 3 câu "mcq" chọn từ đúng ngữ cảnh/collocation (các lựa chọn cùng từ loại, dễ nhầm).
- 3 câu "mcq" ngữ pháp trọng tâm của trình độ (thì, mạo từ, giới từ, so sánh, câu điều kiện... tuỳ trình độ).
- 2 câu "mcq" tìm câu ĐÚNG ngữ pháp trong 4 câu (3 câu kia có lỗi điển hình người Việt hay mắc).
why_vi phải nêu quy tắc + ví dụ đúng/sai. evidence: quy tắc hoặc dấu hiệu trong câu giúp chọn đáp án.
${QRULE}`,
    schema: { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: Q } }, required: ['questions'] },
  },
  ws: {
    rule: `Soạn phần VIẾT và NÓI, kèm bài mẫu (bài mẫu sẽ chỉ hiện sau khi nộp bài):
1) writing: đề viết đúng trình độ (A1–A2: đoạn/email ngắn đời thường 50–100 từ; B1: thư hoặc đoạn 120–150 từ; B2+: IELTS Task 2 250 từ). task (tiếng Anh), vi (dịch), minWords, ideas (4 gợi ý ý tưởng tiếng Việt, ngắn), model (bài mẫu đúng trình độ mục tiêu, đủ số từ, dùng nhiều từ đã học), model_vi (dịch bài mẫu).
2) speaking: part1 3 câu hỏi ngắn về bản thân; part2: cue "Describe ..." + 3–4 points "You should say"; part3 2 câu thảo luận (A1–A2: câu hỏi đơn giản hơn). Mỗi câu có vi. model: câu trả lời mẫu cho part2 đúng trình độ mục tiêu (A1–A2: 5–7 câu; B1+: 1–2 phút nói).`,
    schema: { type: 'OBJECT', properties: {
      writing: { type: 'OBJECT', properties: { task: { type: 'STRING' }, vi: { type: 'STRING' }, minWords: { type: 'INTEGER' }, ideas: { type: 'ARRAY', items: { type: 'STRING' } }, model: { type: 'STRING' }, model_vi: { type: 'STRING' } }, required: ['task', 'vi', 'minWords', 'ideas', 'model', 'model_vi'] },
      speaking: { type: 'OBJECT', properties: {
        part1: SENT,
        part2: { type: 'OBJECT', properties: { cue: { type: 'STRING' }, vi: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['cue', 'vi', 'points'] },
        part3: SENT, model: { type: 'STRING' } }, required: ['part1', 'part2', 'part3', 'model'] },
    }, required: ['writing', 'speaking'] },
  },
};

const BANDS = { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, band: { type: 'NUMBER' }, comment_vi: { type: 'STRING' } }, required: ['name', 'band', 'comment_vi'] } };
const ERRS = { type: 'ARRAY', items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, corrected: { type: 'STRING' }, type_vi: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['original', 'corrected', 'type_vi', 'explain_vi'] } };
const GRADE_SYS = `Bạn là giám khảo IELTS (Writing + Speaking) và giáo viên tiếng Anh cho người Việt. Chấm MỘT LẦN toàn bộ bài viết và bài nói của một bài kiểm tra.
- Chấm theo mô tả band IELTS chính thức, công bằng. Mỗi phần phải so với MỨC IELTS CẦN ĐẠT của bài (cho trong đề): trong comment_vi và summary_vi nói rõ đã đạt mức đó chưa, thiếu gì để đạt (ví dụ: “Mức 4.0 cần trả lời đủ ý bằng câu đơn đúng ngữ pháp; bạn mới trả lời 1–2 từ”). Câu nói là chữ do máy nhận giọng nói: không trừ điểm dấu câu/viết hoa; từ rõ ràng do máy nghe nhầm thì ghi chú, không tính lỗi.
- Không bao giờ đánh dấu sai một câu đúng. Chỉ nêu lỗi có thật; câu đúng nhưng chưa tự nhiên thì ghi type_vi "Chưa tự nhiên".
- errors: TẤT CẢ lỗi, mỗi lỗi: original (nguyên văn), corrected, type_vi (thì, chia động từ, mạo từ, giới từ, trật tự từ, dùng từ, từ loại, số nhiều, thiếu từ, thừa từ, kết hợp từ, chính tả...), explain_vi (bằng chứng: quy tắc + ví dụ đúng/sai, dễ hiểu).
- corrected: VIẾT LẠI TRỌN VẸN toàn bài đã sửa hết lỗi (giữ ý và giọng văn của người học) — không sửa rời từng câu.
- upgraded: bản nâng cấp cao hơn khoảng 1 band, giữ ý người học.
- Nếu người học bỏ trống phần nào: band 0, corrected = "", ghi rõ trong summary_vi.
- Tiếng Việt tự nhiên, đủ dấu.`;
const GRADE_SCHEMA = { type: 'OBJECT', properties: {
  writing: { type: 'OBJECT', properties: { band: { type: 'NUMBER' }, bands: BANDS, errors: ERRS, corrected: { type: 'STRING' }, upgraded: { type: 'STRING' }, strengths_vi: { type: 'ARRAY', items: { type: 'STRING' } }, next_vi: { type: 'ARRAY', items: { type: 'STRING' } } },
    required: ['band', 'bands', 'errors', 'corrected', 'upgraded', 'strengths_vi', 'next_vi'] },
  speaking: { type: 'OBJECT', properties: { band: { type: 'NUMBER' }, bands: BANDS, errors: ERRS,
    answers: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, corrected: { type: 'STRING' }, upgraded: { type: 'STRING' } }, required: ['q', 'corrected', 'upgraded'] } },
    strengths_vi: { type: 'ARRAY', items: { type: 'STRING' } }, next_vi: { type: 'ARRAY', items: { type: 'STRING' } } },
    required: ['band', 'bands', 'errors', 'answers', 'strengths_vi', 'next_vi'] },
  summary_vi: { type: 'STRING' },
}, required: ['writing', 'speaking', 'summary_vi'] };

const COUNTRIES = ['the UK', 'Australia', 'Canada', 'the USA', 'New Zealand', 'Ireland', 'Singapore', 'India', 'South Africa', 'Scotland', 'Japan (international school)', 'Germany (international company)'];
const s = (x: unknown, n: number) => String(x ?? '').slice(0, n);

export async function POST(req: Request): Promise<Response> {
  const bad = await guard(req, 60); if (bad) return bad;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const cefr = s(b.cefr || 'A2', 4), band = s(b.band || '4.0', 4), target = s(b.target || '', 4), now = s(b.now || '', 12);
  const level = `Trình độ cần kiểm tra: CEFR ${cefr}, IELTS ${band}${target ? ` (mục tiêu cuối: IELTS ${target})` : ''}${now ? `. Trình độ hiện tại của người học: ${now}` : ''}.`;

  if (b.part === 'grade') {
    const w = b.writing || {}, sp = Array.isArray(b.speaking) ? b.speaking.slice(0, 8) : [];
    const user = `${level}
ĐỀ VIẾT: ${s(w.task, 800)} (tối thiểu ${Number(w.minWords) || 80} từ)
BÀI VIẾT CỦA NGƯỜI HỌC:
"""${s(w.text, 4000) || '(bỏ trống)'}"""

BÀI NÓI (chữ máy nhận giọng):
${sp.map((x: { q?: string; a?: string }, i: number) => `${i + 1}. Câu hỏi: ${s(x.q, 400)}\n   Trả lời: """${s(x.a, 2500) || '(bỏ trống)'}"""`).join('\n')}

Trong speaking.answers trả đúng ${sp.length} mục theo thứ tự câu hỏi.`;
    return gemini(GRADE_SYS, user, GRADE_SCHEMA, 0.2, true, 45_000, 150_000);
  }

  const spec = SPEC[s(b.part, 4)];
  if (!spec) return json({ error: 'bad_part' }, 400);
  const words = (Array.isArray(b.words) ? b.words : []).slice(0, 150).map((x: unknown) => s(x, 40)).join(', ');
  const topics = s(b.topics, 300), country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const user = `${level}
Chủ đề của bài kiểm tra: ${topics || 'đời sống hằng ngày'}.
Từ người học đã học (ưu tiên dùng): ${words || '(chưa có)'}.
Bối cảnh gợi ý cho lần soạn này: ${country}. Mã ngẫu nhiên: ${Math.random().toString(36).slice(2, 8)} (để mỗi đề khác nhau).
${spec.rule}`;
  return gemini(BASE, user, spec.schema, 0.85, false, 60_000, 160_000);
}
