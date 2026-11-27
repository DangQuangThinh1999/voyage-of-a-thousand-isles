// Lộ trình theo mục tiêu IELTS người học chọn:
// - Tuần 1–12: nền tảng tới 5.5 (WEEK_GOALS). Mục tiêu thấp hơn thì dừng sớm hơn.
// - Mục tiêu cao hơn 5.5: thêm tuần cho từng nấc 0.5. MỖI TUẦN MỘT TRỌNG TÂM RIÊNG (không lặp), có ⭐ thử thách đặc biệt.
// - Số từ mỗi tuần theo VỐN TỪ CẦN CHO MỐC IELTS (wordsFor): tuần 1–12 chia ~3.000 từ tới 5.5 (A1 ít, B1 nhiều),
//   mỗi mốc trên 5.5 chia số từ cần thêm cho các tuần của mốc đó. Từ trong kho học theo thứ tự nên tuần w = [start, start + words).
import { WEEK_GOALS, type WeekGoal } from '../data';
import type { Progress } from './progress';

/** Vốn từ ước tính cho từng mức IELTS (nội suy giữa các mốc) */
const WORDS_AT: [band: number, words: number][] = [[2, 0], [4, 2000], [5.5, 3000], [6.5, 5000], [7.5, 7000], [9, 10000]];
export function wordsFor(band: number): number {
  for (let i = 1; i < WORDS_AT.length; i++) {
    const [b1, w1] = WORDS_AT[i - 1], [b2, w2] = WORDS_AT[i];
    if (band <= b2) return Math.round(w1 + ((band - b1) / (b2 - b1)) * (w2 - w1));
  }
  return 10000;
}

type Focus = [goal: string, special: string];
/** Trọng tâm từng tuần cho các mốc trên 5.5 — mỗi mốc 4 tuần khác nhau */
const FOCUS_AT: Record<string, Focus[]> = {
  '6.0': [
    ['Writing Task 2: bài nghị luận 250 từ (agree / disagree)', '✍️ Viết 1 bài 250 từ hoàn chỉnh, AI chấm theo 4 tiêu chí'],
    ['Reading: bài báo dài, kỹ năng skimming & scanning', '📰 Mỗi ngày 1 bài báo thật, tìm ý chính trong 2 phút'],
    ['Listening Section 4: bài giảng ngắn, ghi chú nhanh', '🎧 Nghe 1 lần, ghi lại từ khoá (note-taking)'],
    ['Speaking Part 2: nói liền 2 phút theo cue card', '🎤 Ghi âm 2 phút mỗi ngày, nghe lại tự sửa'],
  ],
  '6.5': [
    ['Từ vựng học thuật (AWL): giáo dục, môi trường, xã hội', '📚 10 từ học thuật/ngày kèm collocation'],
    ['Paraphrase: đổi từ đồng nghĩa và đổi cấu trúc câu', '🔁 Mỗi ngày viết lại 5 câu đề IELTS'],
    ['Speaking Part 3: quan điểm + lý do + ví dụ', '💬 Trả lời theo khung PEEL (Point–Explain–Example–Link)'],
    ['Writing Task 1: mô tả biểu đồ, so sánh số liệu', '📊 Viết 150 từ tả 1 biểu đồ'],
  ],
  '7.0': [
    ['Câu phức: mệnh đề quan hệ, câu điều kiện, đảo ngữ', '🧩 5 câu phức/ngày, AI kiểm tra'],
    ['Collocation: kết hợp từ tự nhiên (make a decision…)', '🔗 Lập sổ 50 collocation hay dùng'],
    ['Reading tốc độ: True/False/Not Given, Matching Headings', '⏱️ Làm 1 passage trong 20 phút'],
    ['Listening Section 3: thảo luận học thuật nhiều người', '👥 Nghe và phân biệt ý kiến từng người'],
  ],
  '7.5': [
    ['Mạch lạc: từ nối đa dạng, chia đoạn, câu chủ đề rõ', '🧵 Viết lại 1 bài cũ cho mạch lạc hơn'],
    ['Nghe nhiều giọng: Anh – Úc – Mỹ', '🌏 Mỗi ngày 1 podcast một giọng khác nhau'],
    ['Task 2 dạng discuss both views / problem–solution', '⚖️ Lập dàn ý 2 phía trong 5 phút'],
    ['Speaking trôi chảy, tự sửa khi nói', '🔄 Shadowing 10 phút mỗi ngày'],
  ],
  '8.0': [
    ['Từ vựng ít gặp, dùng từ chính xác', '💎 Thay 5 từ thường bằng từ chính xác hơn'],
    ['Thành ngữ, cụm động từ đúng ngữ cảnh', '🗣️ Dùng 3 idiom/ngày trong câu nói'],
    ['Sửa lỗi nhỏ: mạo từ, số ít/nhiều, giới từ', '🔍 Soát hết lỗi 1 bài viết trong 3 phút'],
    ['Reading bài khó: suy luận quan điểm tác giả', '🧠 Tìm ý ẩn của tác giả trong mỗi đoạn'],
  ],
  '8.5': [
    ['Diễn đạt tự nhiên như người bản xứ', '✨ So bài mình với bài band 9, ghi 5 điểm khác'],
    ['Tranh luận chủ đề khó: công nghệ, đạo đức, toàn cầu hoá', '🎙️ Nói 3 phút phản biện 1 ý kiến'],
    ['Viết học thuật: lập luận sâu, ví dụ thuyết phục', '📝 2 bài Task 2 band 8+ trong tuần'],
    ['Nghe tốc độ thật: tin tức, phỏng vấn, hội thảo', '📻 Nghe BBC / TED không phụ đề'],
  ],
  '9.0': [
    ['Đề thi đầy đủ 4 kỹ năng, có tính giờ', '⏰ 1 đề full mỗi 2 ngày'],
    ['Reading 60 phút 40 câu, không bỏ sót', '⚡ Đọc nhanh, không đọc lại'],
    ['Writing hoàn hảo: không lỗi, cấu trúc đa dạng', '🏁 Bài viết 0 lỗi ngữ pháp'],
    ['Speaking thi thử với giám khảo AI', '🧑‍🏫 Thi thử Speaking 15 phút'],
  ],
};
/** Thử thách đặc biệt cho tuần 1–12 */
const SPECIAL_BASE: Record<number, string> = {
  1: '👋 Tự giới thiệu 30 giây bằng tiếng Anh', 2: '👪 Kể về gia đình bằng 5 câu', 3: '⏰ Kể lại 1 ngày của bạn',
  4: '🛒 Đóng vai đi mua sắm', 5: '📖 Kể chuyện hôm qua trong 1 phút', 6: '🗺️ Chỉ đường và gọi món',
  7: '📅 Nói về kế hoạch cuối tuần', 8: '⏱️ Nói liền 1 phút không dừng', 9: '📝 Làm quen các dạng câu Listening & Reading',
  10: '✍️ Viết bài Task 1 & Task 2 đầu tiên', 11: '⏰ Làm đề có tính giờ', 12: '🏆 Thi thử đầy đủ 4 kỹ năng',
};
/** Tuần 1–12: ngữ pháp trọng tâm + "sau tuần này bạn làm được" — để thấy rõ mỗi tuần tiến bộ gì */
const BASE_PLAN: Record<number, [grammar: string, cando: string[]]> = {
  1: ['to be: I am · you are · he/she is', ['Chào hỏi, tự giới thiệu tên, tuổi, nghề, quê', 'Đếm và nói số 1–100', 'Nghe hiểu câu chào hỏi ngắn']],
  2: ['my / your / his / her · this is… · a / an', ['Giới thiệu các thành viên gia đình', 'Nói màu sắc, đồ vật quanh mình', 'Gọi món ăn, đồ uống đơn giản']],
  3: ['Hiện tại đơn: I work · she works · do / does', ['Kể lại 1 ngày của bạn', 'Tả nhà và các phòng', 'Hỏi và nói giờ, thứ, ngày']],
  4: ['There is / there are · can / can\'t', ['Nói về thời tiết hôm nay', 'Hỏi giá, mua đồ, trả tiền', 'Nói cảm xúc và lý do']],
  5: ['Quá khứ đơn: went · saw · played', ['Kể lại chuyện hôm qua, cuối tuần trước', 'Viết 5–6 câu về một kỷ niệm']],
  6: ['Câu hỏi Wh- · giới từ chỉ nơi chốn', ['Hỏi đường và chỉ đường', 'Đặt phòng, gọi món ở nhà hàng']],
  7: ['So sánh hơn / nhất · will / be going to', ['So sánh hai người, hai nơi', 'Nói kế hoạch tuần sau, năm sau']],
  8: ['Từ nối: and · but · because · so', ['Viết đoạn văn 80 từ', 'Nói liền 1 phút về chủ đề quen thuộc']],
  9: ['Hiện tại hoàn thành: have done', ['Hiểu 4 phần thi IELTS', 'Làm dạng điền từ và trắc nghiệm']],
  10: ['Câu phức: because · although · which', ['Viết Task 1 (~120 từ), Task 2 (~200 từ)', 'Trả lời Speaking Part 1–2']],
  11: ['Ôn tổng hợp các thì', ['Làm đề đủ 4 kỹ năng có tính giờ', 'Chia thời gian hợp lý khi thi']],
  12: ['Sửa các lỗi hay gặp', ['Thi thử đầy đủ', 'Biết điểm yếu để luyện tiếp']],
};

/** Tỷ trọng số từ mỗi tuần nền tảng theo trình độ: mới học ít từ, càng lên cao càng nhiều */
const WORD_FACTOR: Record<string, number> = { A1: 0.5, 'A1+': 0.6, A2: 0.8, 'A2+': 0.9, B1: 1.1, 'B1+': 1.2, B2: 1, C1: 1.2, C2: 1.4 };
const BASE_WEIGHT = Object.values(WEEK_GOALS).reduce((a, g) => a + (WORD_FACTOR[g.cefr] ?? 1), 0);
const r10 = (x: number) => Math.max(10, Math.round(x / 10) * 10);
const cefrOf = (b: number) => (b <= 6.5 ? 'B2' : b <= 8 ? 'C1' : 'C2');
const firstNum = (band: string) => parseFloat(band) || 0;
const BANK_MAX = 10012;

export interface RoadWeek extends WeekGoal {
  /** thử thách đặc biệt của tuần */ special: string;
  /** ngữ pháp trọng tâm + sau tuần này làm được gì */ grammar?: string; cando?: string[];
  /** số từ mới của tuần và vị trí bắt đầu trong kho từ */ words: number; start: number;
  /** tuần thêm cho mục tiêu trên 5.5 */ extra?: boolean;
  /** tuần cuối của một mốc IELTS */ milestone?: boolean;
}
let memo: { key: string; rm: Record<number, RoadWeek> } | null = null;
/** Danh sách tuần theo mục tiêu hiện tại: { số tuần: mục tiêu tuần } */
export function roadmap(P: Progress): Record<number, RoadWeek> {
  const target = parseFloat(P.settings.target) || 5.5, wpd = Math.max(1, P.settings.wpd), key = target + '|' + wpd;
  if (memo && memo.key === key) return memo.rm;
  const out: Record<number, RoadWeek> = {};
  let n = 0, start = 0;
  const push = (g: Omit<RoadWeek, 'words' | 'start'>, want: number) => {
    const words = Math.max(0, Math.min(r10(want), BANK_MAX - start));
    out[++n] = { ...g, words, start }; start += words;
  };
  const base = wordsFor(5.5);
  for (const [w, g] of Object.entries(WEEK_GOALS)) {
    if (+w > 4 && firstNum(g.band) > target) break; // tuần 1–4 luôn có (đã có bài học)
    push({ ...g, special: SPECIAL_BASE[+w] || '', grammar: BASE_PLAN[+w]?.[0], cando: BASE_PLAN[+w]?.[1] }, (base * (WORD_FACTOR[g.cefr] ?? 1)) / BASE_WEIGHT);
  }
  // Trên 5.5: lập danh sách tuần trước, rồi chia số từ cần thêm (tới mục tiêu) theo trọng số cấp độ: B2 < C1 < C2
  const ext: Omit<RoadWeek, 'words' | 'start'>[] = [];
  for (let b = 6; b <= target + 0.001; b += 0.5) {
    const band = b.toFixed(1), cefr = cefrOf(b), F = FOCUS_AT[band] || [], gap = wordsFor(b) - wordsFor(b - 0.5);
    // số tuần: theo số từ cần thêm và tốc độ học, ít nhất 2, nhiều nhất bằng số trọng tâm đã soạn (không tuần nào trùng tuần nào)
    const weeks = Math.max(2, Math.min(F.length || 2, Math.ceil(gap / (wpd * 7))));
    for (let i = 0; i < weeks; i++) {
      const [goal, special] = F[i] || ['', ''];
      ext.push({ cefr, band, goal, special, extra: true, milestone: i === weeks - 1 });
    }
  }
  const extWords = Math.min(BANK_MAX, wordsFor(target)) - start, extWeight = ext.reduce((a, g) => a + (WORD_FACTOR[g.cefr] ?? 1), 0);
  for (const g of ext) push(g, (extWords * (WORD_FACTOR[g.cefr] ?? 1)) / extWeight);
  memo = { key, rm: out };
  return out;
}
export const totalWeeks = (P: Progress) => Object.keys(roadmap(P)).length;
/** Đoạn từ trong kho của tuần w: [start, end) */
export function weekRange(P: Progress, w: number): [number, number] {
  const rm = roadmap(P), g = rm[w];
  if (g) return [g.start, g.start + g.words];
  const last = rm[Object.keys(rm).length];
  const s = last ? last.start + last.words : 0;
  return [s, Math.min(BANK_MAX, s + P.settings.wpd * 7)];
}
/** Các tuần từ mốc IELTS 7.5 trở lên đang KHOÁ (chưa mở cho học) */
export const LOCK_BAND = 7.5;
export const weekLocked = (g?: { band: string } | null) => !!g && (parseFloat(g.band) || 0) >= LOCK_BAND;
