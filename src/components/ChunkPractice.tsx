// HỌC THEO CỤM: thay vì học từng từ rời, dịch cả câu (~10 từ) hoặc đoạn ngắn (tối đa 20 từ) có chứa từ đang học,
// rồi Gemini chấm, viết lại trọn bản dịch đã sửa và giải thích từng lỗi. Không có AI → dùng câu ví dụ trong kho từ, chấm sơ bộ.
import { motion } from 'motion/react';
import { useState } from 'react';
import { bankRange, bankWord, nextBankWords, type BankWord } from '../data/bank';
import { addMistake, bankLearned, tallySkill, today, vocabWeekSize, weekNow } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { norm } from '../lib/text';
import { addDays, dayKey, sample, shuffle } from '../lib/util';
import { addXP, app, askConfirm, save } from '../state/store';
import { AudioButton } from './AudioButton';
import { StepProgress } from './Progress';
import { Bar, Pills } from './ui';

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

/** Từ cho lượt học: một nửa từ MỚI tiếp theo trong kho (chưa học) + một nửa từ đã học gần đây để ôn */
async function pick(nTotal: number): Promise<BankWord[]> {
  const P = app.P, size = vocabWeekSize(P), wk = weekNow(P);
  const half = Math.ceil(nTotal / 2);
  const fresh = await nextBankWords((w) => !!P.srs[w], half).catch(() => [] as BankWord[]);
  const bank = await bankRange(0, wk * size).catch(() => [] as BankWord[]);
  const learned = bank.filter((w) => P.srs[w.w]).slice(-60);
  const all = [...new Map([...fresh, ...sample(learned, nTotal - fresh.length)].map((w) => [w.w, w])).values()];
  return all.length ? all : bank.slice(0, 40);
}

export function ChunkPractice() {
  const [len, setLen] = useState<Len>('10'), [dir, setDir] = useState<Dir>('vi-en');
  const [items, setItems] = useState<Item[] | null>(null), [i, setI] = useState(0), [busy, setBusy] = useState(false), [offline, setOffline] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]), [hint, setHint] = useState(false);
  const [grades, setGrades] = useState<Grade[] | null>(null), [grading, setGrading] = useState(false), [newWords, setNewWords] = useState<string[]>([]);
  const cefr = () => { const RM = roadmap(app.P); return (RM[weekNow(app.P)] || RM[1])?.cefr || 'A2'; };

  const start = async () => {
    setBusy(true); setItems(null); setI(0); setGrades(null); setAnswers([]); setHint(false);
    const n = +len, p = await pick(n >= 16 ? 20 : 12).catch(() => [] as BankWord[]), targets = p.map((w) => w.w);
    let its: Item[];
    try {
      const d = await post({ part: 'gen', len: n, n: 5, cefr: cefr(), words: targets });
      its = (d.items as Item[]).filter((x) => x.en && x.vi && wc(x.en) <= 20);
      if (!its.length) throw new Error('empty');
      setOffline(false);
    } catch {
      // Không có AI: lấy câu ví dụ trong kho từ có độ dài phù hợp
      const ex = shuffle(p.filter((w) => w.ex && w.exvi && wc(w.ex) <= n && wc(w.ex) >= Math.min(5, n - 4)));
      its = ex.slice(0, 5).map((w) => ({ en: w.ex, vi: w.exvi, words: [{ w: w.w, ipa: w.ipa, vi: w.vi }] }));
      setOffline(true);
    }
    setItems(its); setAnswers(its.map(() => '')); setBusy(false);
  };

  const srcOf = (x: Item) => (dir === 'vi-en' ? x.vi : x.en), refOf = (x: Item) => (dir === 'vi-en' ? x.en : x.vi);
  /** Nộp cả lượt: AI chấm tất cả trong MỘT lần gọi */
  const submitAll = async () => {
    if (!items) return;
    const empty = answers.filter((x) => !x.trim()).length;
    if (empty && !(await askConfirm({ icon: '📤', title: 'Nộp bài?', msg: `Còn ${empty} ${len === '20' ? 'đoạn' : 'câu'} chưa dịch, sẽ tính 0 điểm.`, ok: 'Nộp bài', cancel: 'Làm tiếp' }))) return;
    setGrading(true);
    let rs: Grade[];
    try {
      const d = await post({ part: 'gradeall', dir, cefr: cefr(), items: items.map((x, k) => ({ source: srcOf(x), reference: refOf(x), answer: answers[k], words: x.words.map((w) => w.w) })) });
      rs = items.map((_, k) => d.results?.[k] || { score: 0, verdict: 'wrong', corrected: '', natural: '', errors: [], used: [], missed: [], comment_vi: 'AI không trả kết quả cho câu này.' });
    } catch {
      // chấm sơ bộ: mức trùng từ với bản tham khảo
      rs = items.map((x, k) => {
        const a = new Set(norm(answers[k]).split(' ')), b = norm(refOf(x)).split(' ');
        const sc = answers[k].trim() ? Math.round((b.filter((y) => a.has(y)).length / Math.max(1, b.length)) * 100) : 0;
        return { score: sc, verdict: sc >= 85 ? 'correct' : sc >= 60 ? 'minor' : 'wrong', corrected: '', natural: refOf(x), errors: [], used: [], missed: [], comment_vi: 'AI đang bận nên đây là chấm SƠ BỘ (so với bản tham khảo). Bản dịch khác chữ nhưng đúng nghĩa vẫn có thể đúng.', rough: true } as Grade;
      });
    }
    const P = app.P;
    // Từ MỚI (chưa học) dùng/hiểu đúng trong câu đạt → tính là đã học: cộng vào số từ, vào lịch ôn từ ngày mai
    const fresh: string[] = [];
    rs.forEach((r, k) => {
      if (r.rough || r.verdict === 'wrong') return;
      const used = new Set((r.used || []).map((w) => w.toLowerCase())), all = r.verdict === 'correct';
      for (const w of items[k].words) {
        const e = bankWord(w.w) || bankWord(w.w.toLowerCase());
        if (!e || P.srs[e.w] || fresh.includes(e.w) || !(all || used.has(w.w.toLowerCase()))) continue;
        P.srs[e.w] = { b: 1, due: addDays(dayKey(), 1), f: e.f }; fresh.push(e.w);
      }
    });
    if (fresh.length) { const d = today(P); d.nw = (d.nw || 0) + fresh.length; }
    setNewWords(fresh);
    rs.forEach((r) => { tallySkill(P, 'write', r.verdict !== 'wrong'); if (!r.rough) for (const e of r.errors.slice(0, 3)) addMistake(P, e.original, e.corrected, `${e.type_vi}: ${e.explain_vi}`); });
    save(); addXP(rs.reduce((x, r) => x + (r.verdict === 'correct' ? 8 : r.verdict === 'minor' ? 5 : 2), 0));
    setGrades(rs); setGrading(false); app.scrollReq = 'top';
  };

  if (!items || busy) return (
    <section className="card">
      <h3 className="m-0">🧩 Học từ vựng theo cụm</h3>
      <p className="muted small">Học từ trong cả câu sẽ nhớ lâu hơn học từ rời: bạn thấy từ đi với từ nào, chia thế nào, dùng trong tình huống nào. AI đặt 5 câu/đoạn chứa <b>từ mới</b> (tiếp theo trong kho) và từ đã học để ôn → bạn <b>dịch hết cả lượt</b> → <b>nộp một lần</b>, AI chấm tất cả, viết lại trọn bản đã sửa và giải thích từng lỗi. Từ mới dùng/hiểu đúng được <b>cộng vào số từ đã học</b> (tính cho các mốc 100 từ).</p>
      <div className="row gap wrap"><Pills id="chunk-len" value={len} onChange={setLen} items={LENS} />
        <Pills id="chunk-dir" value={dir} onChange={setDir} items={[['vi-en', '🇻🇳 → 🇬🇧 Dịch sang Anh'], ['en-vi', '🇬🇧 → 🇻🇳 Dịch sang Việt']]} /></div>
      {busy ? <StepProgress steps={['Chọn từ bạn đang học', 'AI đặt câu theo ngữ cảnh', 'Sẵn sàng']} step={1} note="thường 5–15 giây" />
        : <button className="btn big" onClick={start}>▶ Bắt đầu 5 {len === '20' ? 'đoạn' : 'câu'}</button>}
    </section>
  );

  if (grading) return <section className="card"><h3 className="m-0">🧑‍🏫 Đang chấm cả lượt…</h3><StepProgress steps={['Gửi tất cả bản dịch', 'AI so nghĩa, ngữ pháp, cách dùng từ', 'Viết lại bản đã sửa']} step={1} note="chấm 1 lần cho cả lượt · thường 10–30 giây" /></section>;

  if (grades) {
    const avg = Math.round(grades.reduce((a, b) => a + b.score, 0) / grades.length);
    return (
      <>
        <section className="card center">
          <div className="huge">{avg >= 80 ? '🏆' : avg >= 60 ? '👍' : '💪'}</div>
          <h3 className="m-0">Xong {items.length} {len === '20' ? 'đoạn' : 'câu'} · điểm trung bình {avg}/100</h3>
          {newWords.length > 0 ? <p className="okc"><b>🆕 +{newWords.length} từ mới</b> được tính vào số từ đã học ({bankLearned(app.P)} từ): {newWords.join(', ')}</p>
            : <p className="muted small">Không có từ mới nào được cộng (từ đã học rồi, hoặc câu chưa đạt).</p>}
          <p className="muted small">Từ mới sẽ vào lịch 🔁 Ôn từ từ ngày mai. Các lỗi đã ghi vào 📒 Sổ lỗi sai để ôn lại.</p>
          <button className="btn" onClick={start}>🔁 Làm 5 bài mới</button> <button className="btn ghost" onClick={() => { setItems(null); setGrades(null); }}>⚙️ Đổi độ dài / hướng dịch</button>
        </section>
        {items.map((x, k) => <Review key={k} n={k + 1} x={x} src={srcOf(x)} ref_={refOf(x)} a={answers[k]} g={grades[k]} dir={dir} />)}
      </>
    );
  }

  const it = items[i];
  if (!it) return null;
  const last = i + 1 >= items.length;
  return (
    <motion.section key={i} className="card chunk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row between small"><b>🧩 {len === '20' ? 'Đoạn' : 'Câu'} {i + 1}/{items.length}</b><span className="muted">{offline ? '📚 câu ví dụ trong kho (AI bận)' : '🤖 AI đặt câu'} · {dir === 'vi-en' ? 'Dịch sang tiếng Anh' : 'Dịch sang tiếng Việt'} · nộp & chấm 1 lần ở cuối</span></div>
      <Bar pct={(answers.filter((x) => x.trim()).length / items.length) * 100} h={6} />
      <p className="chunk-src">{srcOf(it)} {dir === 'en-vi' && <AudioButton text={srcOf(it)} className="icon xs" />}</p>
      <div className="small">
        <button className="btn ghost sm" onClick={() => setHint(!hint)}>💡 {hint ? 'Ẩn' : 'Xem'} từ cần dùng ({it.words.length})</button>
        {hint && <div className="chunk-words">{it.words.map((w) => <span key={w.w} className="chip2"><b>{dir === 'vi-en' ? w.w : w.vi}</b> {dir === 'vi-en' && <span className="ipa inline">{w.ipa}</span>} {dir === 'vi-en' && <>· {w.vi}</>} <AudioButton text={w.w} className="icon xs" /></span>)}</div>}
      </div>
      <textarea className="ans" rows={3} value={answers[i]} placeholder={dir === 'vi-en' ? 'Viết bản dịch tiếng Anh của cả câu…' : 'Viết bản dịch tiếng Việt…'} spellCheck={false}
        onChange={(e) => { const c = [...answers]; c[i] = e.target.value; setAnswers(c); }} />
      <div className="row between gap wrap">
        <button className="btn ghost" disabled={i === 0} onClick={() => { setI(i - 1); setHint(false); }}>← Câu trước</button>
        {last ? <button className="btn big glow" onClick={submitAll}>📤 Nộp cả {items.length} {len === '20' ? 'đoạn' : 'câu'} để chấm</button>
          : <button className="btn" onClick={() => { setI(i + 1); setHint(false); }}>Câu tiếp →</button>}
      </div>
      <div className="chunk-dots">{items.map((_, k) => <button key={k} className={(k === i ? 'on ' : '') + (answers[k].trim() ? 'done' : '')} onClick={() => { setI(k); setHint(false); }}>{k + 1}</button>)}</div>
    </motion.section>
  );
}

/** Kết quả từng câu sau khi nộp */
function Review({ n, x, src, ref_, a, g, dir }: { n: number; x: Item; src: string; ref_: string; a: string; g: Grade; dir: Dir }) {
  const V = { correct: ['✅', 'Đúng', 'ok'], minor: ['🟡', 'Gần đúng — có lỗi nhỏ', 'warn'], wrong: ['❌', 'Chưa đúng', 'bad'] }[g.verdict] || ['❌', 'Chưa đúng', 'bad'];
  return (
    <section className="card chunk">
      <div className="small"><b>{n}.</b> {src}</div>
      <div className="small">Bạn dịch: <i>{a || '—'}</i></div>
      <div className={`qexp ${V[2] === 'ok' ? 'ok' : 'bad'}`}>
        <div className="qexp-h">{V[0]} {V[1]} · <b>{g.score}/100</b>{g.rough && <span className="muted small"> (chấm sơ bộ)</span>}</div>
        {g.comment_vi && <p className="m-0">{g.comment_vi}</p>}
        {g.corrected && g.verdict !== 'correct' && <div className="good-box mt-1">✅ <b>Bản của bạn đã sửa:</b> {g.corrected} {dir === 'vi-en' && <AudioButton text={g.corrected} className="icon xs" />}</div>}
        {g.errors.length > 0 && <ol className="errlist mt-1">{g.errors.map((e, k) => <li key={k}><s className="bad">{e.original}</s> → <b className="okc">{e.corrected}</b><div className="small"><span className="chip2">{e.type_vi}</span> {e.explain_vi}</div></li>)}</ol>}
        <div className="mt-1">🌟 <b>Cách nói tự nhiên:</b> {g.natural} {dir === 'vi-en' && <><AudioButton text={g.natural} className="icon xs" /> <AudioButton text={g.natural} slow label="🐢" className="icon xs" /></>}</div>
        <div className="muted small">📖 Bản tham khảo: {ref_}</div>
        {(g.used.length > 0 || g.missed.length > 0) && <div className="small mt-1">{g.used.length > 0 && <>✅ Dùng đúng: <b>{g.used.join(', ')}</b>. </>}{g.missed.length > 0 && <>⚠️ Chưa dùng/dùng sai: <b>{g.missed.join(', ')}</b></>}</div>}
        <div className="chunk-words mt-1">{x.words.map((w) => <span key={w.w} className="chip2"><b>{w.w}</b> <span className="ipa inline">{w.ipa}</span> · {w.vi} <AudioButton text={w.w} className="icon xs" /></span>)}</div>
      </div>
    </section>
  );
}
