// Băng chuyền thẻ các tuần sắp tới: vuốt / cuộn ngang có hít (snap), nút mũi tên, thẻ hiện dần.
import { motion } from 'motion/react';
import { useRef } from 'react';
import { vocabWeek, type Progress } from '../lib/progress';
import { weekLocked, type RoadWeek } from '../lib/roadmap';
import { goWeek, tab } from '../state/store';

const tone = (b: number) => (b >= 7 ? ['#f472b6', '#a78bfa'] : b >= 6 ? ['#a78bfa', '#60a5fa'] : b >= 5 ? ['#22d3ee', '#3b82f6'] : ['#34d399', '#22d3ee']);

export function WeekCarousel({ P, weeks }: { P: Progress; weeks: [number, RoadWeek][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <div className="carousel">
      <button className="car-nav l" onClick={() => move(-1)} aria-label="Trước">‹</button>
      <div ref={ref} className="car-track">
        {weeks.map(([w, g], i) => {
          const vw = vocabWeek(P, w), b = parseFloat(g.band) || 0, [c1, c2] = tone(b);
          return (
            <motion.div key={w} className={'wk-slide' + (weekLocked(g) ? ' locked' : '')} style={{ ['--c1' as string]: c1, ['--c2' as string]: c2 }}
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: Math.min(0.3, i * 0.04) }} whileHover={{ y: -4 }}>
              <div className="ws-top"><span className="ws-n">Tuần {w}</span><span className="ws-cefr">{g.cefr}</span></div>
              <div className="ws-band"><small>{g.milestone ? '🏁 Đạt mốc' : 'Hướng tới'}</small><b>IELTS {g.band}</b></div>
              <p className="ws-goal">{g.goal}</p>
              {g.special && <p className="ws-special">⭐ {g.special}</p>}
              <div className="ws-vocab"><span>📗 Từ vựng</span><span>{vw.done}/{vw.size}</span></div>
              <div className="ws-bar"><i style={{ width: `${(vw.done / Math.max(1, vw.size)) * 100}%` }} /></div>
              {weekLocked(g) ? <div className="ws-acts"><button disabled>🔒 Đang khoá</button></div>
                : <div className="ws-acts"><button onClick={() => tab('words')}>Học từ</button><button onClick={() => goWeek(w)}>Chi tiết</button></div>}
            </motion.div>
          );
        })}
      </div>
      <button className="car-nav r" onClick={() => move(1)} aria-label="Sau">›</button>
    </div>
  );
}
