import { useEffect, useState } from 'react';
import type { StepOf } from '../../lib/exercises';
import { checkType } from '../../state/session';
import { loadLex, sameAs, sentenceIpa, wordIpa } from '../../lib/lex';
import { AudioButton, SayBoth } from '../AudioButton';
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
  const letters = words.reduce((n, w) => n + w.replace(/[^a-z]/gi, '').length, 0);
  /** Gợi ý tối thiểu (cả khi kiểm tra): âm đầu và âm cuối trong phiên âm của mỗi từ */
  const edge = (w: string) => { const ipa = (wordIpa(w) || '').replace(/[ˈˌ.]/g, ''); if (!ipa) return ''; const ch = [...ipa]; return ch.length <= 2 ? `/${ipa}/` : `/${ch[0]}${ch[1] === 'ː' ? 'ː' : ''} … ${ch[ch.length - 1] === 'ː' ? ch[ch.length - 2] : ''}${ch[ch.length - 1]}/`; };
  return (
    <StepFrame {...p} foot={!ss.answered && <>
      {S.kind !== 'test' && !show && <button className="btn ghost" data-act="hint" onClick={() => setShow(true)}>💡 Gợi ý (phiên âm)</button>}
      <button className="btn big" data-act="checkType" onClick={checkType}>Kiểm tra</button>
    </>}>
      <p className="ask">Viết từ tiếng Anh{sameAs(en).length ? <span className="muted small"> (có {sameAs(en).length + 1} từ đúng, gõ 1 từ là được)</span> : null}</p>
      <div className="center">{!T && <div className="huge">{em}</div>}<div className="vi">{vi}</div>
        <p className="hint">{blanks}</p>
        <p className="muted small m-0">🔢 {letters} chữ cái{words.length > 1 ? ` · ${words.length} từ (${words.map((w) => w.length).join(' + ')})` : ''} · 🔊 âm đầu/cuối: {words.map(edge).filter(Boolean).join('  ') || '—'}</p>
      </div>
      {!T && show && (
        <div className="spell-hint">
          <div className="sh-ipa">{sentenceIpa(en)} <SayBoth text={en} size="xs" /></div>
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
