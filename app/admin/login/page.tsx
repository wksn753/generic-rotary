'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

const ADMIN_SESSION_STORAGE_KEY = 'kitendeAdminSession';

function getStoredAdminToken() {
  if (typeof window === 'undefined') return '';

  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storeAdminToken(token?: string) {
  if (!token || typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  } catch {
    // The HttpOnly cookie may still work if browser storage is unavailable.
  }
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredAdminToken();
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    void fetch('/api/admin/login', {
      method: 'GET',
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((response) => response.json().catch(() => null))
      .then((data: { authenticated?: boolean } | null) => {
        if (data?.authenticated) window.location.replace('/admin');
      })
      .catch(() => null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string; token?: string } | null;

      if (!response.ok || !data?.success) {
        setError(data?.message || 'Login failed.');
        return;
      }

      storeAdminToken(data.token);
      window.location.replace('/admin');
    } catch {
      setError('Could not sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p>Rotary Club of Nakawa</p>
        <h1>Admin sign in</h1>
        <span>Enter the admin password to view attendance, search records, paginate tables, and export CSV files.</span>

        <form onSubmit={handleSubmit}>
          <label>
            Admin password
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          {error && <strong className="admin-login-error">{error}</strong>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <Link href="/">Back to guest check-in</Link>
      </section>
    </main>
  );
}
