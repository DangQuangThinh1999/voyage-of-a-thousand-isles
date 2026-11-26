// Tạo bài luyện mới bằng AI (/api/gen): chủ đề đa dạng (IELTS, nhiều quốc gia, môi trường, khoa học, công sở đa quốc gia…),
// thể loại khác nhau mỗi lần, đúng cấp độ CEFR. Lưu các bài đã tạo trên máy để làm lại và tránh trùng đề.
import { pick1 } from './util';

export type GenKind = 'reading' | 'listening' | 'speaking' | 'writing';
export const LEVELS_GEN: [cefr: string, band: string, label: string][] = [
  ['A1', '2.0–3.0', 'Mới bắt đầu'], ['A2', '3.5–4.0', 'Sơ cấp'], ['B1', '4.5–5.5', 'Trung cấp'],
  ['B2', '6.0–6.5', 'Trung cao'], ['C1', '7.0–8.0', 'Cao cấp'], ['C2', '8.5–9.0', 'Thành thạo'],
];

/** Ngân hàng chủ đề: [icon, tên tiếng Việt, các góc nhìn cụ thể để AI chọn] */
export const TOPICS: [string, string, string[]][] = [
  ['🌍', 'Môi trường & khí hậu', ['climate change policy in a Nordic country', 'plastic pollution in Southeast Asian rivers', 'coral reef restoration in Australia', 'renewable energy transition in Germany', 'urban heat islands and green roofs', 'deforestation in the Amazon and indigenous rights', 'water scarcity in the Middle East', 'electric vehicles in China']],
  ['🔬', 'Khoa học & nghiên cứu', ['a recent study on sleep and memory', 'research on bilingual brains', 'space exploration and Mars missions', 'gene editing ethics', 'the science of habits', 'citizen science projects', 'ocean exploration robots', 'microplastics in the human body']],
  ['💻', 'Công nghệ & AI', ['artificial intelligence at work', 'social media and teenagers', 'remote work technology', 'cybersecurity for small businesses', 'smart cities in South Korea', 'digital privacy laws in Europe', 'online learning platforms', 'self-driving cars']],
  ['💼', 'Công việc & doanh nghiệp đa quốc gia', ['working in a multinational company', 'cross-cultural communication at work', 'a job interview', 'startups in Singapore and Vietnam', 'the four-day work week in the UK', 'leadership styles in Japan and the US', 'negotiating a business deal', 'customer service complaints']],
  ['🏥', 'Sức khỏe & y tế', ['mental health at work', 'healthy diets around the world', 'public healthcare in Canada', 'ageing populations in Japan', 'exercise and longevity', 'pandemic preparedness', 'fast food and children']],
  ['🎓', 'Giáo dục', ['studying abroad in the UK', 'homeschooling', 'university fees around the world', 'learning a second language', 'exams vs continuous assessment', 'vocational training in Switzerland', 'technology in classrooms']],
  ['✈️', 'Du lịch & văn hóa', ['overtourism in Venice', 'festivals in India', 'street food culture in Vietnam and Thailand', 'museums and cultural heritage', 'eco-tourism in Costa Rica', 'travelling on a budget', 'cultural etiquette in Japan']],
  ['🏙️', 'Thành phố & đời sống', ['public transport in big cities', 'housing costs for young people', 'living in a small town vs a big city', 'neighbourhood communities', 'noise pollution', 'cycling cities like Amsterdam', 'daily routines of busy workers']],
  ['📰', 'Tin tức & xã hội', ['fake news and media literacy', 'volunteering and charity', 'gender equality at work', 'immigration and multicultural societies', 'crime prevention', 'the gig economy', 'consumerism and shopping habits']],
  ['🎨', 'Nghệ thuật, thể thao & giải trí', ['the Olympic Games and host cities', 'music streaming and artists', 'the role of art in schools', 'e-sports', 'film industries outside Hollywood', 'reading habits in the digital age']],
  ['👨‍👩‍👧', 'Gia đình & cá nhân', ['family traditions', 'friendship', 'childhood memories', 'hobbies', 'shopping for clothes', 'my hometown', 'weekend plans']],
  ['🌱', 'Thực phẩm & nông nghiệp', ['lab-grown meat', 'organic farming', 'food waste in supermarkets', 'rice farming in the Mekong Delta', 'vegetarian diets', 'coffee production in Brazil and Vietnam']],
];
const GENRES: Record<GenKind, string[]> = {
  reading: ['news article', 'research summary', 'magazine feature', 'blog post', 'encyclopedia-style text', 'opinion column', 'company report'],
  listening: ['conversation between two friends', 'university lecture', 'radio interview', 'podcast segment', 'customer service phone call', 'team meeting at work', 'tour guide talk'],
  speaking: ['IELTS speaking test'], writing: ['IELTS writing task'],
};

const KEY = 'ht55.gen.v1';
export interface GenItem { id: number; kind: GenKind; cefr: string; topic: string; title: string; data: any } // eslint-disable-line @typescript-eslint/no-explicit-any
function load(): GenItem[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export const genHistory = (kind: GenKind) => load().filter((x) => x.kind === kind);

/** Tạo bài mới. topicIdx = -1 là chủ đề ngẫu nhiên. */
export async function generate(kind: GenKind, cefr: string, topicIdx: number): Promise<GenItem> {
  const lv = LEVELS_GEN.find((l) => l[0] === cefr) || LEVELS_GEN[1];
  const T = topicIdx >= 0 ? TOPICS[topicIdx] : pick1(TOPICS);
  const angle = pick1(T[2]), genre = pick1(GENRES[kind]);
  const avoid = genHistory(kind).slice(0, 10).map((x) => x.title);
  const r = await fetch('/api/gen', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, cefr: lv[0], band: lv[1], topic: `${angle} (genre: ${genre})`, avoid }),
  }).catch(() => { throw new Error('Không kết nối được. Kiểm tra mạng rồi thử lại.'); });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error === 'not_configured' ? 'Chưa cài khóa AI trên máy chủ.' : d.error === 'quota' ? 'AI miễn phí đã hết lượt hôm nay, mai thử lại nhé.' : 'AI đang bận, thử lại sau ít phút.');
  const title = d.title || d.prompt?.slice(0, 60) || d.part2?.cue || angle;
  const item: GenItem = { id: Date.now(), kind, cefr: lv[0], topic: `${T[0]} ${T[1]}`, title, data: d };
  try { localStorage.setItem(KEY, JSON.stringify([item, ...load()].slice(0, 40))); } catch { /* bỏ qua */ }
  return item;
}
