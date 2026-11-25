# Hải Trình 5.5 · Học tiếng Anh

Web luyện 4 kỹ năng **Nghe · Nói · Đọc · Viết** từ mức mới bắt đầu, theo lộ trình 12 tuần hướng tới IELTS 5.5.

- Không cần build: mở `index.html` qua một web server (ví dụ `npx serve .`) là chạy.
- Giọng đọc dùng Web Speech API của trình duyệt. Chấm phát âm cần **Chrome** hoặc **Edge** và cho phép micro.
- Đăng nhập Google + lưu tiến độ lên mây qua Firebase (`cloud-config.js`), lưu ở `saves/{uid}`.
- Bài học nằm trong `js/data.js`. Thêm bài mới chỉ cần thêm phần tử vào `UNITS`.

Đưa luật bảo mật lên Firebase (đăng nhập đúng tài khoản sở hữu dự án):

```bash
firebase deploy --only firestore:rules --project voyage-of-a-thousand-isles
```
