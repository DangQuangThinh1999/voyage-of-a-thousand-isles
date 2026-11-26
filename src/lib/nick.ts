// Tên hiển thị trên bảng xếp hạng: đặt miễn phí 1 lần, đổi tên tốn điểm (tăng gấp đôi mỗi lần),
// chặn tên thô tục / bạo lực / kích động (tiếng Việt + tiếng Anh, cả khi viết không dấu, chèn ký tự, thay số).
import type { Progress } from './progress';

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/[0@4]/g, (c) => ({ '0': 'o', '@': 'a', '4': 'a' }[c] as string)).replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[5$]/g, 's').replace(/7/g, 't');
/** Từ cấm tìm trong chuỗi đã bỏ hết khoảng trắng và ký tự lạ */
const BAD_SUB = [
  // tiếng Việt thô tục
  'dit', 'djt', 'du ma', 'duma', 'dume', 'dumay', 'lon', 'cac', 'dicu', 'chode', 'occho', 'memay', 'bomay', 'concho', 'thangcho', 'suc vat', 'sucvat', 'khonnan', 'dcm', 'dkm', 'clgt', 'vcl', 'vkl', 'dmm', 'dmcs', 'nung', 'chich', 'xoac',
  // bạo lực, kích động, chính trị nhạy cảm
  'giet', 'chem', 'baoloan', 'khungbo', 'phandong', 'latdo', 'chongpha', 'dapha', 'chiemdong',
  // tiếng Anh
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigg', 'fag', 'whore', 'slut', 'bastard', 'asshole', 'porn', 'rape', 'nazi', 'hitler', 'isis', 'terror', 'kill', 'murder', 'suicide', 'bomb', 'sex',
];
/** Từ cấm chỉ khi đứng riêng (tránh chặn nhầm tên thật như “Long”, “Ngu-yên”) */
const BAD_WORD = new Set(['dm', 'dcm', 'vl', 'cc', 'cl', 'lol', 'ngu', 'oc', 'dien', 'khung', 'cho', 'lon', 'cut', 'wtf', 'ass', 'die']);
/** Tên riêng / từ thường hay bị dính nhầm bộ lọc: bỏ qua */
const SAFE = ['dit', 'cac', 'lon', 'giet', 'chem', 'nung', 'chich', 'kill', 'sex', 'cho'];

/** Trả về lý do không hợp lệ, hoặc null nếu tên dùng được */
export function nickProblem(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return 'Tên cần ít nhất 2 ký tự.';
  if (name.length > 24) return 'Tên tối đa 24 ký tự.';
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return 'Tên chỉ gồm chữ, số, khoảng trắng và . _ -';
  if (/(.)\1{4,}/.test(name)) return 'Tên không được lặp một ký tự quá nhiều lần.';
  const f = fold(name), compact = f.replace(/[^a-z]/g, ''), words = f.split(/[^a-z]+/).filter(Boolean);
  // So khớp CÓ DẤU cho từ thô tục trùng mặt chữ với từ thường khi bỏ dấu (buồi ≠ bưởi, buổi)
  const low = name.toLowerCase();
  if (/buồi|lồn|cặc|địt|đụ|đéo|(?<!\p{L})đĩ(?!\p{L})/u.test(low)) return 'Tên có từ thô tục. Hãy chọn tên khác.';
  if (words.some((w) => BAD_WORD.has(w)) || BAD_WORD.has(compact)) return 'Tên có từ không phù hợp. Hãy chọn tên lịch sự.';
  for (const b of BAD_SUB) {
    const k = b.replace(/\s/g, '');
    if (!compact.includes(k)) continue;
    // từ ngắn dễ trùng tên thật (Long, Skill, Edith…): chỉ chặn khi đứng riêng thành một từ
    if (SAFE.includes(k) && !words.includes(k)) continue;
    return 'Tên có từ thô tục, bạo lực hoặc gây kích động. Hãy chọn tên khác.';
  }
  return null;
}

/** Điểm có thể tiêu = XP − điểm đã tiêu (XP và cấp độ không bị giảm, không “hồi” lại khi đồng bộ) */
export const balance = (P: Progress) => Math.max(0, (P.xp || 0) - (P.spent || 0));
/** Giá đổi tên: 500, 1.000, 2.000… (lần đặt đầu miễn phí) */
export const renameCost = (P: Progress) => 500 * 2 ** Math.max(0, (P.nickN || 1) - 1);
