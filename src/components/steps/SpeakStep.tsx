import type { StepOf } from '../../lib/exercises';
import { SR } from '../../lib/speech';
import { mic, selfSpeak, skipSpeak } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { MicResult, RecordBack } from '../MicRecorder';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Đọc to câu mẫu, máy chấm phát âm (không có micro: tự chấm) */
export function SpeakStep(p: StepProps<StepOf<'speak'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const foot = ss.answered ? null : SR
    ? (ss.tries ? <button className="btn ghost" data-act="skipSpeak" onClick={skipSpeak}>Bỏ qua</button> : null)
    : <>
      <button className="btn ghost" data-act="selfSpeak" data-ok="0" onClick={() => selfSpeak(false)}>Chưa được</button>
      <button className="btn big" data-act="selfSpeak" data-ok="1" onClick={() => selfSpeak(true)}>Tôi đã đọc to ✅</button>
    </>;
  return (
    <StepFrame {...p} foot={foot}>
      <p className="ask">{T ? 'Đọc to câu này (không có mẫu · phải đúng 100% số từ · tối đa 2 lần)' : 'Nghe mẫu rồi đọc to'}</p>
      <div className="card center speakcard"><div className="en">{st.en}</div>
        {!T && <><div className="vi">{st.vi}</div><div className="row gap center"><SayBoth text={st.en} /></div></>}</div>
      {SR ? <>
        <div className="center">
          <button className={ss.listening ? 'mic rec' : 'mic'} data-act="mic" disabled={ss.answered} onClick={() => mic(st.en)}>🎤</button>
          <p className="muted small">{ss.listening ? 'Đang nghe… bấm 🎤 lần nữa để dừng' : 'Bấm micro rồi nói cả câu'}</p>
        </div>
        <div id="micres"><MicResult ss={ss} text={T ? undefined : st.en} /></div>
      </> : <p className="note">Trình duyệt này không hỗ trợ chấm giọng nói. Hãy mở bằng <b>Chrome</b> hoặc <b>Edge</b>. Tạm thời bạn đọc to theo mẫu rồi tự chấm.<br /><RecordBack text={T ? undefined : st.en} /></p>}
    </StepFrame>
  );
}
