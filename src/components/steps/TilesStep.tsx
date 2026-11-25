import type { StepOf } from '../../lib/exercises';
import { checkTiles, checkType, tile, unpick } from '../../state/session';
import { SayBoth } from '../AudioButton';
import { TileBuilder } from '../TileBuilder';
import { TypeAnswer } from '../TypeAnswer';
import { StepFrame, type StepProps } from './StepFrame';

/** Nghe chép (dictation) và dịch xếp câu (build). Trong bài kiểm tra, nghe chép phải gõ cả câu. */
export function TilesStep(p: StepProps<StepOf<'dictation' | 'build'>>) {
  const { S, st } = p, ss = S.state;
  if (st.t === 'dictation' && S.kind === 'test') {
    return (
      <StepFrame {...p} foot={!ss.answered && <button className="btn big" data-act="checkType" onClick={checkType}>Kiểm tra</button>}>
        <p className="ask">Nghe và gõ lại cả câu (đúng chữ hoa và dấu câu)</p>
        <div className="row gap center"><SayBoth text={st.s[0]} /></div>
        <TypeAnswer multiline placeholder="Gõ câu bạn nghe được…" disabled={ss.answered} initial={ss.typed} onChange={(v) => { ss.typed = v; }} />
      </StepFrame>
    );
  }
  return (
    <StepFrame {...p} foot={!ss.answered && <button className="btn big" data-act="checkTiles" disabled={!ss.picked.length} onClick={checkTiles}>Kiểm tra</button>}>
      {st.t === 'dictation'
        ? <><p className="ask">Nghe và xếp lại câu bạn nghe được</p><div className="row gap center"><SayBoth text={st.s[0]} /></div></>
        : <><p className="ask">Dịch sang tiếng Anh</p><div className="card vi-prompt">🇻🇳 {st.s[1]}</div></>}
      <TileBuilder bank={st.bank} picked={ss.picked} answered={ss.answered} onTile={tile} onUnpick={unpick} />
    </StepFrame>
  );
}
