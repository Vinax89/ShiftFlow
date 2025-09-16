import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Savings Goals
      </h1>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. You'll soon be able to set and track all your financial goals right here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
