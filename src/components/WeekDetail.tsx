// Chi tiết 1 tuần trong lộ trình (hiện trong Sheet): trọng tâm, ⭐ thử thách đặc biệt, từ vựng của tuần, nút học / kiểm tra.
import { vocabWeek, type Progress } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { requestExam } from '../state/exam';
import { app, emit, goWeek, tab, useApp } from '../state/store';
import { ProgressBar } from './ProgressBar';
import { Sheet } from './Sheet';

const close = () => { app.weekSheet = null; emit(); };
/** Bảng chi tiết tuần dùng chung toàn app: mở bằng goWeek(w) */
export function WeekSheet() {
  const { P, weekSheet: w } = useApp();
  return <WeekSheetView P={P} w={w} onPick={(x) => { app.weekSheet = null; goWeek(x); }} onClose={close} />;
}
function WeekSheetView({ P, w, onPick, onClose }: { P: Progress; w: number | null; onPick: (w: number) => void; onClose: () => void }) {
  const rm = roadmap(P), N = Object.keys(rm).length, g = w ? rm[w] : null;
  const vw = w ? vocabWeek(P, w) : null;
  return (
    <Sheet open={!!g} onClose={onClose} bodyKey={String(w)}
      head={g && <div><b className="text-lg">Tuần {w}</b><div className="wb-chips"><span className="chip3">{g.cefr}</span><span className="chip3 band">🎯 IELTS {g.band}</span>{g.milestone && <span className="chip3 now">🏁 Mốc {g.band}</span>}</div></div>}
      foot={w && <><button className="btn ghost" disabled={w <= 1} onClick={() => onPick(w - 1)}>← Tuần {w - 1}</button><span className="muted small">{w}/{N}</span><button className="btn ghost" disabled={w >= N} onClick={() => onPick(w + 1)}>Tuần {w + 1} →</button></>}>
      {g && vw && w && <>
        <div className="vsec"><h4>🧭 Trọng tâm tuần này</h4><p className="m-0">{g.goal}</p></div>
        {g.special && <div className="vsec"><h4>⭐ Thử thách đặc biệt</h4><p className="m-0 wk-special">{g.special}</p></div>}
        <div className="vsec"><h4>📗 Từ vựng tuần · {g.cefr}</h4>
          <div className="row between small"><span>{vw.done}/{vw.size} từ</span><span className="muted">~{Math.ceil(vw.size / 7)} từ/ngày</span></div>
          <ProgressBar pct={Math.round((vw.done / Math.max(1, vw.size)) * 100)} />
          <p className="muted small m-0">Từ số {(vw.start + 1).toLocaleString('vi-VN')} → {(vw.start + vw.size).toLocaleString('vi-VN')} trong kho. Trình độ càng cao, mỗi tuần càng nhiều từ.</p>
        </div>
        <div className="row gap wrap mt-2"><button className="btn" onClick={() => { onClose(); tab('words'); }}>📗 Học từ</button><button className="btn ghost" onClick={() => { onClose(); requestExam('w' + w); }}>📝 Kiểm tra tuần {w}</button></div>
      </>}
    </Sheet>
  );
}
