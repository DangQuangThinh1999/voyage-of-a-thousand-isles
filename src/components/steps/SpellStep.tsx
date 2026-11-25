import type { StepOf } from '../../lib/exercises';
import { checkType, hint } from '../../state/session';
import { TypeAnswer } from '../TypeAnswer';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Viết từ tiếng Anh theo nghĩa (có gợi ý chữ cái đầu) */
export function SpellStep(p: StepProps<StepOf<'spell'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const [en, vi, em] = st.w;
  const blanks = `${ss.hint ? en[0] + ' ' : ''}${en.split('').slice(ss.hint ? 1 : 0).map((c) => (c === ' ' ? '  ' : '_')).join(' ')}`;
  return (
    <StepFrame {...p} foot={!ss.answered && <>
      {S.kind !== 'test' && <button className="btn ghost" data-act="hint" onClick={hint}>💡 Gợi ý</button>}
      <button className="btn big" data-act="checkType" onClick={checkType}>Kiểm tra</button>
    </>}>
      <p className="ask">Viết từ tiếng Anh</p>
      <div className="center">{!T && <div className="huge">{em}</div>}<div className="vi">{vi}</div>
        <p className="hint">{T ? '' : blanks}</p></div>
      <TypeAnswer placeholder="Gõ từ tiếng Anh…" disabled={ss.answered} initial={ss.typed} onChange={(v) => { ss.typed = v; }} />
    </StepFrame>
  );
}
