import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaxesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Tax Center
      </h1>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. Prepare to visualize your tax burden and explore income scenarios with our upcoming AI-powered tools.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
