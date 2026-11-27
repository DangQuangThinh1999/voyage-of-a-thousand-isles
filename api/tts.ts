// Vercel Function: GET /api/tts?q=...&slow=1 — trả file âm thanh mp3 đọc tiếng Anh.
// Dự phòng cho máy không có giọng đọc (trình duyệt trong Zalo/Messenger, Android thiếu giọng tiếng Anh).
export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url), q = (u.searchParams.get('q') || '').trim().slice(0, 200), slow = u.searchParams.get('slow') === '1', tl = /^en-(US|GB|AU|CA|NZ|IE|IN)$/.test(u.searchParams.get('tl') || '') ? u.searchParams.get('tl') : 'en-US';
  const ref = req.headers.get('referer') || '';
  if (ref && !/^https:\/\/[a-z0-9-]+\.vercel\.app\/|^http:\/\/localhost(:\d+)?\//.test(ref)) return new Response('forbidden', { status: 403 });
  if (!q) return new Response('missing q', { status: 400 });
  const src = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&ttsspeed=${slow ? '0.3' : '1'}&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } });
    if (!r.ok) return new Response('tts_' + r.status, { status: 502 });
    return new Response(await r.arrayBuffer(), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch { return new Response('tts_failed', { status: 502 }); }
}
