import { leaveOk, tab, useApp, type Screen } from '../state/store';

export const TABS: [Screen, string, string][] = [['home', '🏠', 'Học'], ['words', '📗', 'Từ mới'], ['review', '🔁', 'Ôn từ'], ['grammar', '📐', 'Ngữ pháp'], ['speak', '🗣️', 'Giao tiếp'], ['skills', '🎯', 'Kỹ năng'], ['journal', '✍️', 'Viết'], ['stats', '🏆', 'Thành tựu'], ['plan', '🗺️', 'Lộ trình']];
/** Thanh tab dưới cùng (ẩn khi đang làm bài) */
export function Tabs() {
  const { scr } = useApp();
  return (
    <nav className="tabs" style={scr === 'session' ? { display: 'none' } : undefined}>
      {TABS.map(([t, ic, name]) => {
        const on = t === scr || (t === 'home' && (scr === 'unit' || scr === 'session'));
        return <button key={t} className={on ? 'on' : undefined} data-act="tab" data-tab={t} onClick={() => leaveOk() && tab(t)}><span>{ic}</span>{name}</button>;
      })}
    </nav>
  );
}
