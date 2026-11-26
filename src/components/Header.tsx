import { Cloud } from '../lib/cloud';
import { minutesToday, streakNow } from '../lib/progress';
import { go, leaveOk, useApp } from '../state/store';
import { Breadcrumbs } from './Breadcrumbs';
import { setTheme } from '../state/actions';

/** Đầu trang: tên app, chuỗi ngày, phút hôm nay, XP, tài khoản + thanh đường dẫn */
export function Header() {
  const { P } = useApp();
  const u = Cloud.user;
  return (
    <header className="top">
      <div className="bar1">
        <div className="brand">⛵ <b>Hải Trình 5.5</b></div>
        <div id="stats" className="stats">
          <span title="Chuỗi ngày học liên tiếp">🔥 {streakNow(P)}</span>
          <span title="Phút học hôm nay / mục tiêu">⏱️ {minutesToday(P)}/{P.settings.goalMin}′</span>
          <span title="Điểm kinh nghiệm">⭐ {P.xp}</span>
          <button className="acct" title="Đổi giao diện sáng / tối" onClick={() => setTheme(P.settings.theme === 'light' ? 'dark' : 'light')}>{P.settings.theme === 'light' ? '🌙' : '☀️'}</button>
          <button className="acct" data-act="settings" title={u ? u.email || '' : 'Cài đặt & đăng nhập'} onClick={() => leaveOk() && go('settings')}>
            {u && u.photoURL ? <img src={u.photoURL} alt="" /> : '⚙️'}
          </button>
        </div>
      </div>
      <Breadcrumbs />
    </header>
  );
}
