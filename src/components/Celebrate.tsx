// Hiệu ứng thưởng dùng chung: "+1 ⭐" bay lên tại chỗ bấm, pháo hoa khi thắng. Gọi celebrate() ở bất kỳ đâu.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface Fx { id: number; x: number; y: number; text: string; big: boolean }
let push: (f: Fx) => void = () => {};
let seq = 0;
/** Hiện hiệu ứng: text bay lên tại (x, y) (mặc định giữa màn hình); big = pháo hoa */
export function celebrate(text = '+1 ⭐', opts: { x?: number; y?: number; big?: boolean } = {}) {
  push({ id: ++seq, x: opts.x ?? innerWidth / 2, y: opts.y ?? innerHeight / 2, text, big: !!opts.big });
}
/** Lấy toạ độ giữa phần tử vừa bấm (dùng cho celebrate) */
export const at = (e: { currentTarget: Element }) => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

const BITS = ['🎉', '✨', '⭐', '🎊', '💫', '🌟'];
export function Celebrate() {
  const [fx, setFx] = useState<Fx[]>([]);
  useEffect(() => { push = (f) => { setFx((a) => [...a, f]); setTimeout(() => setFx((a) => a.filter((x) => x.id !== f.id)), f.big ? 1600 : 900); }; }, []);
  return (
    <div className="fx-layer" aria-hidden>
      <AnimatePresence>
        {fx.map((f) => (
          <div key={f.id} style={{ position: 'fixed', left: f.x, top: f.y }}>
            <motion.div className={'fx-text' + (f.big ? ' big' : '')} initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: f.big ? -90 : -60, scale: f.big ? 1.4 : 1 }} transition={{ duration: f.big ? 1.5 : 0.85 }}>{f.text}</motion.div>
            {Array.from({ length: f.big ? 18 : 6 }, (_, i) => {
              const a = (i / (f.big ? 18 : 6)) * Math.PI * 2, d = f.big ? 130 + (i % 3) * 30 : 45;
              return <motion.span key={i} className="fx-bit" initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + (f.big ? 40 : 10), opacity: 0, scale: 1.1, rotate: 180 }} transition={{ duration: f.big ? 1.4 : 0.7, ease: 'easeOut' }}>{BITS[i % BITS.length]}</motion.span>;
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
