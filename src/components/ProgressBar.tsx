/** Thanh tiến độ (pct: 0–100) */
export function ProgressBar({ pct, thin }: { pct: number; thin?: boolean }) {
  return <div className={thin ? 'bar thin' : 'bar'}><i style={{ width: `${pct}%` }} /></div>;
}
