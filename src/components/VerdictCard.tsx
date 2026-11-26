import { VERDICT, type SmartCheck } from '../lib/aicheck';
import { AudioButton } from './AudioButton';
import { Ipa } from './Ipa';

/** Kết quả chấm một câu: mức đánh giá, lỗi + cách sửa, câu đã sửa, cách nói tự nhiên hơn, nghĩa, mẹo nhớ */
export function VerdictCard({ r, text }: { r: SmartCheck; text: string }) {
  const [ic, label, cls] = VERDICT[r.status];
  const fixed = r.correction && r.correction.trim() !== text.trim() ? r.correction : '';
  return (
    <div className={`verdict ${cls}`}>
      <div className="v-head">{ic} <b>{label}</b> <AudioButton text={text} className="icon xs" /></div>
      {r.explanation && <p className="m-0 mt-1">💬 {r.explanation}</p>}
      {r.errors.length > 0 && (
        <ul className="checks mt-2">
          {r.errors.map((e, i) => <li key={i}><b className="badc strike2">{e.wrong}</b> → <b className="okc">{e.right}</b><div className="muted small">{e.why}</div></li>)}
        </ul>
      )}
      {fixed && <div className="fixed mt-2">✏️ <b>Câu đúng:</b> {fixed} <AudioButton text={fixed} className="icon xs" /><Ipa text={fixed} /></div>}
      {r.better.length > 0 && (
        <div className="mt-2"><b>✨ Cách nói tự nhiên hơn:</b>
          {r.better.map((b) => <div key={b} className="better">{b} <AudioButton text={b} className="icon xs" /><Ipa text={b} className="ipa small" /></div>)}
        </div>
      )}
      {r.meaning && <p className="muted mt-2 m-0">🇻🇳 {r.meaning}</p>}
      {r.tip && <p className="tip small mt-2">💡 {r.tip}</p>}
      <p className="muted small mt-2 m-0">{r.source === 'ai' ? 'Chấm bởi AI (Gemini) có hiểu ngữ cảnh. AI vẫn có thể sai, hãy đối chiếu phần giải thích.' : r.source === 'lt' ? 'Chấm bằng LanguageTool (bắt lỗi theo luật, chưa hiểu ngữ cảnh sâu).' : ''}</p>
    </div>
  );
}
