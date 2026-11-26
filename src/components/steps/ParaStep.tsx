import { useState } from 'react';
import type { StepOf } from '../../lib/exercises';
import { paraChecks } from '../../lib/exercises';
import { submitPara } from '../../state/session';
import { Checks } from '../Checks';
import { Dictate } from '../Dictate';
import { StepFrame, type StepProps } from './StepFrame';

/** Viết đoạn văn (bài kiểm tra), máy kiểm tra các yêu cầu ngay khi gõ */
export function ParaStep(p: StepProps<StepOf<'para'>>) {
  const { S, st } = p, ss = S.state;
  const [text, setText] = useState(ss.typed || '');
  return (
    <StepFrame {...p} foot={!ss.answered && <button className="btn big" data-act="submitPara" onClick={() => submitPara()}>Nộp bài</button>}>
      <p className="ask">✍️ Viết đoạn văn</p><div className="card vi-prompt">{st.prompt}</div>
      <p className="muted small">Từ nên dùng: {st.vocab.join(', ')}</p>
      <textarea id="para" rows={7} spellCheck={false} placeholder="Viết bằng tiếng Anh…" disabled={ss.answered} data-autofocus={ss.answered ? undefined : '1'}
        value={ss.answered ? ss.typed || '' : text} onChange={(e) => { setText(e.target.value); ss.typed = e.target.value; }} />
      {!ss.answered && <Dictate value={text} onChange={(v) => { setText(v); ss.typed = v; }} />}
      <div id="checks"><Checks checks={paraChecks(ss.answered ? ss.typed || '' : text, st)} /></div>
      <p className="muted small">Máy kiểm tra hình thức và các lỗi hay gặp. Bài sẽ được lưu vào Nhật ký, bấm 📋 ở đó để nhờ sửa ngữ pháp.</p>
    </StepFrame>
  );
}
