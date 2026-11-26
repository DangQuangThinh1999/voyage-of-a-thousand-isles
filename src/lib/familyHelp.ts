// Giải thích chi tiết cho bài "Chọn dạng đúng của từ": phân tích câu, bảng các dạng từ, quy tắc + ví dụ,
// và BẰNG CHỨNG cho từng đáp án sai (vì sao sai + một câu mà dạng đó mới đúng).
export interface FamilyHelp {
  analysis: [part: string, role: string][];
  forms: [word: string, pos: string, vi: string][];
  rule: string; examples: [en: string, vi: string][];
  wrong: Record<string, { why: string; proof: [en: string, vi: string] }>;
}
const HAPPY: FamilyHelp['forms'] = [['happy', 'Tính từ', 'vui, hạnh phúc'], ['happiness', 'Danh từ', 'niềm hạnh phúc'], ['happily', 'Trạng từ', 'một cách vui vẻ']];

export const FAMILY_HELP: Record<string, FamilyHelp> = {
  'She is very ____.': {
    analysis: [['She', 'cô ấy (đại từ, chủ ngữ)'], ['is', 'động từ to be: “thì, là”'], ['very', 'trạng từ “rất”, đứng trước tính từ để nhấn mạnh'], ['____', 'chỗ cần một TÍNH TỪ mô tả “cô ấy”']],
    forms: HAPPY, rule: 'be + (very) + TÍNH TỪ: mô tả trạng thái của chủ ngữ.',
    examples: [['He is very tired.', 'Anh ấy rất mệt.'], ['The room is very clean.', 'Căn phòng rất sạch.']],
    wrong: {
      happiness: { why: '“happiness” là danh từ (niềm hạnh phúc). “very” không đứng trước danh từ, và “She is happiness” nghĩa là “cô ấy là niềm hạnh phúc”, sai ý.', proof: ['Her happiness is important to me.', 'Niềm hạnh phúc của cô ấy quan trọng với tôi.'] },
      happily: { why: '“happily” là trạng từ, bổ nghĩa cho ĐỘNG TỪ hành động, không đứng sau “is” để mô tả người.', proof: ['She smiled happily.', 'Cô ấy cười một cách vui vẻ.'] },
    },
  },
  'Money cannot buy ____.': {
    analysis: [['Money', 'tiền (danh từ, chủ ngữ)'], ['cannot buy', 'không thể mua (động từ)'], ['____', 'thứ được mua → cần DANH TỪ làm tân ngữ']],
    forms: HAPPY, rule: 'Sau động từ chỉ hành động lên một vật (buy, need, want, find…) thường cần DANH TỪ làm tân ngữ: thứ bị tác động.',
    examples: [['I buy a phone.', 'Tôi mua một chiếc điện thoại.'], ['I buy food.', 'Tôi mua thức ăn.'], ['Money cannot buy happiness.', 'Tiền không mua được hạnh phúc.']],
    wrong: {
      happy: { why: '“happy” là tính từ, không làm tân ngữ cho “buy” được (không thể “mua vui vẻ”).', proof: ['Money cannot make you happy.', 'Tiền không thể làm bạn hạnh phúc. (make + người + tính từ)'] },
      happily: { why: '“happily” là trạng từ, chỉ CÁCH làm việc gì, không phải THỨ được mua.', proof: ['I happily buy a phone.', 'Tôi vui vẻ mua một chiếc điện thoại. (happily bổ nghĩa cho buy)'] },
    },
  },
  'They lived ____ together.': {
    analysis: [['They', 'họ (chủ ngữ)'], ['lived', 'đã sống (động từ)'], ['____', 'sống THẾ NÀO → cần TRẠNG TỪ bổ nghĩa cho “lived”'], ['together', 'cùng nhau']],
    forms: HAPPY, rule: 'ĐỘNG TỪ + TRẠNG TỪ (thường đuôi -ly): nói hành động diễn ra thế nào.',
    examples: [['She sings beautifully.', 'Cô ấy hát hay.'], ['He works carefully.', 'Anh ấy làm việc cẩn thận.']],
    wrong: {
      happy: { why: '“happy” là tính từ, mô tả NGƯỜI/VẬT, không bổ nghĩa cho động từ “lived”.', proof: ['They were happy together.', 'Họ hạnh phúc bên nhau. (be + tính từ)'] },
      happiness: { why: '“happiness” là danh từ, không đứng ngay sau “lived” để chỉ cách sống.', proof: ['They lived in happiness.', 'Họ sống trong hạnh phúc. (cần giới từ “in” trước danh từ)'] },
    },
  },
  'He drives very ____.': {
    analysis: [['He', 'anh ấy (chủ ngữ)'], ['drives', 'lái xe (động từ)'], ['very ____', 'lái xe THẾ NÀO → cần TRẠNG TỪ']],
    forms: [['careful', 'Tính từ', 'cẩn thận'], ['carefully', 'Trạng từ', 'một cách cẩn thận'], ['care', 'Danh từ / động từ', 'sự chăm sóc; quan tâm']],
    rule: 'ĐỘNG TỪ + (very) + TRẠNG TỪ: “very” bổ nghĩa cho trạng từ đứng sau.',
    examples: [['She speaks very slowly.', 'Cô ấy nói rất chậm.'], ['He drives very carefully.', 'Anh ấy lái xe rất cẩn thận.']],
    wrong: {
      careful: { why: '“careful” là tính từ, mô tả người (He is careful), không bổ nghĩa cho “drives”.', proof: ['He is a careful driver.', 'Anh ấy là một người lái xe cẩn thận.'] },
      care: { why: '“care” là danh từ/động từ, không chỉ cách lái xe.', proof: ['Drive with care.', 'Lái xe cẩn thận nhé. (with + danh từ care)'] },
    },
  },
  'The ____ of the city is fast.': {
    analysis: [['The', 'mạo từ → phía sau phải là DANH TỪ'], ['____', 'chủ ngữ của câu → cần DANH TỪ'], ['of the city', 'của thành phố'], ['is fast', 'thì nhanh']],
    forms: [['develop', 'Động từ', 'phát triển'], ['development', 'Danh từ', 'sự phát triển'], ['developed', 'Tính từ / quá khứ', 'phát triển (đã)']],
    rule: 'The + DANH TỪ + of …: “cái gì của cái gì”. Đuôi -ment, -tion, -ness thường là danh từ.',
    examples: [['The growth of the economy is slow.', 'Sự tăng trưởng của nền kinh tế chậm.'], ['The size of the room is small.', 'Kích thước căn phòng nhỏ.']],
    wrong: {
      develop: { why: '“develop” là động từ, không đứng sau “The” và không làm chủ ngữ được.', proof: ['The city develops fast.', 'Thành phố phát triển nhanh. (develop làm động từ)'] },
      developed: { why: '“developed” là tính từ/quá khứ phân từ, cần danh từ đi sau.', proof: ['Japan is a developed country.', 'Nhật Bản là một nước phát triển.'] },
    },
  },
  'We need to ____ our skills.': {
    analysis: [['We need to', 'chúng ta cần (to + động từ)'], ['____', 'sau “to” → ĐỘNG TỪ nguyên mẫu'], ['our skills', 'kỹ năng của chúng ta (tân ngữ)']],
    forms: [['improve', 'Động từ', 'cải thiện'], ['improvement', 'Danh từ', 'sự cải thiện'], ['improved', 'Tính từ / quá khứ', 'đã được cải thiện']],
    rule: 'need / want / try + to + ĐỘNG TỪ NGUYÊN MẪU.',
    examples: [['I want to learn English.', 'Tôi muốn học tiếng Anh.'], ['She needs to rest.', 'Cô ấy cần nghỉ ngơi.']],
    wrong: {
      improvement: { why: '“improvement” là danh từ, không đứng sau “to” trong cấu trúc need to + V.', proof: ['There is a big improvement in your English.', 'Tiếng Anh của bạn tiến bộ nhiều.'] },
      improved: { why: 'Sau “to” không dùng dạng quá khứ -ed.', proof: ['My English has improved.', 'Tiếng Anh của tôi đã tiến bộ.'] },
    },
  },
  'This book is very ____.': {
    analysis: [['This book', 'cuốn sách này (chủ ngữ)'], ['is very', 'thì rất'], ['____', 'mô tả cuốn sách → cần TÍNH TỪ']],
    forms: [['use', 'Động từ / danh từ', 'sử dụng; công dụng'], ['useful', 'Tính từ', 'hữu ích'], ['usefully', 'Trạng từ', 'một cách hữu ích']],
    rule: 'be + very + TÍNH TỪ. Đuôi -ful, -less, -ous, -ive, -able thường là tính từ.',
    examples: [['This app is very helpful.', 'Ứng dụng này rất hữu ích.'], ['The test was very difficult.', 'Bài kiểm tra rất khó.']],
    wrong: {
      use: { why: '“use” là động từ/danh từ, không đứng sau “very” để mô tả sách.', proof: ['I use this book every day.', 'Tôi dùng cuốn sách này mỗi ngày.'] },
      usefully: { why: '“usefully” là trạng từ, bổ nghĩa cho động từ, không đứng sau “is very”.', proof: ['You can spend your time usefully.', 'Bạn có thể dùng thời gian một cách hữu ích.'] },
    },
  },
  'Good ____ is important for students.': {
    analysis: [['Good', 'tính từ “tốt” → phía sau phải là DANH TỪ'], ['____', 'chủ ngữ của câu → DANH TỪ'], ['is important', 'thì quan trọng']],
    forms: [['educate', 'Động từ', 'giáo dục'], ['education', 'Danh từ', 'sự giáo dục, nền giáo dục'], ['educational', 'Tính từ', 'mang tính giáo dục']],
    rule: 'TÍNH TỪ + DANH TỪ: tính từ đứng trước để mô tả danh từ.',
    examples: [['Good food is important.', 'Đồ ăn ngon quan trọng.'], ['Clean water is necessary.', 'Nước sạch là cần thiết.']],
    wrong: {
      educate: { why: '“educate” là động từ, không đứng sau tính từ “Good”.', proof: ['Schools educate children.', 'Trường học giáo dục trẻ em.'] },
      educational: { why: '“educational” là tính từ; hai tính từ “Good educational” cần thêm danh từ phía sau.', proof: ['This is an educational game.', 'Đây là một trò chơi mang tính giáo dục.'] },
    },
  },
  'She speaks English ____.': {
    analysis: [['She speaks', 'cô ấy nói (động từ)'], ['English', 'tiếng Anh (tân ngữ)'], ['____', 'nói THẾ NÀO → TRẠNG TỪ, thường đứng cuối câu']],
    forms: [['fluent', 'Tính từ', 'trôi chảy'], ['fluency', 'Danh từ', 'sự trôi chảy'], ['fluently', 'Trạng từ', 'một cách trôi chảy']],
    rule: 'ĐỘNG TỪ + tân ngữ + TRẠNG TỪ (cách thức).',
    examples: [['He reads books quickly.', 'Anh ấy đọc sách nhanh.'], ['She speaks English fluently.', 'Cô ấy nói tiếng Anh trôi chảy.']],
    wrong: {
      fluent: { why: '“fluent” là tính từ, mô tả người hoặc ngôn ngữ, không bổ nghĩa cho “speaks”.', proof: ['She is fluent in English.', 'Cô ấy thông thạo tiếng Anh.'] },
      fluency: { why: '“fluency” là danh từ, không đứng cuối câu để chỉ cách nói.', proof: ['Fluency is important in IELTS Speaking.', 'Sự trôi chảy rất quan trọng trong IELTS Speaking.'] },
    },
  },
  'It is a ____ decision.': {
    analysis: [['It is', 'đó là'], ['a', 'mạo từ'], ['____', 'đứng trước danh từ “decision” → TÍNH TỪ'], ['decision', 'quyết định (danh từ)']],
    forms: [['significance', 'Danh từ', 'tầm quan trọng'], ['significant', 'Tính từ', 'quan trọng, đáng kể'], ['significantly', 'Trạng từ', 'một cách đáng kể']],
    rule: 'a/an + TÍNH TỪ + DANH TỪ.',
    examples: [['It is a big problem.', 'Đó là một vấn đề lớn.'], ['She made an important choice.', 'Cô ấy đưa ra một lựa chọn quan trọng.']],
    wrong: {
      significance: { why: '“significance” là danh từ; hai danh từ đứng liền nhau ở đây không đúng.', proof: ['We understand the significance of this decision.', 'Chúng tôi hiểu tầm quan trọng của quyết định này.'] },
      significantly: { why: '“significantly” là trạng từ, không đứng trước danh từ.', proof: ['Prices increased significantly.', 'Giá tăng đáng kể. (bổ nghĩa cho động từ increased)'] },
    },
  },
};
