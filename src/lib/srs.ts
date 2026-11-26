// Ôn từ vựng bằng "lặp lại ngắt quãng".
import { WORDS } from '../data';
import { bankWord, ensureBank } from '../data/bank';
import type { Progress, SrsCard } from './progress';
import { addDays, dayKey, sample, shuffle } from './util';

export const SRS_DAYS = [0, 1, 2, 4, 7, 14, 30, 60];

export const dueWords = (P: Progress): string[] => {
  const k = dayKey();
  return Object.entries(P.srs).filter(([w, v]) => v.due <= k && (WORDS[w] || v.f)).map(([w]) => w);
};

export interface ReviewCard { w: string; dir: 'en' | 'vi'; again?: boolean }
export interface ReviewState { q: ReviewCard[]; i: number; flip: boolean; n: number }

export async function newReview(P: Progress, extra: boolean): Promise<ReviewState> {
  let words = dueWords(P);
  if (extra) words = sample(Object.keys(P.srs).filter((w) => WORDS[w] || P.srs[w].f), 10);
  words = shuffle(words).slice(0, 40);
  await ensureBank(words.map((w) => P.srs[w].f).filter((f): f is string => !!f));
  words = words.filter((w) => WORDS[w] || bankWord(w));
  return { q: words.map((w) => ({ w, dir: Math.random() < 0.5 ? 'en' : 'vi' })), i: 0, flip: false, n: 0 };
}

/** Thông tin để hiện trên thẻ ôn: từ trong bài học (có emoji) hoặc từ trong kho (có phiên âm, câu ví dụ) */
export interface CardInfo { en: string; vi: string; em?: string; ipa?: string; ex?: string; exvi?: string }
export function cardInfo(w: string): CardInfo {
  const b = bankWord(w);
  if (WORDS[w]) return { ...WORDS[w], ipa: b?.ipa, ex: b?.ex, exvi: b?.exvi };
  return b ? { en: b.w, vi: b.vi, ipa: b.ipa, ex: b.ex, exvi: b.exvi } : { en: w, vi: '' };
}

/** Chấm thẻ: nhớ thì giãn lịch ôn, quên thì ôn lại ngay. */
export function rateCard(P: Progress, R: ReviewState, ok: boolean) {
  const c = R.q[R.i], s: SrsCard = P.srs[c.w] || { b: 0, due: '' };
  if (ok) { s.b = Math.min(SRS_DAYS.length - 1, s.b + 1); s.due = addDays(dayKey(), SRS_DAYS[s.b]); R.n++; }
  else { s.b = 0; s.due = dayKey(); if (!c.again) R.q.push({ ...c, again: true }); }
  P.srs[c.w] = s;
}

/** Từ vựng của bài vừa học xong vào thẻ ôn (ôn lại sau 1 ngày) */
export const addNewWords = (P: Progress, words: string[]) => words.forEach((en) => { if (!P.srs[en]) P.srs[en] = { b: 0, due: addDays(dayKey(), 1) }; });
/** Qua bài kiểm tra: từ vựng vào thẻ ở mức 2 (ôn lại sau 4 ngày) */
export const promoteWords = (P: Progress, words: string[]) => words.forEach((en) => { if (!P.srs[en] || P.srs[en].b < 2) P.srs[en] = { b: 2, due: addDays(dayKey(), 4) }; });
