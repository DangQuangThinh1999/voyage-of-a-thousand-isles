// Đề kiểm tra do AI (Gemini) soạn: bấm Kiểm tra → soạn nền (có thanh tiến trình, đi trang khác vẫn chạy) → xong hiện popup vào làm.
// Đề chưa làm được giữ tới hết ngày. Mỗi lần làm lại là một đề MỚI. Làm hết 4 kỹ năng rồi nộp → chấm một lần (đáp án + AI sửa trọn bài).
import { aiFetch } from '../lib/ai';
import { unitById, type Unit } from '../data';
import { bankRange } from '../data/bank';
import { KINDS, levelNow, tallySkill, unitProg, weekNow, weekUnits } from '../lib/progress';
import { roadmap, weekRange } from '../lib/roadmap';
import { promoteWords } from '../lib/srs';
import { norm } from '../lib/text';
import { dayKey, sample } from '../lib/util';
import { stopSpeaking } from '../lib/speech';
import { addXP, app, askConfirm, emit, go, save, toast } from './store';
import { Cloud } from '../lib/cloud';

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

/** Câu hỏi dựa vào giới tính người nói (the woman / the man…): giọng máy khó phân biệt → bỏ */
const GENDER_Q = /\b(wom[ae]n|m[ae]n|male|female|girl|boy|lady|gentleman)('s)?\b/i;
const genderQ = (q: ExamQ) => GENDER_Q.test(q.q);
/** Bỏ câu hỏi giới tính khỏi đề ĐANG LÀM, giữ đúng câu trả lời đã chọn của các câu còn lại */
function dropGender(E: ExamState) {
  if (!E.exam || E.result) return;
  for (const sec of ['listening', 'reading', 'vocab'] as const) {
    const box = E.exam[sec]; if (!box?.questions?.some(genderQ)) continue;
    const keep = box.questions.map((q, i) => [q, i] as const).filter(([q]) => !genderQ(q)), ans: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(E.ans.q)) if (!k.startsWith(sec + '.')) ans[k] = v;
    keep.forEach(([, old], i) => { const v = E.ans.q[`${sec}.${old}`]; if (v !== undefined) ans[`${sec}.${i}`] = v; });
    box.questions = keep.map(([q]) => q); E.ans.q = ans;
  }
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
      dropGender(e);
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
    const n = +key.slice(1), [ws, we] = weekRange(P, n), units = weekUnits(n), g = RM[n] || RM[Object.keys(RM).length];
    let week: string[] = [];
    try { week = (await bankRange(ws, we)).map((x) => x.w); } catch { /* không tải được kho từ: dùng từ đã học */ }
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

// ---------- đề có sẵn: (1) đề soạn sẵn trong app (data/exams), (2) KHO ĐỀ CHUNG trên máy chủ (đề AI ai soạn cũng lưu cho mọi người) ----------
const BANK = import.meta.glob<{ default: { id: string; cefr: string; band: string; exam: Exam } }>('../../data/exams/*.json');
/** Nhóm đề: tuần 1–12 theo tuần (w03), các tuần sau theo band (b6.5), chủ đề theo id bài (u…) */
export function baseOf(key: string): string {
  if (key[0] === 'u') return 'u' + key.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  const n = +key.slice(1), g = roadmap(app.P)[n];
  return n <= 12 ? `w${String(n).padStart(2, '0')}` : g ? `b${parseFloat(g.band).toFixed(1)}` : '';
}
/** id đề soạn sẵn trong app của một bài kiểm tra */
export function staticIds(key: string): string[] {
  const base = baseOf(key);
  return base[0] === 'u' ? [] : [1, 2, 3].map((k) => `${base}-${k}`).filter((id) => BANK[`../../data/exams/${id}.json`]);
}
const pool: Record<string, { at: number; ids: string[] }> = {};
/** id đề trong kho chung (dạng "db:<id>"), có bộ nhớ đệm 3 phút */
export async function poolIds(key: string, force = false): Promise<string[]> {
  const base = baseOf(key), c = pool[base];
  if (c && !force && Date.now() - c.at < 180_000) return c.ids;
  try {
    const r = await fetch('/api/bank?base=' + encodeURIComponent(base)), d = await r.json();
    const ids = (d.items || []).map((x: { id: string }) => 'db:' + x.id);
    pool[base] = { at: Date.now(), ids }; return ids;
  } catch { return c?.ids || []; }
}
/** Tất cả đề có sẵn của bài kiểm tra (soạn sẵn + kho chung) */
export async function bankIdsAll(key: string, force = false) { return [...staticIds(key), ...(await poolIds(key, force))]; }
export const bankIds = staticIds;
export const bankDone = (id: string) => (app.P.exd || []).includes(id);
/** Mở một đề có sẵn (đề soạn sẵn hoặc trong kho chung) */
export async function openBankExam(key: string, sid: string) {
  let m: { cefr: string; band: string; exam: Exam };
  try {
    if (sid.startsWith('db:')) { const r = await fetch('/api/bank?id=' + encodeURIComponent(sid.slice(3))); if (!r.ok) throw new Error(); m = await r.json(); }
    else m = (await BANK[`../../data/exams/${sid}.json`]()).default;
  } catch { toast('⚠️ Không tải được đề này, thử đề khác'); return; }
  const ids = await bankIdsAll(key), ctx = await contextOf(key), X = JSON.parse(JSON.stringify(m.exam)) as Exam;
  validate(X);
  EXAMS[key] = { key, title: ctx.title, day: dayKey(), cefr: m.cefr || ctx.cefr, band: m.band || ctx.band, status: 'ready', src: 'bank', sid, idx: ids.indexOf(sid) + 1,
    parts: { lr: 'ok', vg: 'ok', ws: 'ok' }, started: Date.now(), exam: X, ans: { q: {}, writing: '', speak: {}, tries: {}, plays: 0 } };
  persistExams(); openExam(key); emit();
  setTimeout(() => prefetchNext(key, sid), 5000);
}

/** Bấm Kiểm tra: đề hôm nay chưa làm → mở; còn đề có sẵn chưa làm (soạn sẵn → kho chung) → mở; hết → AI soạn đề mới (rồi lưu vào kho chung) */
export async function requestExam(key: string, fresh = false) {
  const E = EXAMS[key];
  if (E && E.status === 'gen') { toast('Đề đang được soạn, chờ chút nhé…'); return; }
  if (E && E.status === 'ready' && !fresh) { openExam(key); return; }
  const st = staticIds(key).find((id) => !bankDone(id));
  if (st) { openBankExam(key, st); return; }
  toast('📚 Đang tìm đề có sẵn trong kho…');
  const next = (await poolIds(key, true)).find((id) => !bankDone(id));
  if (next) { openBankExam(key, next); return; }
  generate(key);
}
/** Bỏ qua đề có sẵn, soạn ngay đề mới bằng AI */
export function aiExam(key: string) { delete EXAMS[key]; generate(key); }
export function openExam(key: string) { go('exam', key); }

/** Lưu đề vào kho chung để người khác làm được. Trả về id "db:…" hoặc null */
async function saveToPool(key: string, X: Exam, cefr: string, band: string): Promise<string | null> {
  try {
    const r = await aiFetch('/api/bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base: baseOf(key), cefr, band, exam: X }) });
    const d = await r.json(); if (!r.ok || !d.id) return null;
    delete pool[baseOf(key)]; return 'db:' + d.id;
  } catch { return null; }
}

/** Soạn ngầm 1 đề vào kho chung (không mở ra), dùng để luôn có đề sẵn cho lần sau / admin soạn trước */
export async function generateToPool(key: string, onPart?: (n: number) => void): Promise<string | null> {
  const ctx = await contextOf(key);
  const base = { cefr: ctx.cefr, band: ctx.band, target: app.P.settings.target, now: levelNow(app.P), topics: ctx.topics, words: ctx.words, stock: true, base: baseOf(key) };
  const X: Partial<Exam> = {};
  let n = 0;
  for (const part of ['lr', 'vg', 'ws'] as const) {
    let d;
    try { d = await post({ ...base, part }); } catch { try { await new Promise((r) => setTimeout(r, 4000)); d = await post({ ...base, part }); } catch { return null; } }
    if (part === 'lr') { X.listening = d.listening; X.reading = d.reading; } else if (part === 'vg') X.vocab = { questions: d.questions }; else { X.writing = d.writing; X.speaking = d.speaking; }
    onPart?.(++n);
  }
  validate(X as Exam);
  return saveToPool(key, X as Exam, ctx.cefr, ctx.band);
}
let prefetching = false;
/** Luôn giữ sẵn ≥ 1 đề chưa làm cho mỗi bài kiểm tra: khi người học mở đề có sẵn CUỐI CÙNG (vd đã làm đề 1, 2 → mở đề 3),
 *  app soạn ngầm đề tiếp theo (đề 4) vào kho chung để lần sau có ngay, không phải làm lại đề cũ. */
export async function prefetchNext(key: string, current?: string) {
  if (prefetching || !Cloud.user) return;
  const left = (await bankIdsAll(key, true)).filter((id) => !bankDone(id) && id !== current);
  if (left.length) return;
  prefetching = true;
  const id = await generateToPool(key).catch(() => null);
  prefetching = false;
  if (id) toast('📚 Đã chuẩn bị sẵn đề tiếp theo cho lần sau');
}

// ---------- tự chuẩn bị kho đề theo level: tuần đang học + tuần kế tiếp, mỗi nhóm đủ 3 đề ----------
const STOCK_LS = 'ht.stock.v1', STOCK_PER_DAY = 2;
let stocking = false;
/** Chạy ngầm khi người học đang rảnh: kho của tuần hiện tại / tuần sau còn < 3 đề thì soạn thêm 1 đề (không trừ lượt người học) */
export async function autoStock() {
  if (stocking || !Cloud.user) return;
  let st = { day: '', n: 0 };
  try { st = JSON.parse(localStorage.getItem(STOCK_LS) || '{"day":"","n":0}'); } catch { /* bỏ qua */ }
  if (st.day !== dayKey()) st = { day: dayKey(), n: 0 };
  if (st.n >= STOCK_PER_DAY) return;
  const w = weekNow(app.P), keys = [...new Set(['w' + w, 'w' + (w + 1)])].filter((k) => baseOf(k));
  for (const key of keys) {
    const have = (await bankIdsAll(key, true)).length - staticIds(key).length;
    if (have >= 3) continue;
    stocking = true;
    const id = await generateToPool(key).catch(() => null);
    stocking = false;
    if (id) { st.n++; try { localStorage.setItem(STOCK_LS, JSON.stringify(st)); } catch { /* bỏ qua */ } }
    return; // mỗi lần chạy chỉ soạn 1 đề
  }
}
let lastAct = Date.now();
/** Bật tự chuẩn bị kho đề: 1 phút sau khi mở app, rồi mỗi 20 phút nếu người học không thao tác ≥ 2 phút */
export function startAutoStock() {
  (['keydown', 'pointerdown'] as const).forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setTimeout(() => { if (Date.now() - lastAct > 30_000) autoStock(); }, 60_000);
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - lastAct > 120_000) autoStock(); }, 20 * 60_000);
}

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
  // lưu vào kho chung để người khác cũng làm được; đánh dấu id để không gặp lại
  saveToPool(key, E.exam as Exam, E.cefr, E.band).then((id) => { if (id && EXAMS[key] === E) { E.sid = id; persistExams(); } setTimeout(() => prefetchNext(key, id || undefined), 20000); });
  if (app.scr === 'exam' && app.arg === key) return;
  askConfirm({ icon: '📝', title: `Đề ${ctx.title.toLowerCase()} đã soạn xong!`, msg: 'Đề gồm Nghe · Đọc · Từ vựng & Ngữ pháp · Viết · Nói, có sẵn đáp án và giải thích (chỉ hiện sau khi nộp). Nếu chưa làm, đề được giữ tới hết hôm nay.', ok: 'Vào làm bài', cancel: 'Để sau' })
    .then((ok) => { if (ok) openExam(key); });
}

/** Sửa nhẹ dữ liệu AI trả về để không lỗi giao diện (thiếu lựa chọn, chỉ số đáp án sai…) */
function validate(X: Exam) {
  const fix = (qs: ExamQ[]) => qs.filter((q) => {
    if (genderQ(q)) return false;
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
  setTimeout(() => prefetchNext(E.key, E.sid), 3000);
  addXP(20 + R.score.listening[0] * 2 + R.score.reading[0] * 2 + R.score.vocab[0] * 2 + (R.passed ? 50 : 0));
}

/** Làm lại: xoá đề cũ, soạn đề mới hoàn toàn */
export function retakeExam(key: string) { delete EXAMS[key]; persistExams(); requestExam(key, true); }
export function saveAns() { persistExams(); }
