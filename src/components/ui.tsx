// Khối giao diện dùng chung: vòng tiến độ, thanh tiến độ, thẻ có hiệu ứng, nút chọn mục, bảng chấm điểm IELTS.
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CoachResult } from '../lib/coach';

/** Mức tiến độ → màu: 0 chưa học (mờ) · 1 mới bắt đầu (cam) · 2 nửa chặng (vàng) · 3 gần xong (xanh dương) · 4 xong (xanh lá) */
export const toneOf = (pct: number) => (pct <= 0 ? 0 : pct >= 1 ? 4 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : 3);
export const toneCls = (pct: number) => 'tone-' + toneOf(pct);
/** Thanh tiến độ mảnh, màu theo mức tiến độ (pct 0–1) */
export function MiniBar({ pct }: { pct: number }) {
  return <i className={'mini-bar ' + toneCls(pct)}><i style={{ width: `${Math.min(1, Math.max(0, pct)) * 100}%` }} /></i>;
}
/** Vòng tiến độ nhỏ, màu theo mức tiến độ (pct 0–1) */
export function MiniRing({ pct, size = 28 }: { pct: number; size?: number }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r, p = Math.min(1, Math.max(0, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={'shrink-0 -rotate-90 mini-ring ' + toneCls(p)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tone)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c}
        initial={false} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 0.6 }} />
    </svg>
  );
}

/** Vòng tiến độ (SVG) có hiệu ứng chạy */
export function Ring({ pct, size = 88, stroke = 9, color = 'var(--pri)', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">{children}</div>
    </div>
  );
}

/** Thanh tiến độ có hiệu ứng */
export function Bar({ pct, color = 'var(--pri)', h = 10 }: { pct: number; color?: string; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-line" style={{ height: h }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
    </div>
  );
}

/** Thẻ hiện dần khi mở trang */
export function Section({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={`card ${className}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      {children}
    </motion.div>
  );
}

/** Nút chọn mục (dạng viên thuốc, có hiệu ứng trượt) */
export function Pills<T extends string>({ value, items, onChange, id }: { value: T; items: [T, string][]; onChange: (v: T) => void; id: string }) {
  const box = useRef<HTMLDivElement>(null);
  // thanh tab vuốt ngang (điện thoại): tự cuộn để tab đang chọn hiện đầy đủ (không cuộn cả trang)
  useEffect(() => {
    const el = box.current, on = el?.querySelector<HTMLElement>('button.on');
    if (el && on && el.scrollWidth > el.clientWidth) el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
  }, [value]);
  return (
    <div className="pills" ref={box}>
      {items.map(([k, label]) => (
        <button key={k} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>
          {k === value && <motion.span layoutId={`pill-${id}`} className="pill-bg" transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

const bandColor = (b: number) => (b >= 7 ? 'var(--good)' : b >= 5.5 ? 'var(--pri)' : b >= 4.5 ? '#e0a800' : 'var(--bad)');
/** Bảng chấm điểm kiểu IELTS: điểm tổng + từng tiêu chí + lỗi cần sửa */
export function CoachReport({ r, title }: { r: CoachResult; title: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Section className="coach">
      <div className="flex items-center gap-4">
        <Ring pct={(r.band - 3) / 6} size={96} color={bandColor(r.band)}><div><div className="text-2xl font-extrabold">{r.band.toFixed(1)}</div><div className="text-xs text-muted">ước tính</div></div></Ring>
        <div className="flex-1">
          <h3 className="m-0">{title}</h3>
          <p className="muted small m-0">Điểm ước tính theo 4 tiêu chí IELTS (máy chấm, không thay giám khảo thật).{r.offline ? ' Không kết nối được máy chấm ngữ pháp.' : ''}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {r.criteria.map((c) => (
          <div key={c.name}>
            <div className="flex justify-between text-sm font-bold"><span>{c.name}</span><span style={{ color: bandColor(c.band) }}>{c.band.toFixed(1)}</span></div>
            <Bar pct={((c.band - 3) / 6) * 100} color={bandColor(c.band)} h={8} />
            <ul className="m-0 mt-1 pl-5 text-sm text-muted">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        ))}
      </div>
      {r.issues.length > 0 && (
        <details className="mt-3" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="font-bold">✏️ {r.issues.length} lỗi cần sửa</summary>
          <ul className="checks mt-2">
            {r.issues.map((x, i) => <li key={i}>✗ {x.kind}: <b className="badc">“{x.bad}”</b>{x.fix.length ? <> → <b className="okc">{x.fix.join(' / ')}</b></> : null}<br /><span className="muted small">{x.msg}</span></li>)}
          </ul>
        </details>
      )}
    </Section>
  );
}
