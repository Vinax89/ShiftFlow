'use server';
/**
 * @fileOverview This file defines a Genkit flow for scanning receipts and categorizing expenses using AI.
 *
 * The flow takes a receipt image as input, extracts key information using OCR, and then
 * categorizes the expense using a language model. This automates expense tracking for the user.
 *
 * @fileOverview
 * - scanReceiptAndCategorize - A function that handles the receipt scanning and categorization process.
 * - ScanReceiptAndCategorizeInput - The input type for the scanReceiptAndCategorize function.
 * - ScanReceiptAndCategorizeOutput - The return type for the scanReceiptAndCategorize function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const ScanReceiptAndCategorizeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptAndCategorizeInput = z.infer<typeof ScanReceiptAndCategorizeInputSchema>;

const ScanReceiptAndCategorizeOutputSchema = z.object({
  category: z.string().describe('The category of the expense on the receipt.'),
  amount: z.number().describe('The total amount of the expense on the receipt.'),
  merchant: z.string().describe('The name of the merchant on the receipt.'),
  date: z.string().describe('The date of the transaction on the receipt.'),
});
export type ScanReceiptAndCategorizeOutput = z.infer<typeof ScanReceiptAndCategorizeOutputSchema>;

export async function scanReceiptAndCategorize(input: ScanReceiptAndCategorizeInput): Promise<ScanReceiptAndCategorizeOutput> {
  return scanReceiptAndCategorizeFlow(input);
}

const receiptPrompt = ai.definePrompt({
  name: 'receiptPrompt',
  input: {schema: ScanReceiptAndCategorizeInputSchema},
  output: {schema: ScanReceiptAndCategorizeOutputSchema},
  prompt: `You are an AI assistant that helps categorize expenses from receipts.

  Given a receipt image, extract the key information such as the category of the expense, the total amount, the merchant name, and the transaction date.  The category should be as specific as possible.  For example, if the receipt is from a restaurant, the category should be "Restaurant" and not "Food".

  Receipt Image: {{media url=photoDataUri}}
  `,
});

const scanReceiptAndCategorizeFlow = ai.defineFlow(
  {
    name: 'scanReceiptAndCategorizeFlow',
    inputSchema: ScanReceiptAndCategorizeInputSchema,
    outputSchema: ScanReceiptAndCategorizeOutputSchema,
  },
  async input => {
    const {output} = await receiptPrompt(input);
    return output!;
  }
);
