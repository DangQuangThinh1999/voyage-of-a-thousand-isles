import type { StepOf } from '../../lib/exercises';
import { SR } from '../../lib/speech';
import { mic, nextStep } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { MicResult, RecordBack } from '../MicRecorder';
import { StepFrame, type StepProps } from './StepFrame';
import { SwipeStack } from '../SwipeStack';
import { Ipa } from '../Ipa';

export function LearnStep(p: StepProps<StepOf<'learn'>>) {
  const [en, vi, em] = p.st.w;
  return (
    <StepFrame {...p} foot={<button className="btn big" data-act="next" onClick={nextStep}>Tiếp →</button>}>
      <p className="ask">Từ mới</p>
      <SwipeStack key={en} onNext={nextStep} className="card center wordcard">
        <div className="huge">{em}</div><div className="en">{en}</div><div className="vi">{vi}</div><Ipa text={en} />
        <div className="row gap center"><SayBoth text={en} />{SR && <button className="icon" data-act="mic" onClick={() => mic(en)}>🎤</button>}</div>
        {!SR && <RecordBack text={en} />}
        <div id="micres"><MicResult ss={p.S.state} text={en} /></div>
      </SwipeStack>
    </StepFrame>
  );
}
