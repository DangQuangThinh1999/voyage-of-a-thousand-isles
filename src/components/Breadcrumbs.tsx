import { Fragment, type ReactNode } from 'react';
import { unitById } from '../data';
import { roadmap } from '../lib/roadmap';
import { KINDS, levelNow } from '../lib/progress';
import { go, goWeek, leaveOk, tab, useApp } from '../state/store';

const NAMES: Record<string, string> = { grammar: '📐 Ngữ pháp', speak: '🗣️ Giao tiếp', skills: '🎯 Kỹ năng', stats: '🏆 Thành tựu', words: '📗 Từ mới', review: '🔁 Ôn từ', journal: '✍️ Viết', plan: '🗺️ Lộ trình', settings: '⚙️ Cài đặt', mic: '🎤 Test micro' };
/** Đường dẫn: Học › Tuần › Bài › Phần, kèm trình độ ước tính */
export function Breadcrumbs() {
  const { scr, arg, S, P } = useApp();
  const WG = roadmap(P);
  const parts: ReactNode[] = [<button key="h" data-act="tab" data-tab="home" onClick={() => leaveOk() && tab('home')}>🏠 Học</button>];
  const u = scr === 'unit' ? unitById(arg || '') : scr === 'session' && S ? S.u : null;
  const weekCrumb = (w: number) => (
    <button key="w" data-act="week" data-w={w} onClick={() => leaveOk() && goWeek(w)}>Tuần {w} · 🎯 {WG[w].band}</button>
  );
  if (scr === 'session' && S && S.kind === 'test' && S.key && S.key[0] === 'w') parts.push(weekCrumb(+S.key.slice(1)), <span key="t">⚡ Kiểm tra tuần</span>);
  else if (u) {
    parts.push(weekCrumb(u.week), <button key="u" data-act="unit" data-u={u.id} onClick={() => leaveOk() && go('unit', u.id)}>{u.emoji} {u.title}</button>);
    if (scr === 'session' && S) { const k = KINDS.find(([x]) => x === S.kind); parts.push(<span key="k">{k ? k[1] + ' ' + k[2] : '⚡ Kiểm tra chủ đề'}</span>); }
  } else if (scr !== 'home') parts.push(<span key="s">{NAMES[scr]}</span>);
  return (
    <nav id="crumbs" className="crumbs" aria-label="Đường dẫn">
      <div className="path">{parts.map((p, i) => <Fragment key={i}>{i > 0 && <i>›</i>}{p}</Fragment>)}</div>
      <span className="lv">🎯 Trình độ ~IELTS <b>{levelNow(P)}</b> → {P.settings.target}</span>
    </nav>
  );
}
