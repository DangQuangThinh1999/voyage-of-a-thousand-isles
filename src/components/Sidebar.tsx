import { UNITS, WEEK_GOALS as WG } from '../data';
import { doneCount, levelNow, unlocked, weekDone, weekUnits } from '../lib/progress';
import { go, goWeek, leaveOk, toast, useApp } from '../state/store';

/** Cột tổng quan bên trái (màn hình rộng ≥ 1100px) */
export function Sidebar() {
  const { scr, arg, S, P } = useApp();
  const cur = scr === 'unit' ? arg : scr === 'session' && S ? S.u.id : null;
  return (
    <aside id="side" className="side" aria-label="Tổng quan">
      <div className="side-lv"><small>Trình độ ước tính</small><b>IELTS {levelNow(P)}</b><small>Mục tiêu: IELTS 5.5</small></div>
      {Object.entries(WG).map(([w, g]) => {
        const us = weekUnits(+w), done = weekDone(P, +w);
        return (
          <div key={w} className={done ? 'side-wk done' : 'side-wk'}>
            <button className="side-h" data-act="week" data-w={w} onClick={() => leaveOk() && goWeek(w)}><b>Tuần {w}</b><span className="band">{g.cefr} · 🎯 {g.band}{done ? ' ✓' : ''}</span></button>
            {us.length ? us.map((u) => {
              const lock = !unlocked(P, UNITS.indexOf(u));
              const cls = ['side-u', u.id === cur && 'on', lock && 'locked'].filter(Boolean).join(' ');
              return (
                <button key={u.id} className={cls} data-act={lock ? 'locked' : 'unit'} data-u={u.id}
                  onClick={() => (lock ? toast('🔒 Làm xong 3/5 phần của bài trước để mở bài này') : leaveOk() && go('unit', u.id))}>
                  <span>{lock ? '🔒' : u.emoji}</span><span className="t">{u.title}</span><span className="n">{doneCount(P, u.id)}/5</span>
                </button>
              );
            }) : <div className="muted small soon">Sắp có · {g.goal}</div>}
          </div>
        );
      })}
    </aside>
  );
}
