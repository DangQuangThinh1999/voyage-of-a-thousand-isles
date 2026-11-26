// Bài mẫu cho một đề viết (AI viết đúng cấp độ), có dịch, ghi chú vì sao bài tốt, từ vựng. Lưu trên máy để mở lại nhanh.
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { AudioButton } from './AudioButton';

interface Sample { sample: string; vi: string; notes: string[]; vocab: { w: string; ipa: string; vi: string }[] }
const KEY = 'ht55.sample.v1';
const cache = (): Record<string, Sample> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

export function ModelAnswer({ prompt, cefr, minWords }: { prompt: string; cefr: string; minWords: number }) {
  const [s, setS] = useState<Sample | null>(() => cache()[prompt] || null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [vi, setVi] = useState(false);
  async function load() {
    setOpen(!open); if (s || busy || open) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/gen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'sample', cefr, topic: `${prompt} (khoảng ${minWords}–${Math.round(minWords * 1.2)} từ)` }) });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error === 'not_configured' ? 'Chưa cài khóa AI.' : 'AI đang bận, thử lại sau ít phút.');
      setS(d); try { localStorage.setItem(KEY, JSON.stringify({ ...cache(), [prompt]: d })); } catch { /* bỏ qua */ }
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="model">
      <button className="btn ghost sm" onClick={load}>{open ? '▲ Ẩn bài mẫu' : '📄 Xem bài mẫu tham khảo'}</button>
      <AnimatePresence>
        {open && (
          <motion.div className="model-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {busy && <><div className="shimmer" /><p className="muted small">AI đang viết bài mẫu đúng cấp độ {cefr}… (20–40 giây)</p></>}
            {err && <p className="note small">{err}</p>}
            {s && <>
              <div className="flex items-center justify-between"><b>📄 Bài mẫu ({(s.sample.match(/\S+/g) || []).length} từ)</b>
                <span className="flex gap-1"><AudioButton text={s.sample} className="icon xs" /><button className="btn ghost sm" onClick={() => setVi(!vi)}>{vi ? 'Ẩn dịch' : '🇻🇳 Dịch'}</button></span></div>
              <div className="model-text">{s.sample}</div>
              {vi && <div className="model-text muted">{s.vi}</div>}
              <b>💡 Vì sao bài này tốt?</b>
              <ul className="small">{s.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              {s.vocab?.length > 0 && <div className="vgrid">{s.vocab.map((v) => <div key={v.w} className="vchip"><b>{v.w}</b> <AudioButton text={v.w} className="icon xs" /><span className="muted small">{v.ipa}</span><span className="small">{v.vi}</span></div>)}</div>}
              <p className="muted small">Đọc tham khảo rồi tự viết bằng ý của bạn. Không chép nguyên văn, vì máy chấm sẽ so độ tự nhiên chứ không chấm việc chép.</p>
            </>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
