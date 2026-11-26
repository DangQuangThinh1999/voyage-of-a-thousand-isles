// Phiên âm cho mọi từ / câu và danh sách từ cùng nghĩa (data/extra, tải một lần khi mở app).
import ipaUrl from '../../data/extra/ipa.json?url';
import sameUrl from '../../data/extra/same.json?url';

let IPA: Record<string, string> = {}, SAME: Record<string, string[]> = {};
let ready: Promise<void> | null = null;
export const loadLex = () => (ready ||= Promise.all([
  fetch(ipaUrl).then((r) => r.json()).then((d) => { IPA = d; }),
  fetch(sameUrl).then((r) => r.json()).then((d) => { SAME = d; }),
]).then(() => undefined).catch(() => undefined));

const CONTR: Record<string, string> = {
  "i'm": 'aɪm', "you're": 'jɔː', "we're": 'wɪə', "they're": 'ðeə', "it's": 'ɪts', "that's": 'ðæts', "what's": 'wɒts', "there's": 'ðeəz',
  "he's": 'hiːz', "she's": 'ʃiːz', "don't": 'dəʊnt', "doesn't": 'ˈdʌznt', "didn't": 'ˈdɪdnt', "can't": 'kɑːnt', "won't": 'wəʊnt',
  "isn't": 'ˈɪznt', "aren't": 'ɑːnt', "wasn't": 'ˈwɒznt', "weren't": 'wɜːnt', "i'll": 'aɪl', "you'll": 'juːl', "let's": 'lets',
  "i've": 'aɪv', "i'd": 'aɪd', "couldn't": 'ˈkʊdnt', "shouldn't": 'ˈʃʊdnt', "haven't": 'ˈhævnt', "hasn't": 'ˈhæznt',
};
const strip = (s: string) => s.replace(/^\/|\/$/g, '');
/** Phiên âm một từ (thử thêm các dạng -s, -ed, -ing đơn giản). Không có thì trả về undefined. */
export function wordIpa(w: string): string | undefined {
  const t = w.toLowerCase().replace(/[’]/g, "'");
  if (CONTR[t]) return CONTR[t];
  if (IPA[t]) return strip(IPA[t]);
  const b = (x: string) => IPA[x] && strip(IPA[x]);
  let m: string | undefined;
  if (t.endsWith("'s") && (m = b(t.slice(0, -2)))) return m + 'z';
  if (t.endsWith('ies') && (m = b(t.slice(0, -3) + 'y'))) return m.replace(/i$/, '') + 'iz';
  if (t.endsWith('es') && (m = b(t.slice(0, -2)))) return m + 'ɪz';
  if (t.endsWith('s') && (m = b(t.slice(0, -1)))) return m + (/[ptkfθ]$/.test(m) ? 's' : 'z');
  if (t.endsWith('ied') && (m = b(t.slice(0, -3) + 'y'))) return m + 'd';
  if (t.endsWith('ed') && ((m = b(t.slice(0, -2))) || (m = b(t.slice(0, -1))))) return m + (/[td]$/.test(m) ? 'ɪd' : /[pkfsʃʧθ]$/.test(m) ? 't' : 'd');
  if (t.endsWith('ing') && ((m = b(t.slice(0, -3))) || (m = b(t.slice(0, -3) + 'e')) || (m = b(t.slice(0, -4))))) return m + 'ɪŋ';
  if (t.endsWith('ly') && (m = b(t.slice(0, -2)))) return m + 'li';
  return undefined;
}
/** Phiên âm cả câu: từ nào không tra được thì giữ nguyên chữ */
export function sentenceIpa(s: string): string {
  const parts = s.replace(/[’]/g, "'").split(/\s+/).map((tok) => tok.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')).filter(Boolean);
  // Trong câu, các từ nhỏ đọc nhẹ (dạng yếu) như người bản xứ: a /ə/, the /ðə/, to /tə/…
  const WEAK: Record<string, string> = { a: 'ə', an: 'ən', the: 'ðə', to: 'tə', of: 'əv', and: 'ənd', for: 'fə', at: 'ət', from: 'frəm', but: 'bət', than: 'ðən' };
  return '/' + parts.map((p) => (parts.length > 1 && WEAK[p.toLowerCase()]) || wordIpa(p) || p.toLowerCase()).join(' ') + '/';
}
/** Các từ cùng nghĩa (theo nghĩa tiếng Việt) để chấm đúng khi người học gõ từ khác nhưng cùng nghĩa */
export const sameAs = (w: string): string[] => SAME[w.toLowerCase()] || [];
