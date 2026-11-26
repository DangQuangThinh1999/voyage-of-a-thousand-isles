import { Cloud } from '../lib/cloud';
import { minutesToday, streakNow } from '../lib/progress';
import { go, withLeave, useApp } from '../state/store';
import { Breadcrumbs } from './Breadcrumbs';
import { setTheme } from '../state/actions';
import { openSearch } from './SearchModal';

/** Đầu trang: tên app, chuỗi ngày, phút hôm nay, XP, tài khoản + thanh đường dẫn */
export function Header() {
  const { P } = useApp();
  const u = Cloud.user;
  if (typeof document !== 'undefined') document.title = `Hải Trình ${P.settings.target} · Học tiếng Anh`;
  return (
    <header className="top">
      <div className="bar1">
        <div className="brand">⛵ <b>Hải Trình {P.settings.target}</b></div>
        <div id="stats" className="stats">
          <span title="Chuỗi ngày học liên tiếp">🔥 {streakNow(P)}</span>
          <span title="Phút học hôm nay / mục tiêu">⏱️ {minutesToday(P)}/{P.settings.goalMin}′</span>
          <button className="acct" title="Tìm kiếm (Ctrl+K)" onClick={openSearch}>🔍</button>
          <span title="Điểm kinh nghiệm">⭐ {P.xp}</span>
          <button className="acct" title="Đổi giao diện sáng / tối" onClick={() => setTheme(P.settings.theme === 'light' ? 'dark' : 'light')}>{P.settings.theme === 'light' ? '🌙' : '☀️'}</button>
          <button className="acct" data-act="settings" title={u ? u.email || '' : 'Cài đặt & đăng nhập'} onClick={() => withLeave(() => go('settings'))}>
            {u && u.photoURL ? <img src={u.photoURL} alt="" /> : '⚙️'}
          </button>
        </div>
      </div>
      <Breadcrumbs />
    </header>
  );
}
