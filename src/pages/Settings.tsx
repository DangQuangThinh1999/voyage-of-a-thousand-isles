import { Card } from '../components/Card';
import { TargetPicker } from '../components/TargetPicker';
import { Cloud } from '../lib/cloud';
import { englishVoices, pickVoice } from '../lib/speech';
import { login, logout, reset, setGoal, setRate, setVoice } from '../state/actions';
import { say } from '../state/session';
import { go, useApp } from '../state/store';

const GOALS = [30, 60, 120, 180, 210, 240];
/** Cài đặt: tài khoản, micro, giọng đọc, mục tiêu, xóa tiến độ */
export function Settings() {
  const { P } = useApp();
  const u = Cloud.user, vs = englishVoices(), cur = pickVoice();
  return (
    <>
      <div className="row gap"><h2>⚙️ Cài đặt</h2></div>
      <Card><h3>Tài khoản</h3>
        {!Cloud.configured ? <p className="muted">Chưa cấu hình Firebase. Tiến độ chỉ lưu trên trình duyệt này.</p>
          : u ? <><p>Đã đăng nhập: <b>{u.email || u.displayName || ''}</b>. Tiến độ tự lưu lên mây.</p><button className="btn ghost" data-act="logout" onClick={logout}>Đăng xuất</button></>
            : <><p>Đăng nhập Google để lưu tiến độ lên mây và học trên nhiều máy.</p><button className="btn" data-act="login" onClick={login}>Đăng nhập Google</button></>}
      </Card>
      <Card><h3>Micro</h3><p className="muted small">Kiểm tra micro, xem máy nghe được bao nhiêu từ và nghe lại giọng mình.</p><button className="btn" data-act="tab" data-tab="mic" onClick={() => go('mic')}>🎤 Test micro</button></Card>
      <Card><h3>Giọng đọc</h3>
        {vs.length ? <select id="voice" value={cur ? cur.name : undefined} onChange={(e) => setVoice(e.target.value)}>{vs.map((v) => <option key={v.name + v.lang}>{v.name}</option>)}</select>
          : <p className="muted">Không tìm thấy giọng đọc tiếng Anh. Hãy dùng Chrome hoặc Edge.</p>}
        <label className="lbl">Tốc độ: <b id="rateV">{P.settings.rate}</b></label>
        <input id="rate" type="range" min="0.5" max="1.1" step="0.05" value={P.settings.rate} onChange={(e) => setRate(+e.target.value)} />
        <button className="btn ghost" data-act="say" onClick={() => say('Hello! How are you today?')}>🔊 Thử giọng</button>
      </Card>
      <Card><h3>Mục tiêu IELTS</h3><TargetPicker /><p className="muted small">Đổi lúc nào cũng được. Mục tiêu hiện ở cột bên trái và đầu trang.</p></Card>
      <Card><h3>Mục tiêu mỗi ngày</h3>
        <select id="goal" value={P.settings.goalMin} onChange={(e) => setGoal(+e.target.value)}>
          {GOALS.map((m) => <option key={m} value={m}>{m} phút{m === 210 ? ' (đủ cho 5.5 trong 3 tháng)' : ''}</option>)}
        </select>
      </Card>
      <Card><h3>Xóa tiến độ</h3><p className="muted small">Xóa toàn bộ tiến độ trên máy này. Không thể hoàn tác.</p><button className="btn danger" data-act="reset" onClick={reset}>Xóa tiến độ</button></Card>
    </>
  );
}
