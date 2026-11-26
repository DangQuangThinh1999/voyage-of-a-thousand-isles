// Bảng điều khiển đầu trang chủ: chào + cấp độ + vòng tiến độ, ô các mục học, bản đồ hành trình các tuần, câu đố hôm nay.
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Cloud } from '../lib/cloud';
import { LESSONS } from '../lib/grammarLessons';
import { titleOf, xpLevel } from '../lib/level';
import { bankLearned, dayNumber, levelNow, minutesToday, newWordsToday, nextTask, streakNow, weekDone, weekNow, type Progress } from '../lib/progress';
import { roadmap } from '../lib/roadmap';
import { dueWords } from '../lib/srs';
import { startSession } from '../state/session';
import { goWeek, tab, type Screen } from '../state/store';
import { TryQuiz } from './GrammarNotes';
import { Bar, Ring } from './ui';

const TILES: [Screen, string, string, string, string][] = [
  ['words', '📗', 'Từ mới', 'Học từ mỗi ngày', 'from-cyan-500 to-blue-600'],
  ['review', '🔁', 'Ôn từ', 'Lặp lại ngắt quãng', 'from-sky-500 to-indigo-600'],
  ['grammar', '📐', 'Ngữ pháp', 'Phân tích & sửa lỗi', 'from-amber-400 to-orange-600'],
  ['speak', '🗣️', 'Giao tiếp', 'Luyện nói có chấm', 'from-emerald-400 to-teal-600'],
  ['skills', '🎧', 'Nghe & Đọc', 'Bài luyện có giải thích', 'from-violet-500 to-purple-700'],
  ['journal', '✍️', 'Viết', 'Chấm bài 4 tiêu chí', 'from-pink-500 to-rose-600'],
  ['stats', '🏆', 'Thành tựu', 'Cấp độ, huy hiệu, xếp hạng', 'from-yellow-400 to-amber-600'],
  ['plan', '🗺️', 'Lộ trình', 'Kế hoạch mỗi ngày', 'from-slate-500 to-slate-700'],
];

export function Dashboard({ P }: { P: Progress }) {
  const L = xpLevel(P.xp), u = Cloud.user, nt = nextTask(P), due = dueWords(P).length;
  const min = minutesToday(P), goal = P.settings.goalMin, nw = newWordsToday(P), wpd = P.settings.wpd;
  const quizName = useMemo(() => { const ks = Object.keys(LESSONS).filter((k) => LESSONS[k].quiz); return ks[(dayNumber(P) * 7) % ks.length]; }, [P]);
  return (
    <div className="dash">
      <motion.section className="hero" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="waves" aria-hidden><i /><i /><i /></div>
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="avatar">{u && u.photoURL ? <img src={u.photoURL} alt="" /> : '⛵'}<span className="lvb">{L.lv}</span></div>
          <div className="flex-1 min-w-[180px]">
            <div className="text-sm opacity-80">Chào mừng trở lại{u && u.displayName ? `, ${u.displayName.split(' ').slice(-1)[0]}` : ''}! · Ngày {dayNumber(P)}</div>
            <div className="text-2xl font-black tracking-tight">{titleOf(L.lv)}</div>
            <div className="flex flex-wrap gap-2 mt-1 text-sm">
              <span className="chip2">🎯 IELTS {levelNow(P)} → {P.settings.target}</span><span className="chip2">⭐ {P.xp} XP</span><span className="chip2">🔥 {streakNow(P)} ngày</span><span className="chip2">📗 {bankLearned(P)} từ</span>
            </div>
            <div className="mt-2 max-w-sm"><Bar pct={L.pct * 100} color="linear-gradient(90deg,#22d3ee,#a78bfa)" h={8} /><div className="text-xs opacity-75 mt-1">Còn {L.need} XP lên cấp {L.lv + 1}</div></div>
          </div>
          <div className="flex gap-3">
            <Ring pct={min / goal} size={84} color="#22d3ee"><div><b className="text-lg">{min}</b><div className="text-[10px] opacity-75">/{goal} phút</div></div></Ring>
            <Ring pct={nw / wpd} size={84} color="#34d399"><div><b className="text-lg">{nw}</b><div className="text-[10px] opacity-75">/{wpd} từ</div></div></Ring>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 mt-4">
          {nt && <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn big glow" onClick={() => startSession(nt.u.id, nt.k[0])}>▶ Học tiếp: {nt.u.emoji} {nt.u.title} · {nt.k[2]}</motion.button>}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn big ghost" onClick={() => tab('review')}>🔁 Ôn {due} từ</motion.button>
        </div>
      </motion.section>

      <div className="tiles">
        {TILES.map(([s, ic, name, sub, grad], i) => (
          <motion.button key={s} className={`tile2 bg-gradient-to-br ${grad}`} onClick={() => tab(s)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <span className="ic">{ic}</span><b>{name}</b><small>{sub}</small>
          </motion.button>
        ))}
      </div>

      <Voyage P={P} />

      {quizName && (
        <motion.section className="card qday" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex justify-between"><b>🧩 Câu đố ngữ pháp hôm nay</b><span className="muted small">{quizName}</span></div>
          <TryQuiz key={quizName} quiz={LESSONS[quizName].quiz!} />
        </motion.section>
      )}
    </div>
  );
}

/** Bản đồ hành trình: mỗi tuần là một đảo, con thuyền ở tuần hiện tại, đảo đích là mục tiêu IELTS */
function Voyage({ P }: { P: Progress }) {
  const RM = roadmap(P), weeks = Object.keys(RM).map(Number), now = Math.min(weekNow(P), weeks.length);
  return (
    <section className="card voyage">
      <div className="flex justify-between"><b>🗺️ Hải trình tới IELTS {P.settings.target}</b><span className="muted small">Tuần {now}/{weeks.length}</span></div>
      <div className="route">
        {weeks.map((w, i) => {
          const g = RM[w], done = weekDone(P, w), last = i === weeks.length - 1;
          return (
            <motion.button key={w} className={`isle ${done ? 'done' : ''} ${w === now ? 'now' : ''} ${last ? 'goal' : ''}`} onClick={() => goWeek(w)} title={g.goal}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(1, i * 0.03) }}>
              {w === now && <motion.span className="ship" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>⛵</motion.span>}
              <span className="dot">{last ? '🏆' : done ? '🚩' : '🏝️'}</span>
              <small>T{w}</small><small className="b">{g.band}</small>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
