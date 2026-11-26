import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initApp } from './state/store';
import './tw.css';
import './styles.css';

initApp();

// Móc kiểm thử (chỉ có khi chạy dev hoặc build với VITE_TEST_HOOK=1), dùng cho Playwright
if (import.meta.env.DEV || import.meta.env.VITE_TEST_HOOK === '1') {
  import('./testHook').then((m) => m.install());
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
