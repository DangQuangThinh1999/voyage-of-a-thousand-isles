import { useSyncExternalStore } from 'react';
import { micLive } from '../lib/speech';
import type { StepState } from '../state/store';
import { leaveOk, tab } from '../state/store';
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
export function MicResult({ ss }: { ss: StepState }) {
  const r = ss.result;
  if (ss.listening) {
    return <div className="listening"><MicMeter /><LiveText placeholder="Đang nghe… hãy nói. Nói xong im lặng 2 giây hoặc bấm 🎤 lần nữa để dừng." /></div>;
  }
  if (!r) return null;
  if (r.err !== undefined) {
    return <p className="note">{r.err} <button className="btn ghost sm" data-act="tab" data-tab="mic" onClick={() => leaveOk() && tab('mic')}>🎤 Test micro</button></p>;
  }
  return (
    <div className="score">
      <WordsHit T={r.T} hit={r.hit} />
      <div className="muted small">Máy nghe được: “{r.heard}” · {Math.round(r.score * 100)}%</div>
      {ss.audio && <Playback src={ss.audio} label="▶️ Giọng bạn:" />}
    </div>
  );
}
