// Kiểm tra dữ liệu luyện ngữ pháp src/data/drills/NN.json (mỗi bài 20 câu). Chạy: node tools/check-drills.cjs [NN ...]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../src/data/drills'), idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const only = process.argv.slice(2);
let bad = 0, ok = 0;
for (const { n, f } of idx) {
  if (only.length && !only.includes(f.slice(0, 2))) continue;
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { if (only.length) { console.log(f, 'THIẾU FILE'); bad++; } continue; }
  let d; try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.log(f, 'JSON lỗi', e.message); bad++; continue; }
  const err = [];
  if (d.name !== n) err.push(`name phải là "${n}"`);
  if (!Array.isArray(d.items) || d.items.length !== 20) err.push(`cần đúng 20 items (có ${d.items && d.items.length})`);
  const types = {}; const seen = new Set();
  (d.items || []).forEach((it, i) => {
    const e = (m) => err.push(`#${i + 1}: ${m}`);
    types[it.t] = (types[it.t] || 0) + 1;
    for (const k of ['t', 'q', 'en', 'vi', 'why']) if (typeof it[k] !== 'string' || !it[k].trim()) e(`thiếu ${k}`);
    if (seen.has(it.en)) e('trùng câu en'); seen.add(it.en);
    if (it.t === 'mcq') {
      if (!Array.isArray(it.opts) || it.opts.length < 3 || it.opts.length > 4) e('mcq cần 3–4 opts');
      if (!Number.isInteger(it.a) || it.a < 0 || it.a >= (it.opts || []).length) e('mcq: a phải là chỉ số đúng');
      if (new Set(it.opts).size !== (it.opts || []).length) e('opts trùng nhau');
      if (it.q.includes('___') && it.opts && it.a >= 0 && it.opts[it.a] !== undefined) {
        const filled = it.q.replace(/_{3,}/, it.opts[it.a]);
        if (filled.replace(/\s+/g, ' ').trim() !== it.en.trim()) e(`điền đáp án vào q phải ra đúng en:\n      "${filled}"\n   ≠ "${it.en}"`);
      }
    } else if (it.t === 'type') {
      if (typeof it.a !== 'string' || !it.a.trim()) e('type: a là chuỗi đáp án');
      else if (!it.q.includes('___')) e('type: q phải có ___');
      else { const filled = it.q.replace(/_{3,}/, it.a.split('|')[0]); if (filled.replace(/\s+/g, ' ').trim() !== it.en.trim()) e(`điền đáp án vào q phải ra đúng en:\n      "${filled}"\n   ≠ "${it.en}"`); }
    } else if (it.t === 'fix') {
      if (typeof it.a !== 'string' || it.a.split('|')[0].trim() !== it.en.trim()) e('fix: a (cách viết đầu tiên) phải bằng en');
      if (it.q.trim() === it.en.trim()) e('fix: q là câu SAI, phải khác en');
    } else e('t phải là mcq | type | fix');
    if ((it.why || '').length < 60) e('why quá ngắn (cần giải thích chi tiết ≥ 60 ký tự)');
  });
  if ((types.mcq || 0) < 6 || (types.type || 0) < 5 || (types.fix || 0) < 5) err.push(`cần ≥6 mcq, ≥5 type, ≥5 fix (có ${JSON.stringify(types)})`);
  if (err.length) { bad++; console.log(`✗ ${f} ${n}\n  ` + err.slice(0, 15).join('\n  ')); } else ok++;
}
console.log(`OK ${ok} bài, lỗi ${bad} bài`);
process.exit(bad ? 1 : 0);
