import { useEffect, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { Card } from '../components/Card';
import { ListenBack, LiveText, MicMeter, RecordBack } from '../components/MicRecorder';
import { WordsHit } from '../components/WordsHit';
import { SR } from '../lib/speech';
import { MIC_SAMPLE, micTest } from '../state/actions';
import { useApp } from '../state/store';

type Devices = { text: string } | { list: { id: string; def: boolean; label: string }[] };
/** Danh sách micro trên máy */
function useDevices(dep: unknown): Devices {
  const [d, setD] = useState<Devices>({ text: 'Đang kiểm tra…' });
  useEffect(() => {
    let live = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((all) => {
      if (!live) return;
      const ds = all.filter((x) => x.kind === 'audioinput');
      if (!ds.length) setD({ text: 'Không tìm thấy micro nào.' });
      else if (!ds[0].label) setD({ text: `Có ${ds.length} micro. Bấm 🎤 và cho phép dùng micro để xem tên.` });
      else setD({ list: ds.filter((x) => x.deviceId !== 'communications').map((x) => ({ id: x.deviceId, def: x.deviceId === 'default', label: x.label.replace(/^Default - /, '') })) });
    }).catch(() => { if (live) setD({ text: 'Không đọc được danh sách micro.' }); });
    return () => { live = false; };
  }, [dep]);
  return d;
}

/** Trang kiểm tra micro: đọc câu mẫu, xem máy nghe được gì, nghe lại giọng mình */
export function MicTest() {
  const { MT } = useApp();
  const r = MT.res;
  const devices = useDevices(`${MT.busy}${!!r}`);
  return (
    <>
      <h2>🎤 Test micro</h2>
      {!SR && <p className="note">Trình duyệt này không hỗ trợ nhận giọng nói. Hãy mở bằng <b>Google Chrome</b> hoặc <b>Microsoft Edge</b> trên máy tính hoặc Android.</p>}
      <Card>
        <p>Bấm 🎤 rồi <b>đọc to cả câu</b> dưới đây. Chữ sẽ hiện ra ngay khi bạn nói, thanh màu cho biết micro có thu được tiếng không.</p>
        <p className="en center">{MIC_SAMPLE} <AudioButton text={MIC_SAMPLE} /></p>
        <div className="center"><button className={MT.busy ? 'mic rec' : 'mic'} data-act="micTest" disabled={!SR} onClick={micTest}>{MT.busy ? '⏹' : '🎤'}</button>
          <p className="muted small">{MT.busy ? 'Đang nghe… nói xong im lặng 2 giây hoặc bấm ⏹' : 'Bấm để bắt đầu'}</p></div>
        {!SR && <div className="center"><p className="note small">Trình duyệt này không nhận giọng nói (dùng Chrome/Edge để máy chấm). Vẫn ghi âm để kiểm tra micro được:</p><RecordBack text={MIC_SAMPLE} /></div>}
        <MicMeter active={MT.busy} />
        <LiveText placeholder="…" active={MT.busy} />
        {r && (r.err !== undefined ? <p className="note">{r.err}</p> : (
          <div className="score">
            <WordsHit T={r.T} hit={r.hit} />
            <p>Máy nghe được <b>{r.n} từ</b>: “{r.heard}” · khớp {Math.round(r.score * 100)}%</p>
            <p className={r.score >= 0.8 ? 'okc' : 'badc'}>{r.score >= 0.8 ? '✅ Micro hoạt động tốt!' : r.n <= 2 ? '⚠️ Máy chỉ nghe được rất ít từ. Xem cách sửa ở dưới.' : '⚠️ Micro có thu tiếng nhưng chưa rõ. Nói chậm và rõ hơn, hoặc đổi micro.'}</p>
            <ListenBack audio={r.audio} text={MIC_SAMPLE} />
          </div>
        ))}
      </Card>
      <Card><h3>Micro trên máy</h3>
        <div id="mdev" className="muted small">{'text' in devices ? devices.text
          : <ul>{devices.list.map((x) => <li key={x.id}>{x.def && <>⭐ <b>Mặc định:</b> </>}{x.label}</li>)}</ul>}</div>
        <p className="muted small">Nhận giọng nói dùng <b>micro mặc định</b> của trình duyệt. Nếu sai micro, mở <b>chrome://settings/content/microphone</b> (hoặc edge://settings/content/microphone) và chọn đúng micro.</p></Card>
      <Card><h3>Máy chỉ nghe được 1–2 từ?</h3><ul className="tips">
        <li>Nói <b>liền cả câu</b>, đừng ngắt quãng lâu giữa các từ. Nói xong mới im lặng.</li>
        <li>Kiểm tra thanh màu: nói mà thanh không nhảy nghĩa là trình duyệt đang dùng <b>sai micro</b>.</li>
        <li>Tắt các app khác đang dùng micro (Zoom, Meet, Teams…), rồi tải lại trang.</li>
        <li>Dùng <b>Chrome hoặc Edge</b> và có Internet (máy chấm giọng nói chạy online).</li>
        <li>Để micro cách miệng khoảng 1 gang tay, nói to hơn bình thường một chút.</li>
      </ul></Card>
    </>
  );
}
