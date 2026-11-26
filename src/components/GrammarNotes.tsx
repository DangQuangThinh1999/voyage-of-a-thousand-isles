import { useState } from 'react';
import { aiLeft, askAI, type AiTurn } from '../lib/ai';
import { explain, posWhy, type GrammarPoint } from '../lib/grammar';
import { lessonFor, type Quiz } from '../lib/grammarLessons';
import { AudioButton } from './AudioButton';
import { RichText } from './RichText';

/** Câu hỏi thử ngay sau mỗi điểm ngữ pháp */
function TryQuiz({ quiz }: { quiz: Quiz }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="gq">
      <b>🧪 Thử ngay:</b> {quiz.q}
      <div className="gq-opts">
        {quiz.opts.map((o, i) => {
          const cls = pick === null ? '' : i === quiz.a ? 'right' : i === pick ? 'wrong' : 'dim';
          return <button key={o} className={`opt sm ${cls}`} disabled={pick !== null} onClick={() => setPick(i)}>{String.fromCharCode(65 + i)}. {o}</button>;
        })}
      </div>
      {pick !== null && <p className={pick === quiz.a ? 'okc' : 'badc'}>{pick === quiz.a ? '✅ Đúng rồi! ' : '❌ Chưa đúng. '}<span className="muted">{quiz.why}</span>
        {pick !== quiz.a && <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => setPick(null)}>Làm lại</button>}</p>}
    </div>
  );
}

/** Một điểm ngữ pháp: công thức → hiểu đơn giản → đúng/sai → lưu ý → thử ngay */
function Point({ p, open }: { p: GrammarPoint; open: boolean }) {
  const L = lessonFor(p.name);
  const specific = /^(Động từ khuyết thiếu|Quá khứ đơn|Liên từ|Động từ \+)/.test(p.name);
  return (
    <details className="gp" open={open}>
      <summary><b>{p.name}</b> <span className="hit">{p.hit}</span></summary>
      {L ? (
        <>
          <div className="formula">📌 {L.formula}</div>
          <p>💬 {L.simple}</p>
          {specific && <p className="muted small">Trong câu này: {p.why}</p>}
          <div className="okbad">
            <div><b className="okc">✅ Đúng</b>{L.ok.map((s) => <div key={s}>{s} <AudioButton text={s} className="icon xs" /></div>)}</div>
            <div><b className="badc">❌ Sai</b>{L.bad.map((s) => <div key={s} className="strike">{s}</div>)}</div>
          </div>
          {L.note && <p className="note">⚠️ {L.note}</p>}
          {L.quiz && <TryQuiz quiz={L.quiz} />}
        </>
      ) : <p>{p.why}</p>}
    </details>
  );
}

/** Hỏi AI khi chưa hiểu: giải thích lại dễ hơn, hỏi tiếp được */
function AskAI({ en, topics }: { en: string; topics: string }) {
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  async function ask(question: string) {
    setBusy(true); setErr('');
    try {
      const text = await askAI(en, topics, question, turns);
      setTurns((t) => [...t, { role: 'user', content: question || 'Giải thích dễ hiểu hơn giúp mình.' }, { role: 'assistant', content: text }]);
      setQ('');
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="ai">
      {turns.length === 0
        ? <button className="btn ghost sm" disabled={busy} onClick={() => ask('')}>{busy ? '🤖 AI đang viết…' : '🤖 Chưa hiểu? Hỏi AI giải thích'}</button>
        : <>
          {turns.map((t, i) => (t.role === 'assistant'
            ? <div key={i} className="ai-a"><RichText text={t.content} /></div>
            : i > 0 && <div key={i} className="ai-q">🙋 {t.content}</div>))}
          <form className="row gap" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}>
            <input className="ans" placeholder="Hỏi tiếp, ví dụ: Sao không dùng will?" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} />
            <button className="btn sm" disabled={busy || !q.trim()}>{busy ? '…' : 'Hỏi'}</button>
          </form>
        </>}
      {err && <p className="badc small">{err}</p>}
      <p className="muted small">AI có thể sai, hãy đối chiếu với phần giải thích ở trên. Còn {aiLeft()} lượt hỏi hôm nay.</p>
    </div>
  );
}

interface Props { en: string; pos?: string; open?: boolean; title?: string }
/** Khung "Ngữ pháp: tại sao câu này như vậy?" cho một câu tiếng Anh */
export function GrammarNotes({ en, pos, open, title = 'Ngữ pháp: tại sao câu này như vậy?' }: Props) {
  const pts = explain(en), pw = pos ? posWhy(pos) : undefined;
  if (!pts.length && !pw) return null;
  return (
    <details className="gram" open={open}>
      <summary>📐 {title} <span className="muted small">({pts.length} điểm)</span></summary>
      {pw && <p><b>Từ loại ({pos}):</b> {pw}</p>}
      {pts.map((p, i) => <Point key={p.name} p={p} open={i === 0} />)}
      <AskAI en={en} topics={pts.map((p) => p.name).join(', ')} />
    </details>
  );
}
