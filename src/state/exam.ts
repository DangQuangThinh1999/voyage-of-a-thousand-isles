// Đề kiểm tra do AI (Gemini) soạn: bấm Kiểm tra → soạn nền (có thanh tiến trình, đi trang khác vẫn chạy) → xong hiện popup vào làm.
// Đề chưa làm được giữ tới hết ngày. Mỗi lần làm lại là một đề MỚI. Làm hết 4 kỹ năng rồi nộp → chấm một lần (đáp án + AI sửa trọn bài).
import { aiFetch } from '../lib/ai';
import { unitById, type Unit } from '../data';
import { bankRange } from '../data/bank';
import { KINDS, levelNow, tallySkill, unitProg, vocabWeekSize, weekUnits } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { promoteWords } from '../lib/srs';
import { norm } from '../lib/text';
import { dayKey, sample } from '../lib/util';
import { stopSpeaking } from '../lib/speech';
import { addXP, app, askConfirm, emit, go, save, toast } from './store';

export interface ExamQ { type: 'mcq' | 'tfng' | 'type'; q: string; q_vi: string; options: string[]; answer: number; answer_text: string; ipa: string; evidence: string; why_vi: string }
export interface Line { en: string; vi: string }
export interface Exam {
  listening: { title: string; accent: string; script: Line[]; questions: ExamQ[] };
  reading: { title: string; source: string; passage: Line[]; questions: ExamQ[] };
  vocab: { questions: ExamQ[] };
  writing: { task: string; vi: string; minWords: number; ideas: string[]; model: string; model_vi: string };
  speaking: { part1: Line[]; part2: { cue: string; vi: string; points: string[] }; part3: Line[]; model: string };
}
interface Bands { name: string; band: number; comment_vi: string }
interface Err { original: string; corrected: string; type_vi: string; explain_vi: string }
export interface Graded {
  writing: { band: number; bands: Bands[]; errors: Err[]; corrected: string; upgraded: string; strengths_vi: string[]; next_vi: string[] };
  speaking: { band: number; bands: Bands[]; errors: Err[]; answers: { q: string; corrected: string; upgraded: string }[]; strengths_vi: string[]; next_vi: string[] };
  summary_vi: string; model?: string;
}
export type SecKey = 'listening' | 'reading' | 'vocab';
export interface ExamResult { score: Record<SecKey, [ok: number, total: number]>; bands: Record<'listening' | 'reading' | 'writing' | 'speaking', number>; overall: number; passed: boolean; ai: Graded | null; aiErr?: string }
export interface ExamState {
  key: string; title: string; day: string; cefr: string; band: string;
  /** nguồn đề: có sẵn (bank, sid = id file, idx = thứ tự 1–3) hoặc AI soạn mới */
  src?: 'bank' | 'ai'; sid?: string; idx?: number;
  status: 'gen' | 'ready' | 'grading' | 'done' | 'error';
  parts: Record<'lr' | 'vg' | 'ws', 'wait' | 'ok' | 'err'>; started: number; err?: string;
  exam?: Partial<Exam>;
  ans: { q: Record<string, number | string>; writing: string; speak: Record<string, string>; tries: Record<string, number>; plays: number };
  result?: ExamResult;
}

const LS = 'ht.exam.v1';
export const MAX_PLAYS = 3, MAX_TRIES = 5;
/** Các đề của hôm nay (đề cũ hơn tự xoá khi mở app) */
function loadAll(): Record<string, ExamState> {
  try {
    const all = JSON.parse(localStorage.getItem(LS) || '{}') as Record<string, ExamState>, d = dayKey();
    for (const k of Object.keys(all)) {
      const e = all[k];
      if (e.day !== d) { delete all[k]; continue; }
      // tải lại trang giữa chừng: đang soạn → mất, đang chấm → cho nộp lại
      if (e.status === 'gen') e.status = hasAll(e) ? 'ready' : 'error';
      if (e.status === 'grading') e.status = 'ready';
    }
    return all;
  } catch { return {}; }
}
export const EXAMS: Record<string, ExamState> = typeof localStorage !== 'undefined' ? loadAll() : {};
let saveT: ReturnType<typeof setTimeout> | undefined;
export function persistExams() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(EXAMS)); } catch { /* đầy bộ nhớ: bỏ qua */ } }, 300); }
const flush = () => { clearTimeout(saveT); try { localStorage.setItem(LS, JSON.stringify(EXAMS)); } catch { /* bỏ qua */ } };
if (typeof addEventListener !== 'undefined') { addEventListener('pagehide', flush); addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); }); }
const hasAll = (E: ExamState) => !!(E.exam && E.exam.listening && E.exam.reading && E.exam.vocab && E.exam.writing && E.exam.speaking);

/** Đề đang mở trên trang /de-thi */
export const curExam = (): ExamState | null => (app.arg && EXAMS[app.arg]) || null;
/** Đề đang soạn (để hiện thanh tiến trình nổi ở mọi trang) */
export const genExams = () => Object.values(EXAMS).filter((e) => e.status === 'gen');

interface Ctx { key: string; title: string; cefr: string; band: string; topics: string; words: string[]; units: Unit[] }
async function contextOf(key: string): Promise<Ctx> {
  const P = app.P, RM = roadmap(P);
  const learned = Object.keys(P.srs);
  if (key[0] === 'w') {
    const n = +key.slice(1), size = vocabWeekSize(P), units = weekUnits(n), g = RM[n] || RM[Object.keys(RM).length];
    let week: string[] = [];
    try { week = (await bankRange((n - 1) * size, n * size)).map((x) => x.w); } catch { /* không tải được kho từ: dùng từ đã học */ }
    const unitWords = units.flatMap((u) => u.words.map(([en]) => en));
    return { key, title: `Kiểm tra tuần ${n}`, cefr: g?.cefr || 'A2', band: g?.band || '4.0', topics: [g?.goal, ...units.map((u) => u.title)].filter(Boolean).join('; '),
      words: [...new Set([...sample(unitWords, 40), ...sample(week, 50), ...sample(learned, 50)])], units };
  }
  const u = unitById(key.slice(1)) as Unit, g = RM[u.week] || { cefr: 'A2', band: '4.0', goal: '' };
  return { key, title: `Kiểm tra chủ đề ${u.title}`, cefr: g.cefr, band: g.band, topics: u.title, words: [...new Set([...u.words.map(([en]) => en), ...sample(learned, 40)])], units: [u] };
}

async function post(body: unknown) {
  const r = await aiFetch('/api/exam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.msg || (d.error === 'not_configured' ? 'Chưa cài khoá AI' : d.error === 'quota' ? 'AI hết lượt miễn phí, thử lại sau ít phút' : r.status === 404 ? 'Máy chủ AI chưa bật (chỉ chạy trên web đã deploy)' : 'AI đang bận, thử lại sau'));
  return d;
}

// ---------- đề có sẵn: 3 đề mỗi tuần (tuần 1–12 theo tuần, các tuần sau theo mức band) ----------
const BANK = import.meta.glob<{ default: { id: string; cefr: string; band: string; exam: Exam } }>('../../data/exams/*.json');
/** id 3 đề có sẵn của một bài kiểm tra tuần (chỉ những đề đã có file) */
export function bankIds(key: string): string[] {
  if (key[0] !== 'w') return [];
  const n = +key.slice(1), g = roadmap(app.P)[n];
  const base = n <= 12 ? `w${String(n).padStart(2, '0')}` : g ? `b${g.band}` : '';
  return [1, 2, 3].map((k) => `${base}-${k}`).filter((id) => BANK[`../../data/exams/${id}.json`]);
}
export const bankDone = (id: string) => (app.P.exd || []).includes(id);
/** Mở một đề có sẵn (đề chưa làm đầu tiên, hoặc đề sid chỉ định để làm lại) */
export async function openBankExam(key: string, sid: string) {
  const ids = bankIds(key), m = await BANK[`../../data/exams/${sid}.json`]();
  const ctx = await contextOf(key), X = JSON.parse(JSON.stringify(m.default.exam)) as Exam;
  validate(X);
  EXAMS[key] = { key, title: ctx.title, day: dayKey(), cefr: m.default.cefr, band: m.default.band, status: 'ready', src: 'bank', sid, idx: ids.indexOf(sid) + 1,
    parts: { lr: 'ok', vg: 'ok', ws: 'ok' }, started: Date.now(), exam: X, ans: { q: {}, writing: '', speak: {}, tries: {}, plays: 0 } };
  persistExams(); openExam(key); emit();
}

/** Bấm Kiểm tra tuần / chủ đề: có đề hôm nay chưa làm → mở luôn; còn đề có sẵn chưa làm → mở đề đó; hết → AI soạn đề mới */
export function requestExam(key: string, fresh = false) {
  const E = EXAMS[key];
  if (E && E.status === 'gen') { toast('Đề đang được soạn, chờ chút nhé…'); return; }
  if (E && E.status === 'ready' && !fresh) { openExam(key); return; }
  const next = bankIds(key).find((id) => !bankDone(id));
  if (next) { openBankExam(key, next); return; }
  generate(key);
}
/** Bỏ qua đề có sẵn, soạn ngay đề mới bằng AI */
export function aiExam(key: string) { delete EXAMS[key]; generate(key); }
export function openExam(key: string) { go('exam', key); }

async function generate(key: string) {
  const ctx = await contextOf(key);
  const E: ExamState = { key, title: ctx.title, day: dayKey(), cefr: ctx.cefr, band: ctx.band, status: 'gen', src: 'ai', parts: { lr: 'wait', vg: 'wait', ws: 'wait' }, started: Date.now(), exam: {},
    ans: { q: {}, writing: '', speak: {}, tries: {}, plays: 0 } };
  EXAMS[key] = E; emit();
  toast('🌍 Đang lấy đề từ khắp thế giới… bạn có thể học tiếp, xong sẽ báo');
  const base = { cefr: ctx.cefr, band: ctx.band, target: app.P.settings.target, now: levelNow(app.P), topics: ctx.topics, words: ctx.words };
  const job = (part: 'lr' | 'vg' | 'ws') => post({ ...base, part }).then((d) => {
    if (EXAMS[key] !== E) return;
    if (part === 'lr') { E.exam!.listening = d.listening; E.exam!.reading = d.reading; }
    else if (part === 'vg') E.exam!.vocab = { questions: d.questions };
    else { E.exam!.writing = d.writing; E.exam!.speaking = d.speaking; }
    E.parts[part] = 'ok'; emit();
  }).catch((e: Error) => { E.parts[part] = 'err'; E.err = e.message; emit(); });
  // chạy lần lượt cách nhau một chút để không vượt giới hạn gói miễn phí
  await Promise.all([job('lr'), new Promise((r) => setTimeout(r, 1500)).then(() => job('vg')), new Promise((r) => setTimeout(r, 3000)).then(() => job('ws'))]);
  if (EXAMS[key] !== E) return;
  // phần nào lỗi thì thử lại một lần
  for (const p of ['lr', 'vg', 'ws'] as const) if (E.parts[p] === 'err') { E.parts[p] = 'wait'; emit(); await job(p); }
  if (!hasAll(E)) { E.status = 'error'; emit(); persistExams(); toast('⚠️ Chưa soạn được đề: ' + (E.err || 'lỗi')); return; }
  validate(E.exam as Exam);
  E.status = 'ready'; E.err = undefined; emit(); persistExams();
  if (app.scr === 'exam' && app.arg === key) return;
  askConfirm({ icon: '📝', title: `Đề ${ctx.title.toLowerCase()} đã soạn xong!`, msg: 'Đề gồm Nghe · Đọc · Từ vựng & Ngữ pháp · Viết · Nói, có sẵn đáp án và giải thích (chỉ hiện sau khi nộp). Nếu chưa làm, đề được giữ tới hết hôm nay.', ok: 'Vào làm bài', cancel: 'Để sau' })
    .then((ok) => { if (ok) openExam(key); });
}

/** Sửa nhẹ dữ liệu AI trả về để không lỗi giao diện (thiếu lựa chọn, chỉ số đáp án sai…) */
function validate(X: Exam) {
  const fix = (qs: ExamQ[]) => qs.filter((q) => {
    if (q.type === 'tfng') q.options = ['True', 'False', 'Not Given'];
    // câu gõ đáp án là tên người / tên riêng (viết hoa, không ở đầu câu) → bỏ, vì khó đánh vần và dễ chấm sai
    if (q.type === 'type') return !!q.answer_text && !q.answer_text.split('|').some((a) => /^[A-Z][a-z'-]+( [A-Z][a-z'-]+)*$/.test(a.trim()) && !/^_{3,}/.test(q.q.trim()));
    return Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length;
  });
  X.listening.questions = fix(X.listening.questions || []);
  X.reading.questions = fix(X.reading.questions || []);
  X.vocab.questions = fix(X.vocab.questions || []);
}

export const qid = (sec: SecKey, i: number) => `${sec}.${i}`;
/** Đáp án gõ: chấp nhận mọi cách viết trong answer_text (ngăn bằng |), không phân biệt hoa thường, dấu câu */
export function typedOk(q: ExamQ, v: unknown) {
  const a = norm(String(v || '')).replace(/^(a|an|the) /, '');
  return !!a && q.answer_text.split('|').some((x) => { const b = norm(x).replace(/^(a|an|the) /, ''); return a === b || a.replace(/s$/, '') === b.replace(/s$/, ''); });
}
export const isRight = (q: ExamQ, v: unknown) => (q.type === 'type' ? typedOk(q, v) : v === q.answer);
export const SPEAK_QS = (X: Exam) => [...X.speaking.part1.map((x) => x.en), X.speaking.part2.cue + ' You should say: ' + X.speaking.part2.points.join('; '), ...X.speaking.part3.map((x) => x.en)];

/** Đổi tỉ lệ đúng → band (theo bảng quy đổi IELTS Listening/Reading 40 câu) */
export function pctToBand(p: number) {
  const raw = p * 40, T: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2]];
  for (const [r, b] of T) if (raw >= r) return b;
  return p > 0 ? 1.5 : 0;
}
const half = (x: number) => Math.round(x * 2) / 2;

/** Nộp bài: chấm phần trắc nghiệm theo đáp án, gửi Viết + Nói cho AI chấm một lần */
export async function submitExam(E: ExamState) {
  const X = E.exam as Exam;
  stopSpeaking();
  E.status = 'grading'; emit();
  const score = {} as ExamResult['score'];
  for (const sec of ['listening', 'reading', 'vocab'] as SecKey[]) {
    const qs = X[sec].questions; let ok = 0;
    qs.forEach((q, i) => { if (isRight(q, E.ans.q[qid(sec, i)])) ok++; });
    score[sec] = [ok, qs.length];
  }
  const qs = SPEAK_QS(X);
  let ai: Graded | null = null, aiErr: string | undefined;
  try {
    ai = await post({ part: 'grade', cefr: E.cefr, band: E.band, target: app.P.settings.target, now: levelNow(app.P),
      writing: { task: X.writing.task, minWords: X.writing.minWords, text: E.ans.writing }, speaking: qs.map((q, i) => ({ q, a: E.ans.speak[i] || '' })) });
  } catch (e) { aiErr = (e as Error).message; }
  const pr = (k: SecKey) => (score[k][1] ? score[k][0] / score[k][1] : 0);
  const voc = pr('vocab');
  const bands = {
    listening: pctToBand(pr('listening')), reading: pctToBand(pr('reading')),
    // khi AI không chấm được: ước lượng thô theo phần Từ vựng & Ngữ pháp và độ dài bài
    writing: ai ? ai.writing.band : E.ans.writing.trim() ? Math.min(pctToBand(voc), 5) : 0,
    speaking: ai ? ai.speaking.band : Object.values(E.ans.speak).some((x) => x.trim()) ? Math.min(pctToBand(voc), 5) : 0,
  };
  const overall = half((bands.listening + bands.reading + bands.writing + bands.speaking) / 4);
  const passed = overall >= parseFloat(E.band) && voc >= 0.7;
  E.result = { score, bands, overall, passed, ai, aiErr };
  E.status = 'done';
  record(E);
  emit(); persistExams();
  app.scrollReq = 'top';
}

/** Lưu kết quả vào tiến độ: điểm tốt nhất, qua bài thì đánh dấu xong các bài học + đẩy từ lên hộp nhớ, cộng XP và kỹ năng */
function record(E: ExamState) {
  const P = app.P, R = E.result!, pct = Math.round(((R.overall / parseFloat(E.band || '4')) * 100));
  if (E.sid && !(P.exd || []).includes(E.sid)) P.exd = [...(P.exd || []), E.sid];
  if (!P.tests) P.tests = {};
  const prev = P.tests[E.key] || { best: 0, passed: false };
  P.tests[E.key] = { best: Math.max(prev.best || 0, Math.min(100, pct)), passed: !!(prev.passed || R.passed), date: dayKey() };
  const units = E.key[0] === 'w' ? weekUnits(+E.key.slice(1)) : [unitById(E.key.slice(1)) as Unit];
  if (R.passed) for (const u of units) { if (!u) continue; const up = unitProg(P, u.id); KINDS.forEach(([k]) => { up[k] = 1; }); promoteWords(P, u.words.map(([en]) => en)); }
  const X = E.exam as Exam;
  (['listening', 'reading'] as const).forEach((sec) => X[sec].questions.forEach((q, i) => tallySkill(P, sec === 'listening' ? 'listen' : 'read', isRight(q, E.ans.q[qid(sec, i)]))));
  tallySkill(P, 'write', R.bands.writing >= parseFloat(E.band)); tallySkill(P, 'speak', R.bands.speaking >= parseFloat(E.band));
  save();
  addXP(20 + R.score.listening[0] * 2 + R.score.reading[0] * 2 + R.score.vocab[0] * 2 + (R.passed ? 50 : 0));
}

/** Làm lại: xoá đề cũ, soạn đề mới hoàn toàn */
export function retakeExam(key: string) { delete EXAMS[key]; persistExams(); requestExam(key, true); }
export function saveAns() { persistExams(); }
