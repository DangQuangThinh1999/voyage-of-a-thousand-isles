import type { Step } from '../lib/exercises';
import { nextStep, overrule } from '../state/session';
import type { StepState } from '../state/store';
import { AudioButton } from './AudioButton';

/** Thanh kết quả sau khi trả lời: đúng/sai, đáp án, nút tiếp tục */
export function FeedbackBar({ st, ss, isTest }: { st: Step; ss: StepState; isTest: boolean }) {
  let right = '';
  if (st.t === 'pickWord' || st.t === 'pickEn') right = `${st.w[0]} = ${st.w[1]}`;
  else if (st.t === 'spell') right = st.w[0];
  else if ('s' in st) right = st.s[0];
  else if (st.t === 'speak') right = st.en;
  const s = 's' in st ? st.s : null;
  return (
    <div className={`fb ${ss.correct ? 'good' : 'bad'}`}>
      <div>
        <b>{ss.correct ? (ss.fb || 'Chính xác! 🎉') : (ss.fb || 'Chưa đúng')}</b>
        {right && (!ss.correct || ss.fb) && <div>Đáp án: <b>{right}</b> <AudioButton text={right.split(' = ')[0]} /></div>}
        {s && !ss.correct && <div className="muted">{s[1]}</div>}
      </div>
      {st.t === 'type' && !ss.correct && !isTest && <button className="btn ghost sm" data-act="overrule" onClick={overrule}>Câu tôi cũng đúng</button>}
      <button className="btn big" data-act="next" onClick={nextStep}>{isTest && !ss.correct ? 'Xem kết quả →' : 'Tiếp tục →'}</button>
    </div>
  );
}
