// Tạo dữ liệu phụ từ kho từ (chạy khi build):
// - data/extra/ipa.json   { từ: phiên âm }  → hiện phiên âm cho mọi từ và mọi câu
// - data/extra/same.json  { từ: [từ cùng nghĩa…] } → khi tự gõ từ theo nghĩa tiếng Việt, gõ từ cùng nghĩa cũng tính đúng
//   Hai từ cùng nghĩa khi nghĩa đầu tiên của từ này nằm trong các nghĩa của từ kia và ngược lại (ví dụ small ↔ little: "nhỏ").
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const vocab = fs.readdirSync(path.join(root, 'data/vocab')).filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(root, 'data/vocab', f), 'utf8')));
const lex = {};
for (const f of ['lexicon-a1-b1.json', 'lexicon-b2-c2.json']) Object.assign(lex, JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')));
const ipa = {};
for (const [w, o] of Object.entries(lex)) if (o.ipa) ipa[w.toLowerCase()] = o.ipa;
for (const e of vocab) if (!ipa[e.w.toLowerCase()]) ipa[e.w.toLowerCase()] = e.ipa;
const atoms = (vi) => vi.replace(/\([^)]*\)/g, '').split(/[;,]/).map((s) => s.trim().toLowerCase()).filter((s) => s && !s.includes('='));
const info = vocab.filter((e) => !/^\((cổ|văn chương|lóng|tên riêng|viết tắt)/.test(e.vi)).map((e) => ({ w: e.w, a: atoms(e.vi), p: e.pos.split(',')[0].trim() })).filter((x) => x.a.length);
const byAtom = new Map();
for (const x of info) for (const a of x.a) { if (!byAtom.has(a)) byAtom.set(a, []); byAtom.get(a).push(x); }
const same = {};
for (const x of info) {
  const s = (byAtom.get(x.a[0]) || []).filter((y) => y.w !== x.w && y.p === x.p && x.a.includes(y.a[0])).map((y) => y.w);
  if (s.length) same[x.w] = [...new Set(s)].slice(0, 6);
}
fs.mkdirSync(path.join(root, 'data/extra'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/extra/ipa.json'), JSON.stringify(ipa));
fs.writeFileSync(path.join(root, 'data/extra/same.json'), JSON.stringify(same));
// Từ điển tra nhanh: { từ: [nghĩa đầu, từ loại chính, awl] } để chạm vào từ là xem nghĩa, luyện từ loại, đếm từ học thuật
const dict = {};
for (const e of vocab) dict[e.w.toLowerCase()] = [e.vi.split(';')[0].trim(), e.pos.split(',')[0].trim(), e.awl ? 1 : 0];
fs.writeFileSync(path.join(root, 'data/extra/dict.json'), JSON.stringify(dict));
console.log(`lex: từ điển ${Object.keys(dict).length} từ, phiên âm ${Object.keys(ipa).length} từ, ${Object.keys(same).length} từ có từ cùng nghĩa`);
