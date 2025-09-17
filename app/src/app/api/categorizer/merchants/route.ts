import { NextRequest } from 'next/server'
import { adminDb, adminAuth } from '@/lib/admin'

async function requireUid(req: NextRequest){
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid');
  if (bypass) return String(bypass);
  const authz = req.headers.get('authorization') || '';
  if (!authz.startsWith('Bearer ')) return null;
  try { const tok = await adminAuth.verifyIdToken(authz.slice(7)); return tok.uid } catch { return null }
}

export async function GET(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId') || 'dev'
  const days = Number(url.searchParams.get('days') || '60')
  const since = new Date(Date.now() - days*24*60*60*1000)
  const snap = await adminDb.collection(`tenants/${tenantId}/transactions`).where('date','>=', since).orderBy('date','desc').limit(300).get()
  const set = new Set<string>()
  for (const d of snap.docs){ const m = String((d.data() as any)?.merchant || '').trim(); if (m) set.add(m) }
  return Response.json({ merchants: Array.from(set).slice(0, 200) })
}
