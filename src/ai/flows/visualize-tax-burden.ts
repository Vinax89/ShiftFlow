'use server';
/**
 * @fileOverview A tax burden visualization AI agent.
 *
 * - visualizeTaxBurden - A function that handles the tax burden visualization process.
 * - VisualizeTaxBurdenInput - The input type for the visualizeTaxBurden function.
 * - VisualizeTaxBurdenOutput - The return type for the visualizeTaxBurden function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const VisualizeTaxBurdenInputSchema = z.object({
  zipCode: z.string().describe('The ZIP code of the user.'),
  grossIncome: z.number().describe('The gross annual income of the user.'),
  filingStatus: z
    .enum(['single', 'married', 'headOfHousehold'])
    .describe('The filing status of the user.'),
});
export type VisualizeTaxBurdenInput = z.infer<typeof VisualizeTaxBurdenInputSchema>;

const VisualizeTaxBurdenOutputSchema = z.object({
  federalTax: z.number().describe('The estimated federal tax burden.'),
  stateTax: z.number().describe('The estimated state tax burden.'),
  localTax: z.number().describe('The estimated local tax burden.'),
  taxBurdenVisualization: z
    .string()
    .describe(
      'A description of the tax burden, visualized with key figures and comparisons.'
    ),
});
export type VisualizeTaxBurdenOutput = z.infer<typeof VisualizeTaxBurdenOutputSchema>;

const inspectTaxRules = ai.defineTool({
  name: 'inspectTaxRules',
  description: 'Inspects the specific tax rules for a given locality.',
  inputSchema: z.object({
    zipCode: z.string().describe('The ZIP code of the locality.'),
  }),
  outputSchema: z.string().describe('A summary of the tax rules for the locality.'),
},
async (input) => {
  // Placeholder implementation: Replace with actual tax rule retrieval logic
  return `Tax rules for ZIP code ${input.zipCode} are complex and depend on income and other factors.`;
});

export async function visualizeTaxBurden(
  input: VisualizeTaxBurdenInput
): Promise<VisualizeTaxBurdenOutput> {
  return visualizeTaxBurdenFlow(input);
}

const prompt = ai.definePrompt({
  name: 'visualizeTaxBurdenPrompt',
  input: {schema: VisualizeTaxBurdenInputSchema},
  output: {schema: VisualizeTaxBurdenOutputSchema},
  tools: [inspectTaxRules],
  prompt: `You are an expert tax advisor. You will calculate and visualize the tax burden for a user based on their ZIP code, income, and filing status.

  First, use the inspectTaxRules tool to inspect the tax rules for the user's ZIP code: {{zipCode}}.
  Then, calculate the estimated federal, state, and local taxes for the user.
  Finally, provide a description of the tax burden, visualized with key figures and comparisons.

  ZIP Code: {{{zipCode}}}
  Gross Income: {{{grossIncome}}}
  Filing Status: {{{filingStatus}}}
`,
});

const visualizeTaxBurdenFlow = ai.defineFlow(
  {
    name: 'visualizeTaxBurdenFlow',
    inputSchema: VisualizeTaxBurdenInputSchema,
    outputSchema: VisualizeTaxBurdenOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
