// Nói theo chủ đề: đề hiện ngay theo cấp độ (không chờ AI), từ vựng nên dùng, dàn ý; nói một mạch (im lặng 3 giây thì dừng);
// sửa chữ máy nghe nhầm; chấm MỘT lần bằng AI: điểm 3 tiêu chí, từng câu sai + loại lỗi + giải thích, từ vựng, bài sửa, bài mẫu.
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { SPEAK_TOPICS } from '../data/speakTopics';
import { coachSpeaking, type CoachResult } from '../lib/coach';
import { LEVELS_GEN } from '../lib/gen';
import { loadLex, lookup, wordIpa } from '../lib/lex';
import { levelNow, tallySkill } from '../lib/progress';
import { useRouteNum, useRouteParam } from '../lib/route';
import { hear, micErr, micLive, SR, stopListening } from '../lib/speech';
import { dayKey } from '../lib/util';
import { addXP, app, save, useApp } from '../state/store';
import { AudioButton } from './AudioButton';
import { Dropdown } from './Dropdown';
import { StepProgress } from './Progress';
import { LiveText, MicMeter, Playback } from './MicRecorder';
import { Bar, CoachReport, Ring, Section } from './ui';

interface Assess {
  overall: number; bands: { name: string; band: number; comment_vi: string }[];
  errors: { original: string; corrected: string; type: string; type_vi: string; explain_vi: string }[];
  used_vocab: string[]; missed_vocab: string[]; upgrade_vocab: { w: string; ipa: string; vi: string; replaces: string; example: string }[];
  corrected: string; model: string; strengths_vi: string[]; next_vi: string[];
}
const LV: Record<string, { key: 'e' | 'm' | 'h'; kind: 'easy' | 'mid' | 'hard'; sec: string; words: number }> = {
  A1: { key: 'e', kind: 'easy', sec: '30–45 giây', words: 30 }, A2: { key: 'e', kind: 'easy', sec: '45–60 giây', words: 50 },
  B1: { key: 'm', kind: 'mid', sec: '1–2 phút', words: 100 }, B2: { key: 'h', kind: 'hard', sec: '1,5–2 phút', words: 150 },
  C1: { key: 'h', kind: 'hard', sec: '2 phút', words: 180 }, C2: { key: 'h', kind: 'hard', sec: '2–2,5 phút', words: 200 },
};
const OUTLINE: Record<'easy' | 'mid' | 'hard', string[]> = {
  easy: ['Câu mở: nói thẳng chủ đề (I want to talk about…)', '2–3 câu thông tin: ai, ở đâu, khi nào, làm gì', '1 câu lý do: because…', 'Câu kết: I really like / I think…'],
  mid: ['Mở bài: giới thiệu đối tượng (I would like to describe…)', 'Trả lời lần lượt từng gợi ý, mỗi ý 2–3 câu', 'Kể chi tiết, dùng thì quá khứ khi kể chuyện', 'Kết: giải thích vì sao (The reason why… is that…)'],
  hard: ['Nêu quan điểm rõ ràng (In my opinion… / I would argue that…)', 'Lý do 1 + ví dụ thực tế (For example, in Vietnam…)', 'Lý do 2 / mặt còn lại (On the other hand… / However…)', 'Kết luận cân bằng (Overall… / To sum up…)'],
};
const defaultCefr = (band: string) => { const b = parseFloat(band) || 0; return b < 3.5 ? 'A1' : b < 4.5 ? 'A2' : b < 6 ? 'B1' : b < 7 ? 'B2' : b < 8.5 ? 'C1' : 'C2'; };
const bandColor = (b: number) => (b >= 7 ? 'var(--good)' : b >= 5.5 ? 'var(--pri)' : b >= 4.5 ? '#e0a800' : 'var(--bad)');

export function TopicTalk() {
  const { P } = useApp();
  const [cefr, setCefr] = useRouteParam<string>('lv', defaultCefr(levelNow(P)));
  const [ti, setTi] = useRouteNum('tp', -1);
  const [seed, setSeed] = useRouteNum('d', 0);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<string | null>(null);
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState('');
  const [grading, setGrading] = useState(false);
  const [res, setRes] = useState<Assess | null>(null);
  const [local, setLocal] = useState<CoachResult | null>(null);
  const [, force] = useState(0);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  const L = LV[cefr] || LV.A2;
  // Chọn đề theo cấp độ + chủ đề + số thứ tự (để “Đề khác” và tải lại trang vẫn ra đúng đề)
  const task = useMemo(() => {
    const T = SPEAK_TOPICS[ti >= 0 ? ti : seed % SPEAK_TOPICS.length];
    const list = T[L.kind] as ([string, string] | [string, string, string[]])[];
    const it = list[Math.floor(seed / SPEAK_TOPICS.length) % list.length] || list[0];
    return { T, en: it[0], vi: it[1], points: (it as [string, string, string[]])[2] as string[] | undefined, vocab: T.vocab[L.key] };
  }, [ti, seed, L.kind, L.key]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  function reset() { setText(''); setAudio(null); setSec(0); setRes(null); setLocal(null); setErr(''); }
  async function record() {
    if (busy) { stopListening(); return; }
    reset(); setBusy(true); micLive.reset();
    const t0 = Date.now();
    try {
      const h = await hear({ onText: micLive.setText, onLevel: micLive.setLevel, silenceMs: 3000, maxMs: 180000 });
      setText(h.text); setAudio(h.audio); setSec((Date.now() - t0) / 1000 - 3);
    } catch (e) { setErr(micErr(e)); }
    setBusy(false); micLive.reset();
  }
  async function grade() {
    if (words < 5 || grading) return;
    setGrading(true); setRes(null); setErr('');
    const loc = coachSpeaking(text, sec || words / 1.6);
    try {
      const r = await fetch('/api/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: task.en + (task.points ? ' You should say: ' + task.points.join('; ') : ''), text, cefr, vocab: task.vocab, seconds: sec }) });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error('ai');
      setRes(d);
      tallySkill(app.P, 'speak', d.overall >= parseFloat(app.P.settings.target || '5.5') - 1);
      (app.P.coach || (app.P.coach = [])).unshift({ d: dayKey(), k: 'speak', band: d.overall, words, err: d.errors.length });
      addXP(5 + Math.min(10, Math.floor(words / 20)));
    } catch {
      const lr = await loc; setLocal(lr); save();
      setErr('AI đang bận nên chấm tạm bằng máy chấm cơ bản. Thử “Chấm lại” sau ít phút để có nhận xét chi tiết từng câu.');
    }
    setGrading(false);
  }
  return (
    <>
      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown label="Cấp độ" value={cefr} onChange={(v) => { setCefr(v); reset(); }} grid={3} options={LEVELS_GEN.map(([c, b, l]) => ({ value: c, label: <b>{c}</b>, sub: `${l} · ${b}` }))} />
          <Dropdown label="Chủ đề" value={ti} onChange={(v) => { setTi(v); reset(); }} options={[{ value: -1, icon: '🎲', label: 'Ngẫu nhiên' }, ...SPEAK_TOPICS.map((t, i) => ({ value: i, icon: t.icon, label: t.name }))]} />
          <motion.button whileTap={{ scale: 0.95 }} className="btn ghost sm" onClick={() => { setSeed(seed + 1 + Math.floor(Math.random() * 7)); reset(); }}>🎲 Đề khác</motion.button>
        </div>
        <div className="talk-task">
          <div className="flex items-center gap-2"><span className="chip3">{task.T.icon} {task.T.name}</span><span className="chip3 band">{cefr} · nói {L.sec} · ≥ {L.words} từ</span></div>
          <div className="text-lg font-bold mt-2">{task.en} <AudioButton text={task.en} className="icon xs" /></div>
          <div className="muted">{task.vi}</div>
          {task.points && <><b className="small">You should say:</b><ul className="m-0 pl-5">{task.points.map((p) => <li key={p}>{p}</li>)}</ul></>}
        </div>
        <div className="grid gap-3 md:grid-cols-2 mt-3">
          <div><b className="small">📗 Từ vựng nên dùng</b><div className="vgrid">{task.vocab.map((w) => { const e = lookup(w.split(' ')[0]); return (
            <div key={w} className={`vchip ${res && res.used_vocab.some((u) => u.toLowerCase() === w.toLowerCase()) ? 'used' : ''}`}><b>{w}</b> <AudioButton text={w} className="icon xs" /><span className="muted small">/{wordIpa(w) || ''}/</span><span className="small">{e && e.w === w ? e.vi : ''}</span></div>); })}</div></div>
          <div><b className="small">🧭 Dàn ý gợi ý</b><ol className="small m-0 mt-2 pl-5">{OUTLINE[L.kind].map((o) => <li key={o}>{o}</li>)}</ol></div>
        </div>
        {SR ? <button className="btn big w-full mt-3" onClick={record}>{busy ? '⏹ Nói xong (hoặc im lặng 3 giây)' : text ? '🔁 Nói lại từ đầu' : '🎤 Bắt đầu nói'}</button>
          : <p className="note mt-3">Trình duyệt này không nhận giọng nói (hãy dùng Chrome hoặc Edge). Bạn có thể gõ phần mình định nói vào ô bên dưới để luyện.</p>}
        {busy && <div className="listening"><MicMeter /><LiveText placeholder="Đang nghe… cứ nói liên tục. Im lặng 3 giây là máy dừng." /></div>}
        {(text || !SR) && !busy && (
          <div className="mt-3">
            <div className="flex justify-between small"><b>🗒️ Máy nghe được (sửa nếu máy nghe nhầm)</b><span className={words >= L.words ? 'okc' : 'muted'}>{words}/{L.words} từ{sec > 0 ? ` · ${Math.round(sec)} giây` : ''}</span></div>
            <textarea className="ans mt-1" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bài nói của bạn…" />
            <Bar pct={(words / L.words) * 100} color={words >= L.words ? 'var(--good)' : 'var(--pri)'} h={6} />
            {audio && <Playback src={audio} label="▶️ Nghe lại giọng bạn:" />}
            <button className="btn big glow w-full mt-3" disabled={grading || words < 5} onClick={grade}>{grading ? '⏳ Đang chấm chi tiết… (20–40 giây)' : res || local ? '🔁 Chấm lại' : '🧑‍🏫 Chấm bài'}</button>
            {grading && <div className="mt-2"><StepProgress steps={['Gửi bài nói', 'AI chấm 3 tiêu chí + từng lỗi', 'Tổng hợp bài sửa, bài mẫu']} step={1} note="Bài dài nên có thể mất 20–60 giây" /></div>}
          </div>
        )}
        {err && <p className="note small mt-2">{err}</p>}
      </Section>
      {res && <AssessView r={res} />}
      {!res && local && <CoachReport r={local} title={`Điểm ước tính (máy chấm cơ bản): ${local.band.toFixed(1)}`} />}
    </>
  );
}

function AssessView({ r }: { r: Assess }) {
  const [show, setShow] = useState<'fix' | 'model'>('fix');
  return (
    <>
      <Section className="coach">
        <div className="flex flex-wrap items-center gap-4">
          <Ring pct={(r.overall - 3) / 6} size={104} color={bandColor(r.overall)}><div><div className="text-3xl font-black">{r.overall.toFixed(1)}</div><div className="text-xs text-muted">ước tính</div></div></Ring>
          <div className="flex-1 min-w-[220px] grid gap-2">
            {r.bands.map((b) => (
              <div key={b.name}><div className="flex justify-between text-sm font-bold"><span>{b.name}</span><span style={{ color: bandColor(b.band) }}>{b.band.toFixed(1)}</span></div>
                <Bar pct={((b.band - 3) / 6) * 100} color={bandColor(b.band)} h={7} /><div className="small muted mt-1">{b.comment_vi}</div></div>
            ))}
          </div>
        </div>
        <p className="muted small mt-2">Chấm bởi AI theo mô tả band IELTS (không chấm phát âm vì máy chỉ nhận chữ). Điểm để tham khảo, không thay giám khảo thật.</p>
      </Section>
      <Section>
        <h3 className="m-0">✏️ {r.errors.length} lỗi cần sửa</h3>
        {r.errors.length === 0 ? <p className="okc">Không có lỗi đáng kể 🎉</p> : (
          <div className="err-list">{r.errors.map((e, i) => (
            <motion.div key={i} className="err-item" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <span className="chip3 err-type">{e.type_vi}</span>
              <div className="strike2 badc">{e.original}</div>
              <div className="okc font-bold">→ {e.corrected} <AudioButton text={e.corrected} className="icon xs" /></div>
              <div className="small">💬 {e.explain_vi}</div>
            </motion.div>
          ))}</div>
        )}
      </Section>
      <Section>
        <h3 className="m-0">📗 Từ vựng</h3>
        <div className="small mt-1">✅ Đã dùng: {r.used_vocab.length ? r.used_vocab.join(', ') : <span className="muted">chưa dùng từ gợi ý nào</span>}</div>
        {r.missed_vocab.length > 0 && <div className="small mt-1">⬜ Chưa dùng: {r.missed_vocab.join(', ')}</div>}
        {r.upgrade_vocab.length > 0 && <><b className="small block mt-3">🚀 Nâng cấp từ vựng</b><div className="vgrid">{r.upgrade_vocab.map((v) => (
          <div key={v.w} className="vchip"><span className="small muted">thay cho “{v.replaces}”</span><b>{v.w}</b> <AudioButton text={v.w} className="icon xs" /><span className="muted small">{v.ipa}</span><span className="small">{v.vi}</span><span className="small">“{v.example}”</span></div>))}</div></>}
      </Section>
      <Section>
        <div className="pills"><button className={show === 'fix' ? 'on' : ''} onClick={() => setShow('fix')}>✅ Bài đã sửa</button><button className={show === 'model' ? 'on' : ''} onClick={() => setShow('model')}>⭐ Bài mẫu nâng cấp</button></div>
        <div className="model-text">{show === 'fix' ? r.corrected : r.model} <AudioButton text={show === 'fix' ? r.corrected : r.model} className="icon xs" /></div>
        <div className="grid gap-3 md:grid-cols-2 mt-3">
          <div><b className="small okc">💪 Điểm mạnh</b><ul className="small m-0 pl-5">{r.strengths_vi.map((s) => <li key={s}>{s}</li>)}</ul></div>
          <div><b className="small">🎯 Luyện tiếp</b><ul className="small m-0 pl-5">{r.next_vi.map((s) => <li key={s}>{s}</li>)}</ul></div>
        </div>
      </Section>
    </>
  );
}
