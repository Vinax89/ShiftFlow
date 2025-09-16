import { DollarSign, Wallet, CreditCard } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { UpcomingBills } from '@/components/dashboard/upcoming-bills';
import { GoalsOverview } from '@/components/dashboard/goals-overview';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Welcome back, Alex
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Here's your financial overview for this month.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Net Worth"
          value="$54,231.89"
          change="+2.1%"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Income"
          value="$4,231.89"
          change="+12.5%"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Expenses"
          value="$1,879.43"
          change="-5.2%"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SpendingChart />
        <UpcomingBills />
      </div>

      <div>
        <GoalsOverview />
      </div>
    </div>
  );
}
