export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  imageUrl: string;
  imageHint: string;
};

export type Budget = {
  id: string;
  name: string;
  period: 'weekly' | 'biweekly' | 'monthly';
  amount: number;
  spent: number;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
};

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
};
