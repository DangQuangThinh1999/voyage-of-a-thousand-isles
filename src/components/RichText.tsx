import { Fragment, type ReactNode } from 'react';

/** Hiện văn bản đơn giản từ AI: xuống dòng, gạch đầu dòng "- ", **in đậm** (không dùng HTML thô) */
export function RichText({ text }: { text: string }) {
  const bold = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={'u' + out.length}>{list}</ul>); list = []; } };
  lines.forEach((l, i) => {
    const t = l.trim();
    if (/^[-•*]\s+/.test(t)) list.push(<li key={i}>{bold(t.replace(/^[-•*]\s+/, ''))}</li>);
    else { flush(); if (t) out.push(<p key={i}>{bold(t.replace(/^#+\s*/, ''))}</p>); }
  });
  flush();
  return <div className="rich">{out}</div>;
}
