'use strict';
// Đăng nhập Google + lưu tiến độ lên Firestore (tài liệu saves/{uid}).
// Không có cấu hình Firebase thì app vẫn chạy, chỉ lưu trên trình duyệt.
window.Cloud = (() => {
  const C = window.CLOUD_CONFIG || {};
  const st = { ok: false, user: null, fb: null, timer: null, hooks: null };

  async function init(hooks) {
    st.hooks = hooks;
    if (!C.firebase) return;
    try {
      const B = 'https://www.gstatic.com/firebasejs/10.12.2/';
      const [app, auth, fs] = await Promise.all(['firebase-app', 'firebase-auth', 'firebase-firestore'].map((m) => import(B + m + '.js')));
      const a = app.initializeApp(C.firebase);
      st.fb = { auth, fs, au: auth.getAuth(a), db: fs.getFirestore(a) };
      st.ok = true;
      auth.onAuthStateChanged(st.fb.au, async (u) => {
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
      const d = await fs.getDoc(fs.doc(db, 'saves', st.user.uid));
      if (d.exists() && d.data().app === 'english') st.hooks.merge(JSON.parse(d.data().data));
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
      await fs.setDoc(fs.doc(db, 'saves', st.user.uid), { app: 'english', data: JSON.stringify(st.hooks.get()), updated: fs.serverTimestamp() });
    } catch (e) { console.warn('Cloud push', e); }
  }

  return {
    init, signIn, signOut, schedulePush, push,
    get user() { return st.user; },
    get configured() { return !!C.firebase; },
  };
})();
