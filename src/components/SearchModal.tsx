// Tìm kiếm toàn app (nút 🔍 trên đầu trang hoặc Ctrl+K): từ vựng (Anh hoặc Việt), bài ngữ pháp, các mục học.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS } from '../lib/grammarLessons';
import { dictWords, loadLex, lookup, wordIpa } from '../lib/lex';
import { go, tab, withLeave, type Screen } from '../state/store';
import { AudioButton } from './AudioButton';
import { posVi } from './TapText';
import { TABS } from './Tabs';

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
export const openSearch = () => window.dispatchEvent(new Event('open-search'));

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [ver, force] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const o = () => { setOpen(true); loadLex().then(() => force((n) => n + 1)); };
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); o(); } if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('open-search', o); window.addEventListener('keydown', k);
    return () => { window.removeEventListener('open-search', o); window.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus({ preventScroll: true }), 50); }, [open]);

  const res = useMemo(() => {
    const t = fold(q.trim());
    if (!t) return { words: [], lessons: [], tabs: [] };
    const all = dictWords();
    const en = all.filter((w) => w.startsWith(t)).slice(0, 6);
    const vi = t.length >= 2 ? all.filter((w) => !en.includes(w) && fold(lookup(w)?.vi || '').includes(t)).slice(0, 6) : [];
    const words = [...en, ...vi].map((w) => lookup(w)!).filter(Boolean).slice(0, 10);
    const lessons = Object.entries(LESSONS).filter(([n, l]) => fold(`${n} ${l.formula} ${l.simple} ${l.ok.join(' ')}`).includes(t)).map(([n]) => n).slice(0, 8);
    const tabs = TABS.filter(([, , name]) => fold(name).includes(t));
    return { words, lessons, tabs };
  }, [q, ver]);
  const close = () => { setOpen(false); setQ(''); };
  const nav = (s: Screen, arg: string | null = null) => { close(); withLeave(() => { if (arg) go(s, arg); else tab(s); }); };
  const empty = q.trim() && !res.words.length && !res.lessons.length && !res.tabs.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="search-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <motion.div className="search-box" initial={{ y: -20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -20, scale: 0.97 }}>
            <div className="search-in"><span>🔍</span><input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ vựng (Anh hoặc Việt), bài ngữ pháp, mục học…" /><kbd onClick={close}>Esc</kbd></div>
            <div className="search-res">
              {!q.trim() && <p className="muted small">Ví dụ: “environment”, “môi trường”, “hiện tại hoàn thành”, “a an the”, “giao tiếp”.</p>}
              {empty && <p className="muted">Không tìm thấy “{q}”.</p>}
              {res.words.length > 0 && <><h4>📗 Từ vựng</h4>{res.words.map((e) => (
                <div key={e.w} className="sr-item"><div className="flex-1"><b>{e.w}</b> <span className="muted small">/{wordIpa(e.w) || ''}/ · {posVi(e.pos)}{e.awl ? ' · học thuật' : ''}</span><div className="small">{e.vi}</div></div><AudioButton text={e.w} className="icon xs" /></div>
              ))}</>}
              {res.lessons.length > 0 && <><h4>📐 Ngữ pháp</h4>{res.lessons.map((n) => (
                <button key={n} className="sr-item btnlike" onClick={() => nav('grammar', n)}><div className="flex-1"><b>{n}</b><div className="muted small">{LESSONS[n].formula.split(' · ')[0]}</div></div><span>→</span></button>
              ))}</>}
              {res.tabs.length > 0 && <><h4>🧭 Mục học</h4>{res.tabs.map(([s, ic, name]) => (
                <button key={s} className="sr-item btnlike" onClick={() => nav(s)}><div className="flex-1">{ic} <b>{name}</b></div><span>→</span></button>
              ))}</>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
