// Đăng nhập Google + lưu tiến độ lên Firestore (tài liệu saves/{uid}).
// Không có cấu hình Firebase thì app vẫn chạy, chỉ lưu trên trình duyệt.
// Firebase được tải từ gstatic khi chạy (không đóng gói vào bản build).
import { CLOUD_CONFIG } from '../config';
import type { Progress } from './progress';

export interface CloudUser { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
interface Hooks { get: () => Progress; merge: (r: Progress) => void; changed: () => void }

/* eslint-disable @typescript-eslint/no-explicit-any */
const C = CLOUD_CONFIG;
const st: { ok: boolean; user: CloudUser | null; fb: any; timer: ReturnType<typeof setTimeout> | undefined; hooks: Hooks | null } =
  { ok: false, user: null, fb: null, timer: undefined, hooks: null };

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const load = (m: string): Promise<any> => import(/* @vite-ignore */ FB + m + '.js');

async function init(hooks: Hooks) {
  st.hooks = hooks;
  if (!C.firebase) return;
  try {
    const [app, auth, fs] = await Promise.all(['firebase-app', 'firebase-auth', 'firebase-firestore'].map(load));
    const a = app.initializeApp(C.firebase);
    st.fb = { auth, fs, au: auth.getAuth(a), db: fs.getFirestore(a) };
    st.ok = true;
    auth.onAuthStateChanged(st.fb.au, async (u: CloudUser | null) => {
      st.user = u;
      if (u) await pull();
      hooks.changed();
    });
  } catch (e) { console.warn('Cloud init', e); }
}

async function signIn() {
  if (!st.ok) throw new Error('Chưa kết nối được máy chủ, thử lại sau');
  await st.fb.auth.signInWithPopup(st.fb.au, new st.fb.auth.GoogleAuthProvider());
}
async function signOut() {
  if (!st.ok) return;
  await push();
  await st.fb.auth.signOut(st.fb.au);
}

async function pull() {
  const { fs, db } = st.fb;
  try {
    const d = await fs.getDoc(fs.doc(db, 'saves', st.user!.uid));
    if (d.exists() && d.data().app === 'english') st.hooks!.merge(JSON.parse(d.data().data));
    await push();
  } catch (e) { console.warn('Cloud pull', e); }
}

function schedulePush() {
  if (!st.user) return;
  clearTimeout(st.timer);
  st.timer = setTimeout(push, 4000);
}
async function push() {
  if (!st.user) return;
  clearTimeout(st.timer);
  const { fs, db } = st.fb;
  try {
    await fs.setDoc(fs.doc(db, 'saves', st.user.uid), { app: 'english', data: JSON.stringify(st.hooks!.get()), updated: fs.serverTimestamp() });
  } catch (e) { console.warn('Cloud push', e); }
}

export interface BoardEntry { uid: string; name: string; photo: string; words: number; xp: number; band: string; streak: number }
/** Đăng thành tích của mình lên bảng xếp hạng (chỉ khi đã đăng nhập) */
async function publishBoard(e: Omit<BoardEntry, 'uid'>) {
  if (!st.user) return;
  const { fs, db } = st.fb;
  await fs.setDoc(fs.doc(db, 'board', st.user.uid), { ...e, updated: fs.serverTimestamp() });
}
/** Top người học nhiều từ nhất */
async function readBoard(): Promise<BoardEntry[]> {
  if (!st.ok) throw new Error('offline');
  const { fs, db } = st.fb;
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'board'), fs.orderBy('words', 'desc'), fs.limit(30)));
  return snap.docs.map((d: any) => ({ uid: d.id, ...d.data() }));
}

export const Cloud = {
  publishBoard, readBoard,
  init, signIn, signOut, schedulePush, push,
  get user() { return st.user; },
  get configured() { return !!C.firebase; },
};
