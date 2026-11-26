// Chấm Viết / Nói theo 4 tiêu chí kiểu IELTS (ước tính bằng luật + LanguageTool, không thay giám khảo thật).
import { lookup } from './lex';
import { checkGrammar, type GrammarIssue } from './sentence';

const LINKERS = ['however', 'therefore', 'moreover', 'furthermore', 'in addition', 'for example', 'for instance', 'on the other hand', 'in contrast',
  'although', 'because', 'since', 'so', 'but', 'and', 'also', 'firstly', 'secondly', 'finally', 'in conclusion', 'as a result', 'whereas', 'while',
  'consequently', 'nevertheless', 'besides', 'overall', 'to sum up', 'in my opinion', 'i believe', 'such as', 'then', 'after that', 'when', 'if', 'unless'];
const COMPLEX = /\b(which|who|whom|whose|that|although|though|while|whereas|unless|if|because|since|when|before|after|until)\b/i;
const FILLERS = /\b(um+|uh+|er+|erm|hmm+|like|you know|i mean|kind of|sort of)\b/gi;
const STOP = new Set('the a an and or but to of in on at for with is are was were be been am i you he she it we they my your his her our their this that these those do does did have has had not no so as by from'.split(' '));

export interface Criterion { name: string; band: number; notes: string[] }
export interface CoachResult { band: number; criteria: Criterion[]; issues: GrammarIssue[]; words: number; offline: boolean; stats: Record<string, string | number> }

const clamp = (b: number) => Math.max(3, Math.min(9, Math.round(b * 2) / 2));
const half = (x: number) => Math.round(x * 2) / 2;

function lexical(text: string) {
  const words = (text.toLowerCase().match(/[a-z']+/g) || []);
  const content = words.filter((w) => !STOP.has(w) && w.length > 2);
  const uniq = new Set(content);
  const academic = [...uniq].filter((w) => lookup(w)?.awl);
  const long = content.filter((w) => w.length >= 8).length;
  return { words, content, uniq, academic, long, ttr: content.length ? uniq.size / content.length : 0 };
}

/** Chấm bài viết. minWords: 150 (Task 1), 250 (Task 2), nhỏ hơn cho bài luyện */
export async function coachWriting(text: string, minWords = 150): Promise<CoachResult> {
  const t = text.trim(), L = lexical(t), n = L.words.length;
  const sents = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const paras = t.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const low = ' ' + t.toLowerCase() + ' ';
  const linkers = LINKERS.filter((l) => low.includes(' ' + l + ' ') || low.includes(' ' + l + ','));
  const complex = sents.filter((s) => COMPLEX.test(s)).length;
  let issues: GrammarIssue[] = [], offline = false;
  try { issues = t ? await checkGrammar(t) : []; } catch { offline = true; }
  const errPer100 = n ? (issues.length / n) * 100 : 0;
  const lens = sents.map((s) => (s.match(/[A-Za-z']+/g) || []).length), avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;

  const tr = clamp(4 + Math.min(1, n / minWords) * 3 + (paras >= 3 ? 1 : paras >= 2 ? 0.5 : 0) + (n >= minWords ? 0.5 : -1));
  const cc = clamp(4 + Math.min(3, linkers.length * 0.5) + (paras >= 3 ? 1 : 0) + (sents.length >= 4 ? 0.5 : 0));
  const lr = clamp(3.5 + L.ttr * (n < 80 ? 1.5 : 3) + Math.min(1.5, L.academic.length * 0.3) + Math.min(1, L.long / Math.max(1, n) * 10));
  const gra = clamp(8.5 - errPer100 * 0.6 + (complex / Math.max(1, sents.length)) * 1.5 - (avg < 7 ? 1.5 : 0));
  const criteria: Criterion[] = [
    { name: 'Đủ ý, đủ độ dài (Task Response)', band: tr, notes: [`${n}/${minWords} từ`, `${paras} đoạn`, n < minWords ? `Viết thêm ${minWords - n} từ.` : 'Đủ độ dài.'] },
    { name: 'Mạch lạc, liên kết (Coherence)', band: cc, notes: [linkers.length ? `Từ nối đã dùng: ${linkers.join(', ')}` : 'Chưa có từ nối. Thử: however, because, for example, in addition.', paras < 3 ? 'Nên chia 3–4 đoạn: mở bài, thân bài, kết luận.' : 'Chia đoạn tốt.'] },
    { name: 'Vốn từ (Lexical Resource)', band: lr, notes: [`Độ đa dạng từ: ${Math.round(L.ttr * 100)}%`, L.academic.length ? `Từ học thuật: ${L.academic.slice(0, 10).join(', ')}` : 'Chưa dùng từ học thuật (AWL). Thử: significant, approach, benefit, issue.'] },
    { name: 'Ngữ pháp (Grammar)', band: gra, notes: [`${issues.length} lỗi (${errPer100.toFixed(1)} lỗi/100 từ)`, `${complex}/${sents.length} câu phức`, avg < 7 ? 'Câu còn ngắn, thử nối bằng because, which, although.' : `Độ dài câu trung bình ${avg.toFixed(1)} từ.`] },
  ];
  // Bài ngắn không thể đạt điểm cao (IELTS chấm bài 150/250 từ): trần điểm theo số từ
  const cap = 3.5 + n / 45;
  if (cap < 9) criteria.push({ name: 'Giới hạn theo độ dài', band: clamp(cap), notes: [`Bài ${n} từ: điểm tổng tối đa khoảng ${clamp(cap).toFixed(1)}. Viết dài hơn (150–250 từ) để được chấm đầy đủ.`] });
  return { band: half(Math.min((tr + cc + lr + gra) / 4, cap)), criteria, issues, words: n, offline, stats: { words: n, sentences: sents.length, paragraphs: paras } };
}

/** Chấm bài nói từ chữ máy nghe được + thời gian nói (giây) */
export async function coachSpeaking(transcript: string, seconds: number): Promise<CoachResult> {
  const raw = transcript.trim(), L = lexical(raw), n = L.words.length;
  const fillers = (raw.match(FILLERS) || []).length;
  const wpm = seconds > 0 ? Math.round((n / seconds) * 60) : 0;
  const text = raw ? raw[0].toUpperCase() + raw.slice(1) + (/[.!?]$/.test(raw) ? '' : '.') : '';
  let issues: GrammarIssue[] = [], offline = false;
  try { issues = text ? (await checkGrammar(text)).filter((i) => !/^Lỗi (viết hoa|dấu câu)/.test(i.kind)) : []; } catch { offline = true; }
  const errPer100 = n ? (issues.length / n) * 100 : 0;
  const complex = COMPLEX.test(raw) ? 1 : 0;
  const fl = clamp(wpm < 40 ? 3.5 : wpm < 70 ? 4.5 : wpm < 95 ? 5.5 : wpm < 120 ? 6.5 : wpm < 150 ? 7.5 : 8) - Math.min(1.5, fillers * 0.3) + (n >= 40 ? 0.5 : n < 15 ? -1 : 0);
  const lr = clamp(3.5 + L.ttr * 3 + Math.min(1.5, L.academic.length * 0.4) + Math.min(1, L.long / Math.max(1, n) * 10));
  const gra = clamp(8 - errPer100 * 0.6 + complex - (n < 15 ? 1.5 : 0));
  const criteria: Criterion[] = [
    { name: 'Trôi chảy (Fluency)', band: clamp(fl), notes: [`${wpm} từ/phút`, `${n} từ trong ${Math.round(seconds)} giây`, fillers ? `${fillers} từ đệm (um, uh, like…), cố gắng giảm.` : 'Không có từ đệm 👍', n < 40 ? 'Câu trả lời nên dài hơn: nêu ý, giải thích, cho ví dụ.' : ''].filter(Boolean) },
    { name: 'Vốn từ (Lexical Resource)', band: lr, notes: [`Độ đa dạng: ${Math.round(L.ttr * 100)}%`, L.academic.length ? `Từ hay: ${L.academic.slice(0, 8).join(', ')}` : 'Thử dùng thêm từ mới đã học.'] },
    { name: 'Ngữ pháp (Grammar)', band: gra, notes: [`${issues.length} lỗi máy bắt được`, complex ? 'Có dùng câu phức 👍' : 'Thử nói câu phức: because, which, when, if.'] },
  ];
  const cap = 3.5 + n / 12;
  if (cap < 9) criteria.push({ name: 'Giới hạn theo độ dài', band: clamp(cap), notes: [`Trả lời ${n} từ: điểm tối đa khoảng ${clamp(cap).toFixed(1)}. Nói dài hơn: ý chính, lý do, ví dụ.`] });
  const main = criteria.filter((c) => c.name !== 'Giới hạn theo độ dài');
  return { band: half(Math.min(main.reduce((a, c) => a + c.band, 0) / main.length, cap)), criteria, issues, words: n, offline, stats: { wpm, fillers, words: n } };
}
