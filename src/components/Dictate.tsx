// Nút "🎤 Nói thay viết": bấm rồi nói, chữ máy nghe được được thêm vào ô viết (sửa lại được trước khi nộp).
// lang: 'en-US' cho ô tiếng Anh, 'vi-VN' cho ô tiếng Việt. Im lặng 3 giây tự dừng.
import { useState } from 'react';
import { hear, micErr, SR, stopListening } from '../lib/speech';
import { toast } from '../state/store';

export function Dictate({ value, onChange, lang = 'en-US', className = '', short = false, label }: { value: string; onChange: (v: string) => void; lang?: 'en-US' | 'vi-VN'; className?: string; short?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false), [live, setLive] = useState('');
  if (!SR) return null;
  const go = async () => {
    if (busy) { stopListening(); return; }
    setBusy(true); setLive('');
    try {
      const h = await hear({ lang, onText: setLive, silenceMs: 3000, maxMs: 120000 });
      if (h.text) {
        let t = h.text.trim();
        if (short) onChange(t.replace(/[.!?]+$/, '')); // ô ngắn (1 từ / cụm từ): thay chữ cũ, không thêm dấu chấm
        else { t = t.charAt(0).toUpperCase() + t.slice(1); if (!/[.!?…]$/.test(t)) t += '.'; onChange((value.trim() ? value.trim() + ' ' : '') + t); }
      } else toast('Chưa nghe thấy gì, thử nói to và gần micro hơn');
    } catch (e) { toast(micErr(e)); }
    setBusy(false); setLive('');
  };
  return (
    <span className={'dictate ' + className}>
      <button type="button" className={'btn sm ' + (busy ? 'rec' : 'ghost')} onClick={go} title={lang === 'vi-VN' ? 'Nói tiếng Việt, máy tự viết' : 'Nói tiếng Anh, máy tự viết'}>
        {busy ? '⏹ Dừng' : label || `🎤 Nói thay viết (${lang === 'vi-VN' ? 'tiếng Việt' : 'tiếng Anh'})`}
      </button>
      {busy && <span className="muted small"> 🔴 {live || 'Đang nghe…'}</span>}
    </span>
  );
}
