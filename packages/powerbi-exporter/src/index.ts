import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Schema } from '@er-analytics/core';

export interface PowerBIExport {
  daxMeasures: string;
  powerQueryDateTable: string;
  relationships: string;
  importInstructions: string;
}

export function generatePowerBIResources(schema: Schema): PowerBIExport {
  return {
    daxMeasures: generateDAXMeasures(schema),
    powerQueryDateTable: generateDateTable(),
    relationships: generateRelationships(schema),
    importInstructions: generateImportInstructions(schema),
  };
}

function generateDAXMeasures(schema: Schema): string {
  const hasInvoices = schema.tables.some(t => t.name.toLowerCase().includes('invoice'));
  const hasPayments = schema.tables.some(t => t.name.toLowerCase().includes('payment'));
  const hasClients = schema.tables.some(t => t.name.toLowerCase().includes('client'));
  const hasMeetings = schema.tables.some(t => t.name.toLowerCase().includes('meeting'));

  let dax = `// DAX Measures for Power BI
// Generated: ${new Date().toISOString()}
// Copy these into your Power BI model

`;

  if (hasInvoices) {
    dax += `Total Revenue = SUM(Invoices[amount])

Average Invoice = AVERAGE(Invoices[amount])

`;
  }

  if (hasPayments) {
    dax += `Total Payments = SUM(Payments[amount])

`;
  }

  if (hasInvoices && hasPayments) {
    dax += `Payment Rate = DIVIDE([Total Payments], [Total Revenue], 0)

Outstanding AR = [Total Revenue] - [Total Payments]

`;
  }

  if (hasClients) {
    dax += `Total Clients = DISTINCTCOUNT(Clients[client_id])

Active Clients This Month = 
CALCULATE(
    DISTINCTCOUNT(Clients[client_id]),
    DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -1, MONTH)
)

Client Lifetime Value = 
CALCULATE(
    [Total Revenue],
    ALLEXCEPT(Clients, Clients[client_id])
)

`;
  }

  if (hasMeetings) {
    dax += `Total Meetings = COUNTROWS(Meetings)

Billable Meetings = CALCULATE(COUNTROWS(Meetings), Meetings[billable_yn] = "Y")

Billable Percentage = DIVIDE([Billable Meetings], [Total Meetings], 0)

`;
  }

  dax += `Revenue Growth MoM = 
VAR CurrentMonth = [Total Revenue]
VAR PreviousMonth = CALCULATE([Total Revenue], DATEADD('Date'[Date], -1, MONTH))
RETURN DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth, 0)
`;

  return dax;
}

function generateDateTable(): string {
  return `// Power Query M Code for Date Table
let
    StartDate = #date(2023, 1, 1),
    EndDate = #date(2025, 12, 31),
    NumberOfDays = Duration.Days(EndDate - StartDate) + 1,
    DateList = List.Dates(StartDate, NumberOfDays, #duration(1,0,0,0)),
    #"Converted to Table" = Table.FromList(DateList, Splitter.SplitByNothing(), {"Date"}),
    #"Changed Type" = Table.TransformColumnTypes(#"Converted to Table",{{"Date", type date}}),
    #"Added Year" = Table.AddColumn(#"Changed Type", "Year", each Date.Year([Date])),
    #"Added Month" = Table.AddColumn(#"Added Year", "Month", each Date.Month([Date])),
    #"Added Month Name" = Table.AddColumn(#"Added Month", "Month Name", each Date.MonthName([Date])),
    #"Added Quarter" = Table.AddColumn(#"Added Month Name", "Quarter", each "Q" & Number.ToText(Date.QuarterOfYear([Date]))),
    #"Added Day" = Table.AddColumn(#"Added Quarter", "Day", each Date.Day([Date])),
    #"Added Day Name" = Table.AddColumn(#"Added Day", "Day Name", each Date.DayOfWeekName([Date]))
in
    #"Added Day Name"
`;
}

function generateRelationships(schema: Schema): string {
  const relationships: string[] = ['Relationships to Create in Power BI Model:', ''];

  let index = 1;
  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.foreignKey) {
        const match = column.foreignKey.match(/^(\w+)\((\w+)\)$/);
        if (match) {
          const [, refTable, refColumn] = match;
          relationships.push(
            `${index}. ${table.name}[${column.name}] -> ${refTable}[${refColumn}] (Many-to-One, Both)`
          );
          index++;
        }
      }
    }
  }

  return relationships.join('\n');
}

function generateImportInstructions(schema: Schema): string {
  const tables = schema.tables.map(t => t.name.toLowerCase() + '.csv');
  
  return `# Power BI Import Instructions

## Step 1: Import CSV Files
1. Open Power BI Desktop
2. Click "Get Data" > "Text/CSV"
3. Import each CSV file:
${tables.map(t => `   - ${t}`).join('\n')}

## Step 2: Create Relationships
In the Model view, create the relationships listed in power_bi_relationships.txt

## Step 3: Create Date Table
1. Go to "Modeling" > "New Table"
2. Paste the Power Query M code from power_bi_date_table.m
3. Create relationships between date columns and the Date table

## Step 4: Add DAX Measures
1. Select a table in the model
2. Click "New Measure"
3. Copy measures from power_bi_measures.dax

## Step 5: Build Dashboards
Use the dashboard specifications to create:
- Executive Dashboard
- Finance Dashboard
- Operations Dashboard
- Sales Dashboard
`;
}

export async function savePowerBIResources(schema: Schema, outputDir: string): Promise<void> {
  const resources = generatePowerBIResources(schema);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'power_bi_measures.dax'), resources.daxMeasures);
  fs.writeFileSync(path.join(outputDir, 'power_bi_date_table.m'), resources.powerQueryDateTable);
  fs.writeFileSync(path.join(outputDir, 'power_bi_relationships.txt'), resources.relationships);
  fs.writeFileSync(path.join(outputDir, 'power_bi_instructions.md'), resources.importInstructions);
}
