import { Fragment } from 'react';
import { UNITS } from '../data';
import { roadmap, totalWeeks } from '../lib/roadmap';
import { Card } from '../components/Card';
import { Dashboard } from '../components/Dashboard';
import { UnitCard } from '../components/UnitCard';
import { vocabWeek, weekNow, unlocked, weekDone, weekUnits, type Progress } from '../lib/progress';
import { introOk } from '../state/actions';
import { startQuickTest } from '../state/session';
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
  const WG = roadmap(P);
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
      <Dashboard P={P} />
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
