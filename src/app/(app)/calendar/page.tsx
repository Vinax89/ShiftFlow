import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Financial Calendar
      </h1>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. A centralized calendar to visualize your shifts, bills, and cash flow is on its way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
