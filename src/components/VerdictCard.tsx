import { VERDICT, type SmartCheck } from '../lib/aicheck';
import { explain } from '../lib/grammar';
import { lessonFor, LESSONS } from '../lib/grammarLessons';
import { go } from '../state/store';
import { AudioButton } from './AudioButton';
import { Ipa } from './Ipa';

/** Bài ngữ pháp liên quan: AI chọn, hoặc tự nhận ra từ câu (đã sửa) */
function relatedLessons(r: SmartCheck, text: string): string[] {
  const fromAi = (r.lessons || []).filter((n) => LESSONS[n]);
  const local = explain(r.correction || text).map((p) => p.name).map((n) => (LESSONS[n] ? n : Object.keys(LESSONS).find((k) => lessonFor(n) === LESSONS[k]))).filter(Boolean) as string[];
  return [...new Set([...fromAi, ...local])].slice(0, 4);
}

/** Kết quả chấm một câu, giải thích kiểu giáo viên: đánh giá → phân tích câu → cách sửa → quy tắc → lưu ý → kết luận → bài liên quan */
export function VerdictCard({ r, text }: { r: SmartCheck; text: string }) {
  const [ic, label, cls] = VERDICT[r.status];
  const fixed = r.correction && r.correction.trim() !== text.trim() ? r.correction : '';
  const fixes = r.fixes && r.fixes.length ? r.fixes : fixed ? [{ en: fixed, vi: r.meaning }] : [];
  const lessons = relatedLessons(r, text);
  return (
    <div className={`verdict ${cls}`}>
      <div className="v-head">{ic} <b>{label}</b> <AudioButton text={text} className="icon xs" /></div>
      {r.explanation && <p className="m-0 mt-1">💬 {r.explanation}</p>}

      {r.analysis && r.analysis.length > 0 && (
        <div className="vsec"><h4>1. Phân tích câu</h4>
          <p className="m-0 mb-1">{r.status === 'incorrect' ? '❌' : '📝'} <b>{text}</b></p>
          <ul>{r.analysis.map((a) => <li key={a.part}><b className="hl">{a.part}</b>: {a.role_vi}</li>)}</ul>
          {r.errors.length > 0 && <ul className="checks">{r.errors.map((e, i) => <li key={i}><b className="badc strike2">{e.wrong}</b> → <b className="okc">{e.right}</b><div className="muted small">{e.why}</div></li>)}</ul>}
        </div>
      )}
      {!r.analysis && r.errors.length > 0 && <ul className="checks mt-2">{r.errors.map((e, i) => <li key={i}><b className="badc strike2">{e.wrong}</b> → <b className="okc">{e.right}</b><div className="muted small">{e.why}</div></li>)}</ul>}

      {fixes.length > 0 && (
        <div className="vsec"><h4>{r.analysis ? '2. ' : ''}{r.status === 'incorrect' ? 'Cách sửa' : 'Cách nói khác'}</h4>
          {fixes.map((f) => <div key={f.en} className="fixbox mt-1">✅ <b>{f.en}</b> <AudioButton text={f.en} className="icon xs" /><Ipa text={f.en} />{f.vi && <div className="muted small">Nghĩa: {f.vi}</div>}</div>)}
        </div>
      )}
      {r.rules && r.rules.length > 0 && (
        <div className="vsec"><h4>3. Quy tắc cần nhớ</h4>
          {r.rules.map((ru) => <div key={ru.formula} className="rule"><div className="formula">📌 {ru.formula}</div>
            <ul>{ru.examples.map((x) => <li key={x.en}><b>{x.en}</b> <AudioButton text={x.en} className="icon xs" /> <span className="muted">({x.vi})</span></li>)}</ul></div>)}
        </div>
      )}
      {r.better.length > 0 && !r.fixes && (
        <div className="mt-2"><b>✨ Cách nói tự nhiên hơn:</b>
          {r.better.map((b) => <div key={b} className="better">{b} <AudioButton text={b} className="icon xs" /><Ipa text={b} className="ipa small" /></div>)}
        </div>
      )}
      {r.notes && r.notes.length > 0 && <div className="vsec"><h4>4. Lưu ý</h4><ul>{r.notes.map((n) => <li key={n}>{n}</li>)}</ul></div>}
      {r.conclusion && <div className="vsec"><h4>{r.notes && r.notes.length ? '5. ' : '4. '}Kết luận</h4><p className="m-0">{r.conclusion}</p></div>}
      {!r.fixes && r.meaning && <p className="muted mt-2 m-0">🇻🇳 {r.meaning}</p>}
      {r.tip && <p className="tip small mt-2">💡 {r.tip}</p>}
      {lessons.length > 0 && (
        <div className="vsec"><h4>📚 Học kỹ phần này trong app</h4>
          <div className="flex flex-wrap gap-2">{lessons.map((n) => <button key={n} className="btn ghost sm" onClick={() => go('grammar', n)}>📘 {n} →</button>)}</div>
        </div>
      )}
      <p className="muted small mt-2 m-0">{r.source === 'ai' ? 'Chấm bởi AI (Gemini) có hiểu ngữ cảnh. AI vẫn có thể sai, hãy đối chiếu phần giải thích.' : r.source === 'lt' ? 'Chấm bằng LanguageTool (bắt lỗi theo luật, chưa hiểu ngữ cảnh sâu).' : ''}</p>
    </div>
  );
}
