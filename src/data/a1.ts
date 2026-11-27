import type { DailyPlanItem, Phase, Unit, WeekGoal } from './types';

// Nội dung bài học. Mỗi bài: từ vựng [en, vi, emoji], câu [en, vi], bài đọc, câu hỏi.
// Câu ngắn (≤ 6 từ) để người mới nghe được.
export const UNITS: Unit[] = [
  {
    id: 'hello', week: 1, emoji: '👋', title: 'Hello', vi: 'Chào hỏi',
    words: [
      ['hello', 'xin chào', '👋'], ['goodbye', 'tạm biệt', '🚶'], ['thank you', 'cảm ơn', '🙏'],
      ['sorry', 'xin lỗi', '😔'], ['yes', 'vâng, có', '✅'], ['no', 'không', '❌'],
      ['please', 'làm ơn', '🤲'], ['good morning', 'chào buổi sáng', '🌅'],
      ['hi', 'chào (thân mật)', '👋'],
      ['excuse me', 'xin lỗi (cho hỏi)', '🙋'],
      ['good afternoon', 'chào buổi chiều', '🌤️'],
      ['good night', 'chúc ngủ ngon', '🌙'],
      ['welcome', 'chào mừng', '🤗'],
      ['nice to meet you', 'rất vui được gặp bạn', '🤝'],
      ['see you later', 'hẹn gặp lại', '👀'],
      ['friend', 'bạn bè', '🧑‍🤝‍🧑']
    ],
    sentences: [
      ['Hello, how are you?', 'Xin chào, bạn khỏe không?'],
      ['I am fine, thank you.', 'Tôi khỏe, cảm ơn.'],
      ['Good morning, teacher.', 'Chào buổi sáng, thầy/cô.'],
      ['Nice to meet you.', 'Rất vui được gặp bạn.'],
      ['See you tomorrow.', 'Hẹn gặp bạn ngày mai.'],
    ],
    reading: [
      ['Hello! My name is Lan.', 'Xin chào! Tôi tên là Lan.'],
      ['I am from Vietnam.', 'Tôi đến từ Việt Nam.'],
      ['I am a student.', 'Tôi là học sinh.'],
      ['Nice to meet you!', 'Rất vui được gặp bạn!'],
    ],
    questions: [
      ['What is her name?', 'Cô ấy tên là gì?', ['Lan', 'Mai', 'Anna'], 0],
      ['Where is she from?', 'Cô ấy đến từ đâu?', ['Japan', 'Vietnam', 'England'], 1],
      ['What is she?', 'Cô ấy làm gì?', ['a teacher', 'a doctor', 'a student'], 2],
    ],
  },
  {
    id: 'me', week: 1, emoji: '🙂', title: 'About me', vi: 'Về bản thân',
    words: [
      ['name', 'tên', '🏷️'], ['I', 'tôi', '🙋'], ['you', 'bạn', '👉'], ['man', 'đàn ông', '👨'],
      ['woman', 'phụ nữ', '👩'], ['student', 'học sinh', '🎒'], ['teacher', 'giáo viên', '🧑‍🏫'],
      ['doctor', 'bác sĩ', '🧑‍⚕️'],
      ['age', 'tuổi', '🎂'],
      ['job', 'nghề nghiệp', '💼'],
      ['country', 'đất nước', '🗺️'],
      ['city', 'thành phố', '🏙️'],
      ['live', 'sống', '🏡'],
      ['from', 'đến từ', '📍'],
      ['boy', 'con trai', '👦'],
      ['girl', 'con gái', '👧']
    ],
    sentences: [
      ['What is your name?', 'Bạn tên là gì?'],
      ['My name is Nam.', 'Tôi tên là Nam.'],
      ['I am a student.', 'Tôi là học sinh.'],
      ['She is a teacher.', 'Cô ấy là giáo viên.'],
      ['Where are you from?', 'Bạn đến từ đâu?'],
    ],
    reading: [
      ['This is Tom.', 'Đây là Tom.'],
      ['He is a doctor.', 'Anh ấy là bác sĩ.'],
      ['He is from England.', 'Anh ấy đến từ nước Anh.'],
      ['His wife is Anna.', 'Vợ anh ấy là Anna.'],
      ['She is a teacher.', 'Cô ấy là giáo viên.'],
    ],
    questions: [
      ['What is Tom?', 'Tom làm nghề gì?', ['a doctor', 'a teacher', 'a student'], 0],
      ['Where is Tom from?', 'Tom đến từ đâu?', ['Vietnam', 'England', 'France'], 1],
      ['Who is a teacher?', 'Ai là giáo viên?', ['Tom', 'Lan', 'Anna'], 2],
    ],
  },
  {
    id: 'numbers', week: 1, emoji: '🔢', title: 'Numbers', vi: 'Số đếm',
    words: [
      ['one', 'một', '1️⃣'], ['two', 'hai', '2️⃣'], ['three', 'ba', '3️⃣'], ['four', 'bốn', '4️⃣'],
      ['five', 'năm', '5️⃣'], ['six', 'sáu', '6️⃣'], ['seven', 'bảy', '7️⃣'], ['eight', 'tám', '8️⃣'],
      ['nine', 'chín', '9️⃣'], ['ten', 'mười', '🔟'],
      ['eleven', 'mười một', '1️⃣'],
      ['twelve', 'mười hai', '🕛'],
      ['twenty', 'hai mươi', '🔢'],
      ['thirty', 'ba mươi', '🔢'],
      ['fifty', 'năm mươi', '5️⃣'],
      ['hundred', 'một trăm', '💯'],
      ['first', 'thứ nhất', '🥇'],
      ['number', 'con số', '#️⃣']
    ],
    sentences: [
      ['How old are you?', 'Bạn bao nhiêu tuổi?'],
      ['I am ten years old.', 'Tôi mười tuổi.'],
      ['I have two cats.', 'Tôi có hai con mèo.'],
      ['There are three books.', 'Có ba quyển sách.'],
      ['Count from one to ten.', 'Đếm từ một đến mười.'],
    ],
    reading: [
      ['I have one brother and two sisters.', 'Tôi có một anh/em trai và hai chị/em gái.'],
      ['My brother is five years old.', 'Em trai tôi năm tuổi.'],
      ['My sisters are eight.', 'Hai em gái tôi tám tuổi.'],
      ['We have four cats!', 'Chúng tôi có bốn con mèo!'],
    ],
    questions: [
      ['How many sisters?', 'Có mấy chị/em gái?', ['one', 'two', 'three'], 1],
      ['How old is the brother?', 'Em trai bao nhiêu tuổi?', ['five', 'eight', 'ten'], 0],
      ['How many cats?', 'Có mấy con mèo?', ['two', 'one', 'four'], 2],
    ],
  },
  {
    id: 'family', week: 2, emoji: '👨‍👩‍👧', title: 'Family', vi: 'Gia đình',
    words: [
      ['mother', 'mẹ', '👩'], ['father', 'bố', '👨'], ['brother', 'anh/em trai', '👦'],
      ['sister', 'chị/em gái', '👧'], ['baby', 'em bé', '👶'], ['grandmother', 'bà', '👵'],
      ['grandfather', 'ông', '👴'], ['family', 'gia đình', '👨‍👩‍👧'],
      ['son', 'con trai (của bố mẹ)', '👦'],
      ['daughter', 'con gái (của bố mẹ)', '👧'],
      ['parents', 'bố mẹ', '👨‍👩‍👦'],
      ['husband', 'chồng', '🤵'],
      ['wife', 'vợ', '👰'],
      ['uncle', 'chú, bác, cậu', '🧔'],
      ['aunt', 'cô, dì, bác gái', '👩‍🦰'],
      ['cousin', 'anh chị em họ', '🧒']
    ],
    sentences: [
      ['This is my mother.', 'Đây là mẹ tôi.'],
      ['I love my family.', 'Tôi yêu gia đình tôi.'],
      ['My father is a doctor.', 'Bố tôi là bác sĩ.'],
      ['Do you have a sister?', 'Bạn có chị/em gái không?'],
      ['My grandmother is very kind.', 'Bà tôi rất tốt bụng.'],
    ],
    reading: [
      ['My family has five people.', 'Gia đình tôi có năm người.'],
      ['My father, my mother, my sister, my baby brother and me.', 'Bố, mẹ, chị gái, em trai nhỏ và tôi.'],
      ['My father is a driver.', 'Bố tôi là tài xế.'],
      ['My mother cooks very well.', 'Mẹ tôi nấu ăn rất giỏi.'],
      ['I love them.', 'Tôi yêu họ.'],
    ],
    questions: [
      ['How many people are in the family?', 'Gia đình có mấy người?', ['three', 'four', 'five'], 2],
      ['What is the father?', 'Bố làm nghề gì?', ['a driver', 'a doctor', 'a teacher'], 0],
      ['Who cooks very well?', 'Ai nấu ăn rất giỏi?', ['the father', 'the mother', 'the sister'], 1],
    ],
  },
  {
    id: 'colors', week: 2, emoji: '🎨', title: 'Colors & things', vi: 'Màu sắc & đồ vật',
    words: [
      ['red', 'màu đỏ', '🟥'], ['blue', 'màu xanh dương', '🟦'], ['green', 'màu xanh lá', '🟩'],
      ['yellow', 'màu vàng', '🟨'], ['black', 'màu đen', '⬛'], ['white', 'màu trắng', '⬜'],
      ['book', 'quyển sách', '📕'], ['pen', 'cây bút', '🖊️'],
      ['orange', 'màu cam', '🟠'],
      ['pink', 'màu hồng', '🩷'],
      ['purple', 'màu tím', '🟣'],
      ['brown', 'màu nâu', '🟤'],
      ['bag', 'cái túi', '👜'],
      ['box', 'cái hộp', '📦'],
      ['table', 'cái bàn', '🪑'],
      ['key', 'chìa khoá', '🔑']
    ],
    sentences: [
      ['What color is it?', 'Nó màu gì?'],
      ['It is red.', 'Nó màu đỏ.'],
      ['My bag is blue.', 'Cặp của tôi màu xanh dương.'],
      ['I like green.', 'Tôi thích màu xanh lá.'],
      ['This is a black pen.', 'Đây là một cây bút màu đen.'],
    ],
    reading: [
      ['I have a new bag.', 'Tôi có một cái cặp mới.'],
      ['It is yellow.', 'Nó màu vàng.'],
      ['In my bag, there is a red book and a blue pen.', 'Trong cặp có một quyển sách đỏ và một cây bút xanh dương.'],
      ['My favorite color is yellow.', 'Màu tôi thích nhất là màu vàng.'],
    ],
    questions: [
      ['What color is the bag?', 'Cái cặp màu gì?', ['red', 'yellow', 'blue'], 1],
      ['What color is the book?', 'Quyển sách màu gì?', ['red', 'blue', 'green'], 0],
      ['What is the favorite color?', 'Màu thích nhất là gì?', ['black', 'white', 'yellow'], 2],
    ],
  },
  {
    id: 'food', week: 2, emoji: '🍜', title: 'Food & drink', vi: 'Đồ ăn & thức uống',
    words: [
      ['rice', 'cơm, gạo', '🍚'], ['bread', 'bánh mì', '🍞'], ['egg', 'quả trứng', '🥚'],
      ['chicken', 'thịt gà', '🍗'], ['apple', 'quả táo', '🍎'], ['water', 'nước', '💧'],
      ['milk', 'sữa', '🥛'], ['coffee', 'cà phê', '☕'],
      ['noodles', 'mì, phở', '🍜'],
      ['fish', 'cá', '🐟'],
      ['beef', 'thịt bò', '🥩'],
      ['vegetable', 'rau củ', '🥦'],
      ['fruit', 'trái cây', '🍇'],
      ['tea', 'trà', '🍵'],
      ['juice', 'nước ép', '🧃'],
      ['breakfast', 'bữa sáng', '🍳']
    ],
    sentences: [
      ['I am hungry.', 'Tôi đói.'],
      ['I want some water.', 'Tôi muốn một ít nước.'],
      ['Do you like coffee?', 'Bạn có thích cà phê không?'],
      ['I eat rice every day.', 'Tôi ăn cơm mỗi ngày.'],
      ['This chicken is very good.', 'Món gà này rất ngon.'],
    ],
    reading: [
      ['In the morning, I eat bread and an egg.', 'Buổi sáng, tôi ăn bánh mì và một quả trứng.'],
      ['I drink milk.', 'Tôi uống sữa.'],
      ['At lunch, I eat rice and chicken.', 'Bữa trưa, tôi ăn cơm và thịt gà.'],
      ['My father drinks coffee, but I do not like it.', 'Bố tôi uống cà phê, nhưng tôi không thích nó.'],
    ],
    questions: [
      ['What is for breakfast?', 'Bữa sáng ăn gì?', ['rice and chicken', 'bread and an egg', 'an apple'], 1],
      ['What does the father drink?', 'Bố uống gì?', ['coffee', 'milk', 'water'], 0],
      ['What is for lunch?', 'Bữa trưa ăn gì?', ['bread and an egg', 'an apple', 'rice and chicken'], 2],
    ],
  },
  {
    id: 'routine', week: 3, emoji: '⏰', title: 'Daily routine', vi: 'Việc hằng ngày',
    words: [
      ['wake up', 'thức dậy', '⏰'], ['eat', 'ăn', '🍽️'], ['drink', 'uống', '🥤'], ['sleep', 'ngủ', '😴'],
      ['go', 'đi', '🚶'], ['work', 'làm việc', '💼'], ['study', 'học', '📚'], ['read', 'đọc', '📖'],
      ['get up', 'ra khỏi giường', '🛏️'],
      ['have breakfast', 'ăn sáng', '🥐'],
      ['take a shower', 'tắm vòi sen', '🚿'],
      ['cook', 'nấu ăn', '🍳'],
      ['walk', 'đi bộ', '🚶'],
      ['watch TV', 'xem TV', '📺'],
      ['play', 'chơi', '⚽'],
      ['go to bed', 'đi ngủ', '😴']
    ],
    sentences: [
      ['I wake up at six.', 'Tôi thức dậy lúc sáu giờ.'],
      ['I go to school.', 'Tôi đi học.'],
      ['She works in a bank.', 'Cô ấy làm việc ở ngân hàng.'],
      ['We study English.', 'Chúng tôi học tiếng Anh.'],
      ['I go to bed at ten.', 'Tôi đi ngủ lúc mười giờ.'],
    ],
    reading: [
      ['Minh wakes up at six.', 'Minh thức dậy lúc sáu giờ.'],
      ['He eats breakfast with his family.', 'Anh ấy ăn sáng cùng gia đình.'],
      ['Then he goes to work.', 'Sau đó anh ấy đi làm.'],
      ['In the evening, he reads a book.', 'Buổi tối, anh ấy đọc sách.'],
      ['He goes to bed at eleven.', 'Anh ấy đi ngủ lúc mười một giờ.'],
    ],
    questions: [
      ['When does Minh wake up?', 'Minh thức dậy lúc mấy giờ?', ['at six', 'at ten', 'at eleven'], 0],
      ['What does he do in the evening?', 'Buổi tối anh ấy làm gì?', ['He goes to work.', 'He reads a book.', 'He sleeps.'], 1],
      ['When does he go to bed?', 'Anh ấy đi ngủ lúc mấy giờ?', ['at six', 'at nine', 'at eleven'], 2],
    ],
  },
  {
    id: 'home', week: 3, emoji: '🏠', title: 'At home', vi: 'Ở nhà',
    words: [
      ['house', 'ngôi nhà', '🏠'], ['kitchen', 'nhà bếp', '🍳'], ['bed', 'cái giường', '🛏️'],
      ['chair', 'cái ghế', '🪑'], ['door', 'cửa ra vào', '🚪'], ['window', 'cửa sổ', '🪟'],
      ['TV', 'ti vi', '📺'], ['phone', 'điện thoại', '📱'],
      ['bedroom', 'phòng ngủ', '🛌'],
      ['bathroom', 'phòng tắm', '🛁'],
      ['living room', 'phòng khách', '🛋️'],
      ['sofa', 'ghế sofa', '🛋️'],
      ['floor', 'sàn nhà, tầng', '🟫'],
      ['garden', 'khu vườn', '🌳'],
      ['lamp', 'đèn', '💡'],
      ['wall', 'bức tường', '🧱']
    ],
    sentences: [
      ['My house is small.', 'Nhà tôi nhỏ.'],
      ['The cat is on the bed.', 'Con mèo ở trên giường.'],
      ['Please open the window.', 'Làm ơn mở cửa sổ.'],
      ['Where is my phone?', 'Điện thoại của tôi đâu?'],
      ['Mom is in the kitchen.', 'Mẹ ở trong bếp.'],
    ],
    reading: [
      ['My house has three rooms.', 'Nhà tôi có ba phòng.'],
      ['The kitchen is big.', 'Nhà bếp thì rộng.'],
      ['My room is small, but I like it.', 'Phòng tôi nhỏ, nhưng tôi thích nó.'],
      ['There is a bed, a chair and a window.', 'Có một cái giường, một cái ghế và một cửa sổ.'],
      ['I can see trees from my window.', 'Tôi có thể nhìn thấy cây từ cửa sổ.'],
    ],
    questions: [
      ['How many rooms are there?', 'Nhà có mấy phòng?', ['two', 'three', 'five'], 1],
      ['Is the kitchen big or small?', 'Nhà bếp rộng hay nhỏ?', ['big', 'small'], 0],
      ['What can I see from the window?', 'Nhìn thấy gì từ cửa sổ?', ['cars', 'the sea', 'trees'], 2],
    ],
  },
  {
    id: 'time', week: 3, emoji: '📅', title: 'Time & days', vi: 'Thời gian',
    words: [
      ['today', 'hôm nay', '📍'], ['tomorrow', 'ngày mai', '⏭️'], ['yesterday', 'hôm qua', '⏮️'],
      ['morning', 'buổi sáng', '🌅'], ['night', 'ban đêm', '🌙'], ['week', 'tuần', '🗓️'],
      ['Monday', 'thứ Hai', '💼'], ['Sunday', 'Chủ nhật', '🛋️'],
      ['hour', 'giờ (60 phút)', '⏰'],
      ['minute', 'phút', '⏱️'],
      ['month', 'tháng', '🗓️'],
      ['year', 'năm', '📆'],
      ['weekend', 'cuối tuần', '🎉'],
      ['afternoon', 'buổi chiều', '🌇'],
      ['evening', 'buổi tối', '🌆'],
      ['Saturday', 'thứ Bảy', '6️⃣']
    ],
    sentences: [
      ['What time is it?', 'Mấy giờ rồi?'],
      ["It is seven o'clock.", 'Bây giờ là bảy giờ.'],
      ['Today is Monday.', 'Hôm nay là thứ Hai.'],
      ['I am free on Sunday.', 'Tôi rảnh vào Chủ nhật.'],
      ['See you next week.', 'Hẹn gặp bạn tuần sau.'],
    ],
    reading: [
      ['I work from Monday to Friday.', 'Tôi làm việc từ thứ Hai đến thứ Sáu.'],
      ['On Saturday, I clean my house.', 'Thứ Bảy, tôi dọn nhà.'],
      ['On Sunday, I visit my grandmother.', 'Chủ nhật, tôi thăm bà.'],
      ['Today is Sunday, so I am very happy!', 'Hôm nay là Chủ nhật nên tôi rất vui!'],
    ],
    questions: [
      ['What does the writer do on Saturday?', 'Người viết làm gì vào thứ Bảy?', ['cleans the house', 'visits grandmother', 'works'], 0],
      ['What day is today?', 'Hôm nay là thứ mấy?', ['Monday', 'Saturday', 'Sunday'], 2],
      ['Who does the writer visit on Sunday?', 'Chủ nhật người viết thăm ai?', ['a friend', 'the grandmother', 'a teacher'], 1],
    ],
  },
  {
    id: 'weather', week: 4, emoji: '☀️', title: 'Weather', vi: 'Thời tiết',
    words: [
      ['sun', 'mặt trời', '☀️'], ['rain', 'mưa', '🌧️'], ['wind', 'gió', '💨'], ['cloud', 'mây', '☁️'],
      ['snow', 'tuyết', '❄️'], ['hot', 'nóng', '🥵'], ['cold', 'lạnh', '🥶'], ['umbrella', 'cái ô', '☂️'],
      ['warm', 'ấm', '🌡️'],
      ['cool', 'mát', '🍃'],
      ['sunny', 'nắng', '☀️'],
      ['rainy', 'có mưa', '🌧️'],
      ['windy', 'có gió', '🌬️'],
      ['storm', 'bão', '⛈️'],
      ['season', 'mùa', '🍂'],
      ['summer', 'mùa hè', '🏖️']
    ],
    sentences: [
      ['How is the weather?', 'Thời tiết thế nào?'],
      ['It is hot today.', 'Hôm nay trời nóng.'],
      ['It is raining.', 'Trời đang mưa.'],
      ['Take an umbrella.', 'Mang theo ô nhé.'],
      ['I like sunny days.', 'Tôi thích những ngày nắng.'],
    ],
    reading: [
      ['In Hanoi, it is cold in winter.', 'Ở Hà Nội, mùa đông trời lạnh.'],
      ['In summer, it is very hot.', 'Mùa hè trời rất nóng.'],
      ['It often rains in the afternoon.', 'Trời thường mưa vào buổi chiều.'],
      ['I always carry an umbrella.', 'Tôi luôn mang theo ô.'],
    ],
    questions: [
      ['When is it cold in Hanoi?', 'Hà Nội lạnh khi nào?', ['in summer', 'in winter', 'in the morning'], 1],
      ['When does it often rain?', 'Trời thường mưa khi nào?', ['in the afternoon', 'at night', 'in the morning'], 0],
      ['What does the writer always carry?', 'Người viết luôn mang theo gì?', ['a bag', 'a phone', 'an umbrella'], 2],
    ],
  },
  {
    id: 'shopping', week: 4, emoji: '🛒', title: 'Shopping', vi: 'Mua sắm',
    words: [
      ['shop', 'cửa hàng', '🏪'], ['money', 'tiền', '💵'], ['buy', 'mua', '🛍️'], ['price', 'giá', '🏷️'],
      ['cheap', 'rẻ', '🪙'], ['expensive', 'đắt', '💎'], ['shirt', 'áo sơ mi', '👕'], ['shoes', 'giày', '👟'],
      ['pay', 'trả tiền', '💳'],
      ['sell', 'bán', '🏷️'],
      ['market', 'chợ', '🧺'],
      ['size', 'cỡ, kích thước', '📏'],
      ['dress', 'váy liền', '👗'],
      ['jacket', 'áo khoác', '🧥'],
      ['cash', 'tiền mặt', '💵'],
      ['sale', 'đợt giảm giá', '🔖']
    ],
    sentences: [
      ['How much is this?', 'Cái này bao nhiêu tiền?'],
      ['It is ten dollars.', 'Nó giá mười đô la.'],
      ['That is too expensive.', 'Cái đó đắt quá.'],
      ['I want to buy a shirt.', 'Tôi muốn mua một cái áo sơ mi.'],
      ['Can I pay by card?', 'Tôi trả bằng thẻ được không?'],
    ],
    reading: [
      ['Linh goes to the shop.', 'Linh đi đến cửa hàng.'],
      ['She wants new shoes.', 'Cô ấy muốn mua giày mới.'],
      ['The black shoes are fifty dollars.', 'Đôi giày đen giá năm mươi đô la.'],
      ['The white shoes are twenty dollars.', 'Đôi giày trắng giá hai mươi đô la.'],
      ['She buys the white shoes.', 'Cô ấy mua đôi giày trắng.'],
    ],
    questions: [
      ['What does Linh want?', 'Linh muốn gì?', ['a shirt', 'new shoes', 'a bag'], 1],
      ['How much are the black shoes?', 'Giày đen giá bao nhiêu?', ['fifty dollars', 'twenty dollars', 'ten dollars'], 0],
      ['Which shoes does she buy?', 'Cô ấy mua đôi nào?', ['the black shoes', 'no shoes', 'the white shoes'], 2],
    ],
  },
  {
    id: 'feelings', week: 4, emoji: '😊', title: 'Feelings', vi: 'Cảm xúc',
    words: [
      ['happy', 'vui', '😊'], ['sad', 'buồn', '😢'], ['tired', 'mệt', '😩'], ['angry', 'tức giận', '😠'],
      ['hungry', 'đói', '😋'], ['scared', 'sợ', '😨'], ['bored', 'chán', '🥱'], ['sick', 'ốm', '🤒'],
      ['excited', 'hào hứng', '🤩'],
      ['worried', 'lo lắng', '😟'],
      ['nervous', 'hồi hộp, căng thẳng', '😬'],
      ['surprised', 'ngạc nhiên', '😮'],
      ['calm', 'bình tĩnh', '😌'],
      ['lonely', 'cô đơn', '🥺'],
      ['proud', 'tự hào', '😊'],
      ['love', 'yêu, rất thích', '❤️']
    ],
    sentences: [
      ['I am very happy.', 'Tôi rất vui.'],
      ['Why are you sad?', 'Sao bạn buồn?'],
      ['I am tired today.', 'Hôm nay tôi mệt.'],
      ['Are you okay?', 'Bạn ổn chứ?'],
      ["Don't worry.", 'Đừng lo.'],
    ],
    reading: [
      ['Today, Hoa is sick.', 'Hôm nay Hoa bị ốm.'],
      ['She is tired and sad.', 'Cô ấy mệt và buồn.'],
      ['Her friend brings her some soup.', 'Bạn của cô ấy mang cho cô ấy một ít súp.'],
      ['Now Hoa is happy.', 'Bây giờ Hoa vui rồi.'],
    ],
    questions: [
      ['How is Hoa today?', 'Hôm nay Hoa thế nào?', ['angry', 'sick', 'bored'], 1],
      ['What does her friend bring?', 'Bạn cô ấy mang gì đến?', ['some soup', 'some coffee', 'a book'], 0],
      ['How is Hoa now?', 'Bây giờ Hoa thế nào?', ['sad', 'scared', 'happy'], 2],
    ],
  },
];

// Lộ trình 12 tuần lên IELTS 5.5 (cần ~3–4 giờ/ngày).
export const ROADMAP: Phase[] = [
  { weeks: '1–4', level: 'A1 · nền tảng', goal: 'Nói/nghe câu 5 từ. Biết ~500 từ thông dụng. Phát âm đúng các âm cơ bản.', inApp: true },
  { weeks: '5–8', level: 'A2 · sơ cấp', goal: 'Hiểu đoạn hội thoại chậm. Viết đoạn 60–80 từ. Nói 1 phút về bản thân, gia đình, công việc. ~1.500 từ.', inApp: false },
  { weeks: '9–10', level: 'B1 · làm quen IELTS', goal: 'Làm đề Listening/Reading thật (bản dễ). Writing Task 1 & 2 theo mẫu. Speaking Part 1–2.', inApp: false },
  { weeks: '11–12', level: 'Luyện đề', goal: 'Mỗi tuần 2 đề đầy đủ có tính giờ. Sửa lỗi Writing & Speaking. Mục tiêu 5.5.', inApp: false },
];

// Thời khóa biểu mỗi ngày (phút). Tổng 210 phút = 3,5 giờ.
export const DAILY_PLAN: DailyPlanItem[] = [
  ['🎧', 'Nghe', 60, 'Bài nghe trong app + 30 phút nghe podcast/video chậm (có phụ đề tiếng Anh).'],
  ['🗣️', 'Nói', 45, 'Luyện nói trong app + đọc to bài đọc + tự ghi âm 1 phút nói về chủ đề của bài.'],
  ['📖', 'Đọc', 45, 'Bài đọc trong app + đọc 1 truyện ngắn graded reader (cấp độ dễ).'],
  ['✍️', 'Viết', 30, 'Bài viết trong app + viết nhật ký 3–5 câu ở mục Nhật ký.'],
  ['🔁', 'Ôn từ vựng', 30, 'Ôn thẻ từ mỗi ngày, không bỏ ngày nào.'],
];

// Gợi ý viết nhật ký theo bài
export const JOURNAL_PROMPTS: Record<string, string> = {
  hello: 'Viết 3 câu chào và giới thiệu bản thân. (Hello! My name is ...)',
  me: 'Viết 3 câu về bạn: tên, nghề, đến từ đâu.',
  numbers: 'Viết 3 câu có số: tuổi của bạn, số anh chị em, số vật nuôi.',
  family: 'Viết 4 câu về gia đình bạn.',
  colors: 'Viết 3 câu về đồ vật và màu sắc trong phòng bạn.',
  food: 'Hôm nay bạn ăn và uống gì? Viết 4 câu.',
  routine: 'Viết 5 câu về một ngày của bạn (I wake up at ...).',
  home: 'Viết 4 câu về nhà hoặc phòng của bạn.',
  time: 'Bạn làm gì vào thứ Bảy và Chủ nhật? Viết 4 câu.',
  weather: 'Thời tiết hôm nay thế nào? Viết 3 câu.',
  shopping: 'Lần cuối bạn mua gì? Giá bao nhiêu? Viết 4 câu.',
  feelings: 'Hôm nay bạn cảm thấy thế nào? Vì sao? Viết 3 câu.',
};

// Mục tiêu từng tuần: trình độ CEFR và điểm IELTS ước tính khi học xong tuần đó.
// (Ước tính để theo dõi tiến độ, không phải điểm thi thật.)
export const WEEK_GOALS: Record<number, WeekGoal> = {
  1: { cefr: 'A1', band: '2.0', goal: 'Chào hỏi, giới thiệu bản thân, số đếm' },
  2: { cefr: 'A1', band: '2.5', goal: 'Gia đình, màu sắc, đồ ăn' },
  3: { cefr: 'A1', band: '3.0', goal: 'Việc hằng ngày, nhà cửa, giờ giấc' },
  4: { cefr: 'A1+', band: '3.0', goal: 'Thời tiết, mua sắm, cảm xúc' },
  5: { cefr: 'A2', band: '3.5', goal: 'Kể chuyện hôm qua (quá khứ đơn)' },
  6: { cefr: 'A2', band: '3.5', goal: 'Du lịch, chỉ đường, gọi món' },
  7: { cefr: 'A2', band: '4.0', goal: 'So sánh, kế hoạch tương lai' },
  8: { cefr: 'A2+', band: '4.0', goal: 'Viết đoạn 80 từ, nói liền 1 phút' },
  9: { cefr: 'B1', band: '4.5', goal: 'Làm quen đề IELTS Listening & Reading' },
  10: { cefr: 'B1', band: '5.0', goal: 'Writing Task 1 & 2, Speaking Part 1–2' },
  11: { cefr: 'B1', band: '5.0–5.5', goal: 'Luyện đề đầy đủ có tính giờ' },
  12: { cefr: 'B1+', band: '5.5', goal: 'Thi thử, sửa lỗi cuối cùng' },
};
