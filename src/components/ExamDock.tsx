// Thanh nổi góc màn hình: AI đang soạn đề (đi trang khác vẫn thấy), hoặc đề hôm nay đã soạn xong chưa làm.
import { motion, AnimatePresence } from 'motion/react';
import { EXAMS, openExam } from '../state/exam';
import { useApp } from '../state/store';

export function ExamDock() {
  const { scr } = useApp();
  if (scr === 'exam') return null;
  const gen = Object.values(EXAMS).find((e) => e.status === 'gen');
  const ready = Object.values(EXAMS).find((e) => e.status === 'ready' && !Object.keys(e.ans.q).length && !e.ans.writing);
  const E = gen || ready;
  return (
    <AnimatePresence>
      {E && (
        <motion.button key={E.key + E.status} className="examdock" onClick={() => openExam(E.key)} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
          {E.status === 'gen' ? <>
            <span className="spin" /> <span><b>AI đang soạn {E.title.toLowerCase()}</b><small>{Object.values(E.parts).filter((x) => x === 'ok').length}/3 phần · bấm để xem</small></span>
            <i style={{ width: `${10 + Object.values(E.parts).filter((x) => x === 'ok').length * 30}%` }} />
          </> : <>📝 <span><b>Đề {E.title.toLowerCase()} sẵn sàng</b><small>Giữ tới hết hôm nay · bấm để làm</small></span></>}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
