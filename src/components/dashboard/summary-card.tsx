import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SummaryCardProps = {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
};

export function SummaryCard({ title, value, change, icon }: SummaryCardProps) {
  const isPositive = change && change.startsWith('+');
  const isNegative = change && change.startsWith('-');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={cn(
              'text-xs text-muted-foreground',
              isPositive && 'text-green-600',
              isNegative && 'text-red-600'
            )}
          >
            {change} from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
