// Mẫu câu giao tiếp theo tình huống + câu hỏi IELTS Speaking cơ bản (A1–A2) để luyện nói.
import type { Pair } from './types';

export const SITUATIONS: [icon: string, title: string, phrases: Pair[]][] = [
  ['👋', 'Chào hỏi, làm quen', [
    ['Hi, nice to meet you.', 'Chào bạn, rất vui được gặp bạn.'],
    ['My name is Lan. What is your name?', 'Tôi tên là Lan. Bạn tên là gì?'],
    ['Where are you from?', 'Bạn đến từ đâu?'],
    ['I am from Vietnam. I live in Ho Chi Minh City.', 'Tôi đến từ Việt Nam. Tôi sống ở Thành phố Hồ Chí Minh.'],
    ['What do you do for a living?', 'Bạn làm nghề gì?'],
    ['It was great talking to you. See you later!', 'Nói chuyện với bạn rất vui. Hẹn gặp lại!'],
  ]],
  ['☕', 'Gọi món, quán cà phê', [
    ['Can I have a black coffee, please?', 'Cho tôi một ly cà phê đen nhé.'],
    ['Could I see the menu, please?', 'Cho tôi xem thực đơn được không?'],
    ['What do you recommend?', 'Bạn gợi ý món nào?'],
    ['I would like the chicken rice, please.', 'Tôi muốn món cơm gà.'],
    ['Can I have the bill, please?', 'Cho tôi xin hóa đơn.'],
    ['Do you accept card payment?', 'Ở đây có nhận thanh toán bằng thẻ không?'],
  ]],
  ['🗺️', 'Hỏi đường, du lịch', [
    ['Excuse me, how do I get to the train station?', 'Xin lỗi, đến ga tàu đi đường nào?'],
    ['Is it far from here?', 'Chỗ đó có xa đây không?'],
    ['Go straight and turn left at the corner.', 'Đi thẳng rồi rẽ trái ở góc đường.'],
    ['How much is a ticket to the city centre?', 'Vé vào trung tâm thành phố bao nhiêu tiền?'],
    ['I have a reservation under the name Nguyen.', 'Tôi đã đặt phòng tên Nguyễn.'],
    ['Could you take a photo of us, please?', 'Bạn chụp giúp chúng tôi một tấm ảnh được không?'],
  ]],
  ['🛍️', 'Mua sắm', [
    ['How much does this cost?', 'Cái này giá bao nhiêu?'],
    ['Do you have this in a larger size?', 'Bạn có cỡ lớn hơn không?'],
    ['Can I try it on?', 'Tôi mặc thử được không?'],
    ['It is a bit expensive. Can you give me a discount?', 'Hơi đắt. Bạn bớt cho tôi được không?'],
    ['I will take it.', 'Tôi lấy cái này.'],
    ['Can I return it if it does not fit?', 'Nếu không vừa tôi trả lại được không?'],
  ]],
  ['💼', 'Công việc, họp hành', [
    ['Could you send me the report by Friday?', 'Bạn gửi tôi báo cáo trước thứ Sáu được không?'],
    ['Let me check my schedule and get back to you.', 'Để tôi xem lịch rồi trả lời bạn.'],
    ['I agree with your point, but I have a concern.', 'Tôi đồng ý với ý bạn, nhưng tôi có một băn khoăn.'],
    ['Could you explain that again, please?', 'Bạn giải thích lại giúp tôi được không?'],
    ['The meeting has been moved to three o clock.', 'Cuộc họp đã dời sang ba giờ.'],
    ['Thank you for your help with this project.', 'Cảm ơn bạn đã giúp tôi trong dự án này.'],
  ]],
  ['🏥', 'Sức khỏe, khẩn cấp', [
    ['I do not feel well. I have a headache.', 'Tôi thấy không khỏe. Tôi bị đau đầu.'],
    ['I need to see a doctor.', 'Tôi cần gặp bác sĩ.'],
    ['Where is the nearest pharmacy?', 'Hiệu thuốc gần nhất ở đâu?'],
    ['Please call an ambulance!', 'Làm ơn gọi xe cấp cứu!'],
    ['I am allergic to seafood.', 'Tôi bị dị ứng hải sản.'],
    ['How many times a day should I take this medicine?', 'Thuốc này uống mấy lần một ngày?'],
  ]],
  ['💬', 'Nói chuyện tự nhiên', [
    ['That sounds great!', 'Nghe tuyệt đấy!'],
    ['I see what you mean.', 'Tôi hiểu ý bạn.'],
    ['Sorry, I did not catch that. Could you say it again?', 'Xin lỗi, tôi chưa nghe rõ. Bạn nói lại được không?'],
    ['To be honest, I am not sure.', 'Nói thật là tôi không chắc.'],
    ['What do you think about it?', 'Bạn nghĩ sao về chuyện đó?'],
    ['That is a good question. Let me think.', 'Câu hỏi hay đấy. Để tôi nghĩ đã.'],
  ]],
];

/** Câu hỏi Speaking cơ bản cho người mới (trước khi tới các cấp A2–C2 trong LEVELS) */
export const BASIC_PART1: Pair[] = [
  ['What is your name?', 'Bạn tên là gì?'],
  ['Where do you live?', 'Bạn sống ở đâu?'],
  ['Do you work or study?', 'Bạn đi làm hay đi học?'],
  ['What do you usually do in your free time?', 'Lúc rảnh bạn thường làm gì?'],
  ['What is your favourite food? Why?', 'Món ăn yêu thích của bạn là gì? Tại sao?'],
  ['Do you like your hometown? Why?', 'Bạn có thích quê mình không? Tại sao?'],
];
