import type { StepOf } from '../../lib/exercises';
import { pick } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { ChoiceList } from '../ChoiceList';
import { StepFrame, type StepProps } from './StepFrame';

/** Nghe câu, chọn nghĩa */
export function PickSentenceStep(p: StepProps<StepOf<'pickSentence'>>) {
  const { S, st } = p, ss = S.state;
  return (
    <StepFrame {...p}>
      <p className="ask">Nghe câu và chọn nghĩa đúng</p>
      <div className="row gap center"><SayBoth text={st.s[0]} /></div>
      {ss.answered && <p className="center en">{st.s[0]}</p>}
      <ChoiceList answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick} items={st.opts.map((s) => s[1])} />
    </StepFrame>
  );
}
