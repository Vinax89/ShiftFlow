import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CashflowPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Cashflow
      </h1>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. Get ready to visualize your cash flow in a whole new way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
