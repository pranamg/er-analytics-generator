# Cohort Analysis Skill

## Purpose
Perform cohort and retention analysis on generated data to provide business insights.

## When to Use
- User wants retention curves by signup cohort
- User needs churn risk scoring
- User wants revenue cohort analysis
- User needs CLV (Customer Lifetime Value) calculations

## Input
- **Synthetic data**: CSV files from data-generator
- **Cohort field**: Column to group by (usually signup_date)
- **Activity field**: Column indicating activity (invoice_date, meeting_date)
- **Time periods**: Number of months to analyze

## Analyses Performed

### 1. Retention Analysis
- Group customers by signup month (cohort)
- Track activity in subsequent months
- Calculate retention rate per cohort per month
- Generate average retention curve

### 2. Revenue Cohort Analysis
- Total revenue by signup cohort
- Revenue per customer by cohort
- Cohort LTV calculation

### 3. Churn Risk Scoring
- Days since last activity
- Activity frequency
- Revenue trends
- Risk score (0-1)

## Output
```json
{
  "cohortAnalysis": {
    "cohorts": [...],
    "averageRetention": [...]
  },
  "revenueCohorts": [...],
  "churnRisk": [...]
}
```

## Visualization Data
- Retention curves (line chart)
- Cohort heatmap
- Revenue by cohort (bar chart)
- Churn distribution (histogram)

## Related Files
- `packages/analytics-engine/src/index.ts`: Analysis logic
- `packages/dashboard-builder/src/components/`: Visualization components
