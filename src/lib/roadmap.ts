// Lộ trình theo mục tiêu IELTS người học chọn:
// - Tuần 1–12: nền tảng tới 5.5 (WEEK_GOALS). Mục tiêu thấp hơn thì dừng sớm hơn.
// - Mục tiêu cao hơn 5.5: thêm tuần cho từng nấc 0.5, số tuần tính theo số từ cần học thêm và số từ/ngày.
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
const GOAL_AT: Record<string, string> = {
  '6.0': 'Viết Task 2 khoảng 250 từ, đọc bài báo dài, nghe bài giảng ngắn',
  '6.5': 'Từ vựng học thuật, paraphrase, Speaking Part 3 có lập luận',
  '7.0': 'Câu phức, collocation, đọc nhanh tìm ý chính',
  '7.5': 'Viết mạch lạc, từ nối đa dạng, nghe nhiều giọng Anh, Úc, Mỹ',
  '8.0': 'Từ vựng ít gặp, thành ngữ, sửa lỗi nhỏ',
  '8.5': 'Diễn đạt tự nhiên, tranh luận chủ đề khó',
  '9.0': 'Luyện đề tốc độ cao, hoàn thiện mọi kỹ năng',
};
const cefrOf = (b: number) => (b <= 6.5 ? 'B2' : b <= 8 ? 'C1' : 'C2');
const firstNum = (band: string) => parseFloat(band) || 0;

export interface RoadWeek extends WeekGoal { extra?: boolean }
/** Danh sách tuần theo mục tiêu hiện tại: { số tuần: mục tiêu tuần } */
export function roadmap(P: Progress): Record<number, RoadWeek> {
  const target = parseFloat(P.settings.target) || 5.5, size = Math.max(1, P.settings.wpd * 7);
  const out: Record<number, RoadWeek> = {};
  let n = 0;
  for (const [w, g] of Object.entries(WEEK_GOALS)) {
    if (+w > 4 && firstNum(g.band) > target) break; // tuần 1–4 luôn có (đã có bài học)
    out[++n] = g;
  }
  for (let b = 6; b <= target + 0.001; b += 0.5) {
    const band = b.toFixed(1), weeks = Math.max(2, Math.ceil((wordsFor(b) - wordsFor(b - 0.5)) / size));
    for (let i = 0; i < weeks; i++) out[++n] = { cefr: cefrOf(b), band, goal: (i === weeks - 1 ? '🎯 Mốc ' + band + ': ' : '') + (GOAL_AT[band] || ''), extra: true };
  }
  return out;
}
export const totalWeeks = (P: Progress) => Object.keys(roadmap(P)).length;
