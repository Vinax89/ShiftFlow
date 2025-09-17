import xxhash from 'xxhash-wasm';
let hasherPromise: Promise<ReturnType<typeof xxhash>> | null = null;
export async function hash64(data: string) {
  if (!hasherPromise) hasherPromise = xxhash();
  const { h64 } = await hasherPromise;
  const enc = new TextEncoder();
  return h64(enc.encode(data)).toString(16);
}
