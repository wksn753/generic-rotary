'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

import type {
  AttendanceRecord,
  AttendanceResponse,
  ClubGoal,
  ClubMember,
  Donation,
  EmailCampaign,
  OperationsDashboard,
  ProjectSummary,
} from '../lib/definitions';

const ADMIN_SESSION_STORAGE_KEY = 'kitendeAdminSession';
const PAGE_SIZE = 10;

type AdminTab = 'overview' | 'attendance' | 'members' | 'donations' | 'goals' | 'projects' | 'communications';

type ApiResult<T = Record<string, unknown>> = T & {
  success: boolean;
  message?: string;
  code?: string;
};

function getStoredAdminToken() {
  if (typeof window === 'undefined') return '';
  try { return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || ''; } catch { return ''; }
}

function clearStoredAdminToken() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY); } catch { /* storage may be blocked */ }
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = getStoredAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function todayInKampalaISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function displayDate(value?: string) {
  if (!value) return '—';
  const parsed = new Date(`${value}T12:00:00+03:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function displayDateTime(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-UG', {
    timeZone: 'Africa/Kampala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(parsed);
}

function displayTime(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-UG', { timeZone: 'Africa/Kampala', hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function recordTime(record: AttendanceRecord) {
  return record.submittedAt || record.CreatedAt || record.createdAt;
}

function money(value: number, currency = 'UGX') {
  try {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency, maximumFractionDigits: currency === 'UGX' ? 0 : 2 }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toLocaleString()}`;
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCSV(records: AttendanceRecord[], selectedDate: string) {
  const headers = ['No', 'Date', 'Time', 'Name', 'Phone', 'Email', 'Rotary Club', 'Buddy Group', 'Classification', 'Purpose', 'Event', 'Source'];
  const rows = records.map((record, index) => [
    index + 1,
    record.attendanceDate || selectedDate,
    displayTime(recordTime(record)),
    record.fullName,
    record.phone,
    record.email,
    record.rotaryClub,
    record.buddyGroup || '',
    record.classification,
    record.purpose,
    record.event,
    record.checkInSource,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export default function AdminAttendanceClient() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [date, setDate] = useState(todayInKampalaISO());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationTotal, setDonationTotal] = useState(0);
  const [goals, setGoals] = useState<ClubGoal[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [attendanceQuery, setAttendanceQuery] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);
  const [memberQuery, setMemberQuery] = useState('');

  const [memberForm, setMemberForm] = useState({ fullName: '', phone: '', email: '', rotaryClub: '', buddyGroup: '', classification: 'Member' });
  const [donationForm, setDonationForm] = useState({ attendanceDate: todayInKampalaISO(), donorName: '', donorEmail: '', donorPhone: '', amount: '', paymentMethod: 'Cash', reference: '', notes: '' });
  const [goalForm, setGoalForm] = useState({ title: '', description: '', metric: 'Attendance', targetValue: '', currentValue: '0', unit: 'people', startDate: todayInKampalaISO(), dueDate: '', status: 'active' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'planned', startDate: todayInKampalaISO(), endDate: '', budget: '', currency: 'UGX' });
  const [transactionForm, setTransactionForm] = useState({ projectId: '', type: 'expense', amount: '', category: '', description: '', transactionDate: todayInKampalaISO(), reference: '' });
  const [invoiceForm, setInvoiceForm] = useState({ projectId: '', invoiceNumber: '', vendor: '', customer: '', description: '', amount: '', currency: 'UGX', status: 'unpaid', issueDate: todayInKampalaISO(), dueDate: '', fileUrl: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', audience: 'members', subject: '', body: '', attendanceDate: todayInKampalaISO(), scheduledAt: '' });

  async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...getAdminAuthHeaders(),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
      credentials: 'same-origin',
      cache: 'no-store',
    });

    let data: ApiResult<T>;
    try { data = (await response.json()) as ApiResult<T>; } catch { data = { success: false, message: 'Unreadable server response.' } as ApiResult<T>; }

    if (response.status === 401 && data.code === 'UNAUTHORIZED') {
      clearStoredAdminToken();
      window.location.replace('/admin/login');
      throw new Error('Admin session expired.');
    }
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data;
  }

  async function loadAttendance(selectedDate = date) {
    const data = await adminFetch<AttendanceResponse>(`/api/admin/attendance?date=${encodeURIComponent(selectedDate)}`);
    setRecords(data.records || []);
    setAttendancePage(1);
  }

  async function loadOperations(selectedDate = date) {
    const [dashData, memberData, donationData, goalData, projectData, campaignData] = await Promise.all([
      adminFetch<{ dashboard: OperationsDashboard }>('/api/admin/ops/dashboard'),
      adminFetch<{ members: ClubMember[] }>('/api/admin/ops/members'),
      adminFetch<{ donations: Donation[]; total: number }>(`/api/admin/ops/donations?date=${encodeURIComponent(selectedDate)}`),
      adminFetch<{ goals: ClubGoal[] }>('/api/admin/ops/goals'),
      adminFetch<{ projects: ProjectSummary[] }>('/api/admin/ops/projects'),
      adminFetch<{ campaigns: EmailCampaign[] }>('/api/admin/ops/campaigns'),
    ]);
    setDashboard(dashData.dashboard);
    setMembers(memberData.members || []);
    setDonations(donationData.donations || []);
    setDonationTotal(donationData.total || 0);
    setGoals(goalData.goals || []);
    setProjects(projectData.projects || []);
    setCampaigns(campaignData.campaigns || []);
  }

  async function refreshAll(selectedDate = date) {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadAttendance(selectedDate), loadOperations(selectedDate)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the admin workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshAll(date); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filteredAttendance = useMemo(() => {
    const query = attendanceQuery.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => [record.fullName, record.phone, record.email, record.rotaryClub, record.buddyGroup, record.classification, record.purpose, record.event].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [records, attendanceQuery]);

  const attendancePages = Math.max(1, Math.ceil(filteredAttendance.length / PAGE_SIZE));
  const safeAttendancePage = Math.min(attendancePage, attendancePages);
  const attendanceRows = filteredAttendance.slice((safeAttendancePage - 1) * PAGE_SIZE, safeAttendancePage * PAGE_SIZE);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => [member.fullName, member.email, member.phone, member.rotaryClub, member.buddyGroup, member.classification].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [members, memberQuery]);

  async function withAction(action: () => Promise<void>, successMessage: string) {
    setActionLoading(true); setError(''); setFlash('');
    try {
      await action();
      setFlash(successMessage);
      await loadOperations(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function submitMember(event: FormEvent) {
    event.preventDefault();
    await withAction(async () => {
      await adminFetch('/api/admin/ops/members', { method: 'POST', body: JSON.stringify(memberForm) });
      setMemberForm({ fullName: '', phone: '', email: '', rotaryClub: '', buddyGroup: '', classification: 'Member' });
    }, 'Member added to the club roster.');
  }

  async function submitDonation(event: FormEvent) {
    event.preventDefault();
    await withAction(async () => {
      await adminFetch('/api/admin/ops/donations', { method: 'POST', body: JSON.stringify({ ...donationForm, amount: Number(donationForm.amount), currency: 'UGX', recordedBy: 'Admin' }) });
      setDonationForm((current) => ({ ...current, donorName: '', donorEmail: '', donorPhone: '', amount: '', reference: '', notes: '' }));
    }, 'Donation recorded.');
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    await withAction(async () => {
      await adminFetch('/api/admin/ops/goals', { method: 'POST', body: JSON.stringify({ ...goalForm, targetValue: Number(goalForm.targetValue), currentValue: Number(goalForm.currentValue) }) });
      setGoalForm({ title: '', description: '', metric: 'Attendance', targetValue: '', currentValue: '0', unit: 'people', startDate: todayInKampalaISO(), dueDate: '', status: 'active' });
    }, 'Club goal created.');
  }

  async function updateGoal(goal: ClubGoal, currentValue: number, status = goal.status) {
    await withAction(async () => {
      await adminFetch(`/api/admin/ops/goals/${goal.ID}`, { method: 'PATCH', body: JSON.stringify({ currentValue, status }) });
    }, 'Goal progress updated.');
  }

  async function submitProject(event: FormEvent) {
    event.preventDefault();
    await withAction(async () => {
      await adminFetch('/api/admin/ops/projects', { method: 'POST', body: JSON.stringify({ ...projectForm, budget: Number(projectForm.budget || 0) }) });
      setProjectForm({ name: '', description: '', status: 'planned', startDate: todayInKampalaISO(), endDate: '', budget: '', currency: 'UGX' });
    }, 'Rotary project created.');
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    if (!transactionForm.projectId) return;
    await withAction(async () => {
      await adminFetch(`/api/admin/ops/projects/${transactionForm.projectId}/transactions`, { method: 'POST', body: JSON.stringify({ ...transactionForm, amount: Number(transactionForm.amount), projectId: undefined, currency: 'UGX', recordedBy: 'Admin' }) });
      setTransactionForm((current) => ({ ...current, amount: '', category: '', description: '', reference: '' }));
    }, 'Project finance transaction recorded.');
  }

  async function submitInvoice(event: FormEvent) {
    event.preventDefault();
    if (!invoiceForm.projectId) return;
    await withAction(async () => {
      await adminFetch(`/api/admin/ops/projects/${invoiceForm.projectId}/invoices`, { method: 'POST', body: JSON.stringify({ ...invoiceForm, amount: Number(invoiceForm.amount), projectId: undefined }) });
      setInvoiceForm((current) => ({ ...current, invoiceNumber: '', vendor: '', customer: '', description: '', amount: '', dueDate: '', fileUrl: '' }));
    }, 'Project invoice recorded.');
  }

  async function submitCampaign(event: FormEvent) {
    event.preventDefault();
    await withAction(async () => {
      const scheduledAt = campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : new Date().toISOString();
      await adminFetch('/api/admin/ops/campaigns', { method: 'POST', body: JSON.stringify({ ...campaignForm, scheduledAt, createdBy: 'Admin' }) });
      setCampaignForm((current) => ({ ...current, name: '', subject: '', body: '', scheduledAt: '' }));
    }, 'Email campaign queued on the Go backend.');
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', headers: getAdminAuthHeaders(), credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    clearStoredAdminToken();
    window.location.replace('/admin/login');
  }

  function downloadCSV() {
    const csv = buildCSV(filteredAttendance, date);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `rotary-attendance-${date}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  const bestBuddy = dashboard?.buddyGroups?.[0];
  const topAttendee = dashboard?.topAttendees?.[0];

  return (
    <main className="admin-page ops-admin-page">
      <div className="admin-shell ops-shell">
        <div className="admin-topbar ops-topbar">
          <div className="admin-brand"><div><span>Rotary club</span><strong>Operations</strong></div></div>
          <div className="admin-actions">
            <Link className="admin-back" href="/">Check-in</Link>
            <button className="admin-logout" type="button" onClick={logout}>Sign out</button>
          </div>
        </div>

        <nav className="ops-tabs" aria-label="Admin sections">
          {(['overview', 'attendance', 'members', 'donations', 'goals', 'projects', 'communications'] as AdminTab[]).map((item) => (
            <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
          ))}
        </nav>

        {error && <p className="admin-error ops-message">{error}</p>}
        {flash && <p className="ops-success ops-message">{flash}</p>}

        {tab === 'overview' && (
          <>
            <section className="ops-hero">
              <div><p>Club control centre</p><h1>See what is moving the club forward.</h1><span>Attendance, members, buddy groups, giving, goals, projects and communications in one place.</span></div>
              <button type="button" onClick={() => refreshAll(date)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh data'}</button>
            </section>

            <section className="ops-metric-grid">
              <Metric label="Active members" value={dashboard?.activeMembers ?? 0} sub={`${dashboard?.totalMembers ?? 0} rostered`} />
              <Metric label="Total attendance" value={dashboard?.totalAttendance ?? 0} sub={`${dashboard?.uniqueAttendees ?? 0} unique people`} />
              <Metric label="Visitor check-ins" value={dashboard?.visitorAttendance ?? 0} sub="Auto thank-you enabled" />
              <Metric label="Donations" value={money(dashboard?.totalDonations ?? 0, dashboard?.donationCurrency || 'UGX')} sub="Recorded contributions" />
              <Metric label="Active goals" value={dashboard?.activeGoals ?? 0} sub="With timelines" />
              <Metric label="Active projects" value={dashboard?.activeProjects ?? 0} sub={`${dashboard?.pendingMailJobs ?? 0} email jobs pending`} />
            </section>

            <section className="ops-two-column">
              <div className="ops-panel">
                <header><div><span>Attendance leaders</span><strong>Most consistent attendees</strong></div>{topAttendee && <em>{topAttendee.name} leads</em>}</header>
                <div className="ops-ranking-list">
                  {(dashboard?.topAttendees || []).slice(0, 8).map((person, index) => (
                    <div key={`${person.email}-${person.phone}-${person.name}`}><b>{index + 1}</b><span><strong>{person.name}</strong><small>{person.buddyGroup || person.rotaryClub || 'No group'}</small></span><em>{person.attendanceCount}</em></div>
                  ))}
                  {!dashboard?.topAttendees?.length && <Empty text="Attendance rankings appear after check-ins." />}
                </div>
              </div>

              <div className="ops-panel">
                <header><div><span>Buddy group performance</span><strong>Best performing groups</strong></div>{bestBuddy && <em>{bestBuddy.name} leads</em>}</header>
                <div className="ops-ranking-list">
                  {(dashboard?.buddyGroups || []).slice(0, 8).map((group, index) => (
                    <div key={group.name}><b>{index + 1}</b><span><strong>{group.name}</strong><small>{group.uniquePeople} unique people</small></span><em>{group.attendanceCount}</em></div>
                  ))}
                  {!dashboard?.buddyGroups?.length && <Empty text="Buddy group rankings appear after grouped attendance." />}
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'attendance' && (
          <section className="ops-panel ops-wide-panel">
            <header className="ops-section-heading"><div><span>Attendance</span><strong>{displayDate(date)}</strong></div><em>{records.length} check-ins</em></header>
            <div className="ops-toolbar">
              <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="grow">Search<input type="search" value={attendanceQuery} onChange={(event) => { setAttendanceQuery(event.target.value); setAttendancePage(1); }} placeholder="Name, club, buddy group, email..." /></label>
              <button type="button" onClick={() => refreshAll(date)} disabled={loading}>View day</button>
              <button type="button" className="secondary" onClick={downloadCSV} disabled={!filteredAttendance.length}>CSV</button>
            </div>
            <DataTable headers={['Guest', 'Contact', 'Club / group', 'Purpose', 'Time']}>
              {attendanceRows.map((record) => (
                <tr key={record.ID || record.id || `${record.email}-${record.submittedAt}`}>
                  <td><strong>{record.fullName}</strong><small>{record.classification || 'Guest'}</small></td>
                  <td>{record.phone || '—'}<small>{record.email || 'No email'}</small></td>
                  <td>{record.baseRotaryClub || record.rotaryClub}<small>{record.buddyGroup || 'No buddy group'}</small></td>
                  <td>{record.purpose || 'Fellowship'}<small>{record.event}</small></td>
                  <td>{displayTime(recordTime(record))}</td>
                </tr>
              ))}
            </DataTable>
            {!attendanceRows.length && <Empty text="No attendance records match this view." />}
            <Pager page={safeAttendancePage} total={attendancePages} onChange={setAttendancePage} />
          </section>
        )}

        {tab === 'members' && (
          <section className="ops-split-layout">
            <form className="ops-form-card" onSubmit={submitMember}>
              <FormHeading eyebrow="Member roster" title="Add a club member" copy="Members attending under the home club are also refreshed automatically from attendance." />
              <Input label="Full name" required value={memberForm.fullName} onChange={(value) => setMemberForm({ ...memberForm, fullName: value })} />
              <Input label="Email" type="email" value={memberForm.email} onChange={(value) => setMemberForm({ ...memberForm, email: value })} />
              <Input label="Phone" value={memberForm.phone} onChange={(value) => setMemberForm({ ...memberForm, phone: value })} />
              <Input label="Rotary club" value={memberForm.rotaryClub} onChange={(value) => setMemberForm({ ...memberForm, rotaryClub: value })} />
              <Input label="Buddy group" value={memberForm.buddyGroup} onChange={(value) => setMemberForm({ ...memberForm, buddyGroup: value.toUpperCase() })} />
              <Input label="Classification" value={memberForm.classification} onChange={(value) => setMemberForm({ ...memberForm, classification: value })} />
              <SubmitButton loading={actionLoading}>Add member</SubmitButton>
            </form>

            <div className="ops-panel">
              <header className="ops-section-heading"><div><span>Club members</span><strong>{members.length} people</strong></div></header>
              <div className="ops-inline-search"><input type="search" value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Search members..." /></div>
              <DataTable headers={['Member', 'Contact', 'Buddy group', 'Last seen']}>
                {filteredMembers.map((member) => (
                  <tr key={member.ID}><td><strong>{member.fullName}</strong><small>{member.classification || 'Member'}</small></td><td>{member.phone || '—'}<small>{member.email || 'No email'}</small></td><td>{member.buddyGroup || '—'}</td><td>{displayDateTime(member.lastSeenAt)}</td></tr>
                ))}
              </DataTable>
              {!filteredMembers.length && <Empty text="No club members match this view." />}
            </div>
          </section>
        )}

        {tab === 'donations' && (
          <section className="ops-split-layout">
            <form className="ops-form-card" onSubmit={submitDonation}>
              <FormHeading eyebrow="Fellowship giving" title="Record a donation" copy="Capture contributions at the end of meetings and keep a searchable club record." />
              <Input label="Meeting date" type="date" required value={donationForm.attendanceDate} onChange={(value) => setDonationForm({ ...donationForm, attendanceDate: value })} />
              <Input label="Donor name" required value={donationForm.donorName} onChange={(value) => setDonationForm({ ...donationForm, donorName: value })} />
              <Input label="Amount (UGX)" type="number" required value={donationForm.amount} onChange={(value) => setDonationForm({ ...donationForm, amount: value })} />
              <Select label="Payment method" value={donationForm.paymentMethod} onChange={(value) => setDonationForm({ ...donationForm, paymentMethod: value })} options={['Cash', 'Mobile Money', 'Bank', 'Card', 'Other']} />
              <Input label="Reference" value={donationForm.reference} onChange={(value) => setDonationForm({ ...donationForm, reference: value })} />
              <Input label="Donor email" type="email" value={donationForm.donorEmail} onChange={(value) => setDonationForm({ ...donationForm, donorEmail: value })} />
              <Input label="Donor phone" type="tel" value={donationForm.donorPhone} onChange={(value) => setDonationForm({ ...donationForm, donorPhone: value })} />
              <Textarea label="Notes" value={donationForm.notes} onChange={(value) => setDonationForm({ ...donationForm, notes: value })} />
              <SubmitButton loading={actionLoading}>Record donation</SubmitButton>
            </form>

            <div className="ops-panel">
              <header className="ops-section-heading"><div><span>Meeting donations</span><strong>{money(donationTotal)}</strong></div><em>{displayDate(date)}</em></header>
              <DataTable headers={['Donor', 'Amount', 'Method', 'Reference']}>
                {donations.map((donation) => <tr key={donation.ID}><td><strong>{donation.donorName}</strong><small>{donation.donorEmail || donation.donorPhone || displayDate(donation.attendanceDate)}</small></td><td>{money(donation.amount, donation.currency)}</td><td>{donation.paymentMethod || '—'}</td><td>{donation.reference || '—'}</td></tr>)}
              </DataTable>
              {!donations.length && <Empty text="No donations recorded for this meeting date." />}
            </div>
          </section>
        )}

        {tab === 'goals' && (
          <section className="ops-split-layout">
            <form className="ops-form-card" onSubmit={submitGoal}>
              <FormHeading eyebrow="Club goals" title="Set a measurable goal" copy="Give every goal a target and a deadline so the club can see progress over time." />
              <Input label="Goal title" required value={goalForm.title} onChange={(value) => setGoalForm({ ...goalForm, title: value })} />
              <Textarea label="Description" value={goalForm.description} onChange={(value) => setGoalForm({ ...goalForm, description: value })} />
              <Input label="Metric" value={goalForm.metric} onChange={(value) => setGoalForm({ ...goalForm, metric: value })} />
              <div className="ops-form-row"><Input label="Target" type="number" required value={goalForm.targetValue} onChange={(value) => setGoalForm({ ...goalForm, targetValue: value })} /><Input label="Unit" value={goalForm.unit} onChange={(value) => setGoalForm({ ...goalForm, unit: value })} /></div>
              <div className="ops-form-row"><Input label="Starts" type="date" value={goalForm.startDate} onChange={(value) => setGoalForm({ ...goalForm, startDate: value })} /><Input label="Due" type="date" value={goalForm.dueDate} onChange={(value) => setGoalForm({ ...goalForm, dueDate: value })} /></div>
              <SubmitButton loading={actionLoading}>Create goal</SubmitButton>
            </form>

            <div className="ops-goal-list">
              {goals.map((goal) => {
                const percent = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
                return <article className="ops-goal-card" key={goal.ID}><header><div><span>{goal.status}</span><h3>{goal.title}</h3></div><strong>{percent}%</strong></header><p>{goal.description || goal.metric}</p><div className="ops-progress"><i style={{ width: `${percent}%` }} /></div><div className="ops-goal-meta"><span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span><span>Due {displayDate(goal.dueDate)}</span></div><div className="ops-goal-actions"><button type="button" onClick={() => updateGoal(goal, Math.min(goal.targetValue, goal.currentValue + 1))}>+1 progress</button><button type="button" onClick={() => updateGoal(goal, goal.targetValue, 'completed')}>Complete</button></div></article>;
              })}
              {!goals.length && <div className="ops-panel"><Empty text="No club goals have been set yet." /></div>}
            </div>
          </section>
        )}

        {tab === 'projects' && (
          <>
            <section className="ops-three-forms">
              <form className="ops-form-card" onSubmit={submitProject}>
                <FormHeading eyebrow="Rotary projects" title="Create project" copy="Track service and fundraising work from budget through completion." />
                <Input label="Project name" required value={projectForm.name} onChange={(value) => setProjectForm({ ...projectForm, name: value })} />
                <Textarea label="Description" value={projectForm.description} onChange={(value) => setProjectForm({ ...projectForm, description: value })} />
                <Input label="Budget (UGX)" type="number" value={projectForm.budget} onChange={(value) => setProjectForm({ ...projectForm, budget: value })} />
                <div className="ops-form-row"><Input label="Start" type="date" value={projectForm.startDate} onChange={(value) => setProjectForm({ ...projectForm, startDate: value })} /><Input label="End" type="date" value={projectForm.endDate} onChange={(value) => setProjectForm({ ...projectForm, endDate: value })} /></div>
                <SubmitButton loading={actionLoading}>Create project</SubmitButton>
              </form>

              <form className="ops-form-card" onSubmit={submitTransaction}>
                <FormHeading eyebrow="Project finances" title="Record income / expense" copy="Every project keeps its own running financial balance." />
                <ProjectSelect projects={projects} value={transactionForm.projectId} onChange={(value) => setTransactionForm({ ...transactionForm, projectId: value })} />
                <Select label="Type" value={transactionForm.type} onChange={(value) => setTransactionForm({ ...transactionForm, type: value })} options={['income', 'expense']} />
                <Input label="Amount (UGX)" type="number" required value={transactionForm.amount} onChange={(value) => setTransactionForm({ ...transactionForm, amount: value })} />
                <Input label="Category" value={transactionForm.category} onChange={(value) => setTransactionForm({ ...transactionForm, category: value })} />
                <Input label="Date" type="date" value={transactionForm.transactionDate} onChange={(value) => setTransactionForm({ ...transactionForm, transactionDate: value })} />
                <Input label="Reference" value={transactionForm.reference} onChange={(value) => setTransactionForm({ ...transactionForm, reference: value })} />
                <Textarea label="Description" value={transactionForm.description} onChange={(value) => setTransactionForm({ ...transactionForm, description: value })} />
                <SubmitButton loading={actionLoading}>Record transaction</SubmitButton>
              </form>

              <form className="ops-form-card" onSubmit={submitInvoice}>
                <FormHeading eyebrow="Invoices" title="Record project invoice" copy="Store invoice metadata and a link to the source document." />
                <ProjectSelect projects={projects} value={invoiceForm.projectId} onChange={(value) => setInvoiceForm({ ...invoiceForm, projectId: value })} />
                <Input label="Invoice number" required value={invoiceForm.invoiceNumber} onChange={(value) => setInvoiceForm({ ...invoiceForm, invoiceNumber: value })} />
                <Input label="Vendor" value={invoiceForm.vendor} onChange={(value) => setInvoiceForm({ ...invoiceForm, vendor: value })} />
                <Input label="Customer / billed to" value={invoiceForm.customer} onChange={(value) => setInvoiceForm({ ...invoiceForm, customer: value })} />
                <Input label="Amount (UGX)" type="number" required value={invoiceForm.amount} onChange={(value) => setInvoiceForm({ ...invoiceForm, amount: value })} />
                <div className="ops-form-row"><Input label="Issue date" type="date" value={invoiceForm.issueDate} onChange={(value) => setInvoiceForm({ ...invoiceForm, issueDate: value })} /><Input label="Due date" type="date" value={invoiceForm.dueDate} onChange={(value) => setInvoiceForm({ ...invoiceForm, dueDate: value })} /></div>
                <Select label="Status" value={invoiceForm.status} onChange={(value) => setInvoiceForm({ ...invoiceForm, status: value })} options={['unpaid', 'paid', 'overdue', 'cancelled']} />
                <Textarea label="Description" value={invoiceForm.description} onChange={(value) => setInvoiceForm({ ...invoiceForm, description: value })} />
                <Input label="Invoice file URL" type="url" value={invoiceForm.fileUrl} onChange={(value) => setInvoiceForm({ ...invoiceForm, fileUrl: value })} />
                <SubmitButton loading={actionLoading}>Record invoice</SubmitButton>
              </form>
            </section>

            <section className="ops-project-grid">
              {projects.map((item) => <article className="ops-project-card" key={item.project.ID}><span>{item.project.status}</span><h3>{item.project.name}</h3><p>{item.project.description || 'No project description.'}</p><div className="ops-project-money"><div><small>Budget</small><strong>{money(item.project.budget, item.project.currency)}</strong></div><div><small>Income</small><strong>{money(item.income, item.project.currency)}</strong></div><div><small>Expenses</small><strong>{money(item.expenses, item.project.currency)}</strong></div><div><small>Balance</small><strong>{money(item.balance, item.project.currency)}</strong></div></div><div className="ops-project-records"><span>{item.transactions?.length || 0} finance entries</span><span>{item.invoices?.length || 0} invoices</span>{item.invoices?.slice(0, 2).map((invoice) => <a key={invoice.ID} href={invoice.fileUrl || undefined} target={invoice.fileUrl ? '_blank' : undefined} rel={invoice.fileUrl ? 'noreferrer' : undefined}><strong>{invoice.invoiceNumber}</strong><small>{money(invoice.amount, invoice.currency)} · {invoice.status}</small></a>)}</div><footer>{displayDate(item.project.startDate)} → {displayDate(item.project.endDate)}</footer></article>)}
              {!projects.length && <div className="ops-panel"><Empty text="No Rotary projects have been created yet." /></div>}
            </section>
          </>
        )}

        {tab === 'communications' && (
          <section className="ops-split-layout">
            <form className="ops-form-card" onSubmit={submitCampaign}>
              <FormHeading eyebrow="Email notifications" title="Send or schedule a message" copy="All recipients are queued in PostgreSQL and sent by the Go backend through Savara Mail." />
              <Input label="Campaign name" value={campaignForm.name} onChange={(value) => setCampaignForm({ ...campaignForm, name: value })} placeholder="Monday reminder" />
              <Select label="Audience" value={campaignForm.audience} onChange={(value) => setCampaignForm({ ...campaignForm, audience: value })} options={['members', 'all_attendees', 'visitors', 'attendance_date']} />
              {campaignForm.audience === 'attendance_date' && <Input label="Attendance date" type="date" value={campaignForm.attendanceDate} onChange={(value) => setCampaignForm({ ...campaignForm, attendanceDate: value })} />}
              <Input label="Subject" required value={campaignForm.subject} onChange={(value) => setCampaignForm({ ...campaignForm, subject: value })} />
              <Textarea label="Message (HTML accepted)" required rows={7} value={campaignForm.body} onChange={(value) => setCampaignForm({ ...campaignForm, body: value })} />
              <Input label="Schedule for (optional)" type="datetime-local" value={campaignForm.scheduledAt} onChange={(value) => setCampaignForm({ ...campaignForm, scheduledAt: value })} />
              <SubmitButton loading={actionLoading}>Queue email campaign</SubmitButton>
              <small className="ops-form-note">Leave the schedule blank to send on the next Go mail-worker run. Automated visitor alerts and next-day attendance thank-yous run independently.</small>
            </form>

            <div className="ops-panel">
              <header className="ops-section-heading"><div><span>Email campaigns</span><strong>Recent notifications</strong></div><em>{dashboard?.pendingMailJobs || 0} jobs pending</em></header>
              <div className="ops-campaign-list">
                {campaigns.map((campaign) => <article key={campaign.ID}><div><strong>{campaign.name || campaign.subject}</strong><span>{campaign.audience.replace(/_/g, ' ')} · {displayDateTime(campaign.scheduledAt)}</span></div><em className={`status-${campaign.status}`}>{campaign.status}</em><small>{campaign.sentCount} sent · {campaign.failedCount} failed</small></article>)}
                {!campaigns.length && <Empty text="No bulk email campaigns have been created yet." />}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <article className="ops-metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

function Empty({ text }: { text: string }) { return <div className="ops-empty">{text}</div>; }

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="ops-table-wrap"><table className="ops-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  return <div className="ops-pager"><button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}>Previous</button><span>{page} / {total}</span><button type="button" onClick={() => onChange(Math.min(total, page + 1))} disabled={page >= total}>Next</button></div>;
}

function FormHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="ops-form-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></header>;
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="ops-field">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} /></label>;
}

function Textarea({ label, value, onChange, required = false, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; rows?: number }) {
  return <label className="ops-field">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={rows} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="ops-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}</select></label>;
}

function ProjectSelect({ projects, value, onChange }: { projects: ProjectSummary[]; value: string; onChange: (value: string) => void }) {
  return <label className="ops-field">Project<select required value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select project</option>{projects.map((item) => <option key={item.project.ID} value={item.project.ID}>{item.project.name}</option>)}</select></label>;
}

function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return <button className="ops-submit" type="submit" disabled={loading}>{loading ? 'Saving…' : children}</button>;
}
