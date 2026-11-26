// Kho trạng thái nhỏ của app: tiến độ (P), màn hình đang xem, phiên làm bài (S), ôn từ (R), test micro (MT).
// Các hành động thay đổi trạng thái rồi gọi emit() để React vẽ lại.
import { useSyncExternalStore } from 'react';
import type { Unit } from '../data';
import { Cloud } from '../lib/cloud';
import type { Step, Skill } from '../lib/exercises';
import { addXPTo, freshKeep, load, mergeProgress, persist, today, type Kind, type Progress } from '../lib/progress';
import type { ReviewState } from '../lib/srs';
import type { WordsState } from './words';
import { configureSpeech, onVoicesChanged, stopSpeaking } from '../lib/speech';
import type { SpeechScore } from '../lib/text';

export type Screen = 'home' | 'unit' | 'session' | 'words' | 'review' | 'journal' | 'plan' | 'settings' | 'mic';

export type MicResult = (SpeechScore & { err?: undefined }) | { err: string };
export interface StepState {
  answered: boolean; picked: number[]; tries: number; result: MicResult | null; hint: boolean; showVi: boolean; plays: number;
  deadline?: number; correct?: boolean; fb?: string | null; correctIdx?: number; pickedIdx?: number; typed?: string;
  fixI?: number; line?: number; listening?: boolean; audio?: string | null; scored?: number; pushed?: boolean;
}
export interface Session {
  kind: Kind | 'test'; u: Unit; steps: Step[]; i: number; ok: number; graded: number; state: StepState; requeued: Set<number>;
  done?: { xp: number; passed?: boolean; pct?: number };
  // chỉ có ở bài kiểm tra
  intro?: boolean; units?: Unit[]; key?: string; title?: string; skill: Partial<Record<Skill, [number, number]>>;
}
export type MicTestResult = (SpeechScore & { audio: string | null; n: number; err?: undefined }) | { err: string };

export const app = {
  P: load() as Progress,
  scr: 'home' as Screen,
  arg: null as string | null,
  S: null as Session | null,
  R: null as ReviewState | null,
  W: null as WordsState | null,
  MT: { busy: false, res: null as MicTestResult | null },
  curSkill: null as string | null,
  toast: { msg: '', show: false },
  /** cuộn trang sau lần vẽ tiếp theo: 'top' hoặc id của phần tử */
  scrollReq: null as null | 'top' | string,
};

let version = 0;
const subs = new Set<() => void>();
export function emit() { version++; subs.forEach((f) => f()); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getVersion = () => version;
/** Dùng trong component: vẽ lại mỗi khi trạng thái app thay đổi */
export function useApp() { useSyncExternalStore(subscribe, getVersion); return app; }

// ---------- tiến độ ----------
export function save() {
  app.P.updated = Date.now();
  persist(app.P);
  Cloud.schedulePush();
}
export function addXP(n: number) { addXPTo(app.P, n); save(); emit(); }
export function mergeCloud(r: Progress) {
  const m = mergeProgress(app.P, r);
  if (!m) return;
  app.P = m; save();
}
export function resetProgress() { app.P = freshKeep(app.P, Date.now()); app.S = null; app.R = null; app.W = null; save(); }
/** Hook tiến độ: P + các hàm lưu */
export function useProgress() { const a = useApp(); return { P: a.P, save, addXP }; }

export const inTest = () => app.scr === 'session' && !!app.S && app.S.kind === 'test' && !app.S.done && !app.S.intro;

// ---------- điều hướng ----------
export function go(s: Screen, a: string | null = null) {
  stopSpeaking();
  app.scr = s; app.arg = a;
  app.curSkill = s === 'review' || s === 'words' ? 'review' : s === 'journal' ? 'write' : null;
  app.scrollReq = 'top';
  emit();
}
/** Đang làm bài dở thì hỏi trước khi rời đi */
export function leaveOk() {
  const S = app.S;
  if (app.scr === 'session' && S && !S.done && !S.intro) return confirm('Thoát bài đang làm? Kết quả bài này sẽ không được lưu.');
  return true;
}
export function tab(t: Screen, reset = false) {
  if (reset || t === 'review') app.R = null;
  go(t);
}
export function goWeek(w: number | string) { go('home'); app.scrollReq = 'wk-' + w; }

// ---------- thông báo ----------
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  app.toast = { msg, show: true }; emit();
  clearTimeout(toastT);
  toastT = setTimeout(() => { app.toast = { ...app.toast, show: false }; emit(); }, 2600);
}

// ---------- khởi động: đo thời gian học, giọng đọc, đồng bộ mây ----------
let started = false;
export function initApp() {
  if (started) return; started = true;
  configureSpeech(() => ({ rate: app.P.settings.rate, voice: app.P.settings.voice, fast: inTest() }));
  onVoicesChanged(() => { if (app.scr === 'settings') emit(); });
  let lastAct = Date.now();
  (['click', 'keydown', 'touchstart'] as const).forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => {
    const k = app.curSkill;
    if (!k || document.visibilityState !== 'visible' || Date.now() - lastAct > 90000) return;
    const d = today(app.P); d.sec[k] = (d.sec[k] || 0) + 15;
    if ((d.sec[k] / 15) % 4 === 0) save();
    emit();
  }, 15000);
  Cloud.init({ get: () => app.P, merge: mergeCloud, changed: () => emit() });
  addEventListener('pagehide', () => { persist(app.P); Cloud.push(); });
}
