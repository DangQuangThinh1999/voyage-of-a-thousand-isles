import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' để chạy được trên GitHub Pages dưới một thư mục con (https://user.github.io/repo/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
