import { Dictate } from '../components/Dictate';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useRouteParam } from '../lib/route';
import { FAMILY_HELP } from '../lib/familyHelp';
import { AudioButton } from '../components/AudioButton';
import { GrammarNotes, LessonBody } from '../components/GrammarNotes';
import { Ipa } from '../components/Ipa';
import { TapText, posVi } from '../components/TapText';
import { Bar, Pills, Section } from '../components/ui';
import { loadLex, dictWords, lookup } from '../lib/lex';
import { LESSONS } from '../lib/grammarLessons';
import { applyFixes, checkGrammar, softWarnings, type GrammarIssue } from '../lib/sentence';
import { shuffle } from '../lib/util';
import { norm } from '../lib/text';
import { smartCheck, type SmartCheck } from '../lib/aicheck';
import { VerdictCard } from '../components/VerdictCard';
import { StepProgress } from '../components/Progress';
import { app, emit, save, useApp } from '../state/store';
import { addMistake, tallySkill } from '../lib/progress';

const GROUPS: [string, string, string[]][] = [
  ['⭐', 'Câu cơ bản', ['Động từ to be', 'There is / There are', 'Câu hỏi Yes/No', 'Câu hỏi có từ để hỏi', 'Câu phủ định với do/does/did', 'Câu phủ định', 'Câu mệnh lệnh / đề nghị']],
  ['⏳', 'Các thì', ['Hiện tại đơn', 'Trạng từ tần suất → hiện tại đơn', 'Hiện tại tiếp diễn', 'Quá khứ đơn của to be', 'Quá khứ đơn', 'Quá khứ tiếp diễn', 'Hiện tại hoàn thành', 'for / since với hiện tại hoàn thành', 'Quá khứ hoàn thành', 'Tương lai đơn', 'Tương lai gần', 'used to + V']],
  ['🧩', 'Danh từ, mạo từ, giới từ', ['Mạo từ a', 'Mạo từ an', 'Mạo từ the', 'Danh từ số nhiều', 'much / a little + danh từ không đếm được', "Sở hữu cách 's", 'Giới từ at', 'Giới từ on', 'Giới từ in']],
  ['⚙️', 'Động từ đặc biệt', ['Động từ khuyết thiếu', 'have to + V', 'Động từ + to V', 'Động từ + V-ing', 'Giới từ + V-ing', 'to V chỉ mục đích', 'Câu bị động']],
  ['⚖️', 'So sánh', ['So sánh hơn', 'So sánh nhất', 'So sánh bằng']],
  ['🔗', 'Câu phức (cần cho IELTS 5.5+)', ['Liên từ', 'Liên từ: when', 'Câu điều kiện loại 0', 'Câu điều kiện loại 1', 'Câu điều kiện loại 2', 'Mệnh đề quan hệ', 'Mệnh đề quan hệ với that']],
];
const ALL = GROUPS.flatMap((g) => g[2]).filter((n) => LESSONS[n]);

function markLearned(name: string) {
  const g = app.P.gram || (app.P.gram = {});
  if (!g[name]) { g[name] = Date.now(); tallySkill(app.P, 'grammar', true); save(); emit(); }
}

/** Thư viện ngữ pháp: theo nhóm, có tiến độ */
function Library({ initial, onOpen }: { initial?: string | null; onOpen?: (n: string) => void }) {
  const { P } = useApp();
  const [open, setOpen] = useState<string | null>(initial || null);
  useEffect(() => { if (initial) setTimeout(() => document.getElementById('ls-' + initial)?.scrollIntoView({ block: 'center' }), 300); }, [initial]);
  const done = ALL.filter((n) => P.gram && P.gram[n]).length;
  return (
    <>
      <Section>
        <div className="flex items-center justify-between"><b>📚 Đã học {done}/{ALL.length} bài ngữ pháp</b><span className="muted small">Làm đúng câu “Thử ngay” để đánh dấu đã học</span></div>
        <Bar pct={(done / ALL.length) * 100} />
      </Section>
      {GROUPS.map(([ic, title, names], gi) => {
        const list = names.filter((n) => LESSONS[n]), d = list.filter((n) => P.gram && P.gram[n]).length;
        return (
          <Section key={title} delay={gi * 0.04}>
            <div className="flex items-center justify-between"><h3 className="m-0">{ic} {title}</h3><span className="muted small">{d}/{list.length}</span></div>
            <div className="mt-2 grid gap-2">
              {list.map((n) => (
                <div key={n} id={'ls-' + n} className="lesson-row">
                  <button className="lesson-h" onClick={() => { setOpen(open === n ? null : n); onOpen?.(open === n ? '' : n); }}>
                    <span>{P.gram && P.gram[n] ? '✅' : '📘'} {n}</span><span className="muted">{open === n ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {open === n && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-2 pb-2">
                        <LessonBody name={n} onRight={() => markLearned(n)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}

/** Phân tích câu + sửa lỗi: từ loại từng từ, phiên âm, lỗi và câu đã sửa, giải thích ngữ pháp */
function Analyzer() {
  const [text, setText] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<GrammarIssue[] | null>(null);
  const [smart, setSmart] = useState<SmartCheck | null>(null);
  const [step, setStep] = useState(0);
  const [, force] = useState(0);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  async function run() {
    const t = text.trim(); if (!t) return;
    setBusy(true); setStep(0); setSmart(null); setIssues(null); setDone(t);
    // Bước 1: máy chấm nhanh (LanguageTool) → kết quả sơ bộ; bước 2: AI theo ngữ cảnh; bước 3: tổng hợp
    const a = await checkGrammar(t).catch(() => null);
    setIssues(a); setStep(1);
    const b = await smartCheck(t);
    setStep(2); setSmart(b);
    if (b.status === 'incorrect' && b.correction) { addMistake(app.P, t, b.correction, b.explanation); save(); }
    setBusy(false);
  }
  const fixed = smart && smart.correction && smart.status === 'incorrect' ? smart.correction : issues && issues.length ? applyFixes(done, issues) : '';
  const words = done.split(/\s+/).map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')).filter(Boolean);
  return (
    <>
      <Section>
        <h3 className="m-0">🔍 Phân tích câu và sửa lỗi</h3>
        <p className="muted small">Gõ bất kỳ câu tiếng Anh nào (câu bạn tự viết, câu trong sách, đề IELTS). Máy tìm lỗi sai, đưa câu đã sửa, tô màu từ loại và giải thích ngữ pháp.</p>
        <form onSubmit={(e) => { e.preventDefault(); run(); }}>
          <textarea className="ans" rows={3} placeholder="Ví dụ: She go to school yesterday because she want learn English." value={text} onChange={(e) => setText(e.target.value)} />
          <Dictate value={text} onChange={setText} />
          <button className="btn mt-2" disabled={busy || !text.trim()}>{busy ? 'Đang phân tích…' : 'Phân tích'}</button>
        </form>
      </Section>
      {busy && <Section><StepProgress steps={['Kiểm tra chính tả, ngữ pháp', 'AI đánh giá theo ngữ cảnh', 'Tổng hợp kết quả']} step={step} note={step === 1 ? 'AI miễn phí có lúc mất 10–40 giây' : undefined} /></Section>}
      {done && (
        <Section className={busy ? 'pending' : ''}>
          <h3 className="m-0">1. Đánh giá câu {busy ? <span className="chip3">⏳ {step === 0 ? 'đang kiểm tra…' : 'kết quả sơ bộ, AI đang đánh giá lại'}</span> : smart?.source === 'ai' ? <span className="chip3 ok">✓ AI đã đánh giá</span> : smart ? <span className="chip3 warn">⚠️ AI bận: chỉ có kết quả máy chấm cơ bản</span> : null}</h3>
          {!busy && smart && smart.source !== 'ai' && <p className="note small">AI đánh giá theo ngữ cảnh đang bận hoặc không kết nối được. Kết quả dưới đây chỉ từ máy chấm cơ bản (LanguageTool), <b>có thể chưa chính xác hoàn toàn</b>. Bấm <b>Phân tích</b> lại sau ít phút.</p>}
          {smart && <VerdictCard r={smart} text={done} />}
          {smart?.source === 'ai' ? null : issues === null ? <p className="muted">Không kết nối được máy chấm ngữ pháp, chỉ phân tích theo luật.</p>
            : issues.length === 0 ? <><p className="okc">✅ Đúng ngữ pháp, chính tả.</p>{softWarnings(done).map((w) => <p key={w} className="note small">⚠️ {w}</p>)}</>
              : <>
                <ul className="checks">{issues.map((x, i) => <li key={i}>✗ {x.kind}: <b className="badc">“{x.bad}”</b>{x.fix.length ? <> → <b className="okc">{x.fix.join(' / ')}</b></> : null}<br /><span className="muted small">{x.msg}</span></li>)}</ul>
                {fixed && <div className="fixbox"><b>Câu đã sửa:</b> {fixed} <AudioButton text={fixed} /><Ipa text={fixed} /></div>}
              </>}
          <h3>2. Từ loại từng từ <span className="muted small">(chạm vào từ để xem nghĩa)</span></h3>
          <div className="pos-legend"><span className="p-noun">danh từ</span><span className="p-verb">động từ</span><span className="p-adjective">tính từ</span><span className="p-adverb">trạng từ</span><span className="p-other">khác</span></div>
          <p className="pos-line">{words.map((w, i) => { const e = lookup(w); const p = e ? e.pos : ''; return <span key={i} className={`p-${['noun', 'verb', 'adjective', 'adverb'].includes(p) ? p : 'other'}`} title={e ? `${e.vi} · ${posVi(p)}` : ''}>{w}<small>{e ? posVi(p) : '?'}</small></span>; })}</p>
          <p className="muted small">Từ loại lấy theo nghĩa phổ biến nhất trong từ điển; một số từ có nhiều loại tùy câu (ví dụ “work” vừa là danh từ vừa là động từ).</p>
          <h3>3. Phiên âm cả câu</h3>
          <p className="text-lg"><TapText text={fixed || done} /></p>
          <Ipa text={fixed || done} />
          <h3>4. Ngữ pháp trong câu</h3>
          <GrammarNotes en={fixed || done} open title="Giải thích ngữ pháp" />
        </Section>
      )}
    </>
  );
}

const POS4 = ['noun', 'verb', 'adjective', 'adverb'];
const FAMILY: [string, string, string[], number, string][] = [
  ['She is very ____.', 'Cô ấy rất vui.', ['happy', 'happiness', 'happily'], 0, 'Sau “very” và to be cần TÍNH TỪ → happy.'],
  ['Money cannot buy ____.', 'Tiền không mua được hạnh phúc.', ['happy', 'happiness', 'happily'], 1, 'Sau động từ “buy” cần DANH TỪ làm tân ngữ → happiness.'],
  ['They lived ____ together.', 'Họ sống hạnh phúc bên nhau.', ['happy', 'happiness', 'happily'], 2, 'Bổ nghĩa cho động từ “lived” cần TRẠNG TỪ → happily.'],
  ['He drives very ____.', 'Anh ấy lái xe rất cẩn thận.', ['careful', 'carefully', 'care'], 1, 'Bổ nghĩa cho động từ “drives” → trạng từ carefully.'],
  ['The ____ of the city is fast.', 'Sự phát triển của thành phố nhanh.', ['develop', 'development', 'developed'], 1, 'Sau “The” và trước “of” cần DANH TỪ → development (đuôi -ment).'],
  ['We need to ____ our skills.', 'Chúng ta cần cải thiện kỹ năng.', ['improve', 'improvement', 'improved'], 0, 'Sau “to” cần ĐỘNG TỪ nguyên mẫu → improve.'],
  ['This book is very ____.', 'Cuốn sách này rất hữu ích.', ['use', 'useful', 'usefully'], 1, 'Sau to be + very cần TÍNH TỪ → useful (đuôi -ful).'],
  ['Good ____ is important for students.', 'Giáo dục tốt quan trọng với học sinh.', ['educate', 'education', 'educational'], 1, 'Sau tính từ “Good” cần DANH TỪ → education (đuôi -tion).'],
  ['She speaks English ____.', 'Cô ấy nói tiếng Anh trôi chảy.', ['fluent', 'fluency', 'fluently'], 2, 'Bổ nghĩa cho động từ “speaks” → trạng từ fluently (đuôi -ly).'],
  ['It is a ____ decision.', 'Đó là một quyết định quan trọng.', ['significance', 'significant', 'significantly'], 1, 'Đứng trước danh từ “decision” cần TÍNH TỪ → significant.'],
];

/** Từ loại: bài học + 2 dạng luyện (đoán từ loại, chọn dạng đúng của từ) */
function PartsOfSpeech() {
  const [mode, setMode] = useState<'learn' | 'guess' | 'family'>('learn');
  const [, force] = useState(0);
  useEffect(() => { loadLex().then(() => force((n) => n + 1)); }, []);
  return (
    <>
      <Pills id="pos" value={mode} onChange={setMode} items={[['learn', '📖 Bài học'], ['guess', '🎯 Đoán từ loại'], ['family', '🧬 Chọn dạng đúng']]} />
      {mode === 'learn' && <PosLesson />}
      {mode === 'guess' && <PosGuess />}
      {mode === 'family' && <FamilyQuiz />}
    </>
  );
}

function PosLesson() {
  const rows: [string, string, string, string, string][] = [
    ['p-noun', 'Danh từ (noun)', 'Người, vật, việc, ý tưởng. Làm chủ ngữ hoặc tân ngữ.', 'Sau a/an/the, my/your, tính từ, giới từ', '-tion, -sion, -ment, -ness, -ity, -er/-or, -ance/-ence, -ship'],
    ['p-verb', 'Động từ (verb)', 'Hành động hoặc trạng thái. Phải chia theo chủ ngữ và thì.', 'Sau chủ ngữ; sau to, can, will, should…', '-ize/-ise, -ate, -ify, -en'],
    ['p-adjective', 'Tính từ (adjective)', 'Mô tả danh từ: to, nhỏ, đẹp, quan trọng…', 'TRƯỚC danh từ (a big house) hoặc SAU to be/look/feel', '-ful, -less, -ous, -ive, -able/-ible, -al, -ic, -y'],
    ['p-adverb', 'Trạng từ (adverb)', 'Bổ nghĩa cho động từ, tính từ hoặc cả câu: thế nào, khi nào, bao nhiêu.', 'Sau động từ (speak slowly) hoặc trước tính từ (very good)', '-ly (quickly, carefully); một số không có -ly: fast, hard, well'],
  ];
  return (
    <Section>
      <h3 className="m-0">Phân biệt danh từ, động từ, tính từ, trạng từ</h3>
      <p className="muted small">IELTS hay hỏi điền từ đúng loại (Reading, Listening) và chấm cách dùng đúng dạng từ (Writing, Speaking). Nhìn vị trí trong câu là đoán được cần loại từ nào.</p>
      <div className="grid gap-3 mt-2">
        {rows.map(([cls, name, what, where, suf]) => (
          <div key={name} className={`pos-card ${cls}`}>
            <b>{name}</b>
            <div>💬 {what}</div>
            <div>📍 <b>Vị trí:</b> {where}</div>
            <div>🔚 <b>Đuôi hay gặp:</b> {suf}</div>
          </div>
        ))}
      </div>
      <div className="fixbox mt-3"><b>Ví dụ cả họ từ:</b> success (danh từ) → succeed (động từ) → successful (tính từ) → successfully (trạng từ)<br />
        She <b>succeeded</b>. Her <b>success</b> was <b>successful</b>… → She finished the project <b>successfully</b>.</div>
    </Section>
  );
}

function PosGuess() {
  const pool = useMemo(() => dictWords().slice(0, 4000).filter((w) => POS4.includes(lookup(w)?.pos || '') && w.length > 3), []);
  const [q, setQ] = useState(() => shuffle(pool)[0]);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState([0, 0]);
  if (!pool.length) return <Section><p className="muted">Đang tải từ điển…</p></Section>;
  const e = lookup(q || pool[0])!;
  const next = () => { setQ(shuffle(pool)[0]); setPick(null); };
  return (
    <Section>
      <div className="flex justify-between"><b>Từ này là loại từ gì?</b><span className="muted small">Đúng {score[0]}/{score[1]}</span></div>
      <div className="text-center my-3"><div className="en">{e.w} <AudioButton text={e.w} /></div><Ipa text={e.w} />{pick && <div className="muted">{e.vi}</div>}</div>
      <div className="opts grid2">
        {POS4.map((p) => {
          const cls = pick === null ? '' : p === e.pos ? 'right' : p === pick ? 'wrong' : 'dim';
          return <button key={p} className={`opt ${cls}`} disabled={pick !== null} onClick={() => { setPick(p); setScore([score[0] + (p === e.pos ? 1 : 0), score[1] + 1]); tallySkill(app.P, 'grammar', p === e.pos); save(); }}>{posVi(p)} ({p})</button>;
        })}
      </div>
      {pick && <div className="foot"><span className={pick === e.pos ? 'okc' : 'badc'}>{pick === e.pos ? 'Đúng rồi!' : `Đáp án: ${posVi(e.pos)}`}</span><button className="btn big" onClick={next}>Từ tiếp →</button></div>}
      <p className="muted small">Từ loại theo nghĩa phổ biến nhất. Một số từ có nhiều loại (ví dụ “play” vừa là danh từ vừa là động từ).</p>
    </Section>
  );
}

/** Lời giải chi tiết + bằng chứng cho bài chọn dạng đúng của từ */
function FamilyExplain({ it, pick }: { it: [string, string, string[], number, string]; pick: number }) {
  const H = FAMILY_HELP[it[0]], right = it[2][it[3]], ok = pick === it[3], full = it[0].replace('____', right);
  return (
    <div className={`qexp ${ok ? 'ok' : 'bad'}`}>
      <div className="qexp-h">{ok ? '✅ Đúng rồi!' : <>❌ Chưa đúng. Đáp án đúng là <b>{right}</b></>}</div>
      <div className="qexp-full"><b>{full}</b> <AudioButton text={full} className="icon xs" /> <span className="muted">({it[1]})</span></div>
      {!ok && H?.wrong[it[2][pick]] && (
        <div className="proof"><b>🔎 Vì sao “{it[2][pick]}” sai?</b><p className="m-0">{H.wrong[it[2][pick]].why}</p>
          <p className="m-0 small">📌 <b>Bằng chứng</b>, “{it[2][pick]}” đúng khi dùng như thế này: <b>{H.wrong[it[2][pick]].proof[0]}</b> <AudioButton text={H.wrong[it[2][pick]].proof[0]} className="icon xs" /> <span className="muted">{H.wrong[it[2][pick]].proof[1]}</span></p></div>
      )}
      {H ? <>
        <div className="vsec"><h4>1. Phân tích câu</h4><ul>{H.analysis.map(([p, r]) => <li key={p}><b className="hl">{p}</b>: {r}</li>)}</ul></div>
        <div className="vsec"><h4>2. So sánh các dạng từ</h4>
          <table className="ftable"><thead><tr><th>Từ</th><th>Loại từ</th><th>Nghĩa</th></tr></thead>
            <tbody>{H.forms.map(([w, p, v]) => <tr key={w} className={w === right ? 'ok' : ''}><td><b>{w}</b> <AudioButton text={w} className="icon xs" /></td><td>{p}</td><td>{v}</td></tr>)}</tbody></table></div>
        <div className="vsec"><h4>3. Quy tắc cần nhớ</h4><div className="formula">📌 {H.rule}</div>
          <ul>{H.examples.map(([en, vi]) => <li key={en}><b>{en}</b> <AudioButton text={en} className="icon xs" /> <span className="muted">({vi})</span></li>)}</ul></div>
        <details className="vsec"><summary className="small">4. Vì sao các đáp án khác sai?</summary>
          <ul className="small">{Object.entries(H.wrong).map(([w, x]) => <li key={w}><b>{w}</b>: {x.why}<br />→ Dùng đúng: <i>{x.proof[0]}</i> ({x.proof[1]})</li>)}</ul></details>
      </> : <p className="m-0">{it[4]}</p>}
    </div>
  );
}

function FamilyQuiz() {
  const [order] = useState(() => shuffle(FAMILY));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const it = order[i % order.length];
  return (
    <Section>
      <div className="flex justify-between"><b>Chọn dạng đúng của từ</b><span className="muted small">Câu {(i % order.length) + 1}/{order.length}</span></div>
      <p className="gap-s">{pick === null ? it[0] : it[0].replace('____', it[2][it[3]])}</p>
      <p className="muted">{it[1]}</p>
      <div className="opts grid2">
        {it[2].map((o, k) => {
          const cls = pick === null ? '' : k === it[3] ? 'right' : k === pick ? 'wrong' : 'dim';
          return <button key={o} className={`opt en ${cls}`} disabled={pick !== null} onClick={() => { setPick(k); tallySkill(app.P, 'grammar', k === it[3]); save(); }}>{o}</button>;
        })}
      </div>
      {pick !== null && <FamilyExplain it={it} pick={pick} />}
      {pick !== null && <div className="foot"><button className="btn ghost" onClick={() => setPick(null)}>🔁 Làm lại</button><button className="btn big" onClick={() => { setI(i + 1); setPick(null); }}>Câu tiếp →</button></div>}
    </Section>
  );
}

/** Sổ lỗi sai: tự sửa lại câu từng viết sai, đúng 3 lần là đã thuộc */
function Mistakes() {
  const { P } = useApp();
  const list = (P.mist || []).filter((m) => m.ok < 3), done = (P.mist || []).filter((m) => m.ok >= 3).length;
  const [i, setI] = useState(0);
  const [inp, setInp] = useState('');
  const [res, setRes] = useState<null | boolean>(null);
  if (!list.length) return <Section><h3 className="m-0">📒 Sổ lỗi sai</h3><p className="muted">Chưa có lỗi nào cần luyện{done ? ` (đã thuộc ${done} lỗi 🎉)` : ''}. Khi bạn viết câu sai ở phần Từ mới, lỗi sẽ được lưu ở đây để luyện lại.</p></Section>;
  const m = list[i % list.length];
  const check = () => {
    const ok = norm(inp) === norm(m.right);
    setRes(ok); tallySkill(app.P, 'write', ok);
    const x = (app.P.mist || []).find((y) => y.id === m.id); if (x && ok) x.ok++;
    save(); emit();
  };
  return (
    <Section>
      <div className="flex justify-between"><h3 className="m-0">📒 Sổ lỗi sai</h3><span className="muted small">Còn {list.length} lỗi · đã thuộc {done}</span></div>
      <p className="muted small">Sửa lại câu bạn từng viết sai. Mỗi lỗi cần tự sửa đúng 3 lần (ở các ngày khác nhau càng tốt) mới tính là đã thuộc.</p>
      <div className="verdict v-bad mt-2"><b>❌ Câu bạn từng viết:</b> <span className="strike2">{m.wrong}</span><div className="muted small mt-1">Gợi ý: {m.why || 'Xem lại ngữ pháp của câu.'}</div><div className="small mt-1">Đã sửa đúng {m.ok}/3 lần</div></div>
      <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if (res === null) check(); }}>
        <input className="ans" placeholder="Gõ lại câu đúng…" value={inp} disabled={res !== null} onChange={(e) => setInp(e.target.value)} />
        {res === null && <button className="btn mt-2" disabled={!inp.trim()}>Kiểm tra</button>}
      </form>
      {res !== null && (
        <div className="foot">
          <span className={res ? 'okc' : 'badc'}>{res ? '✅ Đúng rồi!' : '❌ Chưa đúng.'} Câu đúng: <b>{m.right}</b> <AudioButton text={m.right} className="icon xs" /></span>
          <button className="btn big" onClick={() => { setI(i + 1); setInp(''); setRes(null); }}>Lỗi tiếp →</button>
        </div>
      )}
    </Section>
  );
}

/** Tab Ngữ pháp */
export function Grammar() {
  const { P, arg } = useApp();
  const [tab, setTab] = useRouteParam<'analyze' | 'mist' | 'pos' | 'lib'>('t', 'lib');
  const [lesson, setLesson] = useRouteParam<string>('l', '');
  useEffect(() => { if (arg && LESSONS[arg]) { setTab('lib'); setLesson(arg); app.arg = null; } }, [arg]); // eslint-disable-line react-hooks/exhaustive-deps
  const nm = (P.mist || []).filter((m) => m.ok < 3).length;
  return (
    <>
      <div className="pagehead">
        <h2>📐 Ngữ pháp</h2>
        <Pills id="gram" value={tab} onChange={setTab} items={[['lib', '📚 Thư viện ngữ pháp'], ['analyze', '🔍 Phân tích & sửa lỗi'], ['mist', `📒 Sổ lỗi sai${nm ? ` (${nm})` : ''}`], ['pos', '🧩 Từ loại']]} />
      </div>
      {tab === 'analyze' && <Analyzer />}
      {tab === 'mist' && <Mistakes />}
      {tab === 'pos' && <PartsOfSpeech />}
      {tab === 'lib' && <Library initial={lesson && LESSONS[lesson] ? lesson : null} onOpen={setLesson} />}
    </>
  );
}
