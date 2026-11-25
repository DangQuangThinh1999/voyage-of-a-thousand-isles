import type { Check } from '../lib/exercises';

/** Danh sách yêu cầu ✅/❌ của đoạn văn */
export function Checks({ checks }: { checks: Check[] }) {
  return <ul className="checks">{checks.map(([ok, msg], i) => <li key={i} className={ok ? 'pass' : 'fail'}>{ok ? '✅' : '❌'} {msg}</li>)}</ul>;
}
