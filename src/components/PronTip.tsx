// Gợi ý (không bắt buộc): học Phát âm IPA trước khi học từ mới — biết đọc phiên âm thì tự đọc đúng mọi từ, nhớ từ nhanh hơn.
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { app, go, save, useApp } from '../state/store';
import { setParam } from '../state/store';

const STEPS: [string, string, string][] = [
  ['chart', '🔤 Bảng 44 âm IPA', 'nghe từng âm, cách đặt lưỡi, lỗi người Việt hay mắc (~15 phút)'],
  ['read', '📖 Đọc phiên âm', 'nhìn /ˈwɔːtə/ đoán ra từ — tự đọc được mọi từ mới'],
  ['stress', '🎯 Trọng âm', 'nhấn đúng âm tiết để người bản xứ hiểu'],
  ['link', '🔗 Nối âm', 'nghe IELTS dễ hơn, nói tự nhiên hơn'],
];

/** Thẻ gợi ý học phát âm trước. compact = bản gọn (trang Từ mới) */
export function PronTip({ compact = false }: { compact?: boolean }) {
  const { P } = useApp();
  const [hide, setHide] = useState(false);
  if (hide || P.tips?.pron) return null;
  const open = (t: string) => { go('ipa'); setTimeout(() => setParam('t', t), 0); };
  const off = (forever: boolean) => { setHide(true); if (forever) { app.P.tips = { ...(app.P.tips || {}), pron: 1 }; save(); } };
  return (
    <AnimatePresence>
      <motion.section className="card pron-tip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="row between gap"><b>💡 Gợi ý: học Phát âm (IPA) trước để học từ dễ hơn</b><span className="muted small">không bắt buộc</span></div>
        <p className="small m-0">Mỗi từ trong app đều có phiên âm như <span className="ipa inline">/ˈstjuːdənt/</span>. Biết đọc phiên âm thì bạn <b>tự đọc đúng mọi từ mới</b>, nghe giỏi hơn và nhớ từ lâu hơn.{compact ? '' : ' Nên học theo thứ tự:'}</p>
        {!compact && <ol className="pron-steps">{STEPS.map(([t, n, d]) => <li key={t}><button className="linkish" onClick={() => open(t)}><b>{n}</b></button> <span className="muted small">— {d}</span></li>)}</ol>}
        <div className="row gap wrap mt-1">
          <button className="btn sm" onClick={() => open('chart')}>🔊 Học phát âm trước</button>
          <button className="btn ghost sm" onClick={() => off(false)}>Để sau</button>
          <button className="btn ghost sm" onClick={() => off(true)}>Không nhắc nữa</button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
