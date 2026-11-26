// Dùng chung cho các Vercel Function: gọi Gemini (gói miễn phí) trả JSON theo schema, tự thử model kế tiếp khi quá tải.
// File bắt đầu bằng "_" nên Vercel không coi là một đường dẫn API.
export const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

const hits = new Map<string, { n: number; t: number }>();
/** Chặn gọi từ trang lạ, giới hạn lượt theo IP. Trả Response lỗi, hoặc null nếu hợp lệ. */
export function guard(req: Request, perHour = 120): Response | null {
  const origin = req.headers.get('origin') || '';
  if (origin && !/^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/.test(origin)) return json({ error: 'forbidden' }, 403);
  if (!process.env.GEMINI_API_KEY) return json({ error: 'not_configured' }, 503);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown', now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 3600_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > perHour) return json({ error: 'rate_limited' }, 429);
  return null;
}

export async function gemini(system: string, user: string, schema: unknown, temperature = 0.2): Promise<Response> {
  const key = process.env.GEMINI_API_KEY!;
  const models = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'].filter(Boolean) as string[])];
  let last = 0;
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
        }),
      });
      if ([404, 429, 500, 503].includes(r.status)) { last = r.status; continue; }
      if (!r.ok) return json({ error: `gemini_${r.status}` }, 502);
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      return json({ ...JSON.parse(text), model });
    } catch { last = -1; }
  }
  return json({ error: last === 429 ? 'quota' : 'busy' }, last === 429 ? 429 : 503);
}
