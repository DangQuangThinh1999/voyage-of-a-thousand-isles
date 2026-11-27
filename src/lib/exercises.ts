// Tạo bài tập cho từng phần, bài kiểm tra nhanh, chấm đoạn văn.
import { JOURNAL_PROMPTS, type Pair, type Question, type Unit, type Word } from '../data';
import { firstSense, type BankWord } from '../data/bank';
import type { Kind } from './progress';
import { norm, tokens } from './text';
import { pick1, sample, shuffle } from './util';

interface Base { u?: Unit }
export type Step = Base & (
  | { t: 'learn'; w: Word }
  | { t: 'pickWord'; w: Word; opts: Word[] }
  | { t: 'pickEn'; w: Word; opts: Word[] }
  | { t: 'pickSentence'; s: Pair; opts: Pair[] }
  | { t: 'dictation'; s: Pair; bank: string[] }
  | { t: 'build'; s: Pair; bank: string[] }
  | { t: 'spell'; w: Word }
  | { t: 'type'; s: Pair }
  | { t: 'speak'; en: string; vi: string }
  | { t: 'fix'; toks: string[]; i: number; right: string; why: string; s: Pair }
  | { t: 'lquestion'; q: Question; u: Unit }
  | { t: 'passage' }
  | { t: 'question'; q: Question }
  | { t: 'gap'; s: Pair; answer: string; opts: string[] }
  | ParaStep
);
export interface ParaStep { t: 'para'; u: Unit; units: Unit[]; vocab: string[]; minWords: number; minVocab: number; minSents: number; prompt: string }
export type StepType = Step['t'];
export type StepOf<T extends StepType> = Extract<Step, { t: T }>;

export function distractorWords(u: Unit, target: string, n: number): string[] {
  const have = new Set(tokens(target).map((w) => norm(w)));
  const pool = [...new Set(u.sentences.flatMap(([en]) => tokens(en)))].filter((w) => !have.has(norm(w)));
  return sample(pool, n);
}

// Bài "sửa lỗi sai": lấy câu đúng, đổi 1 từ thành lỗi người Việt hay mắc
const THIRD: Record<string, string> = { works: 'work', wakes: 'wake', goes: 'go', eats: 'eat', reads: 'read', drinks: 'drink', buys: 'buy', wants: 'want',
  cooks: 'cook', visits: 'visit', brings: 'bring', has: 'have', rains: 'rain' };
type Rule = (w: string) => [string, string] | undefined | false;
const BE: Record<string, [string, string]> = { am: ['is', 'Với “I” phải dùng “am” (I am)'], is: ['are', 'Chủ ngữ số ít (he, she, it, this, tên người…) dùng “is”'],
  are: ['is', '“You”, “we”, “they” và danh từ số nhiều dùng “are”'] };
const FIX_RULES: Rule[] = [
  (w) => (Object.prototype.hasOwnProperty.call(BE, w) ? BE[w] : undefined),
  (w) => Object.prototype.hasOwnProperty.call(THIRD, w) && [THIRD[w], 'Chủ ngữ là he/she/it hoặc một người: động từ phải thêm -s/-es (she works, he goes)'],
  (w) => w === 'an' && ['a', 'Trước từ bắt đầu bằng nguyên âm (a, e, i, o, u) phải dùng “an” (an egg)'],
  (w) => w === 'my' && ['me', '“my” = của tôi, đứng trước danh từ (my mother)'],
  (w) => w === 'his' && ['he', '“his” = của anh ấy, đứng trước danh từ (his wife)'],
];
const COUNT = new Set(['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twenty', 'fifty']);
export function makeFix(pair: Pair): StepOf<'fix'> | null {
  const toks = pair[0].split(' '), cands: { i: number; wrong: string; why: string }[] = [];
  toks.forEach((tok, i) => {
    const m = tok.match(/^([A-Za-z']+)(.*)$/); if (!m) return;
    const w = m[1].toLowerCase();
    for (const r of FIX_RULES) { const x = r(w); if (x) cands.push({ i, wrong: x[0], why: x[1] }); }
    if (i > 0 && COUNT.has(toks[i - 1].toLowerCase()) && /[^s]s$/.test(w)) cands.push({ i, wrong: w.slice(0, -1), why: 'Sau số lớn hơn 1, danh từ phải thêm -s (two cats)' });
  });
  if (!cands.length) return null;
  const c = pick1(cands), m = toks[c.i].match(/^([A-Za-z']+)(.*)$/) as RegExpMatchArray;
  const wrong = /^[A-Z]/.test(m[1]) ? c.wrong[0].toUpperCase() + c.wrong.slice(1) : c.wrong;
  const wt = [...toks]; wt[c.i] = wrong + m[2];
  return { t: 'fix', toks: wt, i: c.i, right: m[1], why: c.why, s: pair };
}
export function fixSteps(u: Unit, n: number): StepOf<'fix'>[] {
  const out: StepOf<'fix'>[] = [];
  for (const pair of shuffle([...u.sentences, ...u.reading])) { const f = makeFix(pair); if (f) out.push(f); if (out.length >= n) break; }
  return out;
}
export const passageText = (u: Unit) => u.reading.map((r) => r[0]).join(' ');

const others = <T>(a: T[], x: T) => a.filter((y) => y !== x);
export const BUILD: Record<Kind, (u: Unit) => Step[]> = {
  vocab(u) {
    // chia nhóm ~6 từ: học nhóm → kiểm tra ngay nhóm đó → nhóm tiếp (nhớ tốt hơn học dồn 16 từ rồi mới kiểm tra)
    const out: Step[] = [], n = Math.ceil(u.words.length / 6), size = Math.ceil(u.words.length / n);
    for (let g = 0; g < u.words.length; g += size) {
      const grp = u.words.slice(g, g + size);
      out.push(...grp.map((w): Step => ({ t: 'learn', w })));
      out.push(...shuffle(grp).map((w, i): Step => (i % 2 ? { t: 'pickEn', w, opts: shuffle([w, ...sample(others(u.words, w), 3)]) }
        : { t: 'pickWord', w, opts: shuffle([w, ...sample(others(u.words, w), 3)]) })));
    }
    return out;
  },
  listen(u) {
    const words: Step[] = sample(u.words, 4).map((w) => ({ t: 'pickWord', w, opts: shuffle([w, ...sample(others(u.words, w), 3)]) }));
    const sents: Step[] = sample(u.sentences, 3).map((s) => ({ t: 'pickSentence', s, opts: shuffle([s, ...sample(others(u.sentences, s), 2)]) }));
    const dict: Step[] = sample(u.sentences, 3).map((s) => ({ t: 'dictation', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }));
    const lq: Step[] = sample(u.questions, 2).map((q) => ({ t: 'lquestion', q, u }));
    return [...words, ...sents, ...dict, ...lq];
  },
  speak(u) {
    return [...sample(u.words, 3).map((w): Step => ({ t: 'speak', en: w[0], vi: `${w[2]} ${w[1]}` })),
      ...u.sentences.map((s): Step => ({ t: 'speak', en: s[0], vi: s[1] }))];
  },
  read(u) {
    return [{ t: 'passage' }, ...u.questions.map((q): Step => ({ t: 'question', q }))];
  },
  write(u) {
    const spell: Step[] = sample(u.words, 3).map((w) => ({ t: 'spell', w }));
    const [a, b, c, d, e] = shuffle(u.sentences);
    const build: Step[] = [a, b, c].map((s) => ({ t: 'build', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }));
    return [...spell, ...build, ...fixSteps(u, 2), { t: 'type', s: d }, { t: 'type', s: e }];
  },
};

// ---------- kiểm tra nhanh: biết rồi thì qua luôn ----------
export const PASS = 1; // phải đúng hết mới qua
// Giới hạn thời gian mỗi câu trong bài kiểm tra (giây)
export const LIMITS: Partial<Record<StepType, number>> = { pickWord: 15, pickEn: 15, gap: 30, pickSentence: 20, dictation: 60, lquestion: 60, question: 40, spell: 25, build: 45, type: 60, fix: 40, speak: 45, para: 900 };
export const AUTO_PLAY = new Set<StepType>(['pickWord', 'pickSentence', 'dictation', 'lquestion']);
export const GRADED = new Set<StepType>(['gap', 'pickWord', 'pickEn', 'pickSentence', 'dictation', 'build', 'type', 'spell', 'speak', 'question', 'para', 'fix', 'lquestion']);
export type Skill = 'listen' | 'read' | 'write' | 'speak';
export const SKILL_OF_STEP: Partial<Record<StepType, Skill>> = { gap: 'read', pickWord: 'listen', pickSentence: 'listen', dictation: 'listen', pickEn: 'read', question: 'read', spell: 'write', build: 'write', type: 'write', para: 'write', fix: 'write', lquestion: 'listen', speak: 'speak' };
export const SKILL_NAME: Record<Skill, string> = { listen: '🎧 Nghe', read: '📖 Đọc', write: '✍️ Viết', speak: '🗣️ Nói' };

const MK_spell = (u: Unit): Step => ({ t: 'spell', w: sample(u.words, 1)[0] });

// Đủ 4 kỹ năng. 1 bài: 14 câu. 1 tuần: 21 câu. Thứ tự: câu lẻ → nghe đoạn văn → nói → viết đoạn văn.
export function buildTest(units: Unit[], vocabSteps: Step[] = []): Step[] {
  const one = units.length === 1, lu = pick1(units), allW = units.flatMap((u) => u.words);
  const steps: Step[] = [], speaks: Step[] = [];
  let lsteps: Step[] = [];
  for (const u of units) {
    const pool = shuffle(u.sentences); let k = 0;
    const sent = () => pool[k++ % pool.length];
    const tiles = (t: 'dictation' | 'build', x: Pair): Step => ({ t, s: x, bank: shuffle([...tokens(x[0]), ...distractorWords(u, x[0], 4)]) });
    const six = (w: Word) => shuffle([w, ...sample(allW.filter((x) => x !== w && x[1] !== w[1]), 5)]);
    const mk = {
      pickWord: (): Step => { const w = pick1(u.words); return { t: 'pickWord', w, opts: six(w) }; },
      pickEn: (): Step => { const w = pick1(u.words); return { t: 'pickEn', w, opts: six(w) }; },
      spell: () => MK_spell(u),
      pickSentence: (): Step => { const x = sent(); return { t: 'pickSentence', s: x, opts: shuffle([x, ...sample(u.sentences.filter((y) => y !== x), 2)]) }; },
      dictation: () => tiles('dictation', sent()), build: () => tiles('build', sent()),
      type: (): Step => ({ t: 'type', s: sent() }), fix: (): Step | undefined => fixSteps(u, 1)[0],
    };
    const qs = shuffle(u.questions); // câu 0,1: nghe đoạn văn · câu 2: đọc
    if (u === lu) lsteps = qs.slice(0, 2).map((q) => ({ t: 'lquestion', q, u }));
    const list: (Step | undefined)[] = one
      ? [mk.pickWord(), mk.pickSentence(), mk.dictation(), mk.pickEn(), { t: 'question', q: qs[2] }, mk.spell(), mk.build(), mk.type(), mk.fix()]
      : [mk[pick1(['pickWord', 'pickSentence', 'dictation'] as const)](), u === lu ? mk.pickEn() : pick1([() => mk.pickEn(), (): Step => ({ t: 'question', q: qs[2] })])(),
        mk[pick1(['spell', 'build'] as const)](), mk.type(), mk.fix()];
    steps.push(...list.filter((x): x is Step => !!x).map((x) => ({ ...x, u })));
    for (let n = 0; n < (one ? 2 : 1); n++) { const x = sent(); speaks.push({ t: 'speak', en: x[0], vi: x[1], u }); }
  }
  const vocab = units.flatMap((u) => u.words.map((w) => w[0])).filter((w) => w.length >= 3 && w !== 'you');
  const pu = pick1(units), minWords = one ? 40 : 60;
  const idea = (JOURNAL_PROMPTS[pu.id] || '').replace(/\s*Viết \d+ câu\.?/g, '').replace(/^Viết \d+ câu/, 'Viết').trim();
  const para: ParaStep = { t: 'para', u: pu, units, vocab, minWords, minVocab: one ? 5 : 8, minSents: one ? 5 : 6,
    prompt: `Viết đoạn văn ít nhất ${minWords} từ về chủ đề ${pu.emoji} ${pu.vi}.${idea ? ' Gợi ý: ' + idea : ''}` };
  return [...shuffle([...steps, ...vocabSteps]), ...lsteps, ...speaks, para];
}

// ---------- từ vựng của tuần (kho từ) trong bài kiểm tra tuần ----------
const asWord = (b: BankWord): Word => [b.w, firstSense(b.vi), ''];
const pos0 = (b: BankWord) => b.pos.split(',')[0].trim();
/** Câu ví dụ có chỗ trống thay cho từ (hoặc dạng của nó) */
function blankOut(b: BankWord): { s: string; got: string } | null {
  for (const f of [...b.forms, b.w].sort((x, y) => y.length - x.length)) {
    const re = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const m = b.ex.match(re);
    if (m) return { s: b.ex.replace(re, '_____'), got: m[0] };
  }
  return null;
}
/** Đáp án nhiễu khó: cùng từ loại, độ thông dụng gần nhau */
function near(pool: BankWord[], b: BankWord, n: number, samePos = false): BankWord[] {
  const cand = pool.filter((x) => x.w !== b.w && firstSense(x.vi) !== firstSense(b.vi) && (!samePos || pos0(x) === pos0(b)));
  const list = cand.length >= n ? cand : pool.filter((x) => x.w !== b.w);
  return sample([...list].sort((x, y) => Math.abs(x.r - b.r) - Math.abs(y.r - b.r)).slice(0, n * 4), n);
}
/** 12 câu: nghe chọn nghĩa, chọn từ, điền từ vào câu, tự gõ từ, nghe chép câu; 2 câu ôn từ các tuần trước */
export function buildVocabSteps(week: BankWord[], earlier: BankWord[]): Step[] {
  if (week.length < 12) return [];
  const pool = shuffle(week), take = (k: number) => pool.splice(0, k);
  const six = (b: BankWord, from: BankWord[]) => { const w = asWord(b); return shuffle([w, ...near(from, b, 5).map(asWord)]).map((x) => (x[0] === w[0] ? w : x)); };
  const pickWord = (b: BankWord, from: BankWord[]): Step => { const opts = six(b, from); return { t: 'pickWord', w: opts.find((x) => x[0] === b.w)!, opts }; };
  const pickEn = (b: BankWord, from: BankWord[]): Step => { const opts = six(b, from); return { t: 'pickEn', w: opts.find((x) => x[0] === b.w)!, opts }; };
  const gap = (b: BankWord, from: BankWord[]): Step | null => {
    // Chỉ dùng câu có đúng dạng gốc của từ, để các lựa chọn cùng dạng (không lộ đáp án vì đuôi -ed, -s…)
    const x = blankOut(b); if (!x || x.got.toLowerCase() !== b.w.toLowerCase()) return null;
    // Chỗ trống ở đầu câu: viết hoa mọi lựa chọn để không lộ đáp án
    const cap = /^[A-Z]/.test(x.got) ? (w: string) => w[0].toUpperCase() + w.slice(1) : (w: string) => w;
    return { t: 'gap', s: [x.s, b.exvi], answer: x.got, opts: shuffle([x.got, ...near(from, b, 3, true).map((o) => cap(o.w))]) };
  };
  const steps: (Step | null)[] = [
    ...take(2).map((b) => pickWord(b, week)),
    ...take(2).map((b) => pickEn(b, week)),
    ...take(3).map((b) => gap(b, week) || pickEn(b, week)),
    ...take(2).map((b): Step => ({ t: 'spell', w: asWord(b) })),
  ];
  const d = take(1)[0], others = week.filter((x) => x !== d).flatMap((x) => tokens(x.ex));
  steps.push({ t: 'dictation', s: [d.ex, d.exvi], bank: shuffle([...tokens(d.ex), ...sample(others, 4)]) });
  if (earlier.length >= 12) { const [a, b] = sample(earlier, 2); steps.push(gap(a, earlier) || pickEn(a, earlier), pickWord(b, earlier)); }
  else steps.push(...take(2).map((b) => gap(b, week) || pickEn(b, week)));
  return steps.filter((x): x is Step => !!x);
}

// Chấm đoạn văn bằng luật (máy chưa chấm được ngữ pháp như giáo viên, nhưng bắt được các lỗi hay gặp)
const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ADJ = 'happy sad tired angry hungry scared bored sick hot cold fine good small big new kind free okay expensive cheap beautiful busy late ready young old tall short'.split(' ');
const JOBS = ['student', 'teacher', 'doctor', 'driver'];
const MISS_BE = new RegExp(`\\b(i|you|he|she|it|we|they|this|that) (very )?(${[...ADJ, ...JOBS, ...JOBS.map((j) => 'a ' + j)].join('|')})\\b`);
export type Check = [ok: boolean, msg: string];
export function paraChecks(text: string, st: Pick<ParaStep, 'vocab' | 'units' | 'minWords' | 'minVocab' | 'minSents'>): Check[] {
  const t = text.trim(), words = t.match(/[A-Za-z']+/g) || [];
  const sents = t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  const nt = ' ' + norm(t) + ' ';
  const used = st.vocab.filter((w) => new RegExp(` ${norm(w)}(s|es)? `).test(nt));
  const known = new Set(st.units.flatMap((u) => [...u.sentences, ...u.reading].map((x) => norm(x[0]))));
  const own = sents.filter((x) => !known.has(norm(x)));
  const miss = t.toLowerCase().replace(/[^a-z' ]+/g, ' ').match(MISS_BE);
  return [
    [words.length >= st.minWords, `Ít nhất ${st.minWords} từ (đang có ${words.length})`],
    [sents.length >= (st.minSents || 3), `Ít nhất ${st.minSents || 3} câu (đang có ${sents.length})`],
    [used.length >= st.minVocab, `Dùng ít nhất ${st.minVocab} từ vựng đã học (đang dùng ${used.length}${used.length ? ': ' + used.join(', ') : ''})`],
    [sents.length > 0 && sents.every((x) => /^["']?[A-Z]/.test(x)), 'Mỗi câu bắt đầu bằng chữ in hoa'],
    [sents.length > 0 && sents.every((x) => /[.!?]["']?$/.test(x)), 'Mỗi câu kết thúc bằng dấu . ? hoặc !'],
    [!/\bi\b/.test(t), 'Chữ “I” (tôi) luôn viết hoa'],
    [!VI_RE.test(t), 'Chỉ viết tiếng Anh, không có chữ tiếng Việt'],
    [!miss, miss ? `Thiếu am/is/are ở: “${miss[0]}”` : 'Không thiếu am/is/are (ví dụ: “I am happy”, không viết “I happy”)'],
    [own.length >= 2, `Ít nhất 2 câu tự viết, không chép y câu mẫu (đang có ${own.length})`],
  ];
}
