import { useEffect, useState } from 'react';
import type { StepOf } from '../../lib/exercises';
import { checkType } from '../../state/session';
import { loadLex, sameAs, sentenceIpa, wordIpa } from '../../lib/lex';
import { AudioButton } from '../AudioButton';
import { TypeAnswer } from '../TypeAnswer';
import { StepFrame, strict, type StepProps } from './StepFrame';

/** Viết từ tiếng Anh theo nghĩa. Bấm Gợi ý một lần: hiện hết phiên âm, phân tích từng từ (âm, số chữ cái, chữ cái đầu) và nút nghe */
export function SpellStep(p: StepProps<StepOf<'spell'>>) {
  const { S, st } = p, ss = S.state, T = strict(S);
  const [en, vi, em] = st.w;
  const [show, setShow] = useState(false);
  const [, force] = useState(0);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  const words = en.split(' ');
  const blanks = words.map((w) => (show ? w[0] + ' ' : '') + w.split('').slice(show ? 1 : 0).map(() => '_').join(' ')).join('     ');
  return (
    <StepFrame {...p} foot={!ss.answered && <>
      {S.kind !== 'test' && !show && <button className="btn ghost" data-act="hint" onClick={() => setShow(true)}>💡 Gợi ý (phiên âm)</button>}
      <button className="btn big" data-act="checkType" onClick={checkType}>Kiểm tra</button>
    </>}>
      <p className="ask">Viết từ tiếng Anh{sameAs(en).length ? <span className="muted small"> (có {sameAs(en).length + 1} từ đúng, gõ 1 từ là được)</span> : null}</p>
      <div className="center">{!T && <div className="huge">{em}</div>}<div className="vi">{vi}</div>
        {!T && <p className="hint">{blanks}</p>}
      </div>
      {!T && show && (
        <div className="spell-hint">
          <div className="sh-ipa">{sentenceIpa(en)} <AudioButton text={en} className="icon xs" /> <AudioButton text={en} slow label="🐢" className="icon xs" /></div>
          <div className="sh-words">
            {words.map((w, i) => (
              <div key={i} className="sh-w">
                <span className="sh-ipa1">/{wordIpa(w) || '?'}/</span>
                <span className="muted small">{w.length} chữ cái · bắt đầu bằng “{w[0]}”</span>
                <AudioButton text={w} className="icon xs" />
              </div>
            ))}
          </div>
          <p className="muted small m-0">Nghe và nhìn phiên âm rồi đánh vần: mỗi âm thường ứng với 1–2 chữ cái (ví dụ /ɡ/ → g, /ʊ/ → oo, /ŋ/ → ng, /ɔː/ → or, /θ/ → th).</p>
        </div>
      )}
      <TypeAnswer placeholder="Gõ từ tiếng Anh…" disabled={ss.answered} initial={ss.typed} onChange={(v) => { ss.typed = v; }} />
    </StepFrame>
  );
}
