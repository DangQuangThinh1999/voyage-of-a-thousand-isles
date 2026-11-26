import { Fragment } from 'react';
import { UNITS } from '../data';
import { roadmap, totalWeeks } from '../lib/roadmap';
import { Card } from '../components/Card';
import { TargetPicker } from '../components/TargetPicker';
import { ProgressBar } from '../components/ProgressBar';
import { UnitCard } from '../components/UnitCard';
import { bankLearned, dayNumber, levelNow, newWordsToday, vocabWeek, weekNow, minutesToday, nextTask, unlocked, weekDone, weekUnits, type Progress } from '../lib/progress';
import { dueWords } from '../lib/srs';
import { introOk } from '../state/actions';
import { startQuickTest, startSession } from '../state/session';
import { tab, useApp } from '../state/store';

function WeekBadge({ w, P }: { w: number; P: Progress }) {
  const WG = roadmap(P);
  const us = weekUnits(w);
  const t0 = (P.tests || {})['w' + w];
  if (weekDone(P, w)) return <span className="row gap"><span className="okc small">✓ Đạt ~IELTS {WG[w].band}</span><button className="btn ghost sm" onClick={() => startQuickTest({ w })}>🔁 Làm lại kiểm tra tuần{t0 ? ` · ${t0.best}%` : ''}</button></span>;
  if (!unlocked(P, UNITS.indexOf(us[0]))) return <span className="muted small">🔒</span>;
  const t = (P.tests || {})['w' + w];
  return <button className="btn ghost sm" data-act="test" data-w={w} onClick={() => startQuickTest({ w })}>⚡ Kiểm tra tuần {w}{t ? ` · ${t.best}% · làm lại` : ''}</button>;
}

/** Từ vựng rải đều của tuần w (7 × số từ/ngày) */
function VocabRow({ w, P }: { w: number; P: Progress }) {
  const { done, size } = vocabWeek(P, w), now = weekNow(P);
  const cls = done >= size ? 'vrow okc' : w === now ? 'vrow now' : 'vrow';
  return (
    <button className={cls} data-act="tab" data-tab="words" onClick={() => tab('words')}>
      📗 Từ vựng tuần: <b>{done}/{size}</b> từ{done >= size ? ' ✓' : w === now ? ' · tuần này' : ''}
    </button>
  );
}

export function Home() {
  const { P } = useApp();
  const WG = roadmap(P), TOTAL = totalWeeks(P) * 7;
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
        <div className="row between"><b>Hôm nay · Ngày {dayNumber(P)}/{TOTAL}</b><span className="muted">{min} / {goal} phút</span></div>
        <ProgressBar pct={pct} />
        <p className="lvline">🎯 Trình độ ước tính: <b>IELTS {levelNow(P)}</b> · <TargetPicker className="target inline" /><br /><span className="muted small">📗 Kho từ: đã học {bankLearned(P)} từ. Ước tính theo các tuần đã học xong hoặc đã qua kiểm tra, không phải điểm thi thật.</span></p>
        <div className="row gap">
          {nt
            ? <button className="btn big" data-act="start" data-u={nt.u.id} data-k={nt.k[0]} onClick={() => startSession(nt.u.id, nt.k[0])}>▶ Học tiếp: {nt.u.emoji} {nt.u.title} · {nt.k[1]} {nt.k[2]}</button>
            : <div className="muted">Bạn đã xong tất cả bài hiện có 🎉 Bài mới cho tuần 5–8 sẽ được thêm vào.</div>}
          <button className="btn ghost big" data-act="tab" data-tab="words" onClick={() => tab('words')}>📗 Từ mới {Math.min(newWordsToday(P), P.settings.wpd)}/{P.settings.wpd}</button>
          <button className="btn ghost big" data-act="tab" data-tab="review" onClick={() => tab('review')}>🔁 Ôn từ vựng{due ? <> <span className="pill">{due}</span></> : null}</button>
        </div>
      </Card>
      {weeks.map((w) => (
        <Fragment key={w}>
          <div className="wkrow" id={`wk-${w}`}>
            <div className="row between"><h3 className="wk">Tuần {w} · {WG[w].cefr} · 🎯 IELTS {WG[w].band}</h3><WeekBadge w={w} P={P} /></div>
            <div className="muted small">{WG[w].goal}</div>
            <VocabRow w={w} P={P} />
          </div>
          <div className="units">{UNITS.map((u, i) => [u, i] as const).filter(([u]) => u.week === w).map(([u, i]) => <UnitCard key={u.id} u={u} P={P} locked={!unlocked(P, i)} />)}</div>
        </Fragment>
      ))}
      <h3>Các tuần tiếp theo <span className="muted small">· tổng {totalWeeks(P)} tuần tới IELTS {P.settings.target}</span></h3>
      <Card className="upcoming">
        {Object.entries(WG).filter(([w]) => !weeks.includes(+w)).map(([w, g]) => (
          <div key={w}>
            <div className="row between"><span><b>Tuần {w}</b> · {g.cefr} · {g.goal}</span><span className="band">🎯 {g.band}</span></div>
            <VocabRow w={+w} P={P} />
          </div>
        ))}
        <p className="muted small">Bài cho các tuần này sẽ được thêm dần.</p>
      </Card>
      <p className="muted center small">Bài tiếp theo mở khi bạn làm xong 3/5 phần của bài trước.<br />Đã biết rồi? Bấm <b>⚡ Kiểm tra nhanh</b>: đúng hết 100% là qua luôn cả tuần.</p>
    </>
  );
}
