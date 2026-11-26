// Chấm câu người học tự viết với một từ mới:
// 1) luật của app (dùng đúng từ, đủ dài, chữ hoa, dấu câu, không chép câu mẫu, không có tiếng Việt)
// 2) LanguageTool (dịch vụ mở, miễn phí) bắt lỗi ngữ pháp và chính tả. Mất mạng thì chỉ dùng luật.
import type { BankWord } from '../data/bank';
import type { Check } from './exercises';
import { norm } from './text';

export interface GrammarIssue { msg: string; bad: string; fix: string[]; kind: string; off?: number; len?: number }

const KIND_VI: Record<string, string> = {
  GRAMMAR: 'Lỗi ngữ pháp', TYPOS: 'Lỗi chính tả', CASING: 'Lỗi viết hoa', PUNCTUATION: 'Lỗi dấu câu',
  CONFUSED_WORDS: 'Dùng nhầm từ', COLLOCATIONS: 'Kết hợp từ chưa tự nhiên', SEMANTICS: 'Câu chưa hợp nghĩa', MISC: 'Lỗi khác',
};
export interface SentenceResult { ok: boolean; checks: Check[]; issues: GrammarIssue[]; offline: boolean; copied?: boolean; warnings?: string[] }

const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Các dạng thường gặp của một từ: -s, -es, -ed, -ing, -ies, -ied, -er, -est, -ly, gấp đôi phụ âm cuối */
export function wordForms(w: string, extra: string[] = []): Set<string> {
  const s = new Set([w, ...extra].map((x) => x.toLowerCase()));
  const b = w.toLowerCase();
  for (const suf of ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', 'ly', 'r', 'st']) s.add(b + suf);
  if (b.endsWith('y')) for (const suf of ['ies', 'ied', 'ier', 'iest', 'ily']) s.add(b.slice(0, -1) + suf);
  if (b.endsWith('e')) for (const suf of ['ing', 'ed']) s.add(b.slice(0, -1) + suf);
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(b)) for (const suf of ['ed', 'ing', 'er', 'est']) s.add(b + b.slice(-1) + suf);
  return s;
}

export function ruleChecks(text: string, w: BankWord): Check[] {
  const t = text.trim(), words = t.match(/[A-Za-z']+/g) || [];
  const forms = wordForms(w.w, w.forms);
  const used = w.w.includes(' ') ? norm(t).includes(norm(w.w)) : words.some((x) => forms.has(x.toLowerCase()));
  return [
    [used, `Có dùng từ “${w.w}” (hoặc dạng chia của nó)`],
    [words.length >= 5, `Ít nhất 5 từ (đang có ${words.length})`],
    [/^[A-Z]/.test(t), 'Bắt đầu bằng chữ in hoa'],
    [/[.!?]$/.test(t), 'Kết thúc bằng dấu . ? hoặc !'],
    [!/\bi\b/.test(t), 'Chữ “I” (tôi) luôn viết hoa'],
    [!VI_RE.test(t), 'Chỉ viết tiếng Anh'],
  ];
}

export async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'en-US' }),
    });
    if (!r.ok) throw new Error('LanguageTool ' + r.status);
    const d = (await r.json()) as { matches: { message: string; offset: number; length: number; replacements: { value: string }[]; rule: { issueType: string; category: { id: string } } }[] };
    return d.matches
      .filter((m) => !['style', 'locale-violation', 'whitespace'].includes(m.rule.issueType))
      .map((m) => ({ msg: m.message, bad: text.slice(m.offset, m.offset + m.length), fix: m.replacements.slice(0, 3).map((x) => x.value), kind: KIND_VI[m.rule.category.id] || 'Lỗi', off: m.offset, len: m.length }));
  } finally { clearTimeout(timer); }
}

export async function checkSentence(text: string, w: BankWord): Promise<SentenceResult> {
  const checks = ruleChecks(text, w);
  if (!checks.every(([ok]) => ok)) return { ok: false, checks, issues: [], offline: false };
  try {
    const issues = await checkGrammar(text.trim());
    return { ok: issues.length === 0, checks, issues, offline: false, copied: norm(text) === norm(w.ex), warnings: softWarnings(text) };
  } catch {
    return { ok: true, checks, issues: [], offline: true, copied: norm(text) === norm(w.ex), warnings: softWarnings(text) };
  }
}

/** Câu đã sửa: áp gợi ý đầu tiên của từng lỗi (từ cuối câu lên để không lệch vị trí) */
export function applyFixes(text: string, issues: GrammarIssue[]): string {
  // Câu có dấu hiệu quá khứ thì ưu tiên gợi ý ở dạng quá khứ (went, had…), không lấy dạng hiện tại (goes, has)
  const past = /\b(yesterday|ago|last (night|week|month|year|summer|time)|in (19|20)\d\d|when i was)\b/i.test(text);
  const pick = (fix: string[]) => (past && fix.find((f) => !/s$/.test(f) && f.toLowerCase() !== 'is' && !/^(do|have)$/i.test(f))) || fix[0];
  let out = text;
  for (const x of [...issues].filter((i) => i.fix.length && i.off !== undefined).sort((a, b) => b.off! - a.off!)) out = out.slice(0, x.off) + pick(x.fix) + out.slice(x.off! + x.len!);
  return out;
}

// ---------- Lớp cảnh báo mềm: đúng ngữ pháp nhưng có thể chưa tự nhiên (KHÔNG tính là sai) ----------
const COUNT_NOUNS = 'family friend photo picture house car phone book job brother sister mother father son daughter teacher doctor student dog cat bag computer room city country company problem question idea table chair window door shop restaurant hotel bank office present gift letter email ticket film movie song game team child baby boy girl man woman person apartment flat bike garden kitchen'.split(' ');
const OK_BARE = /\b(at|to|from) (home|school|work|church|bed|university|college)\b|\bby (car|bus|bike|train|taxi|phone|email)\b|\bin (bed|class|town|hospital|prison)\b/;
export function softWarnings(text: string): string[] {
  const low = ' ' + text.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  const out: string[] = [];
  const re = new RegExp(` (of|with|for|in|on|at|from|about|to|like|is|was|have|has|had|buy|need|want|see|love) (${COUNT_NOUNS.join('|')}) `, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(low))) {
    const frag = `${m[1]} ${m[2]}`;
    if (OK_BARE.test(frag)) continue;
    out.push(`“${frag}”: danh từ đếm được số ít “${m[2]}” thường cần từ hạn định đứng trước (a/an, the, my, your…), ví dụ “${m[1]} my ${m[2]}” hoặc “${m[1]} the ${m[2]}”. Câu vẫn có thể đúng trong một số ngữ cảnh.`);
  }
  return [...new Set(out)];
}

// ---------- Câu khác đáp án mẫu nhưng vẫn đúng: đúng ngữ pháp + đủ ý chính ----------
const STOPW = new Set('a an the is are am was were be been to of in on at for and or but i you he she it we they my your his her our their me him us them this that these those do does did not no'.split(' '));
const content = (s: string) => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter((w) => w && !STOPW.has(w));
/** true nếu câu người học khác đáp án mẫu nhưng đủ ý chính (≥80% từ nội dung) và máy chấm không thấy lỗi */
export async function altCorrect(user: string, target: string, same: (w: string) => string[] = () => []): Promise<{ ok: boolean; issues: GrammarIssue[] }> {
  const T = content(target), U = new Set(content(user));
  const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');
  const Us = new Set([...U].map(stem));
  const hit = T.filter((w) => U.has(w) || Us.has(stem(w)) || same(w).some((x) => U.has(x))).length;
  const cover = T.length ? hit / T.length : 1, ratio = content(user).length / Math.max(1, T.length);
  if (cover < 0.8 || ratio < 0.6 || ratio > 1.8) return { ok: false, issues: [] };
  try {
    const issues = (await checkGrammar(user)).filter((i) => /ngữ pháp|chính tả|nhầm từ|viết hoa/i.test(i.kind));
    return { ok: issues.length === 0, issues };
  } catch { return { ok: false, issues: [] }; }
}
