import { config } from 'dotenv';
config();

import '@/ai/flows/categorize-transactions.ts';
import '@/ai/flows/scan-receipts-and-categorize.ts';
import '@/ai/flows/visualize-tax-burden.ts';