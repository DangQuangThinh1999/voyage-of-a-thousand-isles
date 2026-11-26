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

export function englishVoices(): SpeechSynthesisVoice[] {
  return TTS ? TTS.getVoices().filter((v) => /^en[-_]/i.test(v.lang)) : [];
}
export function pickVoice(name = getOpts().voice): SpeechSynthesisVoice | null {
  const vs = englishVoices();
  return vs.find((v) => v.name === name) || vs.find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Aria|Jenny/i.test(v.name))
    || vs.find((v) => /en-US/i.test(v.lang)) || vs[0] || null;
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
async function speakAudio(text: string, slow: boolean): Promise<void> {
  const my = ++audioSeq;
  if (!player) player = new Audio();
  for (const c of chunks(text)) {
    if (my !== audioSeq) return;
    await new Promise<void>((res) => {
      const a = player!;
      a.onended = a.onerror = () => res();
      a.src = `/api/tts?q=${encodeURIComponent(c)}${slow ? '&slow=1' : ''}`;
      a.playbackRate = 1;
      a.play().catch(() => res());
    });
  }
}
export function speak(text: string, slow = false): Promise<void> {
  unlock();
  if (useAudio || !TTS) return speakAudio(text, slow);
  const busy = TTS.speaking || TTS.pending;
  if (busy) TTS.cancel();
  return new Promise((res) => {
    const o = getOpts();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(o.voice); if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-US';
    u.rate = slow ? 0.55 : o.fast ? Math.max(1, o.rate) : o.rate; // bài kiểm tra đọc nhanh hơn
    u.volume = 1;
    let done = false, started = false;
    const fin = () => { if (done) return; done = true; res(); };
    u.onstart = () => { started = true; };
    u.onend = fin;
    u.onerror = (e) => {
      // lỗi thật (không phải do mình hủy để đọc câu khác) → chuyển sang phát mp3
      if (!started && e.error !== 'interrupted' && e.error !== 'canceled') { useAudio = true; done = true; speakAudio(text, slow).then(res); } else fin();
    };
    const go = () => {
      TTS.speak(u);
      // không bắt đầu đọc sau 1,8 giây → máy không có giọng / bị chặn: dùng mp3 từ giờ
      setTimeout(() => { if (!started && !done) { TTS.cancel(); useAudio = true; done = true; speakAudio(text, slow).then(res); } }, 2500);
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
export function hear({ onText, onLevel, maxMs = 30000, silenceMs = 2000, startMs = 7000, lang = 'en-US' }: HearOptions = {}): Promise<HeardResult> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (res, rej) => {
    stopSpeaking();
    let stream: MediaStream | null = null, media: MediaRecorder | null = null, actx: AudioContext | null = null, raf = 0;
    const chunks: Blob[] = [];
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
    if (!SR) { rej('start-failed'); return; }
    const r = new SR();
    let ended = false;
    // Một số máy không báo 'onend' sau khi dừng: tự kết thúc sau 2,5 giây để không bị kẹt
    const halt = () => { try { r.stop(); } catch { /* đã dừng */ } setTimeout(() => { if (!ended) finish(); }, 2500); };
    REC = { stop: halt };
    r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    const finals: string[][] = []; let interim = '', err: string | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    const stopIn = (ms: number) => { clearTimeout(timer); timer = setTimeout(halt, ms); };
    const hard = setTimeout(halt, maxMs);
    const text = () => finals.filter(Boolean).map((a) => a[0]).join(' ').replace(/\s+/g, ' ').trim();
    r.onresult = (e: AnyRecognition) => {
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) finals[i] = [...x].map((a: { transcript: string }) => a.transcript); else interim += x[0].transcript;
      }
      if (onText) onText((text() + ' ' + interim).trim());
      stopIn(silenceMs);
    };
    r.onerror = (e: { error: string }) => { err = e.error; };
    const finish = () => {
      if (ended) return; ended = true;
      try { r.abort(); } catch { /* đã dừng */ }
      clearTimeout(timer); clearTimeout(hard); cancelAnimationFrame(raf); REC = null;
      if (actx) actx.close().catch(() => {});
      const done = () => {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        const audio = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: chunks[0].type || 'audio/webm' })) : null;
        const main = text() || interim.trim();
        if (!main) { rej(err === 'not-allowed' ? 'not-allowed' : err && err !== 'no-speech' && err !== 'aborted' ? err : 'no-speech'); return; }
        const segs = finals.filter(Boolean);
        const alts = segs.length === 1 ? segs[0] : [main];
        res({ alts, text: main, audio });
      };
      if (media && media.state !== 'inactive') { media.onstop = done; media.stop(); } else done();
    };
    r.onend = finish;
    try { r.start(); } catch { rej('start-failed'); return; }
    stopIn(startMs); // chưa nói gì trong ~7 giây thì dừng
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
