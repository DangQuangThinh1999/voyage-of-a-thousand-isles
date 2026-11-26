// Trang ĐỀ KIỂM TRA do AI soạn: Nghe (nghe tối đa 3 lần) · Đọc · Từ vựng & Ngữ pháp · Viết · Nói (ghi âm tối đa 5 lần mỗi câu).
// Làm hết rồi NỘP một lần → chấm trắc nghiệm theo đáp án, AI chấm Viết + Nói và viết lại trọn bài đã sửa.
import { Dictate } from '../components/Dictate';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { StepProgress } from '../components/Progress';
import { Bar } from '../components/ui';
import { loadLex, wordIpa } from '../lib/lex';
import { hear, micErr, speak, SR, stopListening, stopSpeaking } from '../lib/speech';
import { aiExam, bankDone, bankIdsAll, curExam, staticIds, isRight, openBankExam, MAX_PLAYS, MAX_TRIES, qid, retakeExam, saveAns, SPEAK_QS, submitExam, type Exam as ExamT, type ExamQ, type ExamState, type SecKey } from '../state/exam';
import { startQuickTest } from '../state/session';
import { askConfirm, emit, go, goWeek, useApp } from '../state/store';

type Tab = 'listening' | 'reading' | 'vocab' | 'writing' | 'speaking';
const TABS: [Tab, string][] = [['listening', '🎧 Nghe'], ['reading', '📖 Đọc'], ['vocab', '🧩 Từ vựng & Ngữ pháp'], ['writing', '✍️ Viết'], ['speaking', '🗣️ Nói']];
const wc = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function Exam() {
  useApp();
  const E = curExam();
  if (!E) return (
    <section className="card">
      <h2 className="m-0">📝 Không có đề nào đang mở</h2>
      <p className="muted">Đề chưa làm chỉ được giữ tới hết ngày. Vào trang tuần học và bấm <b>Kiểm tra tuần</b> hoặc <b>Kiểm tra nhanh chủ đề</b> để AI soạn đề mới.</p>
      <button className="btn" onClick={() => go('home')}>🏠 Về trang học</button>
    </section>
  );
  if (E.status === 'gen') return <Generating E={E} />;
  if (E.status === 'error') return <GenError E={E} />;
  if (E.status === 'grading') return (
    <section className="card"><h2 className="m-0">🧑‍🏫 Đang chấm bài…</h2>
      <StepProgress steps={['Chấm Nghe, Đọc, Từ vựng theo đáp án', 'AI chấm Viết & Nói theo 4 tiêu chí IELTS', 'Viết lại trọn bài đã sửa + bài nâng cấp']} step={1} note="thường 20–60 giây, đừng đóng trang" />
    </section>
  );
  if (E.status === 'done') return <Results E={E} />;
  return <Runner E={E} />;
}

function Generating({ E }: { E: ExamState }) {
  const names = { lr: '🎧📖 Nghe + Đọc', vg: '🧩 Từ vựng & Ngữ pháp', ws: '✍️🗣️ Viết + Nói (kèm bài mẫu)' } as const;
  const done = Object.values(E.parts).filter((x) => x === 'ok').length;
  return (
    <section className="card">
      <h2 className="m-0">🌍 Đang lấy đề từ khắp thế giới…</h2>
      <WorldTicker />
      <p className="muted">{E.title} · trình độ {E.cefr} · mục tiêu IELTS {E.band}. AI chọn ngữ cảnh từ nhiều quốc gia theo chuẩn đề IELTS, soạn đề mới hoàn toàn, theo đúng từ bạn đã học, có sẵn đáp án + căn cứ + giải thích. Bạn có thể sang trang khác học tiếp, xong sẽ có popup báo.</p>
      <StepProgress steps={Object.values(names)} step={done} note={`${done}/3 phần xong`} />
      <div className="exam-parts">{(Object.keys(names) as (keyof typeof names)[]).map((k) => <span key={k} className={'chip2 ' + E.parts[k]}>{E.parts[k] === 'ok' ? '✓' : E.parts[k] === 'err' ? '⚠️' : '…'} {names[k]}</span>)}</div>
    </section>
  );
}

const WORLD = ['🇬🇧 Anh: bài nghe giọng British…', '🇦🇺 Úc: hội thoại đời sống…', '🇨🇦 Canada: bài đọc báo…', '🇺🇸 Mỹ: chủ đề công nghệ…', '🇳🇿 New Zealand: du lịch, môi trường…', '🇮🇪 Ireland: văn hoá, lịch sử…', '🇸🇬 Singapore: học tập, công việc…', '🇮🇳 Ấn Độ: khoa học phổ thông…', '🇿🇦 Nam Phi: thiên nhiên, xã hội…', '📚 Đối chiếu dạng câu hỏi IELTS (MCQ, True/False/Not Given, điền từ)…', '✅ Soạn đáp án, căn cứ và giải thích…'];
function WorldTicker() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % WORLD.length), 2200); return () => clearInterval(t); }, []);
  return <motion.p key={k} className="world-tick" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{WORLD[k]}</motion.p>;
}

/** Đề có sẵn của bài kiểm tra (soạn sẵn + kho chung): đã làm / chưa làm, bấm để làm (lại) */
function BankList({ k }: { k: string }) {
  const [ids, setIds] = useState<string[]>(staticIds(k));
  const [all, setAll] = useState(false);
  useEffect(() => { bankIdsAll(k).then(setIds); }, [k]);
  if (!ids.length) return <div className="banklist"><b className="small">📚 Kho đề của bài này chưa có đề — đề AI bạn làm sẽ được lưu vào kho cho mọi người.</b> <button className="btn sm ghost" onClick={() => aiExam(k)}>🤖 Đề AI mới</button></div>;
  const done = ids.filter(bankDone).length, show = all ? ids : ids.slice(0, 9);
  return (
    <div className="banklist">
      <b className="small">📚 Đề có sẵn ({done}/{ids.length} đã làm · {ids.length - done} đề mới đang chờ)</b>
      <div className="row gap wrap mt-1">{show.map((id, i) => <button key={id} className={'btn sm ' + (bankDone(id) ? 'ghost' : '')} title={id.startsWith('db:') ? 'Đề trong kho chung' : 'Đề soạn sẵn'} onClick={() => openBankExam(k, id)}>{bankDone(id) ? '✓' : '○'} Đề {i + 1}{bankDone(id) ? ' · làm lại' : ''}</button>)}
        {ids.length > show.length && <button className="btn sm ghost" onClick={() => setAll(true)}>+{ids.length - show.length} đề</button>}
        <button className="btn sm ghost" onClick={() => aiExam(k)}>🤖 Đề AI mới</button></div>
    </div>
  );
}

function GenError({ E }: { E: ExamState }) {
  return (
    <section className="card">
      <h2 className="m-0">⚠️ Chưa soạn được đề</h2>
      <p className="muted">{E.err || 'AI đang bận.'} Bạn có thể thử soạn lại sau ít phút, hoặc làm đề có sẵn (không cần AI, sai 1 câu là làm lại).</p>
      <div className="row gap wrap">
        <button className="btn" onClick={() => retakeExam(E.key)}>🔁 Thử soạn lại</button>
        <button className="btn ghost" onClick={() => startQuickTest(E.key[0] === 'w' ? { w: +E.key.slice(1) } : { u: E.key.slice(1) })}>⚡ Bài kiểm tra cũ (không cần AI)</button>
      </div>
      <BankList k={E.key} />
    </section>
  );
}

// ---------------- làm bài ----------------
function Runner({ E }: { E: ExamState }) {
  const X = E.exam as ExamT;
  const [t, setT] = useState<Tab>('listening');
  useEffect(() => { loadLex().then(() => emit()); return () => { stopSpeaking(); stopListening(); }; }, []);
  const cnt = (sec: SecKey) => [X[sec].questions.filter((_, i) => E.ans.q[qid(sec, i)] !== undefined && E.ans.q[qid(sec, i)] !== '').length, X[sec].questions.length];
  const nSpeak = SPEAK_QS(X).length, spoke = Object.values(E.ans.speak).filter((x) => x.trim()).length;
  const status: Record<Tab, string> = {
    listening: cnt('listening').join('/'), reading: cnt('reading').join('/'), vocab: cnt('vocab').join('/'),
    writing: `${wc(E.ans.writing)}/${X.writing.minWords} từ`, speaking: `${spoke}/${nSpeak}`,
  };
  const idx = TABS.findIndex(([k]) => k === t);
  const submit = () => {
    const miss = (['listening', 'reading', 'vocab'] as SecKey[]).reduce((n, s) => n + cnt(s)[1] - cnt(s)[0], 0);
    const warn = [miss ? `${miss} câu trắc nghiệm chưa làm` : '', wc(E.ans.writing) < X.writing.minWords ? `bài viết mới ${wc(E.ans.writing)}/${X.writing.minWords} từ` : '', spoke < nSpeak ? `${nSpeak - spoke} câu nói chưa trả lời` : ''].filter(Boolean);
    askConfirm({ icon: '📤', title: 'Nộp bài và chấm?', msg: (warn.length ? '⚠️ Còn ' + warn.join(', ') + '. ' : 'Bạn đã làm đủ các phần. ') + 'Sau khi nộp sẽ không sửa được nữa; AI chấm Viết + Nói một lần và hiện đáp án, giải thích cho mọi câu.', ok: 'Nộp bài', cancel: 'Làm tiếp' })
      .then((ok) => { if (ok) submitExam(E); });
  };
  return (
    <div className="exam">
      <section className="card exam-head">
        <div className="row between wrap gap"><div><h2 className="m-0">📝 {E.title}</h2><div className="muted small">CEFR {E.cefr} · mục tiêu IELTS {E.band} · {E.src === 'bank' ? `📚 đề có sẵn số ${E.idx}` : '🤖 đề AI soạn hôm nay, giữ tới hết ngày'}</div></div>
          <button className="btn ghost sm" onClick={() => askConfirm({ icon: '🔁', title: 'Bỏ đề này, AI soạn đề mới?', msg: 'Câu trả lời hiện tại sẽ bị xoá.', ok: 'Soạn đề mới', cancel: 'Làm tiếp', danger: true }).then((ok) => ok && aiExam(E.key))}>🤖 Đề AI mới</button></div>
        <div className="exam-tabs">{TABS.map(([k, l]) => <button key={k} className={k === t ? 'on' : ''} onClick={() => { stopSpeaking(); setT(k); }}>{l}<small>{status[k]}</small></button>)}</div>
      </section>
      <motion.div key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {t === 'listening' && <Listening E={E} X={X} />}
        {t === 'reading' && <Reading E={E} X={X} />}
        {t === 'vocab' && <section className="card"><h3 className="m-0">🧩 Từ vựng & Ngữ pháp</h3><Qs E={E} sec="vocab" qs={X.vocab.questions} /></section>}
        {t === 'writing' && <Writing E={E} X={X} />}
        {t === 'speaking' && <Speaking E={E} X={X} />}
      </motion.div>
      <div className="row between gap exam-foot">
        <button className="btn ghost" disabled={idx === 0} onClick={() => setT(TABS[idx - 1][0])}>← Phần trước</button>
        {idx < TABS.length - 1 ? <button className="btn" onClick={() => setT(TABS[idx + 1][0])}>Phần tiếp →</button> : <button className="btn big glow" onClick={submit}>📤 Nộp bài</button>}
      </div>
      {idx < TABS.length - 1 && <p className="center"><button className="btn ghost sm" onClick={submit}>📤 Nộp bài ngay</button></p>}
    </div>
  );
}

const strip = (s: string) => s.replace(/^[A-Z][\w .'-]{0,20}:\s*/, '');
function Listening({ E, X }: { E: ExamState; X: ExamT }) {
  const [playing, setPlaying] = useState(false);
  const left = MAX_PLAYS - E.ans.plays;
  const play = async () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    if (left <= 0) return;
    E.ans.plays++; saveAns(); setPlaying(true); emit();
    let stopped = false;
    const id = setInterval(() => { if (!document.querySelector('[data-listen-on]')) { stopped = true; } }, 500);
    for (const l of X.listening.script) { if (stopped) break; await speak(strip(l.en)); await new Promise((r) => setTimeout(r, 350)); if (!document.querySelector('[data-listen-on]')) break; }
    clearInterval(id); setPlaying(false);
  };
  return (
    <section className="card">
      <h3 className="m-0">🎧 {X.listening.title}</h3>
      <p className="muted small">Giọng: {X.listening.accent}. Đọc câu hỏi trước, rồi bấm nghe. Bạn được nghe <b>tối đa {MAX_PLAYS} lần</b>; lời thoại chỉ hiện sau khi nộp bài.</p>
      <div className="row gap wrap">
        <button className={'btn ' + (playing ? 'ghost' : '')} disabled={!playing && left <= 0} onClick={play} {...(playing ? { 'data-listen-on': 1 } : {})}>{playing ? '⏹ Dừng' : left > 0 ? `▶ Nghe (còn ${left}/${MAX_PLAYS} lượt)` : '🔒 Hết lượt nghe'}</button>
      </div>
      <Qs E={E} sec="listening" qs={X.listening.questions} />
    </section>
  );
}

function Reading({ E, X }: { E: ExamState; X: ExamT }) {
  return (
    <section className="card">
      <h3 className="m-0">📖 {X.reading.title}</h3>
      <p className="muted small">{X.reading.source}</p>
      <div className="exam-passage">{X.reading.passage.map((l, i) => <span key={i}>{l.en} </span>)}</div>
      <Qs E={E} sec="reading" qs={X.reading.questions} />
    </section>
  );
}

/** Gợi ý cho câu gõ đáp án: số chữ cái + âm đầu/cuối theo phiên âm */
function TypeHint({ q }: { q: ExamQ }) {
  const main = q.answer_text.split('|')[0].trim(), words = main.split(/\s+/);
  const ipa = (q.ipa || words.map((w) => wordIpa(w)).filter(Boolean).join(' ')).replace(/[/ˈˌ.]/g, '').trim();
  const ch = [...ipa.replace(/\s/g, '')];
  const edge = ch.length > 2 ? `/${ch[0]}${ch[1] === 'ː' ? 'ː' : ''} … ${ch[ch.length - 1] === 'ː' ? ch[ch.length - 2] : ''}${ch[ch.length - 1]}/` : ipa ? `/${ipa}/` : '';
  return <div className="muted small">🔢 {words.map((w) => w.length).join(' + ')} chữ cái{words.length > 1 ? ` (${words.length} từ)` : ''} · <span className="mono">{words.map((w) => '_ '.repeat(w.length).trim()).join('   ')}</span>{edge && <> · 🔊 âm đầu/cuối: <b>{edge}</b></>}</div>;
}

function Qs({ E, sec, qs, review }: { E: ExamState; sec: SecKey; qs: ExamQ[]; review?: boolean }) {
  return (
    <ol className="exam-qs">
      {qs.map((q, i) => {
        const k = qid(sec, i), v = E.ans.q[k], ok = review && isRight(q, v);
        return (
          <li key={k} className={review ? (ok ? 'ok' : 'no') : ''}>
            <div className="q">{q.q}</div>
            <div className="muted small">{q.q_vi}</div>
            {q.type === 'type' ? (
              <>
                {!review && <TypeHint q={q} />}
                <input className="ans inp" disabled={review} value={String(v ?? '')} placeholder="Gõ đáp án…" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  onChange={(e) => { E.ans.q[k] = e.target.value; saveAns(); emit(); }} />
                {!review && <Dictate short value={String(v ?? '')} onChange={(x) => { E.ans.q[k] = x; saveAns(); emit(); }} label="🎤 Nói đáp án" />}
              </>
            ) : (
              <div className="opts">{q.options.map((o, j) => (
                <button key={j} disabled={review} className={'opt ' + (v === j ? 'sel ' : '') + (review && j === q.answer ? 'right ' : '') + (review && v === j && j !== q.answer ? 'wrong' : '')}
                  onClick={() => { E.ans.q[k] = j; saveAns(); emit(); }}>{String.fromCharCode(65 + j)}. {o}</button>
              ))}</div>
            )}
            {review && (
              <div className={'exp ' + (ok ? 'good' : 'bad')}>
                <b>{ok ? '✅ Đúng' : v === undefined || v === '' ? '⏭ Bỏ trống' : '❌ Sai'}</b>
                {!ok && <> — Đáp án: <b>{q.type === 'type' ? q.answer_text.split('|').join(' / ') : `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`}</b>{q.type === 'type' && v ? <> (bạn gõ “{String(v)}”)</> : null}</>}
                {q.ipa && <> <span className="ipa">{q.ipa}</span> <AudioButton text={q.answer_text.split('|')[0]} className="icon xs" /></>}
                {q.evidence && <div className="evi">📌 Căn cứ: “{q.evidence}”</div>}
                <div>💡 {q.why_vi}</div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Writing({ E, X }: { E: ExamState; X: ExamT }) {
  const n = wc(E.ans.writing);
  return (
    <section className="card">
      <h3 className="m-0">✍️ Viết</h3>
      <p className="exam-task">{X.writing.task}</p>
      <p className="muted small">{X.writing.vi}</p>
      <details><summary className="muted small">💡 Gợi ý ý tưởng</summary><ul className="small">{X.writing.ideas.map((x, i) => <li key={i}>{x}</li>)}</ul></details>
      <textarea className="inp exam-text" rows={10} value={E.ans.writing} placeholder="Viết bài của bạn ở đây…" spellCheck={false}
        onChange={(e) => { E.ans.writing = e.target.value; saveAns(); emit(); }} />
      <Dictate value={E.ans.writing} onChange={(v) => { E.ans.writing = v; saveAns(); emit(); }} />
      <div className="row between small"><span className={n >= X.writing.minWords ? 'okc' : 'muted'}>{n}/{X.writing.minWords} từ</span><span className="muted">Bài mẫu + bài sửa hoàn chỉnh hiện sau khi nộp</span></div>
      <Bar pct={Math.min(100, (n / X.writing.minWords) * 100)} h={6} />
    </section>
  );
}

function Speaking({ E, X }: { E: ExamState; X: ExamT }) {
  const qs = SPEAK_QS(X);
  const vis = [...X.speaking.part1.map((x) => ['Part 1', x.en, x.vi]), ['Part 2', X.speaking.part2.cue, X.speaking.part2.vi], ...X.speaking.part3.map((x) => ['Part 3', x.en, x.vi])];
  return (
    <section className="card">
      <h3 className="m-0">🗣️ Nói</h3>
      <p className="muted small">Nghe câu hỏi (🔊), rồi bấm <b>🎤 Ghi âm câu trả lời</b> và nói câu TRẢ LỜI của bạn bằng tiếng Anh (không phải đọc lại câu hỏi). Im lặng 3 giây sẽ tự dừng. Mỗi câu được <b>ghi âm tối đa {MAX_TRIES} lần</b>, lần sau thay lần trước. Bài được chấm theo mức IELTS của tuần.{!SR && ' Trình duyệt này không nhận giọng nói (dùng Chrome/Edge) — bạn có thể gõ câu trả lời.'}</p>
      {qs.map((_, i) => <SpeakQ key={i} E={E} i={i} part={vis[i][0]} q={vis[i][1]} vi={vis[i][2]} points={vis[i][0] === 'Part 2' ? X.speaking.part2.points : undefined} long={vis[i][0] === 'Part 2'} />)}
    </section>
  );
}

function SpeakQ({ E, i, part, q, vi, points, long }: { E: ExamState; i: number; part: string; q: string; vi: string; points?: string[]; long: boolean }) {
  const [busy, setBusy] = useState(false), [live, setLive] = useState(''), [err, setErr] = useState('');
  const tries = E.ans.tries[i] || 0, left = MAX_TRIES - tries;
  const rec = async () => {
    if (busy) { stopListening(); return; }
    if (left <= 0) return;
    setErr(''); setBusy(true); setLive('');
    E.ans.tries[i] = tries + 1; saveAns(); emit();
    try {
      const h = await hear({ onText: setLive, silenceMs: 3000, maxMs: long ? 150000 : 60000 });
      if (h.text) { E.ans.speak[i] = h.text; saveAns(); }
      else setErr('Chưa nghe thấy gì, thử nói to và gần micro hơn.');
    } catch (e) { setErr(micErr(e)); }
    setBusy(false); setLive(''); emit();
  };
  return (
    <div className="speakq">
      <div className="row gap"><span className="chip2">{part}</span><b className="flex-1">{q}</b><AudioButton text={q} className="icon xs" /></div>
      <div className="muted small">{vi}</div>
      {points && <ul className="small m-0">{points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
      <div className="row gap wrap mt-1">
        {SR && <button className={'btn sm ' + (busy ? 'rec' : '')} disabled={!busy && left <= 0} onClick={rec}>{busy ? '⏹ Dừng' : left > 0 ? `🎤 Ghi âm câu trả lời (còn ${left}/${MAX_TRIES} lần)` : '🔒 Hết lượt ghi âm'}</button>}
        {busy && <span className="muted small">🔴 {live || 'Đang nghe…'}</span>}
      </div>
      {err && <div className="bad small">{err}</div>}
      {SR ? <div className={'speak-out ' + (E.ans.speak[i] ? '' : 'empty')}>{E.ans.speak[i] ? <>🗣️ <b>Bạn đã nói:</b> {E.ans.speak[i]}</> : 'Chưa ghi âm — câu trả lời của bạn sẽ hiện ở đây sau khi nói.'}</div>
        : <textarea className="inp" rows={long ? 5 : 2} value={E.ans.speak[i] || ''} placeholder="Trình duyệt không nhận giọng nói: gõ câu trả lời…" onChange={(e) => { E.ans.speak[i] = e.target.value; saveAns(); emit(); }} />}
    </div>
  );
}

// ---------------- kết quả ----------------
function Results({ E }: { E: ExamState }) {
  const X = E.exam as ExamT, R = E.result!, ai = R.ai;
  const back = () => (E.key[0] === 'w' ? goWeek(+E.key.slice(1)) : go('unit', E.key.slice(1)));
  const need = parseFloat(E.band) || 0;
  const B = ({ k, l }: { k: keyof typeof R.bands; l: string }) => <div className={'bandbox ' + (R.bands[k] >= need ? 'pass' : 'fail')}><small>{l}</small><b>{R.bands[k] || '—'}</b><small>{R.bands[k] >= need ? `✅ đạt ${E.band}` : `❌ cần ${E.band}`}</small></div>;
  return (
    <div className="exam">
      <motion.section className={'card exam-res ' + (R.passed ? 'pass' : 'fail')} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="row between wrap gap">
          <div><h2 className="m-0">{R.passed ? '🎉 Đạt!' : '💪 Chưa đạt — làm lại đề mới nhé'}</h2><div className="muted small">{E.title} · cần IELTS {E.band} và Từ vựng ≥ 70%</div></div>
          <div className="bigband"><small>Ước tính</small><b>{R.overall}</b></div>
        </div>
        <div className="bands4"><B k="listening" l="🎧 Nghe" /><B k="reading" l="📖 Đọc" /><B k="writing" l="✍️ Viết" /><B k="speaking" l="🗣️ Nói" /></div>
        <div className="muted small">Nghe {R.score.listening.join('/')} · Đọc {R.score.reading.join('/')} · Từ vựng & Ngữ pháp {R.score.vocab.join('/')}</div>
        {ai?.summary_vi && <p>{ai.summary_vi}</p>}
        {R.aiErr && <p className="bad small">⚠️ AI chưa chấm được Viết/Nói ({R.aiErr}); điểm hai phần này là ước lượng thô.</p>}
        <div className="row gap wrap"><button className="btn" onClick={() => retakeExam(E.key)}>📚 Làm đề tiếp theo</button><button className="btn ghost" onClick={back}>← Về {E.key[0] === 'w' ? 'tuần học' : 'chủ đề'}</button></div>
        <BankList k={E.key} />
      </motion.section>

      <section className="card">
        <h3 className="m-0">✍️ Viết {ai && <span className="chip2">Band {ai.writing.band}</span>}</h3>
        <p className="exam-task">{X.writing.task}</p>
        {ai && <BandList b={ai.writing.bands} />}
        <h4>Bài của bạn</h4><p className="pre">{E.ans.writing || '(bỏ trống)'}</p>
        {ai && <Errs errs={ai.writing.errors} />}
        {ai?.writing.corrected && <><h4>✅ Bài đã sửa hoàn chỉnh</h4><p className="pre good-box">{ai.writing.corrected}</p></>}
        {ai?.writing.upgraded && <><h4>🚀 Bản nâng cấp (+1 band)</h4><p className="pre">{ai.writing.upgraded}</p></>}
        <details><summary><b>📄 Bài mẫu của đề</b></summary><p className="pre">{X.writing.model}</p><p className="pre muted small">{X.writing.model_vi}</p></details>
        {ai && <Tips s={ai.writing.strengths_vi} n={ai.writing.next_vi} />}
      </section>

      <section className="card">
        <h3 className="m-0">🗣️ Nói {ai && <span className="chip2">Band {ai.speaking.band}</span>}</h3>
        {ai && <BandList b={ai.speaking.bands} />}
        {SPEAK_QS(X).map((q, i) => (
          <div key={i} className="speakq">
            <b>{q}</b>
            <div className="small"><span className="muted">Bạn nói:</span> {E.ans.speak[i] || '(bỏ trống)'}</div>
            {ai?.speaking.answers[i]?.corrected && <div className="small good-box">✅ {ai.speaking.answers[i].corrected} <AudioButton text={ai.speaking.answers[i].corrected} className="icon xs" /></div>}
            {ai?.speaking.answers[i]?.upgraded && <div className="small">🚀 {ai.speaking.answers[i].upgraded} <AudioButton text={ai.speaking.answers[i].upgraded} className="icon xs" /></div>}
          </div>
        ))}
        {ai && <Errs errs={ai.speaking.errors} />}
        <details><summary><b>📄 Bài nói mẫu Part 2</b></summary><p className="pre">{X.speaking.model} <AudioButton text={X.speaking.model} className="icon xs" /></p></details>
        {ai && <Tips s={ai.speaking.strengths_vi} n={ai.speaking.next_vi} />}
      </section>

      <section className="card">
        <h3 className="m-0">🎧 Nghe · {R.score.listening.join('/')}</h3>
        <Script lines={X.listening.script} qs={X.listening.questions} E={E} sec="listening" title="📜 Lời thoại (script) — dò đáp án" audio />
        <Qs E={E} sec="listening" qs={X.listening.questions} review />
      </section>
      <section className="card">
        <h3 className="m-0">📖 Đọc · {R.score.reading.join('/')}</h3>
        <Script lines={X.reading.passage} qs={X.reading.questions} E={E} sec="reading" title="📜 Bài đọc — dò đáp án" />
        <Qs E={E} sec="reading" qs={X.reading.questions} review />
      </section>
      <section className="card">
        <h3 className="m-0">🧩 Từ vựng & Ngữ pháp · {R.score.vocab.join('/')}</h3>
        <Qs E={E} sec="vocab" qs={X.vocab.questions} review />
      </section>
    </div>
  );
}
const nz = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Script/bài đọc sau khi nộp: câu chứa căn cứ được tô sáng + nhãn số câu hỏi (xanh = bạn đúng, đỏ = sai), đáp án gõ in đậm */
function Script({ lines, qs, E, sec, title, audio }: { lines: { en: string; vi: string }[]; qs: ExamQ[]; E: ExamState; sec: SecKey; title: string; audio?: boolean }) {
  const [vi, setVi] = useState(true);
  const hitOf = (line: string) => qs.map((q, k) => ({ q, k })).filter(({ q }) => { const a = nz(line), b = nz(strip(q.evidence || '')); return b.length > 6 && (a.includes(b) || b.includes(a)); });
  const bold = (line: string, hs: { q: ExamQ }[]) => {
    const keys = hs.filter(({ q }) => q.type === 'type').flatMap(({ q }) => q.answer_text.split('|')).filter((x) => x.trim().length > 0);
    if (!keys.length) return line;
    const re = new RegExp(`(${keys.map((x) => x.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
    return line.split(re).map((part, j) => (j % 2 ? <mark key={j}>{part}</mark> : part));
  };
  return (
    <div className="script">
      <div className="row between"><b className="small">{title}</b><button className="btn ghost sm" onClick={() => setVi(!vi)}>{vi ? 'Ẩn' : 'Hiện'} dịch</button></div>
      {lines.map((l, i) => {
        const hs = hitOf(l.en);
        return (
          <p key={i} className={'sline ' + (hs.length ? 'hit' : '')}>
            {hs.map(({ q, k }) => <span key={k} className={'qtag ' + (isRight(q, E.ans.q[qid(sec, k)]) ? 'ok' : 'no')}>Câu {k + 1}</span>)}
            <span>{bold(l.en, hs)}</span>{audio && <> <AudioButton text={strip(l.en)} className="icon xs" /></>}
            {vi && <><br /><span className="muted small">{l.vi}</span></>}
          </p>
        );
      })}
    </div>
  );
}

function BandList({ b }: { b: { name: string; band: number; comment_vi: string }[] }) {
  return <ul className="bandlist">{b.map((x, i) => <li key={i}><b>{x.name}: {x.band}</b> — {x.comment_vi}</li>)}</ul>;
}
function Errs({ errs }: { errs: { original: string; corrected: string; type_vi: string; explain_vi: string }[] }) {
  if (!errs.length) return <p className="okc small">✅ Không phát hiện lỗi ngữ pháp.</p>;
  return (
    <>
      <h4>🔍 Lỗi cần sửa ({errs.length})</h4>
      <ol className="errlist">{errs.map((e, i) => (
        <li key={i}><div><s className="bad">{e.original}</s></div><div className="okc">→ {e.corrected}</div><div className="small"><span className="chip2">{e.type_vi}</span> {e.explain_vi}</div></li>
      ))}</ol>
    </>
  );
}
function Tips({ s, n }: { s: string[]; n: string[] }) {
  return <div className="small"><b>👍 Điểm mạnh:</b><ul>{s.map((x, i) => <li key={i}>{x}</li>)}</ul><b>🎯 Luyện tiếp:</b><ul>{n.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
}
