interface Props {
  multiline?: boolean; rows?: number; placeholder: string; autoCapitalize?: string; disabled: boolean;
  initial?: string; onChange: (v: string) => void; id?: string;
}
/** Ô gõ câu trả lời (id="ans": Enter để kiểm tra) */
export function TypeAnswer({ multiline, rows = 2, placeholder, autoCapitalize = 'off', disabled, initial = '', onChange, id = 'ans' }: Props) {
  const common = {
    id, className: 'ans', autoComplete: 'off', autoCapitalize, spellCheck: false, placeholder, disabled, defaultValue: initial,
    'data-autofocus': disabled ? undefined : '1',
  };
  return multiline
    ? <textarea rows={rows} {...common} onChange={(e) => onChange(e.target.value)} />
    : <input {...common} onChange={(e) => onChange(e.target.value)} />;
}
