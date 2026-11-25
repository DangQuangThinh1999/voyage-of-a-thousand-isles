/** Các từ của câu mẫu: xanh = máy nghe đúng, đỏ = chưa nghe được */
export function WordsHit({ T, hit }: { T: string[]; hit: boolean[] }) {
  return (
    <div className="words-hit">
      {T.map((w, i) => <span key={i}>{i > 0 && ' '}<span className={hit[i] ? 'hit' : 'miss'}>{w === 'i' ? 'I' : w}</span></span>)}
    </div>
  );
}
