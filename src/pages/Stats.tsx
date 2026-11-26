import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bar, Ring, Section } from '../components/ui';
import { BANK_TOTAL } from '../data/bank';
import { Cloud, type BoardEntry } from '../lib/cloud';
import { bankLearned, levelNow, streakNow, type Progress } from '../lib/progress';
import { wordsFor } from '../lib/roadmap';
import { addDays, dayKey } from '../lib/util';
import { login } from '../state/actions';
import { useApp } from '../state/store';
import { skillStats } from './Skills';
import { titleOf, xpLevel } from '../lib/level';

type Badge = [icon: string, name: string, desc: string, ok: boolean];
function badges(P: Progress): Badge[] {
  const w = bankLearned(P), s = Math.max(P.streak || 0, streakNow(P)), passed = Object.values(P.tests || {}).filter((t) => t.passed).length;
  const sents = Object.keys(P.vs || {}).length, gram = Object.keys(P.gram || {}).length, coach = P.coach || [];
  const best = (k: 'speak' | 'write') => Math.max(0, ...coach.filter((c) => c.k === k).map((c) => c.band));
  return [
    ['🌱', 'Bước đầu tiên', 'Học 10 từ đầu tiên', w >= 10], ['📗', 'Kho 100 từ', 'Học 100 từ', w >= 100], ['📚', '500 từ', 'Học 500 từ', w >= 500],
    ['🧭', '1.000 từ', 'Học 1.000 từ', w >= 1000], ['🏝️', '3.000 từ (≈5.5)', 'Đủ vốn từ IELTS 5.5', w >= 3000], ['⛵', '5.000 từ (≈6.5)', 'Đủ vốn từ IELTS 6.5', w >= 5000],
    ['🚢', '7.000 từ (≈7.5)', 'Đủ vốn từ IELTS 7.5', w >= 7000], ['🏆', '10.000 từ (≈9.0)', 'Đủ vốn từ IELTS 9.0', w >= 10000],
    ['🔥', 'Chuỗi 3 ngày', 'Học 3 ngày liên tiếp', s >= 3], ['💪', 'Chuỗi 7 ngày', 'Học 7 ngày liên tiếp', s >= 7], ['🌋', 'Chuỗi 30 ngày', 'Học 30 ngày liên tiếp', s >= 30],
    ['⚡', 'Qua kiểm tra', 'Qua 1 bài kiểm tra 100%', passed >= 1], ['🎖️', '5 bài kiểm tra', 'Qua 5 bài kiểm tra', passed >= 5],
    ['✍️', 'Nhà văn nhỏ', 'Tự viết 20 câu đạt', sents >= 20], ['📐', 'Ngữ pháp vững', 'Học 20 bài ngữ pháp', gram >= 20],
    ['🗣️', 'Speaking 5.0+', 'Điểm nói ước tính từ 5.0', best('speak') >= 5], ['📝', 'Writing 5.0+', 'Điểm viết ước tính từ 5.0', best('write') >= 5],
    ['🌟', '1.000 XP', 'Đạt 1.000 điểm kinh nghiệm', P.xp >= 1000],
  ];
}

/** Bản đồ kỹ năng: avatar ở giữa, các kỹ năng xung quanh, vòng sáng theo độ chính xác */
function SkillTree({ P, photo }: { P: Progress; photo?: string | null }) {
  const st = skillStats(P), w = bankLearned(P), target = wordsFor(parseFloat(P.settings.target) || 5.5);
  const nodes = [{ ic: '📗', name: 'Từ vựng', pct: Math.min(1, w / target), color: '#22d3ee', sub: `${w}/${target}` }, ...st.map((s) => ({ ic: s.ic, name: s.name, pct: s.acc, color: s.color, sub: s.n ? `${Math.round(s.acc * 100)}%` : '—' }))];
  const R = 120, C = 160;
  return (
    <div className="tree">
      <svg viewBox="0 -6 320 352" className="w-full max-w-[420px] mx-auto block">
        {nodes.map((n, i) => { const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2; return <motion.line key={n.name} x1={C} y1={C} x2={C + R * Math.cos(a)} y2={C + R * Math.sin(a)} stroke={n.color} strokeWidth={2.5} strokeOpacity={0.35 + n.pct * 0.65} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />; })}
        {nodes.map((n, i) => {
          const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2, x = C + R * Math.cos(a), y = C + R * Math.sin(a), r = 26, c = 2 * Math.PI * (r + 4);
          return (
            <g key={n.name}>
              <circle cx={x} cy={y} r={r} fill="var(--card)" stroke="var(--line)" strokeWidth={2} />
              <motion.circle cx={x} cy={y} r={r + 4} fill="none" stroke={n.color} strokeWidth={3} strokeDasharray={c} transform={`rotate(-90 ${x} ${y})`} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - n.pct) }} transition={{ duration: 1, delay: 0.3 + i * 0.08 }} style={{ filter: `drop-shadow(0 0 6px ${n.color})` }} />
              <text x={x} y={y + 6} textAnchor="middle" fontSize="20">{n.ic}</text>
              <text x={x} y={y + r + 18} textAnchor="middle" fontSize="11" fill="var(--ink)" fontWeight="700">{n.name}</text>
              <text x={x} y={y + r + 31} textAnchor="middle" fontSize="10" fill="var(--muted)">{n.sub}</text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={40} fill="var(--pri-soft)" stroke="var(--pri)" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 10px var(--pri))' }} />
        {photo ? <image href={photo} x={C - 34} y={C - 34} width={68} height={68} clipPath="circle(34px)" /> : <text x={C} y={C + 12} textAnchor="middle" fontSize="34">⛵</text>}
      </svg>
    </div>
  );
}

/** Kiểu khung chú thích biểu đồ: theo màu giao diện, chữ rõ */
const TT = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--pri)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,.35)', padding: '8px 12px' },
  labelStyle: { color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }, itemStyle: { color: 'var(--ink)', fontWeight: 700, padding: 0 },
};
const AX = { stroke: 'var(--muted)', fontSize: 11, tickLine: false };

function Charts({ P }: { P: Progress }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(dayKey(), i - 13));
  const data = days.map((k) => { const d = P.days[k] || { xp: 0, sec: {} }; return { d: k.slice(5), 'Từ mới': d.nw || 0, XP: d.xp || 0, 'Phút': Math.round(Object.values(d.sec || {}).reduce((a, b) => a + b, 0) / 60) }; });
  const coach = [...(P.coach || [])].reverse();
  const bands = coach.map((c, i) => ({ i: i + 1, d: c.d.slice(5), Speaking: c.k === 'speak' ? c.band : null, Writing: c.k === 'write' ? c.band : null }));
  return (
    <>
      <Section>
        <h3 className="m-0">📈 14 ngày gần nhất</h3>
        {data.every((x) => !x['Từ mới'] && !x.XP && !x['Phút']) && <p className="note small mt-2">Chưa có dữ liệu trong 14 ngày qua. Học từ mới, làm bài và luyện nói để biểu đồ “mọc” lên mỗi ngày 📈</p>}
        <div className="h-56 mt-2"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="d" {...AX} /><YAxis {...AX} width={30} allowDecimals={false} /><Tooltip {...TT} cursor={{ fill: 'rgba(34, 211, 238, .08)', radius: 8 }} /><Legend wrapperStyle={{ fontSize: 13 }} /><RBar dataKey="Từ mới" fill="#22d3ee" radius={[6, 6, 0, 0]} /><RBar dataKey="Phút" fill="#a78bfa" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="h-40 mt-2"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="gx" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} /><stop offset="100%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="d" {...AX} /><YAxis {...AX} width={30} allowDecimals={false} /><Tooltip {...TT} cursor={{ stroke: 'rgba(251, 191, 36, .5)', strokeWidth: 2 }} /><Area dataKey="XP" stroke="#fbbf24" fill="url(#gx)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      </Section>
      <Section>
        <h3 className="m-0">🎯 Điểm IELTS ước tính (Speaking, Writing)</h3>
        {bands.length ? <div className="h-56 mt-2"><ResponsiveContainer><LineChart data={bands}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="d" {...AX} /><YAxis domain={[3, 9]} ticks={[3, 4, 5, 6, 7, 8, 9]} {...AX} width={30} /><Tooltip {...TT} cursor={{ stroke: 'rgba(34, 211, 238, .4)', strokeWidth: 2 }} /><Legend wrapperStyle={{ fontSize: 13 }} /><Line dataKey="Speaking" stroke="#34d399" strokeWidth={3} connectNulls dot={{ r: 4 }} /><Line dataKey="Writing" stroke="#f472b6" strokeWidth={3} connectNulls dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
          : <p className="muted">Chấm bài ở tab ✍️ Viết hoặc 🗣️ Giao tiếp để thấy điểm tiến bộ theo thời gian.</p>}
      </Section>
    </>
  );
}

function Leaderboard({ P }: { P: Progress }) {
  const [rows, setRows] = useState<BoardEntry[] | null>(null);
  const [err, setErr] = useState('');
  const u = Cloud.user;
  useEffect(() => {
    (async () => {
      try {
        if (u) await Cloud.publishBoard({ name: (u.displayName || 'Bạn học').slice(0, 40), photo: u.photoURL || '', words: bankLearned(P), xp: P.xp, band: levelNow(P), streak: streakNow(P) });
        setRows(await Cloud.readBoard());
      } catch (e) { setErr(String((e as Error).message || e)); }
    })();
  }, [u, P]);
  return (
    <Section>
      <h3 className="m-0">🏅 Bảng xếp hạng (số từ đã học)</h3>
      {!u && <p className="muted small">Đăng nhập Google để có tên trên bảng xếp hạng. <button className="btn ghost sm" onClick={login}>Đăng nhập</button></p>}
      {err ? <p className="note small">Chưa mở được bảng xếp hạng. Chủ app cần cập nhật quy tắc Firestore (file firestore.rules, mục board) rồi deploy.</p>
        : !rows ? <p className="muted">Đang tải…</p>
          : rows.length === 0 ? <p className="muted">Chưa có ai. Bạn là người đầu tiên!</p>
            : <ol className="board">{rows.map((r, i) => (
              <motion.li key={r.uid} className={u && r.uid === u.uid ? 'me' : ''} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <span className="rk">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>{r.photo ? <img src={r.photo} alt="" /> : <span className="av">⛵</span>}
                <span className="flex-1"><b>{r.name}</b><small className="muted block">IELTS ~{r.band} · 🔥 {r.streak}</small></span><b>{r.words.toLocaleString('vi-VN')} từ</b>
              </motion.li>))}</ol>}
    </Section>
  );
}

/** Tab Thành tựu: cấp độ, bản đồ kỹ năng, biểu đồ, huy hiệu, bảng xếp hạng */
export default function Stats() {
  const { P } = useApp();
  const L = xpLevel(P.xp), w = bankLearned(P), bs = badges(P), got = bs.filter((b) => b[3]).length;
  return (
    <>
      <h2>🏆 Thành tựu</h2>
      <Section className="hero-lv">
        <div className="flex flex-wrap items-center gap-4">
          <Ring pct={L.pct} size={110} color="#fbbf24"><div><div className="text-xs text-muted">Cấp</div><div className="text-3xl font-black">{L.lv}</div></div></Ring>
          <div className="flex-1 min-w-[200px]">
            <div className="text-lg font-extrabold">{titleOf(L.lv)}</div>
            <div className="muted small">⭐ {P.xp.toLocaleString('vi-VN')} XP · còn {L.need} XP lên cấp {L.lv + 1}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="stat"><b>{w.toLocaleString('vi-VN')}</b><small>từ đã học / {BANK_TOTAL.toLocaleString('vi-VN')}</small></div>
              <div className="stat"><b>🔥 {streakNow(P)}</b><small>ngày liên tiếp</small></div>
              <div className="stat"><b>{got}/{bs.length}</b><small>huy hiệu</small></div>
            </div>
          </div>
        </div>
      </Section>
      <Section><h3 className="m-0">🌐 Bản đồ kỹ năng</h3><p className="muted small">Vòng sáng càng đầy, kỹ năng càng tốt. Từ vựng tính theo mục tiêu IELTS {P.settings.target}.</p><SkillTree P={P} photo={Cloud.user?.photoURL} /></Section>
      <Charts P={P} />
      <Section>
        <div className="flex justify-between"><h3 className="m-0">🎖️ Huy hiệu</h3><span className="muted small">{got}/{bs.length}</span></div>
        <Bar pct={(got / bs.length) * 100} color="#fbbf24" h={8} />
        <div className="badges">{bs.map(([ic, name, desc, ok], i) => (
          <motion.div key={name} className={ok ? 'bd on' : 'bd'} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.03 }} title={desc}>
            <span className="ic">{ok ? ic : '🔒'}</span><b>{name}</b><small>{desc}</small>
          </motion.div>))}</div>
      </Section>
      <Leaderboard P={P} />
    </>
  );
}
