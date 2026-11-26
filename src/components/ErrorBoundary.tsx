// Bắt lỗi khi vẽ một trang: hiện hộp báo lỗi + nút tải lại, thay vì cả app thành màn hình đen.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; k?: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidUpdate(prev: { k?: string }) { if (prev.k !== this.props.k && this.state.err) this.setState({ err: null }); }
  render() {
    const e = this.state.err;
    if (!e) return this.props.children;
    const stale = /dynamically imported module|Failed to fetch|Importing a module script failed|MIME type|reading 'default'/i.test(e.message);
    return (
      <section className="card center">
        <div className="huge">{stale ? '🔄' : '⚠️'}</div>
        <h3>{stale ? 'App vừa có bản mới' : 'Trang này gặp lỗi'}</h3>
        <p className="muted small">{stale ? 'Bấm tải lại để dùng bản mới nhất.' : e.message}</p>
        <button className="btn" onClick={() => location.reload()}>🔄 Tải lại trang</button>
      </section>
    );
  }
}
