import xxhash from 'xxhash-wasm';
// lazy-load the WASM once per process
let hasherPromise: Promise<{ h64: (input: Uint8Array) => bigint }> | null = null
export async function hash64(data: string) {
  if (!hasherPromise) hasherPromise = xxhash()
  const { h64 } = await hasherPromise
  const enc = new TextEncoder()
  const out = h64(enc.encode(data)) // bigint
  return out.toString(16) // hex
}
