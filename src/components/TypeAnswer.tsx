import { useState } from 'react';
import { Dictate } from './Dictate';

interface Props {
  multiline?: boolean; rows?: number; placeholder: string; autoCapitalize?: string; disabled: boolean;
  initial?: string; onChange: (v: string) => void; id?: string; voice?: boolean;
}
/** Ô gõ câu trả lời (id="ans": Enter để kiểm tra). Có nút 🎤 để nói thay vì gõ (tuỳ thích). */
export function TypeAnswer({ multiline, rows = 2, placeholder, autoCapitalize = 'off', disabled, initial = '', onChange, id = 'ans', voice = true }: Props) {
  const [v, setV] = useState(initial);
  const set = (x: string) => { setV(x); onChange(x); };
  const common = {
    id, className: 'ans', autoComplete: 'off', autoCapitalize, spellCheck: false, placeholder, disabled, value: v,
    'data-autofocus': disabled ? undefined : '1',
  };
  return (
    <>
      {multiline ? <textarea rows={rows} {...common} onChange={(e) => set(e.target.value)} /> : <input {...common} onChange={(e) => set(e.target.value)} />}
      {voice && !disabled && <Dictate value={v} onChange={set} short={!multiline} label={multiline ? '🎤 Nói thay gõ' : '🎤 Nói đáp án'} />}
    </>
  );
}
