// Chọn chủ đề / lĩnh vực cho bài AI tạo (dùng chung: Đọc, Nghe, Nói, Viết, Học theo cụm)
import { TOPICS } from '../lib/gen';
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
