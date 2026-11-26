import type { StepOf } from '../../lib/exercises';
import { pick } from '../../state/session';
import { ChoiceList } from '../ChoiceList';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Điền từ vào chỗ trống trong câu thực tế (kiểu IELTS Reading) */
export function GapStep(p: StepProps<StepOf<'gap'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  return (
    <StepFrame {...p}>
      <p className="ask">Chọn từ đúng điền vào chỗ trống</p>
      <p className="gap-s">{ss.answered ? st.s[0].replace('_____', st.answer) : st.s[0]}</p>
      {!T && <p className="muted">{st.s[1]}</p>}
      <ChoiceList grid2 optClass="en" answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick} items={st.opts} />
    </StepFrame>
  );
}
