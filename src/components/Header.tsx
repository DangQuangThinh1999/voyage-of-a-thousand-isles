import { useEffect } from 'react';
import { Cloud } from '../lib/cloud';
import { quota, refreshQuota } from '../lib/ai';
import { minutesToday, streakNow } from '../lib/progress';
import { go, withLeave, useApp } from '../state/store';
import { Breadcrumbs } from './Breadcrumbs';
import { setTheme } from '../state/actions';
import { openSearch } from './SearchModal';
import { GuestChip } from './LoginPrompt';
import { openDrawer } from './Drawer';

/** Đầu trang: tên app, chuỗi ngày, phút hôm nay, XP, tài khoản + thanh đường dẫn */
export function Header() {
  const { P } = useApp();
  const u = Cloud.user;
  // đo chiều cao header → biến CSS --toph, để thanh tiêu đề + tab của trang dính ngay bên dưới khi cuộn
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('header.top'); if (!el) return;
    const set = () => document.documentElement.style.setProperty('--toph', el.offsetHeight + 'px');
    set(); const ro = new ResizeObserver(set); ro.observe(el);
    // thanh tiêu đề + tab chỉ có nền khi đang dính trên đầu trang (lúc cuộn xuống), bình thường trong suốt
    const stick = () => { const h = el.offsetHeight; document.querySelectorAll<HTMLElement>('.pagehead').forEach((p) => p.classList.toggle('stuck', scrollY > 4 && p.getBoundingClientRect().top <= h + 1)); };
    addEventListener('scroll', stick, { passive: true, capture: true }); stick();
    return () => { ro.disconnect(); removeEventListener('scroll', stick, { capture: true }); };
  }, []);
  if (typeof document !== 'undefined') document.title = `Hải Trình ${P.settings.target} · Học tiếng Anh`;
  return (
    <header className="top">
      <div className="bar1">
        <div className="brand">
          <button className="menu-btn m-only" aria-label="Mở menu" onClick={openDrawer}><i /><i /><i /></button>
          <button className="home-btn d-only" title="Về trang chính (Dashboard)" aria-label="Về trang chính" onClick={() => withLeave(() => go('home'))}>🏠</button>
          <button className="brand-link" title="Về trang chính" onClick={() => withLeave(() => go('home'))}><img className="brand-logo" src="/icon-64.png" alt="" width="28" height="28" /> <b>Hải Trình {P.settings.target}</b></button>
        </div>
        <div id="stats" className="stats">
          <GuestChip />
          <AiChip />
          <span className="d-only" title="Chuỗi ngày học liên tiếp">🔥 {streakNow(P)}</span>
          <span className="d-only" title="Phút học hôm nay / mục tiêu">⏱️ {minutesToday(P)}/{P.settings.goalMin}′</span>
          <button className="acct" title="Tìm kiếm (Ctrl+K)" onClick={openSearch}>🔍</button>
          <span className="d-only" title="Điểm kinh nghiệm">⭐ {P.xp}</span>
          <button className="acct d-only" title="Đổi giao diện sáng / tối" onClick={() => setTheme(P.settings.theme === 'light' ? 'dark' : 'light')}>{P.settings.theme === 'light' ? '🌙' : '☀️'}</button>
          <button className="acct" data-act="settings" title={u ? u.email || '' : 'Cài đặt & đăng nhập'} onClick={() => withLeave(() => go('settings'))}>
            {u && u.photoURL ? <img src={u.photoURL} alt="" /> : '⚙️'}
          </button>
        </div>
      </div>
      <Breadcrumbs />
    </header>
  );
}

/** Lượt AI hôm nay: người học "🤖 73/100", admin "🤖 admin · 12"; bấm để xem chi tiết trong Cài đặt / Quản lý */
function AiChip() {
  const uid = Cloud.user?.uid;
  useEffect(() => { refreshQuota(); const t = setInterval(() => refreshQuota(), 5 * 60_000); return () => clearInterval(t); }, [uid]);
  if (!quota.on) return null;
  if (!quota.login && !Cloud.user && Cloud.resolved) return null;
  if (!quota.login) return <button className="aichip warn" title="Đăng nhập để dùng AI" onClick={() => go('settings')}>🤖 Đăng nhập để dùng AI</button>;
  if (quota.admin) return <button className="aichip" title="Admin: lượt đã dùng hôm nay · bấm để mở trang Quản lý" onClick={() => go('admin')}>🤖 admin · {quota.used}</button>;
  const low = (quota.remaining ?? 0) <= 10;
  return <button className={'aichip ' + (low ? 'warn' : '')} title="Lượt AI còn lại hôm nay (lượt mới lúc 15 giờ VN)" onClick={() => go('settings')}>🤖 {quota.remaining}/{quota.limit}</button>;
}
