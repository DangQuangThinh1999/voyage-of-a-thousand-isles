// Lượt AI: thẻ "lượt còn lại hôm nay" (mọi người) + trang Quản lý cho admin (danh sách người học, lượt đã dùng, đổi hạn mức, xoá).
import { useEffect, useState } from 'react';
import { Bar } from '../components/ui';
import { aiFetch } from '../lib/ai';
import { Cloud } from '../lib/cloud';
import { askConfirm, go, toast, useApp, app } from '../state/store';
import { baseOf, generateToPool, staticIds } from '../state/exam';
import { roadmap } from '../lib/roadmap';

interface Me { enabled: boolean; login?: boolean; admin?: boolean; used?: number; limit?: number | null; remaining?: number | null; member?: boolean }
interface U { uid: string; email: string; name: string; used: number; limit: number; last: string; joined: string; total: number }
interface AdminData extends Me { day: string; users: U[]; max: number; idleDays: number; totalFree: number; usedAll: number; reserved: number; adminShare: number }

async function load(): Promise<Me | AdminData | null> {
  try { const r = await aiFetch('/api/admin'); return r.ok ? await r.json() : null; } catch { return null; }
}

/** Thẻ trong Cài đặt: lượt AI hôm nay + nút vào trang Quản lý (admin) */
export function AiQuotaCard() {
  useApp();
  const [me, setMe] = useState<Me | null>(null), uid = Cloud.user?.uid;
  useEffect(() => { load().then(setMe); }, [uid]);
  if (!me || !me.enabled) return null;
  return (
    <section className="card">
      <h3 className="m-0">🤖 Lượt dùng AI hôm nay</h3>
      {!me.login ? <p className="small">🔐 Cần <b>đăng nhập Google</b> để dùng các phần chấm/soạn bằng AI (mỗi người 100 lượt/ngày, tối đa 9 người học).</p>
        : me.admin ? <><p className="small">🛡️ Bạn là <b>admin</b>: không giới hạn theo người (dùng phần lượt còn lại của cả app). Hôm nay đã dùng {me.used} lượt.</p><button className="btn" onClick={() => go('admin')}>🛡️ Mở trang Quản lý</button></>
        : <>
          <p className="small">Còn <b>{me.remaining}</b>/{me.limit} lượt · lượt mới lúc 15 giờ (giờ Việt Nam). Đề có sẵn và bài luyện ngữ pháp không tốn lượt.</p>
          <Bar pct={((me.used || 0) / Math.max(1, me.limit || 1)) * 100} h={8} color={(me.remaining || 0) > 20 ? 'var(--pri)' : 'var(--bad)'} />
          <p className="muted small m-0">Mỗi việc tốn: tạo 1 đề AI 1 lượt + chấm bài 1 lượt · học theo cụm 2 · mốc 100 từ 2 · kiểm tra 1 câu tự viết 1 · 3 ngày không dùng sẽ bị xoá khỏi danh sách để nhường chỗ.</p>
        </>}
    </section>
  );
}

export function Admin() {
  useApp();
  const [d, setD] = useState<AdminData | null>(null), [err, setErr] = useState(''), [edit, setEdit] = useState<Record<string, string>>({});
  const reload = () => load().then((x) => {
    if (x && 'users' in x) { setD(x); return; }
    const y = x as (Me & { reason?: string; adminEmailSet?: boolean }) | null;
    setErr(!y ? 'Không kết nối được máy chủ.'
      : !y.enabled ? (y.reason === 'bad_json' ? '❌ Biến FIREBASE_SERVICE_ACCOUNT trên Vercel bị dán sai (không phải JSON hợp lệ). Mở file JSON tải từ Firebase, copy TOÀN BỘ từ { đến }, dán lại rồi Redeploy.'
        : y.reason === 'init_failed' ? '❌ Khoá FIREBASE_SERVICE_ACCOUNT không dùng được (sai dự án hoặc đã bị xoá). Tạo khoá mới trong Firebase, dán lại rồi Redeploy.'
        : '❌ Máy chủ CHƯA có biến FIREBASE_SERVICE_ACCOUNT. Trên Vercel: Settings → Environments → Production → thêm biến (nhớ bấm Save), rồi Deployments → ⋯ → Redeploy.')
      : !y.adminEmailSet ? '❌ Máy chủ chưa có biến ADMIN_EMAIL (email Google của admin). Thêm trên Vercel rồi Redeploy.'
      : !y.login ? '🔐 Hãy đăng nhập Google (⚙️ Cài đặt) bằng email admin.'
      : `Tài khoản ${Cloud.user?.email || ''} không phải admin (khác ADMIN_EMAIL trên Vercel).`);
  });
  useEffect(() => { reload(); }, [Cloud.user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const post = async (body: unknown) => {
    const r = await aiFetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) toast('⚠️ Không thực hiện được'); else { toast('✅ Đã lưu'); reload(); }
  };
  if (err) return <section className="card"><h2 className="m-0">🛡️ Quản lý</h2><p className="muted">{err}</p></section>;
  if (!d) return <section className="card"><p className="muted">Đang tải…</p></section>;
  return (
    <>
      <div className="pagehead"><h2>🛡️ Quản lý lượt AI</h2></div>
      <section className="card">
        <div className="bands4">
          <div className="bandbox"><small>Người học</small><b>{d.users.length}/{d.max}</b></div>
          <div className="bandbox"><small>Đã dùng hôm nay</small><b>{d.usedAll}</b></div>
          <div className="bandbox"><small>Đã cấp cho người học</small><b>{d.reserved}</b></div>
          <div className="bandbox"><small>Phần của admin</small><b>~{d.adminShare}</b></div>
        </div>
        <Bar pct={(d.usedAll / d.totalFree) * 100} h={8} color={d.usedAll / d.totalFree > 0.8 ? 'var(--bad)' : 'var(--pri)'} />
        <p className="muted small m-0">Tổng miễn phí ≈ {d.totalFree} lượt/ngày (Flash 2×20 + Flash Lite 2×500). Ngày {d.day} theo giờ Google (đặt lại lúc 15 giờ VN). Admin hôm nay đã dùng {d.used} lượt. Người {d.idleDays} ngày không dùng tự bị xoá, lượt dồn về admin.</p>
      </section>
      <ExamStock />
      <section className="card">
        <h3 className="m-0">👥 Người học</h3>
        {!d.users.length && <p className="muted small">Chưa có ai. Người đăng nhập và dùng AI lần đầu sẽ tự vào danh sách (tối đa {d.max}).</p>}
        <div className="adm-list">{d.users.map((u) => (
          <div key={u.uid} className="adm-row">
            <div className="flex-1"><b>{u.name}</b> <span className="muted small">{u.email}</span>
              <div className="small">Hôm nay {u.used}/{u.limit} · tổng {u.total} · dùng gần nhất {u.last} · vào từ {u.joined}</div>
              <Bar pct={(u.used / Math.max(1, u.limit)) * 100} h={5} /></div>
            <div className="row gap">
              <input className="ans adm-num" type="number" min={0} max={500} value={edit[u.uid] ?? String(u.limit)} onChange={(e) => setEdit({ ...edit, [u.uid]: e.target.value })} />
              <button className="btn sm" onClick={() => post({ action: 'limit', uid: u.uid, limit: +(edit[u.uid] ?? u.limit) })}>Lưu</button>
              <button className="btn ghost sm" onClick={() => askConfirm({ icon: '🗑️', title: `Xoá ${u.name} khỏi danh sách?`, msg: 'Người này mất chỗ; nếu dùng lại sẽ cần còn chỗ trống.', ok: 'Xoá', cancel: 'Hủy', danger: true }).then((ok) => { if (ok) post({ action: 'remove', uid: u.uid }); })}>Xoá</button>
            </div>
          </div>
        ))}</div>
      </section>
    </>
  );
}

/** Kho đề: mỗi nhóm (tuần 1–12, các mức band sau đó) có bao nhiêu đề; admin soạn thêm cho đủ (mỗi đề 1 lượt của admin) */
function ExamStock() {
  const P = app.P;
  const RM = roadmap(P), groups: { base: string; key: string; label: string }[] = [];
  for (const w of Object.keys(RM).map(Number)) {
    const key = 'w' + w, base = baseOf(key);
    if (base && !groups.some((g) => g.base === base)) groups.push({ base, key, label: w <= 12 ? `Tuần ${w}` : `Band ${RM[w].band} (từ tuần ${w})` });
  }
  const [count, setCount] = useState<Record<string, number>>({}), [busy, setBusy] = useState(''), [stop, setStop] = useState(false), [need, setNeed] = useState(3);
  const cap = (g: { key: string }) => staticIds(g.key).length + 3; // kho chung giữ tối đa 3 đề mỗi nhóm
  const refresh = () => fetch('/api/bank?base=all').then((r) => r.json()).then((d) => setCount(d.count || {})).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const total = (g: { base: string; key: string }) => staticIds(g.key).length + (count[g.base] || 0);
  const one = async (g: { base: string; key: string; label: string }) => {
    setBusy(g.label + ': đang soạn…');
    const id = await generateToPool(g.key, (n) => setBusy(`${g.label}: phần ${n}/3…`));
    if (!id) toast('⚠️ ' + g.label + ': AI bận, chưa soạn được');
    await refresh(); return !!id;
  };
  const fill = async () => {
    setStop(false);
    for (const g of groups) {
      while (total(g) < Math.min(need, cap(g))) {
        if (stopRef.v) { setBusy(''); stopRef.v = false; return; }
        const ok = await one(g); if (!ok) { setBusy(''); return; }
        count[g.base] = (count[g.base] || 0) + 1;
        await new Promise((r) => setTimeout(r, 20000)); // nghỉ giữa các đề để không vượt giới hạn/phút
      }
    }
    setBusy(''); toast('✅ Mọi nhóm đã đủ ' + need + ' đề');
  };
  return (
    <section className="card">
      <h3 className="m-0">📚 Kho đề có sẵn</h3>
      <p className="muted small">Đề soạn sẵn trong app + đề trong kho chung (đề AI ai làm cũng được lưu lại). Người học luôn được giữ sẵn ≥ 1 đề chưa làm: khi mở đề cuối, app tự soạn đề tiếp theo. Kho chung giữ <b>tối đa 3 đề mỗi nhóm</b> (đề mới thay đề cũ nhất) để database không quá tải. Bấm dưới đây để soạn trước cho mọi tuần (mỗi đề tốn 1 lượt của admin).</p>
      <div className="row gap wrap">
        <span className="small">Mỗi nhóm ít nhất</span><input className="ans adm-num" type="number" min={1} max={10} value={need} onChange={(e) => setNeed(Math.max(1, Math.min(6, +e.target.value || 3)))} /><span className="small">đề</span>
        {busy ? <button className="btn ghost" onClick={() => { stopRef.v = true; setStop(true); }}>{stop ? 'Đang dừng…' : '⏹ Dừng'}</button>
          : <button className="btn" onClick={fill}>🤖 Soạn cho đủ mọi nhóm</button>}
        {busy && <span className="small"><span className="spin" /> {busy}</span>}
      </div>
      <div className="stock">{groups.map((g) => { const t = total(g); return (
        <div key={g.base} className={'stock-i ' + (t >= need ? 'ok' : 'low')}>
          <b>{g.label}</b><span>{t} đề</span>
          <button className="btn ghost sm" disabled={!!busy} onClick={() => one(g).then(() => setBusy(''))}>+1</button>
        </div>); })}</div>
    </section>
  );
}
const stopRef = { v: false };
