import { useEffect, useState } from 'react';
import { loadLex, sentenceIpa } from '../lib/lex';

/** Dòng phiên âm cho một từ hoặc một câu */
export function Ipa({ text, className = 'ipa' }: { text: string; className?: string }) {
  const [, force] = useState(0);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  return <div className={className}>{sentenceIpa(text)}</div>;
}

/** Nghĩa tiếng Việt: mỗi nghĩa một dòng, đánh số */
export function Senses({ vi }: { vi: string }) {
  const list = vi.split(';').map((s) => s.trim()).filter(Boolean);
  if (list.length < 2) return <div className="vi">{vi}</div>;
  return <ol className="senses">{list.map((s) => <li key={s}>{s}</li>)}</ol>;
}
