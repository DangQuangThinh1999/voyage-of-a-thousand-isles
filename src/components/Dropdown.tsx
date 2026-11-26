// Ô chọn tự thiết kế (thay ô <select> mặc định của trình duyệt): bảng nổi có hiệu ứng, bấm ra ngoài hoặc Esc để đóng,
// dùng phím mũi tên ↑ ↓ và Enter để chọn.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface Opt<T> { value: T; label: ReactNode; sub?: ReactNode; icon?: ReactNode }
interface Props<T> { value: T; options: Opt<T>[]; onChange: (v: T) => void; className?: string; label?: ReactNode; grid?: number; align?: 'left' | 'right' }

export function Dropdown<T extends string | number>({ value, options, onChange, className = '', label, grid, align = 'left' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const cur = options.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return;
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    const out = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [open, options, value]);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); if (!open) setOpen(true); else setHi((h) => Math.min(options.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); onChange(options[hi].value); setOpen(false); }
  };
  return (
    <div ref={ref} className={`dd ${className}`} onKeyDown={key}>
      <button type="button" className={open ? 'dd-btn on' : 'dd-btn'} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        {label && <span className="dd-lbl">{label}</span>}
        <span className="dd-val">{cur?.icon}{cur?.label}</span>
        <motion.span className="dd-car" animate={{ rotate: open ? 180 : 0 }}>▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="listbox" className={`dd-menu ${align}`} style={grid ? { display: 'grid', gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))`, gap: 6 } : undefined}
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}>
            {options.map((o, i) => (
              <button key={String(o.value)} type="button" role="option" aria-selected={o.value === value}
                className={['dd-opt', o.value === value && 'sel', i === hi && 'hi', grid && 'cell'].filter(Boolean).join(' ')}
                onMouseEnter={() => setHi(i)} onClick={() => { onChange(o.value); setOpen(false); }}>
                {o.icon && <span className="dd-ic">{o.icon}</span>}
                <span className="dd-t"><span>{o.label}</span>{o.sub && <small>{o.sub}</small>}</span>
                {o.value === value && !grid && <span className="dd-ck">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
