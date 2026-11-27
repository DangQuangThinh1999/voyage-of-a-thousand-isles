// Chọn chủ đề / lĩnh vực cho bài AI tạo (dùng chung: Đọc, Nghe, Nói, Viết, Học theo cụm)
import { LEVELS_GEN, TOPICS } from '../lib/gen';
import type { Src } from '../state/prefs';
import { Dropdown } from './Dropdown';

export function TopicPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <Dropdown label="Chủ đề" value={value} onChange={onChange}
    options={[{ value: -1, icon: '🎲', label: 'Ngẫu nhiên', sub: `Mỗi lần một lĩnh vực khác (${TOPICS.length} lĩnh vực)` }, ...TOPICS.map(([ic, n, a], i) => ({ value: i, icon: ic, label: n, sub: `${a.length} góc nhìn` }))]} />;
}
/** Góc nhìn cụ thể (tiếng Anh) cho chủ đề đã chọn; -1 = ngẫu nhiên */
export function topicAngle(i: number): string {
  const T = TOPICS[i >= 0 ? i : Math.floor(Math.random() * TOPICS.length)];
  return T[2][Math.floor(Math.random() * T[2].length)];
}
/** Chọn mức độ (CEFR ↔ IELTS) */
export function LevelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Dropdown label="Mức độ" value={value} onChange={onChange} grid={3} options={LEVELS_GEN.map(([c, b, l]) => ({ value: c, label: <b>{c}</b>, sub: `${l} · IELTS ${b}` }))} />;
}
/** Tab nguồn bài: 📚 có sẵn trong app / 🤖 AI tạo mới */
export function SrcTabs({ value, onChange }: { value: Src; onChange: (v: Src) => void }) {
  return (
    <div className="src-tabs" role="tablist">
      {([['lib', '📚 Bài có sẵn'], ['ai', '🤖 AI tạo mới']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}
