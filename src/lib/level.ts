// Cấp độ theo XP (cấp n cần 50·n² XP) và danh hiệu theo chủ đề hải trình
export function xpLevel(xp: number) {
  const lv = Math.floor(Math.sqrt(xp / 50)) + 1, from = 50 * (lv - 1) ** 2, to = 50 * lv ** 2;
  return { lv, pct: (xp - from) / (to - from), need: to - xp };
}
const TITLES = ['Thủy thủ tập sự', 'Thủy thủ', 'Hoa tiêu', 'Thuyền phó', 'Thuyền trưởng', 'Nhà thám hiểm', 'Đô đốc', 'Huyền thoại đại dương'];
export const titleOf = (lv: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 3))];
