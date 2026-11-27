import { aiFetch } from '../lib/ai';
import { useEffect, useState } from 'react';
import { useRouteNum, useRouteParam } from '../lib/route';
import { Dropdown } from '../components/Dropdown';
import { AudioButton, SayBoth } from '../components/AudioButton';
import { Ipa } from '../components/Ipa';
import { ListenBack, LiveText, MicMeter, SpeakCheck } from '../components/MicRecorder';
import { TapText } from '../components/TapText';
import { CoachReport, Pills, Section } from '../components/ui';
import { GenBar } from '../components/GenBar';
import { TopicTalk } from '../components/TopicTalk';
import type { GenItem } from '../lib/gen';
import { LEVELS, type Pair } from '../data';
import { BASIC_PART1, SITUATIONS } from '../data/speak';
import { coachSpeaking, type CoachResult } from '../lib/coach';
import { tallySkill } from '../lib/progress';
import { applyFixes } from '../lib/sentence';
import { hear, micErr, micLive, speak, SR, stopListening } from '../lib/speech';
import { dayKey, pick1 } from '../lib/util';
import { addXP, app } from '../state/store';

/** Nói theo một câu mẫu, chấm phát âm từng từ */
function Shadow({ s }: { s: Pair }) {
  return (
    <div className="phrase">
      <div className="flex items-start gap-2">
        <div className="flex-1"><b><TapText text={s[0]} /></b><Ipa text={s[0]} /><div className="muted small">{s[1]}</div></div>
        <SayBoth text={s[0]} />
      </div>
      <SpeakCheck text={s[0]} label="🎤 Nói theo" silenceMs={2000} maxMs={30000} />
    </div>
  );
}

function Phrases() {
  const [k, setK] = useRouteNum('k', 0);
  return (
    <>
      <div className="chips">{SITUATIONS.map(([ic, t], i) => <button key={t} className={i === k ? 'chip on' : 'chip'} onClick={() => setK(i)}>{ic} {t}</button>)}</div>
      <Section>
        <h3 className="m-0">{SITUATIONS[k][0]} {SITUATIONS[k][1]}</h3>
        <p className="muted small">Nghe 🔊 → nói theo 🎤 → máy tô xanh từ đúng, đỏ từ cần đọc lại. Chạm vào từng từ để xem nghĩa. Mỗi câu nói đạt 80% được +1 ⭐.</p>
        <div className="grid gap-3 mt-2">{SITUATIONS[k][2].map((s) => <Shadow key={s[0]} s={s} />)}</div>
      </Section>
    </>
  );
}

type Part = '1' | '2' | '3';
interface Talk { echo: boolean; reply: string; feedback_vi: string; better: string; better_vi: string; errors: { wrong: string; right: string; why: string }[] }
/** Người học chỉ đọc lại câu hỏi? (≥70% từ của câu trả lời nằm trong câu hỏi) */
function isEcho(q: string, a: string) {
  const w = (s: string) => s.toLowerCase().replace(/what's/g, 'what is').replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  const Q = new Set(w(q)), A = w(a);
  return A.length > 0 && A.filter((x) => Q.has(x)).length / A.length >= 0.7;
}
/** Hỏi giám khảo AI (Gemini). Không có mạng / chưa cài khóa → null */
async function askExaminer(question: string, answer: string, cefr: string, part: string): Promise<Talk | null> {
  if (!answer.trim()) return null;
  try {
    const r = await aiFetch('/api/talk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, answer, cefr, part }) });
    const d = await r.json(); return r.ok && d.reply ? d : null;
  } catch { return null; }
}
function questionsFor(part: Part, lv: number): { q: string; vi: string; points?: string[] }[] {
  if (lv === 0) return part === '1' ? BASIC_PART1.map(([q, vi]) => ({ q, vi })) : questionsFor(part, 1);
  const L = LEVELS[lv - 1];
  if (part === '1') return L.speaking.part1.map(([q, vi]) => ({ q, vi }));
  if (part === '2') return [{ q: L.speaking.part2.cue, vi: L.speaking.part2.vi, points: L.speaking.part2.points }];
  return L.speaking.part3.map(([q, vi]) => ({ q, vi }));
}
const TIPS: Record<Part, string> = {
  '1': 'Part 1: trả lời 2–3 câu. Trả lời thẳng → giải thích lý do (because…) → thêm ví dụ.',
  '2': 'Part 2: chuẩn bị 1 phút, nói 1–2 phút theo các gợi ý. Dùng thì quá khứ khi kể chuyện.',
  '3': 'Part 3: nêu quan điểm → lý do → ví dụ → so sánh hai mặt (on the other hand…).',
};

/** Luyện nói IELTS: trả lời tự do, máy chấm 3 tiêu chí + sửa lỗi */
function IeltsSpeaking() {
  const [part, setPart] = useRouteParam<Part>('p', '1');
  const [lv, setLv] = useRouteNum('lv', 0);
  const [qi, setQi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState<{ text: string; audio: string | null; sec: number } | null>(null);
  const [rep, setRep] = useState<CoachResult | null>(null);
  const [err, setErr] = useState('');
  const [ai, setAi] = useState<GenItem | null>(null);
  const aiQs = ai ? (part === '1' ? ai.data.part1.map((x: { en: string; vi: string }) => ({ q: x.en, vi: x.vi })) : part === '2' ? [{ q: ai.data.part2.cue, vi: ai.data.part2.vi, points: ai.data.part2.points }] : ai.data.part3.map((x: { en: string; vi: string }) => ({ q: x.en, vi: x.vi }))) : null;
  const qs = aiQs && aiQs.length ? aiQs : questionsFor(part, lv), q = qs[qi % qs.length];
  const [talk, setTalk] = useState<Talk | null>(null);
  const [talkBusy, setTalkBusy] = useState(false);
  const cefr = ai ? ai.cefr : lv === 0 ? 'A1' : LEVELS[lv - 1].cefr;
  function reset() { setSay(null); setRep(null); setErr(''); setTalk(null); }
  // Giám khảo đọc câu hỏi khi chuyển câu
  useEffect(() => { const t = setTimeout(() => speak(q.q), 400); return () => clearTimeout(t); }, [q.q]);
  const next = () => { setQi(qi + 1); reset(); };
  async function record() {
    if (busy) { stopListening(); return; }
    reset(); setBusy(true); micLive.reset();
    const t0 = Date.now();
    try {
      const h = await hear({ onText: micLive.setText, onLevel: micLive.setLevel, silenceMs: part === '2' ? 5000 : 3500, maxMs: part === '2' ? 130000 : 60000 });
      const sec = (Date.now() - t0) / 1000;
      setSay({ text: h.text, audio: h.audio, sec });
      const echo = isEcho(q.q, h.text);
      setTalkBusy(true);
      const [r, tk] = await Promise.all([coachSpeaking(h.text, sec), askExaminer(q.q, h.text, cefr, part)]);
      setRep(r); setTalkBusy(false);
      const t2: Talk = tk || (echo ? { echo: true, reply: 'You just repeated my question. Please answer it in your own words.', feedback_vi: 'Bạn đang đọc lại câu hỏi. Hãy trả lời bằng câu của bạn, ví dụ bắt đầu bằng “My name is…” hoặc “I think…”.', better: '', better_vi: '', errors: [] } : null as unknown as Talk);
      if (t2) { setTalk(t2); speak(t2.reply); }
      tallySkill(app.P, 'speak', r.band >= parseFloat(app.P.settings.target || '5.5') - 1);
      (app.P.coach || (app.P.coach = [])).unshift({ d: dayKey(), k: 'speak', band: r.band, words: r.words, err: r.issues.length });
      addXP(3);
    } catch (e) { setErr(micErr(e)); }
    setBusy(false); micLive.reset();
  }
  return (
    <>
      <GenBar kind="speaking" onItem={(it) => { setAi(it); setQi(0); reset(); }} />
      {ai && <Section><div className="flex justify-between"><b>✨ Bộ câu hỏi AI: {ai.title}</b><button className="btn ghost sm" onClick={() => setAi(null)}>← Câu có sẵn</button></div>
        {ai.data.sample && <p className="fixbox small mt-2">🗣️ <b>Trả lời mẫu (Part 1):</b> {ai.data.sample} <AudioButton text={ai.data.sample} className="icon xs" /></p>}
        {ai.data.useful?.length > 0 && <div className="vgrid mt-2">{ai.data.useful.map((u: { en: string; vi: string }) => <div key={u.en} className="vchip"><b>{u.en}</b> <AudioButton text={u.en} className="icon xs" /><span className="small muted">{u.vi}</span></div>)}</div>}
      </Section>}
      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <Pills id="part" value={part} onChange={(p) => { setPart(p); setQi(0); reset(); }} items={[['1', 'Part 1'], ['2', 'Part 2'], ['3', 'Part 3']]} />
          <Dropdown label="Cấp độ" value={lv} onChange={(v) => { setLv(v); setQi(0); reset(); }}
            options={[{ value: 0, icon: '🌱', label: 'Cơ bản', sub: 'A1' }, ...LEVELS.map((L, i) => ({ value: i + 1, icon: L.emoji, label: `${L.cefr} · IELTS ${L.band}`, sub: L.vi }))]} />
          <button className="btn ghost sm" onClick={() => { setQi(qi + 1 + Math.floor(Math.random() * 2)); reset(); }}>🔀 Câu khác</button>
        </div>
        <div className="qcard">
          <div className="text-lg font-bold"><TapText text={q.q} /> <AudioButton text={q.q} /></div>
          <Ipa text={q.q} />
          <details><summary className="muted small">Xem nghĩa tiếng Việt</summary><p className="muted">{q.vi}</p></details>
          {q.points && <ul className="m-0 pl-5">{q.points.map((p: string) => <li key={p}>{p}</li>)}</ul>}
          <p className="tip small">💡 {TIPS[part]}</p>
        </div>
        {SR ? <button className={busy ? 'btn big w-full' : 'btn big w-full'} onClick={record}>{busy ? '⏹ Nói xong (bấm để dừng)' : '🎤 Bắt đầu trả lời'}</button>
          : <p className="note">Luyện nói cần trình duyệt Chrome hoặc Edge (có nhận giọng nói).</p>}
        {busy && <div className="listening"><MicMeter /><LiveText placeholder="Đang nghe… cứ nói tự nhiên, im lặng vài giây là máy dừng." /></div>}
        {err && <p className="note">{err}</p>}
      </Section>
      {(talk || talkBusy) && (
        <Section className="examiner">
          <div className="flex items-center gap-3"><span className="ex-av">🧑‍🏫</span><b>Giám khảo nói</b>{talk && <AudioButton text={talk.reply} className="icon xs" />}</div>
          {talkBusy && !talk ? <><div className="shimmer" /><p className="muted small">Giám khảo đang nghe và trả lời…</p></> : talk && <>
            <p className="ex-say">“{talk.reply}”</p>
            {talk.echo && <p className="note">⚠️ Bạn đang <b>đọc lại câu hỏi</b>, chưa trả lời. Hãy trả lời bằng câu của bạn rồi bấm <b>🔁 Nói lại</b>.</p>}
            <p>💬 {talk.feedback_vi}</p>
            {talk.errors.length > 0 && <ul className="checks">{talk.errors.map((e, i) => <li key={i}><b className="badc strike2">{e.wrong}</b> → <b className="okc">{e.right}</b><div className="muted small">{e.why}</div></li>)}</ul>}
            {talk.better && <div className="mt-2"><b>✨ Câu trả lời tốt hơn (dựa trên ý của bạn) — nghe rồi nói theo:</b><Shadow s={[talk.better, talk.better_vi]} /></div>}
          </>}
          <div className="row gap mt-3"><button className="btn" onClick={() => { reset(); record(); }}>🔁 Nói lại câu này</button><button className="btn ghost" onClick={next}>➡️ Câu tiếp</button></div>
        </Section>
      )}
      {say && (
        <Section>
          <h3 className="m-0">🗒️ Máy nghe được</h3>
          <p>{say.text || <span className="muted">(không nghe được gì)</span>}</p>
          {rep && rep.issues.length > 0 && <div className="fixbox"><b>Câu đã sửa:</b> {applyFixes(say.text[0]?.toUpperCase() + say.text.slice(1) + (/[.!?]$/.test(say.text) ? '' : '.'), rep.issues)}</div>}
          <ListenBack audio={say.audio} maxMs={120000} />
          <p className="muted small">Máy chỉ nghe ra chữ, chưa chấm được ngữ điệu và trọng âm. Luyện phát âm từng câu ở phần “Mẫu câu giao tiếp”.</p>
        </Section>
      )}
      {rep && <CoachReport r={rep} title={`Điểm Speaking ước tính: ${rep.band.toFixed(1)}`} />}
    </>
  );
}

/** Tab Giao tiếp: mẫu câu theo tình huống + luyện nói IELTS có chấm */
export function Speak() {
  const [tab, setTab] = useRouteParam<'talk' | 'phrases' | 'ielts'>('t', 'talk');
  return (
    <>
      <div className="pagehead">
        <h2>🗣️ Giao tiếp & Speaking</h2>
        <Pills id="speak" value={tab} onChange={setTab} items={[['talk', '🎤 Nói theo chủ đề'], ['phrases', '💬 Mẫu câu giao tiếp'], ['ielts', '🧑‍🏫 Hỏi đáp với giám khảo']]} />
      </div>
      {tab === 'talk' ? <TopicTalk /> : tab === 'phrases' ? <Phrases /> : <IeltsSpeaking />}
    </>
  );
}
export const randomPhrase = () => pick1(SITUATIONS.flatMap((s) => s[2]));
