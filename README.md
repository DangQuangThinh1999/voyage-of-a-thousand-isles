# Hải Trình 5.5 · Học tiếng Anh

Web luyện 4 kỹ năng **Nghe · Nói · Đọc · Viết** từ mức mới bắt đầu, theo lộ trình 12 tuần hướng tới IELTS 5.5.
Viết bằng **React 18 + TypeScript + Vite**.

## Chạy và build

```bash
npm install      # cài thư viện (cần Node 20 trở lên)
npm run dev      # chạy thử ở http://localhost:5173
npm run build    # kiểm tra TypeScript + build ra thư mục dist/
npm run preview  # xem thử bản build
```

Trang được triển khai trên **Vercel** (tự build `npm run build` → `dist/` mỗi lần push lên `main`).

## Cấu trúc

- `src/data/` — nội dung bài học: `a1.ts` (các bài A1, mục tiêu tuần, lộ trình, đề nhật ký), `levels/*.ts` (A2 → C2), `types.ts`.
- `src/lib/` — logic thuần, không phụ thuộc React: chấm câu (`text.ts`), giọng đọc + micro (`speech.ts`), tạo bài tập (`exercises.ts`),
  tiến độ (`progress.ts`), ôn từ (`srs.ts`), đồng bộ Firebase (`cloud.ts`).
- `src/state/` — kho trạng thái nhỏ (`store.ts`, hook `useApp`/`useProgress`) và các hành động (`session.ts`, `actions.ts`).
- `src/components/` — thành phần giao diện dùng lại; `components/steps/` mỗi dạng câu hỏi một component, chạy bởi `SessionRunner`.
- `src/pages/` — các trang: Học, Bài, Làm bài, Ôn từ, Nhật ký, Lộ trình, Cài đặt, Test micro.

## Ghi chú

- Giọng đọc dùng Web Speech API của trình duyệt. Chấm phát âm cần **Chrome** hoặc **Edge** và cho phép micro.
- Tiến độ lưu trong trình duyệt (`localStorage`, khóa `ht55.progress.v1`). Đăng nhập Google để lưu lên mây qua Firebase
  (cấu hình ở `src/config.ts`), lưu ở `saves/{uid}`.
- Thêm bài mới: thêm phần tử vào `UNITS` trong `src/data/a1.ts`.
- Kiểm tra file nội dung cấp độ: `npm run check-level -- src/data/levels/b1.ts`.

Đưa luật bảo mật lên Firebase (đăng nhập đúng tài khoản sở hữu dự án):

```bash
firebase deploy --only firestore:rules --project voyage-of-a-thousand-isles
```
