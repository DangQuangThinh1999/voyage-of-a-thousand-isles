import { useState } from 'react';
import { explain, posWhy, type GrammarPoint } from '../lib/grammar';
import { lessonFor, type Quiz } from '../lib/grammarLessons';
import { AudioButton } from './AudioButton';

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
          <div className="formula">{L.formula.split(/\s+·\s+/).map((f) => <div key={f}>📌 {f}</div>)}</div>
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

/** Câu hỏi soạn sẵn, ngắn gọn, để dán vào AI miễn phí */
export const aiPrompt = (en: string, topics: string) =>
  `Giải thích NGẮN GỌN bằng tiếng Việt cho người mới học tiếng Anh (trình độ A1), tối đa 120 từ.
Câu: "${en}"${topics ? `\nĐiểm ngữ pháp: ${topics}` : ''}
Trả lời theo thứ tự: 1) Nghĩa câu. 2) Công thức. 3) Tại sao dùng như vậy (1–2 câu). 4) Một ví dụ Đúng và một ví dụ Sai.`;

/** Chưa hiểu: mở AI miễn phí (Claude, ChatGPT, Gemini) với câu hỏi đã soạn sẵn */
function AskAI({ en, topics }: { en: string; topics: string }) {
  const [copied, setCopied] = useState(false);
  const prompt = aiPrompt(en, topics), q = encodeURIComponent(prompt);
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); } catch { window.prompt('Chép đoạn này:', prompt); } };
  return (
    <div className="ai">
      <b>🤖 Chưa hiểu? Hỏi AI miễn phí</b>
      <div className="row gap">
        <a className="btn ghost sm" href={`https://claude.ai/new?q=${q}`} target="_blank" rel="noreferrer">Claude</a>
        <a className="btn ghost sm" href={`https://chatgpt.com/?q=${q}`} target="_blank" rel="noreferrer">ChatGPT</a>
        <a className="btn ghost sm" href="https://gemini.google.com/app" target="_blank" rel="noreferrer" onClick={copy}>Gemini</a>
        <button className="btn ghost sm" onClick={copy}>{copied ? '✓ Đã chép' : '📋 Chép câu hỏi'}</button>
      </div>
      <p className="muted small">Mở tab mới với câu hỏi đã soạn sẵn (dùng tài khoản miễn phí của bạn). Gemini: câu hỏi được chép sẵn, chỉ cần dán vào.</p>
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
