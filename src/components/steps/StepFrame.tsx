import type { ReactNode } from 'react';
import { GRADED, type Step } from '../../lib/exercises';
import type { Session } from '../../state/store';
import { FeedbackBar } from '../FeedbackBar';

export interface StepProps<S extends Step = Step> { S: Session; st: S }
/** Khung một câu: nội dung + chân trang (nút, hoặc thanh kết quả sau khi trả lời) */
export function StepFrame({ S, st, foot, children }: StepProps & { foot?: ReactNode; children: ReactNode }) {
  const ss = S.state;
  return (
    <>
      <div className="sess">{children}</div>
      <div className="foot">{ss.answered && GRADED.has(st.t) ? <FeedbackBar st={st} ss={ss} isTest={S.kind === 'test'} /> : foot}</div>
    </>
  );
}
/** Trong bài kiểm tra và chưa trả lời: ẩn gợi ý, hình, tiếng Việt */
export const strict = (S: Session) => S.kind === 'test' && !S.state.answered;
