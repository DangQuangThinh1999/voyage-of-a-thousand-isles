import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { generate, genHistory, LEVELS_GEN, TOPICS, type GenItem, type GenKind } from '../lib/gen';
import { levelNow } from '../lib/progress';
import { useApp } from '../state/store';
import { Dropdown } from './Dropdown';

const defaultCefr = (band: string) => { const b = parseFloat(band) || 0; return b < 3.5 ? 'A1' : b < 4.5 ? 'A2' : b < 6 ? 'B1' : b < 7 ? 'B2' : b < 8.5 ? 'C1' : 'C2'; };
const WAIT = ['AI đang chọn chủ đề…', 'Đang soạn bài theo chuẩn IELTS…', 'Đang kiểm tra đáp án có căn cứ trong bài…', 'Sắp xong rồi…'];

/** Thanh tạo bài mới bằng AI: chọn cấp độ + chủ đề, bấm tạo; có danh sách bài đã tạo để làm lại */
export function GenBar({ kind, onItem }: { kind: GenKind; onItem: (it: GenItem) => void }) {
  const { P } = useApp();
  const [cefr, setCefr] = useState(() => defaultCefr(levelNow(P)));
  const [topic, setTopic] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState(0);
  const hist = genHistory(kind);
  async function go() {
    setBusy(true); setErr(''); setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(WAIT.length - 1, s + 1)), 9000);
    try { onItem(await generate(kind, cefr, topic)); } catch (e) { setErr((e as Error).message); }
    clearInterval(t); setBusy(false);
  }
  return (
    <div className="card genbar">
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown label="Cấp độ" value={cefr} onChange={setCefr} grid={3} options={LEVELS_GEN.map(([c, b, l]) => ({ value: c, label: <b>{c}</b>, sub: `${l} · ${b}` }))} />
        <Dropdown label="Chủ đề" value={topic} onChange={setTopic} options={[{ value: -1, icon: '🎲', label: 'Ngẫu nhiên', sub: 'Mỗi lần một chủ đề, một quốc gia khác' }, ...TOPICS.map(([ic, n, a], i) => ({ value: i, icon: ic, label: n, sub: `${a.length} góc nhìn` }))]} />
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
