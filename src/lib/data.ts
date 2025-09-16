import {
  LayoutDashboard,
  ArrowRightLeft,
  GanttChart,
  Target,
  Calendar,
  Landmark,
  LineChart,
} from 'lucide-react';
import { type NavItem, type Transaction, type Goal, type Bill } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: ArrowRightLeft,
  },
  {
    title: 'Budget',
    href: '/budget',
    icon: GanttChart,
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: Target,
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: 'Taxes',
    href: '/taxes',
    icon: Landmark,
  },
  {
    title: 'Cashflow',
    href: '/cashflow',
    icon: LineChart,
  },
];

export const transactions: Transaction[] = [
  { id: '1', date: '2024-07-28', merchant: 'Paycheck', amount: 2200.0, category: 'Income', type: 'income' },
  { id: '2', date: '2024-07-27', merchant: 'SuperMart', amount: 75.6, category: 'Groceries', type: 'expense' },
  { id: '3', date: '2024-07-26', merchant: 'Gas Station', amount: 45.3, category: 'Transport', type: 'expense' },
  { id: '4', date: '2024-07-25', merchant: 'The Coffee House', amount: 5.5, category: 'Food & Drink', type: 'expense' },
  { id: '5', date: '2024-07-24', merchant: 'Netflix', amount: 15.99, category: 'Subscriptions', type: 'expense' },
  { id: '6', date: '2024-07-23', merchant: 'H&M', amount: 120.0, category: 'Shopping', type: 'expense' },
];

const goalImages = {
  vacation: PlaceHolderImages.find(img => img.id === 'goal-vacation'),
  car: PlaceHolderImages.find(img => img.id === 'goal-car'),
  house: PlaceHolderImages.find(img => img.id === 'goal-house'),
}

export const goals: Goal[] = [
  {
    id: '1',
    name: 'Hawaii Vacation',
    targetAmount: 5000,
    currentAmount: 1250,
    deadline: '2025-06-01',
    imageUrl: goalImages.vacation?.imageUrl ?? '',
    imageHint: goalImages.vacation?.imageHint ?? 'tropical beach'
  },
  {
    id: '2',
    name: 'New Car',
    targetAmount: 25000,
    currentAmount: 8000,
    deadline: '2026-01-01',
    imageUrl: goalImages.car?.imageUrl ?? '',
    imageHint: goalImages.car?.imageHint ?? 'modern car'
  },
  {
    id: '3',
    name: 'House Down Payment',
    targetAmount: 50000,
    currentAmount: 15000,
    deadline: '2027-01-01',
    imageUrl: goalImages.house?.imageUrl ?? '',
    imageHint: goalImages.house?.imageHint ?? 'suburban house'
  }
];

export const bills: Bill[] = [
    { id: '1', name: 'Rent', amount: 1500, dueDate: '2024-08-01' },
    { id: '2', name: 'Internet', amount: 60, dueDate: '2024-08-05' },
    { id: '3', name: 'Electricity', amount: 85, dueDate: '2024-08-15' },
    { id: '4', name: 'Car Payment', amount: 350, dueDate: '2024-08-20' },
];
