import { useState } from 'react';
import { Dropdown } from '../components/Dropdown';
import { JOURNAL_PROMPTS, LEVELS, UNITS } from '../data';
import { AudioButton } from '../components/AudioButton';
import { Card } from '../components/Card';
import { CoachReport, Section } from '../components/ui';
import { GenBar } from '../components/GenBar';
import type { GenItem } from '../lib/gen';
import { coachWriting, type CoachResult } from '../lib/coach';
import { nextTask, tallySkill } from '../lib/progress';
import { applyFixes } from '../lib/sentence';
import { dayKey } from '../lib/util';
import { copyJournal, deleteJournal, saveJournal } from '../state/actions';
import { addXP, app, useApp } from '../state/store';

/** Viết: nhật ký hằng ngày hoặc đề IELTS, máy chấm 4 tiêu chí + sửa lỗi, lưu bài, chép để nhờ sửa */
export function Journal() {
  const { P } = useApp();
  const [text, setText] = useState('');
  const [pi, setPi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState<{ r: CoachResult; text: string } | null>(null);
  const nt = nextTask(P), u = nt ? nt.u : UNITS[UNITS.length - 1];
  const [ai, setAi] = useState<GenItem | null>(null);
  const L = pi >= 0 ? LEVELS[pi].writing : ai ? ai.data as { prompt: string; vi: string; minWords: number; ideas: string[]; useful: string[]; outline?: string[] } : null;
  const prompt = L ? L.prompt : JOURNAL_PROMPTS[u.id], minWords = L ? L.minWords : 30;
  const wc = (text.trim().match(/\S+/g) || []).length;
  async function grade() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await coachWriting(text, minWords);
    setRep({ r, text });
    tallySkill(app.P, 'write', r.band >= parseFloat(app.P.settings.target || '5.5') - 1);
    (app.P.coach || (app.P.coach = [])).unshift({ d: dayKey(), k: 'write', band: r.band, words: r.words, err: r.issues.length });
    addXP(5); setBusy(false);
  }
  return (
    <>
      <h2>✍️ Viết & chấm bài</h2>
      <GenBar kind="writing" onItem={(it) => { setAi(it); setPi(-2); setRep(null); }} />
      <Section>
        <Dropdown className="w-full" label="Đề bài" value={pi} onChange={(v) => { setPi(v); if (v === -1) setAi(null); setRep(null); }}
          options={[...(ai ? [{ value: -2, icon: '✨', label: 'Đề AI vừa tạo', sub: ai.title.slice(0, 60) }] : []), { value: -1, icon: '📝', label: 'Nhật ký hôm nay', sub: `Bài ${u.emoji} ${u.title} · ít nhất 30 từ` },
            ...LEVELS.map((l, i) => ({ value: i, icon: '📄', label: `${l.cefr} · IELTS ${l.band}`, sub: `Đề viết ${l.writing.minWords} từ` }))]} />
        <p><b>Đề:</b> {prompt}</p>
        {L && <details><summary className="muted small">Dịch đề, gợi ý ý tưởng và dàn ý</summary><p className="muted">{L.vi}</p><ul>{L.ideas.map((x) => <li key={x}>{x}</li>)}</ul>
          {(L as { outline?: string[] }).outline && <><b className="small">Dàn ý:</b><ol className="small">{((L as { outline?: string[] }).outline || []).map((x) => <li key={x}>{x}</li>)}</ol></>}
          <p className="small"><b>Cụm từ hữu ích:</b> {L.useful.join(' · ')}</p></details>}
        <textarea id="jtext" rows={L ? 10 : 5} placeholder="Viết bằng tiếng Anh… Sai cũng không sao, máy sẽ chỉ lỗi!" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row between">
          <span className={wc >= minWords ? 'okc small' : 'muted small'} id="wc">{wc}/{minWords} từ</span>
          <span className="row gap">
            <button className="btn ghost" data-act="jsave" data-u={u.id} onClick={() => { if (saveJournal(u.id, text)) { setText(''); setRep(null); } }}>Lưu</button>
            <button className="btn" disabled={busy || !text.trim()} onClick={grade}>{busy ? 'Đang chấm…' : '🧑‍🏫 Chấm bài'}</button>
          </span>
        </div>
        <p className="muted small">Chấm bài: điểm ước tính theo 4 tiêu chí IELTS, chỉ ra lỗi ngữ pháp, chính tả và đưa bài đã sửa. Bấm “📋 Nhờ sửa” ở bài đã lưu để nhờ AI hoặc giáo viên sửa kỹ hơn.</p>
      </Section>
      {rep && <CoachReport r={rep.r} title={`Điểm Writing ước tính: ${rep.r.band.toFixed(1)}`} />}
      {rep && rep.r.issues.length > 0 && (
        <Section><b>✅ Bài đã sửa</b> <AudioButton text={applyFixes(rep.text, rep.r.issues)} /><p className="fixed" style={{ whiteSpace: 'pre-wrap' }}>{applyFixes(rep.text, rep.r.issues)}</p></Section>
      )}
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
