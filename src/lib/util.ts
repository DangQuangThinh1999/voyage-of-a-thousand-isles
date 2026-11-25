// Tiện ích chung: trộn mảng, ngày tháng.
export const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const sample = <T>(a: readonly T[], n: number): T[] => shuffle(a).slice(0, n);
export const pick1 = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export const dayKey = (d = new Date()): string => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const addDays = (k: string, n: number): string => { const d = new Date(k + 'T00:00:00'); d.setDate(d.getDate() + n); return dayKey(d); };
export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export const fmtSec = (x: number): string => (x >= 60 ? `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}` : `${x}s`);
