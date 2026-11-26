// Giải thích ngữ pháp trong câu bằng tiếng Việt: nhận ra các mẫu thường gặp và nói "tại sao lại như vậy".
// Chạy bằng luật ngay trong app (không cần mạng). Máy có thể bỏ sót mẫu hiếm, nhưng các mẫu dưới đây là phần lớn câu A1–B2.

export interface GrammarPoint { name: string; hit: string; why: string }

const IRR: Record<string, [past: string, pp: string]> = {
  be: ['was/were', 'been'], begin: ['began', 'begun'], break: ['broke', 'broken'], bring: ['brought', 'brought'], build: ['built', 'built'],
  buy: ['bought', 'bought'], catch: ['caught', 'caught'], choose: ['chose', 'chosen'], come: ['came', 'come'], cost: ['cost', 'cost'],
  cut: ['cut', 'cut'], do: ['did', 'done'], draw: ['drew', 'drawn'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'], eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'], feel: ['felt', 'felt'], find: ['found', 'found'], fly: ['flew', 'flown'], forget: ['forgot', 'forgotten'],
  get: ['got', 'got/gotten'], give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'], have: ['had', 'had'], hear: ['heard', 'heard'],
  hold: ['held', 'held'], keep: ['kept', 'kept'], know: ['knew', 'known'], leave: ['left', 'left'], lend: ['lent', 'lent'], lose: ['lost', 'lost'],
  make: ['made', 'made'], meet: ['met', 'met'], pay: ['paid', 'paid'], put: ['put', 'put'], read: ['read', 'read'], ride: ['rode', 'ridden'],
  run: ['ran', 'run'], say: ['said', 'said'], see: ['saw', 'seen'], sell: ['sold', 'sold'], send: ['sent', 'sent'], set: ['set', 'set'],
  show: ['showed', 'shown'], sing: ['sang', 'sung'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'], speak: ['spoke', 'spoken'], spend: ['spent', 'spent'],
  stand: ['stood', 'stood'], steal: ['stole', 'stolen'], swim: ['swam', 'swum'], take: ['took', 'taken'], teach: ['taught', 'taught'],
  tell: ['told', 'told'], think: ['thought', 'thought'], throw: ['threw', 'thrown'], understand: ['understood', 'understood'],
  wake: ['woke', 'woken'], wear: ['wore', 'worn'], win: ['won', 'won'], write: ['wrote', 'written'], hit: ['hit', 'hit'], let: ['let', 'let'],
  hurt: ['hurt', 'hurt'], shut: ['shut', 'shut'], rise: ['rose', 'risen'], fight: ['fought', 'fought'], feed: ['fed', 'fed'], lead: ['led', 'led'],
  mean: ['meant', 'meant'], seek: ['sought', 'sought'], shoot: ['shot', 'shot'], hide: ['hid', 'hidden'], bite: ['bit', 'bitten'], freeze: ['froze', 'frozen'],
};
const PAST_IRR = new Map<string, string>(), PP_IRR = new Map<string, string>();
for (const [v, [p, pp]] of Object.entries(IRR)) {
  p.split('/').forEach((x) => { if (x !== v) PAST_IRR.set(x, v); });
  pp.split('/').forEach((x) => { if (x !== v) PP_IRR.set(x, v); });
}
const isPP = (w: string) => PP_IRR.has(w) || /[a-z]{2,}ed$/.test(w);
const isPast = (w: string) => PAST_IRR.has(w) || /[a-z]{2,}ed$/.test(w);
const SUBJ = /^(i|you|we|they|he|she|it|people|children|students|my|our|their|his|her|the|this|that)$/;
const NOT_VERB_S = new Set(['is', 'was', 'has', 'does', 'this', 'his', 'its', 'us', 'yes', 'bus', 'always', 'sometimes', 'perhaps', 'news', 'less', 'class', 'glass', 'miss']);
const BE = 'am|is|are|was|were|be|been|being';
const ADJ_ING = new Set(['interesting', 'boring', 'amazing', 'exciting', 'tiring', 'surprising', 'confusing', 'relaxing', 'annoying', 'shocking', 'missing', 'morning', 'evening', 'nothing', 'something', 'anything', 'everything', 'thing', 'king', 'ring', 'during', 'building', 'meeting', 'feeling', 'wedding', 'ceiling', 'spring', 'string', 'sing', 'bring']);
const TO_VERBS = 'want|wants|wanted|need|needs|needed|would like|like|likes|plan|plans|planned|decide|decides|decided|hope|hopes|hoped|try|tries|tried|learn|learns|learned|promise|promised|agree|agreed|refuse|refused|forget|forgot|remember|seem|seems|seemed|expect|expected|afford|manage|managed|offer|offered|prefer|prefers';
const ING_VERBS = 'enjoy|enjoys|enjoyed|finish|finished|avoid|avoids|avoided|mind|keep|keeps|kept|suggest|suggested|consider|considered|stop|stopped|practise|practice|practiced|miss|missed|imagine|risk|deny|denied|admit|admitted|recommend|recommended|quit';

const MODAL_WHY: Record<string, string> = {
  can: 'can + động từ nguyên mẫu: có thể, biết làm (khả năng) hoặc xin phép.',
  could: 'could + động từ nguyên mẫu: có thể (lịch sự hơn can, hoặc khả năng trong quá khứ).',
  should: 'should + động từ nguyên mẫu: nên làm (lời khuyên).',
  must: 'must + động từ nguyên mẫu: phải làm (bắt buộc, rất cần thiết).',
  may: 'may + động từ nguyên mẫu: có lẽ, có thể (khả năng), hoặc xin phép trang trọng.',
  might: 'might + động từ nguyên mẫu: có lẽ (không chắc lắm).',
  would: 'would + động từ nguyên mẫu: sẽ (giả định, lịch sự, hoặc tương lai trong quá khứ).',
};

/** Tìm các điểm ngữ pháp trong câu tiếng Anh */
export function explain(sentence: string): GrammarPoint[] {
  const s = sentence.replace(/[’]/g, "'"), low = ' ' + s.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  const toks = low.trim().split(' ');
  const out: GrammarPoint[] = [];
  const add = (name: string, hit: string, why: string) => { if (!out.some((x) => x.name === name)) out.push({ name, hit, why }); };
  const m = (re: RegExp) => low.match(re);
  let x: RegExpMatchArray | null;

  // ----- câu hỏi, phủ định, mệnh lệnh
  if (/\?\s*$/.test(s)) {
    if ((x = m(/^ (what|where|when|why|who|how|which|whose)\b/))) add('Câu hỏi có từ để hỏi', x[1], `Từ để hỏi (${x[1]}) đứng đầu, rồi trợ động từ (do/does/did, is/are, can…) đứng TRƯỚC chủ ngữ. Ví dụ: Where do you live?`);
    else if ((x = m(/^ (do|does|did|is|are|am|was|were|can|could|will|would|should|have|has|may)\b/))) add('Câu hỏi Yes/No', x[1], `Đưa trợ động từ "${x[1]}" lên TRƯỚC chủ ngữ để hỏi. Trả lời bằng Yes/No. Sau do/does/did động từ chính về nguyên mẫu.`);
  }
  if ((x = m(/ (don't|doesn't|didn't|do not|does not|did not) ([a-z]+)/))) add('Câu phủ định với do/does/did', `${x[1]} ${x[2]}`, `Động từ thường không tự phủ định được, phải mượn trợ động từ: don't (I/you/we/they), doesn't (he/she/it), didn't (quá khứ). Sau đó động từ "${x[2]}" về NGUYÊN MẪU, không thêm -s hay -ed.`);
  else if ((x = m(/ (isn't|aren't|wasn't|weren't|am not|is not|are not|was not|were not|won't|can't|cannot|shouldn't|couldn't) /))) add('Câu phủ định', x[1], 'Thêm not ngay sau to be, will, can, should… để phủ định (won\'t = will not, can\'t = cannot).');
  if ((x = m(/^ (please )?(do not|don't|never|let's|go|come|take|put|close|open|turn|try|remember|make|keep|be|give|tell|call|check|wait|stop|look|listen|read|write|sit|stand|bring|send|use|wash|eat|drink|help|ask|follow|leave|pay|book|choose|enjoy|consider|avoid|start) /)) && !/\?\s*$/.test(s))
    add('Câu mệnh lệnh / đề nghị', x[0].trim(), 'Câu bắt đầu bằng động từ nguyên mẫu, không có chủ ngữ (ngầm hiểu là "you"): dùng để yêu cầu, hướng dẫn. Thêm please cho lịch sự; Don\'t + V để cấm; Let\'s + V để rủ cùng làm.');

  // ----- thì
  if ((x = m(/ (will|'ll|won't) (not )?(be )?([a-z]+)/)) && x[4] !== 'be') add('Tương lai đơn: will + V', x[0].trim(), 'will + động từ nguyên mẫu: việc sẽ xảy ra, quyết định ngay lúc nói, dự đoán hoặc lời hứa. Động từ sau will KHÔNG chia (không -s, không -ed).');
  if ((x = m(/ (am|is|are|'m|'re|'s|was|were) going to ([a-z]+)/))) add('Tương lai gần: be going to + V', x[0].trim(), 'be going to + động từ nguyên mẫu: dự định đã có từ trước, hoặc việc chắc chắn sắp xảy ra vì có dấu hiệu.');
  if ((x = m(/ (had) (not )?(been )?([a-z]+)/)) && isPP(x[4])) add('Quá khứ hoàn thành: had + V3', x[0].trim(), 'had + V3 (quá khứ phân từ): việc xảy ra TRƯỚC một việc khác trong quá khứ.');
  if ((x = m(/ (have|has|'ve|haven't|hasn't) (not |never |already |just |ever |recently )?(been )?([a-z]+)/)) && (isPP(x[4]) || x[3]))
    add('Hiện tại hoàn thành: have/has + V3', x[0].trim(), 'have/has + V3: việc đã xảy ra nhưng không nói rõ lúc nào, hoặc bắt đầu trong quá khứ và còn liên quan tới bây giờ. Dùng has với he/she/it. Hay đi với already, just, ever, never, for, since.');
  if ((x = m(/ (am|is|are|'m|'re) ([a-z]+ing) /)) && !ADJ_ING.has(x[2]) && !m(/ going to /)) add('Hiện tại tiếp diễn: am/is/are + V-ing', x[0].trim(), 'am/is/are + V-ing: hành động ĐANG xảy ra lúc nói, việc tạm thời, hoặc kế hoạch đã sắp xếp. I am, he/she/it is, you/we/they are.');
  if ((x = m(/ (was|were) ([a-z]+ing) /)) && !ADJ_ING.has(x[2]) && !m(/ going to /)) add('Quá khứ tiếp diễn: was/were + V-ing', x[0].trim(), 'was/were + V-ing: hành động ĐANG diễn ra tại một thời điểm trong quá khứ, thường bị một việc khác (quá khứ đơn) cắt ngang.');
  const bePP = low.match(new RegExp(` (${BE}) (not )?(also |often |usually |always |being )?([a-z]+) `));
  if (bePP && isPP(bePP[4]) && !['tired', 'interested', 'bored', 'excited', 'worried', 'married', 'surprised', 'pleased', 'scared', 'used', 'based', 'located', 'supposed', 'allowed', 'required', 'need', 'red', 'bed'].includes(bePP[4]))
    add('Câu bị động: be + V3', bePP[0].trim(), 'be + V3: chủ ngữ CHỊU tác động (được/bị làm), không phải tự làm. Dùng khi việc được làm quan trọng hơn người làm. Muốn nói ai làm thì thêm by + người.');
  // quá khứ đơn
  for (let i = 1; i < toks.length; i++) {
    const w = toks[i], prev = toks[i - 1];
    if (!SUBJ.test(prev) && !/^[a-z]+s$/.test(prev)) continue;
    if (/^(was|were)$/.test(w)) { add('Quá khứ đơn của to be: was/were', `${prev} ${w}`, 'was (I/he/she/it) và were (you/we/they): trạng thái trong quá khứ, nghĩa là "đã là, đã ở".'); break; }
    if (isPast(w) && !/^(need|feed|seed|speed|bleed|breed|weed|indeed|red|bed|shed)$/.test(w) && !/ (have|has|had|be|been|is|are|was|were) $/.test(' ' + prev + ' ')) {
      add('Quá khứ đơn', `${prev} ${w}`, PAST_IRR.has(w)
        ? `"${w}" là dạng quá khứ BẤT QUY TẮC của "${PAST_IRR.get(w)}" (phải học thuộc). Quá khứ đơn: việc đã xảy ra và kết thúc trong quá khứ (yesterday, last week, ago…).`
        : `Động từ có quy tắc thêm -ed để nói việc đã xảy ra và kết thúc trong quá khứ (yesterday, last week, ago…).`);
      break;
    }
  }
  // hiện tại đơn ngôi 3 số ít
  if ((x = m(/ (he|she|it|my [a-z]+|this [a-z]+|everyone|everybody|nobody|someone) (often |usually |always |sometimes |never |also |really |only |still )?([a-z]+(?:s|es)) /)) && !NOT_VERB_S.has(x[3]) && !/ss$/.test(x[3]))
    add('Hiện tại đơn: he/she/it + V-s/es', x[0].trim(), `Chủ ngữ ngôi thứ ba số ít (he, she, it, một người/vật) thì động từ thêm -s/-es ("${x[3]}"). Hiện tại đơn dùng cho thói quen, sự thật, lịch trình.`);
  const TENSE = /^(Hiện tại|Quá khứ|Tương lai|Câu bị động)/;
  if (!out.some((p) => TENSE.test(p.name) || p.name.startsWith('Quá khứ đơn của to be')) && (x = m(/ (i am|i'm|you are|you're|we are|we're|they are|they're|he is|he's|she is|she's|it is|it's|this is|that is|that's|[a-z]+ is|[a-z]+s are) /)) && !m(/ (is|are|am) [a-z]+ing /))
    add('Động từ to be: am / is / are', x[1], 'to be nghĩa là "là, thì, ở". I → am; he/she/it, một người/vật → is; you/we/they, số nhiều → are. Sau to be thường là danh từ (a teacher), tính từ (happy) hoặc nơi chốn (at home). Tiếng Việt hay bỏ chữ "là" trước tính từ, nhưng tiếng Anh KHÔNG được bỏ: I am happy, không viết I happy.');
  if (!out.some((p) => TENSE.test(p.name)) && (x = m(/ (i|you|we|they) (often |usually |always |sometimes |never |also |really |still )?([a-z]+) /))
    && !/^(am|are|was|were|will|would|can|could|should|must|may|might|have|had|do|did|don't|didn't|'m|'re|'ll|'ve|'d|to|and|or|not)$/.test(x[3]) && !isPast(x[3]) && !/ing$/.test(x[3]))
    add('Hiện tại đơn: I/you/we/they + V', x[0].trim(), `Với I, you, we, they (và danh từ số nhiều) động từ giữ NGUYÊN MẪU ("${x[3]}"), không thêm -s. Hiện tại đơn dùng cho thói quen, sự thật, lịch trình.`);
  if ((x = m(/ (always|usually|often|sometimes|never|rarely|seldom|every day|every week|every morning|every year|once a week|twice a week) /)))
    add('Trạng từ tần suất → hiện tại đơn', x[1], 'Từ chỉ mức độ thường xuyên (always, usually, often, sometimes, never…) cho thấy thói quen nên thường dùng hiện tại đơn. Vị trí: TRƯỚC động từ thường (I often walk), SAU to be (She is always late).');

  // ----- động từ khuyết thiếu và cấu trúc
  if ((x = m(/ (can|could|should|must|may|might|would) (not |also |really |never |still |easily |only )?([a-z]+)/)) && x[3] !== 'you' && x[3] !== 'i' && x[3] !== 'we')
    add(`Động từ khuyết thiếu: ${x[1]}`, x[0].trim(), MODAL_WHY[x[1]] + ' Động từ phía sau luôn ở dạng NGUYÊN MẪU, không thêm to, -s, -ed.');
  if ((x = m(/ (have to|has to|had to) ([a-z]+)/))) add('have to + V: phải làm', x[0].trim(), 'have/has/had to + động từ nguyên mẫu: phải làm vì hoàn cảnh hoặc quy định (khác must: thường là ý của người nói).');
  if ((x = m(/ used to ([a-z]+)/)) && !m(/ (be|is|am|are|was|were|get|got) used to /)) add('used to + V: thói quen trong quá khứ', x[0].trim(), 'used to + động từ nguyên mẫu: trước đây thường làm, BÂY GIỜ không còn nữa.');
  if ((x = m(/ (there is|there are|there was|there were|there's|there will be|there has been)/))) add('There is / There are: có', x[1], 'Dùng để nói "có cái gì ở đâu". There is + danh từ số ít/không đếm được, There are + danh từ số nhiều. Chia to be theo danh từ đứng SAU.');
  if ((x = m(new RegExp(` (${TO_VERBS}) to ([a-z]+)`)))) add('Động từ + to V', x[0].trim(), `"${x[1]}" đi với to + động từ nguyên mẫu (want to go, need to buy, decide to stay…). Những động từ này nói về mong muốn, kế hoạch, ý định hướng tới tương lai.`);
  if ((x = m(new RegExp(` (${ING_VERBS}) ([a-z]+ing) `)))) add('Động từ + V-ing', x[0].trim(), `"${x[1]}" đi với V-ing, không đi với to V (enjoy reading, avoid eating, finish working…). Đây là nhóm phải học thuộc.`);
  if ((x = m(/ (in|on|at|of|for|about|without|before|after|by|from|instead of) ([a-z]+ing) /)) && !ADJ_ING.has(x[2])) add('Giới từ + V-ing', x[0].trim(), 'Sau giới từ (in, on, at, of, for, about, without, before, after, by…) động từ phải ở dạng V-ing, không dùng to V hay nguyên mẫu.');
  if ((x = m(/ (in order to|so as to) ([a-z]+)/)) || (x = m(/ ([a-z]+ed|went|came) to ([a-z]+) (the|a|my|some|more) /))) add('to V chỉ mục đích', x[0].trim(), 'to + động từ nguyên mẫu để nói MỤC ĐÍCH: làm gì để làm gì (I went to the shop to buy milk).');

  // ----- câu ghép, điều kiện, mệnh đề quan hệ
  if (m(/ if /)) {
    if (m(/ (would|could|might) /)) add('Câu điều kiện loại 2', 'if … would', 'If + quá khứ đơn, would + V: điều KHÔNG có thật hoặc khó xảy ra ở hiện tại. Với to be thường dùng "were" cho mọi ngôi (If I were you…).');
    else if (m(/ (will|'ll|won't|can) /)) add('Câu điều kiện loại 1', 'if … will', 'If + hiện tại đơn, will + V: điều CÓ THỂ xảy ra trong tương lai. Vế if KHÔNG dùng will dù nói về tương lai.');
    else add('Câu điều kiện loại 0', 'if', 'If + hiện tại đơn, hiện tại đơn: sự thật luôn đúng, quy luật (If you heat ice, it melts).');
  }
  if ((x = m(/ ([a-z]+) (who|which|whose|where) (?!do|does|did|is|are|can)/)) && toks.indexOf(x[2]) > 0 && !/\?\s*$/.test(s))
    add('Mệnh đề quan hệ', `${x[1]} ${x[2]}`, 'who (người), which (vật), whose (của ai), where (nơi chốn) nối thêm thông tin cho danh từ đứng ngay TRƯỚC nó, giúp không phải tách thành hai câu.');
  else if ((x = m(/ (the|a|an) ([a-z]+) that ([a-z]+)/)) && !/^(is|was|are|were)$/.test(x[3])) add('Mệnh đề quan hệ với that', x[0].trim(), 'that có thể thay cho who/which để nói thêm về danh từ đứng trước (the book that I bought).');
  if ((x = m(/ (because|so|but|although|though|while|when|until|unless|since|whereas|as soon as) /)) && toks.indexOf(x[1].split(' ')[0]) > 0) {
    const why: Record<string, string> = {
      because: 'because + mệnh đề: nêu LÝ DO (vì).', so: 'so: nêu KẾT QUẢ (nên, vì vậy).', but: 'but: nối hai ý TRÁI NGƯỢC (nhưng).',
      although: 'although + mệnh đề: mặc dù (hai ý trái ngược, không dùng thêm but).', though: 'though: mặc dù (giống although, thân mật hơn).',
      while: 'while: trong khi (hai việc cùng lúc, hoặc so sánh đối lập).', when: 'when: khi (thời điểm). Nếu nói về tương lai, vế when dùng hiện tại đơn, không dùng will.',
      until: 'until: cho đến khi.', unless: 'unless = if not: trừ khi.', since: 'since: kể từ khi (thời gian) hoặc vì (lý do).',
      whereas: 'whereas: trong khi đó (so sánh đối lập, trang trọng).', 'as soon as': 'as soon as: ngay khi. Nói về tương lai thì vế này dùng hiện tại đơn.',
    };
    add(`Liên từ: ${x[1]}`, x[1], why[x[1]] + ' Liên từ nối hai mệnh đề, mỗi mệnh đề có chủ ngữ và động từ riêng.');
  }

  // ----- so sánh
  if ((x = m(/ (more|less) ([a-z]+) than /)) || (x = m(/ ([a-z]+er) than /))) add('So sánh hơn', x[0].trim(), 'Tính từ ngắn + -er + than (cheaper than); tính từ dài: more + tính từ + than (more expensive than). good → better, bad → worse.');
  if ((x = m(/ the (most|least) ([a-z]+) /)) || (x = m(/ the ([a-z]+est) /))) add('So sánh nhất', x[0].trim(), 'the + tính từ ngắn + -est (the cheapest) hoặc the most + tính từ dài (the most important): hơn TẤT CẢ trong nhóm. good → the best, bad → the worst.');
  if ((x = m(/ as ([a-z]+) as /))) add('So sánh bằng: as … as', x[0].trim(), 'as + tính từ/trạng từ + as: bằng, như nhau. not as … as: không bằng.');

  // ----- danh từ, mạo từ, sở hữu
  if ((x = m(/ an ([a-z]+)/))) add('Mạo từ an', x[0].trim(), `Dùng an trước từ bắt đầu bằng ÂM nguyên âm (a, e, i, o, u khi đọc): an ${x[1]}. Còn lại dùng a. Chú ý theo âm đọc: an hour, a university.`);
  else if ((x = m(/ a ([a-z]+)/))) add('Mạo từ a', x[0].trim(), 'a + danh từ đếm được số ít, nhắc tới lần đầu hoặc không xác định (một cái nào đó). Trước âm nguyên âm thì dùng an.');
  if ((x = m(/ the ([a-z]+)/))) add('Mạo từ the', x[0].trim(), 'the: người/vật ĐÃ XÁC ĐỊNH (đã nhắc tới, cả hai bên đều biết, hoặc chỉ có một: the sun, the internet).');
  if ((x = s.match(/\b([A-Za-z]+)'s\b(?!\s+(been|got|a|an|the|not|very|going|so|too|in|on|at|my|your|his|her|our|their|\w+ing)\b)/)) && !/^(it|he|she|that|what|there|who|here|let)$/i.test(x[1])) add('Sở hữu cách \'s', x[0], `danh từ + 's: "của". ${x[1]}'s … = … của ${x[1]}. Danh từ số nhiều có s thì chỉ thêm dấu ': my parents' house.`);
  if ((x = m(/ (two|three|four|five|six|seven|eight|nine|ten|many|several|few|a few|these|those|some|all|both) ([a-z]+s) /)) && !NOT_VERB_S.has(x[2])) add('Danh từ số nhiều', x[0].trim(), 'Sau số đếm từ hai trở lên, many, several, a few, these, those… danh từ đếm được phải ở dạng số nhiều (thêm -s/-es).');
  if ((x = m(/ (much|a little|less) ([a-z]+) /)) && !m(/ (much|a little) (more|better|bigger|faster|easier|less) /)) add('much / a little + danh từ không đếm được', x[0].trim(), 'much, a little, less đi với danh từ KHÔNG đếm được (water, money, time, information). Danh từ đếm được dùng many, a few, fewer.');

  // ----- giới từ thời gian, nơi chốn
  if ((x = m(/ at (\w+ o'clock|night|noon|midnight|the weekend|weekends|home|work|school|the moment|[a-z]+ (am|pm))/)) || (x = m(/ at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/))) add('Giới từ at', x[0].trim(), 'at: thời điểm chính xác (at seven, at night, at the weekend) hoặc một điểm/nơi cụ thể (at home, at work, at school).');
  if ((x = m(/ on (monday|tuesday|wednesday|thursday|friday|saturday|sunday|mondays|fridays|sundays|saturdays|my birthday|the [a-z]+ of|the table|the wall|the floor|the internet|the phone|tv|time)/))) add('Giới từ on', x[0].trim(), 'on: ngày trong tuần, ngày cụ thể (on Monday, on my birthday), hoặc trên bề mặt (on the table), phương tiện thông tin (on TV, on the internet).');
  if ((x = m(/ in (january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter|the morning|the afternoon|the evening|the future|the past|the city|the world|the country|[a-z]+ (years|weeks|days|minutes))/))) add('Giới từ in', x[0].trim(), 'in: khoảng thời gian dài (in May, in summer, in the morning, in two weeks) hoặc ở bên trong một không gian (in the city, in the room).');
  if ((x = m(/ (for|since) (two|three|four|five|six|ten|many|several|a long|years|months|weeks|[0-9]+|last|yesterday|monday|january|the|morning|childhood|then)/)) && m(/ (have|has|'ve|had) /))
    add('for / since với hiện tại hoàn thành', x[0].trim(), 'for + khoảng thời gian (for two years); since + mốc bắt đầu (since 2020, since Monday). Hay đi với hiện tại hoàn thành để nói việc kéo dài tới bây giờ.');

  return out;
}

const POS_WHY: Record<string, string> = {
  noun: 'Danh từ: chỉ người, vật, việc, ý tưởng. Thường đứng sau a/an/the, my/your, tính từ; làm chủ ngữ hoặc tân ngữ.',
  verb: 'Động từ: chỉ hành động, trạng thái. Phải chia theo chủ ngữ và thì (thêm -s với he/she/it, -ed ở quá khứ…).',
  adjective: 'Tính từ: mô tả danh từ. Đứng TRƯỚC danh từ (a big house) hoặc SAU to be, look, feel, seem (The house is big).',
  adverb: 'Trạng từ: bổ nghĩa cho động từ, tính từ hoặc cả câu (nhiều từ có đuôi -ly). Thường đứng sau động từ hoặc đầu/cuối câu.',
  preposition: 'Giới từ: đứng trước danh từ/đại từ để chỉ nơi chốn, thời gian, cách thức. Sau giới từ, động từ phải ở dạng V-ing.',
  conjunction: 'Liên từ: nối hai từ, hai cụm hoặc hai mệnh đề.',
  pronoun: 'Đại từ: thay cho danh từ để không lặp lại.',
  determiner: 'Từ hạn định: đứng TRƯỚC danh từ để xác định nó (the, this, some, many, my…).',
  number: 'Số từ: đứng trước danh từ; từ hai trở lên thì danh từ thêm -s.',
  interjection: 'Thán từ: bộc lộ cảm xúc, đứng riêng hoặc đầu câu.',
};
/** Giải thích từ loại của từ (vị trí trong câu) */
export function posWhy(pos: string): string | undefined {
  return POS_WHY[pos.split(',')[0].trim().toLowerCase()];
}
