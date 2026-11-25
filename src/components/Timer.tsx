import { useEffect, useState } from 'react';
import { fmtSec } from '../lib/util';

/** Đồng hồ đếm ngược của câu hỏi trong bài kiểm tra */
export function Timer({ deadline, answered }: { deadline: number; answered: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (answered) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [answered, deadline]);
  const left = Math.ceil((deadline - Date.now()) / 1000);
  return <span id="timer" className={!answered && left <= 5 ? 'timer low' : 'timer'}>⏱ {answered ? '–' : fmtSec(Math.max(0, left))}</span>;
}
