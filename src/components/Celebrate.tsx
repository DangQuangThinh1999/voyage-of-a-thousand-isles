// Hiệu ứng thưởng dùng chung: "+1 ⭐" bay lên tại chỗ bấm + hạt màu bung ra (vẽ trên canvas, không dùng thư viện);
// big = pháo hoa nhiều chùm. Gọi celebrate() ở bất kỳ đâu.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Fx { id: number; x: number; y: number; text: string; big: boolean }
interface P { x: number; y: number; vx: number; vy: number; life: number; c: string; w: number; h: number; r: number; vr: number }
let push: (f: Fx) => void = () => {};
let burst: (x: number, y: number, n: number, power: number) => void = () => {};
let seq = 0;
const COLORS = ['#f472b6', '#fbbf24', '#22d3ee', '#a78bfa', '#4ade80', '#fb7185', '#60a5fa'];
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Hiện hiệu ứng: text bay lên tại (x, y) (mặc định giữa màn hình); big = pháo hoa nhiều chùm */
export function celebrate(text = '+1 ⭐', opts: { x?: number; y?: number; big?: boolean } = {}) {
  const x = opts.x ?? innerWidth / 2, y = opts.y ?? innerHeight / 2, big = !!opts.big;
  push({ id: ++seq, x, y, text, big });
  if (calm()) return;
  if (!big) { burst(x, y, 22, 5); return; }
  burst(x, y, 90, 9);
  [[0.25, 0.3], [0.75, 0.28], [0.5, 0.18]].forEach(([fx, fy], i) => setTimeout(() => burst(innerWidth * fx, innerHeight * fy, 70, 8), 180 + i * 220));
}
/** Toạ độ giữa phần tử vừa bấm (dùng cho celebrate) */
export const at = (e: { currentTarget: Element }) => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

export function Celebrate() {
  const [fx, setFx] = useState<Fx[]>([]);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    push = (f) => { setFx((a) => [...a, f]); setTimeout(() => setFx((a) => a.filter((x) => x.id !== f.id)), f.big ? 1600 : 900); };
    const c = cv.current!, g = c.getContext('2d')!, ps: P[] = [];
    let raf = 0;
    const size = () => { const d = devicePixelRatio || 1; c.width = innerWidth * d; c.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const tick = () => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += 0.18; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.012;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        g.save(); g.globalAlpha = Math.min(1, p.life * 1.5); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1); g.restore();
      }
      raf = ps.length ? requestAnimationFrame(tick) : 0;
    };
    burst = (x, y, n, power) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = power * (0.4 + Math.random() * 0.8);
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.35, life: 0.9 + Math.random() * 0.5, c: COLORS[i % COLORS.length], w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    return () => { removeEventListener('resize', size); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="fx-layer" aria-hidden>
      <canvas ref={cv} className="fx-canvas" />
      <AnimatePresence>
        {fx.map((f) => (
          <div key={f.id} className="fx-at" style={{ left: Math.min(Math.max(f.x, 90), innerWidth - 90), top: f.y }}>
            <span className="fx-c"><motion.div className={'fx-text' + (f.big ? ' big' : '')} initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], y: f.big ? -90 : -56, scale: f.big ? 1.3 : 1 }}
              exit={{ opacity: 0 }} transition={{ duration: f.big ? 1.5 : 0.85, ease: 'easeOut' }}>{f.text}</motion.div></span>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Số chạy lên / xuống mượt khi giá trị đổi (vd điểm ⭐) */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value), from = useRef(value), [bump, setBump] = useState(0);
  useEffect(() => {
    const a = from.current, b = value; if (a === b) return;
    if (b > a) setBump((k) => k + 1);
    const t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(b - a) * 40);
    let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3; setShown(Math.round(a + (b - a) * e)); if (k < 1) raf = requestAnimationFrame(step); else from.current = b; };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value]);
  return <motion.span key={bump} className={className} initial={{ scale: 1 }} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.35 }}>{shown.toLocaleString('vi-VN')}</motion.span>;
}
