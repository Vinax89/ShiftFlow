import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Transactions
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. Soon you'll be able to manage all your transactions, scan receipts, and import data here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
