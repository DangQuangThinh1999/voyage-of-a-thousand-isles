import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { UNITS } from '../data';
import { roadmap } from '../lib/roadmap';
import { doneCount, levelNow, unlocked, vocabWeek, weekDone, weekNow, weekUnits } from '../lib/progress';
import { go, goWeek, withLeave, tab, toast, useApp } from '../state/store';
import { TargetPicker } from './TargetPicker';

/** Vòng tiến độ nhỏ cho từng tuần */
function MiniRing({ pct, done }: { pct: number; done: boolean }) {
  const r = 11, c = 2 * Math.PI * r;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
      <circle cx="14" cy="14" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <motion.circle cx="14" cy="14" r={r} fill="none" stroke={done ? 'var(--good)' : 'var(--pri)'} strokeWidth="3" strokeLinecap="round" strokeDasharray={c}
        initial={false} animate={{ strokeDashoffset: c * (1 - Math.min(1, pct)) }} transition={{ duration: 0.6 }} />
    </svg>
  );
}

/** Cột tổng quan bên trái (màn hình rộng ≥ 1100px): mỗi tuần là một thẻ mở/đóng, tuần hiện tại tự mở */
export function Sidebar() {
  const { scr, arg, S, P } = useApp();
  const WG = roadmap(P), now = weekNow(P);
  const cur = scr === 'unit' ? arg : scr === 'session' && S ? S.u.id : null;
  const curWeek = cur ? UNITS.find((u) => u.id === cur)?.week : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (w: number) => open[w] ?? (w === (curWeek ?? now));
  return (
    <aside id="side" className="side" aria-label="Tổng quan">
      <div className="side-lv">
        <small>Trình độ ước tính</small>
        <b>IELTS {levelNow(P)}</b>
        <TargetPicker />
      </div>
      <div className="side-list">
        {Object.entries(WG).map(([ws, g]) => {
          const w = +ws, us = weekUnits(w), done = weekDone(P, w), vw = vocabWeek(P, w);
          const parts = us.length * 5 + vw.size, got = us.reduce((a, u) => a + doneCount(P, u.id), 0) * 1 + (vw.done / Math.max(1, vw.size)) * vw.size;
          const pct = parts ? got / parts : 0, o = isOpen(w);
          return (
            <div key={w} className={['wk-card', done && 'done', w === now && 'now'].filter(Boolean).join(' ')}>
              <button className="wk-h" onClick={() => setOpen({ ...open, [w]: !o })} aria-expanded={o}>
                <MiniRing pct={pct} done={done} />
                <span className="flex-1 text-left"><b>Tuần {w}</b>{w === now && <span className="now-tag">đang học</span>}<small className="block">{g.cefr} · {us.length ? `${us.length} chủ đề` : 'từ vựng'}</small></span>
                <span className="band-chip">🎯 {g.band}</span>
                <motion.span className="car" animate={{ rotate: o ? 90 : 0 }}>›</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {o && (
                  <motion.div className="wk-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                    <button className="side-u" onClick={() => withLeave(() => tab('words'))}>
                      <span>📗</span><span className="t">Từ vựng<i className="mini-bar"><i style={{ width: `${(vw.done / Math.max(1, vw.size)) * 100}%` }} /></i></span><span className="n">{vw.done}/{vw.size}</span>
                    </button>
                    {us.length ? us.map((u) => {
                      const lock = !unlocked(P, UNITS.indexOf(u)), d = doneCount(P, u.id);
                      return (
                        <button key={u.id} className={['side-u', u.id === cur && 'on', lock && 'locked'].filter(Boolean).join(' ')}
                          onClick={() => (lock ? toast('🔒 Làm xong 3/5 phần của bài trước để mở bài này') : withLeave(() => go('unit', u.id)))}>
                          <span>{lock ? '🔒' : u.emoji}</span><span className="t">{u.title}<i className="mini-bar"><i style={{ width: `${(d / 5) * 100}%` }} /></i></span><span className="n">{d}/5</span>
                        </button>
                      );
                    }) : <p className="soon">🧭 {g.goal}</p>}
                    <button className="wk-go" onClick={() => withLeave(() => goWeek(w))}>Xem tuần {w} →</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
