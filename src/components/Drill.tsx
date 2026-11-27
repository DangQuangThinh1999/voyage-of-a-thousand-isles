// Luyện 20 câu cho một bài ngữ pháp: trắc nghiệm, điền từ, sửa câu sai. Mỗi câu có câu đúng đầy đủ, nghĩa, giải thích chi tiết.
// Câu sai được đưa xuống cuối làm lại một lần; câu sai ghi vào Sổ lỗi sai.
import { useEffect, useState } from 'react';
import { addMistake } from '../lib/progress';
import { norm } from '../lib/text';
import { shuffle } from '../lib/util';
import { addXP, app, save } from '../state/store';
import { SayBoth } from './AudioButton';
import { Bar } from './ui';
import idx from '../data/drills/index.json';

export interface DrillItem { t: 'mcq' | 'type' | 'fix'; q: string; opts?: string[]; a: number | string; en: string; vi: string; why: string }
const FILES = import.meta.glob<{ default: { name: string; items: DrillItem[] } }>('../data/drills/[0-9]*.json');
const fileOf = (name: string) => (idx as { n: string; f: string }[]).find((x) => x.n === name)?.f;
export const hasDrill = (name: string) => { const f = fileOf(name); return !!f && !!FILES['../data/drills/' + f]; };
const okTyped = (it: DrillItem, v: string) => String(it.a).split('|').some((x) => norm(x) === norm(v));
const TNAME = { mcq: '🔘 Chọn đáp án', type: '⌨️ Điền từ', fix: '🛠️ Sửa câu sai' };

export function Drill({ name }: { name: string }) {
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [q, setQ] = useState<number[]>([]), [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null), [typed, setTyped] = useState(''), [checked, setChecked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0), [firstTry, setFirstTry] = useState<Set<number>>(new Set()), [wrongOnce, setWrongOnce] = useState<Set<number>>(new Set());
  // trộn thứ tự lựa chọn mỗi lần làm (đáp án đúng không cố định ở một vị trí)
  const mix = (its: DrillItem[]) => its.map((it) => { if (it.t !== 'mcq' || !it.opts) return it; const right = it.opts[it.a as number], opts = shuffle(it.opts); return { ...it, opts, a: opts.indexOf(right) }; });
  const start = (raw: DrillItem[]) => { const its = mix(raw); setItems(its); setQ(shuffle(its.map((_, k) => k))); setI(0); setScore(0); setFirstTry(new Set()); setWrongOnce(new Set()); reset(); };
  const reset = () => { setPick(null); setTyped(''); setChecked(null); };
  useEffect(() => { const f = fileOf(name); const load = f && FILES['../data/drills/' + f]; if (load) load().then((m) => start(m.default.items)); }, [name]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hasDrill(name)) return null;
  if (!items) return <p className="muted small">Đang tải 20 câu luyện…</p>;
  const k = q[i];
  if (k === undefined) {
    const best = Math.max(score, app.P.drill?.[name] || 0);
    return (
      <div className="drill done">
        <h4 className="m-0">🏁 Xong {items.length} câu!</h4>
        <p>Đúng ngay lần đầu: <b>{score}/{items.length}</b> · tốt nhất: {best}/{items.length}</p>
        <Bar pct={(score / items.length) * 100} h={8} color={score >= 18 ? 'var(--good)' : score >= 14 ? '#f59e0b' : 'var(--bad)'} />
        <p className="muted small">{score >= 18 ? 'Rất chắc! Bạn đã nắm cấu trúc này.' : 'Làm lại lần nữa để nhuần nhuyễn hơn (thứ tự câu sẽ đổi).'}</p>
        <button className="btn" onClick={() => start(items)}>🔁 Làm lại 20 câu</button>
      </div>
    );
  }
  const it = items[k], again = wrongOnce.has(k) && i >= items.length;
  const check = (ok: boolean) => {
    setChecked(ok);
    if (ok && !wrongOnce.has(k) && !firstTry.has(k)) { setScore((s) => s + 1); setFirstTry((s) => new Set(s).add(k)); }
    if (!ok && !wrongOnce.has(k)) {
      setWrongOnce((s) => new Set(s).add(k)); setQ((x) => [...x, k]);
      addMistake(app.P, it.t === 'fix' ? it.q : it.t === 'mcq' && !it.q.includes('_____') && pick !== null && it.opts ? it.opts[pick] : it.q, it.en, it.why); save();
    }
  };
  const next = () => {
    reset();
    if (i + 1 >= q.length) {
      const P = app.P; P.drill = P.drill || {};
      const best = Math.max(score, P.drill[name] || 0); P.drill[name] = best;
      addXP(5 + score);
    }
    setI(i + 1);
  };
  const right = it.t === 'mcq' ? it.opts![it.a as number] : String(it.a).split('|')[0];
  return (
    <div className="drill">
      <div className="row between small"><b>🏋️ Luyện {items.length} câu</b><span className="muted">Câu {Math.min(i + 1, q.length)}/{q.length}{again ? ' · làm lại câu sai' : ''} · ✅ {score}</span></div>
      <Bar pct={(i / q.length) * 100} h={6} />
      <div className="drill-q">
        <span className="chip2">{TNAME[it.t]}</span>
        {it.t === 'fix' ? <p><span className="muted small">Câu sau có 1 lỗi, hãy viết lại cả câu cho đúng:</span><br /><b className="strike-soft">{it.q}</b></p> : <p><b>{it.q}</b></p>}
        {it.t === 'type' && <p className="muted small m-0">🇻🇳 {it.vi}</p>}
      </div>
      {it.t === 'mcq' ? (
        <div className="gq-opts">{it.opts!.map((o, j) => {
          const cls = checked === null ? '' : j === it.a ? 'right' : j === pick ? 'wrong' : 'dim';
          return <button key={j} className={`opt sm ${cls}`} disabled={checked !== null} onClick={() => { setPick(j); check(j === it.a); }}>{String.fromCharCode(65 + j)}. {o}</button>;
        })}</div>
      ) : (
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); if (checked === null && typed.trim()) check(okTyped(it, typed)); }}>
          <input className="ans flex-1" value={typed} disabled={checked !== null} placeholder={it.t === 'fix' ? 'Viết lại cả câu đúng…' : 'Gõ từ còn thiếu…'} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
          {checked === null && <button className="btn" disabled={!typed.trim()}>Kiểm tra</button>}
        </form>
      )}
      {checked !== null && (
        <div className={`qexp ${checked ? 'ok' : 'bad'}`}>
          <div className="qexp-h">{checked ? '✅ Đúng rồi!' : <>❌ Chưa đúng{it.t !== 'fix' && <>. Đáp án: <b>{right}</b></>}{it.t !== 'mcq' && typed && <> (bạn viết “{typed}”)</>}</>}</div>
          <div className="qexp-full"><b>{it.en}</b> <SayBoth text={it.en} size="xs" /></div>
          <div className="muted">🇻🇳 {it.vi}</div>
          {it.t === 'fix' && <div className="small">🛠️ Câu sai: <s>{it.q}</s> → <b className="okc">{it.en}</b></div>}
          <div className="qexp-steps"><b>🪜 Giải thích:</b><p className="m-0">{it.why}</p></div>
          {!checked && <p className="muted small m-0">Câu này sẽ quay lại ở cuối để bạn làm lại; đã ghi vào 📒 Sổ lỗi sai.</p>}
          <button className="btn sm mt-2" onClick={next} autoFocus>Câu tiếp →</button>
        </div>
      )}
    </div>
  );
}
