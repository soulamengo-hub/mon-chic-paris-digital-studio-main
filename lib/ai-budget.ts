// MON CHIC PARIS · Digital Studio 6.5.7
// Zentrale Budget-Konfiguration für die KI-Artikelanalyse.
// Ziel: verlässlich unter dem monatlichen Zielbudget von ca. 25 € bleiben.

export const AI_MONTHLY_BUDGET_EUR = Number(process.env.AI_MONTHLY_BUDGET_EUR || 25);
export const AI_WARNING_THRESHOLDS_EUR = [15, 20, 23];

// Grobe, konservative Preisschätzung pro 1000 Tokens (USD, in EUR umgerechnet).
// Bewusst leicht nach oben abgerundet, damit die Anzeige eher zu vorsichtig als
// zu optimistisch ist. Bei Bedarf über Umgebungsvariablen überschreibbar.
const USD_TO_EUR = Number(process.env.AI_USD_TO_EUR_RATE || 0.93);
const INPUT_COST_PER_1K_USD = Number(process.env.AI_INPUT_COST_PER_1K_USD || 0.0004);
const OUTPUT_COST_PER_1K_USD = Number(process.env.AI_OUTPUT_COST_PER_1K_USD || 0.0016);

export function estimateCostEur(inputTokens: number, outputTokens: number): number {
  const inputCostUsd = (inputTokens / 1000) * INPUT_COST_PER_1K_USD;
  const outputCostUsd = (outputTokens / 1000) * OUTPUT_COST_PER_1K_USD;
  return (inputCostUsd + outputCostUsd) * USD_TO_EUR;
}

export type BudgetSummary = {
  budgetEur: number;
  spentEur: number;
  remainingEur: number;
  percent: number;
  warning: boolean;
  blocked: boolean;
};

export function summarizeBudget(spentEur: number): BudgetSummary {
  const budgetEur = AI_MONTHLY_BUDGET_EUR;
  const remainingEur = Math.max(0, budgetEur - spentEur);
  const percent = Math.min(100, Math.round((spentEur / budgetEur) * 100));
  const warning = AI_WARNING_THRESHOLDS_EUR.some(threshold => spentEur >= threshold);
  const blocked = spentEur >= budgetEur;
  return { budgetEur, spentEur, remainingEur, percent, warning, blocked };
}

export function currentMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
