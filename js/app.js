'use strict';
/* Hải Trình 5.5 — app học tiếng Anh 4 kỹ năng. Không cần build, chạy thẳng trên trình duyệt. */

// ---------- tiện ích ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const dayKey = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (k, n) => { const d = new Date(k + 'T00:00:00'); d.setDate(d.getDate() + n); return dayKey(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const UNITS = window.UNITS;
const unitById = (id) => UNITS.find((u) => u.id === id);
const WORDS = {}; UNITS.forEach((u) => u.words.forEach(([en, vi, em]) => { WORDS[en] = { en, vi, em, unit: u.id }; }));

const KINDS = [
  ['vocab', '📚', 'Từ vựng', 'Học từ mới bằng hình + âm thanh'],
  ['listen', '🎧', 'Nghe', 'Nghe chọn nghĩa, nghe chép câu'],
  ['speak', '🗣️', 'Nói', 'Đọc to, máy chấm phát âm'],
  ['read', '📖', 'Đọc', 'Đọc đoạn văn ngắn, trả lời câu hỏi'],
  ['write', '✍️', 'Viết', 'Đánh vần, xếp câu, tự viết câu'],
];
const SKILL_OF = { vocab: 'review', listen: 'listen', speak: 'speak', read: 'read', write: 'write' };
const PLAN_KEYS = ['listen', 'speak', 'read', 'write', 'review'];
const SRS_DAYS = [0, 1, 2, 4, 7, 14, 30, 60];
const TOTAL_DAYS = 90;

// ---------- tiến độ ----------
const STORE = 'ht55.progress.v1';
const fresh = () => ({ v: 1, xp: 0, streak: 0, lastDay: '', days: {}, units: {}, srs: {}, journal: [], tests: {},
  settings: { rate: 0.85, voice: '', goalMin: 210 }, startDate: dayKey(), updated: 0, seenIntro: false });
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE));
    if (o && o.v === 1) return { ...fresh(), ...o, settings: { ...fresh().settings, ...(o.settings || {}) } };
  } catch (e) { /* bộ nhớ trình duyệt bị chặn */ }
  return fresh();
}
let P = load();
function save() {
  P.updated = Date.now();
  try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) { /* bỏ qua */ }
  Cloud.schedulePush();
}
function today() {
  const k = dayKey();
  if (!P.days[k]) P.days[k] = { xp: 0, sec: {} };
  return P.days[k];
}
function streakNow() { return P.lastDay === dayKey() || P.lastDay === addDays(dayKey(), -1) ? P.streak : 0; }
function addXP(n) {
  const k = dayKey();
  if (P.lastDay !== k) { P.streak = P.lastDay === addDays(k, -1) ? P.streak + 1 : 1; P.lastDay = k; }
  P.xp += n; today().xp += n; save(); renderHeader();
}
const unitProg = (id) => P.units[id] || (P.units[id] = {});
const doneCount = (id) => KINDS.filter(([k]) => (P.units[id] || {})[k]).length;
const unlocked = (i) => i === 0 || doneCount(UNITS[i - 1].id) >= 3;
const minutesToday = () => Math.floor(Object.values(today().sec).reduce((a, b) => a + b, 0) / 60);

// Gộp tiến độ trên mây với tiến độ trên máy (không mất bài nào đã làm)
function merge(r) {
  if (!r || r.v !== 1) return;
  const newer = (r.updated || 0) > (P.updated || 0) ? r : P, older = newer === r ? P : r;
  const m = { ...fresh(), ...newer, settings: { ...fresh().settings, ...(newer.settings || {}) } };
  m.xp = Math.max(P.xp || 0, r.xp || 0);
  m.startDate = [P.startDate, r.startDate].filter(Boolean).sort()[0] || dayKey();
  m.units = { ...(older.units || {}) };
  for (const [id, v] of Object.entries(newer.units || {})) m.units[id] = { ...(m.units[id] || {}), ...v };
  m.days = { ...(older.days || {}) };
  for (const [k, d] of Object.entries(newer.days || {})) {
    const o = m.days[k] || { xp: 0, sec: {} }, sec = { ...(o.sec || {}) };
    for (const [s, v] of Object.entries(d.sec || {})) sec[s] = Math.max(sec[s] || 0, v);
    m.days[k] = { xp: Math.max(o.xp || 0, d.xp || 0), sec };
  }
  m.tests = { ...(older.tests || {}) };
  for (const [k, v] of Object.entries(newer.tests || {})) { const o = m.tests[k] || {}; m.tests[k] = { ...v, best: Math.max(o.best || 0, v.best || 0), passed: !!(o.passed || v.passed) }; }
  m.srs = { ...(older.srs || {}) };
  for (const [w, v] of Object.entries(newer.srs || {})) if (!m.srs[w] || v.b >= m.srs[w].b) m.srs[w] = v;
  const ids = new Set(), j = [];
  for (const e of [...(newer.journal || []), ...(older.journal || [])]) if (!ids.has(e.id)) { ids.add(e.id); j.push(e); }
  m.journal = j.sort((a, b) => b.id - a.id);
  P = m; save();
}

// ---------- đo thời gian học ----------
let curSkill = null, lastAct = Date.now();
['click', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!curSkill || document.visibilityState !== 'visible' || Date.now() - lastAct > 90000) return;
  const d = today(); d.sec[curSkill] = (d.sec[curSkill] || 0) + 15;
  if ((d.sec[curSkill] / 15) % 4 === 0) save();
  renderHeader();
}, 15000);

// ---------- giọng đọc (máy đọc tiếng Anh) ----------
const TTS = window.speechSynthesis;
function englishVoices() { return TTS ? TTS.getVoices().filter((v) => /^en[-_]/i.test(v.lang)) : []; }
function pickVoice() {
  const vs = englishVoices();
  return vs.find((v) => v.name === P.settings.voice) || vs.find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Aria|Jenny/i.test(v.name))
    || vs.find((v) => /en-US/i.test(v.lang)) || vs[0] || null;
}
function speak(text, slow) {
  if (!TTS) return Promise.resolve();
  TTS.cancel();
  return new Promise((res) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(); if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-US';
    u.rate = slow ? 0.55 : P.settings.rate;
    u.onend = u.onerror = () => res();
    TTS.speak(u);
  });
}
if (TTS) TTS.onvoiceschanged = () => { if (scr === 'settings') render(); };

// ---------- nhận giọng nói (micro) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function hear() {
  return new Promise((res, rej) => {
    if (TTS) TTS.cancel();
    const r = new SR(); let got = false;
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 5;
    r.onresult = (e) => { got = true; res([...e.results[0]].map((a) => a.transcript)); };
    r.onerror = (e) => rej(e.error);
    r.onend = () => { if (!got) rej('no-speech'); };
    r.start();
  });
}

// ---------- chấm câu ----------
const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
  19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 100: 'one hundred' };
const CONTR = { "i'm": 'i am', "don't": 'do not', "doesn't": 'does not', "it's": 'it is', "what's": 'what is', "that's": 'that is',
  "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "isn't": 'is not',
  "aren't": 'are not', "can't": 'can not', cannot: 'can not', "let's": 'let us', "where's": 'where is', "how's": 'how is',
  ok: 'okay', mum: 'mom', oclock: "o'clock",
  dont: 'do not', doesnt: 'does not', im: 'i am', isnt: 'is not', arent: 'are not', cant: 'can not', whats: 'what is', wheres: 'where is', youre: 'you are' };
function norm(s) {
  s = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\$(\d+)/g, '$1 dollars').replace(/(\d+):00/g, "$1 o'clock")
    .replace(/good[\s-]?bye/g, 'goodbye').replace(/[^a-z0-9' ]+/g, ' ');
  return s.split(/\s+/).filter(Boolean).map((w) => {
    w = w.replace(/^'+|'+$/g, '');
    if (CONTR[w]) return CONTR[w];
    if (/^\d+$/.test(w) && NUM[+w]) return NUM[+w];
    return w;
  }).join(' ').replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function checkTyped(input, target) {
  const a = norm(input).split(' '), b = norm(target).split(' ');
  if (a.join(' ') === b.join(' ')) return 'ok';
  if (a.length === b.length && a.every((w, i) => w === b[i] || (b[i].length >= 4 && lev(w, b[i]) <= 1))) return 'almost';
  return 'bad';
}
function lcsHits(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { count: dp[0][0], hit };
}
function scoreSpeech(target, heardList) {
  const T = norm(target).split(' ');
  let best = null;
  for (const h of heardList) {
    const r = lcsHits(T, norm(h).split(' ').filter(Boolean));
    if (!best || r.count > best.count) best = { ...r, heard: h };
  }
  return { T, ...best, score: best.count / T.length };
}
const tokens = (s) => s.split(' ').map((w) => w.replace(/[.,!?]/g, '')).filter(Boolean);

// ---------- tạo bài tập cho từng phần ----------
function distractorWords(u, target, n) {
  const have = new Set(tokens(target).map((w) => norm(w)));
  const pool = [...new Set(u.sentences.flatMap(([en]) => tokens(en)))].filter((w) => !have.has(norm(w)));
  return sample(pool, n);
}
const BUILD = {
  vocab(u) {
    const learn = u.words.map((w) => ({ t: 'learn', w }));
    const quiz = shuffle(u.words).map((w, i) => (i % 2 ? { t: 'pickEn', w, opts: shuffle([w, ...sample(u.words.filter((x) => x !== w), 3)]) }
      : { t: 'pickWord', w, opts: shuffle([w, ...sample(u.words.filter((x) => x !== w), 3)]) }));
    return [...learn, ...quiz];
  },
  listen(u) {
    const words = sample(u.words, 4).map((w) => ({ t: 'pickWord', w, opts: shuffle([w, ...sample(u.words.filter((x) => x !== w), 3)]) }));
    const sents = sample(u.sentences, 3).map((s) => ({ t: 'pickSentence', s, opts: shuffle([s, ...sample(u.sentences.filter((x) => x !== s), 2)]) }));
    const dict = sample(u.sentences, 3).map((s) => ({ t: 'dictation', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }));
    return [...words, ...sents, ...dict];
  },
  speak(u) {
    return [...sample(u.words, 3).map((w) => ({ t: 'speak', en: w[0], vi: `${w[2]} ${w[1]}` })),
      ...u.sentences.map((s) => ({ t: 'speak', en: s[0], vi: s[1] }))];
  },
  read(u) {
    return [{ t: 'passage' }, ...u.questions.map((q) => ({ t: 'question', q }))];
  },
  write(u) {
    const spell = sample(u.words, 3).map((w) => ({ t: 'spell', w }));
    const [a, b, c, d, e] = shuffle(u.sentences);
    const build = [a, b, c].map((s) => ({ t: 'build', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }));
    return [...spell, ...build, { t: 'type', s: d }, { t: 'type', s: e }];
  },
};

// ---------- kiểm tra nhanh: biết rồi thì qua luôn ----------
const PASS = 1; // phải đúng hết mới qua
const opts4 = (u, w) => shuffle([w, ...sample(u.words.filter((x) => x !== w), 3)]);
const MK = {
  pickWord: (u) => { const w = sample(u.words, 1)[0]; return { t: 'pickWord', w, opts: opts4(u, w) }; },
  pickEn: (u) => { const w = sample(u.words, 1)[0]; return { t: 'pickEn', w, opts: opts4(u, w) }; },
  pickSentence: (u) => { const s = sample(u.sentences, 1)[0]; return { t: 'pickSentence', s, opts: shuffle([s, ...sample(u.sentences.filter((x) => x !== s), 2)]) }; },
  dictation: (u) => { const s = sample(u.sentences, 1)[0]; return { t: 'dictation', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }; },
  build: (u) => { const s = sample(u.sentences, 1)[0]; return { t: 'build', s, bank: shuffle([...tokens(s[0]), ...distractorWords(u, s[0], 2)]) }; },
  question: (u) => ({ t: 'question', q: sample(u.questions, 1)[0] }),
  spell: (u) => ({ t: 'spell', w: sample(u.words, 1)[0] }),
  speak: (u) => { const s = sample(u.sentences, 1)[0]; return { t: 'speak', en: s[0], vi: s[1] }; },
};
const SKILL_OF_STEP = { pickWord: 'listen', pickSentence: 'listen', dictation: 'listen', pickEn: 'read', question: 'read', spell: 'write', build: 'write', type: 'write', speak: 'speak' };
const SKILL_NAME = { listen: '🎧 Nghe', read: '📖 Đọc', write: '✍️ Viết', speak: '🗣️ Nói' };
// 1 bài: 7 câu (đủ mọi dạng). 1 tuần: mỗi bài 4 câu ngẫu nhiên. Có micro thì thêm 1 câu nói ở cuối.
function buildTest(units) {
  const types = ['pickWord', 'pickSentence', 'dictation', 'pickEn', 'question', 'spell', 'build'];
  const steps = units.flatMap((u) => (units.length === 1 ? types : sample(types, 4)).map((t) => ({ ...MK[t](u), u })));
  const out = shuffle(steps);
  if (SR) out.push({ ...MK.speak(sample(units, 1)[0]), u: units[0] });
  return out;
}
function startTest(units, key, title) {
  S = { kind: 'test', u: units[0], units, key, title, steps: buildTest(units), i: 0, ok: 0, graded: 0, state: null, requeued: new Set(), skill: {} };
  scr = 'session';
  beginStep();
}
function finishTest() {
  const pct = S.graded ? S.ok / S.graded : 0, passed = pct >= PASS;
  if (!P.tests) P.tests = {};
  const prev = P.tests[S.key] || {};
  P.tests[S.key] = { best: Math.max(prev.best || 0, Math.round(pct * 100)), passed: !!(prev.passed || passed), date: dayKey() };
  if (passed) {
    for (const u of S.units) {
      const up = unitProg(u.id); KINDS.forEach(([k]) => { up[k] = 1; });
      u.words.forEach(([en]) => { if (!P.srs[en] || P.srs[en].b < 2) P.srs[en] = { b: 2, due: addDays(dayKey(), 4) }; });
    }
  }
  const xp = 5 + S.ok * 2;
  S.done = { xp, passed, pct: Math.round(pct * 100) };
  addXP(xp);
  render();
}
function testDoneView() {
  const d = S.done, next = S.key[0] === 'w' ? +S.key.slice(1) + 1 : null;
  const hasNext = next && UNITS.some((u) => u.week === next);
  const rows = Object.entries(S.skill).map(([k, [ok, n]]) => `<div class="row between"><span>${SKILL_NAME[k]}</span><b class="${ok / n >= PASS ? 'okc' : 'badc'}">${ok}/${n}</b></div>`).join('');
  const weak = Object.entries(S.skill).filter(([, [ok, n]]) => ok / n < PASS).map(([k]) => SKILL_NAME[k]);
  return `<div class="card center finish">
    <div class="huge">${d.passed ? '🎉' : '💪'}</div>
    <h2>${d.passed ? `Qua rồi! ${esc(S.title)} đã xong` : `Chưa qua ${esc(S.title)}`}</h2>
    <p>Đúng <b>${S.ok}/${S.graded}</b> (${d.pct}%) · cần đúng hết 100%</p>
    <div class="card left">${rows}</div>
    <p>${d.passed ? 'Các bài đã được đánh dấu học xong. Từ vựng đã vào thẻ ôn, vài ngày nữa sẽ được nhắc lại.'
    : `Không sao cả! ${weak.length ? `Bạn nên học kỹ phần <b>${weak.join(', ')}</b>.` : ''} Học xong rồi làm lại bài kiểm tra nhé.`}</p>
    <p class="xp">+${d.xp} ⭐</p>
    <div class="row gap center">
      <button class="btn ghost" data-act="tab" data-tab="home">← Trang chủ</button>
      ${d.passed && hasNext ? `<button class="btn" data-act="test" data-w="${next}">⚡ Kiểm tra tuần ${next} →</button>` : ''}
      ${!d.passed ? `<button class="btn" data-act="unit" data-u="${S.u.id}">Học bài ${esc(S.u.title)} →</button>` : ''}
    </div></div>`;
}

// ---------- màn hình ----------
let scr = 'home', arg = null, S = null, R = null, flash = '';
function go(s, a = null) {
  if (TTS) TTS.cancel();
  scr = s; arg = a;
  curSkill = s === 'review' ? 'review' : s === 'journal' ? 'write' : null;
  render(); scrollTo(0, 0);
}
function render() {
  renderHeader();
  const html = { home: homeView, unit: unitView, session: sessionView, review: reviewView, plan: planView, journal: journalView, settings: settingsView }[scr]();
  $('#main').innerHTML = html;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === scr || (b.dataset.tab === 'home' && ['unit', 'session'].includes(scr))));
  $('.tabs').style.display = scr === 'session' ? 'none' : '';
  const inp = $('#main input[autofocus], #main textarea[autofocus]'); if (inp) inp.focus();
}
function renderHeader() {
  const min = minutesToday(), goal = P.settings.goalMin;
  const u = Cloud.user;
  $('#stats').innerHTML = `
    <span title="Chuỗi ngày học liên tiếp">🔥 ${streakNow()}</span>
    <span title="Phút học hôm nay / mục tiêu">⏱️ ${min}/${goal}′</span>
    <span title="Điểm kinh nghiệm">⭐ ${P.xp}</span>
    <button class="acct" data-act="settings" title="${u ? esc(u.email || '') : 'Cài đặt & đăng nhập'}">${u && u.photoURL ? `<img src="${esc(u.photoURL)}" alt="">` : '⚙️'}</button>`;
}

function dayNumber() { return Math.min(TOTAL_DAYS, daysBetween(P.startDate, dayKey()) + 1); }
function nextTask() {
  for (let i = 0; i < UNITS.length; i++) {
    if (!unlocked(i)) break;
    const k = KINDS.find(([k]) => !(P.units[UNITS[i].id] || {})[k]);
    if (k) return { u: UNITS[i], k };
  }
  return null;
}
function dueWords() { const k = dayKey(); return Object.entries(P.srs).filter(([, v]) => v.due <= k).map(([w]) => w).filter((w) => WORDS[w]); }

function homeView() {
  const min = minutesToday(), goal = P.settings.goalMin, pct = Math.min(100, Math.round((min / goal) * 100));
  const nt = nextTask(), due = dueWords().length;
  const intro = P.seenIntro ? '' : `
    <div class="card intro">
      <h2>Chào bạn 👋</h2>
      <p>Đây là app luyện <b>Nghe · Nói · Đọc · Viết</b> từ mức mới bắt đầu. Mọi câu tiếng Anh đều có nút 🔊 để nghe và có dịch tiếng Việt.</p>
      <ul>
        <li>Mỗi bài có 5 phần nhỏ, mỗi phần khoảng 5–10 phút.</li>
        <li>Phần nào đã biết thì bấm <b>⚡ Kiểm tra nhanh</b>. Đúng hết 100% là qua luôn.</li>
        <li>Phần <b>Nói</b> dùng micro. Nên dùng <b>Chrome</b> hoặc <b>Edge</b>.</li>
        <li>Mục tiêu IELTS 5.5 trong 3 tháng cần học <b>khoảng 3,5 giờ/ngày</b>. Xem tab 🗺️ Lộ trình.</li>
      </ul>
      <button class="btn" data-act="introOk">Bắt đầu thôi!</button>
    </div>`;
  const weeks = [...new Set(UNITS.map((u) => u.week))];
  return `${intro}
    <div class="card today">
      <div class="row between"><b>Hôm nay · Ngày ${dayNumber()}/${TOTAL_DAYS}</b><span class="muted">${min} / ${goal} phút</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="row gap">
        ${nt ? `<button class="btn big" data-act="start" data-u="${nt.u.id}" data-k="${nt.k[0]}">▶ Học tiếp: ${nt.u.emoji} ${esc(nt.u.title)} · ${nt.k[1]} ${nt.k[2]}</button>`
    : `<div class="muted">Bạn đã xong tất cả bài hiện có 🎉 Bài mới cho tuần 5–8 sẽ được thêm vào.</div>`}
        <button class="btn ghost big" data-act="tab" data-tab="review">🔁 Ôn từ vựng${due ? ` <span class="pill">${due}</span>` : ''}</button>
      </div>
    </div>
    ${weeks.map((w) => `
      <div class="row between wkrow"><h3 class="wk">Tuần ${w}</h3>${weekBadge(w)}</div>
      <div class="units">${UNITS.map((u, i) => [u, i]).filter(([u]) => u.week === w).map(([u, i]) => {
    const lock = !unlocked(i), dc = doneCount(u.id);
    return `<button class="unit ${lock ? 'locked' : ''} ${dc === 5 ? 'done' : ''}" data-act="${lock ? 'locked' : 'unit'}" data-u="${u.id}">
          <span class="em">${lock ? '🔒' : u.emoji}</span>
          <span class="t"><b>${esc(u.title)}</b><small>${esc(u.vi)}</small></span>
          <span class="dots">${KINDS.map(([k]) => `<i class="${(P.units[u.id] || {})[k] ? 'on' : ''}"></i>`).join('')}</span>
        </button>`;
  }).join('')}</div>`).join('')}
    <p class="muted center small">Bài tiếp theo mở khi bạn làm xong 3/5 phần của bài trước.<br>Đã biết rồi? Bấm <b>⚡ Kiểm tra nhanh</b>: đúng hết 100% là qua luôn cả tuần.</p>`;
}
function weekBadge(w) {
  const us = UNITS.filter((u) => u.week === w);
  if (us.every((u) => doneCount(u.id) === 5)) return '<span class="okc small">✓ Đã xong</span>';
  if (!unlocked(UNITS.indexOf(us[0]))) return '<span class="muted small">🔒</span>';
  const t = (P.tests || {})['w' + w];
  return `<button class="btn ghost sm" data-act="test" data-w="${w}">⚡ Kiểm tra nhanh${t ? ` · ${t.best}%` : ''}</button>`;
}

function unitView() {
  const u = unitById(arg), up = P.units[u.id] || {};
  return `
    <div class="row gap"><button class="icon" data-act="tab" data-tab="home">←</button><h2>${u.emoji} ${esc(u.title)} <small class="muted">· ${esc(u.vi)}</small></h2></div>
    <div class="list">
      ${doneCount(u.id) < 5 ? `<button class="item quick" data-act="test" data-u="${u.id}"><span class="em">⚡</span><span class="t"><b>Kiểm tra nhanh</b><small>Biết rồi? Làm ${SR ? 8 : 7} câu, đúng hết 100% là qua luôn bài này</small></span><span class="go">Làm</span></button>` : ''}
      ${KINDS.map(([k, ic, name, desc]) => `
      <button class="item" data-act="start" data-u="${u.id}" data-k="${k}">
        <span class="em">${ic}</span><span class="t"><b>${name}</b><small>${desc}</small></span>
        <span class="${up[k] ? 'ok' : 'go'}">${up[k] ? '✓ Làm lại' : 'Bắt đầu'}</span>
      </button>`).join('')}
      <button class="item" data-act="tab" data-tab="journal"><span class="em">📝</span><span class="t"><b>Nhật ký</b><small>${esc(window.JOURNAL_PROMPTS[u.id] || '')}</small></span><span class="go">Viết</span></button>
    </div>
    <h3>Sổ tay từ vựng</h3>
    <div class="card"><table class="words">${u.words.map(([en, vi, em]) => `
      <tr><td>${em}</td><td><b>${esc(en)}</b></td><td class="muted">${esc(vi)}</td><td><button class="icon sm" data-act="say" data-t="${esc(en)}">🔊</button></td></tr>`).join('')}</table></div>
    <h3>Câu mẫu</h3>
    <div class="card">${u.sentences.map(([en, vi]) => `
      <div class="sent"><button class="icon sm" data-act="say" data-t="${esc(en)}">🔊</button><div><b>${esc(en)}</b><div class="muted">${esc(vi)}</div></div></div>`).join('')}</div>`;
}

// ---------- phiên làm bài ----------
function startSession(uid, kind) {
  const u = unitById(uid);
  S = { u, kind, steps: BUILD[kind](u), i: 0, ok: 0, graded: 0, state: null, requeued: new Set() };
  curSkill = SKILL_OF[kind]; scr = 'session';
  beginStep();
}
function step() { return S.steps[S.i]; }
function beginStep() {
  const st = step();
  S.state = { answered: false, picked: [], tries: 0, result: null, hint: false, showVi: false };
  render(); scrollTo(0, 0);
  if (!st) return;
  if (S.kind === 'test') curSkill = SKILL_OF_STEP[st.t];
  if (st.t === 'learn' || st.t === 'pickWord') speak(st.w[0]);
  if (st.t === 'pickSentence' || st.t === 'dictation') speak(st.s[0]);
}
const GRADED = new Set(['pickWord', 'pickEn', 'pickSentence', 'dictation', 'build', 'type', 'spell', 'speak', 'question']);
function answer(correct, fb) {
  const st = step(); S.state.answered = true; S.state.correct = correct; S.state.fb = fb;
  if (GRADED.has(st.t)) {
    if (!S.requeued.has(S.i)) { S.graded++; if (correct) S.ok++; }
    if (S.kind === 'test') { const k = SKILL_OF_STEP[st.t], v = S.skill[k] || (S.skill[k] = [0, 0]); v[1]++; if (correct) v[0]++; }
    if (!correct && S.kind !== 'test' && !S.requeued.has(S.i) && st.t !== 'speak') { S.requeued.add(S.steps.length); S.steps.push(st); S.state.pushed = true; }
  }
  render();
  const say = { pickEn: st.w && st.w[0], spell: st.w && st.w[0], type: st.s && st.s[0], build: st.s && st.s[0], dictation: st.s && st.s[0], pickSentence: st.s && st.s[0] }[st.t];
  if (say) speak(say);
}
function nextStep() { S.i++; if (S.i >= S.steps.length) finishSession(); else beginStep(); }
function finishSession() {
  if (S.kind === 'test') { finishTest(); return; }
  const { u, kind } = S;
  const xp = 10 + S.ok * 2;
  unitProg(u.id)[kind] = 1;
  if (kind === 'vocab') u.words.forEach(([en]) => { if (!P.srs[en]) P.srs[en] = { b: 0, due: addDays(dayKey(), 1) }; });
  S.done = { xp };
  addXP(xp);
  render();
}

const say = (t, label = '🔊') => `<button class="icon" data-act="say" data-t="${esc(t)}">${label}</button>`;
const sayBoth = (t) => `${say(t)}<button class="icon" data-act="say" data-t="${esc(t)}" data-slow="1" title="Đọc chậm">🐢</button>`;

function sessionView() {
  const { u, kind } = S, kd = kind === 'test' ? ['test', '⚡', 'Kiểm tra nhanh'] : KINDS.find(([k]) => k === kind);
  if (S.done && kind === 'test') return testDoneView();
  if (S.done) {
    const pct = S.graded ? Math.round((S.ok / S.graded) * 100) : 100;
    const nt = nextTask();
    return `<div class="card center finish">
      <div class="huge">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <h2>Xong phần ${kd[2]}!</h2>
      ${S.graded ? `<p>Đúng ngay lần đầu: <b>${S.ok}/${S.graded}</b> (${pct}%)</p>` : ''}
      <p class="xp">+${S.done.xp} ⭐</p>
      <div class="row gap center">
        <button class="btn ghost" data-act="unit" data-u="${u.id}">← Về bài ${esc(u.title)}</button>
        ${nt ? `<button class="btn" data-act="start" data-u="${nt.u.id}" data-k="${nt.k[0]}">Tiếp: ${nt.u.emoji} ${nt.k[1]} ${nt.k[2]} →</button>` : ''}
      </div></div>`;
  }
  const st = step(), ss = S.state, pct = Math.round((S.i / S.steps.length) * 100);
  let body = '', foot = '';
  const opt = (label, i, cls = '') => {
    let c = '';
    if (ss.answered) c = i === ss.correctIdx ? 'right' : i === ss.pickedIdx ? 'wrong' : 'dim';
    return `<button class="opt ${cls} ${c}" data-act="pick" data-i="${i}" ${ss.answered ? 'disabled' : ''}>${label}</button>`;
  };
  switch (st.t) {
    case 'learn': {
      const [en, vi, em] = st.w;
      body = `<p class="ask">Từ mới</p><div class="card center wordcard"><div class="huge">${em}</div><div class="en">${esc(en)}</div><div class="vi">${esc(vi)}</div>
        <div class="row gap center">${sayBoth(en)}${SR ? `<button class="icon" data-act="mic" data-t="${esc(en)}">🎤</button>` : ''}</div><div id="micres">${micResult()}</div></div>`;
      foot = `<button class="btn big" data-act="next">Tiếp →</button>`;
      break;
    }
    case 'pickWord': {
      ss.correctIdx = st.opts.indexOf(st.w);
      body = `<p class="ask">Nghe và chọn nghĩa đúng</p><div class="row gap center">${sayBoth(st.w[0])}</div>
        ${ss.answered ? `<p class="center en">${esc(st.w[0])}</p>` : ''}
        <div class="opts grid2">${st.opts.map((w, i) => opt(`<span class="em">${w[2]}</span>${esc(w[1])}`, i)).join('')}</div>`;
      break;
    }
    case 'pickEn': {
      ss.correctIdx = st.opts.indexOf(st.w);
      body = `<p class="ask">Từ nào nghĩa là:</p><div class="center"><div class="huge">${st.w[2]}</div><div class="vi">${esc(st.w[1])}</div></div>
        <div class="opts grid2">${st.opts.map((w, i) => opt(esc(w[0]), i, 'en')).join('')}</div>`;
      break;
    }
    case 'pickSentence': {
      ss.correctIdx = st.opts.indexOf(st.s);
      body = `<p class="ask">Nghe câu và chọn nghĩa đúng</p><div class="row gap center">${sayBoth(st.s[0])}</div>
        ${ss.answered ? `<p class="center en">${esc(st.s[0])}</p>` : ''}
        <div class="opts">${st.opts.map((s, i) => opt(esc(s[1]), i)).join('')}</div>`;
      break;
    }
    case 'dictation':
    case 'build': {
      const prompt = st.t === 'dictation'
        ? `<p class="ask">Nghe và xếp lại câu bạn nghe được</p><div class="row gap center">${sayBoth(st.s[0])}</div>`
        : `<p class="ask">Dịch sang tiếng Anh</p><div class="card vi-prompt">🇻🇳 ${esc(st.s[1])}</div>`;
      body = `${prompt}
        <div class="slot">${ss.picked.map((bi, n) => `<button class="tile" data-act="unpick" data-n="${n}" ${ss.answered ? 'disabled' : ''}>${esc(st.bank[bi])}</button>`).join('') || '<span class="muted">Bấm vào các từ bên dưới…</span>'}</div>
        <div class="bank">${st.bank.map((w, bi) => `<button class="tile ${ss.picked.includes(bi) ? 'used' : ''}" data-act="tile" data-b="${bi}" ${ss.picked.includes(bi) || ss.answered ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
      if (!ss.answered) foot = `<button class="btn big" data-act="checkTiles" ${ss.picked.length ? '' : 'disabled'}>Kiểm tra</button>`;
      break;
    }
    case 'spell': {
      const [en, vi, em] = st.w;
      body = `<p class="ask">Viết từ tiếng Anh</p><div class="center"><div class="huge">${em}</div><div class="vi">${esc(vi)}</div>
        <p class="hint">${ss.hint ? esc(en[0]) + ' ' : ''}${en.split('').slice(ss.hint ? 1 : 0).map((c) => (c === ' ' ? '&nbsp;&nbsp;' : '_')).join(' ')}</p></div>
        <input id="ans" class="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…" ${ss.answered ? 'disabled' : 'autofocus'} value="${esc(ss.typed || '')}">`;
      if (!ss.answered) foot = `<button class="btn ghost" data-act="hint">💡 Gợi ý</button><button class="btn big" data-act="checkType">Kiểm tra</button>`;
      break;
    }
    case 'type': {
      const hint = st.s[0].split(' ').map((w) => w[0] + w.slice(1).replace(/[a-z]/gi, '_')).join(' ');
      body = `<p class="ask">Tự viết câu tiếng Anh</p><div class="card vi-prompt">🇻🇳 ${esc(st.s[1])}</div>
        ${ss.hint ? `<p class="hint">${esc(hint)}</p>` : ''}
        <textarea id="ans" class="ans" rows="2" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Gõ câu tiếng Anh…" ${ss.answered ? 'disabled' : 'autofocus'}>${esc(ss.typed || '')}</textarea>`;
      if (!ss.answered) foot = `<button class="btn ghost" data-act="hint">💡 Gợi ý</button><button class="btn big" data-act="checkType">Kiểm tra</button>`;
      break;
    }
    case 'speak': {
      body = `<p class="ask">Nghe mẫu rồi đọc to</p><div class="card center speakcard"><div class="en">${esc(st.en)}</div><div class="vi">${esc(st.vi)}</div>
        <div class="row gap center">${sayBoth(st.en)}</div></div>
        ${SR ? `<div class="center"><button class="mic ${ss.listening ? 'rec' : ''}" data-act="mic" data-t="${esc(st.en)}" ${ss.answered ? 'disabled' : ''}>🎤</button>
          <p class="muted small">${ss.listening ? 'Đang nghe… hãy nói!' : 'Bấm micro rồi nói'}</p></div><div id="micres">${micResult()}</div>`
    : `<p class="note">Trình duyệt này không hỗ trợ chấm giọng nói. Hãy mở bằng <b>Chrome</b> hoặc <b>Edge</b>. Tạm thời bạn đọc to theo mẫu rồi tự chấm.</p>`}`;
      if (!ss.answered) {
        foot = SR ? (ss.tries ? `<button class="btn ghost" data-act="skipSpeak">Bỏ qua</button>` : '')
          : `<button class="btn ghost" data-act="selfSpeak" data-ok="0">Chưa được</button><button class="btn big" data-act="selfSpeak" data-ok="1">Tôi đã đọc to ✅</button>`;
      }
      break;
    }
    case 'passage': {
      body = `<p class="ask">Đọc đoạn văn. Bấm vào câu để nghe và xem nghĩa.</p>${passageHTML(u, true)}
        <div class="row gap center">${say(u.reading.map((r) => r[0]).join(' '), '🔊 Nghe cả bài')}
        <button class="btn ghost" data-act="toggleVi">${ss.showVi ? 'Ẩn' : 'Hiện'} tiếng Việt</button></div>`;
      foot = `<button class="btn big" data-act="next">Trả lời câu hỏi →</button>`;
      break;
    }
    case 'question': {
      const [q, qvi, opts, ans] = st.q; ss.correctIdx = ans;
      body = `<details class="card" ${kind === 'test' ? 'open' : ''}><summary>📖 ${kind === 'test' ? 'Đoạn văn' : 'Xem lại đoạn văn'}</summary>${passageHTML(st.u || u, false)}</details>
        <p class="ask">${esc(q)} ${say(q)}</p><p class="muted">${esc(qvi)}</p>
        <div class="opts">${opts.map((o, i) => opt(esc(o), i, 'en')).join('')}</div>`;
      break;
    }
  }
  if (ss.answered && GRADED.has(st.t)) {
    const right = { pickWord: `${st.w && st.w[0]} = ${st.w && st.w[1]}`, pickEn: st.w && `${st.w[0]} = ${st.w[1]}`, spell: st.w && st.w[0] }[st.t] || (st.s ? st.s[0] : st.t === 'speak' ? st.en : '');
    const cls = ss.correct ? 'good' : 'bad';
    foot = `<div class="fb ${cls}"><div><b>${ss.correct ? (ss.fb || 'Chính xác! 🎉') : (ss.fb || 'Chưa đúng')}</b>
      ${right && (!ss.correct || ss.fb) ? `<div>Đáp án: <b>${esc(right)}</b> ${say(right.split(' = ')[0])}</div>` : ''}
      ${st.s && !ss.correct ? `<div class="muted">${esc(st.s[1])}</div>` : ''}</div>
      ${st.t === 'type' && !ss.correct ? `<button class="btn ghost sm" data-act="overrule">Câu tôi cũng đúng</button>` : ''}
      <button class="btn big" data-act="next">Tiếp tục →</button></div>`;
  }
  return `<div class="sess-top"><button class="icon" data-act="quit">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="muted small">${kd[1]}</span></div>
    <div class="sess">${body}</div><div class="foot">${foot}</div>`;
}
function passageHTML(u, clickable) {
  return `<div class="passage">${u.reading.map(([en, vi], i) => `<p ${clickable ? `data-act="line" data-i="${i}"` : ''} class="${clickable ? 'click' : ''}">${esc(en)}
    ${(S && S.state.showVi) || (S && S.state.line === i) ? `<span class="muted">${esc(vi)}</span>` : ''}</p>`).join('')}</div>`;
}
function micResult() {
  const r = S && S.state.result;
  if (!r) return '';
  if (r.err) return `<p class="note">${esc(r.err)}</p>`;
  return `<div class="score"><div class="words-hit">${r.T.map((w, i) => `<span class="${r.hit[i] ? 'hit' : 'miss'}">${esc(w === 'i' ? 'I' : w)}</span>`).join(' ')}</div>
    <div class="muted small">Máy nghe được: “${esc(r.heard)}” · ${Math.round(r.score * 100)}%</div></div>`;
}
async function doMic(target) {
  const ss = S.state; ss.listening = true; ss.result = null; render();
  try {
    const heard = await hear();
    ss.result = scoreSpeech(target, heard);
  } catch (e) {
    const m = { 'not-allowed': 'Bạn chưa cho phép dùng micro. Bấm biểu tượng 🔒 trên thanh địa chỉ để bật micro.', 'no-speech': 'Không nghe thấy gì. Hãy nói to và rõ hơn nhé.', network: 'Lỗi mạng. Chấm giọng nói cần có Internet.' };
    ss.result = { err: m[e] || 'Không nhận được giọng nói (' + e + ').' };
  }
  ss.listening = false; ss.tries++;
  const st = step();
  if (st.t === 'speak' && ss.result && !ss.result.err) {
    const sc = ss.result.score;
    if (sc >= 0.75) { answer(true, sc === 1 ? 'Phát âm tuyệt vời! 🎉' : 'Tốt lắm! Từ màu đỏ cần đọc rõ hơn.'); return; }
    if (ss.tries >= 3) { answer(false, 'Chưa đạt. Nghe lại mẫu và luyện thêm nhé.'); return; }
  }
  render();
}

// ---------- ôn từ vựng (thẻ nhớ) ----------
function startReview(extra) {
  let words = dueWords();
  if (extra) words = sample(Object.keys(P.srs).filter((w) => WORDS[w]), 10);
  R = { q: shuffle(words).slice(0, 40).map((w) => ({ w, dir: Math.random() < 0.5 ? 'en' : 'vi' })), i: 0, flip: false, n: 0 };
  render(); reviewSpeak();
}
function reviewSpeak() { const c = R && R.q[R.i]; if (c && c.dir === 'en') speak(c.w); }
function reviewView() {
  const learned = Object.keys(P.srs).length;
  if (!R || R.i >= R.q.length) {
    const due = dueWords().length, done = R && R.q.length;
    return `<h2>🔁 Ôn từ vựng</h2>
      <div class="card center">${done ? `<div class="huge">✅</div><p>Đã ôn xong ${R.q.length} thẻ. +${R.n} ⭐</p>` : ''}
        <p>Bạn đã học <b>${learned}</b> từ. Cần ôn hôm nay: <b>${due}</b> từ.</p>
        ${due ? `<button class="btn big" data-act="review">Ôn ${due} từ</button>` : learned ? `<p class="muted">Không còn từ nào cần ôn hôm nay 🎉</p><button class="btn ghost" data-act="review" data-extra="1">Ôn thêm 10 từ ngẫu nhiên</button>` : `<p class="muted">Học phần 📚 Từ vựng của bài 1 trước nhé.</p>`}
      </div>
      <p class="muted small">Thẻ nhớ dùng cách “lặp lại ngắt quãng”: từ bạn nhớ sẽ ôn lại sau 1, 2, 4, 7, 14, 30 ngày; từ bạn quên sẽ ôn lại ngay.</p>`;
  }
  const c = R.q[R.i], w = WORDS[c.w];
  const front = c.dir === 'en' ? `<div class="en">${esc(w.en)}</div><div class="row gap center">${sayBoth(w.en)}</div><p class="muted">Nghĩa là gì?</p>`
    : `<div class="huge">${w.em}</div><div class="vi">${esc(w.vi)}</div><p class="muted">Tiếng Anh là gì? Hãy nói to!</p>`;
  const back = `<hr><div class="huge">${w.em}</div><div class="en">${esc(w.en)} ${say(w.en)}</div><div class="vi">${esc(w.vi)}</div>`;
  return `<div class="sess-top"><button class="icon" data-act="tab" data-tab="review" data-reset="1">✕</button><div class="bar"><i style="width:${Math.round((R.i / R.q.length) * 100)}%"></i></div><span class="muted small">${R.i + 1}/${R.q.length}</span></div>
    <div class="card center flash">${front}${R.flip ? back : ''}</div>
    <div class="foot">${R.flip ? `<button class="btn ghost big" data-act="rate" data-ok="0">😕 Quên</button><button class="btn big" data-act="rate" data-ok="1">🙂 Nhớ</button>`
    : `<button class="btn big" data-act="flip">Lật thẻ</button>`}</div>`;
}
function rate(ok) {
  const c = R.q[R.i], s = P.srs[c.w] || { b: 0 };
  if (ok) { s.b = Math.min(SRS_DAYS.length - 1, s.b + 1); s.due = addDays(dayKey(), SRS_DAYS[s.b]); R.n++; addXP(1); }
  else { s.b = 0; s.due = dayKey(); if (!c.again) R.q.push({ ...c, again: true }); }
  P.srs[c.w] = s; save();
  R.i++; R.flip = false; render(); reviewSpeak();
}

// ---------- nhật ký ----------
function journalView() {
  const nt = nextTask(), u = nt ? nt.u : UNITS[UNITS.length - 1];
  return `<h2>📝 Nhật ký tiếng Anh</h2>
    <div class="card"><p><b>Đề hôm nay:</b> ${esc(window.JOURNAL_PROMPTS[u.id])}</p>
      <textarea id="jtext" rows="5" placeholder="Viết bằng tiếng Anh… Sai cũng không sao!" autofocus></textarea>
      <div class="row between"><span class="muted small" id="wc">0 từ</span><button class="btn" data-act="jsave" data-u="${u.id}">Lưu</button></div>
      <p class="muted small">Mẹo: bấm “📋 Nhờ sửa” ở bài đã lưu để chép bài kèm câu nhờ sửa lỗi, rồi dán vào Claude hoặc giáo viên.</p></div>
    ${P.journal.map((e) => `<div class="card jentry"><div class="row between"><span class="muted small">${e.d}</span>
      <span><button class="icon sm" data-act="say" data-t="${esc(e.t)}">🔊</button><button class="icon sm" data-act="jcopy" data-id="${e.id}" title="Nhờ sửa">📋</button><button class="icon sm" data-act="jdel" data-id="${e.id}">🗑️</button></span></div>
      <p>${esc(e.t).replace(/\n/g, '<br>')}</p></div>`).join('')}`;
}

// ---------- lộ trình ----------
function planView() {
  const dn = dayNumber(), week = Math.ceil(dn / 7), d = today();
  const phase = (w) => { const [a, b] = w.weeks.split('–').map(Number); return week >= a && week <= b; };
  return `<h2>🗺️ Lộ trình 3 tháng → IELTS 5.5</h2>
    <div class="card"><div class="row between"><b>Ngày ${dn}/${TOTAL_DAYS} · Tuần ${week}/12</b><span class="muted small">bắt đầu ${P.startDate}</span></div>
      <div class="bar"><i style="width:${Math.round((dn / TOTAL_DAYS) * 100)}%"></i></div>
      <p class="note">Nói thật: từ mức 2.0 lên 5.5 thường cần khoảng 600–800 giờ học. Muốn xong trong 90 ngày thì cần <b>3–4 giờ mỗi ngày, không nghỉ ngày nào</b>.
      Học ít hơn vẫn tiến bộ, chỉ là cần thêm thời gian (khoảng 5–6 tháng). Học đều mỗi ngày quan trọng hơn học dồn.</p></div>
    <h3>Các giai đoạn</h3>
    ${window.ROADMAP.map((r) => `<div class="card phase ${phase(r) ? 'now' : ''}"><div class="row between"><b>Tuần ${r.weeks} · ${esc(r.level)}</b>${phase(r) ? '<span class="pill">Bạn đang ở đây</span>' : ''}</div>
      <p>${esc(r.goal)}</p>${r.inApp ? '<p class="muted small">✅ Đã có bài trong app</p>' : '<p class="muted small">⏳ Bài trong app sẽ được thêm dần</p>'}</div>`).join('')}
    <h3>Mỗi ngày (${P.settings.goalMin} phút)</h3>
    <div class="card">${window.DAILY_PLAN.map(([ic, name, min, desc], i) => {
    const k = PLAN_KEYS[i], done = Math.floor((d.sec[k] || 0) / 60);
    return `<div class="plan"><div class="row between"><b>${ic} ${name}</b><span class="muted small">${done}/${min} phút</span></div>
        <div class="bar thin"><i style="width:${Math.min(100, Math.round((done / min) * 100))}%"></i></div>
        <div class="row between"><span class="muted small">${esc(desc)}</span><button class="btn ghost sm" data-act="addmin" data-k="${k}" title="Ghi thêm 15 phút học ngoài app">+15′</button></div></div>`;
  }).join('')}
      <p class="muted small">Thời gian trong app được đếm tự động. Học ngoài app (podcast, sách…) thì bấm +15′ để ghi lại.</p></div>
    <h3>Tài liệu miễn phí nên dùng thêm</h3>
    <div class="card links">
      <a href="https://learningenglish.voanews.com" target="_blank" rel="noopener">🎧 VOA Learning English: tin tức đọc chậm, có chữ</a>
      <a href="https://www.bbc.co.uk/learningenglish" target="_blank" rel="noopener">🎧 BBC Learning English: bài nghe ngắn theo cấp độ</a>
      <a href="https://learnenglish.britishcouncil.org" target="_blank" rel="noopener">📖 British Council LearnEnglish: đọc, nghe, ngữ pháp A1–B2</a>
      <a href="https://youglish.com" target="_blank" rel="noopener">🗣️ YouGlish: nghe người bản xứ đọc một từ bất kỳ</a>
      <a href="https://ielts.org" target="_blank" rel="noopener">📝 IELTS.org: đề mẫu chính thức (dùng từ tuần 9)</a>
    </div>`;
}

// ---------- cài đặt ----------
function settingsView() {
  const u = Cloud.user, vs = englishVoices(), cur = pickVoice();
  return `<div class="row gap"><button class="icon" data-act="tab" data-tab="home">←</button><h2>⚙️ Cài đặt</h2></div>
    <div class="card"><h3>Tài khoản</h3>
      ${!Cloud.configured ? '<p class="muted">Chưa cấu hình Firebase. Tiến độ chỉ lưu trên trình duyệt này.</p>'
    : u ? `<p>Đã đăng nhập: <b>${esc(u.email || u.displayName || '')}</b>. Tiến độ tự lưu lên mây.</p><button class="btn ghost" data-act="logout">Đăng xuất</button>`
      : `<p>Đăng nhập Google để lưu tiến độ lên mây và học trên nhiều máy.</p><button class="btn" data-act="login">Đăng nhập Google</button>`}
    </div>
    <div class="card"><h3>Giọng đọc</h3>
      ${vs.length ? `<select id="voice">${vs.map((v) => `<option ${cur && v.name === cur.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>`
    : '<p class="muted">Không tìm thấy giọng đọc tiếng Anh. Hãy dùng Chrome hoặc Edge.</p>'}
      <label class="lbl">Tốc độ: <b id="rateV">${P.settings.rate}</b></label>
      <input id="rate" type="range" min="0.5" max="1.1" step="0.05" value="${P.settings.rate}">
      <button class="btn ghost" data-act="say" data-t="Hello! How are you today?">🔊 Thử giọng</button>
    </div>
    <div class="card"><h3>Mục tiêu mỗi ngày</h3>
      <select id="goal">${[30, 60, 120, 180, 210, 240].map((m) => `<option value="${m}" ${m === P.settings.goalMin ? 'selected' : ''}>${m} phút${m === 210 ? ' (đủ cho 5.5 trong 3 tháng)' : ''}</option>`).join('')}</select>
    </div>
    <div class="card"><h3>Xóa tiến độ</h3><p class="muted small">Xóa toàn bộ tiến độ trên máy này. Không thể hoàn tác.</p><button class="btn danger" data-act="reset">Xóa tiến độ</button></div>`;
}

// ---------- xử lý bấm nút ----------
const ACT = {
  tab: (d) => { if (d.reset) R = null; if (d.tab === 'review' && !d.reset) R = null; go(d.tab); },
  settings: () => go('settings'),
  introOk: () => { P.seenIntro = true; save(); render(); },
  unit: (d) => go('unit', d.u),
  locked: () => toast('🔒 Làm xong 3/5 phần của bài trước để mở bài này'),
  start: (d) => startSession(d.u, d.k),
  test: (d) => (d.w ? startTest(UNITS.filter((u) => u.week === +d.w), 'w' + d.w, `Tuần ${d.w}`)
    : startTest([unitById(d.u)], 'u' + d.u, `bài ${unitById(d.u).title}`)),
  say: (d) => speak(d.t, d.slow === '1'),
  quit: () => { if (confirm('Thoát bài này? Kết quả phần này sẽ không được lưu.')) { const id = S.u.id; S = null; go('unit', id); } },
  next: () => nextStep(),
  pick: (d) => { if (S.state.answered) return; S.state.pickedIdx = +d.i; answer(+d.i === S.state.correctIdx); },
  tile: (d) => { S.state.picked.push(+d.b); render(); },
  unpick: (d) => { S.state.picked.splice(+d.n, 1); render(); },
  checkTiles: () => {
    const st = step(), got = S.state.picked.map((i) => st.bank[i]).join(' ');
    answer(norm(got) === norm(tokens(st.s[0]).join(' ')));
  },
  hint: () => { const a = $('#ans'); S.state.typed = a ? a.value : ''; S.state.hint = true; render(); },
  checkType: () => {
    const st = step(), v = $('#ans').value.trim(); if (!v) return;
    S.state.typed = v;
    const target = st.t === 'spell' ? st.w[0] : st.s[0], r = checkTyped(v, target);
    if (S.kind === 'test' && r === 'almost') { answer(false, 'Sai chính tả (bài kiểm tra cần viết đúng hoàn toàn)'); return; }
    answer(r !== 'bad', r === 'almost' ? 'Gần đúng! Chú ý chính tả:' : null);
  },
  overrule: () => { if (S.state.pushed) { S.steps.pop(); S.requeued.delete(S.steps.length); } if (!S.requeued.has(S.i)) S.ok++; nextStep(); },
  mic: (d) => { if (S && !S.state.listening) doMic(d.t); },
  skipSpeak: () => answer(false, 'Bỏ qua, lần sau luyện thêm nhé.'),
  selfSpeak: (d) => answer(d.ok === '1'),
  toggleVi: () => { S.state.showVi = !S.state.showVi; render(); },
  line: (d) => { S.state.line = +d.i; render(); speak(S.u.reading[+d.i][0]); },
  review: (d) => startReview(d.extra === '1'),
  flip: () => { R.flip = true; render(); const c = R.q[R.i]; if (c.dir === 'vi') speak(c.w); },
  rate: (d) => rate(d.ok === '1'),
  jsave: (d) => {
    const t = $('#jtext').value.trim(); if (!t) return;
    P.journal.unshift({ id: Date.now(), d: dayKey(), u: d.u, t }); addXP(5); render(); toast('Đã lưu ✅ +5 ⭐');
  },
  jdel: (d) => { if (confirm('Xóa bài này?')) { P.journal = P.journal.filter((e) => e.id !== +d.id); save(); render(); } },
  jcopy: async (d) => {
    const e = P.journal.find((x) => x.id === +d.id);
    const text = `Please correct my English. Explain each mistake in Vietnamese, then give me the corrected text:\n\n${e.t}`;
    try { await navigator.clipboard.writeText(text); toast('Đã chép. Dán vào Claude để được sửa bài 👍'); } catch (err) { prompt('Chép đoạn này:', text); }
  },
  addmin: (d) => { const day = today(); day.sec[d.k] = (day.sec[d.k] || 0) + 900; save(); render(); toast('+15 phút ✅'); },
  login: async () => { try { await Cloud.signIn(); } catch (e) { toast('Đăng nhập thất bại: ' + (e.code || e.message)); } },
  logout: async () => { await Cloud.signOut(); render(); },
  reset: () => { if (confirm('Xóa toàn bộ tiến độ trên máy này?')) { P = fresh(); save(); go('home'); } },
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b && ACT[b.dataset.act]) { e.preventDefault(); if (b.disabled) return; ACT[b.dataset.act](b.dataset); }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || scr !== 'session' || !S || S.done) return;
  if (e.target.id === 'jtext' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
  if (e.target.id === 'ans' && !S.state.answered) { e.preventDefault(); ACT.checkType(); return; }
  if (S.state.answered || ['learn', 'passage'].includes((step() || {}).t)) { e.preventDefault(); nextStep(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'rate') { P.settings.rate = +e.target.value; $('#rateV').textContent = P.settings.rate; save(); }
  if (e.target.id === 'jtext') $('#wc').textContent = (e.target.value.trim().match(/\S+/g) || []).length + ' từ';
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'voice') { P.settings.voice = e.target.value; save(); speak('Hello! How are you today?'); }
  if (e.target.id === 'goal') { P.settings.goalMin = +e.target.value; save(); renderHeader(); }
});
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

// ---------- khởi động ----------
Cloud.init({ get: () => P, merge, changed: () => render() });
addEventListener('pagehide', () => { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) { /* bỏ qua */ } Cloud.push(); });
render();
