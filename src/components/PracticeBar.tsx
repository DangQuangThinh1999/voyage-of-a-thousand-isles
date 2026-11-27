// Thanh chọn chung của tab 🎯 Luyện tập: hoạt động (dropdown) · nguồn bài (📚 có sẵn / 🤖 AI) · mức độ · chủ đề.
// Ôn từ, Nói, Đọc, Nghe, Viết, Kỹ năng yếu gộp về 1 chỗ, chọn xong là vào luôn.
import { getParam, go, setParam, useApp, type Screen } from '../state/store';
import { useGenPref } from '../state/prefs';
import { Dropdown } from './Dropdown';
import { LevelPicker, SrcTabs, TopicPicker } from './TopicPicker';

type Act = [key: string, scr: Screen, sub: string | null, icon: string, label: string, desc: string, ai: boolean];
export const ACTS: Act[] = [
  ['read', 'skills', 'read', '📖', 'Đọc hiểu', 'Bài đọc + câu hỏi kiểu IELTS', true],
  ['listen', 'skills', 'listen', '🎧', 'Nghe hiểu', 'Hội thoại, bài giảng, nhiều giọng', true],
  ['speak', 'speak', null, '🗣️', 'Nói', 'Nói theo chủ đề, mẫu câu, hỏi đáp giám khảo', true],
  ['write', 'journal', null, '✍️', 'Viết', 'Viết bài, AI chấm 4 tiêu chí', true],
  ['review', 'review', null, '🔁', 'Ôn từ', 'Lặp lại ngắt quãng các từ đã học', false],
  ['weak', 'skills', 'weak', '📊', 'Kỹ năng yếu', 'Xem kỹ năng nào cần luyện thêm', false],
];
export const PRACTICE_SCREENS: Screen[] = ['skills', 'speak', 'journal', 'review'];
const curAct = (scr: Screen) => (scr === 'skills' ? getParam('t') || 'weak' : scr === 'journal' ? 'write' : scr);
/** Mở 1 hoạt động luyện tập */
export function openAct(key: string) {
  const a = ACTS.find((x) => x[0] === key); if (!a) return;
  go(a[1]); if (a[2]) setParam('t', a[2]);
}

export function PracticeBar() {
  const { scr } = useApp();
  const [p, set] = useGenPref();
  const cur = ACTS.find((a) => a[0] === curAct(scr)) || ACTS[0];
  return (
    <div className="card pbar">
      <div className="pbar-row">
        <Dropdown label="Luyện" value={cur[0]} onChange={openAct} options={ACTS.map(([k, , , ic, l, d]) => ({ value: k, icon: ic, label: l, sub: d }))} />
        {cur[6] && <SrcTabs value={p.src} onChange={(src) => set({ src })} />}
      </div>
      {cur[6] && <div className="pbar-row"><LevelPicker value={p.cefr} onChange={(cefr) => set({ cefr })} />{p.src === 'ai' && <TopicPicker value={p.topic} onChange={(topic) => set({ topic })} />}</div>}
    </div>
  );
}
