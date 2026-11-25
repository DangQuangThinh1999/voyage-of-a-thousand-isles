import type { Level, Unit } from './types';
import { UNITS, WEEK_GOALS, DAILY_PLAN, JOURNAL_PROMPTS, ROADMAP } from './a1';
import a2 from './levels/a2';
import b1 from './levels/b1';
import b2 from './levels/b2';
import c1 from './levels/c1';
import c2 from './levels/c2';

export * from './types';
export { UNITS, WEEK_GOALS, DAILY_PLAN, JOURNAL_PROMPTS, ROADMAP };

/** Nội dung các cấp độ A2 → C2 (chưa nối vào giao diện). */
export const LEVELS: Level[] = [a2, b1, b2, c1, c2];

// Dữ liệu JSON ở thư mục /data (lexicon-a1-b1.json, lexicon-b2-c2.json, pronunciation.json)
// có thể nhập trực tiếp khi sẵn sàng (tsconfig đã bật resolveJsonModule), ví dụ:
//   import lexiconA1B1 from '../../data/lexicon-a1-b1.json';

export const unitById = (id: string): Unit | undefined => UNITS.find((u) => u.id === id);

export interface WordInfo { en: string; vi: string; em: string; unit: string }
export const WORDS: Record<string, WordInfo> = {};
UNITS.forEach((u) => u.words.forEach(([en, vi, em]) => { WORDS[en] = { en, vi, em, unit: u.id }; }));
