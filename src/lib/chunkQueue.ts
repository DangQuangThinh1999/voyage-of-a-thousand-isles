// Hàng chờ chấm lại "Học theo cụm": khi AI bận, lượt làm bài được lưu lại; app tự gửi chấm lại lúc rảnh
// (khi mở app và vài phút một lần khi không thao tác), chấm xong thì cộng từ mới cho các câu QUA (cả 2 chiều ≥ 70).
import { today } from './progress';
import { addDays, dayKey } from './util';
import { addXP, app, save, toast } from '../state/store';

export interface QItem { dir: 'en-vi' | 'vi-en'; source: string; reference: string; answer: string; words: string[] }
export interface QEntry { id: number; day: string; cefr: string; n: number; items: QItem[]; fresh: { w: string; f: string }[][] }
const LS = 'ht.chunkq.v1', PASS = 70;
const load = (): QEntry[] => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
const store = (q: QEntry[]) => { try { localStorage.setItem(LS, JSON.stringify(q)); } catch { /* bỏ qua */ } };

export const pendingChunks = () => load().length;
/** Lưu một lượt chưa chấm được. fresh[k] = các từ mới (kèm file kho từ) của câu k */
export function enqueueChunk(e: Omit<QEntry, 'id' | 'day'>) { store([...load(), { ...e, id: Date.now(), day: dayKey() }].slice(-20)); }

let running = false, lastAct = Date.now();
async function processQueue() {
  if (running || !navigator.onLine) return;
  const q = load(); if (!q.length) return;
  running = true;
  let gained: string[] = [], done = 0;
  for (const e of q) {
    try {
      const r = await fetch('/api/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 'gradeall', cefr: e.cefr, items: e.items }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error || !Array.isArray(d.results)) break; // AI vẫn bận: để lần sau
      const P = app.P;
      for (let k = 0; k < e.n; k++) {
        if ((d.results[k]?.score ?? 0) < PASS || (d.results[k + e.n]?.score ?? 0) < PASS) continue;
        for (const { w, f } of e.fresh[k] || []) if (!P.srs[w]) { P.srs[w] = { b: 1, due: addDays(dayKey(), 1), f }; gained.push(w); }
      }
      store(load().filter((x) => x.id !== e.id)); done++;
    } catch { break; }
  }
  if (gained.length) { const t = today(app.P); t.nw = (t.nw || 0) + gained.length; save(); addXP(gained.length * 2); }
  if (done) toast(gained.length ? `🤖 Đã chấm lại ${done} lượt học theo cụm: +${gained.length} từ mới (${gained.slice(0, 5).join(', ')}${gained.length > 5 ? '…' : ''})` : `🤖 Đã chấm lại ${done} lượt học theo cụm (chưa câu nào qua cả 2 chiều)`);
  gained = []; running = false;
}

/** Bật chạy nền: khi mở app, rồi mỗi 5 phút nếu trang đang mở và người dùng không thao tác ít nhất 1 phút */
let started = false;
export function startChunkQueue() {
  if (started) return; started = true;
  (['keydown', 'pointerdown'] as const).forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setTimeout(processQueue, 8000);
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - lastAct > 60_000) processQueue(); }, 5 * 60_000);
  addEventListener('online', () => setTimeout(processQueue, 3000));
}
