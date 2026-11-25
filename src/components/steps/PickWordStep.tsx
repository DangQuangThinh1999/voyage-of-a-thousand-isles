import type { StepOf } from '../../lib/exercises';
import { pick } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { ChoiceList } from '../ChoiceList';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Nghe từ, chọn nghĩa */
export function PickWordStep(p: StepProps<StepOf<'pickWord'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  return (
    <StepFrame {...p}>
      <p className="ask">Nghe và chọn nghĩa đúng</p>
      <div className="row gap center"><SayBoth text={st.w[0]} /></div>
      {ss.answered && <p className="center en">{st.w[0]}</p>}
      <ChoiceList grid2 answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick}
        items={st.opts.map((w) => <>{!T && <span className="em">{w[2]}</span>}{w[1]}</>)} />
    </StepFrame>
  );
}
