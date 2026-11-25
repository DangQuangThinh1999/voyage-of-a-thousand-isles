import type { ReactNode } from 'react';
import { say } from '../state/session';
import { app, inTest } from '../state/store';

interface Props { text: string; label?: ReactNode; slow?: boolean; limited?: boolean; className?: string; title?: string }
/** Nút loa đọc tiếng Anh. slow = đọc chậm, limited = tính lượt nghe trong bài kiểm tra. */
export function AudioButton({ text, label = '🔊', slow, limited, className = 'icon', title }: Props) {
  return (
    <button className={className} data-act="say" data-slow={slow ? '1' : undefined} data-lim={limited ? '1' : undefined} title={title}
      onClick={() => say(text, { slow, limited })}>{label}</button>
  );
}

/** Loa + đọc chậm. Trong bài kiểm tra (chưa trả lời): 1 nút loa có giới hạn 2 lượt. */
export function SayBoth({ text }: { text: string }) {
  const ss = app.S && app.S.state;
  if (inTest() && ss && !ss.answered) {
    return <AudioButton text={text} limited title="Số lượt nghe còn lại" label={`🔊 còn ${Math.max(0, 2 - ss.plays)}`} />;
  }
  return <><AudioButton text={text} /><AudioButton text={text} slow title="Đọc chậm" label="🐢" /></>;
}
