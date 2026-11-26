// Tiến độ học: lưu trong localStorage (khóa 'ht55.progress.v1'), gộp với bản trên mây.
import { UNITS, WEEK_GOALS, type Unit } from '../data';
import { addDays, dayKey, daysBetween } from './util';

export const STORE = 'ht55.progress.v1';
export const TOTAL_DAYS = 90;

export type Kind = 'vocab' | 'listen' | 'speak' | 'read' | 'write';
export type KindInfo = [kind: Kind, icon: string, name: string, desc: string];
export const KINDS: KindInfo[] = [
  ['vocab', '📚', 'Từ vựng', 'Học từ mới bằng hình + âm thanh'],
  ['listen', '🎧', 'Nghe', 'Nghe chọn nghĩa, nghe chép câu'],
  ['speak', '🗣️', 'Nói', 'Đọc to, máy chấm phát âm'],
  ['read', '📖', 'Đọc', 'Đọc đoạn văn ngắn, trả lời câu hỏi'],
  ['write', '✍️', 'Viết', 'Đánh vần, xếp câu, tự viết câu'],
];
export const SKILL_OF: Record<Kind, string> = { vocab: 'review', listen: 'listen', speak: 'speak', read: 'read', write: 'write' };
export const PLAN_KEYS = ['listen', 'speak', 'read', 'write', 'review'];

/** nw = số từ mới (kho từ) đã học trong ngày */
export interface Day { xp: number; sec: Record<string, number>; nw?: number }
/** f = file kho từ chứa từ này (không có = từ trong bài học) */
export interface SrsCard { b: number; due: string; f?: string; k?: 1 }
export interface JournalEntry { id: number; d: string; u: string; t: string }
export interface TestResult { best: number; passed: boolean; date?: string }
/** wpd = số từ mới mỗi ngày */
export interface Settings { rate: number; voice: string; goalMin: number; wpd: number; target: string; theme: 'dark' | 'light' }
export interface Progress {
  v: 1; xp: number; streak: number; lastDay: string;
  days: Record<string, Day>;
  units: Record<string, Partial<Record<Kind, number>>>;
  srs: Record<string, SrsCard>;
  journal: JournalEntry[];
  tests: Record<string, TestResult>;
  settings: Settings; startDate: string; updated: number; seenIntro: boolean;
  /** ngày bắt đầu học kho từ (để tính lịch từ vựng) */
  vStart?: string;
  /** câu người học tự viết cho từng từ (hiện lại khi ôn) */
  vs?: Record<string, string>;
  /** thời điểm xóa tiến độ: dữ liệu cũ hơn mốc này (ở máy khác, trên mây) bị bỏ qua khi gộp */
  resetAt?: number;
  /** tên hiển thị trên bảng xếp hạng, số lần đã đặt/đổi tên, điểm đã tiêu (đổi tên…) */
  nick?: string; nickN?: number; spent?: number;
  /** thống kê từng kỹ năng: [đúng, tổng] */
  sk?: Record<string, [number, number]>;
  /** ngữ pháp đã học (làm đúng câu thử) */
  gram?: Record<string, number>;
  /** luyện 20 câu mỗi bài ngữ pháp: số câu đúng tốt nhất */
  drill?: Record<string, number>;
  /** đề kiểm tra có sẵn đã làm (id file trong data/exams) */
  exd?: string[];
  /** kiểm tra mốc 100 từ: điểm tốt nhất theo số mốc */
  ms?: Record<string, number>;
  /** sổ lỗi sai: câu sai → câu đúng, số lần tự sửa đúng (đủ 3 lần là đã thuộc) */
  mist?: { id: number; d: string; wrong: string; right: string; why: string; ok: number }[];
  /** các lần luyện nói / viết có chấm */
  coach?: { d: string; k: 'speak' | 'write'; band: number; words: number; err: number }[];
}

export const fresh = (): Progress => ({ v: 1, xp: 0, streak: 0, lastDay: '', days: {}, units: {}, srs: {}, journal: [], tests: {},
  settings: { rate: 0.85, voice: '', goalMin: 210, wpd: 30, target: '5.5', theme: 'dark' }, startDate: dayKey(), updated: 0, seenIntro: false });

/** Xóa tiến độ một lần cho mọi máy: 26/11/2026, các bài kiểm tra lúc app còn dang dở không tính */
export const RESET_AT = 1795664612984;
/** Tiến độ mới, chỉ giữ cài đặt (giọng đọc, tốc độ, mục tiêu) */
export const freshKeep = (P: Progress, at: number): Progress => ({ ...fresh(), settings: { ...fresh().settings, ...(P.settings || {}) }, seenIntro: true, resetAt: at, updated: Date.now() });

// Chế độ KHÁCH (chưa đăng nhập): tiến độ chỉ giữ trong sessionStorage → đóng trang là mất.
// Đã đăng nhập: lưu localStorage (bộ nhớ đệm) + lên mây.
let guest = false;
export const isGuest = () => guest;
export function setGuest(on: boolean) { guest = on; }

export function load(): Progress {
  try {
    let raw = localStorage.getItem(STORE);
    // không có bản lưu của người đã đăng nhập trên máy → coi là khách ngay từ đầu (chờ Firebase xác nhận)
    if (!raw) { guest = true; try { raw = sessionStorage.getItem(STORE); } catch { /* bỏ qua */ } }
    const o = JSON.parse(raw || 'null');
    if (o && o.v === 1) {
      const P: Progress = { ...fresh(), ...o, settings: { ...fresh().settings, ...(o.settings || {}) } };
      if ((P.resetAt || 0) < RESET_AT) { const n = freshKeep(P, RESET_AT); persist(n); return n; }
      return P;
    }
  } catch { /* bộ nhớ trình duyệt bị chặn */ }
  return fresh();
}
export function persist(P: Progress) {
  const data = JSON.stringify(P);
  try {
    if (guest) { sessionStorage.setItem(STORE, data); localStorage.removeItem(STORE); }
    else { localStorage.setItem(STORE, data); sessionStorage.removeItem(STORE); }
  } catch { /* bỏ qua */ }
}

export function today(P: Progress): Day {
  const k = dayKey();
  if (!P.days[k]) P.days[k] = { xp: 0, sec: {} };
  return P.days[k];
}
export const streakNow = (P: Progress) => (P.lastDay === dayKey() || P.lastDay === addDays(dayKey(), -1) ? P.streak : 0);
/** Cộng XP và cập nhật chuỗi ngày (chưa lưu) */
export function addXPTo(P: Progress, n: number) {
  const k = dayKey();
  if (P.lastDay !== k) { P.streak = P.lastDay === addDays(k, -1) ? P.streak + 1 : 1; P.lastDay = k; }
  P.xp += n; today(P).xp += n;
}
/** Số từ trong kho đã học (có trong thẻ ôn) */
let blCache = { p: null as Progress | null, u: -1, n: 0 };
export function bankLearned(P: Progress) {
  if (blCache.p !== P || blCache.u !== P.updated) blCache = { p: P, u: P.updated, n: Object.values(P.srs).filter((c) => c.f).length };
  return blCache.n;
}
/** Từ vựng rải đều theo tuần: mỗi tuần 7 × số từ/ngày, học theo thứ tự nên tuần w gồm phần (w-1)·size … w·size */
export const vocabWeekSize = (P: Progress) => P.settings.wpd * 7;
export function vocabWeek(P: Progress, w: number) {
  const size = vocabWeekSize(P);
  return { size, done: Math.max(0, Math.min(size, bankLearned(P) - (w - 1) * size)) };
}
/** Số từ đáng lẽ đã học tới hôm nay trừ số đã học (dương = đang chậm) */
export const vocabBehind = (P: Progress) => (P.vStart ? (daysBetween(P.vStart, dayKey()) + 1) * P.settings.wpd - bankLearned(P) : 0);
export const weekNow = (P: Progress) => Math.ceil(dayNumber(P) / 7);
export const newWordsToday = (P: Progress) => (P.days[dayKey()] || { nw: 0 }).nw || 0;
/** Các mức mục tiêu IELTS người học chọn được */
export const TARGETS = ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];
/** Cộng 1 lượt trả lời vào thống kê kỹ năng */
export function tallySkill(P: Progress, skill: string, ok: boolean) {
  const sk = P.sk || (P.sk = {}), v = sk[skill] || (sk[skill] = [0, 0]);
  v[1]++; if (ok) v[0]++;
}
/** Lưu một lỗi sai vào sổ (bỏ qua nếu đã có câu sai giống hệt) */
export function addMistake(P: Progress, wrong: string, right: string, why: string) {
  if (!right || right.trim() === wrong.trim()) return;
  const L = P.mist || (P.mist = []);
  if (L.some((x) => x.wrong === wrong)) return;
  L.unshift({ id: Date.now(), d: dayKey(), wrong, right, why, ok: 0 });
  if (L.length > 300) L.length = 300;
}
export const unitProg = (P: Progress, id: string) => P.units[id] || (P.units[id] = {});
export const doneCount = (P: Progress, id: string) => KINDS.filter(([k]) => (P.units[id] || {})[k]).length;
export const unlocked = (P: Progress, i: number) => i === 0 || doneCount(P, UNITS[i - 1].id) >= 3;
export const minutesToday = (P: Progress) => Math.floor(Object.values(today(P).sec || {}).reduce((a, b) => a + b, 0) / 60);
export const dayNumber = (P: Progress) => Math.min(TOTAL_DAYS, daysBetween(P.startDate, dayKey()) + 1);
export const weekUnits = (w: number) => UNITS.filter((u) => u.week === w);
export const weekDone = (P: Progress, w: number) => { const us = weekUnits(w); return us.length > 0 && us.every((u) => doneCount(P, u.id) === 5); };

// Trình độ ước tính = tuần cao nhất đã xong liên tục từ tuần 1
export function levelNow(P: Progress): string {
  let lv: string | null = null;
  for (const w of Object.keys(WEEK_GOALS).map(Number).sort((a, b) => a - b)) {
    if (weekDone(P, w)) lv = WEEK_GOALS[w].band; else break;
  }
  return lv || 'dưới 2.0';
}

export function nextTask(P: Progress): { u: Unit; k: KindInfo } | null {
  for (let i = 0; i < UNITS.length; i++) {
    if (!unlocked(P, i)) break;
    const k = KINDS.find(([k]) => !(P.units[UNITS[i].id] || {})[k]);
    if (k) return { u: UNITS[i], k };
  }
  return null;
}

// Gộp tiến độ trên mây với tiến độ trên máy (không mất bài nào đã làm)
export function mergeProgress(P: Progress, r: Progress | null | undefined): Progress | null {
  if (!r || r.v !== 1) return null;
  // Bên nào cũ hơn lần xóa tiến độ gần nhất thì bỏ, không gộp
  const rs = Math.max(P.resetAt || 0, r.resetAt || 0, RESET_AT);
  if ((r.updated || 0) < rs) return null;
  if ((P.updated || 0) < rs) return { ...fresh(), ...r, settings: { ...fresh().settings, ...(r.settings || {}) } };
  const newer = (r.updated || 0) > (P.updated || 0) ? r : P, older = newer === r ? P : r;
  const m: Progress = { ...fresh(), ...newer, settings: { ...fresh().settings, ...(newer.settings || {}) } };
  m.xp = Math.max(P.xp || 0, r.xp || 0);
  m.startDate = [P.startDate, r.startDate].filter(Boolean).sort()[0] || dayKey();
  m.vStart = [P.vStart, r.vStart].filter(Boolean).sort()[0];
  m.vs = { ...(older.vs || {}), ...(newer.vs || {}) };
  m.gram = { ...(older.gram || {}), ...(newer.gram || {}) };
  m.ms = { ...(older.ms || {}) };
  for (const [k, v] of Object.entries(newer.ms || {})) m.ms[k] = Math.max(v, m.ms[k] || 0);
  m.exd = [...new Set([...(older.exd || []), ...(newer.exd || [])])];
  m.drill = { ...(older.drill || {}) };
  for (const [k, v] of Object.entries(newer.drill || {})) m.drill[k] = Math.max(v, m.drill[k] || 0);
  // Tên: lấy bên đã đổi nhiều lần hơn; điểm đã tiêu không bao giờ giảm khi đồng bộ
  m.nickN = Math.max(P.nickN || 0, r.nickN || 0); m.nick = ((P.nickN || 0) >= (r.nickN || 0) ? P.nick : r.nick) || P.nick || r.nick;
  m.spent = Math.max(P.spent || 0, r.spent || 0);
  { const byId = new Map<number, NonNullable<Progress['mist']>[number]>(); for (const x of [...(older.mist || []), ...(newer.mist || [])]) { const o = byId.get(x.id); if (!o || x.ok >= o.ok) byId.set(x.id, x); } m.mist = [...byId.values()].sort((a, b) => b.id - a.id).slice(0, 300); }
  m.sk = { ...(older.sk || {}) };
  for (const [k, v] of Object.entries(newer.sk || {})) { const o = m.sk[k] || [0, 0]; m.sk[k] = v[1] >= o[1] ? v : o; }
  m.coach = [...(newer.coach || []), ...(older.coach || [])].filter((c, i, a) => a.findIndex((x) => x.d === c.d && x.k === c.k && x.words === c.words) === i).slice(0, 60);
  m.resetAt = Math.max(P.resetAt || 0, r.resetAt || 0) || undefined;
  m.units = { ...(older.units || {}) };
  for (const [id, v] of Object.entries(newer.units || {})) m.units[id] = { ...(m.units[id] || {}), ...v };
  m.days = { ...(older.days || {}) };
  for (const [k, d] of Object.entries(newer.days || {})) {
    const o = m.days[k] || { xp: 0, sec: {} }, sec = { ...(o.sec || {}) };
    for (const [s, v] of Object.entries(d.sec || {})) sec[s] = Math.max(sec[s] || 0, v);
    m.days[k] = { xp: Math.max(o.xp || 0, d.xp || 0), sec, nw: Math.max(o.nw || 0, d.nw || 0) };
  }
  m.tests = { ...(older.tests || {}) };
  for (const [k, v] of Object.entries(newer.tests || {})) { const o = m.tests[k] || ({} as Partial<TestResult>); m.tests[k] = { ...v, best: Math.max(o.best || 0, v.best || 0), passed: !!(o.passed || v.passed) }; }
  m.srs = { ...(older.srs || {}) };
  for (const [w, v] of Object.entries(newer.srs || {})) if (!m.srs[w] || v.b >= m.srs[w].b) m.srs[w] = v;
  const ids = new Set<number>(), j: JournalEntry[] = [];
  for (const e of [...(newer.journal || []), ...(older.journal || [])]) if (!ids.has(e.id)) { ids.add(e.id); j.push(e); }
  m.journal = j.sort((a, b) => b.id - a.id);
  return m;
}
