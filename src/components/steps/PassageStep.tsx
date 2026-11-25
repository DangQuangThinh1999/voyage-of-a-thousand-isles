import type { StepOf } from '../../lib/exercises';
import { passageText } from '../../lib/exercises';
import { nextStep, toggleVi } from '../../state/session';
import { AudioButton } from '../AudioButton';
import { Passage } from '../Passage';
import { StepFrame, type StepProps } from './StepFrame';

/** Đọc đoạn văn: bấm câu để nghe + xem nghĩa */
export function PassageStep(p: StepProps<StepOf<'passage'>>) {
  const { S } = p, ss = S.state, u = S.u;
  return (
    <StepFrame {...p} foot={<button className="btn big" data-act="next" onClick={nextStep}>Trả lời câu hỏi →</button>}>
      <p className="ask">Đọc đoạn văn. Bấm vào câu để nghe và xem nghĩa.</p><Passage u={u} clickable ss={ss} />
      <div className="row gap center"><AudioButton text={passageText(u)} label="🔊 Nghe cả bài" />
        <button className="btn ghost" data-act="toggleVi" onClick={toggleVi}>{ss.showVi ? 'Ẩn' : 'Hiện'} tiếng Việt</button></div>
    </StepFrame>
  );
}
