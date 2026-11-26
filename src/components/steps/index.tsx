import type { ComponentType } from 'react';
import type { Step, StepType } from '../../lib/exercises';
import { FixStep } from './FixStep';
import { GapStep } from './GapStep';
import { LearnStep } from './LearnStep';
import { LQuestionStep } from './LQuestionStep';
import { ParaStep } from './ParaStep';
import { PassageStep } from './PassageStep';
import { PickEnStep } from './PickEnStep';
import { PickSentenceStep } from './PickSentenceStep';
import { PickWordStep } from './PickWordStep';
import { QuestionStep } from './QuestionStep';
import { SpeakStep } from './SpeakStep';
import { SpellStep } from './SpellStep';
import type { StepProps } from './StepFrame';
import { TilesStep } from './TilesStep';
import { TypeStep } from './TypeStep';

/** Mỗi dạng câu hỏi ↔ một component */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STEP_VIEWS: Record<StepType, ComponentType<StepProps<any>>> = {
  gap: GapStep, learn: LearnStep, pickWord: PickWordStep, pickEn: PickEnStep, pickSentence: PickSentenceStep,
  dictation: TilesStep, build: TilesStep, spell: SpellStep, type: TypeStep, speak: SpeakStep, fix: FixStep,
  lquestion: LQuestionStep, passage: PassageStep, question: QuestionStep, para: ParaStep,
};
export type { Step };
