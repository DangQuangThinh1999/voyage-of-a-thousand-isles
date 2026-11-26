// KIỂM TRA MỐC 100 TỪ: mỗi khi học đủ 100 từ → 1 bài: dịch đoạn văn Anh→Việt, dịch đoạn Việt→Anh (dùng chính 100 từ đó),
// viết lại từ đã học bằng tiếng Anh, viết câu theo ngữ pháp trọng tâm. Làm hết rồi nộp, Gemini chấm 1 lần và sửa trọn bài.
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ensureBank, firstSense, loadedBankWords, type BankWord } from '../data/bank';
import { LESSONS } from '../lib/grammarLessons';
import { addMistake, bankLearned, tallySkill } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { norm } from '../lib/text';
import { sample } from '../lib/util';
import { weekNow } from '../lib/progress';
import { addXP, app, askConfirm, emit, go, save, useApp } from '../state/store';
import { AudioButton } from './AudioButton';
import { StepProgress } from './Progress';
import { Bar } from './ui';

interface Task { grammar: string; prompt_vi: string; words: string[]; example: string }
interface Gen { read: { en: string; vi: string }; write: { en: string; vi: string }; tasks: Task[] }
interface Err { original: string; corrected: string; type_vi: string; explain_vi: string }
interface Graded {
  read: { score: number; comment_vi: string; misread: { en_part: string; explain_vi: string }[] };
  write: { score: number; corrected: string; natural: string; errors: Err[]; comment_vi: string };
  tasks: { score: number; ok: boolean; corrected: string; explain_vi: string }[]; summary_vi: string;
}
interface MS {
  k: number; cefr: string; grammar: string[]; gen: Gen; spell: { w: string; vi: string; ipa: string; pos: string }[];
  ans: { read: string; write: string; spell: string[]; tasks: string[] };
  status: 'run' | 'grading' | 'done'; ai?: Graded | null; aiErr?: string; score?: number;
}
const LS = 'ht.ms.v1';
const load = (): MS | null => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } };
const store = (m: MS | null) => { try { if (m) localStorage.setItem(LS, JSON.stringify(m)); else localStorage.removeItem(LS); } catch { /* bỏ qua */ } };
const post = async (body: unknown) => {
  const r = await fetch('/api/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error === 'quota' ? 'AI hết lượt miễn phí, thử lại sau' : r.status === 404 ? 'máy chủ AI chưa bật' : 'AI đang bận, thử lại sau ít phút');
  return d;
};
const GRAM = Object.keys(LESSONS);
const grammarOf = (k: number) => [GRAM[(2 * k - 2) % GRAM.length], GRAM[(2 * k - 1) % GRAM.length]];
const wc = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
/** Âm đầu … âm cuối theo phiên âm */
const edge = (ipa: string) => { const c = [...ipa.replace(/[/ˈˌ.\s]/g, '')]; return c.length > 2 ? `/${c[0]}${c[1] === 'ː' ? 'ː' : ''} … ${c[c.length - 1] === 'ː' ? c[c.length - 2] : ''}${c[c.length - 1]}/` : c.length ? `/${c.join('')}/` : ''; };

/** Từ đã học theo thứ tự trong kho (để chia thành từng mốc 100 từ) */
async function learnedList(): Promise<BankWord[]> {
  const P = app.P, files = new Set(Object.values(P.srs).map((c) => c.f).filter(Boolean) as string[]);
  await ensureBank(files);
  return loadedBankWords().filter((w) => P.srs[w.w] && P.srs[w.w].f).sort((a, b) => a.r - b.r);
}

export function Milestones() {
  const { P } = useApp();
  const [m, setM] = useState<MS | null>(load), [busy, setBusy] = useState<number | null>(null), [err, setErr] = useState('');
  const n = bankLearned(P), avail = Math.floor(n / 100);
  const set = (x: MS | null) => { setM(x ? { ...x } : null); store(x); };

  const start = async (k: number) => {
    setBusy(k); setErr('');
    try {
      const list = (await learnedList()).slice((k - 1) * 100, k * 100);
      const RM = roadmap(P), cefr = (RM[weekNow(P)] || RM[1])?.cefr || 'A2', grammar = grammarOf(k);
      const gen: Gen = await post({ part: 'msgen', cefr, grammar, words: list.map((w) => w.w) });
      const spell = sample(list.filter((w) => /^[a-z][a-z' -]*$/i.test(w.w)), 15).map((w) => ({ w: w.w, vi: firstSense(w.vi), ipa: w.ipa, pos: w.pos }));
      set({ k, cefr, grammar, gen, spell, ans: { read: '', write: '', spell: spell.map(() => ''), tasks: gen.tasks.map(() => '') }, status: 'run' });
      app.scrollReq = 'top'; emit();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };

  if (m && m.status !== 'done') return <Run m={m} set={set} />;
  if (m && m.status === 'done') return <Result m={m} set={set} retry={() => start(m.k)} />;

  return (
    <section className="card">
      <h3 className="m-0">🏁 Kiểm tra mốc 100 từ</h3>
      <p className="muted small">Cứ học đủ <b>100 từ</b> là mở một bài kiểm tra để nhớ lâu và học viết: <b>① dịch đoạn văn Anh → Việt</b> và <b>② dịch đoạn Việt → Anh</b> (AI viết đoạn văn bằng chính 100 từ đó), <b>③ viết lại 15 từ đã học bằng tiếng Anh</b>, <b>④ viết câu theo ngữ pháp trọng tâm</b>. Làm hết rồi nộp, AI chấm một lần, sửa trọn bài và giải thích từng lỗi.</p>
      <p className="small">Bạn đã học <b>{n}</b> từ → mở được <b>{avail}</b> mốc. {n % 100 ? `Còn ${100 - (n % 100)} từ nữa tới mốc ${avail + 1}.` : ''}</p>
      <Bar pct={n % 100} h={6} />
      {err && <p className="bad small">⚠️ {err}</p>}
      {busy !== null && <StepProgress steps={[`Lấy 100 từ của mốc ${busy}`, 'AI viết đoạn văn bằng các từ đó + đề ngữ pháp', 'Sẵn sàng']} step={1} note="thường 15–40 giây" />}
      <div className="ms-list">
        {Array.from({ length: avail + 1 }, (_, i) => i + 1).map((k) => {
          const best = P.ms?.[k], locked = k > avail;
          return (
            <div key={k} className={'ms-item ' + (locked ? 'locked' : best !== undefined ? (best >= 70 ? 'pass' : 'tried') : '')}>
              <span className="ms-n">{locked ? '🔒' : best !== undefined && best >= 70 ? '🏅' : '🏁'} Mốc {k}</span>
              <span className="small muted flex-1">Từ {(k - 1) * 100 + 1}–{k * 100} · ngữ pháp: {grammarOf(k).join(', ')}{best !== undefined ? ` · tốt nhất ${best}/100` : ''}</span>
              {!locked && <button className="btn sm" disabled={busy !== null} onClick={() => start(k)}>{best !== undefined ? '🔁 Làm lại (đề mới)' : '▶ Làm bài'}</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Run({ m, set }: { m: MS; set: (x: MS | null) => void }) {
  const [, force] = useState(0);
  const upd = () => { set(m); force((x) => x + 1); };
  const submit = async () => {
    const empty = [!m.ans.read.trim() && 'phần ①', !m.ans.write.trim() && 'phần ②', m.ans.spell.some((x) => !x.trim()) && 'một số từ ở phần ③', m.ans.tasks.some((x) => !x.trim()) && 'một số câu ở phần ④'].filter(Boolean);
    if (!(await askConfirm({ icon: '📤', title: 'Nộp bài và chấm?', msg: (empty.length ? `⚠️ Bạn chưa làm ${empty.join(', ')}. ` : '') + 'AI sẽ chấm cả bài một lần.', ok: 'Nộp bài', cancel: 'Làm tiếp' }))) return;
    m.status = 'grading'; upd();
    let ai: Graded | null = null, aiErr: string | undefined;
    try {
      ai = await post({ part: 'msgrade', cefr: m.cefr, read: { en: m.gen.read.en, ref: m.gen.read.vi, a: m.ans.read }, write: { vi: m.gen.write.vi, ref: m.gen.write.en, a: m.ans.write },
        tasks: m.gen.tasks.map((t, i) => ({ ...t, a: m.ans.tasks[i] })) });
    } catch (e) { aiErr = (e as Error).message; }
    const sp = m.spell.filter((x, i) => norm(m.ans.spell[i]) === norm(x.w)).length / Math.max(1, m.spell.length) * 100;
    const tk = ai && ai.tasks.length ? ai.tasks.reduce((s, t) => s + t.score, 0) / ai.tasks.length : 0;
    const score = ai ? Math.round(ai.read.score * 0.25 + ai.write.score * 0.3 + sp * 0.25 + tk * 0.2) : Math.round(sp);
    m.ai = ai; m.aiErr = aiErr; m.score = score; m.status = 'done';
    const P = app.P;
    if (ai) {
      P.ms = P.ms || {}; P.ms[m.k] = Math.max(score, P.ms[m.k] || 0);
      for (const e of ai.write.errors.slice(0, 5)) addMistake(P, e.original, e.corrected, `${e.type_vi}: ${e.explain_vi}`);
      tallySkill(P, 'write', ai.write.score >= 70); tallySkill(P, 'read', ai.read.score >= 70);
      save(); addXP(10 + Math.round(score / 5));
    }
    app.scrollReq = 'top'; upd();
  };
  if (m.status === 'grading') return <section className="card"><h3 className="m-0">🧑‍🏫 Đang chấm mốc {m.k}…</h3><StepProgress steps={['Chấm phần viết từ theo đáp án', 'AI chấm 2 đoạn dịch + câu ngữ pháp', 'Viết lại trọn bài đã sửa']} step={1} note="thường 15–40 giây" /></section>;
  return (
    <div className="ms">
      <section className="card"><div className="row between wrap gap"><h3 className="m-0">🏁 Kiểm tra mốc {m.k} · 100 từ</h3>
        <button className="btn ghost sm" onClick={() => askConfirm({ icon: '🚪', title: 'Bỏ bài này?', msg: 'Câu trả lời sẽ bị xoá.', ok: 'Bỏ bài', cancel: 'Làm tiếp', danger: true }).then((ok) => ok && set(null))}>✕ Bỏ bài</button></div>
        <p className="muted small m-0">CEFR {m.cefr} · ngữ pháp trọng tâm: {m.grammar.join(', ')} · bài được lưu, tải lại trang không mất.</p></section>

      <section className="card">
        <h3 className="m-0">① Dịch sang tiếng Việt</h3>
        <p className="chunk-src">{m.gen.read.en} <AudioButton text={m.gen.read.en} className="icon xs" /></p>
        <textarea className="ans ms-text" rows={5} value={m.ans.read} placeholder="Bản dịch tiếng Việt của bạn…" onChange={(e) => { m.ans.read = e.target.value; upd(); }} />
      </section>

      <section className="card">
        <h3 className="m-0">② Dịch sang tiếng Anh</h3>
        <p className="chunk-src">{m.gen.write.vi}</p>
        <textarea className="ans ms-text" rows={5} value={m.ans.write} spellCheck={false} placeholder="Bản dịch tiếng Anh của bạn (dùng từ đã học)…" onChange={(e) => { m.ans.write = e.target.value; upd(); }} />
        <div className="muted small">{wc(m.ans.write)} từ · bản mẫu ~{wc(m.gen.write.en)} từ</div>
      </section>

      <section className="card">
        <h3 className="m-0">③ Viết từ đã học bằng tiếng Anh</h3>
        <div className="ms-spell">{m.spell.map((x, i) => (
          <label key={x.w} className="ms-sp">
            <span><b>{i + 1}. {x.vi}</b> <span className="muted small">({x.pos})</span><br /><span className="muted small">🔢 {x.w.length} chữ cái · bắt đầu “{x.w[0]}” · 🔊 {edge(x.ipa)}</span></span>
            <input className="ans" value={m.ans.spell[i]} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="tiếng Anh…" onChange={(e) => { m.ans.spell[i] = e.target.value; upd(); }} />
          </label>
        ))}</div>
      </section>

      <section className="card">
        <h3 className="m-0">④ Viết câu theo ngữ pháp</h3>
        {m.gen.tasks.map((t, i) => (
          <div key={i} className="ms-task">
            <div><span className="chip2">📐 {t.grammar}</span> <b>{t.prompt_vi}</b></div>
            <div className="small muted">Từ phải dùng: {t.words.map((w) => <b key={w}> {w}</b>)} <button className="btn ghost sm" onClick={() => go('grammar', null)} title="Xem lại bài ngữ pháp">📚</button></div>
            <input className="ans" value={m.ans.tasks[i]} spellCheck={false} placeholder="Viết 1 câu tiếng Anh…" onChange={(e) => { m.ans.tasks[i] = e.target.value; upd(); }} />
          </div>
        ))}
      </section>
      <p className="center"><button className="btn big glow" onClick={submit}>📤 Nộp bài</button></p>
    </div>
  );
}

function Result({ m, set, retry }: { m: MS; set: (x: MS | null) => void; retry: () => void }) {
  const ai = m.ai;
  useEffect(() => { app.scrollReq = 'top'; }, []);
  return (
    <div className="ms">
      <motion.section className={'card exam-res ' + ((m.score || 0) >= 70 ? 'pass' : 'fail')} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="row between wrap gap"><div><h2 className="m-0">{(m.score || 0) >= 70 ? '🏅 Đạt mốc ' + m.k + '!' : '💪 Chưa đạt mốc ' + m.k}</h2><div className="muted small">Cần ≥ 70/100</div></div><div className="bigband"><small>Điểm</small><b>{m.score}</b></div></div>
        {ai && <div className="bands4"><div className="bandbox"><small>① Anh→Việt</small><b>{ai.read.score}</b></div><div className="bandbox"><small>② Việt→Anh</small><b>{ai.write.score}</b></div>
          <div className="bandbox"><small>③ Viết từ</small><b>{m.spell.filter((x, i) => norm(m.ans.spell[i]) === norm(x.w)).length}/{m.spell.length}</b></div><div className="bandbox"><small>④ Ngữ pháp</small><b>{ai.tasks.filter((t) => t.ok).length}/{ai.tasks.length}</b></div></div>}
        {ai?.summary_vi && <p>{ai.summary_vi}</p>}
        {m.aiErr && <p className="bad small">⚠️ AI chưa chấm được ({m.aiErr}). Điểm hiện chỉ tính phần ③; bạn có thể nộp lại sau.</p>}
        <div className="row gap wrap">{m.aiErr && <button className="btn" onClick={() => { m.status = 'run'; set(m); }}>📤 Quay lại nộp lại</button>}<button className="btn" onClick={retry}>🔁 Làm lại với đề mới</button><button className="btn ghost" onClick={() => set(null)}>← Danh sách mốc</button></div>
      </motion.section>

      <section className="card">
        <h3 className="m-0">① Dịch sang tiếng Việt {ai && <span className="chip2">{ai.read.score}/100</span>}</h3>
        <p className="small"><b>Gốc:</b> {m.gen.read.en}</p>
        <p className="small"><b>Bạn dịch:</b> {m.ans.read || '—'}</p>
        <p className="small good-box"><b>Tham khảo:</b> {m.gen.read.vi}</p>
        {ai?.read.comment_vi && <p className="small">{ai.read.comment_vi}</p>}
        {ai && ai.read.misread.length > 0 && <ul className="small">{ai.read.misread.map((x, i) => <li key={i}><b>“{x.en_part}”</b>: {x.explain_vi}</li>)}</ul>}
      </section>

      <section className="card">
        <h3 className="m-0">② Dịch sang tiếng Anh {ai && <span className="chip2">{ai.write.score}/100</span>}</h3>
        <p className="small"><b>Gốc:</b> {m.gen.write.vi}</p>
        <p className="small"><b>Bạn viết:</b> {m.ans.write || '—'}</p>
        {ai?.write.corrected && <div className="small good-box">✅ <b>Bài của bạn đã sửa hoàn chỉnh:</b> {ai.write.corrected} <AudioButton text={ai.write.corrected} className="icon xs" /></div>}
        {ai && ai.write.errors.length > 0 && <ol className="errlist mt-1">{ai.write.errors.map((e, i) => <li key={i}><s className="bad">{e.original}</s> → <b className="okc">{e.corrected}</b><div className="small"><span className="chip2">{e.type_vi}</span> {e.explain_vi}</div></li>)}</ol>}
        {ai?.write.natural && <p className="small">🌟 <b>Cách viết tự nhiên:</b> {ai.write.natural} <AudioButton text={ai.write.natural} className="icon xs" /></p>}
        <p className="small muted">📖 Bản mẫu: {m.gen.write.en}</p>
        {ai?.write.comment_vi && <p className="small">{ai.write.comment_vi}</p>}
      </section>

      <section className="card">
        <h3 className="m-0">③ Viết từ đã học</h3>
        <div className="ms-spell">{m.spell.map((x, i) => { const ok = norm(m.ans.spell[i]) === norm(x.w); return (
          <div key={x.w} className={'qv-row ' + (ok ? 'ok' : 'no')}><span className="flex-1">{ok ? '✅' : '❌'} <b>{x.w}</b> <span className="ipa inline">{x.ipa}</span> <AudioButton text={x.w} className="icon xs" /> · {x.vi}{!ok && <span className="small"> · bạn viết: <i>{m.ans.spell[i] || '—'}</i></span>}</span></div>); })}</div>
      </section>

      <section className="card">
        <h3 className="m-0">④ Viết câu theo ngữ pháp</h3>
        {m.gen.tasks.map((t, i) => { const g = ai?.tasks[i]; return (
          <div key={i} className="ms-task">
            <div><span className="chip2">📐 {t.grammar}</span> {t.prompt_vi}</div>
            <div className="small">Bạn viết: <i>{m.ans.tasks[i] || '—'}</i> {g ? (g.ok ? '✅' : '❌') : ''}</div>
            {g && !g.ok && g.corrected && <div className="small good-box">✅ {g.corrected}</div>}
            {g && <div className="small">💡 {g.explain_vi}</div>}
            <div className="small muted">📖 Câu mẫu: {t.example} <AudioButton text={t.example} className="icon xs" /></div>
          </div>); })}
      </section>
    </div>
  );
}
