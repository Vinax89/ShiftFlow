import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { goals } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

export function GoalsOverview() {
  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-bold">Savings Goals</CardTitle>
        <CardDescription>Track your progress towards your financial goals.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <Card key={goal.id} className="overflow-hidden">
              <Image
                src={goal.imageUrl}
                alt={goal.name}
                width={400}
                height={200}
                className="h-32 w-full object-cover"
                data-ai-hint={goal.imageHint}
              />
              <div className="p-4">
                <p className="font-semibold">{goal.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                </p>
                <Progress value={progress} className="mt-2 h-2" />
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
