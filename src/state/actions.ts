// Hành động cho ôn từ, nhật ký, lộ trình, cài đặt, test micro.
import { WORDS } from '../data';
import { Cloud } from '../lib/cloud';
import { today } from '../lib/progress';
import { hear, micErr, micLive, speak, stopListening } from '../lib/speech';
import { newReview, rateCard } from '../lib/srs';
import { scoreSpeech } from '../lib/text';
import { dayKey } from '../lib/util';
import { addXP, app, emit, go, resetProgress, save, toast } from './store';

// ---------- ôn từ vựng ----------
function reviewSpeak() { const R = app.R, c = R && R.q[R.i]; if (c && c.dir === 'en') speak(c.w); }
export function startReview(extra: boolean) { app.R = newReview(app.P, extra); emit(); reviewSpeak(); }
export function flipCard() { const R = app.R!; R.flip = true; emit(); const c = R.q[R.i]; if (c.dir === 'vi') speak(c.w); }
export function rate(ok: boolean) {
  const R = app.R!;
  rateCard(app.P, R, ok);
  if (ok) addXP(1);
  save();
  R.i++; R.flip = false; emit(); reviewSpeak();
}
export const reviewWord = (w: string) => WORDS[w];

// ---------- nhật ký ----------
export function saveJournal(u: string, text: string): boolean {
  const t = text.trim(); if (!t) return false;
  app.P.journal.unshift({ id: Date.now(), d: dayKey(), u, t }); addXP(5); toast('Đã lưu ✅ +5 ⭐');
  return true;
}
export function deleteJournal(id: number) {
  if (confirm('Xóa bài này?')) { app.P.journal = app.P.journal.filter((e) => e.id !== id); save(); emit(); }
}
export async function copyJournal(id: number) {
  const e = app.P.journal.find((x) => x.id === id); if (!e) return;
  const text = `Please correct my English. Explain each mistake in Vietnamese, then give me the corrected text:\n\n${e.t}`;
  try { await navigator.clipboard.writeText(text); toast('Đã chép. Dán vào Claude để được sửa bài 👍'); } catch { prompt('Chép đoạn này:', text); }
}

// ---------- lộ trình ----------
export function addMinutes(k: string) { const day = today(app.P); day.sec[k] = (day.sec[k] || 0) + 900; save(); emit(); toast('+15 phút ✅'); }

// ---------- cài đặt ----------
export function setRate(v: number) { app.P.settings.rate = v; save(); emit(); }
export function setVoice(v: string) { app.P.settings.voice = v; save(); emit(); speak('Hello! How are you today?'); }
export function setGoal(m: number) { app.P.settings.goalMin = m; save(); emit(); }
export async function login() {
  try { await Cloud.signIn(); } catch (e) { const er = e as { code?: string; message?: string }; toast('Đăng nhập thất bại: ' + (er.code || er.message)); }
}
export async function logout() { await Cloud.signOut(); emit(); }
export function reset() { if (confirm('Xóa toàn bộ tiến độ trên máy này?')) { resetProgress(); go('home'); } }
export function introOk() { app.P.seenIntro = true; save(); emit(); }

// ---------- test micro ----------
export const MIC_SAMPLE = 'Hello, my name is Lan and I am learning English every day.';
export function micTest() {
  const MT = app.MT;
  if (MT.busy) { stopListening(); return; }
  MT.busy = true; MT.res = null; micLive.reset(); emit();
  hear({ onText: micLive.setText, onLevel: micLive.setLevel, silenceMs: 2500 })
    .then((h) => { MT.res = { ...scoreSpeech(MIC_SAMPLE, h.alts), heard: h.text, audio: h.audio, n: h.text.split(/\s+/).filter(Boolean).length }; })
    .catch((e) => { MT.res = { err: micErr(e) }; })
    .finally(() => { MT.busy = false; micLive.reset(); emit(); });
}
