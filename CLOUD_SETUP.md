# Bật đăng nhập Google, lưu tiến trình lên mây và nạp xu

Khi chưa cấu hình gì, game vẫn chạy bình thường và chỉ lưu tiến trình trên trình duyệt.

Hệ thống dùng 2 dịch vụ:

| Việc | Dịch vụ | Chi phí |
|---|---|---|
| Đăng nhập Gmail + database lưu tiến trình, ví xu | **Firebase** (Google): Authentication + Firestore | Miễn phí ở mức nhỏ |
| Máy chủ nhận tiền và cộng xu | **Firebase Cloud Functions** | Phải bật gói **Blaze** (trả theo dùng; mức nhỏ gần như 0đ, nhưng cần gắn thẻ) |
| Cổng thanh toán (chuyển khoản / quét mã VietQR) | **PayOS** (payos.vn) | Theo biểu phí PayOS, cần tài khoản ngân hàng và xác minh danh tính |

---

## Bước 1: Tạo dự án Firebase (khoảng 10 phút)

1. Vào https://console.firebase.google.com, đăng nhập bằng Gmail của bạn và bấm **Add project**.
2. Đăng nhập Google:
   - Vào **Build → Authentication → Get started → Sign-in method**.
   - Bật **Google**, rồi bấm **Save**.
3. Tên miền được phép đăng nhập:
   - Vào **Authentication → Settings → Authorized domains**.
   - `localhost` đã có sẵn.
   - Nếu sau này đưa game lên web thì thêm tên miền đó vào đây.
4. Database: vào **Build → Firestore Database → Create database**, chọn vùng `asia-southeast1` (Singapore) và chế độ **production**.
5. Lấy cấu hình web app:
   - Vào **Project settings (⚙️) → Your apps**, bấm biểu tượng **Web `</>`** để đăng ký app.
   - Firebase hiện ra một khối `firebaseConfig = {...}`.
   - Chép khối này vào file `cloud-config.js`, thay cho dòng `firebase: null`.
   - Đây là cấu hình công khai nên để trong code được.

Làm xong bước này là đăng nhập Google và lưu tiến trình lên mây đã chạy được.

## Bước 2: Cài công cụ và đưa luật bảo mật lên

Chạy các lệnh sau trong WSL, tại thư mục `hai-trinh-van-dao`:

```bash
npm install -g firebase-tools
firebase login
firebase use --add                     # chọn dự án vừa tạo
firebase deploy --only firestore:rules
```

File `firestore.rules` đảm bảo 3 điều:
- Mỗi người chỉ xem và sửa được bản lưu của chính mình.
- Người chơi **chỉ tiêu được xu**, không tự cộng xu được.
- Chỉ máy chủ, sau khi ngân hàng xác nhận đã nhận tiền, mới cộng xu.

## Bước 3: Nạp xu bằng PayOS

1. Đăng ký tại https://payos.vn, liên kết tài khoản ngân hàng và tạo **kênh thanh toán**.
2. Lấy 3 khóa: **Client ID**, **API Key**, **Checksum Key**. Đây là **khóa bí mật**:
   - Không dán vào `cloud-config.js` hay `index.html`.
   - Không gửi qua chat.
3. Trong Firebase, bật gói **Blaze**: **Usage and billing → Modify plan**.
4. Cất khóa vào kho bí mật của Firebase. Mỗi lệnh sẽ hỏi bạn dán giá trị vào:

```bash
firebase functions:secrets:set PAYOS_CLIENT_ID
firebase functions:secrets:set PAYOS_API_KEY
firebase functions:secrets:set PAYOS_CHECKSUM_KEY
cd functions && npm install && cd ..
firebase deploy --only functions
```

5. Sau khi deploy, Firebase in ra URL của hàm `payosWebhook`, dạng `https://asia-southeast1-<dự-án>.cloudfunctions.net/payosWebhook`. Dán URL đó vào trang quản trị PayOS, mục **Webhook URL**, rồi bấm xác nhận.

## Bảng giá xu

Bảng giá nằm ở 2 nơi và **phải giống nhau**:
- `functions/index.js` (`PACKS`): máy chủ dùng bảng này để tính tiền thật.
- `cloud-config.js` (`packs`): chỉ để hiển thị.

Mặc định đang là:

| Gói | Số tiền | Xu nhận được |
|---|---|---|
| p10 | 10.000đ | 10 xu |
| p50 | 50.000đ | 55 xu |
| p100 | 100.000đ | 120 xu |
| p200 | 200.000đ | 260 xu |

Muốn **1.000đ = 1 xu** hay tỉ lệ khác thì sửa cả 2 nơi, rồi chạy lại `firebase deploy --only functions`.

Danh sách vật phẩm đổi bằng xu nằm trong `index.html`, tìm `XU_SHOP`.

## (Tuỳ chọn) Đưa game lên mạng

```bash
firebase deploy --only hosting
```

Game sẽ có địa chỉ `https://<dự-án>.web.app`. Thêm tên miền đó vào mục **Authorized domains** ở Bước 1.

## Kiểm tra

- Mở game, vào **Menu (P) → 👤 Đăng nhập Google**.
- Góc phải màn hình hiện `🪙 0 xu · ☁️ tên`.
- Vào **Menu → 🪙 Xu** và chọn một gói nạp. Trang PayOS mở ra với mã QR. Chuyển khoản xong thì xu tự cộng sau vài giây.
- Tiến trình tự lưu lên mây tối đa 30 giây một lần. Đăng nhập ở máy khác, game sẽ hỏi có tải bản trên mây về không.
