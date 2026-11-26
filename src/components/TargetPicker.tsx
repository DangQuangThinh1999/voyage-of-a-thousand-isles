import { TARGETS } from '../lib/progress';
import { setTarget } from '../state/actions';
import { useApp } from '../state/store';
import { Dropdown } from './Dropdown';

const CEFR: Record<string, string> = { '4.0': 'B1', '4.5': 'B1', '5.0': 'B1', '5.5': 'B1+', '6.0': 'B2', '6.5': 'B2', '7.0': 'C1', '7.5': 'C1', '8.0': 'C1', '8.5': 'C2', '9.0': 'C2' };
/** Chọn / đổi mục tiêu IELTS: bảng các mức điểm (kèm trình độ CEFR) */
export function TargetPicker({ className = '' }: { className?: string }) {
  const { P } = useApp();
  return (
    <Dropdown className={`target ${className}`} label="🎯 Mục tiêu" value={P.settings.target} onChange={setTarget} grid={3}
      options={TARGETS.map((t) => ({ value: t, label: <b>{t}</b>, sub: CEFR[t] }))} />
  );
}
