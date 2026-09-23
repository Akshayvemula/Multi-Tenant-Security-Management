export function Loading({ label = 'Loading' }) {
  return <div className="loading"><span className="spinner" />{label}…</div>;
}

export function Notice({ error, success }) {
  if (!error && !success) return null;
  return <div className={`notice ${error ? 'notice-error' : 'notice-success'}`}>{error || success}</div>;
}

export function Badge({ children, tone }) {
  return <span className={`badge badge-${tone || String(children).toLowerCase()}`}>{String(children).replaceAll('_', ' ')}</span>;
}

export function Pagination({ pagination, onChange }) {
  if (!pagination) return null;
  return <div className="pagination">
    <span>{pagination.total} total</span>
    <div>
      <button className="button ghost" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>Previous</button>
      <span className="page-current">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
      <button className="button ghost" disabled={pagination.page >= pagination.totalPages} onClick={() => onChange(pagination.page + 1)}>Next</button>
    </div>
  </div>;
}

export function Empty({ children = 'No records found.' }) {
  return <div className="empty">{children}</div>;
}

export function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}

