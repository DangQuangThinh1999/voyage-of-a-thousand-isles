import { JOURNAL_PROMPTS, unitById } from '../data';
import { AudioButton } from '../components/AudioButton';
import { GrammarNotes } from '../components/GrammarNotes';
import { Card } from '../components/Card';
import { doneCount, KINDS } from '../lib/progress';
import { startQuickTest, startSession } from '../state/session';
import { tab, useApp } from '../state/store';

export function Unit() {
  const { P, arg } = useApp();
  const u = unitById(arg || '');
  if (!u) return null;
  const up = P.units[u.id] || {};
  return (
    <>
      <div className="row gap"><h2>{u.emoji} {u.title} <small className="muted">· {u.vi}</small></h2></div>
      <div className="list">
        {doneCount(P, u.id) < 5 && (
          <button className="item quick" data-act="test" data-u={u.id} onClick={() => startQuickTest({ u: u.id })}><span className="em">⚡</span><span className="t"><b>Kiểm tra nhanh</b><small>Khó hơn bài học: 14 câu đủ 4 kỹ năng, có giới hạn thời gian, chỉ nghe 2 lần, không gợi ý. Đúng hết 100% mới qua</small></span><span className="go">Làm</span></button>
        )}
        {KINDS.map(([k, ic, name, desc]) => (
          <button key={k} className="item" data-act="start" data-u={u.id} data-k={k} onClick={() => startSession(u.id, k)}>
            <span className="em">{ic}</span><span className="t"><b>{name}</b><small>{desc}</small></span>
            <span className={up[k] ? 'ok' : 'go'}>{up[k] ? '✓ Làm lại' : 'Bắt đầu'}</span>
          </button>
        ))}
        <button className="item" data-act="tab" data-tab="journal" onClick={() => tab('journal')}><span className="em">📝</span><span className="t"><b>Nhật ký</b><small>{JOURNAL_PROMPTS[u.id] || ''}</small></span><span className="go">Viết</span></button>
      </div>
      <h3>Sổ tay từ vựng</h3>
      <Card><table className="words"><tbody>{u.words.map(([en, vi, em]) => (
        <tr key={en}><td>{em}</td><td><b>{en}</b></td><td className="muted">{vi}</td><td><AudioButton text={en} className="icon sm" /></td></tr>
      ))}</tbody></table></Card>
      <h3>Câu mẫu</h3>
      <Card>{u.sentences.map(([en, vi]) => (
        <div key={en} className="sent"><AudioButton text={en} className="icon sm" /><div><b>{en}</b><div className="muted">{vi}</div><GrammarNotes en={en} /></div></div>
      ))}</Card>
    </>
  );
}
