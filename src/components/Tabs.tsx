import { withLeave, tab, useApp, type Screen } from '../state/store';
import { openDrawer } from './Drawer';

export const TABS: [Screen, string, string][] = [['home', '🏠', 'Học'], ['words', '📗', 'Từ mới'], ['review', '🔁', 'Ôn từ'], ['grammar', '📐', 'Ngữ pháp'], ['speak', '🗣️', 'Giao tiếp'], ['ipa', '🔊', 'Phát âm'], ['skills', '🎯', 'Kỹ năng'], ['journal', '✍️', 'Viết'], ['stats', '🏆', 'Thành tựu'], ['plan', '🗺️', 'Lộ trình']];
/** Thanh tab dưới cùng (ẩn khi đang làm bài) */
export function Tabs() {
  const { scr } = useApp();
  return (
    <nav className="tabs" style={scr === 'session' ? { display: 'none' } : undefined}>
      {TABS.map(([t, ic, name], i) => {
        const on = t === scr || (t === 'home' && (scr === 'unit' || scr === 'session'));
        // điện thoại: chỉ 4 mục chính + nút "Thêm" mở menu
        return <button key={t} className={(on ? 'on ' : '') + (i >= 4 ? 'd-only' : '')} data-act="tab" data-tab={t} onClick={() => withLeave(() => tab(t))}><span>{ic}</span>{name}</button>;
      })}
      <button className={'m-only ' + (TABS.slice(4).some(([t]) => t === scr) ? 'on' : '')} onClick={openDrawer}><span>☰</span>Thêm</button>
    </nav>
  );
}
