import type { Unit } from '../data';
import { doneCount, KINDS, type Progress } from '../lib/progress';
import { go, toast } from '../state/store';

/** Thẻ bài học ở trang chủ: emoji, tên, 5 chấm tiến độ, khóa nếu chưa mở */
export function UnitCard({ u, P, locked }: { u: Unit; P: Progress; locked: boolean }) {
  const dc = doneCount(P, u.id);
  const cls = ['unit', locked && 'locked', dc === 5 && 'done'].filter(Boolean).join(' ');
  return (
    <button className={cls} data-act={locked ? 'locked' : 'unit'} data-u={u.id}
      onClick={() => (locked ? toast('🔒 Làm xong 3/5 phần của bài trước để mở bài này') : go('unit', u.id))}>
      <span className="em">{locked ? '🔒' : u.emoji}</span>
      <span className="t"><b>{u.title}</b><small>{u.vi}</small></span>
      <span className="dots">{KINDS.map(([k]) => <i key={k} className={(P.units[u.id] || {})[k] ? 'on' : undefined} />)}</span>
    </button>
  );
}
