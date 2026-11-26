// Popup nhắc đăng nhập cho KHÁCH: không đăng nhập thì tiến độ không được lưu, đóng trang là mất.
import { AnimatePresence, motion } from 'motion/react';
import { Cloud } from '../lib/cloud';
import { login } from '../state/actions';
import { app, emit, useApp } from '../state/store';

export function LoginPrompt() {
  const { loginAsk } = useApp();
  const open = loginAsk && Cloud.configured && Cloud.resolved && !Cloud.user;
  const close = () => { app.loginAsk = false; app.loginAsked = true; emit(); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dlg-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="dlg login-dlg" role="dialog" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
            <div className="huge">🔐</div>
            <h3 className="m-0">Đăng nhập để lưu tiến độ</h3>
            <p>Bạn đang học ở <b>chế độ khách</b>: tiến độ chỉ được giữ trong lúc trang đang mở. <b className="bad">Đóng trang web là mất hết</b> từ đã học, điểm, bài kiểm tra.</p>
            <ul className="small login-perks">
              <li>💾 Tự lưu tiến độ lên mây, không bao giờ mất</li>
              <li>📱 Học tiếp trên điện thoại, máy tính khác</li>
              <li>🤖 Dùng các phần AI chấm bài, soạn đề (100 lượt/ngày)</li>
              <li>🏆 Có tên trên bảng xếp hạng</li>
            </ul>
            <div className="row gap wrap center-row">
              <button className="btn big" onClick={() => { close(); login(); }}>🔑 Đăng nhập Google</button>
              <button className="btn ghost" onClick={close}>Học thử, không lưu</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Nhãn trên header cho khách: nhắc tiến độ chưa được lưu */
export function GuestChip() {
  useApp();
  if (!Cloud.configured || !Cloud.resolved || Cloud.user) return null;
  return <button className="aichip warn" title="Chưa đăng nhập: đóng trang là mất tiến độ" onClick={() => login()}>💾 <span className="d-only">Chưa lưu · </span>Đăng nhập</button>;
}
