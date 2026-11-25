# Đặc tả file từ vựng `data/vocab/*.json`

Mỗi file là một **mảng JSON** (UTF-8, không comment, không dấu phẩy thừa), mỗi phần tử là một từ:

```json
{
  "w": "estimate",
  "r": 999,
  "pos": "verb, noun",
  "vi": "ước tính; sự ước tính",
  "ipa": "/ˈes.tɪ.meɪt/",
  "ex": "We estimate that the trip will take three hours.",
  "exvi": "Chúng tôi ước tính chuyến đi sẽ mất ba tiếng.",
  "forms": [],
  "awl": 1
}
```

| Trường | Ý nghĩa |
|---|---|
| `w` | Từ gốc, viết đúng như trong danh sách nguồn (chữ thường). |
| `r` | Hạng tần suất NGSL (cột `SFI Rank`). Từ chỉ có trong AWL: `r` = 3000 + thứ tự trong file nguồn. |
| `pos` | Từ loại bằng tiếng Anh: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, number, interjection… Nhiều loại thì cách nhau bằng dấu phẩy, loại phổ biến nhất đứng trước. |
| `vi` | Nghĩa tiếng Việt ngắn gọn, tự nhiên, đúng chính tả và có dấu. Tối đa 3 nghĩa phổ biến nhất, cách nhau bằng `; `. Với từ chức năng (the, of, be, would…) giải thích cách dùng ngắn gọn, ví dụ `the` → `mạo từ xác định (chỉ người/vật đã biết)`. |
| `ipa` | Phiên âm **giọng Anh (British)** theo kiểu Cambridge/Oxford, có dấu nhấn ˈ ˌ, đặt trong `/.../`. Dùng ɡ (không dùng g thường), ː (không dùng dấu hai chấm). |
| `ex` | Một câu ví dụ tự nhiên, ngắn (6–14 từ), cấp độ dễ hơn hoặc ngang với từ. Câu phải chứa từ `w` hoặc một dạng trong `forms`. Chỉ dùng dấu `, . ? !` và nháy đơn `'`; viết số bằng chữ; viết hoa chữ đầu; kết thúc bằng `. ? !`. |
| `exvi` | Bản dịch tiếng Việt của câu ví dụ. |
| `forms` | Các dạng biến đổi xuất hiện trong `ex` khi câu không chứa đúng `w` (ví dụ `be` → `["is"]`, `child` → `["children"]`). Mảng rỗng nếu không cần. |
| `awl` | Số nhóm AWL (1–10) nếu từ có trong `data/sources/awl-coxhead-2000.json`, ngược lại `0`. |

Yêu cầu chung:
- Nội dung tự viết, không chép từ điển có bản quyền.
- Giữ đúng thứ tự theo `r` tăng dần.
- Kiểm tra bằng: `node tools/check-vocab.cjs data/vocab/<file>.json`, sửa đến khi in `OK`.

## File mở rộng `ext-XX.json` (từ hạng 2.810–10.000)

- Danh sách từ cần viết nằm ở `data/sources/ext-chunks/chunk-XX.json` (mảng `{w, r, awl, nawl}`): giữ đúng `w`, `r`, `awl` như trong chunk, đủ tất cả các từ, theo thứ tự `r`.
- Đây là từ ít phổ biến hơn (B2–C2), nhiều từ học thuật (`nawl: true`) và chuyên ngành (khoa học, công nghệ, kinh tế, y sinh…). Nghĩa tiếng Việt cần chính xác theo nghĩa phổ biến nhất; câu ví dụ có thể dài 8–18 từ, tự nhiên, cho thấy rõ nghĩa.
- Danh sách lấy từ tần suất kiểu Mỹ, nên `w` có thể viết kiểu Mỹ (color, analyze). Giữ nguyên `w`; nếu kiểu Anh khác thì ghi thêm trong `vi`, ví dụ `(Anh: colour)`.
- Nếu một từ chủ yếu là tên riêng, viết tắt hoặc tiếng lóng thô tục, vẫn viết mục từ nhưng `vi` ghi rõ (ví dụ `(tên riêng)`, `(viết tắt của …)`, `(lóng)`) và câu ví dụ lịch sự.
- Kiểm tra: `node tools/check-vocab.cjs data/vocab/ext-XX.json` phải in `OK`.
