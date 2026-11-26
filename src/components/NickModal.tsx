import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Cloud } from '../lib/cloud';
import { balance, nickProblem, renameCost } from '../lib/nick';
import { app, emit, save, toast, useApp } from '../state/store';

let openRename: () => void = () => {};
/** Mở hộp đổi tên (từ Cài đặt) */
export const startRename = () => openRename();

/** Lần đầu vào: đặt tên miễn phí 1 lần. Sau đó đổi tên tốn điểm (500, 1.000, 2.000…). */
export function NickModal() {
  const { P } = useApp();
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(() => (Cloud.user?.displayName || '').slice(0, 24));
  const [err, setErr] = useState('');
  openRename = () => { setName(P.nick || ''); setErr(''); setRename(true); };
  const first = !P.nick && P.seenIntro;
  const open = first || rename;
  const cost = renameCost(P), bal = balance(P);
  function submit() {
    const n = name.trim().replace(/\s+/g, ' ');
    const bad = nickProblem(n); if (bad) { setErr(bad); return; }
    if (rename) {
      if (n === P.nick) { setRename(false); return; }
      if (bal < cost) { setErr(`Cần ${cost.toLocaleString('vi-VN')} điểm để đổi tên, bạn đang có ${bal.toLocaleString('vi-VN')} điểm. Học thêm để tích điểm nhé!`); return; }
      app.P.spent = (app.P.spent || 0) + cost;
    }
    app.P.nick = n; app.P.nickN = (app.P.nickN || 0) + 1;
    save(); emit(); setRename(false);
    toast(rename ? `Đã đổi tên thành “${n}” (−${cost.toLocaleString('vi-VN')} điểm)` : `Chào ${n}! 👋`);
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="dlg-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (rename && e.target === e.currentTarget) setRename(false); }}>
          <motion.form className="dlg" onSubmit={(e) => { e.preventDefault(); submit(); }} initial={{ y: 24, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
            <div className="dlg-ic">{rename ? '✏️' : '⛵'}</div>
            <h3>{rename ? 'Đổi tên hiển thị' : 'Chào mừng lên tàu! Bạn tên gì?'}</h3>
            <p>{rename
              ? <>Đổi tên tốn <b>{cost.toLocaleString('vi-VN')} điểm</b> (bạn có {bal.toLocaleString('vi-VN')} điểm). Lần đổi sau sẽ gấp đôi. XP và cấp độ của bạn không bị giảm.</>
              : <>Tên này hiện trên <b>bảng xếp hạng</b>. Bạn được đặt <b>miễn phí 1 lần</b>; muốn đổi sau phải dùng điểm tích được khi học.</>}</p>
            <input className="ans" autoFocus maxLength={24} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Ví dụ: Thịnh, Lan Anh, Captain Minh…" />
            <p className="muted small" style={{ margin: '6px 0 0' }}>2–24 ký tự. Không dùng tên thô tục, bạo lực hoặc gây kích động.</p>
            {err && <p className="note small" style={{ margin: '8px 0 0' }}>{err}</p>}
            <div className="dlg-act" style={{ marginTop: 16 }}>
              {rename ? <button type="button" className="btn ghost big" onClick={() => setRename(false)}>Hủy</button> : <span />}
              <button className="btn big glow" disabled={!name.trim()}>{rename ? `Đổi (−${cost.toLocaleString('vi-VN')})` : 'Lưu tên'}</button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
