// Kiểm tra file từ vựng: node tools/check-vocab.cjs data/vocab/ngsl-0001-0500.json [rankFrom rankTo]
// Đặc tả: data/vocab/SPEC.md. Thoát mã 1 nếu có lỗi.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const file = process.argv[2];
const errs = [];
const bad = (m) => errs.push(m);
let arr;
try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log('JSON lỗi: ' + e.message); process.exit(1); }
if (!Array.isArray(arr)) { console.log('Phải là mảng JSON'); process.exit(1); }

const ngsl = new Map();
fs.readFileSync(path.join(root, 'data/sources/ngsl-1.2-stats.csv'), 'utf8').split('\n').slice(1).forEach((l) => {
  const [w, r] = l.split(','); if (w && r) ngsl.set(w.trim().toLowerCase(), +r);
});
const awl = new Map(JSON.parse(fs.readFileSync(path.join(root, 'data/sources/awl-coxhead-2000.json'), 'utf8')).map((x) => [x.word, x.sublist]));
// Từ mở rộng (ngoài NGSL) trong danh sách 10.000 từ: file ext-XX.json đối chiếu với data/sources/ext-chunks/chunk-XX.json
const isExt = path.basename(file).startsWith('ext-');
const chunk = isExt ? JSON.parse(fs.readFileSync(path.join(root, 'data/sources/ext-chunks', path.basename(file).replace(/^ext-/, 'chunk-')), 'utf8')) : null;
const chunkMap = chunk ? new Map(chunk.map((x) => [x.w, x])) : null;

const BAD_PUNCT = /[;:"“”()\[\]—–\-]/;
const seen = new Set();
let prev = 0;
arr.forEach((e, i) => {
  const at = `#${i} (${e && e.w})`;
  for (const k of ['w', 'pos', 'vi', 'ipa', 'ex', 'exvi']) if (typeof e[k] !== 'string' || !e[k].trim()) bad(`${at}: thiếu ${k}`);
  if (typeof e.r !== 'number') bad(`${at}: thiếu r`);
  if (!Array.isArray(e.forms)) bad(`${at}: forms phải là mảng`);
  if (typeof e.awl !== 'number') bad(`${at}: thiếu awl`);
  if (typeof e.w !== 'string') return;
  if (seen.has(e.w)) bad(`${at}: trùng từ`);
  seen.add(e.w);
  if (isExt) {
    const c = chunkMap.get(e.w);
    if (!c) bad(`${at}: không có trong ${path.basename(file).replace(/^ext-/, 'chunk-')}`);
    else { if (c.r !== e.r) bad(`${at}: r phải là ${c.r}`); if (c.awl !== e.awl) bad(`${at}: awl phải là ${c.awl}`); }
  } else {
    if (ngsl.has(e.w) && ngsl.get(e.w) !== e.r) bad(`${at}: r phải là ${ngsl.get(e.w)}`);
    if (!ngsl.has(e.w) && !awl.has(e.w)) bad(`${at}: không có trong NGSL hay AWL`);
    if ((awl.get(e.w) || 0) !== e.awl) bad(`${at}: awl phải là ${awl.get(e.w) || 0}`);
  }
  if (e.r < prev) bad(`${at}: chưa sắp xếp theo r`);
  prev = e.r;
  if (typeof e.ipa === 'string' && (!/^\/.+\/$/.test(e.ipa) || /[:g]/.test(e.ipa.replace(/ɡ/g, '')))) bad(`${at}: ipa phải dạng /.../, dùng ɡ và ː`);
  if (typeof e.ex === 'string') {
    const ex = e.ex;
    if (BAD_PUNCT.test(ex)) bad(`${at}: câu ví dụ chỉ dùng , . ? ! và nháy đơn`);
    if (/\d/.test(ex)) bad(`${at}: viết số bằng chữ`);
    if (!/^[A-Z]/.test(ex) || !/[.?!]$/.test(ex)) bad(`${at}: câu ví dụ viết hoa chữ đầu và kết thúc bằng . ? !`);
    const forms = [e.w, ...(e.forms || [])].map((f) => f.toLowerCase());
    const low = ' ' + ex.toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
    if (!forms.some((f) => low.includes(' ' + f + ' ') || low.includes(' ' + f + "'"))) bad(`${at}: câu ví dụ phải chứa "${e.w}" hoặc một dạng trong forms`);
  }
});
if (isExt) {
  const miss = chunk.filter((x) => !seen.has(x.w)).map((x) => x.w);
  // File mở rộng được phép chưa đủ (bổ sung dần); thêm --full để bắt buộc đủ.
  if (miss.length) (process.argv.includes('--full') ? bad : console.log)(`Thiếu ${miss.length} từ so với chunk: ${miss.slice(0, 30).join(', ')}${miss.length > 30 ? '…' : ''}`);
}
const [from, to] = process.argv.slice(3).filter((a) => !a.startsWith('--')).map(Number);
if (from && to) {
  const want = [...ngsl].filter(([, r]) => r >= from && r <= to).map(([w]) => w);
  const miss = want.filter((w) => !seen.has(w));
  if (miss.length) bad(`Thiếu ${miss.length} từ trong hạng ${from}–${to}: ${miss.slice(0, 30).join(', ')}${miss.length > 30 ? '…' : ''}`);
}
console.log(`${path.basename(file)}: ${arr.length} từ`);
if (errs.length) { console.log(`LỖI (${errs.length}):\n- ` + errs.slice(0, 80).join('\n- ')); process.exit(1); }
console.log('OK');
