// Học từ mới mỗi ngày từ kho từ: mỗi lượt 10 từ.
// 1) Xem thẻ từng từ (nghe, phiên âm, nghĩa, câu ví dụ) → "Đã biết" hoặc "Học từ này".
// 2) Kiểm tra các từ vừa học: chọn nghĩa + nghe chọn từ. Sai thì hỏi lại ở cuối.
// 3) Xong: từ vào thẻ ôn ngắt quãng (ôn lại sau 1 ngày).
import { firstSense, loadedBankWords, nextBankWords, type BankWord } from '../data/bank';
import { newWordsToday, today } from '../lib/progress';
import { speak } from '../lib/speech';
import { addDays, dayKey, sample, shuffle } from '../lib/util';
import { addXP, app, emit, save, toast } from './store';

export const GROUP = 10;

/** vi = chọn nghĩa, listen = nghe chọn từ, type = nhìn nghĩa + nghe rồi tự gõ từ (nhớ chủ động) */
export interface WordQ { w: BankWord; t: 'vi' | 'listen' | 'type'; opts: string[]; ans: number; again?: boolean }
export interface WordsState {
  phase: 'loading' | 'learn' | 'quiz' | 'done';
  group: BankWord[]; i: number; learn: BankWord[]; known: number;
  q: WordQ[]; qi: number; picked: number | null; ok: number; xp: number;
}

const blank = (): WordsState => ({ phase: 'loading', group: [], i: 0, learn: [], known: 0, q: [], qi: 0, picked: null, ok: 0, xp: 0 });

/** Số từ còn lại của hôm nay (0 = đã đủ chỉ tiêu) */
export const leftToday = () => Math.max(0, app.P.settings.wpd - newWordsToday(app.P));

export async function startWords() {
  app.W = blank(); emit();
  if (!app.P.vStart) app.P.vStart = dayKey();
  const n = Math.min(GROUP, leftToday() || GROUP);
  const per: Record<string, number> = {};
  for (const c of Object.values(app.P.srs)) if (c.f) per[c.f] = (per[c.f] || 0) + 1;
  const group = await nextBankWords((w) => !!app.P.srs[w], n, (f) => per[f] || 0);
  if (!app.W) return;
  if (!group.length) { app.W = null; toast('Bạn đã học hết kho từ hiện có 🎉'); emit(); return; }
  app.W = { ...blank(), phase: 'learn', group };
  emit(); speak(group[0].w);
}

function countNew(n: number) { const d = today(app.P); d.nw = (d.nw || 0) + n; }

function nextCard() {
  const W = app.W!;
  W.i++;
  if (W.i < W.group.length) { emit(); speak(W.group[W.i].w); return; }
  if (!W.learn.length) { finish(); return; }
  // Dễ → khó, các lần gặp lại cùng một từ cách xa nhau: nhận nghĩa, nghe nhận từ, rồi tự gõ lại từ
  W.q = (['vi', 'listen', 'type'] as const).flatMap((t) => shuffle(W.learn).map((w) => makeQ(w, t)));
  W.phase = 'quiz'; W.qi = 0; W.picked = null;
  emit(); autoSpeak();
}

/** Đã biết từ này: vào thẻ ôn ở mức cao (ôn lại sau 30 ngày) */
export function knowWord() {
  const W = app.W!, w = W.group[W.i];
  app.P.srs[w.w] = { b: 5, due: addDays(dayKey(), 30), f: w.f };
  W.known++; countNew(1); save();
  nextCard();
}
export function learnWord() { const W = app.W!; W.learn.push(W.group[W.i]); nextCard(); }

function makeQ(w: BankWord, t: WordQ['t']): WordQ {
  if (t === 'type') return { w, t, opts: [], ans: 0 };
  const pool = loadedBankWords().filter((x) => x.w !== w.w);
  if (t === 'vi') {
    const right = firstSense(w.vi);
    const wrong = sample([...new Set(pool.map((x) => firstSense(x.vi)).filter((v) => v !== right))], 3);
    const opts = shuffle([right, ...wrong]);
    return { w, t, opts, ans: opts.indexOf(right) };
  }
  const wrong = sample(pool.filter((x) => Math.abs(x.r - w.r) < 400 || pool.length < 50), 3).map((x) => x.w);
  const opts = shuffle([w.w, ...wrong]);
  return { w, t, opts, ans: opts.indexOf(w.w) };
}

function autoSpeak() { const W = app.W; const q = W && W.q[W.qi]; if (q && q.t !== 'vi') speak(q.w.w); }

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z' ]/g, '');
/** Câu tự gõ: đúng khi gõ đúng từ (hoặc một dạng của nó) */
export function checkTyped(text: string) {
  const W = app.W!, q = W.q[W.qi];
  if (W.picked !== null || !text.trim()) return;
  const ok = [q.w.w, ...q.w.forms].some((f) => norm(f) === norm(text));
  pickWordAnswer(ok ? 0 : 1);
}

export function pickWordAnswer(i: number) {
  const W = app.W!, q = W.q[W.qi];
  if (W.picked !== null) return;
  W.picked = i;
  if (i === q.ans) W.ok++;
  else if (!q.again) W.q.push({ ...makeQ(q.w, q.t), again: true });
  emit(); speak(q.w.w);
}
export function nextWordQ() {
  const W = app.W!;
  W.qi++; W.picked = null;
  if (W.qi >= W.q.length) { finish(); return; }
  emit(); autoSpeak();
}

function finish() {
  const W = app.W!, due = addDays(dayKey(), 1);
  W.learn.forEach((w) => { if (!app.P.srs[w.w]) app.P.srs[w.w] = { b: 0, due, f: w.f }; });
  countNew(W.learn.length);
  W.xp = W.learn.length * 2 + W.known;
  W.phase = 'done';
  if (W.xp) addXP(W.xp); else { save(); emit(); }
}

export function quitWords() { app.W = null; emit(); }
