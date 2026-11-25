import { useEffect } from 'react';
import { KINDS } from '../lib/progress';
import { checkFix, checkType, nextStep, quit, step } from '../state/session';
import { app, type Session } from '../state/store';
import { ProgressBar } from './ProgressBar';
import { STEP_VIEWS } from './steps';
import { Timer } from './Timer';

/** Chạy một phiên làm bài: thanh tiến độ, đồng hồ (bài kiểm tra), câu hiện tại, phím Enter */
export function SessionRunner({ S }: { S: Session }) {
  useEnterKey();
  const st = S.steps[S.i], ss = S.state;
  const kd = S.kind === 'test' ? '⚡' : (KINDS.find(([k]) => k === S.kind) || [])[1];
  const pct = Math.round((S.i / S.steps.length) * 100);
  const View = STEP_VIEWS[st.t];
  return (
    <>
      <div className="sess-top">
        <button className="icon" data-act="quit" onClick={quit}>✕</button>
        <ProgressBar pct={pct} />
        {S.kind === 'test' ? <Timer deadline={ss.deadline || 0} answered={ss.answered} /> : <span className="muted small">{kd}</span>}
      </div>
      <View key={S.i} S={S} st={st} />
    </>
  );
}

// Enter: kiểm tra câu đang gõ, hoặc sang câu tiếp theo khi đã trả lời
function useEnterKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const S = app.S, t = e.target as HTMLElement;
      if (e.key !== 'Enter' || app.scr !== 'session' || !S || S.done || S.intro) return;
      if (t.id === 'jtext' || t.tagName === 'BUTTON' || t.tagName === 'SELECT') return;
      if (t.id === 'ans' && !S.state.answered) { e.preventDefault(); (step().t === 'fix' ? checkFix : checkType)(); return; }
      if (S.state.answered || ['learn', 'passage'].includes((step() || {}).t)) { e.preventDefault(); nextStep(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
