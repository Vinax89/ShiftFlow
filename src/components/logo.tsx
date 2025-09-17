export function Logo() {
  return (
    <div className="flex items-center gap-2 p-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="12" fill="#111827" />
        <path d="M16 20h32v12H16zM12 44h40v4H12z" fill="#ffffff" />
      </svg>
      <h1 className="font-headline text-xl font-bold tracking-tighter text-foreground group-data-[state=collapsed]:hidden">
        ShiftFlow
      </h1>
    </div>
  );
}
