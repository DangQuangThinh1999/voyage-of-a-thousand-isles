// Gọi API AI của app: tự gửi kèm vé đăng nhập (để máy chủ đếm lượt theo người) và báo rõ khi chưa đăng nhập / hết lượt / đủ người.
import { Cloud } from './cloud';
import { toast } from '../state/store';

let lastWarn = 0;
export async function aiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const t = await Cloud.token();
  if (t) headers.set('Authorization', 'Bearer ' + t);
  const r = await fetch(url, { ...init, headers });
  if ([401, 403, 429].includes(r.status)) {
    const d = await r.clone().json().catch(() => ({} as { error?: string; msg?: string }));
    if (d.msg && ['login_required', 'daily_limit', 'full'].includes(d.error || '') && Date.now() - lastWarn > 4000) { lastWarn = Date.now(); toast((d.error === 'daily_limit' ? '⏳ ' : d.error === 'full' ? '👥 ' : '🔐 ') + d.msg); }
    if (d.error) aiLimit.last = d.error;
  }
  return r;
}
/** Lỗi giới hạn gần nhất (để giao diện hiện thông báo phù hợp) */
export const aiLimit = { last: '' };
