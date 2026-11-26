import { useState } from 'react';
import { ChunkPractice } from '../components/ChunkPractice';
import { QuickVocab } from '../components/QuickVocab';
import { Pills } from '../components/ui';
import { useRouteParam } from '../lib/route';
import { Dropdown } from '../components/Dropdown';
import { AudioButton, SayBoth } from '../components/AudioButton';
import { Card } from '../components/Card';
import { ChoiceList } from '../components/ChoiceList';
import { GrammarNotes } from '../components/GrammarNotes';
import { Ipa, Senses } from '../components/Ipa';
import { ProgressBar } from '../components/ProgressBar';
import { BANK_TOTAL, MILESTONES } from '../data/bank';
import { bankLearned, newWordsToday, vocabBehind, vocabWeek, weekNow } from '../lib/progress';
import { dueWords } from '../lib/srs';
import { setWpd } from '../state/actions';
import { app, save, tab, useApp } from '../state/store';
import { sameAs } from '../lib/lex';
import { ruleChecks } from '../lib/sentence';
import { smartCheck, type SmartCheck } from '../lib/aicheck';
import { VerdictCard } from '../components/VerdictCard';
import { StepProgress } from '../components/Progress';
import { firstSense } from '../data/bank';
import { addMistake, tallySkill } from '../lib/progress';
import { checkTyped, GROUP, knowWord, saveSentence, leftToday, learnWord, nextWordQ, pickWordAnswer, quitWords, startWords } from '../state/words';

const WPD = [10, 20, 30, 40, 50, 70, 100];
const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Học từ mới mỗi ngày từ kho ~10.000 từ, rải đều theo số từ/ngày */
export function Words() {
  const { W } = useApp();
  if (W && W.phase === 'loading') return <Card className="center"><p className="muted">Đang tải từ vựng…</p></Card>;
  if (W && W.phase === 'learn') return <LearnCard />;
  if (W && W.phase === 'quiz') return <QuizCard />;
  return <WordsHome />;
}

function WordsHome() {
  const { P, W } = useApp();
  const [t, setT] = useRouteParam<'learn' | 'chunk' | 'check'>('t', 'learn');
  const head = (
    <div className="pagehead">
      <h2>📗 Từ vựng</h2>
      <Pills id="words" value={t} onChange={setT} items={[['learn', '📗 Học từ mới mỗi ngày'], ['chunk', '🧩 Học theo cụm (dịch câu/đoạn)'], ['check', '⚡ Kiểm tra nhanh, bỏ qua từ đã biết']]} />
    </div>
  );
  if (t === 'chunk') return <>{head}<ChunkPractice /></>;
  if (t === 'check') return <>{head}<QuickVocab /></>;

  const wpd = P.settings.wpd, done = newWordsToday(P), left = leftToday(), learned = bankLearned(P);
  const next = MILESTONES.find(([, n]) => n > learned);
  const due = dueWords(P).length, wk = weekNow(P), wv = vocabWeek(P, wk), behind = vocabBehind(P);
  return (
    <>
      {head}
      {W && W.phase === 'done' && (
        <Card className="center">
          <div className="huge">✅</div>
          <p>Xong lượt này: học <b>{W.learn.length}</b> từ mới{W.known ? <>, bỏ qua <b>{W.known}</b> từ đã biết</> : null}. +{W.xp} ⭐</p>
          {W.learn.length > 0 && <p className="muted small">Trả lời đúng {W.ok}/{W.q.length} câu. Các từ mới sẽ hiện trong 🔁 Ôn từ từ ngày mai.</p>}
        </Card>
      )}
      {due > 0 && (
        <Card className="warnc">
          <p>🔁 Bạn có <b>{due}</b> từ cũ cần ôn hôm nay. <b>Ôn từ cũ trước</b> rồi mới học từ mới, để không quên những gì đã học.</p>
          <button className="btn" data-act="tab" data-tab="review" onClick={() => tab('review')}>Ôn {due} từ trước</button>
        </Card>
      )}
      <Card>
        <div className="row between"><b>Tuần {wk} · từ vựng</b><span className="muted">{wv.done} / {wv.size} từ</span></div>
        <ProgressBar pct={Math.round((wv.done / wv.size) * 100)} />
        <p className="muted small">{behind > 0 ? `Bạn đang chậm ${behind} từ so với lịch (${wpd} từ/ngày). Học bù dần, mỗi ngày thêm một lượt.` : 'Bạn đang theo kịp lịch học từ vựng 👍'}</p>
      </Card>
      <Card>
        <div className="row between"><b>Hôm nay</b><span className="muted">{done} / {wpd} từ</span></div>
        <ProgressBar pct={Math.min(100, Math.round((done / wpd) * 100))} />
        <div className="row gap" style={{ marginTop: 12 }}>
          {left
            ? <button className="btn big" data-act="words" onClick={startWords}>▶ Học {Math.min(GROUP, left)} từ tiếp</button>
            : <><span className="okc">Đã đủ chỉ tiêu hôm nay 🎉</span><button className="btn ghost" data-act="words" onClick={startWords}>Học thêm {GROUP} từ</button></>}
          {W && <button className="btn ghost" onClick={quitWords}>Đóng</button>}
        </div>
      </Card>
      <Card>
        <h3>Kho từ của bạn</h3>
        <p>Đã học <b>{fmt(learned)}</b> / {fmt(BANK_TOTAL)} từ hiện có trong kho.</p>
        <ProgressBar pct={Math.min(100, Math.round((learned / 10000) * 100))} />
        <div className="ms">
          {MILESTONES.map(([band, n]) => (
            <div key={band} className={learned >= n ? 'row between okc' : 'row between'}>
              <span>🎯 IELTS {band}</span>
              <span>~{fmt(n)} từ{learned >= n ? ' ✓' : ` · còn ~${Math.ceil((n - learned) / wpd)} ngày`}</span>
            </div>
          ))}
        </div>
        {next && <p className="muted small">Với {wpd} từ/ngày, bạn đạt mốc IELTS {next[0]} (~{fmt(next[1])} từ) sau khoảng {Math.ceil((next[1] - learned) / wpd)} ngày.</p>}
        {BANK_TOTAL < 10000 && <p className="muted small">Kho đang được bổ sung dần lên 10.000 từ.</p>}
      </Card>
      <Card>
        <h3>🧠 Mẹo nhớ lâu (cho người hay quên)</h3>
        <ul className="tips">
          <li><b>Ôn trước, học sau:</b> mỗi ngày làm 🔁 Ôn từ trước. Ôn đúng lúc sắp quên giúp từ vào trí nhớ dài hạn.</li>
          <li><b>Đọc to 3 lần</b> mỗi từ mới và câu ví dụ. Vừa nói vừa nghe giúp nhớ hơn đọc thầm.</li>
          <li><b>Tự gõ lại từ:</b> phần kiểm tra cuối mỗi lượt bắt bạn tự nhớ ra từ. Thấy khó là đúng, càng khó nhớ ra thì càng nhớ lâu.</li>
          <li><b>Gắn với bản thân:</b> nghĩ một câu về chính bạn, ví dụ "I have a <i>deadline</i> on Friday".</li>
          <li><b>Ít mà đều:</b> chia thành nhiều lượt 10 từ trong ngày (sáng, trưa, tối) tốt hơn học dồn một lần.</li>
          <li><b>Ngủ đủ:</b> não sắp xếp lại trí nhớ khi ngủ. Ôn nhanh 5 phút trước khi ngủ rất hiệu quả.</li>
        </ul>
      </Card>
      <Card>
        <h3>Số từ mới mỗi ngày</h3>
        <Dropdown className="w-full" label="Mỗi ngày" value={wpd} onChange={setWpd} grid={4}
          options={WPD.map((n) => ({ value: n, label: <b>{n} từ</b>, sub: n === 30 ? 'đề xuất' : `${n * 7}/tuần` }))} />
        <p className="muted small">30 từ/ngày ≈ 3.000 từ sau 3 tháng, đủ vốn từ cho IELTS 5.5. Từ được xếp từ thông dụng nhất đến hiếm nhất (danh sách NGSL, AWL và 10.000 từ tần suất cao). Từ nào đã biết thì bấm <b>Đã biết</b> để bỏ qua, vẫn được ôn lại sau 30 ngày.</p>
      </Card>
    </>
  );
}

function LearnCard() {
  const W = useApp().W!, w = W.group[W.i];
  return (
    <>
      <div className="sess-top">
        <button className="icon" title="Thoát" onClick={quitWords}>✕</button>
        <ProgressBar pct={Math.round((W.i / W.group.length) * 100)} /><span className="muted small">{W.i + 1}/{W.group.length}</span>
      </div>
      <p className="tip small">⬇️ Kéo xuống dưới, đọc hết ngữ pháp và viết xong câu của bạn rồi mới bấm <b>Học từ này</b> hoặc <b>Đã biết</b> để sang từ mới.</p>
      <Card className="center wordcard">
        <div className="en">{w.w}</div>
        <div className="muted">{w.ipa} · <i>{w.pos}</i>{w.awl ? <> · <span className="band">học thuật</span></> : null}</div>
        <div className="row gap center"><SayBoth text={w.w} /></div>
        <Senses vi={w.vi} />
        <hr />
        <p className="ex"><b>{w.ex}</b> <AudioButton text={w.ex} /> <AudioButton text={w.ex} slow label="🐢" title="Đọc chậm" /></p>
        <Ipa text={w.ex} />
        <p className="muted">{w.exvi}</p>
        <GrammarNotes en={w.ex} pos={w.pos} open />
        <p className="tip small">🗣️ Đọc to từ và câu ví dụ 3 lần, rồi tự viết một câu về bạn có dùng từ <b>{w.w}</b>.</p>
      </Card>
      <WriteSentence key={w.w} />
    </>
  );
}

/** Tự viết 1 câu với từ mới. Máy chấm 4 mức (AI hiểu ngữ cảnh); sai thì phải tự sửa đến khi đúng.
 *  Chỉ khi đặt được câu đạt mới bấm được "Đã biết" hoặc "Học từ này". Lỗi sai được lưu vào Sổ lỗi sai. */
function WriteSentence() {
  const W = useApp().W!, w = W.group[W.i];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState<[boolean, string][] | null>(null);
  const [res, setRes] = useState<{ r: SmartCheck; text: string } | null>(null);
  const [tries, setTries] = useState(0);
  const rulesOk = !!rules && rules.every(([ok]) => ok);
  const passed = rulesOk && !!res && res.r.status !== 'incorrect' && res.r.usesWordCorrectly !== false && res.text === text;
  async function check() {
    const t = text.trim(); if (!t || busy) return;
    const rc = ruleChecks(t, w); setRules(rc); setRes(null);
    if (!rc.every(([ok]) => ok)) { setTries((n) => n + 1); return; }
    setBusy(true);
    const r = await smartCheck(t, { word: w.w, meaning: firstSense(w.vi) });
    setBusy(false); setRes({ r, text });
    if (r.status === 'incorrect' || r.usesWordCorrectly === false) {
      setTries((n) => n + 1);
      addMistake(app.P, t, r.correction, r.explanation || r.errors.map((e) => e.why).join(' '));
      tallySkill(app.P, 'write', false); save();
    } else { saveSentence(t); tallySkill(app.P, 'write', true); }
  }
  return (
    <>
      <Card>
        <h3>✍️ Viết câu của bạn với “{w.w}”</h3>
        <p className="muted small">Viết một câu thật về bạn, công việc hoặc cuộc sống của bạn (ít nhất 5 từ). Máy chấm ngữ pháp, cách dùng từ và độ tự nhiên. <b>Đặt được câu đúng mới qua được từ này.</b></p>
        <form onSubmit={(e) => { e.preventDefault(); check(); }}>
          <textarea className="ans" rows={2} placeholder={`Ví dụ: I ... ${w.w} ...`} value={text} disabled={passed}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); } }} />
          {!passed && <button className="btn" type="submit" disabled={busy || !text.trim()} style={{ marginTop: 10 }}>{busy ? 'Đang chấm…' : tries ? '🔁 Kiểm tra lại' : 'Kiểm tra câu'}</button>}
        </form>
        {rules && !rulesOk && <ul className="checks mt-2">{rules.filter(([ok]) => !ok).map(([, m]) => <li key={m} className="badc">✗ {m}</li>)}</ul>}
        {busy && <StepProgress steps={['Kiểm tra từ và luật câu', 'AI chấm ngữ pháp theo ngữ cảnh', 'Tổng hợp']} step={1} note="AI miễn phí có lúc mất 10–40 giây" />}
        {!busy && res && res.r.source !== 'ai' && <p className="note small mt-2">⚠️ AI đang bận nên câu được chấm bằng máy chấm cơ bản, <b>có thể chưa chính xác hoàn toàn</b>.</p>}
        {res && <VerdictCard r={res.r} text={res.text} />}
        {res && !passed && res.text === text && <p className="note mt-2">✏️ Sửa lại câu trong ô ở trên (có thể dựa vào “Câu đúng”), rồi bấm <b>Kiểm tra lại</b>. Lỗi này đã được lưu vào <b>📒 Sổ lỗi sai</b> để luyện lại sau.</p>}
        {passed && <GrammarNotes en={text} title="Ngữ pháp trong câu bạn vừa viết" />}
      </Card>
      <div className="foot">
        <button className="btn ghost big" data-act="know" title="Từ này bạn đã biết: bỏ qua, không cần đặt câu" onClick={knowWord}>✓ Đã biết</button>
        <button className="btn big" data-act="learn" disabled={!passed} title={passed ? '' : 'Đặt được câu đúng để mở khóa'} onClick={learnWord}>Học từ này →</button>
      </div>
      {!passed && <p className="muted small center">🔒 <b>Học từ này</b> mở khóa khi bạn viết được một câu đạt (✅, 🟡 hoặc 🔵). Từ đã biết thì bấm <b>Đã biết</b> luôn.</p>}
    </>
  );
}

function QuizCard() {
  const W = useApp().W!, q = W.q[W.qi], answered = W.picked !== null;
  return (
    <>
      <div className="sess-top">
        <button className="icon" title="Thoát" onClick={quitWords}>✕</button>
        <ProgressBar pct={Math.round((W.qi / W.q.length) * 100)} /><span className="muted small">{W.qi + 1}/{W.q.length}</span>
      </div>
      <Card className="center">
        {q.t === 'vi' && <><p className="ask">Nghĩa của từ này là gì?</p><div className="en">{q.w.w} <AudioButton text={q.w.w} /></div></>}
        {q.t === 'listen' && <><p className="ask">Nghe và chọn từ đúng</p><div className="row gap center"><AudioButton text={q.w.w} className="btn" label="🔊 Nghe lại" /><AudioButton text={q.w.w} slow className="btn ghost" label="🐢 Chậm" /></div></>}
        {q.t === 'type'
          ? <TypeRecall key={W.qi} />
          : <ChoiceList items={q.opts} answered={answered} correctIdx={q.ans} pickedIdx={W.picked ?? undefined} grid2 optClass={q.t === 'listen' ? 'en' : undefined} onPick={pickWordAnswer} />}
        {answered && <div className="muted" style={{ marginTop: 12 }}><b>{q.w.w}</b> {q.w.ipa}<Senses vi={q.w.vi} />{q.t === 'type' && sameAs(q.w.w).length > 0 && <p>Từ cùng nghĩa cũng đúng: <b>{sameAs(q.w.w).join(', ')}</b></p>}</div>}
      </Card>
      {answered && (
        <div className="foot">
          <span className={W.picked === q.ans ? 'okc' : 'badc'}>{W.picked === q.ans ? 'Đúng rồi! 🎉' : 'Chưa đúng, sẽ hỏi lại ở cuối.'}</span>
          <button className="btn big" data-act="next" data-autofocus onClick={nextWordQ}>Tiếp →</button>
        </div>
      )}
    </>
  );
}

/** Tự nhớ ra và gõ lại từ: nhìn nghĩa, nghe, rồi gõ */
function TypeRecall() {
  const W = useApp().W!, q = W.q[W.qi], answered = W.picked !== null;
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);
  return (
    <>
      <p className="ask">Tự nhớ và gõ lại từ tiếng Anh{sameAs(q.w.w).length ? <span className="muted small"> (có {sameAs(q.w.w).length + 1} từ đúng, gõ 1 từ là được)</span> : null}</p>
      <div className="vi-prompt">{q.w.vi}</div>
      <div className="row gap center" style={{ margin: '10px 0' }}>
        <AudioButton text={q.w.w} className="btn ghost" label="🔊 Nghe" />
        {!answered && !hint && <button className="btn ghost" onClick={() => setHint(true)}>💡 Gợi ý (phiên âm)</button>}
      </div>
      {hint && !answered && <div className="spell-hint"><div className="sh-ipa">{q.w.ipa} <AudioButton text={q.w.w} className="icon xs" /> <AudioButton text={q.w.w} slow label="🐢" className="icon xs" /></div><p className="muted small m-0 center">{q.w.w.length} chữ cái · bắt đầu bằng “<b>{q.w.w.slice(0, 2)}</b>…” · {q.w.pos}</p></div>}
      <form onSubmit={(e) => { e.preventDefault(); checkTyped(text); }}>
        <input className="ans" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Gõ từ tiếng Anh…" disabled={answered}
          data-autofocus={answered ? undefined : '1'} value={text} onChange={(e) => setText(e.target.value)} />
        {!answered && <button className="btn" type="submit" style={{ marginTop: 10 }}>Kiểm tra</button>}
      </form>
    </>
  );
}
