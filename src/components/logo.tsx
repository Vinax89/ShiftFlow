import { Wallet } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 p-2">
      <Wallet className="h-8 w-8 text-primary" />
      <h1 className="font-headline text-xl font-bold tracking-tighter text-foreground group-data-[state=collapsed]:hidden">
        ShiftFlow
      </h1>
    </div>
  );
}
