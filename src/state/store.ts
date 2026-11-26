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

export type Screen = 'home' | 'unit' | 'session' | 'words' | 'review' | 'grammar' | 'speak' | 'skills' | 'journal' | 'stats' | 'plan' | 'settings' | 'mic';

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
  intro?: boolean; units?: Unit[]; key?: string; title?: string; failAt?: number; skill: Partial<Record<Skill, [number, number]>>;
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
export function emit() { syncHash(); version++; subs.forEach((f) => f()); }

// ---------- đường dẫn (URL): mỗi trang một địa chỉ, tải lại vẫn ở đúng chỗ, nút Quay lại hoạt động ----------
const ROUTES: Screen[] = ['home', 'unit', 'words', 'review', 'grammar', 'speak', 'skills', 'journal', 'stats', 'plan', 'settings', 'mic'];
function pathOf(): string {
  // Đang làm bài (không khôi phục được khi tải lại) → địa chỉ của chủ đề đang học
  if (app.scr === 'session') return app.S ? '#/unit/' + encodeURIComponent(app.S.u.id) : '#/home';
  return '#/' + app.scr + (app.scr === 'unit' && app.arg ? '/' + encodeURIComponent(app.arg) : '');
}
function syncHash() {
  if (typeof location === 'undefined') return;
  const want = pathOf(), [cur] = location.hash.split('?');
  if ((cur || '#/home') !== want) history.pushState(null, '', want);
}
/** Đọc địa chỉ hiện tại → trang. Trả về true nếu đổi trang */
export function readHash(): boolean {
  const m = location.hash.match(/^#\/([a-z]+)(?:\/([^?]*))?/);
  const s = (m && ROUTES.includes(m[1] as Screen) ? m[1] : 'home') as Screen, a = m && m[2] ? decodeURIComponent(m[2]) : null;
  if (app.scr === 'session' && app.S && s === 'unit' && a === app.S.u.id) return false;
  if (s === app.scr && a === app.arg) return false;
  app.scr = s; app.arg = s === 'unit' ? a : null; app.scrollReq = 'top';
  return true;
}
/** Tham số con trong địa chỉ (phần sau dấu ?), ví dụ tab con: #/speak?t=ielts&p=2 */
export function getParam(key: string): string | null { return new URLSearchParams(location.hash.split('?')[1] || '').get(key); }
export function setParam(key: string, v: string | null) {
  const [p, q = ''] = location.hash.split('?'), sp = new URLSearchParams(q);
  if (v === null || v === '') sp.delete(key); else sp.set(key, v);
  const qs = sp.toString(); history.replaceState(null, '', (p || '#/home') + (qs ? '?' + qs : ''));
}
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
  app.curSkill = s === 'review' || s === 'words' ? 'review' : s === 'journal' ? 'write' : s === 'speak' ? 'speak' : s === 'grammar' ? 'read' : s === 'skills' ? 'listen' : null;
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
if (typeof location !== 'undefined') readHash();
let started = false;
export function initApp() {
  if (started) return; started = true;
  document.documentElement.dataset.theme = app.P.settings.theme || 'dark';
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
  // Nút Quay lại / Tiến tới của trình duyệt
  addEventListener('popstate', () => { if (app.scr === 'session' && app.S && !app.S.done && !leaveOk()) { syncHash(); return; } if (readHash()) { app.S = null; emit(); } });
  addEventListener('pagehide', () => { persist(app.P); Cloud.push(); });
}
