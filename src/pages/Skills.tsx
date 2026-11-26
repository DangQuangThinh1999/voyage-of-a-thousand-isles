import { useEffect, useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { TapText } from '../components/TapText';
import { Bar, Pills, Section } from '../components/ui';
import { LEVELS, UNITS, type Pair, type Question } from '../data';
import { tallySkill, type Progress } from '../lib/progress';
import { speak, stopSpeaking } from '../lib/speech';
import { norm } from '../lib/text';
import { addXP, app, go, save, tab as goTab, useApp } from '../state/store';

export const SKILLS: [key: string, icon: string, name: string, color: string][] = [
  ['listen', '🎧', 'Nghe', '#38bdf8'], ['read', '📖', 'Đọc', '#a78bfa'], ['write', '✍️', 'Viết', '#f472b6'], ['speak', '🗣️', 'Nói', '#34d399'], ['grammar', '📐', 'Ngữ pháp', '#fbbf24'],
];
/** Độ chính xác từng kỹ năng (0..1) và số lượt */
export function skillStats(P: Progress) {
  return SKILLS.map(([k, ic, name, color]) => { const [ok, n] = (P.sk || {})[k] || [0, 0]; return { k, ic, name, color, ok, n, acc: n ? ok / n : 0 }; });
}

/** Bộ đọc hiểu: đoạn văn chạm-tra-từ, câu hỏi có giải thích câu chứa đáp án */
function ReadingTutor({ text, questions }: { text: Pair[]; questions: Question[] }) {
  const [vi, setVi] = useState(false);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const evidence = (q: Question) => {
    const keys = norm(q[0] + ' ' + q[2][q[3]]).split(' ').filter((w) => w.length > 3);
    let best = 0, bi = 0;
    text.forEach(([en], i) => { const s = norm(en); const c = keys.filter((k) => s.includes(k)).length; if (c > best) { best = c; bi = i; } });
    return text[bi];
  };
  return (
    <>
      <Section>
        <div className="flex items-center justify-between"><b>📖 Đoạn văn</b><label className="small"><input type="checkbox" checked={vi} onChange={(e) => setVi(e.target.checked)} /> Hiện dịch</label></div>
        <p className="muted small">Chạm vào từ bất kỳ để xem nghĩa, từ loại và phiên âm. Bấm 🔊 để nghe từng câu.</p>
        {text.map(([en, v], i) => (
          <div key={i} className="rline"><AudioButton text={en} className="icon xs" /><div><TapText text={en} />{vi && <div className="muted small">{v}</div>}</div></div>
        ))}
      </Section>
      <Section>
        <b>❓ Câu hỏi</b>
        {questions.map((q, qi) => {
          const p = picks[qi], ans = p !== undefined;
          return (
            <div key={qi} className="mt-3">
              <div className="font-bold">{qi + 1}. {q[0]}</div><div className="muted small">{q[1]}</div>
              <div className="opts">{q[2].map((o, i) => (
                <button key={o} disabled={ans} className={`opt ${ans ? (i === q[3] ? 'right' : i === p ? 'wrong' : 'dim') : ''}`}
                  onClick={() => { setPicks({ ...picks, [qi]: i }); tallySkill(app.P, 'read', i === q[3]); if (i === q[3]) addXP(1); else save(); }}>{o}</button>
              ))}</div>
              {ans && <p className="fixed small">🔎 <b>Câu chứa đáp án:</b> “{evidence(q)[0]}”<br /><span className="muted">{evidence(q)[1]}</span></p>}
            </div>
          );
        })}
      </Section>
    </>
  );
}

/** Trình phát bài nghe: câu đang đọc sáng lên, phát lại từng câu, tốc độ, ẩn/hiện chữ, điền từ, câu hỏi */
function ListeningTutor({ script, questions, gaps }: { script: Pair[]; questions: Question[]; gaps: [string, string, string][] }) {
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [hide, setHide] = useState(true);
  const [slow, setSlow] = useState(false);
  const [gapIn, setGapIn] = useState<Record<number, string>>({});
  const [gapOk, setGapOk] = useState<Record<number, boolean>>({});
  const [picks, setPicks] = useState<Record<number, number>>({});
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; stopSpeaking(); }, []);
  async function playAll(from = 0) {
    stop.current = false; setPlaying(true);
    for (let i = from; i < script.length && !stop.current; i++) { setCur(i); await speak(script[i][0], slow); }
    setPlaying(false); if (!stop.current) setCur(-1);
  }
  const pause = () => { stop.current = true; stopSpeaking(); setPlaying(false); };
  return (
    <>
      <Section className="player">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => (playing ? pause() : playAll(Math.max(0, cur)))}>{playing ? '⏸ Dừng' : '▶️ Nghe cả bài'}</button>
          <button className={slow ? 'btn sm' : 'btn ghost sm'} onClick={() => setSlow(!slow)}>{slow ? '🐢 Chậm' : '⚡ Bình thường'}</button>
          <button className="btn ghost sm" onClick={() => setHide(!hide)}>{hide ? '👁 Hiện chữ' : '🙈 Ẩn chữ'}</button>
          <span className="muted small">Nghe trước khi xem chữ. Bấm vào một câu để nghe lại câu đó.</span>
        </div>
        <div className="wave">{Array.from({ length: 72 }, (_, k) => { const li = Math.floor((k * script.length) / 72); return <i key={k} className={li < cur ? 'done' : li === cur ? 'on' : ''} style={{ height: 6 + ((k * 53) % 31) }} />; })}</div>
        <div className="lines">
          {script.map(([en, v], i) => (
            <button key={i} className={`line ${i === cur ? 'on' : ''}`} onClick={() => { pause(); setCur(i); speak(en, slow); }}>
              <span className="dot" />
              <span className="flex-1 text-left">{hide && i !== cur ? <span className="blur">{en}</span> : <>{en}{!hide && <span className="muted small block">{v}</span>}</>}</span>
            </button>
          ))}
        </div>
      </Section>
      {gaps.length > 0 && (
        <Section>
          <b>✍️ Nghe và điền từ còn thiếu</b>
          {gaps.map(([s, a, v], i) => (
            <div key={i} className="mt-2">
              <div>{s.replace('____', '_____')} <AudioButton text={s.replace('____', a.split('|')[0])} className="icon xs" /></div>
              <div className="muted small">{v}</div>
              <div className="flex gap-2 mt-1">
                <input className="ans" placeholder="Từ còn thiếu…" value={gapIn[i] || ''} disabled={gapOk[i] !== undefined} onChange={(e) => setGapIn({ ...gapIn, [i]: e.target.value })} />
                {gapOk[i] === undefined && <button className="btn sm" onClick={() => { const ok = a.split('|').some((x) => norm(x) === norm(gapIn[i] || '')); setGapOk({ ...gapOk, [i]: ok }); tallySkill(app.P, 'listen', ok); if (ok) addXP(1); else save(); }}>Kiểm tra</button>}
              </div>
              {gapOk[i] !== undefined && <p className={gapOk[i] ? 'okc' : 'badc'}>{gapOk[i] ? '✅ Đúng' : `❌ Đáp án: ${a.split('|').join(' / ')}`}</p>}
            </div>
          ))}
        </Section>
      )}
      <Section>
        <b>❓ Câu hỏi bài nghe</b>
        {questions.map((q, qi) => {
          const p = picks[qi], ans = p !== undefined;
          return (
            <div key={qi} className="mt-3">
              <div className="font-bold">{qi + 1}. {q[0]}</div>
              <div className="opts">{q[2].map((o, i) => (
                <button key={o} disabled={ans} className={`opt ${ans ? (i === q[3] ? 'right' : i === p ? 'wrong' : 'dim') : ''}`}
                  onClick={() => { setPicks({ ...picks, [qi]: i }); tallySkill(app.P, 'listen', i === q[3]); if (i === q[3]) addXP(1); else save(); }}>{o}</button>
              ))}</div>
              {ans && <p className="muted small">{q[1]}</p>}
            </div>
          );
        })}
      </Section>
    </>
  );
}

/** Bài đọc / nghe theo cấp: A1 (bài học tuần 1–4) + A2 → C2 */
const SETS = () => [
  ...UNITS.map((u) => ({ id: u.id, label: `A1 · ${u.emoji} ${u.title}`, read: { text: u.reading, questions: u.questions }, listen: { script: u.reading, questions: u.questions, gaps: [] as [string, string, string][] } })),
  ...LEVELS.map((L) => ({ id: L.id, label: `${L.cefr} · IELTS ${L.band} · ${L.reading.title}`, read: { text: L.reading.text, questions: L.reading.questions }, listen: { script: L.listening.script, questions: L.listening.questions, gaps: L.listening.gaps } })),
];

/** Tab Kỹ năng: kỹ năng yếu + luyện Đọc + luyện Nghe */
export function Skills() {
  const { P } = useApp();
  const [tab, setTab] = useState<'weak' | 'read' | 'listen'>('weak');
  const sets = SETS();
  const [si, setSi] = useState(0);
  const st = skillStats(P), tried = st.filter((s) => s.n >= 5).sort((a, b) => a.acc - b.acc), weak = tried[0];
  const ACTION: Record<string, [string, () => void]> = {
    listen: ['Luyện nghe ngay', () => setTab('listen')], read: ['Luyện đọc ngay', () => setTab('read')],
    write: ['Viết bài có chấm', () => goTab('journal')], speak: ['Luyện nói IELTS', () => goTab('speak')], grammar: ['Học ngữ pháp', () => goTab('grammar')],
  };
  return (
    <>
      <h2>🎯 Kỹ năng</h2>
      <Pills id="skills" value={tab} onChange={setTab} items={[['weak', '📊 Kỹ năng yếu'], ['read', '📖 Đọc hiểu'], ['listen', '🎧 Nghe hiểu']]} />
      {tab === 'weak' && (
        <>
          <Section>
            <h3 className="m-0">Độ chính xác từng kỹ năng</h3>
            <p className="muted small">Tính từ mọi bài học, từ mới, bài kiểm tra và bài luyện. Kỹ năng thấp nhất là chỗ cần luyện thêm để đạt IELTS {P.settings.target}.</p>
            <div className="grid gap-3 mt-2">
              {st.map((s) => (
                <div key={s.k}>
                  <div className="flex justify-between text-sm font-bold"><span>{s.ic} {s.name}</span><span>{s.n ? `${Math.round(s.acc * 100)}% · ${s.ok}/${s.n}` : 'chưa có dữ liệu'}</span></div>
                  <Bar pct={s.acc * 100} color={s.color} />
                </div>
              ))}
            </div>
          </Section>
          {weak ? (
            <Section className="weakc">
              <h3 className="m-0">🔧 Cần cải thiện: {weak.ic} {weak.name} ({Math.round(weak.acc * 100)}%)</h3>
              <ul>
                {weak.k === 'listen' && <><li>Nghe cả bài với chữ ẩn, rồi mới bật chữ để so.</li><li>Nghe từng câu, chép lại (điền từ) rồi kiểm tra.</li><li>Học phiên âm của từ hay nghe nhầm.</li></>}
                {weak.k === 'read' && <><li>Đọc lướt câu hỏi trước, tìm từ khóa trong đoạn.</li><li>Chạm vào từ lạ để tra, ghi nhớ từ vào thẻ ôn.</li><li>Xem “câu chứa đáp án” sau mỗi câu để hiểu vì sao.</li></>}
                {weak.k === 'write' && <><li>Viết mỗi ngày 5–10 câu ở Nhật ký, bấm Chấm bài.</li><li>Học lại lỗi hay sai: chia động từ, a/an/the, số nhiều.</li><li>Dùng thêm từ nối: because, however, for example.</li></>}
                {weak.k === 'speak' && <><li>Nói theo mẫu câu giao tiếp mỗi ngày (shadowing).</li><li>Trả lời IELTS Part 1 dài 2–3 câu, có lý do và ví dụ.</li><li>Ghi âm, nghe lại giọng mình và sửa từ đỏ.</li></>}
                {weak.k === 'grammar' && <><li>Học 1 bài trong Thư viện ngữ pháp mỗi ngày.</li><li>Dùng Phân tích câu để kiểm tra câu bạn viết.</li><li>Luyện Từ loại: đoán loại từ và chọn dạng đúng.</li></>}
              </ul>
              <button className="btn" onClick={ACTION[weak.k][1]}>{ACTION[weak.k][0]} →</button>
            </Section>
          ) : <Section><p className="muted">Làm thêm vài bài (mỗi kỹ năng ít nhất 5 câu) để app biết kỹ năng nào yếu nhất.</p><button className="btn" onClick={() => go('home')}>Học tiếp →</button></Section>}
        </>
      )}
      {tab !== 'weak' && (
        <>
          <Section>
            <label className="small">Chọn bài theo trình độ:</label>
            <select value={si} onChange={(e) => setSi(+e.target.value)}>{sets.map((s, i) => <option key={s.id} value={i}>{s.label}</option>)}</select>
          </Section>
          {tab === 'read' ? <ReadingTutor key={'r' + si} {...sets[si].read} /> : <ListeningTutor key={'l' + si} {...sets[si].listen} />}
        </>
      )}
    </>
  );
}

