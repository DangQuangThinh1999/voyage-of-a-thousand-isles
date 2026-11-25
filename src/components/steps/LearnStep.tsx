import type { StepOf } from '../../lib/exercises';
import { SR } from '../../lib/speech';
import { mic, nextStep } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { MicResult } from '../MicRecorder';
import { StepFrame, type StepProps } from './StepFrame';

export function LearnStep(p: StepProps<StepOf<'learn'>>) {
  const [en, vi, em] = p.st.w;
  return (
    <StepFrame {...p} foot={<button className="btn big" data-act="next" onClick={nextStep}>Tiếp →</button>}>
      <p className="ask">Từ mới</p>
      <div className="card center wordcard">
        <div className="huge">{em}</div><div className="en">{en}</div><div className="vi">{vi}</div>
        <div className="row gap center"><SayBoth text={en} />{SR && <button className="icon" data-act="mic" onClick={() => mic(en)}>🎤</button>}</div>
        <div id="micres"><MicResult ss={p.S.state} /></div>
      </div>
    </StepFrame>
  );
}
