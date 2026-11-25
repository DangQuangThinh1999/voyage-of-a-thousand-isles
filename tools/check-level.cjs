// Kiểm tra file nội dung cấp độ: node tools/check-level.cjs src/data/levels/b1.ts
// In ra lỗi (nếu có) và thống kê. Thoát mã 1 nếu có lỗi.
const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
// File .ts chỉ là một object thuần: bỏ dòng import/export và kiểu ": Level" rồi chạy như JS.
const src = fs.readFileSync(file, 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^export default .*$/gm, '')
  .replace(/^const level: Level = /m, 'window.LEVELS = [];\nwindow.LEVELS.push(')
  .replace(/^};\s*$/m, '});');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: file });
const L = (ctx.window.LEVELS || [])[0];
const errs = [];
const bad = (m) => errs.push(m);
const BAD_PUNCT = /[;:"“”()\[\]—–]/; // chỉ dùng , . ? ! và dấu nháy đơn
const ends = (s) => /[.?!]$/.test(s);
const words = (s) => s.split(/\s+/).filter(Boolean).length;
if (!L) { console.log('Không thấy window.LEVELS[0]'); process.exit(1); }
for (const k of ['id', 'cefr', 'band', 'minBand', 'title', 'vi', 'emoji']) if (L[k] === undefined) bad('Thiếu trường ' + k);
if (!Array.isArray(L.packs) || L.packs.length !== 5) bad('Cần đúng 5 packs');
const seen = new Set();
(L.packs || []).forEach((p, pi) => {
  for (const k of ['id', 'title', 'vi', 'emoji']) if (!p[k]) bad(`pack ${pi}: thiếu ${k}`);
  if (!Array.isArray(p.words) || p.words.length !== 8) bad(`pack ${p.id}: cần đúng 8 từ`);
  (p.words || []).forEach((w, wi) => {
    const where = `pack ${p.id} từ ${wi} (${w[0]})`;
    if (!Array.isArray(w) || w.length !== 4 || w.some((x) => typeof x !== 'string' || !x.trim())) { bad(`${where}: cần [word, vi, exampleEN, exampleVI]`); return; }
    const key = w[0].toLowerCase();
    if (seen.has(key)) bad(`${where}: từ bị trùng`);
    seen.add(key);
    const ex = w[2];
    if (!new RegExp(`(^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(ex)) bad(`${where}: câu ví dụ phải chứa đúng từ "${w[0]}"`);
    if (!ends(ex)) bad(`${where}: câu ví dụ phải kết thúc bằng . ? !`);
    if (BAD_PUNCT.test(ex) || BAD_PUNCT.test(w[0])) bad(`${where}: chỉ dùng dấu , . ? ! và nháy đơn`);
    if (/\d/.test(ex)) bad(`${where}: viết số bằng chữ, không dùng chữ số`);
    if (!/^[A-Z]/.test(ex)) bad(`${where}: câu ví dụ phải viết hoa chữ đầu`);
  });
});
const checkLines = (arr, name) => {
  if (!Array.isArray(arr) || !arr.length) { bad(name + ': rỗng'); return 0; }
  let n = 0;
  arr.forEach((x, i) => {
    if (!Array.isArray(x) || x.length !== 2 || x.some((y) => typeof y !== 'string' || !y.trim())) { bad(`${name}[${i}]: cần [en, vi]`); return; }
    if (BAD_PUNCT.test(x[0])) bad(`${name}[${i}]: chỉ dùng dấu , . ? ! và nháy đơn`);
    if (!ends(x[0])) bad(`${name}[${i}]: phải kết thúc bằng . ? !`);
    if (/\d/.test(x[0])) bad(`${name}[${i}]: viết số bằng chữ`);
    n += words(x[0]);
  });
  return n;
};
const checkQs = (qs, name, want) => {
  if (!Array.isArray(qs) || qs.length !== want) bad(`${name}: cần đúng ${want} câu hỏi`);
  (qs || []).forEach((q, i) => {
    if (!Array.isArray(q) || q.length !== 4 || typeof q[0] !== 'string' || typeof q[1] !== 'string' || !Array.isArray(q[2]) || typeof q[3] !== 'number') { bad(`${name}[${i}]: cần [q, qvi, opts[], answerIndex]`); return; }
    if (q[3] < 0 || q[3] >= q[2].length) bad(`${name}[${i}]: answerIndex ngoài phạm vi`);
    if (new Set(q[2]).size !== q[2].length) bad(`${name}[${i}]: đáp án bị trùng`);
    if (q[2].length < 3) bad(`${name}[${i}]: cần ít nhất 3 đáp án`);
  });
};
const r = L.reading || {};
if (!r.title) bad('reading: thiếu title');
const rw = checkLines(r.text, 'reading.text');
checkQs(r.questions, 'reading.questions', 6);
const tfng = (r.questions || []).filter((q) => Array.isArray(q[2]) && q[2].join() === 'True,False,Not Given').length;
if (tfng !== 3) bad(`reading.questions: cần đúng 3 câu True/False/Not Given (có ${tfng})`);
const li = L.listening || {};
if (!li.title) bad('listening: thiếu title');
const lw = checkLines(li.script, 'listening.script');
checkQs(li.questions, 'listening.questions', 3);
const script = (li.script || []).map((x) => x[0]).join(' ').toLowerCase();
if (!Array.isArray(li.gaps) || li.gaps.length !== 3) bad('listening.gaps: cần đúng 3 câu');
(li.gaps || []).forEach((g, i) => {
  if (!Array.isArray(g) || g.length !== 3) { bad(`listening.gaps[${i}]: cần [câu có ____, đáp án, dịch]`); return; }
  if (!g[0].includes('____')) bad(`listening.gaps[${i}]: câu phải có ____`);
  const alts = g[1].split('|');
  if (!alts.some((a) => script.includes(a.toLowerCase()))) bad(`listening.gaps[${i}]: đáp án "${g[1]}" phải xuất hiện nguyên văn trong script`);
  if (alts[0].split(' ').length > 3) bad(`listening.gaps[${i}]: đáp án tối đa 3 từ`);
});
const w = L.writing || {};
for (const k of ['prompt', 'vi']) if (!w[k]) bad('writing: thiếu ' + k);
if (typeof w.minWords !== 'number') bad('writing: thiếu minWords');
if (!Array.isArray(w.ideas) || w.ideas.length < 3) bad('writing.ideas: cần ≥3');
if (!Array.isArray(w.useful) || w.useful.length < 6) bad('writing.useful: cần ≥6');
const s = L.speaking || {};
if (!Array.isArray(s.part1) || s.part1.length !== 4) bad('speaking.part1: cần 4 câu [q, vi]');
if (!s.part2 || !s.part2.cue || !Array.isArray(s.part2.points) || !s.part2.vi) bad('speaking.part2: cần {cue, points[], vi}');
if (!Array.isArray(s.part3) || s.part3.length !== 3) bad('speaking.part3: cần 3 câu [q, vi]');
console.log(`${L.id}: ${seen.size} từ · reading ${rw} từ · listening ${lw} từ`);
if (errs.length) { console.log('LỖI:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('OK');
