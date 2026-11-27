import type { StepOf } from '../../lib/exercises';
import { pick, sayPassage } from '../../state/session';
import { LANG_NAME, roleFor, speakerOf } from '../../lib/speech';
import { AudioButton } from '../AudioButton';
import { ChoiceList } from '../ChoiceList';
import { Passage } from '../Passage';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Nghe đoạn văn rồi trả lời câu hỏi */
export function LQuestionStep(p: StepProps<StepOf<'lquestion'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const [q, qvi, opts] = st.q, role = roleFor(st.u.id), dialog = st.u.reading.some(([l]) => speakerOf(l));
  return (
    <StepFrame {...p}>
      <p className="ask">🎧 Nghe đoạn văn rồi trả lời</p>
      <div className="row gap center">{T
        ? <button className="btn ghost" onClick={() => sayPassage(st.u, { limited: true })}>🔊 Nghe đoạn văn (còn {Math.max(0, 2 - ss.plays)} lượt)</button>
        : <><button className="btn ghost" onClick={() => sayPassage(st.u)}>🔊 Nghe đoạn văn · {dialog ? '👩👨 hội thoại' : `${role.g === 'f' ? '👩' : '👨'} ${LANG_NAME[role.lang] || ''}`}</button><button className="icon" title="Đọc chậm" onClick={() => sayPassage(st.u, { slow: true })}>🐢</button></>}</div>
      {ss.answered && <details className="card"><summary>📄 Xem lời đoạn văn</summary><Passage u={st.u} clickable={false} ss={ss} /></details>}
      <p className="ask">{q} <AudioButton text={q} /></p>{!T && <p className="muted">{qvi}</p>}
      <ChoiceList optClass="en" answered={ss.answered} correctIdx={ss.correctIdx} pickedIdx={ss.pickedIdx} onPick={pick} items={opts} />
    </StepFrame>
  );
}
