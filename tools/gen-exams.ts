// Soạn sẵn ĐỀ CÓ SẴN (3 đề mỗi tuần 1–12 và mỗi mức band 6.0–9.0) bằng API soạn đề đã deploy (/api/exam, Gemini).
// Chạy: npx esbuild tools/gen-exams.ts --bundle --platform=node --outfile=<tmp>/gen-exams.cjs && node <tmp>/gen-exams.cjs [base-url]
// Ghi vào data/exams/<id>.json (id: w01-1 … w12-3, b6.0-1 … b9.0-3). File đã có thì bỏ qua (chạy lại được nhiều lần).
// Giới hạn ~50 lượt gọi/giờ để chừa lượt cho người dùng app (API giới hạn 60 lượt/giờ mỗi IP).
import fs from 'node:fs';
import path from 'node:path';
import { UNITS, WEEK_GOALS } from '../src/data/a1';
import meta from '../src/data/bank-meta.json';

const ROOT = path.resolve(__dirname.includes('tools') ? path.join(__dirname, '..') : process.cwd());
const OUT = path.join(ROOT, 'data/exams');
const BASE = process.argv[2] || 'https://voyage-of-a-thousand-isles.vercel.app';
const PER_HOUR = 50, GAP = Math.ceil(3600_000 / PER_HOUR);
fs.mkdirSync(OUT, { recursive: true });

const bank: string[] = (meta as { f: string }[]).flatMap(({ f }) => (JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab', f + '.json'), 'utf8')) as { w: string }[]).map((e) => e.w));
const sample = <T>(a: T[], n: number) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
const WORDS_AT: [number, number][] = [[2, 0], [4, 2000], [5.5, 3000], [6.5, 5000], [7.5, 7000], [9, 10000]];
const wordsFor = (b: number) => { for (let i = 1; i < WORDS_AT.length; i++) { const [b1, w1] = WORDS_AT[i - 1], [b2, w2] = WORDS_AT[i]; if (b <= b2) return Math.round(w1 + ((b - b1) / (b2 - b1)) * (w2 - w1)); } return 10000; };
const IELTS_TOPICS = ['education', 'technology', 'environment', 'health', 'work and careers', 'cities and transport', 'culture and traditions', 'media and advertising', 'science and research', 'tourism', 'globalisation', 'crime and law', 'family and society', 'sport', 'food and agriculture', 'art', 'space exploration', 'water and energy'];
const GOAL_AT: Record<string, string> = {
  '6.0': 'Viết Task 2 khoảng 250 từ, đọc bài báo dài, nghe bài giảng ngắn', '6.5': 'Từ vựng học thuật, paraphrase, Speaking Part 3 có lập luận',
  '7.0': 'Câu phức, collocation, đọc nhanh tìm ý chính', '7.5': 'Viết mạch lạc, từ nối đa dạng, nghe nhiều giọng Anh, Úc, Mỹ',
  '8.0': 'Từ vựng ít gặp, thành ngữ, sửa lỗi nhỏ', '8.5': 'Diễn đạt tự nhiên, tranh luận chủ đề khó', '9.0': 'Luyện đề tốc độ cao, hoàn thiện mọi kỹ năng',
};

interface Job { id: string; cefr: string; band: string; topics: string; words: string[] }
const jobs: Job[] = [];
for (const [w, g] of Object.entries(WEEK_GOALS)) {
  const units = UNITS.filter((u) => u.week === +w), size = 70, n = +w;
  const unitWords = units.flatMap((u) => u.words.map(([en]) => en)), week = bank.slice((n - 1) * size, n * size), before = bank.slice(0, (n - 1) * size);
  for (let k = 1; k <= 3; k++) jobs.push({ id: `w${String(w).padStart(2, '0')}-${k}`, cefr: g.cefr, band: g.band, topics: [g.goal, ...units.map((u) => u.title)].join('; '),
    words: [...new Set([...sample(unitWords, 40), ...sample(week, 50), ...sample(before, 40)])] });
}
for (let b = 6; b <= 9.001; b += 0.5) {
  const band = b.toFixed(1), cefr = b <= 6.5 ? 'B2' : b <= 8 ? 'C1' : 'C2', range = bank.slice(wordsFor(b - 0.5), wordsFor(b));
  for (let k = 1; k <= 3; k++) jobs.push({ id: `b${band}-${k}`, cefr, band, topics: [GOAL_AT[band], ...sample(IELTS_TOPICS, 2)].join('; '), words: sample(range, 120) });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function call(part: string, j: Job) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = last + GAP - Date.now(); if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const r = await fetch(BASE + '/api/exam', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ part, cefr: j.cefr, band: j.band, target: '9.0', topics: j.topics, words: j.words }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && !d.error) return d;
      console.log(`  ${j.id}/${part}: ${r.status} ${d.error || ''} → thử lại`);
      if (r.status === 429) await sleep(10 * 60_000);
    } catch (e) { console.log(`  ${j.id}/${part}: lỗi mạng ${(e as Error).message}`); }
  }
  throw new Error('hết lượt thử');
}
const okQ = (q: { type: string; options: string[]; answer: number; answer_text: string }) => (q.type === 'type' ? !!q.answer_text : Array.isArray(q.options) && q.answer >= 0 && q.answer < q.options.length);

(async () => {
  const todo = jobs.filter((j) => !fs.existsSync(path.join(OUT, j.id + '.json')));
  console.log(`Cần soạn ${todo.length}/${jobs.length} đề (~${Math.ceil((todo.length * 3) / PER_HOUR * 60)} phút)`);
  for (const j of todo) {
    try {
      const lr = await call('lr', j), vg = await call('vg', j), ws = await call('ws', j);
      // bỏ câu gõ đáp án là tên người / tên riêng
      const noName = (qs: { type: string; q: string; answer_text: string }[]) => qs.filter((q) => q.type !== 'type' || !q.answer_text.split('|').some((a) => /^[A-Z][a-z'-]+( [A-Z][a-z'-]+)*$/.test(a.trim()) && !/^_{3,}/.test(q.q.trim())));
      lr.listening.questions = noName(lr.listening.questions); lr.reading.questions = noName(lr.reading.questions); vg.questions = noName(vg.questions);
      const exam = { listening: lr.listening, reading: lr.reading, vocab: { questions: vg.questions }, writing: ws.writing, speaking: ws.speaking };
      const qs = [...exam.listening.questions, ...exam.reading.questions, ...exam.vocab.questions];
      if (!qs.length || !qs.every(okQ) || !exam.writing?.task || !exam.speaking?.part2) { console.log(`✗ ${j.id}: dữ liệu thiếu, bỏ qua`); continue; }
      fs.writeFileSync(path.join(OUT, j.id + '.json'), JSON.stringify({ id: j.id, cefr: j.cefr, band: j.band, topics: j.topics, exam }));
      console.log(`✓ ${j.id} (${qs.length} câu, model ${lr.model}/${vg.model}/${ws.model})`);
    } catch (e) { console.log(`✗ ${j.id}: ${(e as Error).message}`); }
  }
  console.log('XONG');
})();
