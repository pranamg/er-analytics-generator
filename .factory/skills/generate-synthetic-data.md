# Generate Synthetic Data Skill

## Purpose
Generate realistic synthetic data from a database schema, respecting foreign key relationships and data type constraints.

## When to Use
- User has a parsed schema and needs test data
- User wants to populate a database with sample data
- User needs CSV files for dashboard testing

## Input
- **Schema**: Parsed database schema (from vision-parse skill)
- **Row counts** (optional): Number of rows per table
- **Date range** (optional): Range for date columns
- **Seed** (optional): Random seed for reproducibility

## Process
1. Build dependency graph from foreign keys
2. Determine table creation order (topological sort)
3. Generate reference tables first
4. Generate parent tables with realistic data
5. Generate child tables respecting FK constraints
6. Export to CSV format

## Output
- CSV files for each table
- Data summary report
- Referential integrity verification

## Data Generation Rules
- **Primary keys**: Sequential integers or UUIDs
- **Foreign keys**: Random selection from parent table
- **Dates**: Realistic chronological order (signup < meetings < invoices)
- **Text**: Faker.js for names, addresses, descriptions
- **Numbers**: Normal distribution for amounts

## Example Usage
```typescript
import { generateData } from '@er-analytics/data-generator';
const csvFiles = await generateData(schema, {
  rowCounts: { clients: 15, invoices: 50 },
  dateRange: { start: new Date('2024-01-01'), end: new Date() }
});
```

## Related Files
- `packages/data-generator/src/index.ts`: Main generator
- `packages/core/src/types/index.ts`: DataGenerationConfig type
