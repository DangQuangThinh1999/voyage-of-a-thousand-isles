import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base '/': đường dẫn phân tầng (/tuan-1/hello) cần tài nguyên ở gốc trang
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
});
