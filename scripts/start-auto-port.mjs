#!/usr/bin/env node
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

function parsePorts(spec) {
  const out = []
  for (const chunk of spec.split(',').map(s => s.trim()).filter(Boolean)) {
    if (chunk.includes('-')) {
      const [a, b] = chunk.split('-').map(n => parseInt(n, 10))
      if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
        for (let p = a; p <= b; p++) out.push(p)
      }
    } else {
      const p = parseInt(chunk, 10)
      out.push(Number.isNaN(p) ? 0 : p) // allow “0” for ephemeral
    }
  }
  return out
}

async function isFree(port) {
  return new Promise(resolve => {
    const srv = createServer()
    srv.once('error', () => resolve(false))
    srv.listen({ port, host: '0.0.0.0', exclusive: true }, () => {
      srv.close(() => resolve(true))
    })
  })
}

async function ephemeral() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen({ port: 0, host: '127.0.0.1', exclusive: true }, () => {
      const addr = srv.address()
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', reject)
  })
}

async function findPort(candidates) {
  for (const p of candidates) {
    if (p === 0) return await ephemeral()
    if (await isFree(p)) return p
  }
  throw new Error(`No free port from list: ${candidates.join(',')}`)
}

;(async () => {
  const spec = process.env.PORT_CANDIDATES || '9010,9000,9020-9030,0'
  const candidates = parsePorts(spec)
  const port = await findPort(candidates)

  const env = { ...process.env, PORT: String(port) }
  const cmd = process.env.NEXT_START_CMD || 'next'
  const args = process.env.NEXT_START_ARGS
    ? process.env.NEXT_START_ARGS.split(' ')
    : ['start', '-p', String(port)]

  console.log(`[auto-port] Starting ${cmd} ${args.join(' ')} (PORT=${port})`)
  const child = spawn(cmd, args, { stdio: 'inherit', env })
  child.on('exit', (code, signal) => {
    console.log(`[auto-port] Next.js exited: code=${code} signal=${signal ?? ''}`)
    process.exit(code ?? 0)
  })
})().catch(err => {
  console.error('[auto-port] Failed:', err?.stack || err)
  process.exit(1)
})
