// Menu trượt (điện thoại): hồ sơ + chỉ số, tìm kiếm, tất cả mục học, sáng/tối, cài đặt. Header & thanh dưới chỉ giữ cái chính.
import { AnimatePresence, motion } from 'motion/react';
import { Cloud } from '../lib/cloud';
import { titleOf, xpLevel } from '../lib/level';
import { bankLearned, levelNow, minutesToday, streakNow } from '../lib/progress';
import { setTheme } from '../state/actions';
import { app, emit, tab, useApp, withLeave, type Screen } from '../state/store';
import { openSearch } from './SearchModal';
import { Bar } from './ui';

export const openDrawer = () => { app.drawer = true; emit(); };
const close = () => { app.drawer = false; emit(); };

const ITEMS: [Screen, string, string, string][] = [
  ['home', '🏠', 'Trang chính', 'Tổng quan, học tiếp'],
  ['words', '📗', 'Từ vựng', 'Từ mới, theo cụm, mốc 100 từ'],
  ['grammar', '📐', 'Ngữ pháp', 'Thư viện, sửa lỗi'],
  ['ipa', '🔊', 'Phát âm', 'IPA, trọng âm, nối âm'],
  ['skills', '🎯', 'Luyện tập', 'Đọc · Nghe · Nói · Viết · Ôn từ'],
  ['fun', '🎮', 'Giải trí', 'Trò chơi từ vựng, đọc có hình'],
  ['stats', '🏆', 'Thành tựu', 'Cấp độ, xếp hạng'],
  ['plan', '🗺️', 'Lộ trình', 'Kế hoạch từng tuần'],
];

export function Drawer() {
  const { P, scr, drawer } = useApp();
  const u = Cloud.user, L = xpLevel(P.xp);
  const goTo = (s: Screen) => { close(); withLeave(() => tab(s)); };
  return (
    <AnimatePresence>
      {drawer && (
        <>
          <motion.div className="drw-ov" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drw" role="dialog" aria-label="Menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.22 }}>
            <div className="drw-head">
              <div className="drw-av">{u && u.photoURL ? <img src={u.photoURL} alt="" /> : <img src="/icon-64.png" alt="" />}</div>
              <div className="flex-1">
                <b>{P.nick || u?.displayName || 'Người học'}</b>
                <div className="muted small">Cấp {L.lv} · {titleOf(L.lv)}</div>
              </div>
              <button className="drw-x" aria-label="Đóng" onClick={close}>✕</button>
            </div>
            <Bar pct={L.pct * 100} h={5} color="linear-gradient(90deg,#22d3ee,#a78bfa)" />
            <div className="drw-stats">
              <span>🎯 <b>{levelNow(P).replace('dưới ', '<')}</b><small>→ {P.settings.target}</small></span>
              <span>⭐ <b>{P.xp}</b><small>XP</small></span>
              <span>🔥 <b>{streakNow(P)}</b><small>ngày</small></span>
              <span>⏱️ <b>{minutesToday(P)}</b><small>/{P.settings.goalMin}′</small></span>
              <span>📗 <b>{bankLearned(P)}</b><small>từ</small></span>
            </div>
            <button className="drw-search" onClick={() => { close(); openSearch(); }}>🔍 Tìm từ, bài học…</button>
            <nav className="drw-nav">
              {ITEMS.map(([s, ic, n, d]) => (
                <button key={s} className={s === scr ? 'on' : ''} onClick={() => goTo(s)}><span className="ic">{ic}</span><span><b>{n}</b><small>{d}</small></span></button>
              ))}
            </nav>
            <div className="drw-foot">
              <button onClick={() => setTheme(P.settings.theme === 'light' ? 'dark' : 'light')}>{P.settings.theme === 'light' ? '🌙 Giao diện tối' : '☀️ Giao diện sáng'}</button>
              <button onClick={() => goTo('settings')}>⚙️ Cài đặt{u ? '' : ' · đăng nhập'}</button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
