import { Fragment } from 'react';
import { UNITS } from '../data';
import { roadmap, totalWeeks } from '../lib/roadmap';
import { Card } from '../components/Card';
import { Dashboard } from '../components/Dashboard';
import { WeekCarousel } from '../components/WeekCarousel';
import { motion } from 'motion/react';
import { UnitCard } from '../components/UnitCard';
import { vocabWeek, weekNow, weekDone, type Progress } from '../lib/progress';
import { introOk } from '../state/actions';
import { requestExam } from '../state/exam';
import { tab, useApp } from '../state/store';

function WeekBadge({ w, P }: { w: number; P: Progress }) {
  const WG = roadmap(P);
  const t0 = (P.tests || {})['w' + w];
  if (weekDone(P, w)) return <span className="row gap"><span className="okc small">✓ Đạt ~IELTS {WG[w].band}</span><button className="btn ghost sm" onClick={() => requestExam('w' + w)}>🔁 Làm lại kiểm tra tuần{t0 ? ` · ${t0.best}%` : ''}</button></span>;
  const t = (P.tests || {})['w' + w];
  return <button className="btn ghost sm" data-act="test" data-w={w} onClick={() => requestExam('w' + w)}>⚡ Kiểm tra tuần {w}{t ? ` · ${t.best}% · làm lại` : ''}</button>;
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
      {weeks.map((w, wi) => (
        <Fragment key={w}>
          <motion.section className={`wk-banner ${weekDone(P, w) ? 'done' : ''} ${w === weekNow(P) ? 'now' : ''}`} id={`wk-${w}`}
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: wi * 0.03 }}>
            <div className="wb-num"><small>TUẦN</small><b>{w}</b></div>
            <div className="wb-main">
              <div className="wb-chips"><span className="chip3">{WG[w].cefr}</span><span className="chip3 band">🎯 IELTS {WG[w].band}</span>{w === weekNow(P) && <span className="chip3 now">⛵ Tuần này</span>}</div>
              <div className="wb-goal">{WG[w].goal}</div>
              <VocabRow w={w} P={P} />
            </div>
            <div className="wb-act"><WeekBadge w={w} P={P} /></div>
          </motion.section>
          <div className="units">{UNITS.map((u, i) => [u, i] as const).filter(([u]) => u.week === w).map(([u]) => <UnitCard key={u.id} u={u} P={P} />)}</div>
        </Fragment>
      ))}
      <div className="sec-h"><h3>🧭 Các tuần tiếp theo</h3><span className="muted small">Tổng {totalWeeks(P)} tuần tới IELTS {P.settings.target} · vuốt ngang để xem</span></div>
      <WeekCarousel P={P} weeks={Object.entries(WG).filter(([w]) => !weeks.includes(+w)).map(([w, g]) => [+w, g])} />
      <p className="muted center small">Học bài nào trước cũng được · <b className="muted">mờ</b> = chưa học, <b style={{ color: '#fb923c' }}>cam</b> → <b style={{ color: '#fbbf24' }}>vàng</b> → <b style={{ color: '#22d3ee' }}>xanh dương</b> = đang học, <b className="okc">xanh lá</b> = xong.<br />Đã biết rồi? Bấm <b>⚡ Kiểm tra nhanh</b>: đúng hết 100% là qua luôn cả tuần.</p>
    </>
  );
}
