'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import type { AttendanceRecord, AttendanceResponse } from '../lib/definitions';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ADMIN_SESSION_STORAGE_KEY = 'kitendeAdminSession';


function getStoredAdminToken() {
  if (typeof window === 'undefined') return '';

  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function clearStoredAdminToken() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // Nothing else to clear if storage is blocked.
  }
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = getStoredAdminToken();

  if (!token) return {};

  return { Authorization: `Bearer ${token}` };
}

function todayInKampalaISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  const parsed = new Date(`${value}T12:00:00+03:00`);

  if (Number.isNaN(parsed.getTime())) return value || 'Selected day';

  return new Intl.DateTimeFormat('en-UG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function displayTime(value?: string) {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('en-UG', {
    timeZone: 'Africa/Kampala',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function recordID(record: AttendanceRecord) {
  return record.ID || record.id || `${record.email}-${record.phone}-${record.submittedAt}`;
}

function recordTime(record: AttendanceRecord) {
  return record.submittedAt || record.CreatedAt || record.createdAt;
}

function recordSearchText(record: AttendanceRecord) {
  return [
    record.fullName,
    record.phone,
    record.email,
    record.rotaryClub,
    record.classification,
    record.purpose,
    record.otherPurpose,
    record.event,
    record.venue,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();

  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;

  return text;
}

function buildCSV(records: AttendanceRecord[], selectedDate: string) {
  const headers = [
    'No',
    'Attendance Date',
    'Check-in Time',
    'Full Name',
    'Phone',
    'Email',
    'Rotary Club',
    'Classification',
    'Purpose',
    'Other Purpose',
    'Event',
    'Venue',
    'Check-in Source',
  ];

  const rows = records.map((record, index) => [
    index + 1,
    record.attendanceDate || selectedDate,
    displayTime(recordTime(record)),
    record.fullName,
    record.phone,
    record.email,
    record.rotaryClub,
    record.classification || 'Guest',
    record.purpose || 'Club Fellowship',
    record.otherPurpose,
    record.event,
    record.venue,
    record.checkInSource,
  ]);

  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export default function AdminAttendanceClient() {
  const [date, setDate] = useState(todayInKampalaISO());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rotarians = useMemo(
    () => records.filter((record) => record.classification && record.classification !== 'Guest').length,
    [records],
  );

  const filteredRecords = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return records;

    return records.filter((record) => recordSearchText(record).includes(cleanQuery));
  }, [query, records]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = filteredRecords.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, filteredRecords.length);
  const paginatedRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function loadAttendance(selectedDate = date) {
    setLoading(true);
    setError('');

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...getAdminAuthHeaders(),
      };

      const response = await fetch(`/api/admin/attendance?date=${encodeURIComponent(selectedDate)}`, {
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
      });

      let data: AttendanceResponse | null = null;

      try {
        data = (await response.json()) as AttendanceResponse;
      } catch {
        data = null;
      }

      if (response.status === 401 && data?.code === 'UNAUTHORIZED') {
        clearStoredAdminToken();
        window.location.replace('/admin/login');
        return;
      }

      if (!response.ok || !data?.success) {
        setError(data?.message || 'Could not load attendance.');
        setRecords([]);
        return;
      }

      setRecords(data.records || []);
      setPage(1);
    } catch {
      setError('Could not load attendance. Check the backend connection.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const headers: Record<string, string> = getAdminAuthHeaders();

    await fetch('/api/admin/logout', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    }).catch(() => null);

    clearStoredAdminToken();
    window.location.replace('/admin/login');
  }

  function downloadCSV() {
    const csv = buildCSV(filteredRecords, date);
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `kitende-breeze-attendance-${date}${query.trim() ? '-filtered' : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    void loadAttendance(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-topbar">
          <div className="admin-brand">
            <div>
              <span>Rotary Club of</span>
              <strong>Nakawa</strong>
            </div>
          </div>

          <div className="admin-actions">
            <Link className="admin-back" href="/">
              Back to check-in
            </Link>
            <button className="admin-logout" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        <section className="admin-hero">
          <div className="admin-panel">
            <p>Attendance dashboard</p>
            <h1>{displayDate(date)}</h1>
            <span>
              View fellowship and event check-ins by day. Returning visitors are saved as fresh attendance rows,
              while duplicate same-day check-ins are avoided.
            </span>
          </div>

          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span>Total attendees</span>
              <strong>{loading ? '…' : records.length}</strong>
              <span>{rotarians} Rotary-family guests</span>
            </div>

            <div className="admin-stat admin-stat-muted">
              <span>Search result</span>
              <strong>{loading ? '…' : filteredRecords.length}</strong>
              <span>{query.trim() ? 'Matching current filter' : 'No active search filter'}</span>
            </div>
          </div>
        </section>

        <section className="admin-controls" aria-label="Attendance filters">
          <label className="admin-date-field">
            Attendance date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <label className="admin-search-field">
            Search attendance
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, phone, email, club, purpose..."
            />
          </label>

          <label className="admin-page-size-field">
            Rows per page
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-control-buttons">
            <button type="button" onClick={() => loadAttendance(date)} disabled={loading}>
              {loading ? 'Loading...' : 'View Day'}
            </button>

            <button type="button" className="admin-secondary-button" onClick={() => setQuery('')} disabled={!query.trim()}>
              Clear Search
            </button>

            <button
              type="button"
              className="admin-secondary-button"
              onClick={downloadCSV}
              disabled={loading || filteredRecords.length === 0}
            >
              Download CSV
            </button>
          </div>
        </section>

        {error && <p className="admin-error">{error}</p>}

        <section className="attendance-table-card">
          <div className="attendance-table-head">
            <div>
              <strong>Attendance list</strong>
              <span>
                {filteredRecords.length} result{filteredRecords.length === 1 ? '' : 's'} for {displayDate(date)}
              </span>
            </div>

            {filteredRecords.length > 0 && (
              <span className="attendance-page-summary">
                Showing {startIndex}-{endIndex} of {filteredRecords.length}
              </span>
            )}
          </div>

          {filteredRecords.length > 0 ? (
            <>
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Contact</th>
                      <th>Club</th>
                      <th>Classification</th>
                      <th>Purpose</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record) => (
                      <tr key={recordID(record)}>
                        <td>
                          <strong>{record.fullName || 'Unnamed guest'}</strong>
                          <span>{record.event || 'RC Nakawa event'}</span>
                        </td>
                        <td>
                          {record.phone || '—'}
                          <span>{record.email || 'No email'}</span>
                        </td>
                        <td>{record.rotaryClub || '—'}</td>
                        <td>{record.classification || 'Guest'}</td>
                        <td>
                          {record.purpose || 'Club Fellowship'}
                          {record.otherPurpose && <span>{record.otherPurpose}</span>}
                        </td>
                        <td>{displayTime(recordTime(record))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="attendance-mobile-list" aria-label="Mobile attendance list">
                {paginatedRecords.map((record) => (
                  <article className="attendance-mobile-card" key={`mobile-${recordID(record)}`}>
                    <header>
                      <strong>{record.fullName || 'Unnamed guest'}</strong>
                      <span>{displayTime(recordTime(record))}</span>
                    </header>

                    <dl>
                      <div>
                        <dt>Phone</dt>
                        <dd>{record.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{record.email || 'No email'}</dd>
                      </div>
                      <div>
                        <dt>Club</dt>
                        <dd>{record.rotaryClub || '—'}</dd>
                      </div>
                      <div>
                        <dt>Classification</dt>
                        <dd>{record.classification || 'Guest'}</dd>
                      </div>
                      <div>
                        <dt>Purpose</dt>
                        <dd>{record.purpose || 'Club Fellowship'}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>

              <div className="attendance-pagination" aria-label="Attendance pagination">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1}>
                  Previous
                </button>
                <span>
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="attendance-empty">
              {loading ? 'Loading attendance…' : query.trim() ? 'No records match your search.' : 'No attendance records found for this date.'}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
