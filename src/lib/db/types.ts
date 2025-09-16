export type AccountType = 'checking'|'savings'|'cash'|'card'
export type CategoryGroup = 'needs'|'wants'|'savings'|'income'|'debt'
export type TxnStatus = 'posted'|'pending'

export interface TenantDoc { name: string; createdAt: number; ownerUid: string; currency: 'USD'; tz: string }
export interface AccountDoc { type: AccountType; name: string; mask: string; instId?: string; createdAt: number; updatedAt: number }
export interface CategoryDoc { name: string; group: CategoryGroup; sort: number; archived?: boolean }
export interface TxnDoc { accountId: string; amountCents: number; currency: 'USD'; date: number; merchant?: string; memo?: string; categoryId?: string|null; status: TxnStatus; source: 'manual'|'csv'|'api'; hash: string }
export interface BudgetPlanDoc { name: string; active: boolean; periodType: 'weekly'|'biweekly'|'semi_monthly'|'monthly'; tz: string; createdAt: number; updatedAt: number }
