// Bảng trượt lên từ dưới màn hình (điện thoại) / hộp giữa màn hình (máy tính).
// Dùng cho mọi "xem chi tiết" để nội dung hiện ngay trước mắt, không nằm tít bên dưới trang.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

interface Props { open: boolean; onClose: () => void; head: ReactNode; foot?: ReactNode; children: ReactNode; bodyKey?: string }
export function Sheet({ open, onClose, head, foot, children, bodyKey }: Props) {
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', f);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', f); document.body.style.overflow = o; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div role="dialog" aria-modal="true" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}>
            <div className="sheet-grip" />
            <header className="sheet-h"><div className="grow">{head}</div><button className="btn ghost sm" aria-label="Đóng" onClick={onClose}>✕</button></header>
            <div className="sheet-b" key={bodyKey}>{children}</div>
            {foot && <footer className="sheet-f">{foot}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
