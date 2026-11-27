// Thẻ xếp chồng kiểu motion.dev: phía sau có 2 thẻ mờ nghiêng, thẻ trên cùng kéo ngang để sang thẻ tiếp (hoặc bấm nút).
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { ReactNode } from 'react';

export function SwipeStack({ children, onNext, hint = '← kéo thẻ để sang từ tiếp →', className = '' }: { children: ReactNode; onNext: () => void; hint?: string; className?: string }) {
  const x = useMotionValue(0), rotate = useTransform(x, [-220, 220], [-12, 12]), op = useTransform(x, [-260, 0, 260], [0.2, 1, 0.2]);
  return (
    <div className="swipe">
      <div className="swipe-back b2" /><div className="swipe-back b1" />
      <motion.div className={'swipe-top ' + className} style={{ x, rotate, opacity: op }} drag="x" dragElastic={0.6} dragConstraints={{ left: 0, right: 0 }}
        initial={{ scale: 0.92, y: 14, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
        onDragEnd={(_, i) => {
          if (Math.abs(i.offset.x) > 110 || Math.abs(i.velocity.x) > 600) animate(x, Math.sign(i.offset.x || 1) * 520, { duration: 0.22 }).then(onNext);
        }}>
        {children}
      </motion.div>
      <p className="muted small center m-0 swipe-hint">{hint}</p>
    </div>
  );
}
