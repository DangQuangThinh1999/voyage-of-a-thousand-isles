import { AudioButton, SayBoth } from '../components/AudioButton';
import { Card } from '../components/Card';
import { GrammarNotes } from '../components/GrammarNotes';
import { Ipa, Senses } from '../components/Ipa';
import { ProgressBar } from '../components/ProgressBar';
import { dueWords } from '../lib/srs';
import { flipCard, rate, reviewWord, startReview } from '../state/actions';
import { PracticeBar } from '../components/PracticeBar';
import { tab, useApp } from '../state/store';

/** Ôn từ vựng bằng thẻ nhớ */
export function Review() {
  const { P, R } = useApp();
  const learned = Object.keys(P.srs).length;
  if (!R || R.i >= R.q.length) {
    const due = dueWords(P).length, done = R && R.q.length;
    return (
      <>
        <PracticeBar />
        <h2>🔁 Ôn từ vựng</h2>
        <Card className="center">
          {done ? <><div className="huge">✅</div><p>Đã ôn xong {R!.q.length} thẻ. +{R!.n} ⭐</p></> : null}
          <p>Bạn đã học <b>{learned}</b> từ. Cần ôn hôm nay: <b>{due}</b> từ.</p>
          {due ? <button className="btn big" data-act="review" onClick={() => startReview(false)}>Ôn {due} từ</button>
            : learned ? <><p className="muted">Không còn từ nào cần ôn hôm nay 🎉</p><button className="btn ghost" data-act="review" data-extra="1" onClick={() => startReview(true)}>Ôn thêm 10 từ ngẫu nhiên</button></>
              : <p className="muted">Học phần 📚 Từ vựng của bài 1 hoặc 📗 Từ mới trước nhé.</p>}
        </Card>
        <p className="muted small">Thẻ nhớ dùng cách “lặp lại ngắt quãng”: từ bạn nhớ sẽ ôn lại sau 1, 2, 4, 7, 14, 30 ngày; từ bạn quên sẽ ôn lại ngay.</p>
      </>
    );
  }
  const c = R.q[R.i], w = reviewWord(c.w);
  return (
    <>
      <div className="sess-top">
        <button className="icon" data-act="tab" data-tab="review" data-reset="1" onClick={() => tab('review', true)}>✕</button>
        <ProgressBar pct={Math.round((R.i / R.q.length) * 100)} /><span className="muted small">{R.i + 1}/{R.q.length}</span>
      </div>
      <Card className="center flash">
        {c.dir === 'en'
          ? <><div className="en">{w.en}</div><Ipa text={w.en} /><div className="row gap center"><SayBoth text={w.en} /></div><p className="muted">Nghĩa là gì?</p></>
          : <>{w.em && <div className="huge">{w.em}</div>}<div className="vi">{w.vi}</div><p className="muted">Tiếng Anh là gì? Hãy nói to!</p></>}
        {R.flip && <><hr />{w.em && <div className="huge">{w.em}</div>}<div className="en">{w.en} <AudioButton text={w.en} /></div><Ipa text={w.en} /><Senses vi={w.vi} />
          {w.ex && <><p className="ex"><b>{w.ex}</b> <AudioButton text={w.ex} /></p><Ipa text={w.ex} /><p className="muted small">{w.exvi}</p><GrammarNotes en={w.ex} /></>}
          {P.vs && P.vs[c.w] && <p className="tip">✍️ Câu của bạn: <b>{P.vs[c.w]}</b> <AudioButton text={P.vs[c.w]} /></p>}</>}
      </Card>
      <div className="foot">{R.flip
        ? <><button className="btn ghost big" data-act="rate" data-ok="0" onClick={() => rate(false)}>😕 Quên</button><button className="btn big" data-act="rate" data-ok="1" onClick={() => rate(true)}>🙂 Nhớ</button></>
        : <button className="btn big" data-act="flip" onClick={flipCard}>Lật thẻ</button>}</div>
    </>
  );
}
