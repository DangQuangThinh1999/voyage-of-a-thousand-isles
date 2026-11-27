// Kho trạng thái nhỏ của app: tiến độ (P), màn hình đang xem, phiên làm bài (S), ôn từ (R), test micro (MT).
// Các hành động thay đổi trạng thái rồi gọi emit() để React vẽ lại.
import { useSyncExternalStore } from 'react';
import { UNITS, type Unit } from '../data';
import { Cloud } from '../lib/cloud';
import type { Step, Skill } from '../lib/exercises';
import { addXPTo, fresh, freshKeep, load, mergeProgress, persist, setGuest, today, type Kind, type Progress } from '../lib/progress';
import type { ReviewState } from '../lib/srs';
import type { WordsState } from './words';
import { configureSpeech, onVoicesChanged, stopSpeaking } from '../lib/speech';
import type { SpeechScore } from '../lib/text';

export type Screen = 'home' | 'unit' | 'session' | 'words' | 'review' | 'grammar' | 'speak' | 'ipa' | 'skills' | 'journal' | 'stats' | 'plan' | 'settings' | 'mic' | 'exam' | 'admin';

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
  dlg: null as Dlg | null,
  /** hiện popup nhắc đăng nhập (khách); loginAsked = đã hiện trong lần mở trang này */
  loginAsk: false,
  /** menu trượt (điện thoại) đang mở */
  drawer: false,
  loginAsked: false,
  /** tăng khi cần vẽ lại trang từ đầu (về gốc trang) */
  nav: 0,
  /** cuộn trang sau lần vẽ tiếp theo: 'top' hoặc id của phần tử */
  scrollReq: null as null | 'top' | string,
};

let version = 0;
const subs = new Set<() => void>();
/** Hàm chạy sau mỗi lần trạng thái đổi (vd lưu bài đang làm dở) */
export const afterEmit = new Set<() => void>();
export function emit() { syncHash(); version++; subs.forEach((f) => f()); afterEmit.forEach((f) => f()); }

// ---------- đường dẫn (URL) phân tầng giống breadcrumb: /tuan-1/hello, /giao-tiep/noi-theo-chu-de ----------
// Tải lại vẫn ở đúng chỗ, nút Quay lại / Tiến tới hoạt động. Tab con là tầng thứ 2, tham số khác ở sau dấu ?
export const SLUG: Partial<Record<Screen, string>> = {
  words: 'tu-moi', review: 'on-tu', grammar: 'ngu-phap', speak: 'giao-tiep', ipa: 'phat-am', skills: 'ky-nang', journal: 'viet',
  stats: 'thanh-tuu', plan: 'lo-trinh', settings: 'cai-dat', mic: 'test-micro', exam: 'de-thi', admin: 'quan-ly',
};
/** Tên tầng 2 (tab con) cho từng trang */
export const SUB: Partial<Record<Screen, Record<string, [slug: string, label: string]>>> = {
  words: { learn: ['hoc-tu', '📗 Học từ'], chunk: ['hoc-theo-cum', '🧩 Học theo cụm'], mile: ['moc-100-tu', '🏁 Mốc 100 từ'] },
  speak: { talk: ['noi-theo-chu-de', '🎤 Nói theo chủ đề'], phrases: ['mau-cau', '💬 Mẫu câu'], ielts: ['hoi-dap-giam-khao', '🧑‍🏫 Hỏi đáp giám khảo'] },
  grammar: { lib: ['thu-vien', '📚 Thư viện'], analyze: ['phan-tich-cau', '🔍 Phân tích câu'], mist: ['so-loi-sai', '📒 Sổ lỗi sai'], pos: ['tu-loai', '🧩 Từ loại'] },
  ipa: { chart: ['bang-ipa', '🔤 Bảng IPA'], pairs: ['cap-am-de-nham', '👂 Cặp âm dễ nhầm'], read: ['doc-phien-am', '📖 Đọc phiên âm'], stress: ['trong-am', '🎯 Trọng âm'], homo: ['tu-dong-am', '🔁 Từ đồng âm'], clusters: ['cum-phu-am', '🧩 Cụm phụ âm'], link: ['noi-am', '🔗 Nối âm'] },
  skills: { weak: ['ky-nang-yeu', '📊 Kỹ năng yếu'], read: ['doc-hieu', '📖 Đọc hiểu'], listen: ['nghe-hieu', '🎧 Nghe hiểu'] },
};
/** Tab con mặc định của từng trang */
export const DEFAULT_SUB: Partial<Record<Screen, string>> = { words: 'learn', speak: 'talk', grammar: 'lib', skills: 'weak', ipa: 'chart' };
const BY_SLUG = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k as Screen]));
const unitWeek = (id: string) => UNITS.find((u) => u.id === id)?.week;
/** Đường dẫn tầng trang (không gồm tab con) */
function rootOf(): string {
  if (app.scr === 'session') return app.S ? `/tuan-${app.S.u.week}/${app.S.u.id}` : '/';
  if (app.scr === 'unit' && app.arg) return `/tuan-${unitWeek(app.arg) ?? 1}/${encodeURIComponent(app.arg)}`;
  if (app.scr === 'home') return app.arg ? `/tuan-${app.arg}` : '/';
  if (app.scr === 'exam') return app.arg ? `/de-thi/${app.arg}` : '/de-thi';
  return '/' + (SLUG[app.scr] || '');
}
function syncHash() {
  if (typeof location === 'undefined') return;
  const want = rootOf(), cur = decodeURIComponent(location.pathname);
  // Chỉ trang có tab con mới được có tầng sâu hơn (vd /giao-tiep/mau-cau); /tuan-1 ≠ /tuan-1/hello
  const ok = want === '/' ? cur === '/' : cur === want || (!!SUB[app.scr] && cur.startsWith(want + '/'));
  if (!ok) history.pushState(null, '', want);
}
/** Đọc đường dẫn → trang. Trả về true nếu đổi trang. Link cũ dạng #/… tự chuyển sang dạng mới. */
export function readHash(): boolean {
  if (location.hash.startsWith('#/')) {
    const [p, q] = location.hash.slice(1).split('?'), [s0, a0] = p.split('/').filter(Boolean);
    const s = s0 as Screen, sp = new URLSearchParams(q || ''), t = sp.get('t'); sp.delete('t');
    let path = s === 'unit' && a0 ? `/tuan-${unitWeek(decodeURIComponent(a0)) ?? 1}/${a0}` : '/' + (SLUG[s] || '');
    if (t && SUB[s] && SUB[s]![t]) path += '/' + SUB[s]![t][0];
    const qs = sp.toString(); history.replaceState(null, '', path + (qs ? '?' + qs : ''));
  }
  const seg = decodeURIComponent(location.pathname).split('/').filter(Boolean);
  let s: Screen = 'home', a: string | null = null;
  const wk = seg[0] && seg[0].match(/^tuan-(\d+)$/);
  if (wk) { if (seg[1] && UNITS.some((u) => u.id === seg[1])) { s = 'unit'; a = seg[1]; } else { a = wk[1]; } }
  else if (seg[0] && BY_SLUG[seg[0]]) { s = BY_SLUG[seg[0]]; if (s === 'exam' && seg[1]) a = seg[1]; }
  if (app.scr === 'session' && app.S && s === 'unit' && a === app.S.u.id) return false;
  if (s === app.scr && a === app.arg) return false;
  app.scr = s; app.arg = a;
  app.scrollReq = s === 'home' && a ? 'wk-' + a : 'top';
  return true;
}
/** Tham số con: 't' (tab con) là tầng 2 của đường dẫn, các tham số khác ở sau dấu ? */
export function getParam(key: string): string | null {
  if (key === 't') {
    const sub = SUB[app.scr], seg = decodeURIComponent(location.pathname).split('/').filter(Boolean)[1];
    const hit = sub && seg && Object.entries(sub).find(([, [slug]]) => slug === seg);
    return hit ? hit[0] : null;
  }
  return new URLSearchParams(location.search).get(key);
}
export function setParam(key: string, v: string | null) {
  const sp = new URLSearchParams(location.search);
  let path = location.pathname;
  if (key === 't' && SUB[app.scr]) {
    const root = rootOf(), slug = v ? SUB[app.scr]![v]?.[0] : null;
    path = slug ? `${root}/${slug}` : root; sp.delete('t');
  } else if (v === null || v === '') sp.delete(key); else sp.set(key, v);
  const qs = sp.toString(); history.replaceState(null, '', path + (qs ? '?' + qs : ''));
  version++; subs.forEach((f) => f());
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
  // Bấm lại trang đang mở (vd tầng cha trên breadcrumb) → về gốc trang đó, bỏ tab con
  if (s === app.scr && SUB[s] && typeof location !== 'undefined') { app.nav++; history.pushState(null, '', '/' + SLUG[s]); }
  app.scr = s; app.arg = a;
  app.curSkill = s === 'review' || s === 'words' ? 'review' : s === 'journal' ? 'write' : s === 'speak' || s === 'ipa' ? 'speak' : s === 'grammar' ? 'read' : s === 'skills' ? 'listen' : null;
  app.scrollReq = 'top';
  emit();
}
/** Đang làm bài dở thì hỏi trước khi rời đi */
// ---------- hộp thoại xác nhận tự thiết kế (thay confirm() của trình duyệt) ----------
export interface Dlg { icon: string; title: string; msg: string; ok: string; cancel: string; danger?: boolean; /** bấm ra ngoài / Esc không đóng */ sticky?: boolean; resolve: (v: boolean) => void }
export function askConfirm(o: Partial<Omit<Dlg, 'resolve'>> & { title: string }): Promise<boolean> {
  return new Promise((resolve) => {
    app.dlg = { icon: '❓', msg: '', ok: 'Đồng ý', cancel: 'Hủy', ...o, resolve: (v) => { app.dlg = null; emit(); resolve(v); } };
    emit();
  });
}
const inProgress = () => app.scr === 'session' && !!app.S && !app.S.done && !app.S.intro;
/** Rời trang: đang làm bài dở thì hỏi bằng hộp thoại đẹp trước khi chạy fn */
export function withLeave(fn: () => void) {
  if (!inProgress()) { fn(); return; }
  askConfirm({ icon: '🚪', title: 'Thoát bài đang làm?', msg: 'Kết quả bài này sẽ không được lưu. Bạn có thể làm lại sau.', ok: 'Thoát bài', cancel: 'Ở lại làm tiếp', danger: true })
    .then((ok) => { if (ok) { app.S = null; fn(); } });
}
export function leaveOk() {
  const S = app.S;
  if (app.scr === 'session' && S && !S.done && !S.intro) return false;
  return true;
}
export function tab(t: Screen, reset = false) {
  if (reset || t === 'review') app.R = null;
  go(t);
}
export function goWeek(w: number | string) { go('home', String(w)); app.scrollReq = 'wk-' + w; }

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
  let wasUser = false;
  Cloud.init({ get: () => app.P, merge: mergeCloud, changed: () => {
    const u = !!Cloud.user;
    if (Cloud.resolved && !u) {
      // vừa đăng xuất → về tiến độ trống (dữ liệu vẫn an toàn trên mây); khách → chỉ giữ tới khi đóng trang
      if (wasUser) app.P = { ...fresh(), settings: app.P.settings, seenIntro: true, resetAt: app.P.resetAt, updated: 0 };
      setGuest(true); persist(app.P);
      if (!app.loginAsked) app.loginAsk = true;
    } else if (u) { setGuest(false); persist(app.P); app.loginAsk = false; }
    wasUser = u;
    emit();
  } });
  // Nút Quay lại / Tiến tới của trình duyệt
  addEventListener('popstate', () => {
    if (inProgress()) {
      const target = location.pathname + location.search; syncHash();
      withLeave(() => { history.pushState(null, '', target); if (readHash()) emit(); });
      return;
    }
    if (readHash()) { app.S = null; emit(); }
  });
  addEventListener('pagehide', () => { persist(app.P); Cloud.push(); });
}
