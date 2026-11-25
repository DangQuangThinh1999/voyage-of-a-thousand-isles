import type { ReactNode } from 'react';

interface Props {
  items: ReactNode[]; answered: boolean; correctIdx?: number; pickedIdx?: number;
  grid2?: boolean; optClass?: string; onPick: (i: number) => void;
}
/** Danh sách đáp án trắc nghiệm, tô xanh/đỏ sau khi trả lời */
export function ChoiceList({ items, answered, correctIdx, pickedIdx, grid2, optClass, onPick }: Props) {
  return (
    <div className={grid2 ? 'opts grid2' : 'opts'}>
      {items.map((label, i) => {
        const c = answered ? (i === correctIdx ? 'right' : i === pickedIdx ? 'wrong' : 'dim') : '';
        return (
          <button key={i} className={['opt', optClass, c].filter(Boolean).join(' ')} data-act="pick" data-i={i} disabled={answered}
            onClick={() => onPick(i)}>{label}</button>
        );
      })}
    </div>
  );
}
