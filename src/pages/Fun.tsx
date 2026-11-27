// 🎮 GIẢI TRÍ: trò chơi từ vựng + đọc truyện có hình — tất cả theo mức độ IELTS người học chọn.
// Từ lấy trong kho từ theo đúng độ khó (kho xếp từ dễ → khó); bài đọc có hình lấy từ Simple English Wikipedia (miễn phí, viết cho người học).
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { SayBoth } from '../components/AudioButton';
import { Dropdown } from '../components/Dropdown';
import { TapText } from '../components/TapText';
import { LevelPicker, TopicPicker, topicAngle } from '../components/TopicPicker';
import { bankRange, firstSense, type BankWord } from '../data/bank';
import { speak } from '../lib/speech';
import { shuffle } from '../lib/util';
import { useGenPref } from '../state/prefs';
import { addXP } from '../state/store';

/** Đoạn từ trong kho theo mức độ */
const RANGE: Record<string, [number, number]> = { A1: [0, 1000], A2: [1000, 2500], B1: [2500, 4000], B2: [4000, 6000], C1: [6000, 8000], C2: [8000, 10012] };
const GAMES = [
  ['match', '🧩', 'Ghép cặp', 'Nối từ tiếng Anh với nghĩa'],
  ['speed', '⚡', 'Đua tốc độ', '60 giây, chọn nghĩa đúng nhiều nhất'],
  ['scramble', '🔤', 'Xếp chữ', 'Sắp lại chữ cái thành từ đúng'],
  ['listen', '👂', 'Nghe đoán từ', 'Nghe rồi gõ lại từ'],
  ['read', '📚', 'Đọc có hình', 'Bài đọc ngắn kèm ảnh, chạm từ để xem nghĩa'],
] as const;
type Game = (typeof GAMES)[number][0];
const vi = (w: BankWord) => firstSense(w.vi).replace(/^\(.*?\)\s*/, '');
const best = (k: string) => { try { return +(localStorage.getItem('ht.fun.' + k) || 0); } catch { return 0; } };
const setBest = (k: string, v: number) => { try { if (v > best(k)) localStorage.setItem('ht.fun.' + k, String(v)); } catch { /* bỏ qua */ } };

/** Lấy n từ ngẫu nhiên đúng mức độ (bỏ từ quá dài / cụm từ cho dễ chơi) */
function useWords(cefr: string, n: number, round: number) {
  const [ws, setWs] = useState<BankWord[] | null>(null);
  useEffect(() => {
    let live = true; setWs(null);
    const [a, b] = RANGE[cefr] || RANGE.A2;
    bankRange(a, b).then((all) => { if (live) setWs(shuffle(all.filter((w) => /^[a-z]{3,12}$/.test(w.w) && vi(w))).slice(0, n)); }).catch(() => live && setWs([]));
    return () => { live = false; };
  }, [cefr, n, round]);
  return ws;
}
const Loading = () => <div className="card skel" aria-busy="true"><div className="skel-l w40" /><div className="row gap"><div className="skel-b" /><div className="skel-b" /></div></div>;

function Match({ cefr, round, next }: { cefr: string; round: number; next: () => void }) {
  const ws = useWords(cefr, 6, round);
  const right = useMemo(() => (ws ? shuffle(ws) : []), [ws]);
  const [sel, setSel] = useState<string | null>(null), [done, setDone] = useState<string[]>([]), [bad, setBad] = useState<string | null>(null), [miss, setMiss] = useState(0);
  useEffect(() => { setDone([]); setSel(null); setMiss(0); }, [ws]);
  if (!ws) return <Loading />;
  const pick = (w: string) => {
    if (!sel) return;
    if (w === sel) { setDone([...done, w]); speak(w); setSel(null); if (done.length + 1 === ws.length) addXP(3); }
    else { setBad(w); setMiss(miss + 1); setTimeout(() => setBad(null), 400); }
  };
  return (
    <section className="card fun">
      <div className="row between"><b>🧩 Chọn 1 từ bên trái rồi chọn nghĩa đúng bên phải</b><span className="muted small">sai {miss} lần</span></div>
      <div className="match">
        <div>{ws.map((w) => <button key={w.w} disabled={done.includes(w.w)} className={'opt ' + (sel === w.w ? 'on' : '') + (done.includes(w.w) ? ' ok' : '')} onClick={() => { setSel(w.w); speak(w.w); }}>{w.w}</button>)}</div>
        <div>{right.map((w) => <button key={w.w} disabled={done.includes(w.w)} className={'opt ' + (done.includes(w.w) ? 'ok' : bad === w.w ? 'bad' : '')} onClick={() => pick(w.w)}>{vi(w)}</button>)}</div>
      </div>
      {done.length === ws.length && <div className="center"><p className="okc">🎉 Xong! Sai {miss} lần · +3 XP</p><button className="btn" onClick={next}>🎲 Ván mới</button></div>}
    </section>
  );
}

function Speed({ cefr, round, next }: { cefr: string; round: number; next: () => void }) {
  const ws = useWords(cefr, 40, round);
  const [i, setI] = useState(0), [score, setScore] = useState(0), [end, setEnd] = useState(0), [fb, setFb] = useState<'' | 'ok' | 'bad'>('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setI(0); setScore(0); setEnd(0); }, [ws]);
  useEffect(() => { if (!end) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [end]);
  const left = end ? Math.max(0, Math.ceil((end - now) / 1000)) : 60, over = !!end && left === 0;
  useEffect(() => { if (over) { setBest('speed-' + cefr, score); if (score) addXP(Math.min(10, score)); } }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = ws?.[i % (ws?.length || 1)];
  const opts = useMemo(() => (ws && w ? shuffle([w, ...shuffle(ws.filter((x) => x !== w)).slice(0, 3)]) : []), [ws, w]);
  if (!ws || !w) return <Loading />;
  if (!end) return <section className="card fun center"><p>⚡ 60 giây: chọn nghĩa đúng của càng nhiều từ càng tốt.</p><p className="muted small">Kỷ lục mức {cefr}: <b>{best('speed-' + cefr)}</b></p><button className="btn big glow" onClick={() => { setEnd(Date.now() + 60_000); setNow(Date.now()); }}>▶ Bắt đầu</button></section>;
  if (over) return <section className="card fun center"><div className="huge">⏱️</div><h3>Được {score} từ!</h3><p className="muted">Kỷ lục mức {cefr}: {Math.max(score, best('speed-' + cefr))}</p><button className="btn" onClick={next}>🔁 Chơi lại</button></section>;
  return (
    <section className={'card fun ' + fb}>
      <div className="row between"><b>⏱️ {left}s</b><b>⭐ {score}</b></div>
      <div className="fun-word">{w.w} <span className="ipa inline">{w.ipa}</span></div>
      <div className="fun-opts">{opts.map((o) => <button key={o.w} className="opt" onClick={() => { const ok = o === w; setScore(score + (ok ? 1 : 0)); setFb(ok ? 'ok' : 'bad'); setTimeout(() => setFb(''), 250); setI(i + 1); }}>{vi(o)}</button>)}</div>
    </section>
  );
}

function Spell({ cefr, round, next, hear }: { cefr: string; round: number; next: () => void; hear?: boolean }) {
  const ws = useWords(cefr, 8, round);
  const [i, setI] = useState(0), [v, setV] = useState(''), [ok, setOk] = useState<boolean | null>(null), [score, setScore] = useState(0);
  useEffect(() => { setI(0); setV(''); setOk(null); setScore(0); }, [ws]);
  const w = ws?.[i];
  const mix = useMemo(() => { if (!w) return ''; let m = w.w; for (let k = 0; k < 5 && m === w.w; k++) m = shuffle(w.w.split('')).join(''); return m; }, [w]);
  useEffect(() => { if (hear && w) setTimeout(() => speak(w.w), 300); }, [hear, w]);
  if (!ws) return <Loading />;
  if (!w) return <section className="card fun center"><div className="huge">🏁</div><h3>Đúng {score}/{ws.length} từ</h3><button className="btn" onClick={next}>🎲 Ván mới</button></section>;
  const check = () => { const good = v.trim().toLowerCase() === w.w; setOk(good); if (good) { setScore(score + 1); addXP(1); } speak(w.w); };
  return (
    <section className="card fun">
      <div className="row between"><b>{hear ? '👂 Nghe rồi gõ lại từ' : '🔤 Sắp lại thành từ đúng'}</b><span className="muted small">{i + 1}/{ws.length} · đúng {score}</span></div>
      {hear ? <div className="center"><SayBoth text={w.w} /><p className="muted small m-0">Gợi ý: {vi(w)} · {w.w.length} chữ cái</p></div>
        : <><div className="fun-word mono">{mix.toUpperCase().split('').join(' ')}</div><p className="muted center m-0">Nghĩa: {vi(w)}</p></>}
      <form className="row gap" onSubmit={(e) => { e.preventDefault(); if (ok === null) check(); else { setI(i + 1); setV(''); setOk(null); } }}>
        <input className="ans flex-1" value={v} onChange={(e) => setV(e.target.value)} disabled={ok !== null} autoFocus placeholder="Gõ từ…" />
        <button className="btn">{ok === null ? 'Kiểm tra' : 'Tiếp →'}</button>
      </form>
      {ok !== null && <p className={ok ? 'okc' : 'badc'}>{ok ? '✅ Chính xác!' : <>❌ Đáp án: <b>{w.w}</b></>} <span className="ipa inline">{w.ipa}</span></p>}
    </section>
  );
}

interface Wiki { title: string; text: string; img?: string; url: string }
const SENTS: Record<string, number> = { A1: 2, A2: 3, B1: 5, B2: 7, C1: 10, C2: 14 };
/** Bài đọc ngắn có hình từ Simple English Wikipedia theo chủ đề */
async function wikiRead(q: string): Promise<Wiki | null> {
  const u = `https://simple.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=12&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=640`;
  const d = await (await fetch(u)).json();
  const pages = Object.values(d?.query?.pages || {}) as { title: string; extract?: string; thumbnail?: { source: string } }[];
  const good = pages.filter((p) => (p.extract || '').length > 120);
  const p = shuffle(good.filter((x) => x.thumbnail).length ? good.filter((x) => x.thumbnail) : good)[0];
  return p ? { title: p.title, text: p.extract || '', img: p.thumbnail?.source, url: `https://simple.wikipedia.org/wiki/${encodeURIComponent(p.title)}` } : null;
}
function Read({ cefr, topic, round, next }: { cefr: string; topic: number; round: number; next: () => void }) {
  const [w, setW] = useState<Wiki | null | undefined>(undefined);
  useEffect(() => {
    let live = true; setW(undefined);
    const q = topicAngle(topic).split(' ').filter((x) => x.length > 3).slice(0, 3).join(' ');
    wikiRead(q).then((r) => r || wikiRead(topicAngle(-1))).then((r) => live && setW(r)).catch(() => live && setW(null));
    return () => { live = false; };
  }, [topic, round]);
  if (w === undefined) return <Loading />;
  if (!w) return <section className="card fun"><p className="muted">Không tải được bài đọc (cần Internet). <button className="btn sm" onClick={next}>Thử lại</button></p></section>;
  const text = (w.text.match(/[^.!?]+[.!?]+/g) || [w.text]).slice(0, SENTS[cefr] || 4).join(' ').trim();
  return (
    <section className="card fun">
      {w.img && <img className="fun-img" src={w.img} alt={w.title} loading="lazy" />}
      <h3 className="m-0">{w.title} <SayBoth text={text} size="xs" /></h3>
      <TapText text={text} className="fun-text" />
      <p className="muted small m-0">👆 Chạm vào từ để xem nghĩa · Độ dài theo mức {cefr} · Nguồn: <a href={w.url} target="_blank" rel="noopener">Simple English Wikipedia</a> (CC BY-SA)</p>
      <button className="btn" onClick={next}>🎲 Bài khác</button>
    </section>
  );
}

export default function Fun() {
  const [p, set] = useGenPref();
  const [g, setG] = useState<Game>('match'), [round, setRound] = useState(0), next = () => setRound(round + 1);
  return (
    <>
      <div className="card pbar">
        <h2 className="m-0">🎮 Giải trí</h2>
        <div className="pbar-row">
          <Dropdown label="Trò chơi" value={g} onChange={(v) => { setG(v); setRound(round + 1); }} options={GAMES.map(([k, ic, l, d]) => ({ value: k, icon: ic, label: l, sub: d }))} />
          <LevelPicker value={p.cefr} onChange={(cefr) => set({ cefr })} />
          {g === 'read' && <TopicPicker value={p.topic} onChange={(topic) => set({ topic })} />}
          <motion.button className="btn glow" whileTap={{ scale: 0.95 }} onClick={next}>🎲 Ván mới</motion.button>
        </div>
      </div>
      {g === 'match' ? <Match key={round} cefr={p.cefr} round={round} next={next} />
        : g === 'speed' ? <Speed key={round} cefr={p.cefr} round={round} next={next} />
        : g === 'scramble' ? <Spell key={round} cefr={p.cefr} round={round} next={next} />
        : g === 'listen' ? <Spell key={round} cefr={p.cefr} round={round} next={next} hear />
        : <Read key={round} cefr={p.cefr} topic={p.topic} round={round} next={next} />}
    </>
  );
}
