import { Fragment } from 'react';
import { UNITS, WEEK_GOALS as WG } from '../data';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { UnitCard } from '../components/UnitCard';
import { dayNumber, levelNow, minutesToday, nextTask, TOTAL_DAYS, unlocked, weekDone, weekUnits, type Progress } from '../lib/progress';
import { dueWords } from '../lib/srs';
import { introOk } from '../state/actions';
import { startQuickTest, startSession } from '../state/session';
import { tab, useApp } from '../state/store';

function WeekBadge({ w, P }: { w: number; P: Progress }) {
  const us = weekUnits(w);
  if (weekDone(P, w)) return <span className="okc small">✓ Đạt ~IELTS {WG[w].band}</span>;
  if (!unlocked(P, UNITS.indexOf(us[0]))) return <span className="muted small">🔒</span>;
  const t = (P.tests || {})['w' + w];
  return <button className="btn ghost sm" data-act="test" data-w={w} onClick={() => startQuickTest({ w })}>⚡ Kiểm tra nhanh{t ? ` · ${t.best}%` : ''}</button>;
}

export function Home() {
  const { P } = useApp();
  const min = minutesToday(P), goal = P.settings.goalMin, pct = Math.min(100, Math.round((min / goal) * 100));
  const nt = nextTask(P), due = dueWords(P).length;
  const weeks = [...new Set(UNITS.map((u) => u.week))];
  return (
    <>
      {!P.seenIntro && (
        <Card className="intro">
          <h2>Chào bạn 👋</h2>
          <p>Đây là app luyện <b>Nghe · Nói · Đọc · Viết</b> từ mức mới bắt đầu. Mọi câu tiếng Anh đều có nút 🔊 để nghe và có dịch tiếng Việt.</p>
          <ul>
            <li>Mỗi bài có 5 phần nhỏ, mỗi phần khoảng 5–10 phút.</li>
            <li>Phần nào đã biết thì bấm <b>⚡ Kiểm tra nhanh</b>. Bài kiểm tra khó hơn bài học, đúng hết 100% mới qua.</li>
            <li>Phần <b>Nói</b> dùng micro. Nên dùng <b>Chrome</b> hoặc <b>Edge</b>.</li>
            <li>Mục tiêu IELTS 5.5 trong 3 tháng cần học <b>khoảng 3,5 giờ/ngày</b>. Xem tab 🗺️ Lộ trình.</li>
          </ul>
          <button className="btn" data-act="introOk" onClick={introOk}>Bắt đầu thôi!</button>
        </Card>
      )}
      <Card className="today">
        <div className="row between"><b>Hôm nay · Ngày {dayNumber(P)}/{TOTAL_DAYS}</b><span className="muted">{min} / {goal} phút</span></div>
        <ProgressBar pct={pct} />
        <p className="lvline">🎯 Trình độ ước tính: <b>IELTS {levelNow(P)}</b> · Mục tiêu: <b>IELTS 5.5</b><br /><span className="muted small">Ước tính theo các tuần đã học xong hoặc đã qua kiểm tra, không phải điểm thi thật.</span></p>
        <div className="row gap">
          {nt
            ? <button className="btn big" data-act="start" data-u={nt.u.id} data-k={nt.k[0]} onClick={() => startSession(nt.u.id, nt.k[0])}>▶ Học tiếp: {nt.u.emoji} {nt.u.title} · {nt.k[1]} {nt.k[2]}</button>
            : <div className="muted">Bạn đã xong tất cả bài hiện có 🎉 Bài mới cho tuần 5–8 sẽ được thêm vào.</div>}
          <button className="btn ghost big" data-act="tab" data-tab="review" onClick={() => tab('review')}>🔁 Ôn từ vựng{due ? <> <span className="pill">{due}</span></> : null}</button>
        </div>
      </Card>
      {weeks.map((w) => (
        <Fragment key={w}>
          <div className="wkrow" id={`wk-${w}`}>
            <div className="row between"><h3 className="wk">Tuần {w} · {WG[w].cefr} · 🎯 IELTS {WG[w].band}</h3><WeekBadge w={w} P={P} /></div>
            <div className="muted small">{WG[w].goal}</div>
          </div>
          <div className="units">{UNITS.map((u, i) => [u, i] as const).filter(([u]) => u.week === w).map(([u, i]) => <UnitCard key={u.id} u={u} P={P} locked={!unlocked(P, i)} />)}</div>
        </Fragment>
      ))}
      <h3>Các tuần tiếp theo</h3>
      <Card className="upcoming">
        {Object.entries(WG).filter(([w]) => !weeks.includes(+w)).map(([w, g]) => (
          <div key={w} className="row between"><span><b>Tuần {w}</b> · {g.cefr} · {g.goal}</span><span className="band">🎯 {g.band}</span></div>
        ))}
        <p className="muted small">Bài cho các tuần này sẽ được thêm dần.</p>
      </Card>
      <p className="muted center small">Bài tiếp theo mở khi bạn làm xong 3/5 phần của bài trước.<br />Đã biết rồi? Bấm <b>⚡ Kiểm tra nhanh</b>: đúng hết 100% là qua luôn cả tuần.</p>
    </>
  );
}
