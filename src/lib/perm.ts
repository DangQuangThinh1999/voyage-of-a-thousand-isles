// Quyền của người đang đăng nhập (máy chủ xác nhận qua /api/admin?me=1): admin = toàn quyền; unlock = được admin mở các mốc đang khoá.
export const perm = { admin: false, unlock: false };
/** Trang chỉ admin thấy (đang bảo trì / thử nghiệm) */
export const ADMIN_ONLY = new Set(['garden']);
export const visible = (scr: string) => perm.admin || !ADMIN_ONLY.has(scr);
