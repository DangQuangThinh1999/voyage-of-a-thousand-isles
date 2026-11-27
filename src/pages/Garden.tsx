// 🌳 KHU VƯỜN: đổi điểm (⭐ = XP học được − điểm đã tiêu) lấy cây, nhà, đồ trang trí, thời tiết; đồ sự kiện theo mùa.
// Cây LỚN LÊN khi bạn tiếp tục học (XP tăng sau lúc trồng) → động lực học mỗi ngày. Lưu trong tiến độ (đồng bộ mây).
import { motion } from 'motion/react';
import { useState } from 'react';
import { at, celebrate } from '../components/Celebrate';
import { Pills } from '../components/ui';
import { balance } from '../lib/nick';
import { perm } from '../lib/perm';
import { dayKey } from '../lib/util';
import type { Progress } from '../lib/progress';
import { app, askConfirm, emit, go, save, toast, useApp } from '../state/store';

type Cat = 'tree' | 'house' | 'deco' | 'weather' | 'event';
/** [mã, nhóm, emoji (cây: lúc lớn hẳn), tên, giá, sự kiện] */
type Item = [k: string, cat: Cat, em: string, name: string, price: number, ev?: string];
const EVENTS: { id: string; name: string; icon: string; on: (m: number, d: number) => boolean }[] = [
  { id: 'xmas', name: 'Giáng sinh', icon: '🎄', on: (m, d) => (m === 11 && d >= 15) || m === 12 },
  { id: 'tet', name: 'Tết Nguyên đán', icon: '🧧', on: (m, d) => (m === 1 && d >= 10) || m === 2 },
  { id: 'spring', name: 'Mùa xuân', icon: '🌷', on: (m) => m === 3 || m === 4 },
  { id: 'summer', name: 'Mùa hè', icon: '🏖️', on: (m) => m >= 6 && m <= 8 },
  { id: 'halloween', name: 'Halloween', icon: '🎃', on: (m) => m === 10 },
];
const ITEMS: Item[] = [
  ['apple', 'tree', '🍎', 'Cây táo', 50], ['orange', 'tree', '🍊', 'Cây cam', 50], ['mango', 'tree', '🥭', 'Cây xoài', 60], ['peach', 'tree', '🍑', 'Cây đào (quả)', 60],
  ['cherry', 'tree', '🍒', 'Cây anh đào', 80], ['lemon', 'tree', '🍋', 'Cây chanh', 40], ['coconut', 'tree', '🥥', 'Cây dừa', 70], ['banana', 'tree', '🍌', 'Cây chuối', 45],
  ['grape', 'tree', '🍇', 'Giàn nho', 70], ['strawberry', 'tree', '🍓', 'Luống dâu', 35], ['sunflower', 'tree', '🌻', 'Hướng dương', 25], ['rose', 'tree', '🌹', 'Hoa hồng', 30],
  ['tulip', 'tree', '🌷', 'Hoa tulip', 30], ['cactus', 'tree', '🌵', 'Xương rồng', 20], ['pine', 'tree', '🌲', 'Cây thông', 40], ['bamboo', 'tree', '🎍', 'Tre', 35],
  ['hut', 'house', '🛖', 'Chòi lá', 120], ['house', 'house', '🏠', 'Nhà gỗ', 200], ['villa', 'house', '🏡', 'Nhà vườn', 350], ['castle', 'house', '🏰', 'Lâu đài', 1000],
  ['tent', 'house', '⛺', 'Lều cắm trại', 80], ['fountain', 'house', '⛲', 'Đài phun nước', 150], ['well', 'house', '🪣', 'Giếng nước', 60], ['bench', 'house', '🪑', 'Ghế đá', 40],
  ['dog', 'deco', '🐶', 'Chú chó', 80], ['cat', 'deco', '🐱', 'Chú mèo', 80], ['chicken', 'deco', '🐔', 'Gà', 40], ['rabbit', 'deco', '🐰', 'Thỏ', 60], ['duck', 'deco', '🦆', 'Vịt', 40],
  ['butterfly', 'deco', '🦋', 'Bướm', 20], ['bee', 'deco', '🐝', 'Ong', 20], ['lamp', 'deco', '🏮', 'Đèn lồng', 25], ['star', 'deco', '⭐', 'Ngôi sao', 25], ['rock', 'deco', '🪨', 'Hòn đá', 10],
  ['mushroom', 'deco', '🍄', 'Nấm', 15], ['flowerpot', 'deco', '🪴', 'Chậu cây', 20], ['balloon', 'deco', '🎈', 'Bóng bay', 15], ['ribbon', 'deco', '🎀', 'Nơ', 15],
  ['sun', 'weather', '☀️', 'Nắng đẹp', 0], ['cloud', 'weather', '⛅', 'Nhiều mây', 20], ['rain', 'weather', '🌧️', 'Mưa', 30], ['snow', 'weather', '❄️', 'Tuyết rơi', 50],
  ['rainbow', 'weather', '🌈', 'Cầu vồng', 60], ['night', 'weather', '🌙', 'Đêm đầy sao', 60], ['sunset', 'weather', '🌇', 'Hoàng hôn', 40],
  ['xmastree', 'event', '🎄', 'Cây thông Noel', 100, 'xmas'], ['snowman', 'event', '⛄', 'Người tuyết', 60, 'xmas'], ['gift', 'event', '🎁', 'Hộp quà', 30, 'xmas'], ['santa', 'event', '🎅', 'Ông già Noel', 150, 'xmas'],
  ['mai', 'event', '🌼', 'Cây mai vàng', 100, 'tet'], ['dao', 'event', '🌸', 'Cây hoa đào', 100, 'tet'], ['lixi', 'event', '🧧', 'Bao lì xì', 20, 'tet'], ['firework', 'event', '🎆', 'Pháo hoa', 50, 'tet'],
  ['sakura', 'event', '🌸', 'Hoa anh đào', 80, 'spring'], ['chick', 'event', '🐣', 'Gà con', 30, 'spring'], ['umbrella', 'event', '⛱️', 'Dù biển', 40, 'summer'], ['crab', 'event', '🦀', 'Cua', 30, 'summer'],
  ['pumpkin', 'event', '🎃', 'Bí ngô', 40, 'halloween'], ['ghost', 'event', '👻', 'Ma vui vẻ', 40, 'halloween'],
];
const byK = (k: string) => ITEMS.find((i) => i[0] === k);
const GROWS = new Set(['tree', 'event']);
/** Cây lớn theo XP học thêm sau khi trồng: hạt → mầm → cây non → cây lớn → ra hoa/quả */
const STAGE_XP = [0, 20, 60, 120, 200];
const grown = (P: Progress, x: { xp0: number; w?: number }) => (P.xp || 0) - x.xp0 + (x.w || 0);
const stageOf = (P: Progress, x: { xp0: number; w?: number }) => STAGE_XP.filter((t) => grown(P, x) >= t).length - 1;
/** Mỗi lần tưới: cây lớn thêm như học được 15 ⭐ (mỗi cây 1 lần/ngày; admin không giới hạn) */
const WATER = 15;
const STAGE_EM = ['🌰', '🌱', '🌿', '🌳'];
const STAGE_NAME = ['Hạt giống', 'Nảy mầm', 'Cây non', 'Cây lớn', 'Ra hoa / quả'];
const grows = (it: Item) => GROWS.has(it[1]) && !['gift', 'santa', 'lixi', 'firework', 'chick', 'umbrella', 'crab', 'pumpkin', 'ghost', 'snowman'].includes(it[0]);

function garden(P: Progress) { return P.garden || (P.garden = { items: [], owned: ['sun'], weather: 'sun', at: 0 }); }
const touch = () => { garden(app.P).at = Date.now(); save(); emit(); };

/** Khu vườn đang bảo trì (làm lại giao diện): người học thấy thông báo, admin vẫn vào xem được. Dữ liệu vườn giữ nguyên. */
export const GARDEN_MAINTENANCE = true;
export default function Garden() {
  useApp();
  if (GARDEN_MAINTENANCE && !perm.admin) return (
    <section className="card center">
      <div className="huge">🚧</div>
      <h2>Khu vườn đang bảo trì</h2>
      <p className="muted">Khu vườn đang được làm lại cho đẹp hơn. Cây, nhà và đồ bạn đã mua vẫn được giữ nguyên.<br />Trong lúc chờ, hãy học và chơi trò chơi để tích ⭐ nhé!</p>
      <button className="btn" onClick={() => go('fun')}>🎮 Sang Giải trí</button>
    </section>
  );
  return <GardenMain />;
}
function GardenMain() {
  const { P } = useApp();
  const G = garden(P), admin = perm.admin, bal = admin ? 999999 : balance(P), today = dayKey(), now = new Date(), ev = EVENTS.filter((e) => e.on(now.getMonth() + 1, now.getDate()));
  const [cat, setCat] = useState<Cat>(ev.length ? 'event' : 'tree'), [sel, setSel] = useState<number | null>(null);
  const shop = ITEMS.filter((i) => i[1] === cat && (cat !== 'event' || ev.some((e) => e.id === i[5])));
  const buy = (it: Item, e: React.MouseEvent) => {
    if (it[1] === 'weather' && G.owned.includes(it[0])) { G.weather = it[0]; touch(); return; }
    if (bal < it[4]) { toast(`Cần ${it[4]} ⭐, bạn có ${bal} ⭐. Học thêm hoặc chơi trò chơi để tích điểm nhé!`); return; }
    if (!admin) P.spent = (P.spent || 0) + it[4];
    if (it[1] === 'weather') { G.owned.push(it[0]); G.weather = it[0]; }
    else G.items.push({ id: Date.now(), k: it[0], x: 6 + Math.random() * 82, y: 8 + Math.random() * 70, xp0: P.xp || 0 });
    touch(); celebrate(admin ? `${it[2]} (admin)` : `${it[2]} −${it[4]} ⭐`, at(e));
  };
  const canWater = (x: { wd?: string }) => admin || x.wd !== today;
  const water = (x: { w?: number; wd?: string }) => { x.w = (x.w || 0) + WATER; x.wd = today; };
  const waterAll = (e: React.MouseEvent) => {
    const list = G.items.filter((x) => { const it = byK(x.k); return it && grows(it) && canWater(x) && stageOf(P, x) < 4; });
    if (!list.length) { toast(G.items.length ? '💧 Hôm nay đã tưới hết rồi, mai tưới tiếp nhé!' : 'Chưa có cây nào để tưới'); return; }
    list.forEach(water); touch(); celebrate(`💧 Đã tưới ${list.length} cây`, at(e));
  };
  const s = sel !== null ? G.items.find((x) => x.id === sel) : null, si = s ? byK(s.k) : null;
  const W = G.weather;
  return (
    <>
      <div className="card pbar">
        {GARDEN_MAINTENANCE && <p className="warn-box small m-0">🚧 Đang bảo trì — chỉ admin thấy trang này.</p>}
        <div className="row between wrap"><h2 className="m-0">🌳 Khu vườn của bạn</h2><span className="row gap"><b className="pts">⭐ {admin ? '∞ (admin)' : bal.toLocaleString('vi-VN') + ' điểm'}</b><button className="btn sm" onClick={(e) => waterAll(e)}>💧 Tưới cả vườn</button><button className="btn sm ghost" onClick={() => go('fun')}>🎮 Chơi kiếm điểm</button></span></div>
        <p className="muted small m-0">Học bài, ôn từ, chơi trò chơi → được ⭐. Cây bạn trồng <b>lớn lên khi bạn tiếp tục học</b> và khi bạn <b>💧 tưới nước</b> (mỗi cây 1 lần/ngày): mỗi {STAGE_XP[1]}–{STAGE_XP[4]} ⭐ học thêm là lên 1 giai đoạn, cuối cùng ra hoa / quả.</p>
        {ev.map((e) => <p key={e.id} className="ev-banner m-0">{e.icon} Sự kiện <b>{e.name}</b> đang diễn ra — có đồ đặc biệt trong mục 🎉 Sự kiện!</p>)}
      </div>
      <div className={'garden w-' + W} onClick={() => setSel(null)}>
        <div className="sky">{W === 'rain' || W === 'snow' ? Array.from({ length: 24 }, (_, i) => <i key={i} className={W} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.25}s` }}>{W === 'snow' ? '❄' : ''}</i>)
          : <span className="sky-em">{W === 'night' ? '🌙 ✨ ⭐' : W === 'rainbow' ? '🌈' : W === 'cloud' ? '⛅ ☁️' : W === 'sunset' ? '🌇' : '☀️'}</span>}</div>
        <div className="ground">
          {G.items.length === 0 && <p className="g-empty">Khu vườn đang trống. Mua 1 cây ở cửa hàng bên dưới để bắt đầu nhé! 🌱</p>}
          {G.items.map((x) => {
            const it = byK(x.k); if (!it) return null;
            const st = stageOf(P, x), em = grows(it) ? (st >= 4 ? it[2] : STAGE_EM[Math.min(st, 3)]) : it[2];
            return (
              <motion.button key={x.id} className={'g-item' + (sel === x.id ? ' on' : '') + (it[1] === 'house' ? ' big' : '')} style={{ left: `${x.x}%`, top: `${x.y}%` }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.15 }} onClick={(e) => { e.stopPropagation(); setSel(x.id); }}>
                {grows(it) && st >= 3 && st < 4 ? '🌳' : em}{grows(it) && st >= 4 && <small className="fruit">{it[2]}</small>}
              </motion.button>
            );
          })}
        </div>
      </div>
      {s && si && (
        <div className="card g-info">
          <b>{si[2]} {si[3]}</b>
          {grows(si) ? (() => {
            const st = stageOf(P, s), need = STAGE_XP[st + 1];
            return <p className="m-0">{STAGE_NAME[st]}{need !== undefined ? <> · học thêm hoặc tưới thêm <b>{need - grown(P, s)} ⭐</b> để lên “{STAGE_NAME[st + 1]}”</> : ' 🎉 đã lớn hẳn!'}</p>;
          })() : <p className="m-0 muted">Đồ trang trí</p>}
          <div className="row gap">
            {grows(si) && stageOf(P, s) < 4 && <button className="btn sm" disabled={!canWater(s)} onClick={(e) => { water(s); touch(); celebrate(`💧 +${WATER}`, at(e)); }}>{canWater(s) ? `💧 Tưới (+${WATER})` : '💧 Mai tưới tiếp'}</button>}
            {admin && grows(si) && stageOf(P, s) < 4 && <button className="btn sm ghost" onClick={(e) => { s.w = (s.w || 0) + STAGE_XP[4]; touch(); celebrate('⚡ Lớn ngay!', { ...at(e), big: true }); }}>⚡ Lớn ngay (admin)</button>}
            <button className="btn sm ghost" onClick={() => { s.x = 6 + Math.random() * 82; s.y = 8 + Math.random() * 70; touch(); }}>🔀 Dời chỗ</button>
            <button className="btn sm ghost" onClick={() => askConfirm({ icon: '🗑️', title: `Cất ${si[3]} đi?`, msg: 'Không hoàn lại điểm.', ok: 'Cất đi', danger: true }).then((ok) => { if (ok) { G.items = G.items.filter((x) => x.id !== s.id); setSel(null); touch(); } })}>🗑️ Cất đi</button>
          </div>
        </div>
      )}
      <div className="card">
        <h3 className="m-0 mb-2">🛒 Cửa hàng</h3>
        <Pills id="gshop" value={cat} onChange={setCat} items={[['tree', '🌳 Cây'], ['house', '🏠 Nhà'], ['deco', '🎀 Trang trí'], ['weather', '🌦️ Thời tiết'], ['event', `🎉 Sự kiện${ev.length ? '' : ' (chưa có)'}`]]} />
        {cat === 'event' && !ev.length && <p className="muted small">Hiện chưa có sự kiện. Sắp tới: 🎄 Giáng sinh (15/11–31/12), 🧧 Tết (10/1–hết tháng 2), 🌷 Mùa xuân, 🏖️ Mùa hè, 🎃 Halloween.</p>}
        <div className="shop">
          {shop.map((it) => {
            const own = it[1] === 'weather' && G.owned.includes(it[0]), on = it[1] === 'weather' && W === it[0];
            return (
              <button key={it[0]} className={'shop-it' + (on ? ' on' : '') + (!own && bal < it[4] ? ' poor' : '')} onClick={(e) => buy(it, e)}>
                <span className="em">{it[2]}</span><b>{it[3]}</b>
                <small>{on ? '✓ Đang dùng' : own ? 'Dùng' : it[4] ? `${it[4]} ⭐` : 'Miễn phí'}</small>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
