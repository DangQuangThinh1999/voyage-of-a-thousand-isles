import { useApp } from '../state/store';

/** Thông báo nhỏ hiện ở cuối màn hình */
export function Toast() {
  const { toast } = useApp();
  return <div id="toast" className={toast.show ? 'toast show' : 'toast'} role="status">{toast.msg}</div>;
}
