// HỌC THEO CỤM: thay vì học từng từ rời, dịch cả câu (~10 từ) hoặc đoạn ngắn (tối đa 20 từ) có chứa từ đang học,
// rồi Gemini chấm, viết lại trọn bản dịch đã sửa và giải thích từng lỗi. Không có AI → dùng câu ví dụ trong kho từ, chấm sơ bộ.
import { motion } from 'motion/react';
import { useState } from 'react';
import { bankRange, type BankWord } from '../data/bank';
import { addMistake, tallySkill, vocabWeekSize, weekNow } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { norm } from '../lib/text';
import { sample, shuffle } from '../lib/util';
import { addXP, app, save } from '../state/store';
import { AudioButton } from './AudioButton';
import { StepProgress } from './Progress';
import { Pills } from './ui';

interface Item { en: string; vi: string; words: { w: string; ipa: string; vi: string }[] }
interface Grade { score: number; verdict: 'correct' | 'minor' | 'wrong'; corrected: string; natural: string; errors: { original: string; corrected: string; type_vi: string; explain_vi: string }[]; used: string[]; missed: string[]; comment_vi: string; rough?: boolean }
type Len = '10' | '15' | '20';
type Dir = 'vi-en' | 'en-vi';
const LENS: [Len, string][] = [['10', '📝 Câu ~10 từ'], ['15', '📝 Câu dài ~15 từ'], ['20', '📄 Đoạn ≤20 từ']];
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const post = async (body: unknown) => {
  const r = await fetch('/api/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || String(r.status));
  return d;
};

/** Từ đang học: từ đã học gần đây + từ của tuần này trong kho từ */
async function pool(): Promise<BankWord[]> {
  const P = app.P, size = vocabWeekSize(P), wk = weekNow(P);
  const bank = await bankRange(0, wk * size);
  const learned = bank.filter((w) => P.srs[w.w]).slice(-50), week = bank.slice(-size);
  const all = [...new Map([...learned, ...week].map((w) => [w.w, w])).values()];
  return all.length ? all : bank.slice(0, 40);
}

export function ChunkPractice() {
  const [len, setLen] = useState<Len>('10'), [dir, setDir] = useState<Dir>('vi-en');
  const [items, setItems] = useState<Item[] | null>(null), [i, setI] = useState(0), [busy, setBusy] = useState(false), [offline, setOffline] = useState(false);
  const [ans, setAns] = useState(''), [g, setG] = useState<Grade | null>(null), [grading, setGrading] = useState(false), [hint, setHint] = useState(false);
  const [total, setTotal] = useState<number[]>([]);
  const cefr = () => { const RM = roadmap(app.P); return (RM[weekNow(app.P)] || RM[1])?.cefr || 'A2'; };

  const start = async () => {
    setBusy(true); setItems(null); setI(0); setG(null); setAns(''); setTotal([]); setHint(false);
    const p = await pool().catch(() => [] as BankWord[]);
    const n = +len, targets = sample(p, n >= 16 ? 20 : 12).map((w) => w.w);
    try {
      const d = await post({ part: 'gen', len: n, n: 5, cefr: cefr(), words: targets });
      const its = (d.items as Item[]).filter((x) => x.en && x.vi && wc(x.en) <= 20);
      if (!its.length) throw new Error('empty');
      setItems(its); setOffline(false);
    } catch {
      // Không có AI: lấy câu ví dụ trong kho từ có độ dài phù hợp
      const ex = shuffle(p.filter((w) => w.ex && w.exvi && wc(w.ex) <= n && wc(w.ex) >= Math.min(5, n - 4)));
      setItems(ex.slice(0, 5).map((w) => ({ en: w.ex, vi: w.exvi, words: [{ w: w.w, ipa: w.ipa, vi: w.vi }] })));
      setOffline(true);
    }
    setBusy(false);
  };

  const it = items && items[i];
  const src = it ? (dir === 'vi-en' ? it.vi : it.en) : '', ref = it ? (dir === 'vi-en' ? it.en : it.vi) : '';
  const submit = async () => {
    if (!it || !ans.trim()) return;
    setGrading(true);
    let r: Grade;
    try {
      r = await post({ part: 'grade', dir, cefr: cefr(), source: src, reference: ref, answer: ans, words: it.words.map((w) => w.w) });
    } catch {
      // chấm sơ bộ: mức trùng từ với bản tham khảo
      const a = new Set(norm(ans).split(' ')), b = norm(ref).split(' ');
      const sc = Math.round((b.filter((x) => a.has(x)).length / Math.max(1, b.length)) * 100);
      r = { score: sc, verdict: sc >= 85 ? 'correct' : sc >= 60 ? 'minor' : 'wrong', corrected: '', natural: ref, errors: [], used: it.words.filter((w) => a.has(norm(w.w))).map((w) => w.w), missed: [], comment_vi: 'AI đang bận nên đây là chấm SƠ BỘ (so với bản tham khảo). Bản dịch khác chữ nhưng đúng nghĩa vẫn có thể đúng.', rough: true };
    }
    setG(r); setGrading(false); setTotal((t) => [...t, r.score]);
    const P = app.P;
    tallySkill(P, 'write', r.verdict !== 'wrong');
    if (!r.rough) for (const e of r.errors.slice(0, 3)) addMistake(P, e.original, e.corrected, `${e.type_vi}: ${e.explain_vi}`);
    save(); addXP(r.verdict === 'correct' ? 8 : r.verdict === 'minor' ? 5 : 2);
  };
  const next = () => { setI(i + 1); setG(null); setAns(''); setHint(false); };

  if (!items || busy) return (
    <section className="card">
      <h3 className="m-0">🧩 Học từ vựng theo cụm</h3>
      <p className="muted small">Học từ trong cả câu sẽ nhớ lâu hơn học từ rời: bạn thấy từ đi với từ nào, chia thế nào, dùng trong tình huống nào. AI đặt câu/đoạn có chứa từ bạn đang học → bạn <b>dịch cả câu</b> → AI chấm, viết lại trọn bản đã sửa và giải thích từng lỗi.</p>
      <div className="row gap wrap"><Pills id="chunk-len" value={len} onChange={setLen} items={LENS} />
        <Pills id="chunk-dir" value={dir} onChange={setDir} items={[['vi-en', '🇻🇳 → 🇬🇧 Dịch sang Anh'], ['en-vi', '🇬🇧 → 🇻🇳 Dịch sang Việt']]} /></div>
      {busy ? <StepProgress steps={['Chọn từ bạn đang học', 'AI đặt câu theo ngữ cảnh', 'Sẵn sàng']} step={1} note="thường 5–15 giây" />
        : <button className="btn big" onClick={start}>▶ Bắt đầu 5 {len === '20' ? 'đoạn' : 'câu'}</button>}
    </section>
  );

  if (!it) {
    const avg = total.length ? Math.round(total.reduce((a, b) => a + b, 0) / total.length) : 0;
    return (
      <section className="card center">
        <div className="huge">{avg >= 80 ? '🏆' : avg >= 60 ? '👍' : '💪'}</div>
        <h3>Xong {items.length} {len === '20' ? 'đoạn' : 'câu'} · điểm trung bình {avg}/100</h3>
        <p className="muted small">Các lỗi đã ghi vào 📒 Sổ lỗi sai (tab Ngữ pháp) để ôn lại.</p>
        <button className="btn" onClick={start}>🔁 Làm 5 bài mới</button> <button className="btn ghost" onClick={() => setItems(null)}>⚙️ Đổi độ dài / hướng dịch</button>
      </section>
    );
  }

  const V = g ? { correct: ['✅', 'Đúng', 'ok'], minor: ['🟡', 'Gần đúng — có lỗi nhỏ', 'warn'], wrong: ['❌', 'Chưa đúng', 'bad'] }[g.verdict] : null;
  return (
    <motion.section key={i} className="card chunk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row between small"><b>🧩 {len === '20' ? 'Đoạn' : 'Câu'} {i + 1}/{items.length}</b><span className="muted">{offline ? '📚 câu ví dụ trong kho (AI bận)' : '🤖 AI đặt câu'} · {dir === 'vi-en' ? 'Dịch sang tiếng Anh' : 'Dịch sang tiếng Việt'}</span></div>
      <p className="chunk-src">{src} {dir === 'en-vi' && <AudioButton text={src} className="icon xs" />}</p>
      <div className="small">
        <button className="btn ghost sm" onClick={() => setHint(!hint)}>💡 {hint ? 'Ẩn' : 'Xem'} từ cần dùng ({it.words.length})</button>
        {hint && <div className="chunk-words">{it.words.map((w) => <span key={w.w} className="chip2"><b>{dir === 'vi-en' ? w.w : w.vi}</b> {dir === 'vi-en' && <span className="ipa inline">{w.ipa}</span>} {dir === 'vi-en' && <>· {w.vi}</>} <AudioButton text={w.w} className="icon xs" /></span>)}</div>}
      </div>
      <textarea className="ans" rows={3} value={ans} disabled={!!g || grading} placeholder={dir === 'vi-en' ? 'Viết bản dịch tiếng Anh của cả câu…' : 'Viết bản dịch tiếng Việt…'} spellCheck={false} onChange={(e) => setAns(e.target.value)} />
      {!g && (grading ? <StepProgress steps={['Gửi bản dịch', 'AI so nghĩa, ngữ pháp, cách dùng từ', 'Viết lại bản đã sửa']} step={1} note="thường 5–15 giây" />
        : <button className="btn big" disabled={!ans.trim()} onClick={submit}>📤 Nộp để chấm</button>)}
      {g && V && (
        <div className={`qexp ${V[2] === 'ok' ? 'ok' : 'bad'}`}>
          <div className="qexp-h">{V[0]} {V[1]} · <b>{g.score}/100</b>{g.rough && <span className="muted small"> (chấm sơ bộ)</span>}</div>
          {g.comment_vi && <p className="m-0">{g.comment_vi}</p>}
          {g.corrected && g.verdict !== 'correct' && <div className="good-box mt-1">✅ <b>Bản của bạn đã sửa:</b> {g.corrected} {dir === 'vi-en' && <AudioButton text={g.corrected} className="icon xs" />}</div>}
          {g.errors.length > 0 && <ol className="errlist mt-1">{g.errors.map((e, k) => <li key={k}><s className="bad">{e.original}</s> → <b className="okc">{e.corrected}</b><div className="small"><span className="chip2">{e.type_vi}</span> {e.explain_vi}</div></li>)}</ol>}
          <div className="mt-1">🌟 <b>Cách nói tự nhiên:</b> {g.natural} {dir === 'vi-en' && <><AudioButton text={g.natural} className="icon xs" /> <AudioButton text={g.natural} slow label="🐢" className="icon xs" /></>}</div>
          <div className="muted small">📖 Bản tham khảo: {ref}</div>
          {(g.used.length > 0 || g.missed.length > 0) && <div className="small mt-1">{g.used.length > 0 && <>✅ Dùng đúng: <b>{g.used.join(', ')}</b>. </>}{g.missed.length > 0 && <>⚠️ Chưa dùng/dùng sai: <b>{g.missed.join(', ')}</b></>}</div>}
          <div className="chunk-words mt-1">{it.words.map((w) => <span key={w.w} className="chip2"><b>{w.w}</b> <span className="ipa inline">{w.ipa}</span> · {w.vi} <AudioButton text={w.w} className="icon xs" /></span>)}</div>
          <div className="row gap mt-2"><button className="btn" onClick={next} autoFocus>{i + 1 < items.length ? 'Câu tiếp →' : 'Xem kết quả'}</button>
            <button className="btn ghost" onClick={() => { setG(null); setAns(''); }}>🔁 Dịch lại câu này</button></div>
        </div>
      )}
    </motion.section>
  );
}
