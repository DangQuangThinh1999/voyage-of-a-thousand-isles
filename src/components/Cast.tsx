// Ai nói trong bài nghe (dùng ở đề thi và Nghe hiểu)
import { scriptCast } from '../lib/speech';

/** Ai nói trong bài nghe: "Hội thoại giữa Emma và Tom" (không ghi giới tính) */
export function Cast({ lines, accent }: { lines: string[]; accent: string }) {
  const cast = scriptCast(lines, accent), who = (c: (typeof cast)[number]) => c.name || 'người dẫn chuyện';
  const named = cast.filter((c) => c.name);
  return <p className="cast">🎙️ {named.length >= 2 ? <>Hội thoại giữa {named.map((c, i) => <b key={c.name}>{i ? (i === named.length - 1 ? ' và ' : ', ') : ''}{who(c)}</b>)}</> : <>Độc thoại · <b>{who(cast[0])}</b></>}</p>;
}

