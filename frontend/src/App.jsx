import { useCallback, useEffect, useState } from 'react';
import { api, queryString } from './api';
import { useAuth } from './AuthContext';
import { Badge, Empty, Loading, Notice, Pagination, formatDate } from './components';

const roles = ['ADMIN', 'MANAGER', 'USER'];
const campaignStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const eventSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const eventStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

function useRequest(path) {
  const { session, logout } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await api(path, { token: session.accessToken });
      setState({ loading: false, error: '', data });
    } catch (error) {
      if (error.message.includes('expired') || error.message.includes('Authentication')) logout();
      setState({ loading: false, error: error.message, data: null });
    }
  }, [path, session.accessToken, logout]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

function canManage(role) { return role === 'ADMIN' || role === 'MANAGER'; }

export default function App() {
  const { session, checking, logout } = useAuth();
  const [page, setPage] = useState('dashboard');
  if (checking) return <div className="app-center"><Loading label="Restoring secure session" /></div>;
  if (!session) return <Login />;
  const { user } = session;
  const nav = [
    ['dashboard', 'Dashboard'], ['campaigns', 'Campaigns'], ['events', 'Security events'],
    ...(canManage(user.role) ? [['users', 'Users']] : []),
    ...(user.role === 'ADMIN' ? [['audit', 'Audit log']] : [])
  ];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">◈</span><span>DEEP TRACE<small>SECURITY COMMAND</small></span></div>
      <nav>{nav.map(([id, label]) => <button key={id} onClick={() => setPage(id)} className={page === id ? 'nav-active' : ''}>{label}</button>)}</nav>
      <div className="sidebar-footer"><div><strong>{user.displayName}</strong><small>{user.tenantName}</small></div><Badge>{user.role}</Badge><button className="signout" onClick={logout}>Sign out</button></div>
    </aside>
    <main className="main"><header className="topbar"><div><p className="eyebrow">{user.tenantName}</p><h1>{nav.find(([id]) => id === page)?.[1]}</h1></div><div className="secure-indicator"><span /> Tenant isolation active</div></header>
      {page === 'dashboard' && <Dashboard />}
      {page === 'campaigns' && <Campaigns />}
      {page === 'events' && <Events />}
      {page === 'users' && <Users />}
      {page === 'audit' && <Audit />}
    </main>
  </div>;
}

function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ tenantSlug: 'apex-sentinel', email: 'admin@apex.test', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { login(await api('/api/auth/login', { method: 'POST', body: form })); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="login-page"><div className="login-panel"><div className="brand login-brand"><span className="brand-mark">◈</span><span>DEEP TRACE<small>SECURITY COMMAND</small></span></div><h1>Tenant sign in</h1><p className="muted">Access your organization’s security workspace.</p><form onSubmit={submit} className="form-stack"><label>Tenant slug<input required value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} placeholder="apex-sentinel" /></label><label>Work email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><Notice error={error} /><button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button></form><p className="login-help">Development account: <code>admin@apex.test</code></p></div></div>;
}

function Dashboard() {
  const { data, loading, error } = useRequest('/api/dashboard');
  if (loading) return <Loading />;
  if (error) return <Notice error={error} />;
  const metrics = data.metrics;
  return <section><div className="metrics">
    <Metric label="Active users" value={metrics.users} hint="within this tenant" />
    <Metric label="Campaigns" value={metrics.campaigns} hint="all statuses" />
    <Metric label="Open events" value={metrics.open_events} hint="requires attention" />
    <Metric label="Critical events" value={metrics.critical_events} hint="open or investigating" danger />
  </div><section className="panel"><div className="section-heading"><div><p className="eyebrow">Traceability</p><h2>Recent activity</h2></div></div>{data.recentActivity.length ? <div className="activity-list">{data.recentActivity.map((item) => <div className="activity" key={item.id}><span className="activity-dot" /><div><strong>{item.action.replaceAll('_', ' ')}</strong><p>{item.actor_name || 'System'} · {item.entity_type.replaceAll('_', ' ')}</p></div><time>{formatDate(item.created_at)}</time></div>)}</div> : <Empty>No recorded activity yet.</Empty>}</section></section>;
}

function Metric({ label, value, hint, danger }) { return <article className={`metric ${danger ? 'metric-danger' : ''}`}><p>{label}</p><strong>{value}</strong><small>{hint}</small></article>; }

function Campaigns() {
  const { session } = useAuth();
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const path = `/api/campaigns${queryString({ search: filters.search, status: filters.status, page: filters.page, pageSize: 10 })}`;
  const list = useRequest(path);
  const manage = canManage(session.user.role);
  return <section className="page-grid"><div className="panel span-full"><div className="section-heading"><div><p className="eyebrow">Campaign management</p><h2>Campaigns</h2></div>{manage && <button className="button primary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Close form' : 'New campaign'}</button>}</div>{showNew && <CampaignForm onDone={() => { setShowNew(false); list.reload(); }} />}
    <div className="filters"><input aria-label="Search campaigns" placeholder="Search campaigns" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} /><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}><option value="">All statuses</option>{campaignStatuses.map((item) => <option key={item}>{item}</option>)}</select></div>
    {list.loading ? <Loading /> : list.error ? <Notice error={list.error} /> : <><CampaignTable rows={list.data.data} onOpen={setSelectedId} /><Pagination pagination={list.data.pagination} onChange={(page) => setFilters({ ...filters, page })} /></>}</div>
    {selectedId && <CampaignDetail id={selectedId} onClose={() => setSelectedId(null)} onChanged={list.reload} />}
  </section>;
}

function CampaignTable({ rows, onOpen }) { return rows.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Assignees</th><th>Updated</th><th /></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description || 'No description'}</small></td><td><Badge>{item.status}</Badge></td><td>{item.assignee_count}</td><td>{formatDate(item.updated_at)}</td><td><button className="button ghost small" onClick={() => onOpen(item.id)}>Open</button></td></tr>)}</tbody></table></div> : <Empty>No campaigns match these filters.</Empty>; }

function CampaignForm({ onDone }) {
  const { session } = useAuth();
  const [form, setForm] = useState({ name: '', description: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await api('/api/campaigns', { token: session.accessToken, method: 'POST', body: form }); onDone(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  return <form className="inline-form" onSubmit={submit}><label>Name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="wide">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button className="button primary" disabled={busy}>Create draft</button><Notice error={error} /></form>;
}

function CampaignDetail({ id, onClose, onChanged }) {
  const { session } = useAuth(); const detail = useRequest(`/api/campaigns/${id}`); const manage = canManage(session.user.role);
  const users = useRequest(manage ? '/api/users?pageSize=100' : '/api/users/me');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (detail.loading) return <aside className="panel detail"><Loading /> </aside>;
  if (detail.error) return <aside className="panel detail"><Notice error={detail.error} /><button className="button ghost" onClick={onClose}>Close</button></aside>;
  const campaign = detail.data.data;
  async function changeStatus(status) { setBusy(true); setError(''); try { await api(`/api/campaigns/${id}`, { token: session.accessToken, method: 'PATCH', body: { status } }); await detail.reload(); onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function addAssignee(event) { event.preventDefault(); const userId = new FormData(event.currentTarget).get('userId'); if (!userId) return; setBusy(true); setError(''); try { await api(`/api/campaigns/${id}/assignees`, { token: session.accessToken, method: 'POST', body: { userId: Number(userId) } }); await detail.reload(); onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function removeAssignee(userId) { setBusy(true); setError(''); try { await api(`/api/campaigns/${id}/assignees/${userId}`, { token: session.accessToken, method: 'DELETE' }); await detail.reload(); onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function deleteCampaign() { if (!window.confirm('Delete this campaign? This cannot be undone.')) return; setBusy(true); try { await api(`/api/campaigns/${id}`, { token: session.accessToken, method: 'DELETE' }); onChanged(); onClose(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  const nextStatuses = { DRAFT: ['ACTIVE', 'CANCELLED'], ACTIVE: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] }[campaign.status];
  return <aside className="panel detail"><button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">Campaign #{campaign.id}</p><h2>{campaign.name}</h2><p className="detail-description">{campaign.description || 'No description provided.'}</p><div className="detail-row"><span>Current status</span><Badge>{campaign.status}</Badge></div>{manage && nextStatuses.length > 0 && <div className="button-row">{nextStatuses.map((status) => <button className="button ghost small" disabled={busy} onClick={() => changeStatus(status)} key={status}>Mark {status}</button>)}</div>}<h3>Assignees</h3>{campaign.assignees.length ? <div className="assignees">{campaign.assignees.map((user) => <div key={user.id}><span><strong>{user.displayName}</strong><small>{user.email} · {user.role}</small></span>{manage && <button className="text-danger" disabled={busy} onClick={() => removeAssignee(user.id)}>Remove</button>}</div>)}</div> : <Empty>No users assigned.</Empty>}{manage && <form className="assign-form" onSubmit={addAssignee}><select name="userId" required defaultValue=""><option value="" disabled>Assign a user</option>{users.data?.data?.map((user) => <option key={user.id} value={user.id}>{user.display_name} — {user.role}</option>)}</select><button className="button ghost" disabled={busy || users.loading}>Assign</button></form>}<Notice error={error} />{manage && <button className="button danger full" disabled={busy} onClick={deleteCampaign}>Delete campaign</button>}</aside>;
}

function Events() {
  const { session } = useAuth(); const manage = canManage(session.user.role);
  const [filters, setFilters] = useState({ severity: '', status: '', search: '', page: 1 }); const [showNew, setShowNew] = useState(false);
  const list = useRequest(`/api/security-events${queryString({ ...filters, pageSize: 10 })}`);
  return <section className="panel"><div className="section-heading"><div><p className="eyebrow">Detection queue</p><h2>Security events</h2></div>{manage && <button className="button primary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Close form' : 'Record event'}</button>}</div>{showNew && <EventForm onDone={() => { setShowNew(false); list.reload(); }} />}
  <div className="filters"><input placeholder="Search events" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}/><select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value, page: 1 })}><option value="">All severities</option>{eventSeverities.map((value) => <option key={value}>{value}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}><option value="">All states</option>{eventStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
  {list.loading ? <Loading /> : list.error ? <Notice error={list.error} /> : <><EventsTable rows={list.data.data} editable={manage} onChanged={list.reload} /><Pagination pagination={list.data.pagination} onChange={(page) => setFilters({ ...filters, page })} /></>}</section>;
}

function EventForm({ onDone }) { const { session } = useAuth(); const [form, setForm] = useState({ eventType: '', severity: 'MEDIUM', status: 'OPEN', description: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); async function submit(event) { event.preventDefault(); setBusy(true); try { await api('/api/security-events', { token: session.accessToken, method: 'POST', body: form }); onDone(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } } return <form className="inline-form event-form" onSubmit={submit}><label>Type<input required value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} /></label><label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{eventSeverities.map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{eventStatuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className="wide">Description<input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button className="button primary" disabled={busy}>Save event</button><Notice error={error} /></form>; }

function EventsTable({ rows, editable, onChanged }) { const { session } = useAuth(); const [error, setError] = useState(''); async function changeStatus(id, status) { try { await api(`/api/security-events/${id}`, { token: session.accessToken, method: 'PATCH', body: { status } }); onChanged(); } catch (failure) { setError(failure.message); } } return <>{error && <Notice error={error} />}{rows.length ? <div className="table-wrap"><table><thead><tr><th>Event</th><th>Severity</th><th>Status</th><th>Occurred</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.event_type}</strong><small>{item.description}</small></td><td><Badge>{item.severity}</Badge></td><td>{editable ? <select className="table-select" value={item.status} onChange={(e) => changeStatus(item.id, e.target.value)}>{eventStatuses.map((value) => <option key={value}>{value}</option>)}</select> : <Badge>{item.status}</Badge>}</td><td>{formatDate(item.occurred_at)}</td></tr>)}</tbody></table></div> : <Empty>No security events match these filters.</Empty>}</>; }

function Users() {
  const { session } = useAuth(); const admin = session.user.role === 'ADMIN'; const [filters, setFilters] = useState({ search: '', role: '', page: 1 }); const [showNew, setShowNew] = useState(false); const list = useRequest(`/api/users${queryString({ ...filters, pageSize: 10 })}`);
  return <section className="panel"><div className="section-heading"><div><p className="eyebrow">Tenant directory</p><h2>Users & roles</h2></div>{admin && <button className="button primary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Close form' : 'Add user'}</button>}</div>{showNew && <UserForm onDone={() => { setShowNew(false); list.reload(); }} />}
  <div className="filters"><input placeholder="Search users" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}/><select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}><option value="">All roles</option>{roles.map((value) => <option key={value}>{value}</option>)}</select></div>{list.loading ? <Loading /> : list.error ? <Notice error={list.error} /> : <><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Account</th><th>Added</th></tr></thead><tbody>{list.data.data.map((user) => <tr key={user.id}><td><strong>{user.display_name}</strong><small>{user.email}</small></td><td><Badge>{user.role}</Badge></td><td><Badge tone={user.is_active ? 'active' : 'cancelled'}>{user.is_active ? 'Active' : 'Inactive'}</Badge></td><td>{formatDate(user.created_at)}</td></tr>)}</tbody></table></div><Pagination pagination={list.data.pagination} onChange={(page) => setFilters({ ...filters, page })} /></>}</section>;
}

function UserForm({ onDone }) { const { session } = useAuth(); const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'USER' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); async function submit(event) { event.preventDefault(); setBusy(true); try { await api('/api/users', { token: session.accessToken, method: 'POST', body: form }); onDone(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } } return <form className="inline-form user-form" onSubmit={submit}><label>Name<input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Temporary password<input required type="password" minLength="10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((value) => <option key={value}>{value}</option>)}</select></label><button className="button primary" disabled={busy}>Create user</button><Notice error={error} /></form>; }

function Audit() { const [page, setPage] = useState(1); const list = useRequest(`/api/audit-logs?page=${page}&pageSize=15`); return <section className="panel"><div className="section-heading"><div><p className="eyebrow">Administrative trace</p><h2>Audit log</h2></div></div>{list.loading ? <Loading /> : list.error ? <Notice error={list.error} /> : list.data.data.length ? <><div className="table-wrap"><table><thead><tr><th>Action</th><th>Actor</th><th>Resource</th><th>Time</th></tr></thead><tbody>{list.data.data.map((item) => <tr key={item.id}><td><code>{item.action}</code></td><td>{item.actor_name || 'System'}<small>{item.actor_email || ''}</small></td><td>{item.entity_type} {item.entity_id ? `#${item.entity_id}` : ''}</td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div><Pagination pagination={list.data.pagination} onChange={setPage} /></> : <Empty>No audit entries yet.</Empty>}</section>; }

