import type { Unit } from '../data';
import { doneCount, KINDS, type Progress } from '../lib/progress';
import { go } from '../state/store';
import { toneCls } from './ui';

/** Thẻ bài học ở trang chủ: emoji, tên, 5 chấm tiến độ. Mở hết, màu theo mức tiến độ (chưa học = mờ). */
export function UnitCard({ u, P }: { u: Unit; P: Progress }) {
  const dc = doneCount(P, u.id);
  return (
    <button className={'unit ' + toneCls(dc / 5)} data-act="unit" data-u={u.id} onClick={() => go('unit', u.id)}>
      <span className="em">{u.emoji}</span>
      <span className="t"><b>{u.title}</b><small>{u.vi}</small></span>
      <span className="dots">{KINDS.map(([k]) => <i key={k} className={(P.units[u.id] || {})[k] ? 'on' : undefined} />)}</span>
    </button>
  );
}
