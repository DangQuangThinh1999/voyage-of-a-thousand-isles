// Gọi /api/explain (Vercel Function → Claude) để giải thích thêm khi người học chưa hiểu.
export interface AiTurn { role: 'user' | 'assistant'; content: string }
const KEY = 'ht55.ai.v1', DAILY = 30;

function quota(): { d: string; n: number } {
  const d = new Date().toISOString().slice(0, 10);
  try { const q = JSON.parse(localStorage.getItem(KEY) || 'null'); if (q && q.d === d) return q; } catch { /* bỏ qua */ }
  return { d, n: 0 };
}
export const aiLeft = () => Math.max(0, DAILY - quota().n);

export async function askAI(sentence: string, topic: string, question: string, history: AiTurn[]): Promise<string> {
  const q = quota();
  if (q.n >= DAILY) throw new Error(`Hôm nay bạn đã hỏi AI ${DAILY} lần. Mai hỏi tiếp nhé.`);
  const r = await fetch('/api/explain', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentence, topic, question, history }),
  }).catch(() => { throw new Error('Không kết nối được. Kiểm tra mạng rồi thử lại.'); });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `Lỗi ${r.status}`);
  try { localStorage.setItem(KEY, JSON.stringify({ d: q.d, n: q.n + 1 })); } catch { /* bỏ qua */ }
  return String(d.text || '');
}
