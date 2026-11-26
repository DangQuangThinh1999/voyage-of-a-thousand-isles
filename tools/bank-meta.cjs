// Tạo src/data/bank-meta.json: danh sách file từ vựng trong data/vocab (chỉ file qua kiểm tra), xếp theo hạng tần suất.
// Chạy tự động trước khi build (npm run build).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'data/vocab');
const out = [];
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  try { execFileSync('node', [path.join(__dirname, 'check-vocab.cjs'), path.join(dir, file)], { stdio: 'pipe' }); }
  catch { console.log(`bank-meta: bỏ qua ${file} (chưa qua kiểm tra)`); continue; }
  const a = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  out.push({ f: file.replace(/\.json$/, ''), n: a.length, from: a[0].r, to: a[a.length - 1].r });
}
out.sort((a, b) => a.from - b.from);
fs.writeFileSync(path.join(root, 'src/data/bank-meta.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`bank-meta: ${out.length} file, ${out.reduce((s, x) => s + x.n, 0)} từ`);
