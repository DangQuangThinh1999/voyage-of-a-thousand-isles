// Móc kiểm thử: window.__app cho Playwright đọc trạng thái và đáp án. Không có trong bản build thường.
import { UNITS, unitById } from './data';
import { buildTest, makeFix, paraChecks } from './lib/exercises';
import { scoreSpeech, checkTyped, tokens } from './lib/text';
import { dayKey } from './lib/util';
import { answer, beginStep, startSession, startTest } from './state/session';
import { app, emit, go, save, type Screen } from './state/store';

export function install() {
  (window as unknown as { __app: unknown }).__app = {
    app, emit, save, go: (s: Screen, a?: string) => go(s, a ?? null), startSession, startTest, answer, beginStep,
    UNITS, unitById, buildTest, makeFix, paraChecks, scoreSpeech, checkTyped, tokens, dayKey,
    get S() { return app.S; }, get P() { return app.P; },
  };
}
