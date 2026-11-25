import { UNITS, WEEK_GOALS as WG } from '../data';
import { Card } from '../components/Card';
import { SessionRunner } from '../components/SessionRunner';
import { PASS, SKILL_NAME, type ParaStep, type Skill } from '../lib/exercises';
import { KINDS, nextTask } from '../lib/progress';
import { beginTest, startQuickTest, startSession } from '../state/session';
import { go, tab, useApp, type Session as S } from '../state/store';

function TestIntro({ S }: { S: S }) {
  const para = S.steps[S.steps.length - 1] as ParaStep, key = S.key || '', w = key[0] === 'w' ? +key.slice(1) : null;
  return (
    <Card>
      <h2>⚡ Kiểm tra nhanh · {S.title}</h2>
      {w ? <p>Qua bài này nghĩa là bạn đạt mục tiêu <b>🎯 IELTS ~{WG[w].band}</b> ({WG[w].cefr}).</p> : null}
      <p><b>{S.steps.length} câu</b>, đủ 4 kỹ năng. Bài kiểm tra <b>khó hơn bài học thường</b>:</p>
      <ul className="rules">
        <li>⏱ Mỗi câu có giới hạn thời gian. Hết giờ tính là sai.</li>
        <li>🎧 Mỗi bài nghe chỉ được nghe <b>tối đa 2 lần</b>, giọng đọc nhanh, không có nút đọc chậm.</li>
        <li>🚫 Không gợi ý, không dịch tiếng Việt, không có hình minh họa. Chọn nghĩa có 6 đáp án.</li>
        <li>✍️ Nghe chép và tự viết câu phải <b>gõ cả câu</b>, đúng chữ hoa và dấu câu. Sai 1 chữ cái là sai.</li>
        <li>🗣️ Phần nói không có mẫu để nghe, phải đọc <b>đúng 100% số từ</b>, tối đa 2 lần.</li>
        <li>📝 Đoạn văn: ít nhất {para.minWords} từ, {para.minSents} câu, dùng {para.minVocab} từ vựng đã học.</li>
        <li>🎯 Phải <b>đúng hết 100%</b> mới qua.</li>
      </ul>
      <div className="row gap"><button className="btn ghost" data-act="tab" data-tab="home" onClick={() => tab('home')}>Để sau</button><button className="btn big" data-act="beginTest" onClick={beginTest}>Bắt đầu ⚡</button></div>
    </Card>
  );
}

function TestDone({ S }: { S: S }) {
  const d = S.done!, key = S.key || '', next = key[0] === 'w' ? +key.slice(1) + 1 : null;
  const hasNext = !!next && UNITS.some((u) => u.week === next);
  const skills = Object.entries(S.skill) as [Skill, [number, number]][];
  const weak = skills.filter(([, [ok, n]]) => ok / n < PASS).map(([k]) => SKILL_NAME[k]);
  return (
    <Card className="center finish">
      <div className="huge">{d.passed ? '🎉' : '💪'}</div>
      <h2>{d.passed ? `Qua rồi! ${S.title} đã xong` : `Chưa qua ${S.title}`}</h2>
      {d.passed && key[0] === 'w' && <p className="xp">🎯 Bạn đạt ~IELTS {WG[+key.slice(1)].band}</p>}
      <p>Đúng <b>{S.ok}/{S.graded}</b> ({d.pct}%) · cần đúng hết 100%</p>
      <Card className="left">{skills.map(([k, [ok, n]]) => (
        <div key={k} className="row between"><span>{SKILL_NAME[k]}</span><b className={ok / n >= PASS ? 'okc' : 'badc'}>{ok}/{n}</b></div>
      ))}</Card>
      <p>{d.passed ? 'Các bài đã được đánh dấu học xong. Từ vựng đã vào thẻ ôn, vài ngày nữa sẽ được nhắc lại.'
        : <>Không sao cả! {weak.length ? <>Bạn nên học kỹ phần <b>{weak.join(', ')}</b>.</> : null} Học xong rồi làm lại bài kiểm tra nhé.</>}</p>
      <p className="xp">+{d.xp} ⭐</p>
      <div className="row gap center">
        <button className="btn ghost" data-act="tab" data-tab="home" onClick={() => tab('home')}>← Trang chủ</button>
        {d.passed && hasNext && <button className="btn" data-act="test" data-w={next!} onClick={() => startQuickTest({ w: next! })}>⚡ Kiểm tra tuần {next} →</button>}
        {!d.passed && <button className="btn" data-act="unit" data-u={S.u.id} onClick={() => go('unit', S.u.id)}>Học bài {S.u.title} →</button>}
      </div>
    </Card>
  );
}

function SessionDone({ S }: { S: S }) {
  const { P } = useApp();
  const kd = KINDS.find(([k]) => k === S.kind)!;
  const pct = S.graded ? Math.round((S.ok / S.graded) * 100) : 100;
  const nt = nextTask(P);
  return (
    <Card className="center finish">
      <div className="huge">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <h2>Xong phần {kd[2]}!</h2>
      {S.graded ? <p>Đúng ngay lần đầu: <b>{S.ok}/{S.graded}</b> ({pct}%)</p> : null}
      <p className="xp">+{S.done!.xp} ⭐</p>
      <div className="row gap center">
        <button className="btn ghost" data-act="unit" data-u={S.u.id} onClick={() => go('unit', S.u.id)}>← Về bài {S.u.title}</button>
        {nt && <button className="btn" data-act="start" data-u={nt.u.id} data-k={nt.k[0]} onClick={() => startSession(nt.u.id, nt.k[0])}>Tiếp: {nt.u.emoji} {nt.k[1]} {nt.k[2]} →</button>}
      </div>
    </Card>
  );
}

export function Session() {
  const { S } = useApp();
  if (!S) return null;
  if (S.intro) return <TestIntro S={S} />;
  if (S.done) return S.kind === 'test' ? <TestDone S={S} /> : <SessionDone S={S} />;
  return <SessionRunner S={S} />;
}
