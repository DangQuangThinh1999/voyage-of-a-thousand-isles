import type { StepOf } from '../../lib/exercises';
import { pick } from '../../state/session';
import { ChoiceList } from '../ChoiceList';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Xem nghĩa, chọn từ tiếng Anh */
export function PickEnStep(p: StepProps<StepOf<'pickEn'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  return (
    <StepFrame {...p}>
      <p className="ask">Từ nào nghĩa là:</p>
      <div className="center">{!T && <div className="huge">{st.w[2]}</div>}<div className="vi">{st.w[1]}</div></div>
      <ChoiceList grid2 optClass="en" answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick}
        items={st.opts.map((w) => w[0])} />
    </StepFrame>
  );
}
