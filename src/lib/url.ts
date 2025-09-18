export const baseUrl = () =>
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/,'') ||
  `http://localhost:${process.env.PORT ?? '3000'}`;

export const abs = (p: string) =>
  /^https?:\/\//i.test(p) ? p : `${baseUrl()}${p.startsWith('/') ? '' : '/'}${p}`;
