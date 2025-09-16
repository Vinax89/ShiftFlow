#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function sh(cmd){ return execSync(cmd, { stdio: 'pipe' }).toString().trim() }
const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main'
const files = sh(`git fetch ${base} --depth=50 || true; git diff --name-only ${base}...HEAD`).split('
').filter(Boolean)

let failures = []

// 1) New or changed routes must have Playwright e2e specs
const routeFiles = files.filter(f => f.startsWith('src/app/') && (f.endsWith('/page.tsx') || f.endsWith('/route.ts')))
const routeToPath = f => {
  let rel = f.replace('src/app/','')
  rel = rel.endsWith('/page.tsx') ? rel.slice(0, -10) : rel
  rel = rel.endsWith('/route.ts') ? rel.slice(0, -9) : rel
  const parts = rel.split('/').filter(s => !(s.startsWith('(') && s.endsWith(')')))
  return '/' + parts.join('/')
}
for (const rf of routeFiles){
  const p = routeToPath(rf)
  const slug = (p === '/' ? 'home' : p.slice(1).replaceAll('/', '_'))
  const a = `tests/e2e/${slug}.spec.ts`
  const b = `tests/e2e/${slug}.spec.tsx`
  if (!(existsSync(a) || existsSync(b))) failures.push(`Missing Playwright spec for route ${p} (expected tests/e2e/${slug}.spec.ts[x])`)
}

// 2) Runbook must be updated for feature changes
const touchedDocs = files.some(f => f === 'docs/runbook.md' || f.startsWith('docs/'))
if (!touchedDocs) failures.push('docs/runbook.md must be updated for feature changes')

// 3) Firestore indexes JSON must be valid if changed
if (files.includes('firestore.indexes.json')) {
  try { JSON.parse(readFileSync('firestore.indexes.json','utf8')) } catch { failures.push('firestore.indexes.json is invalid JSON') }
}

if (failures.length) {
  console.error('Feature readiness failed:')
  for (const m of failures) console.error(' - ' + m)
  process.exit(1)
}
console.log('Feature readiness checks passed')
