import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { UNITS } from '../data';
import { roadmap, weekLocked } from '../lib/roadmap';
import { doneCount, levelNow, vocabWeek, weekDone, weekNow, weekUnits } from '../lib/progress';
import { go, withLeave, tab, useApp } from '../state/store';
import { TargetPicker } from './TargetPicker';
import { requestExam } from '../state/exam';
import { MiniBar, MiniRing, toneCls } from './ui';

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
            <div key={w} className={['wk-card', done && 'done', w === now && 'now', weekLocked(g) && 'locked'].filter(Boolean).join(' ')}>
              <button className="wk-h" disabled={weekLocked(g)} onClick={() => setOpen({ ...open, [w]: !o })} aria-expanded={o}>
                <MiniRing pct={done ? 1 : pct} />
                <span className="flex-1 text-left"><b>Tuần {w}</b>{w === now && <span className="now-tag">đang học</span>}<small className="block">{g.cefr} · {us.length ? `${us.length} chủ đề` : 'từ vựng'}</small></span>
                <span className="band-chip">{weekLocked(g) ? '🔒' : '🎯'} {g.band}</span>
                <motion.span className="car" animate={{ rotate: o ? 90 : 0 }}>›</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {o && (
                  <motion.div className="wk-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                    <button className={'side-u ' + toneCls(vw.done / Math.max(1, vw.size))} onClick={() => withLeave(() => tab('words'))}>
                      <span>📗</span><span className="t">Từ vựng<MiniBar pct={vw.done / Math.max(1, vw.size)} /></span><span className="n">{vw.done}/{vw.size}</span>
                    </button>
                    {us.length ? us.map((u) => {
                      const d = doneCount(P, u.id);
                      return (
                        <button key={u.id} className={['side-u', toneCls(d / 5), u.id === cur && 'on'].filter(Boolean).join(' ')} onClick={() => withLeave(() => go('unit', u.id))}>
                          <span>{u.emoji}</span><span className="t">{u.title}<MiniBar pct={d / 5} /></span><span className="n">{d}/5</span>
                        </button>
                      );
                    }) : <p className="soon">🧭 {g.goal}</p>}
                    <button className="wk-go" onClick={() => withLeave(() => requestExam('w' + w))}>📝 Kiểm tra tuần {w}{P.tests?.['w' + w] ? ` · ${P.tests['w' + w].best}%` : ''}</button>
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
