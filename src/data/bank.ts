// Kho từ vựng lớn (NGSL + AWL + từ mở rộng tới ~10.000 từ) ở data/vocab/*.json.
// Mỗi file được tải riêng khi cần, để app mở nhanh.
import meta from './bank-meta.json';

export interface BankEntry { w: string; r: number; pos: string; vi: string; ipa: string; ex: string; exvi: string; forms: string[]; awl: number }
/** Một từ trong kho, kèm tên file chứa nó (f) */
export interface BankWord extends BankEntry { f: string }
export interface BankFile { f: string; n: number; from: number; to: number }

export const BANK_FILES: BankFile[] = meta;
export const BANK_TOTAL = BANK_FILES.reduce((s, x) => s + x.n, 0);

/** Mốc vốn từ (ước tính) cho từng mức IELTS */
export const MILESTONES: [band: string, words: number][] = [['4.0', 2000], ['5.5', 3000], ['6.5', 5000], ['7.5', 7000], ['9.0', 10000]];

const loaders = import.meta.glob<BankEntry[]>('../../data/vocab/*.json', { import: 'default' });
const loaded = new Map<string, BankWord[]>();
const BANK: Record<string, BankWord> = {};

export async function loadBankFile(f: string): Promise<BankWord[]> {
  const have = loaded.get(f);
  if (have) return have;
  const fn = loaders[`../../data/vocab/${f}.json`];
  const arr = fn ? (await fn()).map((e) => ({ ...e, f })) : [];
  arr.forEach((e) => { if (!BANK[e.w]) BANK[e.w] = e; });
  loaded.set(f, arr);
  return arr;
}
export const ensureBank = (files: Iterable<string>) => Promise.all([...new Set(files)].map(loadBankFile));
export const bankWord = (w: string): BankWord | undefined => BANK[w];
/** Tất cả từ đã tải (dùng làm đáp án nhiễu) */
export const loadedBankWords = (): BankWord[] => [...loaded.values()].flat();

/** Từ cổ, văn chương, tiếng lóng: ít dùng thực tế, để học sau cùng */
export const isRare = (e: BankEntry) => /^\((cổ|văn chương|lóng|từ cổ)/.test(e.vi);

/** n từ tiếp theo chưa học, theo thứ tự từ thông dụng nhất (từ ít dùng thực tế để cuối).
 *  doneIn(f) = số từ của file f đã học: file đã học hết thì bỏ qua, không cần tải. */
export async function nextBankWords(skip: (w: string) => boolean, n: number, doneIn: (f: string) => number = () => 0): Promise<BankWord[]> {
  const out: BankWord[] = [];
  for (const rarePass of [false, true]) {
    for (const { f, n: size } of BANK_FILES) {
      if (doneIn(f) >= size) continue;
      for (const e of await loadBankFile(f)) {
        if (skip(e.w) || isRare(e) !== rarePass || out.includes(e)) continue;
        out.push(e);
        if (out.length >= n) return out;
      }
    }
  }
  return out;
}

/** Nghĩa đầu tiên (ngắn) để làm đáp án trắc nghiệm */
export const firstSense = (vi: string) => vi.split(';')[0].trim();

/** Các từ ở vị trí [from, to) trong kho (theo thứ tự học, từ thông dụng trước) */
export async function bankRange(from: number, to: number): Promise<BankWord[]> {
  const out: BankWord[] = [];
  let pos = 0;
  for (const { f, n } of BANK_FILES) {
    if (pos + n > from) out.push(...(await loadBankFile(f)).slice(Math.max(0, from - pos), to - pos));
    pos += n;
    if (pos >= to) break;
  }
  return out;
}
