// Chuẩn hóa và chấm câu (gõ, nói).
const NUM: Record<number, string> = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
  19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 100: 'one hundred' };
const CONTR: Record<string, string> = { "i'm": 'i am', "don't": 'do not', "doesn't": 'does not', "it's": 'it is', "what's": 'what is', "that's": 'that is',
  "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "isn't": 'is not',
  "aren't": 'are not', "can't": 'can not', cannot: 'can not', "let's": 'let us', "where's": 'where is', "how's": 'how is',
  ok: 'okay', mum: 'mom', oclock: "o'clock",
  dont: 'do not', doesnt: 'does not', im: 'i am', isnt: 'is not', arent: 'are not', cant: 'can not', whats: 'what is', wheres: 'where is', youre: 'you are' };

export function norm(s: string): string {
  s = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\$(\d+)/g, '$1 dollars').replace(/(\d+):00/g, "$1 o'clock")
    .replace(/good[\s-]?bye/g, 'goodbye').replace(/[^a-z0-9' ]+/g, ' ');
  return s.split(/\s+/).filter(Boolean).map((w) => {
    w = w.replace(/^'+|'+$/g, '');
    if (Object.prototype.hasOwnProperty.call(CONTR, w)) return CONTR[w];
    if (/^\d+$/.test(w) && NUM[+w]) return NUM[+w];
    return w;
  }).join(' ').replace(/\s+/g, ' ').trim();
}

/** Khoảng cách Levenshtein */
export function lev(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export type TypedResult = 'ok' | 'almost' | 'bad';
export function checkTyped(input: string, target: string): TypedResult {
  const a = norm(input).split(' '), b = norm(target).split(' ');
  if (a.join(' ') === b.join(' ')) return 'ok';
  if (a.length === b.length && a.every((w, i) => w === b[i] || (b[i].length >= 4 && lev(w, b[i]) <= 1))) return 'almost';
  return 'bad';
}

export function lcsHits(a: string[], b: string[]): { count: number; hit: boolean[] } {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array<boolean>(n).fill(false); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { count: dp[0][0], hit };
}

export interface SpeechScore { T: string[]; count: number; hit: boolean[]; heard: string; score: number }
export function scoreSpeech(target: string, heardList: string[]): SpeechScore {
  const T = norm(target).split(' ');
  let best: { count: number; hit: boolean[]; heard: string } | null = null;
  for (const h of heardList) {
    const r = lcsHits(T, norm(h).split(' ').filter(Boolean));
    if (!best || r.count > best.count) best = { ...r, heard: h };
  }
  const b = best || { count: 0, hit: T.map(() => false), heard: '' };
  return { T, ...b, score: b.count / T.length };
}

export const tokens = (s: string): string[] => s.split(' ').map((w) => w.replace(/[.,!?]/g, '')).filter(Boolean);
