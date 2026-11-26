import { useEffect, useState } from 'react';
import synUrl from '../../data/extra/syn.json?url';
import { AudioButton } from './AudioButton';

type Pair = [en: string, vi: string];
interface Syn { s: Pair[]; a?: Pair[]; n?: string }
let cache: Record<string, Syn> | null = null, loading: Promise<Record<string, Syn>> | null = null;
/** Tải bảng đồng nghĩa một lần (file riêng, chỉ tải khi cần) */
const loadSyn = () => (loading ||= fetch(synUrl).then((r) => r.json()).then((d: Record<string, Syn>) => (cache = d)).catch(() => (cache = {})));

function Row({ label, list }: { label: string; list: Pair[] }) {
  return (
    <div className="syn-row"><span className="syn-l">{label}</span>
      {list.map(([en, vi]) => <span key={en} className="syn"><b>{en}</b>{vi && <span className="muted"> {vi}</span>}<AudioButton text={en} className="icon xs" /></span>)}
    </div>
  );
}
/** Từ đồng nghĩa (≈) và trái nghĩa (≠) học cùng lúc với từ */
export function Synonyms({ w }: { w: string }) {
  const [, force] = useState(0);
  useEffect(() => { if (!cache) loadSyn().then(() => force((n) => n + 1)); }, []);
  const x = cache && cache[w.toLowerCase()];
  if (!x) return null;
  return (
    <div className="syns">
      {x.s.length > 0 && <Row label="≈ Đồng nghĩa" list={x.s} />}
      {x.a && <Row label="≠ Trái nghĩa" list={x.a} />}
      {x.n && <p className="muted small">💡 {x.n}</p>}
    </div>
  );
}
