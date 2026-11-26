// Lấy từ đồng nghĩa / trái nghĩa cho kho từ từ Datamuse API (dữ liệu WordNet, miễn phí, không cần khóa).
// Chỉ giữ những từ cũng có trong kho (từ thông dụng, có nghĩa tiếng Việt). Chạy tuần tự, có bộ nhớ đệm để chạy tiếp.
// Dùng: node tools/fetch-synonyms.cjs   → data/extra/syn.json  { từ: [[đồng nghĩa…], [trái nghĩa…]] }
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const cacheFile = path.join(root, 'data/sources/datamuse-cache.jsonl');
const vocab = fs.readdirSync(path.join(root, 'data/vocab')).filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(root, 'data/vocab', f), 'utf8')));
const bank = new Set(vocab.map((e) => e.w));
const cache = new Map();
if (fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, 'utf8').split('\n')) if (l) { const o = JSON.parse(l); cache.set(o.w, o); }
const get = async (q) => {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch('https://api.datamuse.com/words?' + q); if (r.ok) return (await r.json()).map((x) => x.word); } catch { /* thử lại */ }
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  return null;
};
(async () => {
  const todo = [...bank].filter((w) => !cache.has(w));
  console.log(`kho ${bank.size} từ, cần lấy ${todo.length}`);
  let n = 0;
  const worker = async () => {
    while (todo.length) {
      const w = todo.shift(), q = encodeURIComponent(w);
      const [syn, ant] = await Promise.all([get(`rel_syn=${q}&max=40`), get(`rel_ant=${q}&max=20`)]);
      if (!syn || !ant) continue;
      const o = { w, syn, ant }; cache.set(w, o); fs.appendFileSync(cacheFile, JSON.stringify(o) + '\n');
      if (++n % 500 === 0) console.log(n);
    }
  };
  await Promise.all([1, 2, 3, 4].map(worker));
  const out = {};
  for (const w of bank) {
    const o = cache.get(w); if (!o) continue;
    const syn = o.syn.filter((x) => bank.has(x) && x !== w).slice(0, 4), ant = o.ant.filter((x) => bank.has(x) && x !== w).slice(0, 2);
    if (syn.length || ant.length) out[w] = ant.length ? [syn, ant] : [syn];
  }
  fs.writeFileSync(path.join(root, 'data/extra/syn.json'), JSON.stringify(out));
  console.log(`xong: ${Object.keys(out).length} từ có đồng nghĩa/trái nghĩa`);
})();
