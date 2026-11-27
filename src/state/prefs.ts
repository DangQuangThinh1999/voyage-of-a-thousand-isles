// Lựa chọn dùng chung cho mọi bài luyện tập / giải trí: mức độ (CEFR), chủ đề, nguồn bài (có sẵn / AI tạo). Lưu vào máy.
import { levelNow } from '../lib/progress';
import { app, emit, useApp } from './store';

export type Src = 'lib' | 'ai';
export interface GenPref { cefr: string; topic: number; src: Src }
const KEY = 'ht.genpref.v1';
const defaultCefr = (band: string) => { const b = parseFloat(band) || 0; return b < 3.5 ? 'A1' : b < 4.5 ? 'A2' : b < 6 ? 'B1' : b < 7 ? 'B2' : b < 8.5 ? 'C1' : 'C2'; };
let pref: GenPref | null = null;
function load(): GenPref {
  if (pref) return pref;
  let saved: Partial<GenPref> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* bỏ qua */ }
  return (pref = { cefr: saved.cefr || defaultCefr(levelNow(app.P)), topic: saved.topic ?? -1, src: saved.src === 'ai' ? 'ai' : 'lib' });
}
export function setGenPref(p: Partial<GenPref>) {
  pref = { ...load(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* bỏ qua */ }
  emit();
}
/** Hook: lựa chọn hiện tại + hàm đổi */
export function useGenPref(): [GenPref, (p: Partial<GenPref>) => void] { useApp(); return [load(), setGenPref]; }
