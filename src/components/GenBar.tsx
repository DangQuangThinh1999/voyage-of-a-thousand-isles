import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { generate, genHistory, hourly, type GenItem, type GenKind } from '../lib/gen';
import { useGenPref } from '../state/prefs';
import { Dropdown } from './Dropdown';

const WAIT = ['AI đang chọn chủ đề…', 'Đang soạn bài theo chuẩn IELTS…', 'Đang kiểm tra đáp án có căn cứ trong bài…', 'Sắp xong rồi…'];

/** Thanh tạo bài mới bằng AI: chọn cấp độ + chủ đề, bấm tạo; có danh sách bài đã tạo để làm lại */
export function GenBar({ kind, onItem }: { kind: GenKind; onItem: (it: GenItem) => void }) {
  const [{ cefr, topic }] = useGenPref();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState(0);
  const hist = genHistory(kind);
  // Bài của giờ này: tự tải khi mở trang (đổi mỗi giờ), cùng trình độ đang chọn
  const [hr, setHr] = useState<GenItem | null>(null), [hrBusy, setHrBusy] = useState(false), auto = useRef(false);
  useEffect(() => {
    let live = true; setHrBusy(true);
    hourly(kind, cefr).then((it) => { if (!live) return; setHr(it); setHrBusy(false); if (it && !auto.current) { auto.current = true; onItem(it); } });
    const t = setInterval(() => hourly(kind, cefr).then((it) => { if (live && it) setHr(it); }), 10 * 60_000);
    return () => { live = false; clearInterval(t); };
  }, [kind, cefr]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextHour = (new Date().getHours() + 1) % 24;
  async function go() {
    setBusy(true); setErr(''); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(WAIT.length - 1, s + 1)), 9000);
    try { onItem(await generate(kind, cefr, topic)); } catch (e) { setErr((e as Error).message); }
    clearInterval(t); setBusy(false);
  }
  return (
    <div className="card genbar">
      <div className="flex flex-wrap items-center gap-2">
        {hr ? <button className="btn ghost hourly-btn" onClick={() => onItem(hr)} title={hr.title}>🕐 Bài của giờ này <small>· bài mới lúc {nextHour}:00</small></button>
          : hrBusy ? <span className="muted small"><span className="spin" /> Đang lấy bài của giờ này…</span> : null}
        <motion.button className="btn glow" disabled={busy} onClick={go} whileTap={{ scale: 0.96 }}>{busy ? '⏳ Đang tạo…' : '✨ Tạo bài mới (AI)'}</motion.button>
        {hist.length > 0 && <Dropdown align="right" label="Đã tạo" value={-1} onChange={(id) => { const it = hist.find((h) => h.id === id); if (it) onItem(it); }}
          options={[{ value: -1, label: `${hist.length} bài` }, ...hist.map((h) => ({ value: h.id, label: h.title, sub: `${h.cefr} · ${h.topic}` }))]} />}
      </div>
      <AnimatePresence>
        {busy && (
          <motion.div className="gen-wait" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="shimmer" /><p className="muted small m-0 mt-2">{WAIT[step]} (gói AI miễn phí, thường 20–50 giây)</p>
          </motion.div>
        )}
      </AnimatePresence>
      {err && <p className="note small mt-2">{err} Bạn vẫn có thể làm các bài có sẵn bên dưới.</p>}
    </div>
  );
}
