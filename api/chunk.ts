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
  const words = (Array.isArray(b.words) ? b.words : []).slice(0, 100).map((x: unknown) => s(x, 40));
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
  if (b.part === 'skipgen') {
    // Kiểm tra nhanh THEO CÂU: đặt các câu ngắn chứa càng nhiều từ cần kiểm tra càng tốt (phủ hết danh sách)
    const user = `Trình độ người học: CEFR ${cefr}. Danh sách từ cần kiểm tra (${words.length} từ): ${words.join(', ')}.
Đặt các câu tiếng Anh NGẮN (4–12 từ), tự nhiên, đúng ngữ pháp 100%, mỗi câu dùng càng nhiều từ trong danh sách càng tốt (thường 3–6 từ), sao cho TẤT CẢ các từ trong danh sách đều xuất hiện ít nhất một lần. Dùng đúng nghĩa phổ biến nhất của từ. Các từ còn lại trong câu phải rất thông dụng.
Số câu khoảng ${Math.max(2, Math.ceil(words.length / 4))}.
words: các từ TRONG DANH SÁCH xuất hiện trong câu, ghi đúng như trong danh sách (dạng gốc), kể cả khi trong câu đã chia (studies → study).
vi: bản dịch tiếng Việt tự nhiên (đáp án tham khảo).`;
    return gemini(GEN_SYS, user, { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { en: { type: 'STRING' }, vi: { type: 'STRING' }, words: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['en', 'vi', 'words'] } } }, required: ['items'] }, 0.7, true);
  }
  if (b.part === 'skipgrade') {
    // Chấm bản dịch từng câu: người học hiểu đúng từ nào trong danh sách
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((x: { en?: string; vi?: string; words?: string[]; a?: string }) => ({ en: s(x.en, 200), ref: s(x.vi, 300), words: (x.words || []).slice(0, 12).map((w) => s(w, 40)), a: s(x.a, 300) }));
    const user = `Người học dịch từng câu tiếng Anh sang tiếng Việt để chứng minh đã biết các từ trong "words". Với MỖI câu:
- known: các từ trong "words" mà bản dịch thể hiện người học HIỂU ĐÚNG (dịch đúng nghĩa, hoặc ý câu đúng và từ đó được thể hiện; với từ chức năng như a, the, am, is, to, of… thì tính là biết nếu cả câu dịch đúng ý). Chấp nhận dịch thoát ý, thiếu dấu tiếng Việt, khác bản tham khảo.
- unknown: các từ còn lại (dịch sai, bỏ sót, hiểu nhầm), mỗi từ kèm note_vi ngắn: nghĩa đúng trong câu.
- ok: true nếu cả câu hiểu đúng ý. comment_vi: rất ngắn (≤ 20 từ), nếu sai nói chỗ hiểu nhầm.
Bản trống = không biết hết. Trả results đúng thứ tự, đủ ${items.length} mục.
${JSON.stringify(items)}`;
    return gemini('Bạn là giáo viên tiếng Anh cho người Việt, chấm hiểu nghĩa công bằng, không khắt khe câu chữ.', user,
      { type: 'OBJECT', properties: { results: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' }, known: { type: 'ARRAY', items: { type: 'STRING' } },
        unknown: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, note_vi: { type: 'STRING' } }, required: ['w', 'note_vi'] } }, comment_vi: { type: 'STRING' } }, required: ['ok', 'known', 'unknown', 'comment_vi'] } } }, required: ['results'] },
      0.1, true);
  }
  if (b.part === 'msgen') {
    // Kiểm tra MỐC 100 TỪ: 2 đoạn văn dùng các từ đã học + đề viết câu theo ngữ pháp
    const grammar = (Array.isArray(b.grammar) ? b.grammar : []).slice(0, 3).map((x: unknown) => s(x, 120));
    const len = /^C|B2/.test(cefr) ? '90–120' : /^B/.test(cefr) ? '70–90' : '45–65';
    const user = `Trình độ: CEFR ${cefr}. 100 TỪ NGƯỜI HỌC VỪA HỌC: ${words.join(', ')}.
Ngữ pháp trọng tâm: ${grammar.join(' | ')}.
Soạn:
1) read: một đoạn văn tiếng Anh ${len} từ (en) + bản dịch tiếng Việt (vi), chủ đề đời sống thực tế, dùng NHIỀU từ trong danh sách nhất có thể (ít nhất 12 từ). Người học sẽ dịch Anh → Việt.
2) write: một đoạn KHÁC chủ đề, ${len} từ, cũng dùng ít nhất 12 từ khác trong danh sách và có dùng ngữ pháp trọng tâm. vi là đoạn tiếng Việt người học sẽ dịch sang tiếng Anh, en là bản dịch mẫu.
3) tasks: 3 đề viết câu, mỗi đề yêu cầu dùng một cấu trúc ngữ pháp trọng tâm (grammar = tên cấu trúc như đã cho) với 2 từ trong danh sách (words). prompt_vi: yêu cầu cụ thể bằng tiếng Việt (vd "Viết 1 câu ở thì hiện tại đơn về thói quen của bạn, dùng 'breakfast' và 'usually'"). example: một câu mẫu đúng.
Tiếng Anh tự nhiên, đúng ngữ pháp 100%. Mã ngẫu nhiên: ${Math.random().toString(36).slice(2, 8)}.`;
    const P2 = { type: 'OBJECT', properties: { en: { type: 'STRING' }, vi: { type: 'STRING' } }, required: ['en', 'vi'] };
    return gemini(GEN_SYS, user, { type: 'OBJECT', properties: { read: P2, write: P2,
      tasks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { grammar: { type: 'STRING' }, prompt_vi: { type: 'STRING' }, words: { type: 'ARRAY', items: { type: 'STRING' } }, example: { type: 'STRING' } }, required: ['grammar', 'prompt_vi', 'words', 'example'] } },
    }, required: ['read', 'write', 'tasks'] }, 0.8, false, 45_000, 120_000);
  }
  if (b.part === 'msgrade') {
    const r = b.read || {}, w = b.write || {}, tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 5);
    const user = `Trình độ: CEFR ${cefr}. Chấm bài kiểm tra mốc 100 từ (chấm MỘT LẦN cả bài).
PHẦN 1 — dịch Anh → Việt:
Gốc: «${s(r.en, 1500)}»  Tham khảo: «${s(r.ref, 1500)}»
Người học: «${s(r.a, 2000) || '(bỏ trống)'}»
PHẦN 2 — dịch Việt → Anh:
Gốc: «${s(w.vi, 1500)}»  Tham khảo: «${s(w.ref, 1500)}»
Người học: «${s(w.a, 2000) || '(bỏ trống)'}»
PHẦN 3 — viết câu theo ngữ pháp:
${tasks.map((t: { prompt_vi?: string; grammar?: string; words?: string[]; a?: string }, i: number) => `${i + 1}. Yêu cầu: ${s(t.prompt_vi, 300)} (cấu trúc: ${s(t.grammar, 100)}; từ: ${(t.words || []).join(', ')})\n   Người học: «${s(t.a, 400) || '(bỏ trống)'}»`).join('\n')}
Quy tắc: chấp nhận mọi cách dịch đúng nghĩa; không bao giờ đánh dấu sai câu đúng. score 0–100.
read: score, comment_vi, misread (những chỗ hiểu sai: en_part = cụm tiếng Anh, explain_vi = nghĩa đúng + vì sao).
write: score, corrected (VIẾT LẠI TRỌN VẸN bản tiếng Anh của người học đã sửa hết lỗi), natural (cách viết tự nhiên), errors (original, corrected, type_vi, explain_vi có quy tắc + ví dụ), comment_vi.
tasks: đúng ${tasks.length} mục theo thứ tự: score, ok (dùng đúng cấu trúc + đúng ngữ pháp + dùng đúng 2 từ), corrected (câu đã sửa), explain_vi (vì sao, nhắc lại công thức).
summary_vi: nhận xét chung + 2–3 việc cần luyện.`;
    const ERR = { type: 'ARRAY', items: { type: 'OBJECT', properties: { original: { type: 'STRING' }, corrected: { type: 'STRING' }, type_vi: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['original', 'corrected', 'type_vi', 'explain_vi'] } };
    return gemini('Bạn là giáo viên tiếng Anh cho người Việt, chấm công bằng, giải thích dễ hiểu, có bằng chứng.', user, { type: 'OBJECT', properties: {
      read: { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, comment_vi: { type: 'STRING' }, misread: { type: 'ARRAY', items: { type: 'OBJECT', properties: { en_part: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['en_part', 'explain_vi'] } } }, required: ['score', 'comment_vi', 'misread'] },
      write: { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, corrected: { type: 'STRING' }, natural: { type: 'STRING' }, errors: ERR, comment_vi: { type: 'STRING' } }, required: ['score', 'corrected', 'natural', 'errors', 'comment_vi'] },
      tasks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, ok: { type: 'BOOLEAN' }, corrected: { type: 'STRING' }, explain_vi: { type: 'STRING' } }, required: ['score', 'ok', 'corrected', 'explain_vi'] } },
      summary_vi: { type: 'STRING' },
    }, required: ['read', 'write', 'tasks', 'summary_vi'] }, 0.2, true, 45_000, 120_000);
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
