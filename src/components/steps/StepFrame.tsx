import type { ReactNode } from 'react';
import { GRADED, type Step } from '../../lib/exercises';
import type { Session } from '../../state/store';
import { FeedbackBar } from '../FeedbackBar';
import { GrammarNotes } from '../GrammarNotes';
import { Ipa } from '../Ipa';
import { SayBoth } from '../AudioButton';

export interface StepProps<S extends Step = Step> { S: Session; st: S }
/** Khung một câu: nội dung + chân trang (nút, hoặc thanh kết quả sau khi trả lời) */
export function StepFrame({ S, st, foot, children }: StepProps & { foot?: ReactNode; children: ReactNode }) {
  const ss = S.state;
  return (
    <>
      <div className="sess">{children}
        {/* Bài học (không phải kiểm tra): trả lời xong thì giải thích ngữ pháp của câu */}
        {ss.answered && 'w' in st && st.t !== 'learn' && (
          <div className="ans-ipa"><b>{st.w[0]}</b> <Ipa text={st.w[0]} className="ipa inline" /> <SayBoth text={st.w[0]} size="xs" /> <span className="muted">= {st.w[1]}</span></div>
        )}
        {ss.answered && ('s' in st || st.t === 'speak') && <Ipa text={'s' in st ? st.s[0].replace('_____', 'answer' in st ? st.answer : '') : st.en} />}
        {ss.answered && S.kind !== 'test' && ('s' in st || st.t === 'speak') && <GrammarNotes en={'s' in st ? st.s[0].replace('_____', 'answer' in st ? st.answer : '') : st.en} open />}
      </div>
      <div className="foot">{ss.answered && GRADED.has(st.t) ? <FeedbackBar st={st} ss={ss} isTest={S.kind === 'test'} /> : foot}</div>
    </>
  );
}
/** Trong bài kiểm tra và chưa trả lời: ẩn gợi ý, hình, tiếng Việt */
export const strict = (S: Session) => S.kind === 'test' && !S.state.answered;
