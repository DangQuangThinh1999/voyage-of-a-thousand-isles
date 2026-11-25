import type { StepOf } from '../../lib/exercises';
import { checkFix, fixPick } from '../../state/session';
import { TypeAnswer } from '../TypeAnswer';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Tìm và sửa 1 lỗi sai trong câu */
export function FixStep(p: StepProps<StepOf<'fix'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  return (
    <StepFrame {...p} foot={!ss.answered && <button className="btn big" data-act="checkFix" disabled={ss.fixI == null} onClick={checkFix}>Kiểm tra</button>}>
      <p className="ask">🔎 Câu này có 1 lỗi sai. Bấm vào từ sai, rồi gõ từ đúng.</p>
      <div className="fixline">{st.toks.map((w, i) => (
        <button key={i} className={['tile', ss.fixI === i && 'sel', ss.answered && i === st.i && 'errw'].filter(Boolean).join(' ')}
          data-act="fixpick" data-i={i} disabled={ss.answered} onClick={() => fixPick(i)}>{w}</button>
      ))}</div>
      {!T && <p className="muted">🇻🇳 {st.s[1]}</p>}
      {ss.fixI != null && <>
        <label className="lbl">Sửa “<b>{st.toks[ss.fixI].replace(/[.,!?]/g, '')}</b>” thành:</label>
        <TypeAnswer placeholder="Gõ từ đúng…" disabled={ss.answered} initial={ss.typed} onChange={(v) => { ss.typed = v; }} />
      </>}
    </StepFrame>
  );
}
