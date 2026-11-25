import { DAILY_PLAN, ROADMAP, type Phase } from '../data';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { dayNumber, PLAN_KEYS, today, TOTAL_DAYS } from '../lib/progress';
import { addMinutes } from '../state/actions';
import { useApp } from '../state/store';

const LINKS: [string, string][] = [
  ['https://learningenglish.voanews.com', '🎧 VOA Learning English: tin tức đọc chậm, có chữ'],
  ['https://www.bbc.co.uk/learningenglish', '🎧 BBC Learning English: bài nghe ngắn theo cấp độ'],
  ['https://learnenglish.britishcouncil.org', '📖 British Council LearnEnglish: đọc, nghe, ngữ pháp A1–B2'],
  ['https://youglish.com', '🗣️ YouGlish: nghe người bản xứ đọc một từ bất kỳ'],
  ['https://ielts.org', '📝 IELTS.org: đề mẫu chính thức (dùng từ tuần 9)'],
];

/** Lộ trình 3 tháng + thời khóa biểu mỗi ngày */
export function Plan() {
  const { P } = useApp();
  const dn = dayNumber(P), week = Math.ceil(dn / 7), d = today(P);
  const phase = (r: Phase) => { const [a, b] = r.weeks.split('–').map(Number); return week >= a && week <= b; };
  return (
    <>
      <h2>🗺️ Lộ trình 3 tháng → IELTS 5.5</h2>
      <Card><div className="row between"><b>Ngày {dn}/{TOTAL_DAYS} · Tuần {week}/12</b><span className="muted small">bắt đầu {P.startDate}</span></div>
        <ProgressBar pct={Math.round((dn / TOTAL_DAYS) * 100)} />
        <p className="note">Nói thật: từ mức 2.0 lên 5.5 thường cần khoảng 600–800 giờ học. Muốn xong trong 90 ngày thì cần <b>3–4 giờ mỗi ngày, không nghỉ ngày nào</b>.
          {' '}Học ít hơn vẫn tiến bộ, chỉ là cần thêm thời gian (khoảng 5–6 tháng). Học đều mỗi ngày quan trọng hơn học dồn.</p></Card>
      <h3>Các giai đoạn</h3>
      {ROADMAP.map((r) => (
        <Card key={r.weeks} className={phase(r) ? 'phase now' : 'phase'}>
          <div className="row between"><b>Tuần {r.weeks} · {r.level}</b>{phase(r) && <span className="pill">Bạn đang ở đây</span>}</div>
          <p>{r.goal}</p>{r.inApp ? <p className="muted small">✅ Đã có bài trong app</p> : <p className="muted small">⏳ Bài trong app sẽ được thêm dần</p>}
        </Card>
      ))}
      <h3>Mỗi ngày ({P.settings.goalMin} phút)</h3>
      <Card>
        {DAILY_PLAN.map(([ic, name, min, desc], i) => {
          const k = PLAN_KEYS[i], done = Math.floor((d.sec[k] || 0) / 60);
          return (
            <div key={k} className="plan">
              <div className="row between"><b>{ic} {name}</b><span className="muted small">{done}/{min} phút</span></div>
              <ProgressBar thin pct={Math.min(100, Math.round((done / min) * 100))} />
              <div className="row between"><span className="muted small">{desc}</span><button className="btn ghost sm" data-act="addmin" data-k={k} title="Ghi thêm 15 phút học ngoài app" onClick={() => addMinutes(k)}>+15′</button></div>
            </div>
          );
        })}
        <p className="muted small">Thời gian trong app được đếm tự động. Học ngoài app (podcast, sách…) thì bấm +15′ để ghi lại.</p>
      </Card>
      <h3>Tài liệu miễn phí nên dùng thêm</h3>
      <Card className="links">{LINKS.map(([href, label]) => <a key={href} href={href} target="_blank" rel="noopener">{label}</a>)}</Card>
    </>
  );
}
