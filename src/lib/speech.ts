// Giọng đọc (máy đọc tiếng Anh) và nhận giọng nói (micro).

const TTS: SpeechSynthesis | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;
const W = window as unknown as { SpeechRecognition?: new () => AnyRecognition; webkitSpeechRecognition?: new () => AnyRecognition;
  webkitAudioContext?: typeof AudioContext };
/** Có hỗ trợ nhận giọng nói không (Chrome, Edge) */
export const SR = W.SpeechRecognition || W.webkitSpeechRecognition;

export interface SpeechOptions { rate: number; voice: string; fast: boolean }
let getOpts: () => SpeechOptions = () => ({ rate: 0.85, voice: '', fast: false });
/** Đặt hàm lấy cài đặt giọng đọc (tốc độ, giọng, đang làm bài kiểm tra hay không) */
export function configureSpeech(fn: () => SpeechOptions) { getOpts = fn; }

/** Giọng mạng quá chậm trên máy này → chỉ dùng giọng có sẵn trên máy */
let localOnly = false;
export function englishVoices(): SpeechSynthesisVoice[] {
  return TTS ? TTS.getVoices().filter((v) => /^en[-_]/i.test(v.lang) && (!localOnly || v.localService)) : [];
}
export function pickVoice(name = getOpts().voice): SpeechSynthesisVoice | null {
  const vs = englishVoices();
  return vs.find((v) => v.name === name) || vs.find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Aria|Jenny/i.test(v.name))
    || vs.find((v) => /en-US/i.test(v.lang)) || vs[0] || null;
}
// ---------- giọng theo vai (kiểu đề IELTS: nam / nữ, giọng Anh – Úc – Mỹ…) ----------
/** Vai đọc: giới tính + giọng vùng */
export interface Role { g: 'f' | 'm'; lang: string }
const FEMALE_V = /female|woman|zira|samantha|susan|hazel|libby|sonia|maisie|aria|jenny|michelle|karen|moira|tessa|fiona|serena|victoria|kate|emma|amy|olivia|natasha|ava|allison|catherine|clara|leah|heera|neerja/i;
const MALE_V = /\bmale|\bman\b|david|mark|george|daniel|ryan|guy|thomas|fred|alex\b|oliver|arthur|james|william|brian|christopher|eric|liam|william|connor|prabhat|ravi|gordon|lee\b/i;
const genderOfVoice = (v: SpeechSynthesisVoice): 'f' | 'm' | null => (FEMALE_V.test(v.name) ? 'f' : MALE_V.test(v.name) ? 'm' : null);
/** Chọn giọng gần với vai nhất: đúng giọng vùng + đúng giới tính. known = giới tính của giọng đã biết (khỏi chỉnh cao độ) */
function pickRoleVoice(r: Role): { v: SpeechSynthesisVoice | null; known: boolean } {
  let best: SpeechSynthesisVoice | null = null, bs = -1e9;
  for (const v of englishVoices()) {
    const g = genderOfVoice(v), lang = v.lang.replace('_', '-');
    const s = (lang === r.lang ? 4 : lang.slice(0, 2) === 'en' ? 0 : -9) + (g === r.g ? 3 : g ? -6 : 0) + (/Google|Natural|Online/i.test(v.name) ? 1 : 0);
    if (s > bs) { bs = s; best = v; }
  }
  return { v: best, known: !!best && genderOfVoice(best) === r.g };
}
const ACCENT: [RegExp, string][] = [[/austral/i, 'en-AU'], [/americ|\bus\b|usa/i, 'en-US'], [/canad/i, 'en-CA'], [/zealand|\bnz\b/i, 'en-NZ'], [/ireland|irish/i, 'en-IE'], [/india/i, 'en-IN'], [/brit|engl|uk\b|scot/i, 'en-GB']];
export const LANG_NAME: Record<string, string> = { 'en-GB': 'giọng Anh', 'en-AU': 'giọng Úc', 'en-US': 'giọng Mỹ', 'en-CA': 'giọng Canada', 'en-NZ': 'giọng New Zealand', 'en-IE': 'giọng Ireland', 'en-IN': 'giọng Ấn' };
export const accentLang = (accent = '') => ACCENT.find(([re]) => re.test(accent))?.[1] || 'en-GB';
const F_NAMES = /^(mrs|ms|miss|woman|girl|lady|mother|mum|mom|sister|wife|aunt|she|anna|anne|mary|sarah|sara|emma|emily|lucy|kate|katie|jane|julia|laura|lisa|linda|susan|sophie|sophia|olivia|amy|rachel|helen|jessica|jenny|alice|lily|lan|mai|hoa|linh|chloe|grace|hannah|maria|nina|rose|zoe|claire|karen|ellen|diana|fiona|tina|amanda|beth|ruth|vicky|joanna|natalie|nicole|megan|lauren|anna|eva|ella|mia|ava)\b/i;
const M_NAMES = /^(mr|man|boy|father|dad|brother|husband|uncle|he|tom|john|james|david|peter|paul|mark|mike|michael|jack|sam|ben|dan|daniel|nam|minh|tuan|alex|chris|steve|george|harry|henry|adam|andrew|robert|richard|william|oliver|ryan|kevin|tony|jim|joe|bob|nick|matt|simon|frank|ed|edward|luke|max|leo|noah|ethan|liam|lucas)\b/i;
/** Tên người nói ở đầu câu "Tên: …" */
export const speakerOf = (line: string) => line.match(/^([A-Z][\w .'-]{0,20}):\s*/)?.[1] || '';
export const stripSpeaker = (line: string) => line.replace(/^[A-Z][\w .'-]{0,20}:\s*/, '');
/** Gán vai cho từng câu của bài nghe: mỗi người nói 1 giọng riêng, người sau luôn khác giới người trước (1 nam – 1 nữ), giọng vùng theo accent của bài */
export function scriptRoles(lines: string[], accent = ''): Role[] {
  const base = accentLang(accent), alt = ['en-GB', 'en-AU', 'en-US'].filter((x) => x !== base);
  const who = new Map<string, Role>();
  let lastG: 'f' | 'm' = 'm';
  return lines.map((l) => {
    const name = speakerOf(l) || '·narrator';
    let r = who.get(name);
    if (!r) {
      // người đầu: đoán theo tên; từ người thứ 2: LUÔN khác giới người trước (nghe dễ phân biệt, giống đề IELTS 1 nam 1 nữ)
      const guess: 'f' | 'm' = F_NAMES.test(name) ? 'f' : M_NAMES.test(name) ? 'm' : 'f';
      const g: 'f' | 'm' = who.size === 0 ? guess : lastG === 'f' ? 'm' : 'f';
      // người nói thứ 3 trở đi (thảo luận nhiều người, kiểu Section 3) dùng giọng vùng khác
      r = { g, lang: who.size < 2 ? base : alt[(who.size - 2) % alt.length] };
      who.set(name, r);
    }
    lastG = r.g;
    return r;
  });
}
/** Danh sách người nói của bài nghe (tên + giới tính + giọng), theo thứ tự xuất hiện */
export function scriptCast(lines: string[], accent = ''): { name: string; g: 'f' | 'm'; lang: string }[] {
  const roles = scriptRoles(lines, accent), seen = new Map<string, { name: string; g: 'f' | 'm'; lang: string }>();
  lines.forEach((l, i) => { const n = speakerOf(l) || ''; if (!seen.has(n)) seen.set(n, { name: n, ...roles[i] }); });
  return [...seen.values()];
}
/** Giọng cố định cho 1 bài (đọc đoạn văn): đổi luân phiên nam/nữ, Anh/Úc/Mỹ theo id bài để tai quen nhiều giọng */
export function roleFor(id: string): Role {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const R: Role[] = [{ g: 'f', lang: 'en-GB' }, { g: 'm', lang: 'en-AU' }, { g: 'f', lang: 'en-US' }, { g: 'm', lang: 'en-GB' }, { g: 'f', lang: 'en-AU' }, { g: 'm', lang: 'en-US' }];
  return R[Math.abs(h) % R.length];
}

// Điện thoại (iOS Safari, Chrome Android) chỉ cho phát âm thanh sau khi người dùng chạm vào trang lần đầu,
// và hay "nuốt" câu nếu gọi speak() ngay sau cancel(). Mở khóa ở lần chạm đầu tiên.
// Máy không có giọng đọc (trình duyệt trong Zalo/Messenger, Android thiếu giọng tiếng Anh): phát file mp3 từ /api/tts.
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
/** Trình duyệt nhúng trong app (Zalo, Facebook, Messenger, Instagram, TikTok…) thường không có giọng đọc */
export const IN_APP = /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|; wv\)/i.test(UA);
let useAudio = !TTS || IN_APP;
let player: HTMLAudioElement | null = null;
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  try { if (TTS && !useAudio) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; TTS.speak(u); } } catch { /* bỏ qua */ }
  // mở khóa phát âm thanh cho đường dự phòng
  try { player = new Audio(); player.muted = true; player.play().catch(() => {}); player.pause(); player.muted = false; } catch { /* bỏ qua */ }
}
if (typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, unlock, { capture: true, passive: true });
  if (TTS) TTS.getVoices(); // nạp sẵn danh sách giọng (Chrome tải không đồng bộ)
}
/** Cắt câu dài thành đoạn ≤ 180 ký tự (giới hạn của máy chủ đọc) */
function chunks(t: string): string[] {
  const out: string[] = []; let cur = '';
  for (const p of t.split(/(?<=[.!?;,])\s+/)) {
    if ((cur + ' ' + p).trim().length > 180) { if (cur) out.push(cur); cur = p.length > 180 ? '' : p; if (p.length > 180) out.push(...(p.match(/.{1,180}(\s|$)/g) || [p])); }
    else cur = (cur + ' ' + p).trim();
  }
  if (cur) out.push(cur);
  return out;
}
let audioSeq = 0;
/** Phát bằng file mp3 (dự phòng) */
async function speakAudio(text: string, slow: boolean, role?: Role): Promise<void> {
  const my = ++audioSeq;
  if (!player) player = new Audio();
  for (const c of chunks(text)) {
    if (my !== audioSeq) return;
    await new Promise<void>((res) => {
      const a = player!;
      a.onended = a.onerror = () => res();
      a.src = `/api/tts?q=${encodeURIComponent(c)}${slow ? '&slow=1' : ''}${role ? '&tl=' + role.lang : ''}`;
      a.playbackRate = 1;
      a.play().catch(() => res());
    });
  }
}
/** Đọc tiếng Anh. role = đọc theo vai (nam/nữ, giọng vùng) cho bài nghe kiểu IELTS */
export function speak(text: string, slow = false, role?: Role): Promise<void> {
  unlock();
  if (useAudio || !TTS) return speakAudio(text, slow, role);
  const busy = TTS.speaking || TTS.pending;
  if (busy) TTS.cancel();
  return new Promise((res) => {
    const o = getOpts();
    const u = new SpeechSynthesisUtterance(text);
    const rv = role ? pickRoleVoice(role) : null, v = rv ? rv.v : pickVoice(o.voice); if (v) u.voice = v;
    u.lang = v ? v.lang : role?.lang || 'en-US';
    // máy không có giọng đúng giới tính → chỉnh cao độ để nghe ra nam / nữ
    if (role && !rv?.known) u.pitch = role.g === 'm' ? 0.75 : 1.2;
    u.rate = slow ? 0.55 : o.fast ? Math.max(1, o.rate) : o.rate; // bài kiểm tra đọc nhanh hơn
    u.volume = 1;
    let done = false, started = false;
    const fin = () => { if (done) return; done = true; res(); };
    // giọng mạng (Google…) bắt đầu trễ SAU khi đã chuyển sang mp3 → tắt ngay, tránh đọc 1 câu 2 lần chồng nhau
    u.onstart = () => { if (done) { TTS.cancel(); return; } started = true; };
    u.onend = fin;
    u.onerror = (e) => {
      // lỗi thật (không phải do mình hủy để đọc câu khác) → chuyển sang phát mp3
      if (!started && e.error !== 'interrupted' && e.error !== 'canceled') { useAudio = true; done = true; speakAudio(text, slow, role).then(res); } else fin();
    };
    const go = () => {
      TTS.speak(u);
      // không bắt đầu đọc sau 1,8 giây → máy không có giọng / bị chặn: dùng mp3 từ giờ
      // giọng mạng cần chờ lâu hơn; quá lâu thì lần sau chỉ dùng giọng có sẵn trên máy (không chuyển hẳn sang mp3 nếu máy vẫn có giọng)
      const remote = !!v && !v.localService;
      setTimeout(() => {
        if (started || done) return;
        TTS.cancel(); done = true;
        if (remote && englishVoices().some((x) => x.localService)) { localOnly = true; speak(text, slow, role).then(res); return; }
        useAudio = true; speakAudio(text, slow, role).then(res);
      }, remote ? 6000 : 2500);
      // phòng trường hợp trình duyệt không gọi onend (iOS): tự kết thúc sau thời gian ước tính
      setTimeout(fin, 3000 + text.length * (slow ? 160 : 95));
    };
    // sau cancel() cần chờ một chút, nếu không Safari/Chrome mobile bỏ qua câu mới
    if (busy) setTimeout(go, 60); else go();
  });
}
export function stopSpeaking() { if (TTS) TTS.cancel(); audioSeq++; if (player) { player.pause(); } }
/** Gọi lại khi danh sách giọng đọc thay đổi */
export function onVoicesChanged(fn: () => void) { if (TTS) TTS.onvoiceschanged = fn; }

// ---------- nhận giọng nói ----------
export interface HeardResult { alts: string[]; text: string; audio: string | null }
export interface HearOptions { onText?: (t: string) => void; onLevel?: (v: number) => void; maxMs?: number; silenceMs?: number; startMs?: number; lang?: string }

let REC: { stop: () => void } | null = null;
/** Dừng lượt nghe đang chạy (nếu có) */
export function stopListening() { if (REC) REC.stop(); }

// Nghe liên tục cho tới khi bạn ngừng nói (im lặng ~2 giây) hoặc bấm dừng.
// Đồng thời ghi âm để bạn nghe lại giọng mình, và đo âm lượng micro.
/** Điện thoại: không mở micro thu âm song song (tranh micro với nhận giọng nói), nghe theo từng đoạn rồi nối lại */
const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(UA);
/** Máy chấm giọng KHÔNG tự thu âm được (điện thoại, hoặc trình duyệt không nhận giọng) → cần nút ⏺ Ghi âm riêng để nghe lại */
export const NEED_CLIP = MOBILE || !SR;
export function hear({ onText, onLevel, maxMs = 30000, silenceMs = 2000, startMs = 7000, lang = 'en-US' }: HearOptions = {}): Promise<HeardResult> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (res, rej) => {
    stopSpeaking(); stopClip();
    let stream: MediaStream | null = null, media: MediaRecorder | null = null, actx: AudioContext | null = null, raf = 0;
    const chunks: Blob[] = [];
    if (!MOBILE) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (window.MediaRecorder) { media = new MediaRecorder(stream); media.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); }; media.start(); }
        const AC = window.AudioContext || W.webkitAudioContext;
        if (onLevel && AC) {
          actx = new AC();
          const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an);
          const buf = new Uint8Array(an.fftSize);
          const loop = () => { an.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += (v - 128) ** 2; onLevel(Math.min(1, Math.sqrt(sum / buf.length) / 40)); raf = requestAnimationFrame(loop); };
          loop();
        }
      } catch (e) {
        if (e && (e as DOMException).name === 'NotAllowedError') { rej('not-allowed'); return; }
        // không ghi âm được thì vẫn nhận giọng nói bình thường
      }
    }
    if (!SR) { rej('start-failed'); return; }
    let r: AnyRecognition = null, ended = false, halting = false, heardAny = false;
    const doneSegs: string[] = [];           // chữ của các đoạn nghe trước (điện thoại nghe từng đoạn)
    let finals: string[][] = [], interim = '', err: string | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    const t0 = Date.now();
    // Một số máy không báo 'onend' sau khi dừng: tự kết thúc sau 2,5 giây để không bị kẹt
    const halt = () => { halting = true; try { r && r.stop(); } catch { /* đã dừng */ } setTimeout(() => { if (!ended) finish(); }, 2500); };
    REC = { stop: halt };
    const stopIn = (ms: number) => { clearTimeout(timer); timer = setTimeout(halt, ms); };
    const hard = setTimeout(halt, maxMs);
    const cur = () => finals.filter(Boolean).map((a) => a[0]).join(' ');
    const text = () => [...doneSegs, cur()].join(' ').replace(/\s+/g, ' ').trim();
    const finish = () => {
      if (ended) return; ended = true;
      try { r && r.abort(); } catch { /* đã dừng */ }
      clearTimeout(timer); clearTimeout(hard); cancelAnimationFrame(raf); REC = null;
      if (actx) actx.close().catch(() => {});
      const done = () => {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        const audio = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || 'audio/webm' })) : null;
        const main = (text() + ' ' + interim).replace(/\s+/g, ' ').trim();
        if (!main) { rej(err === 'not-allowed' || err === 'service-not-allowed' ? 'not-allowed' : err && err !== 'no-speech' && err !== 'aborted' ? err : 'no-speech'); return; }
        const segs = finals.filter(Boolean);
        const alts = !doneSegs.length && segs.length === 1 ? segs[0] : [main];
        res({ alts, text: main, audio });
      };
      if (media && media.state !== 'inactive') { media.onstop = done; media.stop(); } else done();
    };
    const startSession = () => {
      r = new SR();
      r.lang = lang; r.continuous = !MOBILE; r.interimResults = true; r.maxAlternatives = 3;
      r.onresult = (e: AnyRecognition) => {
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const x = e.results[i];
          if (x.isFinal) finals[i] = [...x].map((a: { transcript: string }) => a.transcript); else interim += x[0].transcript;
        }
        heardAny = true;
        if (onText) onText((text() + ' ' + interim).trim());
        stopIn(silenceMs);
      };
      r.onerror = (e: { error: string }) => { err = e.error; if (e.error === 'not-allowed' || e.error === 'service-not-allowed') halt(); };
      r.onend = () => {
        // điện thoại: mỗi đoạn tự dừng → lưu chữ và nghe tiếp tới khi im lặng đủ lâu / hết giờ / bấm dừng
        if (MOBILE && !halting && !ended && Date.now() - t0 < maxMs && err !== 'not-allowed' && err !== 'service-not-allowed') {
          const c = cur(); if (c) doneSegs.push(c);
          if (interim.trim() && !c) doneSegs.push(interim.trim());
          finals = []; interim = '';
          setTimeout(() => { if (!halting && !ended) { try { startSession(); } catch { finish(); } } }, 120);
          return;
        }
        finish();
      };
      r.start();
    };
    try { startSession(); } catch { rej('start-failed'); return; }
    stopIn(startMs); // chưa nói gì trong ~7 giây thì dừng
    void heardAny;
  });
}

const MIC_ERR: Record<string, string> = {
  'not-allowed': 'Bạn chưa cho phép dùng micro. Bấm biểu tượng 🔒 bên trái thanh địa chỉ → Micro → Cho phép, rồi tải lại trang.',
  'no-speech': 'Không nghe thấy gì. Hãy nói to, rõ hơn, hoặc vào ⚙️ Cài đặt → 🎤 Test micro để kiểm tra.',
  'audio-capture': 'Không tìm thấy micro. Hãy cắm micro/tai nghe rồi thử lại.',
  network: 'Lỗi mạng. Chấm giọng nói cần có Internet.',
  'start-failed': 'Micro đang bận. Đợi 1 giây rồi bấm lại.',
};
export const micErr = (e: unknown): string => MIC_ERR[String(e)] || 'Không nhận được giọng nói (' + String(e) + ').';

// ---------- mức âm lượng + chữ đang nghe (cập nhật liên tục, chỉ thành phần micro vẽ lại) ----------
type Live = { level: number; text: string | null };
let live: Live = { level: 0, text: null };
const liveSubs = new Set<() => void>();
const setLive = (p: Partial<Live>) => { live = { ...live, ...p }; liveSubs.forEach((f) => f()); };
export const micLive = {
  get: () => live,
  subscribe: (f: () => void) => { liveSubs.add(f); return () => { liveSubs.delete(f); }; },
  reset: () => setLive({ level: 0, text: null }),
  setLevel: (v: number) => setLive({ level: v }),
  setText: (t: string) => setLive({ text: t || '…' }),
};

// ---------- ghi âm thuần (không nhận giọng) để tự nghe lại và so với giọng mẫu — chạy được cả trên điện thoại ----------
export const CAN_RECORD = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && !!window.MediaRecorder;
let CLIP: { stop: () => void } | null = null;
/** Dừng bản ghi đang chạy (nếu có) */
export function stopClip() { if (CLIP) CLIP.stop(); }
/** Ghi âm tới khi gọi stopClip() hoặc hết maxMs. Trả về URL của bản ghi. */
export function recordClip({ maxMs = 8000, onLevel }: { maxMs?: number; onLevel?: (v: number) => void } = {}): Promise<string> {
  return new Promise(async (res, rej) => { // eslint-disable-line no-async-promise-executor
    stopSpeaking(); stopClip(); stopListening();
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { rej((e as DOMException)?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture'); return; }
    const chunks: Blob[] = [], media = new MediaRecorder(stream);
    let actx: AudioContext | null = null, raf = 0;
    const AC = window.AudioContext || W.webkitAudioContext;
    if (onLevel && AC) {
      actx = new AC();
      const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; onLevel(Math.min(1, Math.sqrt(s / buf.length) / 40)); raf = requestAnimationFrame(loop); };
      loop();
    }
    media.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    media.onstop = () => {
      cancelAnimationFrame(raf); if (actx) actx.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop()); CLIP = null;
      if (!chunks.length) { rej('no-speech'); return; }
      res(URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || 'audio/webm' })));
    };
    const hard = setTimeout(() => stop(), maxMs);
    const stop = () => { clearTimeout(hard); if (media.state !== 'inactive') media.stop(); };
    CLIP = { stop };
    media.start();
  });
}
