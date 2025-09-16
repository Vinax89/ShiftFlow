import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bills } from "@/lib/data";
import { format } from "date-fns";

export function UpcomingBills() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-bold">Upcoming Bills</CardTitle>
        <CardDescription>Don't miss these upcoming payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {bills.map((bill) => (
            <li key={bill.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{bill.name}</p>
                <p className="text-sm text-muted-foreground">
                  Due {format(new Date(bill.dueDate), "MMM d, yyyy")}
                </p>
              </div>
              <p className="font-bold text-lg">
                ${bill.amount.toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
