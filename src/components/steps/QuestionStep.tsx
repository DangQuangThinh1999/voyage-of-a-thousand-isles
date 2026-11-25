import type { StepOf } from '../../lib/exercises';
import { pick } from '../../state/session';
import { AudioButton } from '../AudioButton';
import { ChoiceList } from '../ChoiceList';
import { Passage } from '../Passage';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Câu hỏi đọc hiểu */
export function QuestionStep(p: StepProps<StepOf<'question'>>) {
  const { S, st } = p, ss = S.state, T = strict(S), test = S.kind === 'test';
  const [q, qvi, opts] = st.q;
  return (
    <StepFrame {...p}>
      <details className="card" open={test}><summary>📖 {test ? 'Đoạn văn' : 'Xem lại đoạn văn'}</summary><Passage u={st.u || S.u} clickable={false} ss={ss} /></details>
      <p className="ask">{q} <AudioButton text={q} /></p>{!T && <p className="muted">{qvi}</p>}
      <ChoiceList optClass="en" answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick} items={opts} />
    </StepFrame>
  );
}
