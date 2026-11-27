// LƯU BÀI ĐANG LÀM DỞ: bài học / bài kiểm tra (app.S), Học theo cụm, đề thi.
// Lỡ thoát, tải lại trang, tắt trình duyệt… → mở lại app sẽ hiện popup: ▶ Làm tiếp  hoặc  🏠 Về trang chủ.
import { unitById, type Unit } from '../data';
import { Cloud } from '../lib/cloud';
import { KINDS, SKILL_OF } from '../lib/progress';
import { EXAMS, openExam } from './exam';
import { beginStep } from './session';
import { afterEmit, app, askConfirm, emit, go, type Session } from './store';

const LS_SESSION = 'ht.resume.session.v1';
/** Học theo cụm tự lưu trạng thái vào khoá này (xem ChunkPractice) */
export const LS_CHUNK = 'ht.chunk.v1';
const LS_SKIP = 'ht.resume.skip.v1';
const MAX_AGE = 3 * 86400_000;

const get = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) || 'null') as T; } catch { return null; } };
const put = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* đầy bộ nhớ: bỏ qua */ } };
const del = (k: string) => { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } };

// ---------- bài học / bài kiểm tra (app.S) ----------
const isUnit = (v: unknown): v is Unit => !!v && typeof v === 'object' && typeof (v as Unit).id === 'string' && Array.isArray((v as Unit).words) && unitById((v as Unit).id) === v;
function sessionJson(S: Session): string {
  // Unit là dữ liệu có sẵn trong app → chỉ lưu id; Set → mảng; trạng thái câu hiện tại làm lại từ đầu
  return JSON.stringify({ at: Date.now(), S: { ...S, state: undefined, requeued: [...S.requeued] } }, (_k, v) => (isUnit(v) ? { __u: v.id } : v));
}
function readSession(): { at: number; S: Session } | null {
  try {
    const raw = localStorage.getItem(LS_SESSION); if (!raw) return null;
    let bad = false;
    const d = JSON.parse(raw, (_k, v) => { if (v && typeof v === 'object' && typeof v.__u === 'string') { const u = unitById(v.__u); if (!u) bad = true; return u; } return v; });
    if (bad || !d?.S) return null;
    d.S.requeued = new Set(d.S.requeued || []);
    return d;
  } catch { return null; }
}

// Đọc bài dở NGAY khi tải trang (trước khi app.S = null bị lưu đè)
let checked = false;
let lastJson = '';
function saveSession() {
  if (!checked) return;
  const S = app.S;
  if (!S || S.done || S.intro) { if (lastJson) { del(LS_SESSION); lastJson = ''; } return; }
  const j = sessionJson(S);
  if (j.slice(20) === lastJson.slice(20)) return; // chỉ khác thời gian → bỏ qua
  lastJson = j;
  try { localStorage.setItem(LS_SESSION, j); } catch { /* bỏ qua */ }
}
let t: ReturnType<typeof setTimeout> | undefined;
afterEmit.add(() => { clearTimeout(t); t = setTimeout(saveSession, 400); });
if (typeof addEventListener !== 'undefined') {
  const flush = () => { clearTimeout(t); saveSession(); };
  addEventListener('pagehide', flush);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

// ---------- Học theo cụm ----------
export interface ChunkSaved { at: number; len: string; offline: boolean; items: unknown[] | null; answers: string[]; i: number; grades: unknown[] | null; newWords: string[]; queued: boolean }
export const loadChunk = () => get<ChunkSaved>(LS_CHUNK);
export const saveChunk = (c: Omit<ChunkSaved, 'at'>) => put(LS_CHUNK, { ...c, at: Date.now() });

// ---------- popup khi mở app ----------
interface Cand { at: number; what: string; resume: () => void; drop: () => void }
function candidates(): Cand[] {
  const out: Cand[] = [], now = Date.now();
  const s = readSession();
  if (s && now - s.at < MAX_AGE) {
    const S = s.S, k = KINDS.find(([x]) => x === S.kind);
    out.push({
      at: s.at,
      what: S.kind === 'test' ? `📝 Bài kiểm tra ${S.title || ''} — câu ${S.i + 1}/${S.steps.length}` : `${k?.[1] || '📘'} ${k?.[2] || 'Bài học'} · ${S.u.title} — câu ${S.i + 1}/${S.steps.length}`,
      resume: () => {
        app.S = S; app.scr = 'session'; app.arg = null;
        if (S.kind !== 'test') app.curSkill = SKILL_OF[S.kind];
        beginStep();
      },
      drop: () => del(LS_SESSION),
    });
  } else if (s) del(LS_SESSION);
  const c = loadChunk();
  if (c && c.items?.length && !c.grades && now - c.at < MAX_AGE) {
    const done = c.answers.filter((x) => x.trim()).length;
    out.push({
      at: c.at,
      what: `🧩 Học theo cụm — đã dịch ${done}/${c.answers.length} câu`,
      resume: () => { app.scr = 'words'; app.arg = null; app.nav++; history.pushState(null, '', '/tu-moi/hoc-theo-cum'); app.scrollReq = 'top'; emit(); },
      drop: () => saveChunk({ ...c, items: null, answers: [], i: 0, grades: null, newWords: [], queued: false }),
    });
  }
  // đề thi: giữ tới hết ngày (mở lại được ở trang Đề thi); bấm "Về trang chủ" thì không hỏi lại đề đó
  const skipped = get<string[]>(LS_SKIP) || [];
  for (const E of Object.values(EXAMS)) {
    const id = `${E.key}@${E.started}`;
    if (skipped.includes(id)) continue;
    const n = Object.keys(E.ans.q).length + Object.keys(E.ans.speak).length + (E.ans.writing.trim() ? 1 : 0);
    if (E.status !== 'ready' || !n) continue;
    out.push({ at: E.started, what: `🎓 ${E.title} — đã làm ${n} câu`, resume: () => openExam(E.key), drop: () => put(LS_SKIP, [...skipped, id].slice(-20)) });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Gọi 1 lần khi mở app: có bài dở → hỏi làm tiếp hay về trang chủ */
export function checkResume(waited = 0) {
  // đợi đăng nhập xong / popup khác (vd nhắc đăng nhập) đóng lại rồi mới hỏi
  if ((app.loginAsk || app.dlg || document.querySelector('.dlg-ov') || (!Cloud.resolved && waited < 6000)) && waited < 120_000) { setTimeout(() => checkResume(waited + 300), 300); return; }
  const list = candidates();
  checked = true;
  if (!list.length) return;
  const c = list[0];
  askConfirm({
    icon: '📌', title: 'Bạn đang làm dở một bài',
    msg: `${c.what}\n\nBài làm và đáp án đã được lưu lại. Làm tiếp chứ?`,
    ok: '▶ Làm tiếp', cancel: '🏠 Về trang chủ', sticky: true,
  }).then((ok) => {
    if (ok) { c.resume(); return; }
    c.drop();
    if (app.scr !== 'home' || app.arg) go('home');
  });
}
