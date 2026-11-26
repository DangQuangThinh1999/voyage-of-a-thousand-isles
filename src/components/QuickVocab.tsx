// KIỂM TRA NHANH để bỏ qua từ đã biết: hiện từ tiếng Anh → gõ nghĩa tiếng Việt. Làm 10/20/30/100 từ liền một mạch,
// cuối lượt máy so nghĩa ngay, câu chưa khớp thì Gemini chấm một lần. Từ biết rồi → đánh dấu "đã biết", không phải học lại.
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { nextBankWords, type BankWord } from '../data/bank';
import { addDays, dayKey } from '../lib/util';
import { addXP, app, emit, save } from '../state/store';
import { AudioButton } from './AudioButton';
import { StepProgress } from './Progress';
import { Bar, Pills } from './ui';

type N = '10' | '20' | '30' | '100';
interface Row { e: BankWord; a: string; ok: boolean | null; note?: string; local?: boolean; keep: boolean }
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STRIP = /^(su|viec|nguoi|cai|con|tinh|ke|nha|mot|bi|duoc|lam cho|lam) /;
/** Các nghĩa trong từ điển, đã bỏ ngoặc và dấu */
const senses = (vi: string) => vi.replace(/\([^)]*\)/g, ' ').split(/[;,/]/).map(fold).filter(Boolean);
/** So nghĩa ngay trên máy: trùng một nghĩa (bỏ dấu, bỏ "sự/việc/người…") → đúng; còn lại để AI chấm */
function localOk(vi: string, a: string): boolean {
  const x = fold(a), xs = x.replace(STRIP, '');
  if (!x) return false;
  return senses(vi).some((s) => {
    const ss = s.replace(STRIP, '');
    if (s === x || ss === xs || ss === x || s === xs) return true;
    // gõ một phần đủ dài của nghĩa (ít nhất một nửa số chữ), vd “tuyển dụng” ↔ “sự tuyển dụng nhân viên”
    return xs.length >= 4 && ` ${ss} `.includes(` ${xs} `) && xs.split(' ').length * 2 >= ss.split(' ').length;
  });
}

export function QuickVocab() {
  const [n, setN] = useState<N>('20');
  const [rows, setRows] = useState<Row[] | null>(null), [i, setI] = useState(0), [a, setA] = useState('');
  const [phase, setPhase] = useState<'setup' | 'loading' | 'run' | 'ai' | 'done'>('setup'), [applied, setApplied] = useState(0), [aiNote, setAiNote] = useState('');
  const inp = useRef<HTMLInputElement>(null);

  const start = async () => {
    setPhase('loading'); setApplied(0); setAiNote('');
    const ws = await nextBankWords((w) => !!app.P.srs[w], +n);
    setRows(ws.map((e) => ({ e, a: '', ok: null, keep: false }))); setI(0); setA(''); setPhase(ws.length ? 'run' : 'setup');
    setTimeout(() => inp.current?.focus(), 50);
  };
  const answer = (txt: string) => {
    if (!rows) return;
    const r = rows[i]; r.a = txt.trim();
    if (!r.a) { r.ok = false; r.note = 'Bạn chọn "không biết"'; } else if (localOk(r.e.vi, r.a)) { r.ok = true; r.local = true; }
    setRows([...rows]); setA('');
    if (i + 1 < rows.length) { setI(i + 1); setTimeout(() => inp.current?.focus(), 30); } else finish(rows);
  };
  const finish = async (rs: Row[]) => {
    const pend = rs.filter((r) => r.ok === null);
    if (pend.length) {
      setPhase('ai');
      try {
        const res = await fetch('/api/chunk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 'meaning', items: pend.map((r) => ({ w: r.e.w, vi: r.e.vi, a: r.a })) }) });
        const d = await res.json();
        if (!res.ok || d.error) throw new Error();
        pend.forEach((r, k) => { const x = d.results?.[k]; r.ok = !!x?.ok; r.note = x?.note_vi || ''; });
      } catch {
        pend.forEach((r) => { r.ok = false; r.note = 'AI bận: chưa chắc, bạn tự xem nghĩa rồi tích nếu đã biết'; });
        setAiNote('⚠️ AI đang bận nên các câu chưa khớp từ điển được tính là CHƯA biết. Nếu bạn chắc mình biết, hãy tự tích chọn.');
      }
    }
    rs.forEach((r) => { r.keep = !!r.ok; });
    setRows([...rs]); setPhase('done');
  };
  const apply = () => {
    if (!rows) return;
    const P = app.P, ks = rows.filter((r) => r.keep);
    for (const r of ks) P.srs[r.e.w] = { b: 5, due: addDays(dayKey(), 3650), f: r.e.f, k: 1 };
    save(); addXP(Math.ceil(ks.length / 2)); setApplied(ks.length); emit();
  };

  if (phase === 'setup' || phase === 'loading') return (
    <section className="card">
      <h3 className="m-0">⚡ Kiểm tra nhanh — bỏ qua từ đã biết</h3>
      <p className="muted small">Bạn đã biết nhiều từ rồi? Làm bài này để <b>đẩy nhanh tiến độ</b>: app hiện các từ tiếp theo trong kho (chưa học), bạn gõ <b>nghĩa tiếng Việt</b> (gõ không dấu cũng được). Không biết thì bấm “Không biết”. Cuối bài máy so nghĩa, câu nào chưa khớp từ điển thì Gemini chấm (chấp nhận từ đồng nghĩa). Từ đúng được đánh dấu <b>đã biết</b>, không phải học lại; từ sai sẽ nằm trong lượt học từ mới.</p>
      <div className="row gap wrap"><span className="small">Số từ mỗi lượt:</span><Pills id="qv-n" value={n} onChange={setN} items={[['10', '10 từ'], ['20', '20 từ'], ['30', '30 từ'], ['100', '100 từ']]} /></div>
      <button className="btn big" disabled={phase === 'loading'} onClick={start}>{phase === 'loading' ? 'Đang tải từ…' : `▶ Bắt đầu kiểm tra ${n} từ`}</button>
    </section>
  );

  if (phase === 'run' && rows) {
    const r = rows[i];
    return (
      <motion.section key={i} className="card qv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
        <div className="row between small"><b>⚡ Từ {i + 1}/{rows.length}</b><span className="muted">✅ khớp ngay: {rows.filter((x) => x.ok).length}</span></div>
        <Bar pct={(i / rows.length) * 100} h={6} />
        <div className="center qv-word"><div className="huge-word">{r.e.w}</div><div className="ipa">{r.e.ipa ? `/${r.e.ipa.replace(/^\/|\/$/g, '')}/` : ''} <AudioButton text={r.e.w} className="icon xs" /></div>{r.e.pos && <div className="muted small">{r.e.pos}</div>}</div>
        <form className="row gap" onSubmit={(ev) => { ev.preventDefault(); if (a.trim()) answer(a); }}>
          <input ref={inp} className="ans flex-1" value={a} placeholder="Nghĩa tiếng Việt…" autoCapitalize="off" autoComplete="off" spellCheck={false} onChange={(ev) => setA(ev.target.value)} />
          <button className="btn" disabled={!a.trim()}>→</button>
        </form>
        <div className="row between"><button className="btn ghost sm" onClick={() => answer('')}>🤷 Không biết</button>
          <button className="btn ghost sm" onClick={() => (i === 0 ? setPhase('setup') : finish(rows.slice(0, i)))}>⏹ Dừng & chấm</button></div>
      </motion.section>
    );
  }

  if (phase === 'ai') return <section className="card"><h3 className="m-0">🤖 Đang chấm nghĩa…</h3><StepProgress steps={['So với từ điển', 'Gemini chấm các câu chưa khớp (chấp nhận từ đồng nghĩa)', 'Tổng hợp']} step={1} note="thường 5–15 giây" /></section>;

  if (phase === 'done' && rows) {
    const done = rows.filter((r) => r.ok !== null), known = done.filter((r) => r.keep).length;
    return (
      <section className="card">
        <h3 className="m-0">📋 Kết quả: biết {done.filter((r) => r.ok).length}/{done.length} từ</h3>
        {aiNote && <p className="bad small">{aiNote}</p>}
        <p className="muted small">Tích ✔ = đánh dấu đã biết (bỏ qua, không học lại). Bỏ tích nếu bạn đoán mò.</p>
        <div className="qv-list">{done.map((r) => (
          <label key={r.e.w} className={'qv-row ' + (r.ok ? 'ok' : 'no')}>
            <input type="checkbox" checked={r.keep} disabled={applied > 0} onChange={() => { r.keep = !r.keep; setRows([...rows]); }} />
            <span className="flex-1"><b>{r.e.w}</b> <span className="ipa inline">{r.e.ipa}</span> <AudioButton text={r.e.w} className="icon xs" />
              <br /><span className="small">Bạn: <i>{r.a || '—'}</i> {r.ok ? '✅' : '❌'} · Nghĩa: <b>{r.e.vi}</b>{r.note ? <span className="muted"> · {r.note}</span> : null}</span></span>
          </label>
        ))}</div>
        {applied ? <p className="okc"><b>✅ Đã bỏ qua {applied} từ đã biết.</b> Các từ còn lại sẽ có trong lượt học từ mới.</p>
          : <button className="btn big" onClick={apply} disabled={!known}>✅ Đánh dấu {known} từ đã biết</button>}
        <div className="row gap mt-2"><button className="btn ghost" onClick={start}>⚡ Kiểm tra tiếp {n} từ</button><button className="btn ghost" onClick={() => setPhase('setup')}>⚙️ Đổi số từ</button></div>
      </section>
    );
  }
  return null;
}
