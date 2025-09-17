// Server-safe, dependency-free hash used for inputsHash in recompute.
// We use sha256(hex) and truncate to 16 chars (64 bits) for compactness.
import { createHash } from 'node:crypto'

export async function hash64(data: string): Promise<string> {
  const hex = createHash('sha256').update(data).digest('hex')
  return hex.slice(0, 16)
}
