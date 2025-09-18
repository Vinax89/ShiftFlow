import { abs } from '@/lib/url';

export default async function DashboardPage() {
  let health = 'unknown';
  let error = '';
  try {
    const res = await fetch(abs('/api/healthz'), { cache: 'no-store' });
    health = res.ok ? 'ok' : `error: ${res.status}`;
    if (!res.ok) {
      error = await res.text().catch(() => 'Could not read error body');
    }
  } catch (e: any) {
    health = 'fetch failed';
    error = e.message;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboard ✅</h1>
      <p style={{ marginTop: 8 }}>API health: <strong>{health}</strong></p>
      {error && <pre style={{ marginTop: 8, fontSize: '12px', color: 'red' }}>{error}</pre>}
    </div>
  );
}
