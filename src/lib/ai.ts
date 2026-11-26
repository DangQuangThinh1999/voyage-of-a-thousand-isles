// Gọi API AI của app: tự gửi kèm vé đăng nhập (để máy chủ đếm lượt theo người) và báo rõ khi chưa đăng nhập / hết lượt / đủ người.
import { Cloud } from './cloud';
import { emit, toast } from '../state/store';

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
  if (!url.startsWith('/api/admin')) refreshQuota(1500);
  return r;
}
/** Lỗi giới hạn gần nhất (để giao diện hiện thông báo phù hợp) */
export const aiLimit = { last: '' };

/** Lượt AI của người đang đăng nhập (hiện trên header). null = máy chủ chưa bật giới hạn */
export const quota: { on: boolean; login: boolean; admin: boolean; used: number; limit: number | null; remaining: number | null } = { on: false, login: false, admin: false, used: 0, limit: null, remaining: null };
let qT: ReturnType<typeof setTimeout> | undefined;
export function refreshQuota(delay = 0) {
  clearTimeout(qT);
  qT = setTimeout(async () => {
    try {
      const r = await aiFetch('/api/admin?me=1'), d = await r.json();
      Object.assign(quota, { on: !!d.enabled, login: !!d.login, admin: !!d.admin, used: d.used || 0, limit: d.limit ?? null, remaining: d.remaining ?? null });
      emit();
    } catch { /* bỏ qua */ }
  }, delay);
}
