// Nối âm (linking / connected speech): quy tắc, ví dụ có phiên âm (‿ = chỗ nối), câu luyện đọc liền mạch.
// Phiên âm theo giọng Anh chuẩn (British). "say" = gợi ý cách nghe/đọc liền để người Việt dễ hình dung.

export interface LinkEx { p: string; ipa: string; say: string }
export interface LinkRule { id: string; icon: string; name: string; short: string; how: string; tip: string; ex: LinkEx[] }

export const LINK_RULES: LinkRule[] = [
  {
    id: 'cv', icon: '🔗', name: 'Phụ âm + nguyên âm', short: 'Âm cuối là phụ âm, từ sau bắt đầu bằng nguyên âm → kéo phụ âm sang từ sau.',
    how: 'Phụ âm cuối của từ trước "dính" vào nguyên âm đầu của từ sau, đọc như thể nó là âm đầu của từ sau. Đây là kiểu nối âm phổ biến nhất.',
    tip: 'Người Việt hay đọc tách từng từ và bật hơi/ngắt ở cuối ("an. apple"). Hãy đọc liền như một từ: "a-napple".',
    ex: [
      { p: 'an apple', ipa: '/ə‿ˈnæpl/', say: 'a-napple' },
      { p: 'turn off', ipa: '/tɜː‿ˈnɒf/', say: 'tur-noff' },
      { p: 'pick it up', ipa: '/pɪ‿kɪ‿ˈtʌp/', say: 'pi-ki-tup' },
      { p: 'look at it', ipa: '/lʊ‿kæ‿tɪt/', say: 'loo-ka-tit' },
      { p: 'get up', ipa: '/ɡe‿ˈtʌp/', say: 'ge-tup' },
      { p: 'come in', ipa: '/kʌ‿ˈmɪn/', say: 'ka-min' },
      { p: 'check it out', ipa: '/tʃe‿kɪ‿ˈtaʊt/', say: 'che-ki-tout' },
      { p: 'an hour', ipa: '/ə‿ˈnaʊə/', say: 'a-nour' },
      { p: 'hold on', ipa: '/həʊl‿ˈdɒn/', say: 'houl-don' },
      { p: 'find out', ipa: '/faɪn‿ˈdaʊt/', say: 'fain-dout' },
    ],
  },
  {
    id: 'j', icon: '🟡', name: 'Nguyên âm + nguyên âm: chèn /j/', short: 'Từ trước kết thúc bằng /iː ɪ eɪ aɪ ɔɪ/ (miệng cười) → chèn nhẹ âm /j/ ("y").',
    how: 'Khi hai nguyên âm gặp nhau, tiếng Anh không ngắt hơi. Nếu âm trước kết thúc với môi bè ra (/iː/, /ɪ/, /eɪ/, /aɪ/, /ɔɪ/) thì tự nhiên xuất hiện một âm /j/ rất nhẹ để nối.',
    tip: 'Đừng ngắt giữa hai nguyên âm ("I. am"). Lướt sang như có chữ "y": "I-yam".',
    ex: [
      { p: 'I am', ipa: '/aɪ‿jæm/', say: 'ai-yam' },
      { p: 'see it', ipa: '/siː‿jɪt/', say: 'see-yit' },
      { p: 'the end', ipa: '/ðiː‿jˈend/', say: 'thee-yend' },
      { p: 'say again', ipa: '/seɪ‿jəˈɡen/', say: 'say-ya-gen' },
      { p: 'my eyes', ipa: '/maɪ‿jˈaɪz/', say: 'mai-yaiz' },
      { p: 'be on time', ipa: '/biː‿jɒn ˈtaɪm/', say: 'bee-yon time' },
      { p: 'enjoy it', ipa: '/ɪnˈdʒɔɪ‿jɪt/', say: 'en-joy-yit' },
      { p: 'very important', ipa: '/ˈveri‿jɪmˈpɔːtnt/', say: 'very-yim-portant' },
    ],
  },
  {
    id: 'w', icon: '🔵', name: 'Nguyên âm + nguyên âm: chèn /w/', short: 'Từ trước kết thúc bằng /uː ʊ əʊ aʊ/ (môi tròn) → chèn nhẹ âm /w/.',
    how: 'Nếu âm trước kết thúc với môi tròn (/uː/, /ʊ/, /əʊ/, /aʊ/) thì khi chuyển sang nguyên âm tiếp theo, môi mở ra tạo một âm /w/ nhẹ.',
    tip: '"go on" không đọc "gô. on" mà là "gou-won".',
    ex: [
      { p: 'go on', ipa: '/ɡəʊ‿ˈwɒn/', say: 'gou-won' },
      { p: 'do it', ipa: '/duː‿wɪt/', say: 'doo-wit' },
      { p: 'how are you', ipa: '/haʊ‿wə juː/', say: 'hau-wa-you' },
      { p: 'who is', ipa: '/huː‿wɪz/', say: 'hoo-wiz' },
      { p: 'so easy', ipa: '/səʊ‿ˈwiːzi/', say: 'sou-weezy' },
      { p: 'you are', ipa: '/juː‿wɑː/', say: 'you-wa' },
      { p: 'too often', ipa: '/tuː‿ˈwɒfn/', say: 'too-woffen' },
      { p: 'now and then', ipa: '/naʊ‿wən ˈðen/', say: 'nau-wan-then' },
    ],
  },
  {
    id: 'r', icon: '🔴', name: 'Nối âm /r/', short: 'Từ viết có r ở cuối (car, far, where…) + nguyên âm → đọc ra âm /r/ để nối.',
    how: 'Giọng Anh (British) không đọc /r/ cuối từ (car /kɑː/). Nhưng nếu từ sau bắt đầu bằng nguyên âm thì /r/ "sống lại" để nối hai từ.',
    tip: '"far away" → "fa-raway". Với giọng Mỹ, /r/ luôn được đọc nên nối càng rõ.',
    ex: [
      { p: 'far away', ipa: '/fɑː‿rəˈweɪ/', say: 'fa-ra-way' },
      { p: 'where is it', ipa: '/weə‿rɪ‿zɪt/', say: 'wea-ri-zit' },
      { p: 'for example', ipa: '/fə‿rɪɡˈzɑːmpl/', say: 'fa-rig-zample' },
      { p: 'after all', ipa: '/ˈɑːftə‿rɔːl/', say: 'after-roll' },
      { p: 'your answer', ipa: '/jɔː‿ˈrɑːnsə/', say: 'yo-ransa' },
      { p: 'here it is', ipa: '/hɪə‿rɪ‿tɪz/', say: 'hea-ri-tiz' },
      { p: 'more often', ipa: '/mɔː‿ˈrɒfn/', say: 'mo-roffen' },
    ],
  },
  {
    id: 'same', icon: '🟢', name: 'Hai phụ âm giống nhau', short: 'Từ trước kết thúc và từ sau bắt đầu bằng cùng một phụ âm → chỉ đọc 1 lần, giữ lâu hơn một chút.',
    how: 'Không đọc phụ âm hai lần ("black. coffee"). Đọc một phụ âm kéo dài hơn bình thường một chút, rồi vào từ sau.',
    tip: '"black coffee" → "bla-coffee" (âm /k/ giữ hơi lâu).',
    ex: [
      { p: 'black coffee', ipa: '/blæk‿ˈkɒfi/', say: 'bla-coffee' },
      { p: 'bad dog', ipa: '/bæd‿ˈdɒɡ/', say: 'ba-dog' },
      { p: 'big game', ipa: '/bɪɡ‿ˈɡeɪm/', say: 'bi-game' },
      { p: 'some money', ipa: '/sʌm‿ˈmʌni/', say: 'su-money' },
      { p: 'this sentence', ipa: '/ðɪs‿ˈsentəns/', say: 'thi-sentence' },
      { p: 'good day', ipa: '/ɡʊd‿ˈdeɪ/', say: 'goo-day' },
      { p: 'well lit', ipa: '/wel‿ˈlɪt/', say: 'we-lit' },
    ],
  },
  {
    id: 'assim', icon: '🟣', name: 'Biến âm: t/d/s/z + you', short: '/t/+/j/ → /tʃ/ ("ch"), /d/+/j/ → /dʒ/ ("j"), /s/+/j/ → /ʃ/ ("sh"), /z/+/j/ → /ʒ/.',
    how: 'Khi /t d s z/ đứng trước /j/ (you, your, year…), hai âm hoà vào nhau thành một âm mới. Đây là lý do người bản xứ nói "didja", "wouldja", "meetcha".',
    tip: 'Nghe phim hay gặp: "Nice to meet you" → "meet-chu"; "Did you…?" → "di-ju".',
    ex: [
      { p: "don't you", ipa: '/dəʊn‿tʃuː/', say: 'down-chu' },
      { p: 'did you', ipa: '/dɪ‿dʒuː/', say: 'di-ju' },
      { p: 'would you', ipa: '/wʊ‿dʒuː/', say: 'woo-ju' },
      { p: 'meet you', ipa: '/miː‿tʃuː/', say: 'mee-chu' },
      { p: 'could you', ipa: '/kʊ‿dʒuː/', say: 'koo-ju' },
      { p: 'miss you', ipa: '/mɪ‿ʃuː/', say: 'mi-shu' },
      { p: 'this year', ipa: '/ðɪ‿ʃɪə/', say: 'thi-shear' },
      { p: 'as you know', ipa: '/ə‿ʒuː ˈnəʊ/', say: 'a-zhu-know' },
    ],
  },
  {
    id: 'elide', icon: '✂️', name: 'Nuốt âm /t/ /d/', short: '/t/ hoặc /d/ kẹp giữa hai phụ âm thường bị bỏ (không đọc).',
    how: 'Trong cụm 3 phụ âm liền nhau qua ranh giới từ (vd "nex-t d-ay"), âm /t/ hoặc /d/ ở giữa gần như biến mất để nói nhanh, tự nhiên hơn.',
    tip: '"last night" nghe như "las night"; "next day" → "nex day". Khi nghe IELTS, đừng tìm âm /t/ ở những chỗ này.',
    ex: [
      { p: 'next day', ipa: '/neks‿ˈdeɪ/', say: 'nex day' },
      { p: 'last night', ipa: '/lɑːs‿ˈnaɪt/', say: 'las night' },
      { p: 'must be', ipa: '/mʌs‿bi/', say: 'mus be' },
      { p: 'old man', ipa: '/əʊl‿ˈmæn/', say: 'oul man' },
      { p: 'first time', ipa: '/fɜːs‿ˈtaɪm/', say: 'firs time' },
      { p: 'handbag', ipa: '/ˈhæn‿bæɡ/', say: 'han-bag' },
      { p: "I don't know", ipa: '/aɪ dəʊn‿ˈnəʊ/', say: 'ai doun know' },
    ],
  },
  {
    id: 'weak', icon: '🌫️', name: 'Dạng yếu của từ chức năng', short: 'to, and, of, can, for, a, the… khi không nhấn thường đọc rất nhẹ với /ə/.',
    how: 'Từ chức năng (giới từ, liên từ, trợ động từ, mạo từ) không mang nghĩa chính nên được đọc lướt: to → /tə/, and → /ən/ hoặc /n/, of → /əv/ hoặc /ə/, can → /kən/, for → /fə/.',
    tip: 'Nhấn mạnh từ nội dung (danh từ, động từ, tính từ), đọc lướt từ chức năng → nghe như người bản xứ và nghe IELTS dễ hơn.',
    ex: [
      { p: 'a cup of tea', ipa: '/ə ˈkʌp‿əv ˈtiː/', say: 'a cup-a tea' },
      { p: 'fish and chips', ipa: '/ˈfɪʃ‿ən ˈtʃɪps/', say: 'fish-n-chips' },
      { p: 'I can swim', ipa: '/aɪ kən ˈswɪm/', say: 'ai kn swim' },
      { p: 'want to go', ipa: '/ˈwɒnt‿tə ɡəʊ/', say: 'wanna go' },
      { p: 'going to', ipa: '/ˈɡəʊɪŋ tə/', say: 'gonna' },
      { p: 'for you', ipa: '/fə juː/', say: 'fa you' },
      { p: 'bread and butter', ipa: '/ˈbred‿n ˈbʌtə/', say: 'bred-n-butter' },
    ],
  },
];

/** Câu luyện đọc liền mạch: ‿ đánh dấu chỗ nối; rules = các quy tắc xuất hiện */
export const LINK_SENTENCES: { s: string; marked: string; vi: string; rules: string[] }[] = [
  { s: 'Pick it up and put it on the table.', marked: 'Pick‿it‿up‿and put‿it‿on the table.', vi: 'Nhặt nó lên và đặt lên bàn.', rules: ['cv'] },
  { s: 'I am at home all afternoon.', marked: 'I‿(j)am‿at home‿all‿afternoon.', vi: 'Tôi ở nhà cả buổi chiều.', rules: ['j', 'cv'] },
  { s: 'Go on, do it again.', marked: 'Go‿(w)on, do‿(w)it‿again.', vi: 'Tiếp đi, làm lại lần nữa.', rules: ['w', 'cv'] },
  { s: 'Where is the car over there?', marked: 'Where‿(r)is the car‿(r)over there?', vi: 'Chiếc xe ở đằng kia đâu rồi?', rules: ['r'] },
  { s: 'Did you see it last night?', marked: 'Did‿you see‿(j)it las(t)‿night?', vi: 'Tối qua bạn có xem nó không?', rules: ['assim', 'j', 'elide'] },
  { s: 'Nice to meet you.', marked: 'Nice to meet‿you.', vi: 'Rất vui được gặp bạn.', rules: ['assim', 'weak'] },
  { s: 'I want to get a cup of black coffee.', marked: 'I wan(t) to get‿a cup‿of black‿coffee.', vi: 'Tôi muốn một tách cà phê đen.', rules: ['weak', 'cv', 'same'] },
  { s: 'Turn off the lights when you leave.', marked: 'Turn‿off the lights when you leave.', vi: 'Tắt đèn khi bạn rời đi.', rules: ['cv'] },
  { s: 'Could you help me for a moment?', marked: 'Could‿you help me for‿(r)a moment?', vi: 'Bạn giúp tôi một chút được không?', rules: ['assim', 'r'] },
  { s: 'It is an interesting idea.', marked: 'It‿is‿an‿interesting‿idea.', vi: 'Đó là một ý tưởng thú vị.', rules: ['cv'] },
  { s: 'Thank you so much for all of it.', marked: 'Thank you so much for‿(r)all‿of‿it.', vi: 'Cảm ơn bạn rất nhiều vì tất cả.', rules: ['r', 'cv'] },
  { s: 'Check it out, it is amazing.', marked: 'Check‿it‿out, it‿is‿amazing.', vi: 'Xem thử đi, tuyệt lắm.', rules: ['cv'] },
];
