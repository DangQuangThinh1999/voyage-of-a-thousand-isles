// Chấm câu "hiểu ngữ cảnh": gọi /api/check (Gemini, miễn phí). Chưa cài khóa hoặc lỗi → dùng LanguageTool + luật.
import { applyFixes, checkGrammar, softWarnings } from './sentence';
import { LESSONS } from './grammarLessons';

export type Verdict = 'correct' | 'unnatural' | 'context' | 'incorrect';
export interface SmartCheck {
  status: Verdict; correction: string; better: string[]; explanation: string;
  errors: { wrong: string; right: string; why: string }[]; meaning: string; tip: string; usesWordCorrectly: boolean;
  source: 'ai' | 'lt' | 'offline';
  analysis?: { part: string; role_vi: string }[]; fixes?: { en: string; vi: string }[];
  rules?: { formula: string; examples: { en: string; vi: string }[] }[]; notes?: string[]; conclusion?: string; lessons?: string[];
}
export const VERDICT: Record<Verdict, [icon: string, label: string, cls: string]> = {
  correct: ['✅', 'Đúng và tự nhiên', 'v-ok'],
  unnatural: ['🟡', 'Đúng ngữ pháp, có cách nói tự nhiên hơn', 'v-warn'],
  context: ['🔵', 'Đúng hay không tùy ngữ cảnh', 'v-ctx'],
  incorrect: ['❌', 'Chưa đúng, cần sửa', 'v-bad'],
};

let aiOff = false; // máy chủ chưa cài khóa Gemini → không gọi lại trong phiên này
const KIND_WHY: Record<string, string> = {
  'Lỗi ngữ pháp': 'Sai ngữ pháp (chia động từ, số ít/số nhiều, cấu trúc câu…).',
  'Lỗi chính tả': 'Viết sai chính tả.', 'Lỗi viết hoa': 'Sai chữ hoa (đầu câu, “I”, tên riêng).',
  'Lỗi dấu câu': 'Sai dấu câu.', 'Dùng nhầm từ': 'Dùng nhầm từ có cách viết/đọc gần giống.',
};

export async function smartCheck(sentence: string, opt: { word?: string; meaning?: string; context?: string } = {}): Promise<SmartCheck> {
  if (!aiOff) {
    try {
      const r = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sentence, ...opt, lessons: Object.keys(LESSONS) }) });
      if (r.status === 503 || r.status === 404) aiOff = true;
      else if (r.ok) {
        const d = await r.json();
        if (d && d.status) return { better: [], errors: [], meaning: '', tip: '', correction: '', explanation: '', usesWordCorrectly: true, ...d, source: 'ai' };
      }
    } catch { /* dùng LanguageTool */ }
  }
  try {
    const issues = await checkGrammar(sentence);
    const warn = softWarnings(sentence);
    if (issues.length) {
      return {
        status: 'incorrect', correction: applyFixes(sentence, issues), better: [], meaning: '', tip: '', usesWordCorrectly: true, source: 'lt',
        explanation: [...new Set(issues.map((i) => KIND_WHY[i.kind] || i.kind))].join(' '),
        errors: issues.map((i) => ({ wrong: i.bad, right: i.fix[0] || '', why: i.msg })),
      };
    }
    return { status: warn.length ? 'context' : 'correct', correction: '', better: [], errors: [], meaning: '', tip: '', usesWordCorrectly: true, source: 'lt', explanation: warn.join(' ') || 'Máy không thấy lỗi ngữ pháp, chính tả.' };
  } catch {
    return { status: 'correct', correction: '', better: [], errors: [], meaning: '', tip: '', usesWordCorrectly: true, source: 'offline', explanation: 'Không kết nối được máy chấm, mới kiểm tra theo luật của app.' };
  }
}
