import { createXXHash64 } from 'xxhash-wasm'
let hasherPromise: Promise<ReturnType<typeof createXXHash64>> | null = null
export async function hash64(data: string) {
  if (!hasherPromise) hasherPromise = createXXHash64()
  const { h64 } = await hasherPromise
  const enc = new TextEncoder()
  return h64(enc.encode(data)).toString(16)
}
