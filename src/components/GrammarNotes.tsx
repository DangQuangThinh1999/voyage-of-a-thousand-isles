import { explain, posWhy } from '../lib/grammar';

interface Props { en: string; pos?: string; open?: boolean; title?: string }
/** Khung "Ngữ pháp: tại sao câu này như vậy?" cho một câu tiếng Anh */
export function GrammarNotes({ en, pos, open, title = 'Ngữ pháp: tại sao câu này như vậy?' }: Props) {
  const pts = explain(en), pw = pos ? posWhy(pos) : undefined;
  if (!pts.length && !pw) return null;
  return (
    <details className="gram" open={open}>
      <summary>📐 {title}</summary>
      {pw && <p><b>Từ loại ({pos}):</b> {pw}</p>}
      <ul>{pts.map((p) => <li key={p.name}><b>{p.name}</b> <span className="hit">{p.hit}</span><div>{p.why}</div></li>)}</ul>
    </details>
  );
}
