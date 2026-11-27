import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useApp } from '../state/store';

/** Hộp thoại xác nhận tự thiết kế: nền mờ, thẻ phát sáng, Enter = đồng ý, Esc = hủy */
export function ConfirmDialog() {
  const { dlg } = useApp();
  useEffect(() => {
    if (!dlg) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !dlg.sticky) dlg.resolve(false); if (e.key === 'Enter') { e.preventDefault(); dlg.resolve(true); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [dlg]);
  return (
    <AnimatePresence>
      {dlg && (
        <motion.div className="dlg-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !dlg.sticky) dlg.resolve(false); }}>
          <motion.div role="dialog" aria-modal="true" className={`dlg ${dlg.danger ? 'danger' : ''}`} initial={{ y: 24, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 12, scale: 0.96, opacity: 0 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}>
            <div className="dlg-ic">{dlg.icon}</div>
            <h3>{dlg.title}</h3>
            {dlg.msg && <p>{dlg.msg}</p>}
            <div className="dlg-act">
              <button className="btn ghost big" onClick={() => dlg.resolve(false)}>{dlg.cancel}</button>
              <button className={`btn big ${dlg.danger ? 'danger' : 'glow'}`} autoFocus onClick={() => dlg.resolve(true)}>{dlg.ok}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
