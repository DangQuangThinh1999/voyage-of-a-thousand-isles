import { useEffect, useState, useSyncExternalStore } from 'react';
import { tallySkill } from '../lib/progress';
import { CAN_RECORD, hear, micErr, micLive, NEED_CLIP, recordClip, speak, SR, stopClip, stopListening, stopSpeaking } from '../lib/speech';
import { scoreSpeech, type SpeechScore } from '../lib/text';
import type { StepState } from '../state/store';
import { addXP, app, save, withLeave, tab } from '../state/store';
import { WordsHit } from './WordsHit';

/** Thanh âm lượng micro (cập nhật liên tục khi đang nghe) */
export function MicMeter({ active = true }: { active?: boolean }) {
  const live = useSyncExternalStore(micLive.subscribe, micLive.get);
  return <div className="meter"><i id="mlevel" style={active ? { width: Math.round(live.level * 100) + '%' } : undefined} /></div>;
}
/** Chữ máy đang nghe được */
export function LiveText({ placeholder, active = true }: { placeholder: string; active?: boolean }) {
  const live = useSyncExternalStore(micLive.subscribe, micLive.get);
  return <p id="mlive" className="live">{active ? (live.text ?? placeholder) : ''}</p>;
}
/** Bản ghi giọng của bạn để nghe lại */
export function Playback({ src, label }: { src: string; label: string }) {
  return <div className="playback"><span className="small">{label}</span><audio controls src={src} /></div>;
}

/** Kết quả micro trong bài: đang nghe (thanh âm lượng + chữ), lỗi, hoặc điểm phát âm + nghe lại */
export function MicResult({ ss, text }: { ss: StepState; text?: string }) {
  const r = ss.result;
  if (ss.listening) {
    return <div className="listening"><MicMeter /><LiveText placeholder="Đang nghe… hãy nói. Nói xong im lặng 2 giây hoặc bấm 🎤 lần nữa để dừng." /></div>;
  }
  if (!r) return null;
  if (r.err !== undefined) {
    return <p className="note">{r.err} <button className="btn ghost sm" data-act="tab" data-tab="mic" onClick={() => withLeave(() => tab('mic'))}>🎤 Test micro</button></p>;
  }
  return (
    <div className="score">
      <WordsHit T={r.T} hit={r.hit} />
      <div className="muted small">Máy nghe được: “{r.heard}” · {Math.round(r.score * 100)}%</div>
      <ListenBack audio={ss.audio} text={text} label="▶️ Giọng bạn:" />
    </div>
  );
}

/** ⏺ Ghi âm & nghe lại: chỉ thu âm (không chấm), chạy được cả trên điện thoại. Có text → thêm nút 🔊 Giọng mẫu để so. */
export function RecordBack({ text, maxMs = 10000, label = '⏺ Ghi âm & nghe lại' }: { text?: string; maxMs?: number; label?: string }) {
  const [rec, setRec] = useState(false), [clip, setClip] = useState<string | null>(null), [err, setErr] = useState('');
  useEffect(() => () => stopClip(), []);
  if (!CAN_RECORD) return null;
  return (
    <span className="sayit">
      <button className={rec ? 'btn sm' : 'btn ghost sm'} onClick={async () => {
        if (rec) { stopClip(); return; }
        setRec(true); setClip(null); setErr(''); micLive.reset();
        try { setClip(await recordClip({ maxMs, onLevel: micLive.setLevel })); } catch (e) { setErr(micErr(e)); }
        setRec(false); micLive.reset();
      }}>{rec ? '⏹ Dừng ghi' : label}</button>
      {rec && <span className="inline-flex items-center gap-2"><MicMeter /><span className="small muted">Đang ghi… nói xong bấm ⏹</span></span>}
      {err && <span className="note small">{err}</span>}
      {clip && !rec && <span className="sayit-cmp"><button className="btn sm" onClick={() => { stopSpeaking(); new Audio(clip).play().catch(() => {}); }}>▶ Giọng bạn</button>{text && <button className="btn ghost sm" onClick={() => speak(text)}>🔊 Giọng mẫu</button>}{text && <span className="muted small">nghe xen kẽ để so</span>}</span>}
    </span>
  );
}
/** Có bản ghi từ lúc chấm → trình phát; không có (điện thoại) → nút ghi âm riêng */
export function ListenBack({ audio, text, maxMs, label = '▶️ Nghe lại giọng bạn:' }: { audio?: string | null; text?: string; maxMs?: number; label?: string }) {
  if (audio) return <Playback src={audio} label={label} />;
  return NEED_CLIP ? <div className="mt-2"><RecordBack text={text} maxMs={maxMs} label="⏺ Ghi âm để nghe lại giọng mình" /></div> : null;
}

/** Đọc theo câu/từ mẫu: 🎤 máy chấm từng từ (+ cộng kỹ năng Nói) rồi nghe lại giọng mình.
 *  Máy tính: bản ghi có sẵn sau khi chấm. Điện thoại / trình duyệt không nhận giọng: nút ⏺ Ghi âm riêng. */
export function SpeakCheck({ text, label = '🎤 Đọc cho máy chấm', silenceMs = 1500, maxMs = 8000 }: { text: string; label?: string; silenceMs?: number; maxMs?: number }) {
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<(SpeechScore & { audio: string | null }) | { err: string } | null>(null);
  useEffect(() => () => stopListening(), []);
  const go = async () => {
    if (busy) { stopListening(); return; }
    setBusy(true); setR(null); micLive.reset();
    try {
      const h = await hear({ onText: micLive.setText, onLevel: micLive.setLevel, silenceMs, maxMs });
      const s = scoreSpeech(text, h.alts); setR({ ...s, audio: h.audio });
      tallySkill(app.P, 'speak', s.score >= 0.8); if (s.score >= 0.8) addXP(1); else save();
    } catch (e) { setR({ err: micErr(e) }); }
    setBusy(false); micLive.reset();
  };
  const audio = r && !('err' in r) ? r.audio : null;
  return (
    <span className="sayit">
      {SR && <button className={busy ? 'btn sm' : 'btn ghost sm'} onClick={go}>{busy ? '⏹ Dừng' : label}</button>}
      {busy && <span className="inline-flex items-center gap-2"><MicMeter /><LiveText placeholder="Đang nghe…" /></span>}
      {r && ('err' in r ? <span className="note small">{r.err}</span> : <span className="small"><WordsHit T={r.T} hit={r.hit} /> <b className={r.score >= 0.8 ? 'okc' : 'badc'}>{Math.round(r.score * 100)}%</b></span>)}
      {audio ? <Playback src={audio} label="▶️ Giọng bạn:" /> : NEED_CLIP && !busy && <RecordBack text={text} />}
    </span>
  );
}
