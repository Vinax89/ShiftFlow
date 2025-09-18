#!/usr/bin/env bash
set -euo pipefail

# This script fixes the "two parallel pages that resolve to the same path" error
# by consolidating to a single Next.js app root at `src/app` and ensuring a
# working /dashboard page + root layout.
#
# Usage: bash ./tools/fix-next-app-dup.sh  (or paste/run block-by-block)

root_dir() { git rev-parse --show-toplevel 2>/dev/null || pwd; }
cd "$(root_dir)"

printf "\n==> Inspecting project tree\n"
ls -la | sed -n '1,200p' | grep -E "^(drwx|lrwx).* (app|src)$" || true

if [ -d app ] && [ -d src/app ]; then
  echo "\n⚠ Found BOTH top-level \`app\` and \`src/app\`. We'll keep \`src/app\` and remove \`app\`."
  git rm -r app || rm -rf app
fi

# Ensure we have exactly one app root
if [ ! -d src/app ]; then
  echo "\n📁 Creating src/app (no files found)."
  mkdir -p src/app
fi

# Remove duplicate /src/app/dashboard if a grouped one exists
if [ -d "src/app/(app)/dashboard" ] && [ -d "src/app/dashboard" ]; then
  echo "\n🧹 Removing duplicate src/app/dashboard (keeping src/app/(app)/dashboard)."
  git rm -r src/app/dashboard || rm -rf src/app/dashboard
fi

# Ensure root layout exists under src/app
if [ ! -f src/app/layout.tsx ]; then
  echo "\n🧩 Writing src/app/layout.tsx"
  cat > src/app/layout.tsx <<'TSX'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shift Flow',
  description: 'Budgeting aligned to real pay periods for shift workers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}
TSX
fi

# Ensure / redirects to /dashboard if no homepage yet
if [ ! -f src/app/page.tsx ]; then
  echo "\n↪️  Adding redirect from / → /dashboard at src/app/page.tsx"
  cat > src/app/page.tsx <<'TSX'
import { redirect } from 'next/navigation'
export default function Page(){
  redirect('/dashboard')
}
TSX
fi

# Ensure a minimal /dashboard page exists somewhere
if [ ! -f "src/app/(app)/dashboard/page.tsx" ] && [ ! -f "src/app/dashboard/page.tsx" ]; then
  echo "\n🧱 Creating minimal dashboard page at src/app/dashboard/page.tsx"
  mkdir -p src/app/dashboard
  cat > src/app/dashboard/page.tsx <<'TSX'
export const dynamic = 'force-dynamic'
export default function DashboardPage(){
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Welcome to Shift Flow.</p>
    </main>
  )
}
TSX
fi

# Commit if in a git repo
if git rev-parse --git-dir >/dev/null 2>&1; then
  git add -A
  git commit -m "fix(next): consolidate to src/app; remove duplicate /dashboard; ensure root layout + /→/dashboard redirect" || true
fi

cat <<'DONE'

✅ Fix applied.

Next steps:
1) Dev:    npm run dev
2) Prod:   npm run serve:prod:auto

Sanity checks:
- Open http://localhost:3000  (dev) — should redirect to /dashboard and render.
- Or if running in Studio preview: http://localhost:9002

If you still see a 404:
- Run: find src/app -maxdepth 3 -type f -name 'page.tsx' | sort
- Ensure ONLY ONE dashboard page remains (either src/app/(app)/dashboard/page.tsx OR src/app/dashboard/page.tsx).
DONE
