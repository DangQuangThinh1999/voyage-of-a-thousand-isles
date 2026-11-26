// Tab Phát âm (IPA): bảng 44 âm, cặp âm dễ nhầm, đọc phiên âm, trọng âm, từ đồng âm, cụm phụ âm.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import pronUrl from '../../data/pronunciation.json?url';
import { AudioButton } from '../components/AudioButton';
import { LiveText, MicMeter } from '../components/MicRecorder';
import { Pills, Section } from '../components/ui';
import { WordsHit } from '../components/WordsHit';
import { dictWords, loadLex, lookup, wordIpa } from '../lib/lex';
import { tallySkill } from '../lib/progress';
import { useRouteParam } from '../lib/route';
import { hear, micErr, micLive, speak, SR, stopListening } from '../lib/speech';
import { scoreSpeech, type SpeechScore } from '../lib/text';
import { pick1, shuffle } from '../lib/util';
import { addXP, app, save } from '../state/store';

interface Sound { ipa: string; type: string; name_vi: string; examples: [string, string][]; how_vi: string; mistake_vi: string; vi_like: string }
interface Pron {
  sounds: Sound[]; homophones: { words: [string, string, string][]; cloze: [string, string][]; note_vi: string }[];
  minimal_pairs: { a: [string, string, string]; b: [string, string, string]; contrast: [string, string]; tip_vi: string }[];
  consonant_clusters: { word: string; ipa: string; tip_vi: string }[];
}
let PRON: Pron | null = null;
function usePron() {
  const [d, setD] = useState<Pron | null>(PRON);
  useEffect(() => { if (!PRON) fetch(pronUrl).then((r) => r.json()).then((x) => { PRON = x; setD(x); }); loadLex(); }, []);
  return d;
}
const GROUPS: [string, string][] = [['vowel-short', '🔹 Nguyên âm ngắn'], ['vowel-long', '🔷 Nguyên âm dài'], ['diphthong', '🔀 Nguyên âm đôi'], ['consonant-voiceless', '🤫 Phụ âm vô thanh (không rung cổ)'], ['consonant-voiced', '🗣️ Phụ âm hữu thanh (rung cổ)']];

/** Đọc một từ / câu và chấm từng từ */
function SayIt({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<SpeechScore | { err: string } | null>(null);
  if (!SR) return null;
  return (
    <span className="sayit">
      <button className={busy ? 'btn sm' : 'btn ghost sm'} onClick={async () => {
        if (busy) { stopListening(); return; }
        setBusy(true); setR(null); micLive.reset();
        try { const h = await hear({ onText: micLive.setText, onLevel: micLive.setLevel, silenceMs: 1500, maxMs: 8000 }); const s = scoreSpeech(text, h.alts); setR(s); tallySkill(app.P, 'speak', s.score >= 0.8); if (s.score >= 0.8) addXP(1); else save(); }
        catch (e) { setR({ err: micErr(e) }); }
        setBusy(false); micLive.reset();
      }}>{busy ? '⏹' : '🎤 Đọc thử'}</button>
      {busy && <span className="inline-flex items-center gap-2"><MicMeter /><LiveText placeholder="Đang nghe…" /></span>}
      {r && ('err' in r ? <span className="note small">{r.err}</span> : <span className="small"><WordsHit T={r.T} hit={r.hit} /> <b className={r.score >= 0.8 ? 'okc' : 'badc'}>{Math.round(r.score * 100)}%</b></span>)}
    </span>
  );
}

function Chart({ d }: { d: Pron }) {
  const [sel, setSel] = useState<Sound | null>(null);
  return (
    <>
      <Section>
        <h3 className="m-0">🔤 Bảng 44 âm IPA (giọng Anh chuẩn)</h3>
        <p className="muted small">Bấm vào một âm để xem cách đặt lưỡi, môi, lỗi người Việt hay mắc và nghe ví dụ. Học bảng này giúp bạn đọc được phiên âm của mọi từ trong app.</p>
        {GROUPS.map(([t, name]) => (
          <div key={t} className="mt-3"><b className="small">{name}</b>
            <div className="ipa-grid">{d.sounds.filter((s) => s.type === t).map((s) => (
              <motion.button key={s.ipa} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className={`ipa-tile ${sel === s ? 'on' : ''} t-${t}`} onClick={() => { setSel(s); speak(s.examples[0][0]); }}>
                <b>/{s.ipa}/</b><small>{s.examples[0][0]}</small>
              </motion.button>))}</div>
          </div>
        ))}
      </Section>
      <AnimatePresence>
        {sel && (
          <motion.div key={sel.ipa} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card ipa-detail">
            <div className="flex items-center gap-4"><div className="ipa-big">/{sel.ipa}/</div><div><b className="text-lg">{sel.name_vi}</b><div className="muted small">{sel.vi_like}</div></div></div>
            <div className="vsec"><h4>👄 Cách phát âm</h4><p className="m-0">{sel.how_vi}</p></div>
            <div className="vsec"><h4>⚠️ Người Việt hay sai</h4><p className="m-0">{sel.mistake_vi}</p></div>
            <div className="vsec"><h4>🔊 Ví dụ: nghe rồi đọc thử</h4>
              {sel.examples.map(([w, ipa]) => <div key={w} className="ex-row"><b>{w}</b> <span className="ipa inline">{ipa.replace(new RegExp(sel.ipa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (m) => `【${m}】`)}</span> <AudioButton text={w} className="icon xs" /> <AudioButton text={w} slow label="🐢" className="icon xs" /> <SayIt text={w} /></div>)}
              <p className="muted small m-0">【 】 là vị trí của âm /{sel.ipa}/ trong từ.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Pairs({ d }: { d: Pron }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * d.minimal_pairs.length));
  const [which, setWhich] = useState<'a' | 'b'>(() => (Math.random() < 0.5 ? 'a' : 'b'));
  const [pick, setPick] = useState<'a' | 'b' | null>(null);
  const [sc, setSc] = useState([0, 0]);
  const P = d.minimal_pairs[i % d.minimal_pairs.length], target = P[which];
  useEffect(() => { const t = setTimeout(() => speak(target[0]), 300); return () => clearTimeout(t); }, [i, which]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { setI(Math.floor(Math.random() * d.minimal_pairs.length)); setWhich(Math.random() < 0.5 ? 'a' : 'b'); setPick(null); };
  return (
    <Section>
      <div className="flex justify-between"><h3 className="m-0">👂 Nghe và chọn từ đúng</h3><span className="muted small">Đúng {sc[0]}/{sc[1]}</span></div>
      <p className="muted small">Hai từ chỉ khác nhau một âm: /{P.contrast[0]}/ và /{P.contrast[1]}/. Nghe kỹ rồi chọn.</p>
      <div className="row gap center my-3"><button className="btn big" onClick={() => speak(target[0])}>🔊 Nghe lại</button><button className="btn ghost big" onClick={() => speak(target[0], true)}>🐢 Chậm</button></div>
      <div className="opts grid2">
        {(['a', 'b'] as const).map((k) => {
          const w = P[k], cls = pick === null ? '' : k === which ? 'right' : k === pick ? 'wrong' : 'dim';
          return <button key={k} className={`opt ${cls}`} disabled={pick !== null} onClick={() => { setPick(k); setSc([sc[0] + (k === which ? 1 : 0), sc[1] + 1]); tallySkill(app.P, 'listen', k === which); save(); }}>
            <span className="flex-1"><b className="text-lg">{w[0]}</b>{pick !== null && <><span className="ipa inline"> {w[1]}</span><div className="muted small">{w[2]}</div></>}</span></button>;
        })}
      </div>
      {pick !== null && (
        <div className={`qexp ${pick === which ? 'ok' : 'bad'}`}>
          <div className="qexp-h">{pick === which ? '✅ Nghe đúng rồi!' : `❌ Máy đọc “${target[0]}”`}</div>
          <div>💡 {P.tip_vi}</div>
          <div className="flex flex-wrap gap-3">{(['a', 'b'] as const).map((k) => <span key={k}><b>{P[k][0]}</b> <span className="ipa inline">{P[k][1]}</span> <AudioButton text={P[k][0]} className="icon xs" /> <SayIt text={P[k][0]} /></span>)}</div>
          <button className="btn big mt-2" onClick={next}>Cặp tiếp →</button>
        </div>
      )}
    </Section>
  );
}

/** Đọc phiên âm: nhìn IPA chọn từ / nhìn từ chọn IPA */
function ReadIpa() {
  const [mode, setMode] = useState<'ipa2w' | 'w2ipa'>('ipa2w');
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [sc, setSc] = useState([0, 0]);
  const [ready, setReady] = useState(false);
  useEffect(() => { loadLex().then(() => setReady(true)); }, []);
  const q = useMemo(() => {
    if (!ready) return null;
    const pool = dictWords().slice(0, 3000).filter((w) => /^[a-z]{3,10}$/.test(w) && wordIpa(w));
    const w = pick1(pool), others = shuffle(pool.filter((x) => x !== w && Math.abs(x.length - w.length) <= 2)).slice(0, 3);
    const opts = shuffle([w, ...others]);
    return { w, opts, ans: opts.indexOf(w) };
  }, [n, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return <Section><p className="muted">Đang tải…</p></Section>;
  const e = lookup(q.w);
  return (
    <Section>
      <Pills id="readipa" value={mode} onChange={(m) => { setMode(m); setN(n + 1); setPick(null); }} items={[['ipa2w', '📖 Nhìn phiên âm → chọn từ'], ['w2ipa', '🔤 Nhìn từ → chọn phiên âm']]} />
      <div className="flex justify-between"><span className="muted small">Từ trong 3.000 từ thông dụng</span><span className="muted small">Đúng {sc[0]}/{sc[1]}</span></div>
      <div className="ipa-q">{mode === 'ipa2w' ? <span className="ipa-big">/{wordIpa(q.w)}/</span> : <span className="en">{q.w}</span>}</div>
      <div className="opts grid2">{q.opts.map((o, i) => {
        const cls = pick === null ? '' : i === q.ans ? 'right' : i === pick ? 'wrong' : 'dim';
        return <button key={o} className={`opt ${cls}`} disabled={pick !== null} onClick={() => { setPick(i); speak(q.w); setSc([sc[0] + (i === q.ans ? 1 : 0), sc[1] + 1]); tallySkill(app.P, 'read', i === q.ans); save(); }}>
          {mode === 'ipa2w' ? <b>{o}</b> : <span className="ipa inline">/{wordIpa(o)}/</span>}</button>;
      })}</div>
      {pick !== null && (
        <div className={`qexp ${pick === q.ans ? 'ok' : 'bad'}`}>
          <div className="qexp-full"><b>{q.w}</b> <span className="ipa inline">/{wordIpa(q.w)}/</span> <AudioButton text={q.w} className="icon xs" /> <span className="muted">{e?.vi}</span> <SayIt text={q.w} /></div>
          {pick !== q.ans && <div className="small">Bạn chọn: <b>{q.opts[pick]}</b> <span className="ipa inline">/{wordIpa(q.opts[pick])}/</span> <AudioButton text={q.opts[pick]} className="icon xs" /> Hãy nghe cả hai để so sánh.</div>}
          <button className="btn big mt-2" onClick={() => { setN(n + 1); setPick(null); }}>Câu tiếp →</button>
        </div>
      )}
    </Section>
  );
}

/** Trọng âm: chọn âm tiết được nhấn (dấu ˈ trong phiên âm) */
function Stress() {
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [sc, setSc] = useState([0, 0]);
  const [ready, setReady] = useState(false);
  useEffect(() => { loadLex().then(() => setReady(true)); }, []);
  const q = useMemo(() => {
    if (!ready) return null;
    const pool = dictWords().slice(0, 4000).filter((w) => /^[a-z]{5,12}$/.test(w) && (wordIpa(w) || '').includes('.') && (wordIpa(w) || '').includes('ˈ'));
    const w = pick1(pool), ipa = wordIpa(w)!, syl = ipa.split(/[.ˈˌ]/).filter(Boolean);
    let k = 0; const parts = ipa.split(/(?=[.ˈˌ])/).map((p) => p.replace(/^\./, ''));
    const ans = Math.max(0, parts.findIndex((p) => p.startsWith('ˈ')));
    k = ans;
    return { w, ipa, syl, ans: k };
  }, [n, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q) return <Section><p className="muted">Đang tải…</p></Section>;
  return (
    <Section>
      <div className="flex justify-between"><h3 className="m-0">🎯 Trọng âm rơi vào âm tiết nào?</h3><span className="muted small">Đúng {sc[0]}/{sc[1]}</span></div>
      <p className="muted small">Âm tiết được nhấn đọc to hơn, dài hơn, cao hơn. Nghe rồi chọn. Trong phiên âm, dấu ˈ đứng trước âm tiết nhấn.</p>
      <div className="ipa-q"><span className="en">{q.w}</span> <AudioButton text={q.w} className="icon" /> <AudioButton text={q.w} slow label="🐢" className="icon" /></div>
      <div className="syl-row">{q.syl.map((s, i) => {
        const cls = pick === null ? '' : i === q.ans ? 'right' : i === pick ? 'wrong' : 'dim';
        return <button key={i} className={`opt syl ${cls}`} disabled={pick !== null} onClick={() => { setPick(i); setSc([sc[0] + (i === q.ans ? 1 : 0), sc[1] + 1]); tallySkill(app.P, 'listen', i === q.ans); save(); }}><b>{s}</b><small>âm tiết {i + 1}</small></button>;
      })}</div>
      {pick !== null && <div className={`qexp ${pick === q.ans ? 'ok' : 'bad'}`}>
        <div className="qexp-full"><b>{q.w}</b> <span className="ipa inline">/{q.ipa}/</span> → nhấn âm tiết <b>{q.ans + 1}</b>: <b className="okc">{q.syl[q.ans].toUpperCase()}</b> <SayIt text={q.w} /></div>
        <div className="small muted">{lookup(q.w)?.vi}</div>
        <button className="btn big mt-2" onClick={() => { setN(n + 1); setPick(null); }}>Từ tiếp →</button></div>}
    </Section>
  );
}

function Homophones({ d }: { d: Pron }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * d.homophones.length));
  const [ans, setAns] = useState<Record<number, string>>({});
  const H = d.homophones[i % d.homophones.length];
  return (
    <Section>
      <div className="flex justify-between"><h3 className="m-0">🔁 Từ đồng âm: đọc giống, viết khác</h3><button className="btn ghost sm" onClick={() => { setI(Math.floor(Math.random() * d.homophones.length)); setAns({}); }}>🎲 Nhóm khác</button></div>
      <div className="flex flex-wrap gap-2 mt-2">{H.words.map(([w, ipa, vi]) => <div key={w} className="vchip"><b>{w}</b> <span className="ipa inline">{ipa}</span> <AudioButton text={w} className="icon xs" /><span className="small">{vi}</span></div>)}</div>
      {H.note_vi && <p className="note small mt-2">💡 {H.note_vi}</p>}
      <b className="small block mt-3">Điền từ đúng vào câu:</b>
      {H.cloze.map(([s, a], k) => (
        <div key={k} className="mt-2"><div>{s.replace('___', ans[k] ? `【${ans[k]}】` : '_____')}</div>
          <div className="flex flex-wrap gap-2 mt-1">{H.words.map(([w]) => {
            const cls = !ans[k] ? '' : w === a ? 'right' : w === ans[k] ? 'wrong' : 'dim';
            return <button key={w} className={`opt sm ${cls}`} disabled={!!ans[k]} onClick={() => { setAns({ ...ans, [k]: w }); tallySkill(app.P, 'read', w === a); save(); }}>{w}</button>;
          })}</div>
          {ans[k] && <div className={ans[k] === a ? 'okc small' : 'badc small'}>{ans[k] === a ? '✅ Đúng' : `❌ Đáp án: ${a}`} <AudioButton text={s.replace('___', a)} className="icon xs" /></div>}
        </div>
      ))}
    </Section>
  );
}

function Clusters({ d }: { d: Pron }) {
  return (
    <Section>
      <h3 className="m-0">🧩 Cụm phụ âm khó</h3>
      <p className="muted small">Người Việt hay chèn thêm nguyên âm (street → “sơ-tơ-rít”) hoặc bỏ phụ âm cuối. Đọc liền các phụ âm, giữ âm cuối.</p>
      <div className="grid gap-2 mt-2">{d.consonant_clusters.map((c) => (
        <div key={c.word} className="ex-row"><b className="text-lg">{c.word}</b> <span className="ipa inline">{c.ipa}</span> <AudioButton text={c.word} className="icon xs" /> <AudioButton text={c.word} slow label="🐢" className="icon xs" /> <SayIt text={c.word} /><div className="small muted w-full">{c.tip_vi}</div></div>
      ))}</div>
    </Section>
  );
}

/** Tab Phát âm */
export function Pron() {
  const d = usePron();
  const [tab, setTab] = useRouteParam<'chart' | 'pairs' | 'read' | 'stress' | 'homo' | 'clusters'>('t', 'chart');
  return (
    <>
      <h2>🔊 Phát âm IPA</h2>
      <Pills id="pron" value={tab} onChange={setTab} items={[['chart', '🔤 Bảng IPA'], ['pairs', '👂 Cặp âm dễ nhầm'], ['read', '📖 Đọc phiên âm'], ['stress', '🎯 Trọng âm'], ['homo', '🔁 Từ đồng âm'], ['clusters', '🧩 Cụm phụ âm']]} />
      {tab === 'read' ? <ReadIpa /> : tab === 'stress' ? <Stress /> : !d ? <Section><p className="muted">Đang tải dữ liệu phát âm…</p></Section>
        : tab === 'chart' ? <Chart d={d} /> : tab === 'pairs' ? <Pairs d={d} /> : tab === 'homo' ? <Homophones d={d} /> : <Clusters d={d} />}
    </>
  );
}
