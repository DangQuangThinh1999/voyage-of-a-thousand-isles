import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Thanh tiến trình theo bước cho việc chấm / phân tích (máy chấm nhanh → AI → tổng hợp), có đếm giây */
export function StepProgress({ steps, step, note }: { steps: string[]; step: number; note?: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  const pct = Math.min(96, ((step + 0.5) / steps.length) * 100 + Math.min(20, sec * 0.6));
  return (
    <div className="stepprog" role="status" aria-live="polite">
      <div className="sp-bar"><motion.i animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} /></div>
      <div className="sp-steps">
        {steps.map((s, i) => (
          <span key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
            {i < step ? '✓' : i === step ? <span className="spin" /> : '○'} {s}
          </span>
        ))}
      </div>
      <div className="muted small">⏱ {sec} giây{note ? ` · ${note}` : ''}</div>
    </div>
  );
}
