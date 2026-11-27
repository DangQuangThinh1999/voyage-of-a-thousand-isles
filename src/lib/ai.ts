// Gọi API AI của app: tự gửi kèm vé đăng nhập (để máy chủ đếm lượt theo người) và báo rõ khi chưa đăng nhập / hết lượt / đủ người.
import { Cloud } from './cloud';
import { perm } from './perm';
import { emit, toast } from '../state/store';

let lastWarn = 0;
export async function aiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  // trang vừa mở: chờ Firebase xác nhận đăng nhập rồi mới gọi, tránh bị coi là chưa đăng nhập
  if (!Cloud.resolved) await Cloud.ready();
  const t = await Cloud.token();
  if (t) headers.set('Authorization', 'Bearer ' + t);
  const r = await fetch(url, { ...init, headers });
  if ([401, 403, 429].includes(r.status)) {
    const d = await r.clone().json().catch(() => ({} as { error?: string; msg?: string }));
    // chỉ nhắc đăng nhập khi thật sự chưa đăng nhập
    const skip = d.error === 'login_required' && !!Cloud.user;
    if (!skip && d.msg && ['login_required', 'daily_limit', 'full'].includes(d.error || '') && Date.now() - lastWarn > 4000) { lastWarn = Date.now(); toast((d.error === 'daily_limit' ? '⏳ ' : d.error === 'full' ? '👥 ' : '🔐 ') + d.msg); }
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
      perm.admin = !!d.admin; perm.unlock = !!(d.admin || d.unlock);
      Object.assign(quota, { on: !!d.enabled, login: !!d.login, admin: !!d.admin, used: d.used || 0, limit: d.limit ?? null, remaining: d.remaining ?? null });
      emit();
    } catch { /* bỏ qua */ }
  }, delay);
}
