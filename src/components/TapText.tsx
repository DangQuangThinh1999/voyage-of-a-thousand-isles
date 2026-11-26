import { useEffect, useState } from 'react';
import { loadLex, lookup, type Entry } from '../lib/lex';
import { speak } from '../lib/speech';

const POS_VI: Record<string, string> = { noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', preposition: 'giới từ', conjunction: 'liên từ', pronoun: 'đại từ', determiner: 'từ hạn định', number: 'số từ', interjection: 'thán từ' };
export const posVi = (p: string) => POS_VI[p] || p;

/** Câu tiếng Anh: chạm vào từng từ để xem nghĩa, từ loại, phiên âm và nghe */
export function TapText({ text, className = '' }: { text: string; className?: string }) {
  const [, force] = useState(0);
  const [sel, setSel] = useState<{ i: number; e?: Entry; raw: string } | null>(null);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  const parts = text.split(/(\s+)/);
  return (
    <span className={`tap ${className}`}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p) || !/[A-Za-z]/.test(p)) return <span key={i}>{p}</span>;
        const raw = p.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
        return (
          <span key={i} className="relative">
            <button type="button" className={sel && sel.i === i ? 'tw on' : 'tw'} onClick={() => { const e = lookup(raw); setSel(sel && sel.i === i ? null : { i, e, raw }); speak(raw); }}>{p}</button>
            {sel && sel.i === i && (
              <span className="pop" role="tooltip">
                <b>{sel.e ? sel.e.w : raw}</b> {sel.e?.ipa && <span className="muted">/{sel.e.ipa}/</span>}<br />
                {sel.e ? <>{sel.e.vi} <i className="muted">· {posVi(sel.e.pos)}</i>{sel.e.awl && <span className="band"> · học thuật</span>}</> : <span className="muted">Chưa có trong kho từ</span>}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
