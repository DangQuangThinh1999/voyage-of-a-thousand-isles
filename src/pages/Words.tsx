import { AudioButton, SayBoth } from '../components/AudioButton';
import { Card } from '../components/Card';
import { ChoiceList } from '../components/ChoiceList';
import { ProgressBar } from '../components/ProgressBar';
import { BANK_TOTAL, MILESTONES } from '../data/bank';
import { bankLearned, newWordsToday } from '../lib/progress';
import { setWpd } from '../state/actions';
import { useApp } from '../state/store';
import { GROUP, knowWord, leftToday, learnWord, nextWordQ, pickWordAnswer, quitWords, startWords } from '../state/words';

const WPD = [10, 20, 30, 40, 50, 70, 100];
const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Học từ mới mỗi ngày từ kho ~10.000 từ, rải đều theo số từ/ngày */
export function Words() {
  const { P, W } = useApp();
  if (W && W.phase === 'loading') return <Card className="center"><p className="muted">Đang tải từ vựng…</p></Card>;
  if (W && W.phase === 'learn') return <LearnCard />;
  if (W && W.phase === 'quiz') return <QuizCard />;

  const wpd = P.settings.wpd, done = newWordsToday(P), left = leftToday(), learned = bankLearned(P);
  const next = MILESTONES.find(([, n]) => n > learned);
  return (
    <>
      <h2>📗 Từ mới mỗi ngày</h2>
      {W && W.phase === 'done' && (
        <Card className="center">
          <div className="huge">✅</div>
          <p>Xong lượt này: học <b>{W.learn.length}</b> từ mới{W.known ? <>, bỏ qua <b>{W.known}</b> từ đã biết</> : null}. +{W.xp} ⭐</p>
          {W.learn.length > 0 && <p className="muted small">Trả lời đúng {W.ok}/{W.q.length} câu. Các từ mới sẽ hiện trong 🔁 Ôn từ từ ngày mai.</p>}
        </Card>
      )}
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
        <h3>Số từ mới mỗi ngày</h3>
        <select id="wpd" value={wpd} onChange={(e) => setWpd(+e.target.value)}>
          {WPD.map((n) => <option key={n} value={n}>{n} từ/ngày{n === 30 ? ' (đề xuất)' : ''}</option>)}
        </select>
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
      <Card className="center wordcard">
        <div className="en">{w.w}</div>
        <div className="muted">{w.ipa} · <i>{w.pos}</i>{w.awl ? <> · <span className="band">học thuật</span></> : null}</div>
        <div className="row gap center"><SayBoth text={w.w} /></div>
        <div className="vi" style={{ marginTop: 10 }}>{w.vi}</div>
        <hr />
        <p className="ex"><b>{w.ex}</b> <AudioButton text={w.ex} /> <AudioButton text={w.ex} slow label="🐢" title="Đọc chậm" /></p>
        <p className="muted">{w.exvi}</p>
      </Card>
      <div className="foot">
        <button className="btn ghost big" data-act="know" onClick={knowWord}>✓ Đã biết</button>
        <button className="btn big" data-act="learn" onClick={learnWord}>Học từ này →</button>
      </div>
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
        {q.t === 'vi'
          ? <><p className="ask">Nghĩa của từ này là gì?</p><div className="en">{q.w.w} <AudioButton text={q.w.w} /></div></>
          : <><p className="ask">Nghe và chọn từ đúng</p><div className="row gap center"><AudioButton text={q.w.w} className="btn" label="🔊 Nghe lại" /><AudioButton text={q.w.w} slow className="btn ghost" label="🐢 Chậm" /></div></>}
        <ChoiceList items={q.opts} answered={answered} correctIdx={q.ans} pickedIdx={W.picked ?? undefined} grid2 optClass={q.t === 'listen' ? 'en' : undefined} onPick={pickWordAnswer} />
        {answered && <p className="muted" style={{ marginTop: 12 }}><b>{q.w.w}</b> {q.w.ipa}: {q.w.vi}</p>}
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
