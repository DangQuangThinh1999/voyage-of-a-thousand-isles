// Chấm câu người học tự viết với một từ mới:
// 1) luật của app (dùng đúng từ, đủ dài, chữ hoa, dấu câu, không chép câu mẫu, không có tiếng Việt)
// 2) LanguageTool (dịch vụ mở, miễn phí) bắt lỗi ngữ pháp và chính tả. Mất mạng thì chỉ dùng luật.
import type { BankWord } from '../data/bank';
import type { Check } from './exercises';
import { norm } from './text';

export interface GrammarIssue { msg: string; bad: string; fix: string[]; kind: string }

const KIND_VI: Record<string, string> = {
  GRAMMAR: 'Lỗi ngữ pháp', TYPOS: 'Lỗi chính tả', CASING: 'Lỗi viết hoa', PUNCTUATION: 'Lỗi dấu câu',
  CONFUSED_WORDS: 'Dùng nhầm từ', COLLOCATIONS: 'Kết hợp từ chưa tự nhiên', SEMANTICS: 'Câu chưa hợp nghĩa', MISC: 'Lỗi khác',
};
export interface SentenceResult { ok: boolean; checks: Check[]; issues: GrammarIssue[]; offline: boolean; copied?: boolean }

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

async function grammar(text: string): Promise<GrammarIssue[]> {
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
      .map((m) => ({ msg: m.message, bad: text.slice(m.offset, m.offset + m.length), fix: m.replacements.slice(0, 3).map((x) => x.value), kind: KIND_VI[m.rule.category.id] || 'Lỗi' }));
  } finally { clearTimeout(timer); }
}

export async function checkSentence(text: string, w: BankWord): Promise<SentenceResult> {
  const checks = ruleChecks(text, w);
  if (!checks.every(([ok]) => ok)) return { ok: false, checks, issues: [], offline: false };
  try {
    const issues = await grammar(text.trim());
    return { ok: issues.length === 0, checks, issues, offline: false, copied: norm(text) === norm(w.ex) };
  } catch {
    return { ok: true, checks, issues: [], offline: true, copied: norm(text) === norm(w.ex) };
  }
}
