import { DAILY_PLAN } from '../data';
import { roadmap, weekRange, wordsFor } from '../lib/roadmap';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { dayNumber, PLAN_KEYS, today, vocabWeek, weekNow } from '../lib/progress';
import { addMinutes } from '../state/actions';
import { useApp } from '../state/store';

const LINKS: [string, string][] = [
  ['https://learningenglish.voanews.com', '🎧 VOA Learning English: tin tức đọc chậm, có chữ'],
  ['https://www.bbc.co.uk/learningenglish', '🎧 BBC Learning English: bài nghe ngắn theo cấp độ'],
  ['https://learnenglish.britishcouncil.org', '📖 British Council LearnEnglish: đọc, nghe, ngữ pháp A1–B2'],
  ['https://youglish.com', '🗣️ YouGlish: nghe người bản xứ đọc một từ bất kỳ'],
  ['https://ielts.org', '📝 IELTS.org: đề mẫu chính thức (dùng từ tuần 9)'],
];

const CEFR_NAME: Record<string, string> = { A1: 'nền tảng', A2: 'sơ cấp', B1: 'trung cấp, làm quen và luyện đề IELTS', B2: 'trung cao cấp', C1: 'cao cấp', C2: 'thành thạo như người bản xứ' };
interface PhaseRow { from: number; to: number; cefr: string; bands: string[]; goals: [w: number, goal: string, special: string][] }
/** Gom các tuần liền nhau cùng trình độ CEFR thành một giai đoạn */
function phasesOf(rm: ReturnType<typeof roadmap>): PhaseRow[] {
  const out: PhaseRow[] = [];
  for (const [ws, g] of Object.entries(rm)) {
    const w = +ws, c = g.cefr.replace('+', ''), last = out[out.length - 1];
    if (last && last.cefr === c) { last.to = w; if (!last.bands.includes(g.band)) last.bands.push(g.band); last.goals.push([w, g.goal, g.special]); }
    else out.push({ from: w, to: w, cefr: c, bands: [g.band], goals: [[w, g.goal, g.special]] });
  }
  return out;
}

/** Lộ trình theo mục tiêu IELTS + thời khóa biểu mỗi ngày */
export function Plan() {
  const { P } = useApp();
  const rm = roadmap(P), N = Object.keys(rm).length, dn = dayNumber(P), week = Math.min(weekNow(P), N), d = today(P);
  const target = parseFloat(P.settings.target) || 5.5, hours = Math.round((target - 2) * 180);
  return (
    <>
      <h2>🗺️ Lộ trình {N} tuần → IELTS {P.settings.target}</h2>
      <Card><div className="row between"><b>Ngày {Math.min(dn, N * 7)}/{N * 7} · Tuần {week}/{N}</b><span className="muted small">bắt đầu {P.startDate}</span></div>
        <ProgressBar pct={Math.round((Math.min(dn, N * 7) / (N * 7)) * 100)} />
        <p className="note">Nói thật: từ mức 2.0 lên IELTS {P.settings.target} thường cần khoảng <b>{hours.toLocaleString('vi-VN')} giờ học</b> và vốn khoảng <b>{wordsFor(target).toLocaleString('vi-VN')} từ</b>.
          {' '}Lộ trình {N} tuần này tính theo {P.settings.wpd} từ mới mỗi ngày; học ít hơn vẫn tiến bộ, chỉ cần thêm thời gian. Học đều mỗi ngày quan trọng hơn học dồn.</p></Card>
      <h3>Các giai đoạn</h3>
      {phasesOf(rm).map((r) => {
        const now = week >= r.from && week <= r.to, done = week > r.to;
        return (
          <Card key={r.from} className={now ? 'phase now' : 'phase'}>
            <div className="row between"><b>{done ? '✅ ' : ''}Tuần {r.from}{r.to > r.from ? `–${r.to}` : ''} · {r.cefr} · {CEFR_NAME[r.cefr] || ''}</b>{now && <span className="pill">Bạn đang ở đây</span>}</div>
            <div className="wb-chips mt-1"><span className="chip3 band">🎯 IELTS {r.bands[0]}{r.bands.length > 1 ? ` → ${r.bands[r.bands.length - 1]}` : ''}</span><span className="chip3">📗 ~{weekRange(P, r.to)[1].toLocaleString('vi-VN')} từ tích lũy</span><span className="chip3">{r.to - r.from + 1} tuần</span></div>
            <ol className="plan-weeks">{r.goals.map(([w, g, sp]) => <li key={w} className={w === week ? 'now' : ''}><span className="pw-n">T{w}</span><span><b>{g}</b>{sp && <small>⭐ {sp}</small>}</span><span className="pw-w">{vocabWeek(P, w).size} từ</span></li>)}</ol>
            <p className="muted small m-0">{r.from <= 4 ? '✅ Có bài học chủ đề + kiểm tra + từ vựng + bài AI 4 kỹ năng' : '✅ Từ vựng theo tuần + kiểm tra tuần + bài Đọc / Nghe / Nói / Viết do AI tạo đúng cấp độ'}</p>
          </Card>
        );
      })}
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
