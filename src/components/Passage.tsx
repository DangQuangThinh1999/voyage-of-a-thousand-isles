import type { Unit } from '../data';
import { showLine } from '../state/session';
import type { StepState } from '../state/store';

/** Đoạn văn đọc. clickable: bấm câu để nghe và xem nghĩa. */
export function Passage({ u, clickable, ss }: { u: Unit; clickable: boolean; ss?: StepState | null }) {
  return (
    <div className="passage">
      {u.reading.map(([en, vi], i) => (
        <p key={i} data-act={clickable ? 'line' : undefined} data-i={clickable ? i : undefined} className={clickable ? 'click' : undefined}
          onClick={clickable ? () => showLine(i) : undefined}>
          {en}
          {' '}{ss && (ss.showVi || ss.line === i) && <span className="muted">{vi}</span>}
        </p>
      ))}
    </div>
  );
}
