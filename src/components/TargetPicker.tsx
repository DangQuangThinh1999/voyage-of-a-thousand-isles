import { TARGETS } from '../lib/progress';
import { setTarget } from '../state/actions';
import { useApp } from '../state/store';

/** Chọn / đổi mục tiêu IELTS (lưu vào cài đặt, đổi lúc nào cũng được) */
export function TargetPicker({ className = 'target' }: { className?: string }) {
  const { P } = useApp();
  return (
    <label className={className}>Mục tiêu: IELTS{' '}
      <select value={P.settings.target} onChange={(e) => setTarget(e.target.value)} title="Đổi mục tiêu">
        {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );
}
