// Kiểu dữ liệu nội dung bài học.

/** [tiếng Anh, tiếng Việt, emoji] */
export type Word = [en: string, vi: string, emoji: string];
/** [tiếng Anh, tiếng Việt] */
export type Pair = [en: string, vi: string];
/** [câu hỏi, dịch, các đáp án, chỉ số đáp án đúng] */
export type Question = [q: string, qvi: string, opts: string[], answer: number];

export interface Unit {
  id: string;
  week: number;
  emoji: string;
  title: string;
  vi: string;
  words: Word[];
  sentences: Pair[];
  reading: Pair[];
  questions: Question[];
}

export interface WeekGoal { cefr: string; band: string; goal: string }
export interface Phase { weeks: string; level: string; goal: string; inApp: boolean }
/** [icon, tên, số phút, mô tả] */
export type DailyPlanItem = [icon: string, name: string, min: number, desc: string];

// ----- nội dung theo cấp độ (A2 → C2), chưa dùng trong app -----
/** [từ, nghĩa, câu ví dụ tiếng Anh, dịch câu ví dụ] */
export type LevelWord = [word: string, vi: string, exampleEn: string, exampleVi: string];
export interface Pack { id: string; title: string; vi: string; emoji: string; words: LevelWord[] }
/** [câu có ____, đáp án (nhiều đáp án ngăn bằng |), dịch] */
export type Gap = [sentence: string, answer: string, vi: string];
export interface Level {
  id: string;
  cefr: string;
  band: string;
  minBand: number;
  title: string;
  vi: string;
  emoji: string;
  packs: Pack[];
  reading: { title: string; text: Pair[]; questions: Question[] };
  listening: { title: string; script: Pair[]; questions: Question[]; gaps: Gap[] };
  writing: { prompt: string; vi: string; minWords: number; ideas: string[]; useful: string[] };
  speaking: { part1: Pair[]; part2: { cue: string; points: string[]; vi: string }; part3: Pair[] };
}
