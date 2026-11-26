// Ghép từ đồng nghĩa / trái nghĩa → data/extra/syn.json
// Nguồn: data/lexicon-*.json (soạn tay, ưu tiên) + data/sources/datamuse-cache.jsonl (WordNet qua Datamuse).
// Chỉ giữ từ có trong kho (thực tế, có nghĩa tiếng Việt). Định dạng: { từ: { s: [[từ, nghĩa]…], a: [[từ, nghĩa]…], n?: ghi chú } }
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const vocab = fs.readdirSync(path.join(root, 'data/vocab')).filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(root, 'data/vocab', f), 'utf8')));
const vi = new Map(vocab.map((e) => [e.w, e.vi.split(';')[0].trim()]));
const lex = {};
for (const f of ['lexicon-a1-b1.json', 'lexicon-b2-c2.json']) Object.assign(lex, JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')));
const dm = new Map();
const cacheFile = path.join(root, 'data/sources/datamuse-cache.jsonl');
if (fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, 'utf8').split('\n')) if (l) { const o = JSON.parse(l); dm.set(o.w, o); }
const out = {};
const pair = (x) => [x, vi.get(x) || ''];
for (const w of new Set([...vi.keys(), ...Object.keys(lex)])) {
  const L = lex[w] || {}, D = dm.get(w) || { syn: [], ant: [] };
  const syn = [...new Set([...(L.syn || []), ...D.syn.filter((x) => vi.has(x))])].filter((x) => x !== w).slice(0, 5);
  const ant = [...new Set([...(L.ant || []), ...D.ant.filter((x) => vi.has(x))])].filter((x) => x !== w).slice(0, 3);
  if (!syn.length && !ant.length) continue;
  const o = { s: syn.map(pair) };
  if (ant.length) o.a = ant.map(pair);
  if (L.vi_note) o.n = L.vi_note;
  out[w] = o;
}
fs.mkdirSync(path.join(root, 'data/extra'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/extra/syn.json'), JSON.stringify(out));
console.log(`syn.json: ${Object.keys(out).length} từ có đồng nghĩa/trái nghĩa (Datamuse đã lấy ${dm.size} từ)`);
