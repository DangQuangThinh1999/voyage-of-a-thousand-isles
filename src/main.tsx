import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initApp } from './state/store';
import './tw.css';
import './styles.css';

initApp();

// Sau khi deploy bản mới, trình duyệt còn giữ trang cũ sẽ không tải được các file đã đổi tên (trang Thành tựu, đề, bài luyện…)
// → tự tải lại trang MỘT lần để lấy bản mới, thay vì màn hình đen.
addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try { if (sessionStorage.getItem('ht.reloaded') === '1') return; sessionStorage.setItem('ht.reloaded', '1'); } catch { /* bỏ qua */ }
  location.reload();
});
setTimeout(() => { try { sessionStorage.removeItem('ht.reloaded'); } catch { /* bỏ qua */ } }, 15000);

// Móc kiểm thử (chỉ có khi chạy dev hoặc build với VITE_TEST_HOOK=1), dùng cho Playwright
if (import.meta.env.DEV || import.meta.env.VITE_TEST_HOOK === '1') {
  import('./testHook').then((m) => m.install());
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// App đã vẽ xong → đẩy thanh tải lên 100% và ẩn màn hình chờ (giữ tối thiểu ~0,8 giây cho mượt)
const W = window as unknown as { __splashDone?: () => void };
requestAnimationFrame(() => setTimeout(() => W.__splashDone?.(), Math.max(0, 800 - performance.now())));
