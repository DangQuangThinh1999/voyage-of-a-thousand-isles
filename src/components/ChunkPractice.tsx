// HỌC THEO CỤM: thay vì học từng từ rời, dịch cả câu (~10 từ) hoặc đoạn ngắn (tối đa 20 từ) có chứa từ đang học,
// rồi Gemini chấm, viết lại trọn bản dịch đã sửa và giải thích từng lỗi. Không có AI → dùng câu ví dụ trong kho từ, chấm sơ bộ.
import { Dictate } from './Dictate';
import { aiFetch } from '../lib/ai';
import { motion } from 'motion/react';
import { Fragment, useEffect, useState } from 'react';
import { loadChunk, saveChunk } from '../state/resume';
import { bankRange, bankWord, nextBankWords, type BankWord } from '../data/bank';
import { enqueueChunk } from '../lib/chunkQueue';
import { addMistake, bankLearned, tallySkill, today, vocabWeekSize, weekNow } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { norm } from '../lib/text';
import { addDays, dayKey, sample, shuffle } from '../lib/util';
import { addXP, app, askConfirm, save } from '../state/store';
import { AudioButton, SayBoth } from './AudioButton';
import { StepProgress } from './Progress';
import { Bar, Pills } from './ui';

interface Item { en: string; vi: string; en2: string; vi2: string; natural?: number; context?: string; grammar?: string; grammar_vi?: string; collocation?: string; words: { w: string; ipa: string; vi: string }[] }
interface Grade { score: number; verdict: 'correct' | 'minor' | 'wrong'; corrected: string; natural: string; errors: { original: string; corrected: string; type_vi: string; explain_vi: string }[]; used: string[]; missed: string[]; comment_vi: string; rough?: boolean }
type Len = '10' | '15' | '20';
type Dir = 'vi-en' | 'en-vi';
const LENS: [Len, string][] = [['10', '📝 Câu ~10 từ'], ['15', '📝 Câu dài ~15 từ'], ['20', '📄 Đoạn ≤20 từ']];
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const post = async (body: unknown) => {
  const r = await aiFetch('/api/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.msg || d.error || String(r.status));
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
  // Bài đang làm + kết quả được lưu vào máy (localStorage): thoát ra / tải lại trang vẫn còn
  const [saved] = useState(loadChunk);
  const [len, setLen] = useState<Len>((saved?.len as Len) || '10');
  const [items, setItems] = useState<Item[] | null>((saved?.items as Item[]) || null), [i, setI] = useState(saved?.i || 0), [busy, setBusy] = useState(false), [offline, setOffline] = useState(!!saved?.offline);
  const [answers, setAnswers] = useState<string[]>(saved?.answers || []), [hint, setHint] = useState(false);
  const [grades, setGrades] = useState<Grade[] | null>((saved?.grades as Grade[]) || null), [grading, setGrading] = useState(false), [newWords, setNewWords] = useState<string[]>(saved?.newWords || []), [queued, setQueued] = useState(!!saved?.queued);
  useEffect(() => { if (!busy) saveChunk({ len, offline, items, answers, i, grades, newWords, queued }); }, [len, offline, items, answers, i, grades, newWords, queued, busy]);
  const cefr = () => { const RM = roadmap(app.P); return (RM[weekNow(app.P)] || RM[1])?.cefr || 'A2'; };
  const unit = len === '20' ? 'đoạn' : 'câu';

  const start = async () => {
    setBusy(true); setItems(null); setI(0); setGrades(null); setAnswers([]); setHint(false); setNewWords([]); setQueued(false);
    const n = +len, p = await pick(n >= 16 ? 20 : 12).catch(() => [] as BankWord[]), targets = p.map((w) => w.w);
    let its: Item[];
    try {
      const d = await post({ part: 'gen', len: n, cefr: cefr(), words: targets });
      // bỏ câu AI tự chấm là chưa tự nhiên (< 4/5), lấy 5 câu tự nhiên nhất
      its = (d.items as Item[]).filter((x) => x.en && x.vi && x.en2 && x.vi2 && wc(x.en) <= 20 && norm(x.en2) !== norm(x.en) && (x.natural ?? 5) >= 4)
        .slice(0, 10);
      if (!its.length) throw new Error('empty');
      setOffline(false);
    } catch {
      // Không có AI: lấy câu ví dụ trong kho từ có độ dài phù hợp
      const ex = shuffle(p.filter((w) => w.ex && w.exvi && wc(w.ex) <= n && wc(w.ex) >= Math.min(5, n - 4)));
      // vòng 2 dùng câu ví dụ của một từ khác để không trùng vòng 1
      its = ex.slice(0, 5).map((w, k) => { const o = ex[k + 5] || ex[(k + 1) % ex.length]; return { en: w.ex, vi: w.exvi, en2: o.ex, vi2: o.exvi, words: [{ w: w.w, ipa: w.ipa, vi: w.vi }, ...(o !== w ? [{ w: o.w, ipa: o.ipa, vi: o.vi }] : [])] }; });
      setOffline(true);
    }
    setItems(its); setAnswers([...its, ...its].map(() => '')); setBusy(false);
  };

  const N = items ? items.length : 0;
  /** ô thứ s: vòng 1 (s < N) dịch Anh → Việt, vòng 2 dịch Việt → Anh cùng các câu đó */
  const dirOf = (s: number): Dir => (s < N ? 'en-vi' : 'vi-en');
  /** vòng 1: câu en (dịch sang Việt) · vòng 2: câu KHÁC en2/vi2 (dịch sang Anh), cùng từ mục tiêu */
  const srcOf = (s: number) => { const x = items![s % N]; return s < N ? x.en : x.vi2; };
  const refOf = (s: number) => { const x = items![s % N]; return s < N ? x.vi : x.en2; };
  const PASS = 80;
  const passed = (k: number) => !!grades && !grades[k].rough && grades[k].score >= PASS && grades[k + N].score >= PASS;

  /** Nộp cả lượt (2 vòng): AI chấm tất cả trong MỘT lần gọi */
  const submitAll = async () => {
    if (!items) return;
    const empty = answers.filter((x) => !x.trim()).length;
    if (empty && !(await askConfirm({ icon: '📤', title: 'Nộp bài?', msg: `Còn ${empty} bài chưa dịch, sẽ tính 0 điểm.`, ok: 'Nộp bài', cancel: 'Làm tiếp' }))) return;
    setGrading(true);
    let rs: Grade[];
    try {
      const d = await post({ part: 'gradeall', cefr: cefr(), items: answers.map((a, s) => ({ dir: dirOf(s), source: srcOf(s), reference: refOf(s), answer: a, words: items[s % N].words.map((w) => w.w) })) });
      rs = answers.map((_, s) => d.results?.[s] || { score: 0, verdict: 'wrong', corrected: '', natural: '', errors: [], used: [], missed: [], comment_vi: 'AI không trả kết quả cho bài này.' });
    } catch {
      // AI bận: lưu lượt này để app tự chấm lại lúc rảnh và cộng từ sau
      enqueueChunk({ cefr: cefr(), n: N, items: answers.map((a, s) => ({ dir: dirOf(s), source: srcOf(s), reference: refOf(s), answer: a, words: items[s % N].words.map((w) => w.w) })),
        fresh: items.map((x) => x.words.map((w) => bankWord(w.w) || bankWord(w.w.toLowerCase())).filter((e): e is BankWord => !!e && !app.P.srs[e.w]).map((e) => ({ w: e.w, f: e.f }))) });
      setQueued(true);
      // chấm sơ bộ: mức trùng từ với bản tham khảo (không cộng từ mới)
      rs = answers.map((a, s) => {
        const x = new Set(norm(a).split(' ')), y = norm(refOf(s)).split(' ');
        const sc = a.trim() ? Math.round((y.filter((t) => x.has(t)).length / Math.max(1, y.length)) * 100) : 0;
        return { score: sc, verdict: sc >= 85 ? 'correct' : sc >= 60 ? 'minor' : 'wrong', corrected: '', natural: refOf(s), errors: [], used: [], missed: [], comment_vi: 'AI đang bận nên đây là chấm SƠ BỘ (so với bản tham khảo).', rough: true } as Grade;
      });
    }
    const P = app.P, fresh: string[] = [];
    // Câu QUA (cả 2 chiều ≥ 80) → các từ mới trong câu được tính là đã học (cộng vào số từ, ôn từ ngày mai)
    items.forEach((x, k) => {
      if (rs[k].rough || rs[k].score < PASS || rs[k + N].score < PASS) return;
      for (const w of x.words) {
        const e = bankWord(w.w) || bankWord(w.w.toLowerCase());
        if (!e || P.srs[e.w] || fresh.includes(e.w)) continue;
        P.srs[e.w] = { b: 1, due: addDays(dayKey(), 1), f: e.f }; fresh.push(e.w);
      }
    });
    if (fresh.length) { const d = today(P); d.nw = (d.nw || 0) + fresh.length; }
    setNewWords(fresh);
    rs.forEach((r, s) => { tallySkill(P, dirOf(s) === 'vi-en' ? 'write' : 'read', r.score >= PASS); if (!r.rough) for (const e of r.errors.slice(0, 3)) addMistake(P, e.original, e.corrected, `${e.type_vi}: ${e.explain_vi}`); });
    save(); addXP(rs.reduce((t, r) => t + (r.score >= 85 ? 6 : r.score >= PASS ? 4 : 1), 0));
    setGrades(rs); setGrading(false); app.scrollReq = 'top';
  };

  if (!items || busy) return (
    <section className="card">
      <h3 className="m-0">🧩 Học từ vựng theo cụm</h3>
      <p className="muted small m-0">Học từ trong cả câu sẽ nhớ lâu hơn học từ rời.</p>
      <ol className="how-list">
        <li><span>🌍</span><div><b>Câu chân thật</b><small>AI lấy câu từ tình huống thực tế: email, tin nhắn, biển báo, hội thoại, đề IELTS… Đủ hết từ cần học (từ mới + từ ôn).</small></div></li>
        <li><span>🇬🇧→🇻🇳</span><div><b>Vòng 1: dịch Anh → Việt</b><small>Hiểu nghĩa của câu.</small></div></li>
        <li><span>🇻🇳→🇬🇧</span><div><b>Vòng 2: dịch Việt → Anh</b><small>Câu khác hẳn vòng 1 nhưng dùng lại đúng những từ đó — tự viết được, không chép được.</small></div></li>
        <li><span>✅</span><div><b>Nộp 1 lần, AI chấm</b><small>Câu <b>qua</b> khi cả 2 chiều ≥ {PASS}/100 → từ mới trong câu được cộng vào số từ đã học.</small></div></li>
      </ol>
      <div className="row gap wrap"><Pills id="chunk-len" value={len} onChange={setLen} items={LENS} /></div>
      {busy ? <StepProgress steps={['Chọn từ mới + từ ôn', 'AI đặt câu theo ngữ cảnh', 'Sẵn sàng']} step={1} note="thường 5–15 giây" />
        : <button className="btn big" onClick={start}>▶ Bắt đầu</button>}
    </section>
  );

  if (grading) return <section className="card"><h3 className="m-0">🧑‍🏫 Đang chấm cả lượt…</h3><StepProgress steps={['Gửi tất cả bản dịch (2 vòng)', 'AI so nghĩa, ngữ pháp, cách dùng từ', 'Viết lại bản đã sửa']} step={1} note="chấm 1 lần cho cả lượt · thường 15–40 giây" /></section>;

  if (grades) {
    const avg = Math.round(grades.reduce((a, b) => a + b.score, 0) / grades.length), np = items.filter((_, k) => passed(k)).length;
    return (
      <>
        <section className={'card center exam-res ' + (np === N ? 'pass' : 'fail')}>
          <div className="huge">{np === N ? '🏆' : np >= N / 2 ? '👍' : '💪'}</div>
          <h3 className="m-0">Qua {np}/{N} {unit} · trung bình {avg}/100</h3>
          <div className="rv-pass">{items.map((_, k) => <span key={k} className={passed(k) ? 'ok' : 'bad'}>{passed(k) ? '✅' : '❌'} Câu {k + 1}</span>)}</div>
          <p className="muted small m-0">Câu <b>qua</b> khi cả 2 vòng đạt ≥ {PASS}/100.</p>
          {queued && <p className="warn-box small">⏳ <b>AI đang bận</b> nên điểm dưới đây chỉ là chấm sơ bộ. Bài đã được lưu, app sẽ <b>tự chấm lại</b> và báo khi xong.</p>}
          {newWords.length > 0 && <p className="okc m-0">🆕 +{newWords.length} từ mới: {newWords.join(', ')} <span className="muted small">(tổng {bankLearned(app.P)} từ)</span></p>}
          <div className="row gap wrap" style={{ justifyContent: 'center' }}><button className="btn" onClick={start}>🔁 Làm lượt mới</button><button className="btn ghost" onClick={() => { setItems(null); setGrades(null); }}>⚙️ Đổi độ dài</button></div>
        </section>
        {([[0, '🇬🇧 → 🇻🇳', 'Vòng 1', 'dịch sang tiếng Việt', 'en-vi'], [N, '🇻🇳 → 🇬🇧', 'Vòng 2', 'dịch sang tiếng Anh', 'vi-en']] as const).map(([o, flag, name, what, dir]) => {
          const ok = items.filter((_, k) => grades[o + k].score >= PASS).length;
          return (
            <Fragment key={o}>
              <h3 className="rv-sec"><span>{flag} <b>{name}</b> · {what}</span><small>đạt {ok}/{N}</small></h3>
              {items.map((_, k) => <Review key={k} n={k + 1} src={srcOf(o + k)} ref_={refOf(o + k)} a={answers[o + k]} g={grades[o + k]} dir={dir} />)}
            </Fragment>
          );
        })}
        <h3 className="rv-sec"><span>📗 <b>Từ &amp; ngữ pháp</b> · bấm để xem</span></h3>
        {items.map((x, k) => (
          <details key={k} className="card rv rv-words">
            <summary><b>Câu {k + 1}</b> · {x.words.map((w) => w.w).join(', ')}</summary>
            <div className="chunk-words">{x.words.map((w) => <span key={w.w} className="chip2"><b>{w.w}</b> <span className="ipa inline">{w.ipa}</span> · {w.vi} <AudioButton text={w.w} className="icon xs" /></span>)}</div>
            {(x.grammar || x.collocation) && <div className="chunk-gram small">{x.grammar && <div>📐 <b>Ngữ pháp:</b> {x.grammar}{x.grammar_vi ? <span className="muted"> — {x.grammar_vi}</span> : null}</div>}{x.collocation && <div>🔗 <b>Cụm từ nên học:</b> {x.collocation}</div>}</div>}
          </details>
        ))}
      </>
    );
  }

  const it = items[i % N], d = dirOf(i), last = i + 1 >= answers.length;
  if (!it) return null;
  return (
    <motion.section key={i} className="card chunk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row between small wrap"><b>{d === 'en-vi' ? '🇬🇧 → 🇻🇳 Vòng 1 · dịch sang tiếng Việt' : '🇻🇳 → 🇬🇧 Vòng 2 · dịch sang tiếng Anh'}</b><span className="muted">{unit} {(i % N) + 1}/{N} · {offline ? '📚 câu trong kho (AI bận)' : '🤖 AI đặt câu'} · chấm 1 lần ở cuối</span></div>
      <Bar pct={(answers.filter((x) => x.trim()).length / answers.length) * 100} h={6} />
      {i < N && it.context && <div className="muted small">📍 {it.context}</div>}
      <p className="chunk-src">{srcOf(i)} {d === 'en-vi' && <><SayBoth text={srcOf(i)} size="xs" /></>}</p>
      {d === 'vi-en' && (
        <div className="small">
          <button className="btn ghost sm" onClick={() => setHint(!hint)}>💡 {hint ? 'Ẩn' : 'Xem'} từ cần dùng ({it.words.length})</button>
          {hint && <div className="chunk-words">{it.words.map((w) => <span key={w.w} className="chip2"><b>{w.w}</b> <span className="ipa inline">{w.ipa}</span> · {w.vi} <AudioButton text={w.w} className="icon xs" /></span>)}</div>}
        </div>
      )}
      <textarea className="ans" rows={3} value={answers[i]} placeholder={d === 'vi-en' ? 'Viết bản dịch tiếng Anh…' : 'Viết bản dịch tiếng Việt…'} spellCheck={false}
        onChange={(e) => { const c = [...answers]; c[i] = e.target.value; setAnswers(c); }} />
      <Dictate lang={d === 'vi-en' ? 'en-US' : 'vi-VN'} value={answers[i]} onChange={(v) => { const c = [...answers]; c[i] = v; setAnswers(c); }} />
      <div className="row between gap wrap">
        <button className="btn ghost" disabled={i === 0} onClick={() => { setI(i - 1); setHint(false); }}>← Trước</button>
        {last ? <button className="btn big glow" onClick={submitAll}>📤 Nộp cả 2 vòng để chấm</button>
          : <button className="btn" onClick={() => { setI(i + 1); setHint(false); }}>{i + 1 === N ? 'Sang vòng 2 →' : 'Tiếp →'}</button>}
      </div>
      <div className="chunk-rounds">
        {([[0, '🇬🇧 → 🇻🇳', 'Vòng 1', 'dịch sang tiếng Việt'], [N, '🇻🇳 → 🇬🇧', 'Vòng 2', 'dịch sang tiếng Anh']] as const).map(([o, flag, name, what]) => (
          <div key={o} className={'chunk-round' + (dirOf(i) === dirOf(o) ? ' on' : '')}>
            <div className="small"><b>{flag} {name}</b> <span className="muted">· {what}</span></div>
            <div className="chunk-dots">{items.map((_, k) => <button key={k} className={(o + k === i ? 'on ' : '') + (answers[o + k].trim() ? 'done' : '')} onClick={() => { setI(o + k); setHint(false); }}>{k + 1}</button>)}</div>
          </div>
        ))}
        <div className="muted small center">🟢 viền xanh = đã dịch · bấm số để chuyển câu</div>
      </div>
    </motion.section>
  );
}

/** Kết quả 1 câu trong 1 vòng: MỘT card phẳng — đề, bài của bạn, đáp án (không lặp câu trùng), lỗi nếu có. */
function Review({ n, src, ref_, a, g, dir }: { n: number; src: string; ref_: string; a: string; g: Grade; dir: Dir }) {
  const V = ({ correct: ['✅', 'ok'], minor: ['🟡', 'warn'], wrong: ['❌', 'bad'] } as const)[g.verdict] || ['❌', 'bad'];
  const empty = !a.trim(), en = dir === 'vi-en';
  const seen = new Set([norm(a)]), fixes: [string, string][] = [];
  const add = (l: string, t?: string) => { if (t && t.trim() && !seen.has(norm(t))) { seen.add(norm(t)); fixes.push([l, t]); } };
  if (!empty && g.verdict !== 'correct') add('Sửa lại câu của bạn', g.corrected);
  add(empty || g.verdict === 'wrong' ? 'Đáp án' : 'Cách nói tự nhiên', g.natural);
  add(empty ? 'Cách nói khác' : 'Đáp án mẫu', ref_);
  return (
    <article className={'card rv ' + V[1]}>
      <header className="rv-h"><span className="rv-n">Câu {n}</span><span className={'rv-score ' + V[1]}>{V[0]} {g.score}/100{g.rough ? ' · sơ bộ' : ''}</span></header>
      <p className="rv-src">{src}{!en && <SayBoth text={src} size="xs" />}</p>
      <div className="rv-row"><span className="rv-l">Bạn viết</span><div className={'rv-v' + (empty ? ' rv-empty' : '')}>{empty ? 'Bỏ trống' : a}</div></div>
      {fixes.map(([l, t]) => <div key={l} className="rv-row"><span className="rv-l">{l}</span><div className="rv-v rv-ok">{t}{en && <SayBoth text={t} size="xs" />}</div></div>)}
      {!empty && g.errors.length > 0 && (
        <div className="rv-row"><span className="rv-l">Lỗi cần sửa ({g.errors.length})</span>
          <ol className="rv-errs">{g.errors.map((e, k) => <li key={k}><span><s className="bad">{e.original}</s> → <b className="okc">{e.corrected}</b></span><small>{e.type_vi} · {e.explain_vi}</small></li>)}</ol>
        </div>
      )}
      {!empty && g.missed.length > 0 && <div className="rv-note">⚠️ Chưa dùng đúng từ: <b>{g.missed.join(', ')}</b></div>}
      {!empty && g.comment_vi && <div className="rv-note">💬 {g.comment_vi}</div>}
    </article>
  );
}
