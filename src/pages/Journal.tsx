import { useState } from 'react';
import { JOURNAL_PROMPTS, UNITS } from '../data';
import { AudioButton } from '../components/AudioButton';
import { Card } from '../components/Card';
import { nextTask } from '../lib/progress';
import { copyJournal, deleteJournal, saveJournal } from '../state/actions';
import { useApp } from '../state/store';

/** Nhật ký tiếng Anh: viết, lưu, chép để nhờ sửa, xóa */
export function Journal() {
  const { P } = useApp();
  const [text, setText] = useState('');
  const nt = nextTask(P), u = nt ? nt.u : UNITS[UNITS.length - 1];
  const wc = (text.trim().match(/\S+/g) || []).length;
  return (
    <>
      <h2>📝 Nhật ký tiếng Anh</h2>
      <Card><p><b>Đề hôm nay:</b> {JOURNAL_PROMPTS[u.id]}</p>
        <textarea id="jtext" rows={5} placeholder="Viết bằng tiếng Anh… Sai cũng không sao!" data-autofocus="1" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row between"><span className="muted small" id="wc">{wc} từ</span>
          <button className="btn" data-act="jsave" data-u={u.id} onClick={() => { if (saveJournal(u.id, text)) setText(''); }}>Lưu</button></div>
        <p className="muted small">Mẹo: bấm “📋 Nhờ sửa” ở bài đã lưu để chép bài kèm câu nhờ sửa lỗi, rồi dán vào Claude hoặc giáo viên.</p></Card>
      {P.journal.map((e) => (
        <Card key={e.id} className="jentry">
          <div className="row between"><span className="muted small">{e.d}</span>
            <span><AudioButton text={e.t} className="icon sm" /><button className="icon sm" data-act="jcopy" data-id={e.id} title="Nhờ sửa" onClick={() => copyJournal(e.id)}>📋</button><button className="icon sm" data-act="jdel" data-id={e.id} onClick={() => deleteJournal(e.id)}>🗑️</button></span></div>
          <p>{e.t.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>
        </Card>
      ))}
    </>
  );
}
