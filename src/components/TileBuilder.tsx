interface Props { bank: string[]; picked: number[]; answered: boolean; onTile: (b: number) => void; onUnpick: (n: number) => void }
/** Xếp câu bằng các ô chữ: bấm ô ở dưới để thêm, bấm ô ở trên để bỏ */
export function TileBuilder({ bank, picked, answered, onTile, onUnpick }: Props) {
  return (
    <>
      <div className="slot">
        {picked.length ? picked.map((bi, n) => (
          <button key={n} className="tile" data-act="unpick" data-n={n} disabled={answered} onClick={() => onUnpick(n)}>{bank[bi]}</button>
        )) : <span className="muted">Bấm vào các từ bên dưới…</span>}
      </div>
      <div className="bank">
        {bank.map((w, bi) => {
          const used = picked.includes(bi);
          return <button key={bi} className={used ? 'tile used' : 'tile'} data-act="tile" data-b={bi} disabled={used || answered} onClick={() => onTile(bi)}>{w}</button>;
        })}
      </div>
    </>
  );
}
