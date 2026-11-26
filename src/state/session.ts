// Bộ máy phiên làm bài: bắt đầu, chấm, xếp lại câu sai, kiểm tra nhanh có giờ, micro.
import { unitById, type Unit } from '../data';
import {
  AUTO_PLAY, BUILD, GRADED, LIMITS, PASS, SKILL_OF_STEP, buildTest, buildVocabSteps, paraChecks, passageText, type Step, type StepOf,
} from '../lib/exercises';
import { bankRange } from '../data/bank';
import { KINDS, SKILL_OF, unitProg, vocabWeekSize, weekUnits, type Kind } from '../lib/progress';
import { addNewWords, promoteWords } from '../lib/srs';
import { hear, micErr, micLive, speak, SR, stopListening } from '../lib/speech';
import { checkTyped, norm, scoreSpeech, tokens } from '../lib/text';
import { dayKey } from '../lib/util';
import { addXP, app, emit, go, inTest, save, toast, type Session, type StepState } from './store';

const newState = (): StepState => ({ answered: false, picked: [], tries: 0, result: null, hint: false, showVi: false, plays: 0 });
const cur = () => app.S as Session;
export const step = (): Step => { const S = cur(); return S.steps[S.i]; };

export function startSession(uid: string, kind: Kind) {
  const u = unitById(uid) as Unit;
  app.S = { u, kind, steps: BUILD[kind](u), i: 0, ok: 0, graded: 0, state: newState(), requeued: new Set(), skill: {} };
  app.curSkill = SKILL_OF[kind]; app.scr = 'session';
  beginStep();
}

export function startTest(units: Unit[], key: string, title: string, vocab: Step[] = []) {
  app.S = { kind: 'test', intro: true, u: units[0], units, key, title, steps: buildTest(units, vocab), i: 0, ok: 0, graded: 0, state: newState(), requeued: new Set(), skill: {} };
  app.scr = 'session'; app.scrollReq = 'top'; emit();
}
/** Bắt đầu kiểm tra nhanh theo tuần (w) hoặc theo bài (uid). Cần micro (Chrome/Edge). */
export function startQuickTest({ w, u }: { w?: number | string; u?: string }) {
  if (!SR) { toast('Bài kiểm tra có phần Nói, cần mở bằng Chrome hoặc Edge và cho phép micro'); return; }
  if (w) {
    // Từ vựng của tuần trong kho từ (7 × số từ/ngày) + từ các tuần trước
    const size = vocabWeekSize(app.P), n = +w;
    Promise.all([bankRange((n - 1) * size, n * size), bankRange(0, (n - 1) * size)])
      .then(([week, earlier]) => startTest(weekUnits(n), 'w' + n, `Tuần ${n}`, buildVocabSteps(week, earlier)))
      .catch(() => startTest(weekUnits(n), 'w' + n, `Tuần ${n}`));
  }
  else if (u) { const unit = unitById(u) as Unit; startTest([unit], 'u' + u, `bài ${unit.title}`); }
}

export function beginTest() { cur().intro = false; beginStep(); }

const correctIdxOf = (st: Step): number | undefined => {
  switch (st.t) {
    case 'pickWord': case 'pickEn': return st.opts.indexOf(st.w);
    case 'pickSentence': return st.opts.indexOf(st.s);
    case 'gap': return st.opts.indexOf(st.answer);
    case 'question': case 'lquestion': return st.q[3];
    default: return undefined;
  }
};

export function beginStep() {
  const S = cur(), st = step();
  S.state = newState();
  const test = S.kind === 'test' && st;
  if (st) S.state.correctIdx = correctIdxOf(st);
  if (test) {
    S.state.deadline = Date.now() + (LIMITS[st.t] || 60) * 1000;
    if (AUTO_PLAY.has(st.t) && !(st.t === 'lquestion' && S.i > 0 && S.steps[S.i - 1].t === 'lquestion')) S.state.plays = 1;
  }
  app.scrollReq = 'top';
  emit();
  if (!st) return;
  if (test) startTimer();
  if (S.kind === 'test') app.curSkill = SKILL_OF_STEP[st.t] || null;
  if (st.t === 'learn' || st.t === 'pickWord') speak(st.w[0]);
  if (st.t === 'pickSentence' || st.t === 'dictation') speak(st.s[0]);
  if (st.t === 'lquestion' && (S.i === 0 || S.steps[S.i - 1].t !== 'lquestion')) speak(passageText(st.u));
}

function startTimer() {
  const S = cur(), ss = S.state;
  const id = setInterval(() => {
    if (app.S !== S || S.state !== ss || ss.answered) { clearInterval(id); return; }
    const left = Math.ceil(((ss.deadline || 0) - Date.now()) / 1000);
    if (left <= 0) { clearInterval(id); if (step().t === 'para') submitPara(true); else answer(false, 'Hết giờ ⏰'); }
  }, 250);
}

export function answer(correct: boolean, fb?: string | null) {
  const S = cur(), st = step();
  S.state.answered = true; S.state.correct = correct; S.state.fb = fb;
  if (GRADED.has(st.t)) {
    if (!S.requeued.has(S.i)) { S.graded++; if (correct) S.ok++; }
    if (S.kind === 'test') { const k = SKILL_OF_STEP[st.t]!, v = S.skill[k] || (S.skill[k] = [0, 0]); v[1]++; if (correct) v[0]++; }
    if (!correct && S.kind !== 'test' && !S.requeued.has(S.i) && st.t !== 'speak') { S.requeued.add(S.steps.length); S.steps.push(st); S.state.pushed = true; }
  }
  emit();
  let say: string | undefined;
  switch (st.t) {
    case 'pickEn': case 'spell': say = st.w[0]; break;
    case 'type': case 'build': case 'dictation': case 'pickSentence': case 'fix': say = st.s[0]; break;
    case 'gap': say = st.s[0].replace('_____', st.answer); break;
  }
  if (say) speak(say);
}

export function nextStep() { const S = cur(); S.i++; if (S.i >= S.steps.length) finishSession(); else beginStep(); }

function finishSession() {
  const S = cur();
  if (S.kind === 'test') { finishTest(); return; }
  const { u, kind } = S;
  const xp = 10 + S.ok * 2;
  unitProg(app.P, u.id)[kind] = 1;
  if (kind === 'vocab') addNewWords(app.P, u.words.map(([en]) => en));
  S.done = { xp };
  addXP(xp);
}

function finishTest() {
  const S = cur(), P = app.P, key = S.key as string;
  const pct = S.graded ? S.ok / S.graded : 0, passed = pct >= PASS;
  if (!P.tests) P.tests = {};
  const prev = P.tests[key] || { best: 0, passed: false };
  P.tests[key] = { best: Math.max(prev.best || 0, Math.round(pct * 100)), passed: !!(prev.passed || passed), date: dayKey() };
  if (passed) {
    for (const u of S.units || []) {
      const up = unitProg(P, u.id); KINDS.forEach(([k]) => { up[k] = 1; });
      promoteWords(P, u.words.map(([en]) => en));
    }
  }
  const xp = 5 + S.ok * 2;
  S.done = { xp, passed, pct: Math.round(pct * 100) };
  addXP(xp);
}

export function quit() {
  if (confirm('Thoát bài này? Kết quả phần này sẽ không được lưu.')) { const id = cur().u.id; app.S = null; go('unit', id); }
}

// ---------- các thao tác trả lời ----------
export function pick(i: number) { const ss = cur().state; if (ss.answered) return; ss.pickedIdx = i; answer(i === ss.correctIdx); }
export function tile(b: number) { cur().state.picked.push(b); emit(); }
export function unpick(n: number) { cur().state.picked.splice(n, 1); emit(); }
export function checkTiles() {
  const st = step() as StepOf<'dictation' | 'build'>, got = cur().state.picked.map((i) => st.bank[i]).join(' ');
  answer(norm(got) === norm(tokens(st.s[0]).join(' ')));
}
export function hint() { cur().state.hint = true; emit(); }
export function checkType() {
  const S = cur(), st = step() as StepOf<'spell' | 'type' | 'dictation'>, v = (S.state.typed || '').trim(); if (!v) return;
  S.state.typed = v;
  const target = st.t === 'spell' ? st.w[0] : st.s[0], r = checkTyped(v, target);
  if (S.kind === 'test' && st.t !== 'spell' && r !== 'bad' && (!/^[A-Z]/.test(v) || v.slice(-1) !== target.slice(-1))) {
    answer(false, `Sai hình thức: câu phải viết hoa chữ cái đầu và kết thúc bằng dấu “${target.slice(-1)}”`); return;
  }
  if (S.kind === 'test' && r === 'almost') { answer(false, 'Sai chính tả (bài kiểm tra cần viết đúng hoàn toàn)'); return; }
  answer(r !== 'bad', r === 'almost' ? 'Gần đúng! Chú ý chính tả:' : null);
}
export function overrule() {
  const S = cur();
  if (S.state.pushed) { S.steps.pop(); S.requeued.delete(S.steps.length); }
  if (!S.requeued.has(S.i)) S.ok++;
  nextStep();
}
export function fixPick(i: number) { cur().state.fixI = i; emit(); }
export function checkFix() {
  const ss = cur().state, st = step() as StepOf<'fix'>, v = (ss.typed || '').trim(); if (!v) return;
  ss.typed = v;
  const ok = ss.fixI === st.i && norm(v) === norm(st.right);
  answer(ok, (ok ? 'Chính xác! ' : 'Chưa đúng. ') + st.why);
}
export function submitPara(timeout = false) {
  const ss = cur().state, st = step() as StepOf<'para'>, t = (ss.typed || '').trim(); if (!t && !timeout) return;
  ss.typed = t;
  const cs = paraChecks(t, st), bad = cs.filter((c) => !c[0]).length;
  app.P.journal.unshift({ id: Date.now(), d: dayKey(), u: st.u.id, t }); save();
  answer(!bad, bad ? `Đoạn văn chưa đạt ${bad} yêu cầu (xem dấu ❌)` : 'Đoạn văn đạt yêu cầu! 🎉');
}
export function skipSpeak() { answer(false, 'Bỏ qua, lần sau luyện thêm nhé.'); }
export function selfSpeak(ok: boolean) { answer(ok); }
export function toggleVi() { const ss = cur().state; ss.showVi = !ss.showVi; emit(); }
export function showLine(i: number) { const S = cur(); S.state.line = i; emit(); speak(S.u.reading[i][0]); }

/** Nút loa. limited = nút có giới hạn 2 lượt nghe trong bài kiểm tra. */
export function say(text: string, { slow = false, limited = false } = {}) {
  if (limited && inTest() && !cur().state.answered) {
    const ss = cur().state;
    if (ss.plays >= 2) { toast('Hết lượt nghe (tối đa 2 lần)'); return; }
    ss.plays++; emit();
  }
  speak(text, slow);
}

// ---------- micro trong bài ----------
export function mic(target: string) {
  if (!app.S) return;
  if (app.S.state.listening) { stopListening(); return; }
  doMic(target);
}
async function doMic(target: string) {
  const S = cur(), ss = S.state; ss.listening = true; ss.result = null; micLive.reset(); emit();
  try {
    const h = await hear({ onText: micLive.setText, onLevel: micLive.setLevel });
    if (S.state !== ss || ss.answered) return;
    ss.result = { ...scoreSpeech(target, h.alts), heard: h.text };
    ss.audio = h.audio;
    ss.scored = (ss.scored || 0) + 1;
  } catch (e) {
    if (S.state !== ss || ss.answered) return;
    ss.result = { err: micErr(e) };
  }
  ss.listening = false; ss.tries++;
  const st = step();
  if (st.t === 'speak' && ss.result && ss.result.err === undefined) {
    const sc = ss.result.score;
    const test = S.kind === 'test', need = test ? 1 : 0.75;
    if (sc >= need) { answer(true, sc === 1 ? 'Phát âm tuyệt vời! 🎉' : 'Tốt lắm! Từ màu đỏ cần đọc rõ hơn.'); return; }
    if ((ss.scored || 0) >= (test ? 2 : 3)) { answer(false, test ? 'Chưa đạt: bài kiểm tra cần đọc đúng 100% các từ.' : 'Chưa đạt. Nghe lại mẫu và luyện thêm nhé.'); return; }
  }
  emit();
}
