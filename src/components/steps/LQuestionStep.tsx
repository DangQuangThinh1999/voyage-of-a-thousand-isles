import type { StepOf } from '../../lib/exercises';
import { passageText } from '../../lib/exercises';
import { pick } from '../../state/session';
import { AudioButton } from '../AudioButton';
import { ChoiceList } from '../ChoiceList';
import { Passage } from '../Passage';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Nghe đoạn văn rồi trả lời câu hỏi */
export function LQuestionStep(p: StepProps<StepOf<'lquestion'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const [q, qvi, opts] = st.q, text = passageText(st.u);
  return (
    <StepFrame {...p}>
      <p className="ask">🎧 Nghe đoạn văn rồi trả lời</p>
      <div className="row gap center">{T
        ? <AudioButton text={text} limited className="btn ghost" label={`🔊 Nghe đoạn văn (còn ${Math.max(0, 2 - ss.plays)} lượt)`} />
        : <><AudioButton text={text} className="btn ghost" label="🔊 Nghe đoạn văn" /><AudioButton text={text} slow title="Đọc chậm" label="🐢" /></>}</div>
      {ss.answered && <details className="card"><summary>📄 Xem lời đoạn văn</summary><Passage u={st.u} clickable={false} ss={ss} /></details>}
      <p className="ask">{q} <AudioButton text={q} /></p>{!T && <p className="muted">{qvi}</p>}
      <ChoiceList optClass="en" answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick} items={opts} />
    </StepFrame>
  );
}
