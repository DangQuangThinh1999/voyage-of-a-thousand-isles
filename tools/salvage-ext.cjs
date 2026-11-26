// Gom các mục từ đã soạn dở (thư mục batch của từng chunk) vào data/vocab/ext-XX.json.
// Dùng: node tools/salvage-ext.cjs <thư-mục-batch-gốc>   (tìm mọi file b*.json|jsonl|txt trong các thư mục con, mỗi từ tự xếp về đúng chunk)
// Hỗ trợ: dòng JSON mảng [w,pos,vi,ipa,ex,exvi,forms], mảng JSON các mảng/đối tượng, và dòng w|pos|vi|ipa|ex|exvi|forms.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const base = process.argv[2];
const toObj = (a) => Array.isArray(a)
  ? { w: a[0], pos: a[1], vi: a[2], ipa: a[3], ex: a[4], exvi: a[5], forms: Array.isArray(a[6]) ? a[6] : String(a[6] || '').split(',').map((s) => s.trim()).filter(Boolean) }
  : a;
function parse(file) {
  const txt = fs.readFileSync(file, 'utf8').trim();
  if (!txt) return [];
  try { const j = JSON.parse(txt); return (Array.isArray(j[0]) || typeof j[0] === 'object' ? j : [j]).map(toObj); } catch { /* từng dòng */ }
  const out = [];
  for (const line of txt.split('\n')) {
    const l = line.trim().replace(/,$/, '');
    if (!l || l === '[' || l === ']') continue;
    if (l.startsWith('[') || l.startsWith('{')) { try { out.push(toObj(JSON.parse(l))); } catch { /* bỏ dòng hỏng */ } continue; }
    const p = l.split('|');
    if (p.length >= 6) out.push(toObj(p));
  }
  return out;
}
const BAD_PUNCT = /[;:"“”()\[\]—–\-]/;
function valid(e) {
  for (const k of ['w', 'pos', 'vi', 'ipa', 'ex', 'exvi']) if (typeof e[k] !== 'string' || !e[k].trim()) return false;
  if (!/^\/.+\/$/.test(e.ipa) || /[:g]/.test(e.ipa.replace(/ɡ/g, ''))) { e.ipa = e.ipa.replace(/g/g, 'ɡ').replace(/:/g, 'ː'); if (!/^\/.+\/$/.test(e.ipa)) return false; }
  if (e.vi.split(';').length > 3) e.vi = e.vi.split(';').slice(0, 3).map((s) => s.trim()).join('; ');
  const ex = e.ex;
  if (BAD_PUNCT.test(ex) || /\d/.test(ex) || !/^[A-Z]/.test(ex) || !/[.?!]$/.test(ex)) return false;
  const forms = [e.w, ...(e.forms || [])].map((f) => f.toLowerCase());
  const low = ' ' + ex.toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
  return forms.some((f) => low.includes(' ' + f + ' ') || low.includes(' ' + f + "'"));
}
const batchFiles = [];
(function walk(d) { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/^b\d+\.(json|jsonl|txt)$/.test(f)) batchFiles.push(p); } })(base);
let total = 0;
for (const name of fs.readdirSync(path.join(root, 'data/sources/ext-chunks')).sort()) {
  const id = name.replace(/^chunk-|\.json$/g, '');
  const chunk = JSON.parse(fs.readFileSync(path.join(root, 'data/sources/ext-chunks', name), 'utf8'));
  const cm = new Map(chunk.map((x) => [x.w, x]));
  const got = new Map();
  const outFile = path.join(root, 'data/vocab', `ext-${id}.json`);
  const sources = [];
  if (fs.existsSync(outFile)) sources.push(outFile);
  sources.push(...batchFiles);
  let bad = 0;
  for (const src of sources) for (const raw of parse(src)) {
    const e = { ...raw, forms: raw.forms || [] };
    const c = cm.get(e.w);
    if (!c || got.has(e.w)) continue;
    if (!valid(e)) { bad++; continue; }
    got.set(e.w, { w: e.w, r: c.r, pos: e.pos.trim(), vi: e.vi.trim(), ipa: e.ipa.trim(), ex: e.ex.trim(), exvi: e.exvi.trim(), forms: e.forms, awl: c.awl });
  }
  if (!got.size) continue;
  const arr = [...got.values()].sort((a, b) => a.r - b.r);
  fs.writeFileSync(outFile, '[\n' + arr.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n]\n');
  total += arr.length;
  console.log(`ext-${id}: ${arr.length}/${chunk.length} từ (bỏ ${bad} mục lỗi)`);
}
console.log('Tổng từ mở rộng đã có:', total);
