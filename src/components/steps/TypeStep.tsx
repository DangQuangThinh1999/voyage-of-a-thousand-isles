import type { StepOf } from '../../lib/exercises';
import { checkType, hint } from '../../state/session';
import { TypeAnswer } from '../TypeAnswer';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Tự viết câu tiếng Anh từ câu tiếng Việt */
export function TypeStep(p: StepProps<StepOf<'type'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const hintText = st.s[0].split(' ').map((w) => w[0] + w.slice(1).replace(/[a-z]/gi, '_')).join(' ');
  return (
    <StepFrame {...p} foot={!ss.answered && <>
      {S.kind !== 'test' && <button className="btn ghost" data-act="hint" onClick={hint}>💡 Gợi ý</button>}
      <button className="btn big" data-act="checkType" onClick={checkType}>Kiểm tra</button>
    </>}>
      <p className="ask">Tự viết câu tiếng Anh</p><div className="card vi-prompt">🇻🇳 {st.s[1]}</div>
      {ss.hint && <p className="hint">{hintText}</p>}{T && <p className="muted small">Gõ cả câu, đúng chữ hoa và dấu câu.</p>}
      <TypeAnswer multiline autoCapitalize="sentences" placeholder="Gõ câu tiếng Anh…" disabled={ss.answered} initial={ss.typed} onChange={(v) => { ss.typed = v; }} />
    </StepFrame>
  );
}
