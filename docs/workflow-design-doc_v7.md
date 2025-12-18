# ER Diagram to Analytics Platform
## Workflow Design Document

**Version:** 1.0  
**Date:** December 18, 2025  
**Author:** Analytics Pipeline System

---

## Executive Summary

This document describes the complete workflow for transforming an ER diagram image into a production-ready analytics platform with dashboards, documentation, and deployment scripts. The pipeline consists of 11 stages organized in series and parallel execution paths.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MAIN PIPELINE FLOW                          │
│                                                                     │
│  [Input] ──► Stage 1 ──► Stage 2 ──┬──► Stage 3 ──► Stage 4 ──┐   │
│                                     │                            │   │
│                                     └──► Stage 5 ────────────────┤   │
│                                                                  │   │
│                                     ┌────────────────────────────┘   │
│                                     │                                │
│                                     ├──► Stage 6 ──► Stage 7 ──┐    │
│                                     │                           │    │
│                                     ├──► Stage 8 ───────────────┤    │
│                                     │                           │    │
│                                     ├──► Stage 9 ───────────────┤    │
│                                     │                           │    │
│                                     └──► Stage 10 ──────────────┤    │
│                                                                 │    │
│                                     ┌───────────────────────────┘    │
│                                     │                                │
│                                     └──► [Output: Complete System]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Execution Model:**
- **Series:** Stages 1, 2, 3, 4 (must execute sequentially)
- **Parallel:** Stages 6-10 (can execute simultaneously after Stage 5)
- **Independent:** Stage 11 (can run anytime)

---

## Stage-by-Stage Workflow

### 📊 **STAGE 1: Vision API - ER Diagram Parser**

**Type:** Entry Point | Sequential  
**Execution Time:** ~5-10 seconds  
**Technology:** Claude Vision API, Python/JavaScript

#### Input:
```
┌─────────────────────────────────┐
│ ER Diagram Image                │
├─────────────────────────────────┤
│ • Format: PNG, JPG, JPEG        │
│ • Resolution: Min 800x600       │
│ • Quality: Clear, readable text │
│ • File Size: < 10MB             │
└─────────────────────────────────┘
```

#### Process:
1. **Image Encoding**
   - Convert image to base64
   - Determine MIME type
   
2. **API Request**
   - Send to Claude Vision API
   - Prompt for schema extraction
   - Request JSON format
   
3. **Response Processing**
   - Parse JSON response
   - Validate schema structure
   - Clean markdown artifacts

4. **Schema Validation**
   - Verify table names
   - Check column definitions
   - Validate relationships

#### Output:
```json
{
  "tables": [
    {
      "name": "TableName",
      "columns": [
        {
          "name": "column_name",
          "type": "DATA_TYPE",
          "primaryKey": true/false,
          "foreignKey": "RefTable(refColumn)" | null
        }
      ]
    }
  ]
}
```

#### Success Criteria:
- ✓ All tables extracted
- ✓ Primary keys identified
- ✓ Foreign keys mapped
- ✓ Valid JSON structure

#### Error Handling:
- Invalid image → Retry with different format
- Incomplete extraction → Manual review required
- API timeout → Exponential backoff retry

---

### 🗄️ **STAGE 2: Schema Processor**

**Type:** Sequential  
**Execution Time:** < 1 second  
**Technology:** JavaScript/Python

#### Input:
```
┌─────────────────────────────────┐
│ Parsed Schema (JSON)            │
│ from Stage 1                    │
└─────────────────────────────────┘
```

#### Process:
1. **Schema Validation**
   - Check for circular dependencies
   - Validate data types
   - Verify referential integrity rules

2. **Schema Enhancement**
   - Infer missing data types
   - Add default constraints
   - Generate index recommendations

3. **Metadata Generation**
   - Table count
   - Column count per table
   - Relationship count
   - Complexity score

4. **Dependency Graph**
   - Build table dependency tree
   - Identify root tables
   - Order for data generation

#### Output:
```json
{
  "schema": { /* enhanced schema */ },
  "metadata": {
    "tableCount": 12,
    "totalColumns": 45,
    "relationships": 11,
    "complexity": "medium"
  },
  "dependencyOrder": [
    "Ref_SIC_Codes",
    "Ref_Invoice_Status",
    "Agencies",
    "Clients",
    ...
  ]
}
```

#### Success Criteria:
- ✓ No circular dependencies
- ✓ All foreign keys resolvable
- ✓ Valid dependency order

---

### 💾 **STAGE 3: SQL DDL Generator**

**Type:** Sequential  
**Execution Time:** < 1 second  
**Technology:** Template Engine (Jinja2/JavaScript)

#### Input:
```
┌─────────────────────────────────┐
│ Enhanced Schema (JSON)          │
│ from Stage 2                    │
│                                 │
│ Optional Parameters:            │
│ • Target DB: PostgreSQL/MySQL   │
│ • Include Views: true/false     │
│ • Include Indexes: true/false   │
└─────────────────────────────────┘
```

#### Process:
1. **Table Creation Statements**
   ```sql
   CREATE TABLE TableName (
       column_name DATA_TYPE [PRIMARY KEY],
       ...
   );
   ```

2. **Foreign Key Constraints**
   ```sql
   ALTER TABLE TableName
       ADD FOREIGN KEY (column) 
       REFERENCES RefTable(refColumn);
   ```

3. **Index Generation**
   ```sql
   CREATE INDEX idx_table_column 
       ON TableName(column_name);
   ```

4. **View Creation**
   ```sql
   CREATE VIEW view_name AS
   SELECT ...
   FROM ...
   JOIN ...;
   ```

5. **Database-Specific Optimizations**
   - PostgreSQL: SERIAL types, tablespaces
   - MySQL: ENGINE=InnoDB, AUTO_INCREMENT
   - SQL Server: IDENTITY columns

#### Output:
```sql
-- schema.sql
-- Generated: 2025-12-18
-- Tables: 12
-- Total Lines: ~250

CREATE TABLE Agencies (...);
CREATE TABLE Clients (...);
...
ALTER TABLE Clients ADD FOREIGN KEY ...;
...
CREATE INDEX idx_invoices_date ON Invoices(invoice_date);
...
CREATE VIEW client_revenue_summary AS ...;
```

**File Output:**
- `schema.sql` (complete DDL)
- `schema_postgresql.sql` (PostgreSQL-specific)
- `schema_mysql.sql` (MySQL-specific)

#### Success Criteria:
- ✓ Syntactically valid SQL
- ✓ All tables created
- ✓ All constraints defined
- ✓ Executable without errors

---

### 🎲 **STAGE 4: Synthetic Data Generator**

**Type:** Sequential (depends on Stage 2 dependency order)  
**Execution Time:** 2-5 seconds  
**Technology:** Faker.js, NumPy, Pandas

#### Input:
```
┌─────────────────────────────────┐
│ Enhanced Schema (JSON)          │
│ from Stage 2                    │
│                                 │
│ Parameters:                     │
│ • Row counts per table          │
│ • Date ranges                   │
│ • Distribution rules            │
│ • Referential integrity rules   │
└─────────────────────────────────┘
```

#### Process:
1. **Data Generation Strategy**
   ```
   For each table in dependencyOrder:
       1. Determine row count (rules-based or random)
       2. Generate primary keys (sequential/UUID)
       3. For each column:
          - If FK: select from parent table
          - If date: generate in range
          - If text: use Faker library
          - If number: use distribution (normal/uniform)
       4. Validate referential integrity
       5. Write to memory/CSV
   ```

2. **Reference Tables First**
   - Ref_SIC_Codes (5 rows)
   - Ref_Invoice_Status (3 rows)
   - Ref_Meeting_Types (4 rows)
   - Ref_Meeting_Outcomes (4 rows)

3. **Parent Tables Second**
   - Agencies (6 rows)
   - Staff (12 rows)

4. **Child Tables Third**
   - Clients (15 rows, FK to Agencies)
   - Meetings (60 rows, FK to Clients)
   - Invoices (50 rows, FK to Clients)

5. **Junction Tables Last**
   - Staff_in_Meetings (FK to both)
   - Payments (FK to Invoices)

6. **Data Realism Rules**
   - **Dates:** Clients signup 0-12 months ago
   - **Meetings:** After client signup
   - **Invoices:** Match meeting timeline
   - **Payments:** 5-30 days after invoice
   - **Amounts:** Realistic distributions ($5K-$55K)

#### Output:
```
┌─────────────────────────────────┐
│ CSV Files (11 files)            │
├─────────────────────────────────┤
│ agencies.csv           (6 rows) │
│ clients.csv           (15 rows) │
│ staff.csv             (12 rows) │
│ meetings.csv          (60 rows) │
│ invoices.csv          (50 rows) │
│ payments.csv          (30 rows) │
│ staff_in_meetings.csv (90 rows) │
│ ref_sic_codes.csv      (5 rows) │
│ ref_invoice_status.csv (3 rows) │
│ ref_meeting_types.csv  (4 rows) │
│ ref_meeting_outcomes.csv (4 rows)│
└─────────────────────────────────┘

Total Records: ~279
CSV Format: UTF-8, comma-delimited, headers
```

#### Success Criteria:
- ✓ All foreign keys valid
- ✓ No orphaned records
- ✓ Realistic data distributions
- ✓ Date logic consistent

---

### 📋 **STAGE 5: Requirements Document Generator**

**Type:** Sequential  
**Execution Time:** < 1 second  
**Technology:** Template Engine

#### Input:
```
┌─────────────────────────────────┐
│ Enhanced Schema (JSON)          │
│ from Stage 2                    │
│                                 │
│ Table Metadata:                 │
│ • Business domain (inferred)    │
│ • Table relationships           │
│ • Complexity metrics            │
└─────────────────────────────────┘
```

#### Process:
1. **Analyze Schema for Business Context**
   - Identify business entities (Clients, Invoices, etc.)
   - Determine business domain (advertising agency)
   - Extract key metrics (revenue, meetings, etc.)

2. **Generate Questions by Stakeholder Level**
   
   **Basic Questions (Operational Staff):**
   - Simple counts: "How many X?"
   - Basic filters: "Which Y have status Z?"
   - Current state: "What is the current X?"
   
   **Intermediate Questions (Managers):**
   - Aggregations: "What is average X by Y?"
   - Comparisons: "How does X compare to Y?"
   - Time-based: "What is the trend of X?"
   
   **Advanced Questions (Executives):**
   - Multi-dimensional: "How does X correlate with Y controlling for Z?"
   - Predictive: "What are the drivers of X?"
   - Optimization: "What is the optimal X for Y?"

3. **Map Questions to Tables**
   - Identify required tables for each question
   - Determine SQL complexity
   - Specify answer type

#### Output:
```
┌─────────────────────────────────────────────┐
│ Requirements Document                       │
├─────────────────────────────────────────────┤
│                                             │
│ OPERATIONAL STAFF (Basic Level)            │
│ ════════════════════════════════            │
│ 1. How many active clients do we have?     │
│    Type: Single Metric                      │
│    SQL: Simple                              │
│    Tables: [Clients]                        │
│                                             │
│ 2. Which agencies have the most clients?   │
│    Type: Ranked List                        │
│    SQL: Simple                              │
│    Tables: [Agencies, Clients]              │
│                                             │
│ ... (5 questions total)                     │
│                                             │
│ MANAGERS (Intermediate Level)               │
│ ══════════════════════════════              │
│ 1. What is average invoice value by agency?│
│    Type: Comparative Metrics                │
│    SQL: Moderate                            │
│    Tables: [Agencies, Clients, Invoices]    │
│                                             │
│ ... (6 questions total)                     │
│                                             │
│ EXECUTIVES (Advanced Level)                 │
│ ═══════════════════════════                 │
│ 1. What is CLV by industry segment?        │
│    Type: Advanced Metric                    │
│    SQL: Complex                             │
│    Tables: [Clients, Invoices, Payments]    │
│                                             │
│ ... (6 questions total)                     │
│                                             │
│ TOTAL QUESTIONS: 17                         │
└─────────────────────────────────────────────┘
```

**File Output:**
- `requirements_document.txt`
- `requirements_document.json` (structured)

#### Success Criteria:
- ✓ Questions cover all stakeholder levels
- ✓ Questions map to available data
- ✓ SQL complexity accurately assessed

---

## Parallel Processing Branch

**After Stage 5, the following stages can execute in parallel:**

---

### 📄 **STAGE 6: PRD Generator**

**Type:** Parallel (after Stage 5)  
**Execution Time:** < 1 second  
**Technology:** Template Engine, Document Generator

#### Input:
```
┌─────────────────────────────────┐
│ Requirements Document           │
│ from Stage 5                    │
│                                 │
│ Enhanced Schema                 │
│ from Stage 2                    │
│                                 │
│ Optional:                       │
│ • Company name                  │
│ • Project timeline              │
│ • Budget constraints            │
└─────────────────────────────────┘
```

#### Process:
1. **Section 1: Executive Summary**
   - Auto-generate from schema analysis
   - Include table count, complexity
   - State primary objectives

2. **Section 2: Business Context**
   - Infer business domain
   - State industry challenges
   - Define success criteria

3. **Section 3: Stakeholder Profiles**
   - Extract from requirements document
   - Map to organizational roles
   - Define access levels

4. **Section 4: Functional Requirements**
   - Data integration requirements
   - Dashboard capabilities
   - Advanced analytics features
   - Reporting capabilities

5. **Section 5: Dashboard Specifications**
   - One spec per dashboard type
   - List KPIs and visualizations
   - Define filters and drill-downs

6. **Section 6: Data Requirements**
   - Refresh frequency
   - Data retention policies
   - Performance SLAs

7. **Section 7: Success Metrics**
   - Platform adoption KPIs
   - Business impact metrics

8. **Section 8: Technical Stack**
   - Frontend recommendations
   - Backend recommendations
   - Database recommendations
   - BI tool recommendations

#### Output:
```
┌─────────────────────────────────────────────┐
│ PRD_advertising_agency_analytics.txt        │
├─────────────────────────────────────────────┤
│                                             │
│ Product Requirements Document               │
│ Advertising Agency Analytics Platform       │
│                                             │
│ Version: 1.0                                │
│ Date: 2025-12-18                            │
│                                             │
│ 1. EXECUTIVE SUMMARY                        │
│    This platform provides comprehensive...  │
│                                             │
│ 2. BUSINESS CONTEXT                         │
│    Advertising agencies manage complex...   │
│                                             │
│ 3. STAKEHOLDER PROFILES                     │
│    3.1 Operational Staff                    │
│        Needs: Basic-level analytics...      │
│                                             │
│ ... (8 sections total, ~2000 words)         │
│                                             │
└─────────────────────────────────────────────┘
```

**File Outputs:**
- `PRD_advertising_agency_analytics.txt`
- `PRD_advertising_agency_analytics.pdf` (formatted)
- `PRD_advertising_agency_analytics.docx` (editable)

#### Success Criteria:
- ✓ All 8 sections completed
- ✓ Specific to schema domain
- ✓ Actionable requirements
- ✓ Ready for development handoff

---

### 📊 **STAGE 7: Advanced Analytics Engine**

**Type:** Parallel (after Stage 5)  
**Execution Time:** 1-2 seconds  
**Technology:** Python, Pandas, NumPy

#### Input:
```
┌─────────────────────────────────┐
│ Synthetic Data (CSV files)      │
│ from Stage 4                    │
│                                 │
│ Specifically Required:          │
│ • clients.csv (with signup_date)│
│ • invoices.csv (with dates)     │
│ • payments.csv (with dates)     │
│ • meetings.csv                  │
└─────────────────────────────────┘
```

#### Process:

**1. Cohort Analysis**
```python
# Group clients by signup month
cohorts = clients.groupby(
    clients['signup_date'].dt.to_period('M')
)

# For each cohort, calculate retention
for cohort_month, cohort_clients in cohorts:
    for offset in range(7):  # Month 0-6
        target_month = cohort_month + offset
        
        # Count active clients in target month
        active = invoices[
            (invoices['client_id'].isin(cohort_clients)) &
            (invoices['invoice_date'].dt.to_period('M') == target_month)
        ]['client_id'].nunique()
        
        retention_rate = active / len(cohort_clients) * 100
```

**2. Retention Curve**
- Calculate average retention across all cohorts
- Generate month-over-month retention data
- Identify retention benchmarks

**3. Revenue Cohort Analysis**
- Total revenue by cohort
- Revenue per client by cohort
- Cohort LTV calculation

**4. Churn Risk Scoring**
- Identify clients without recent activity
- Score based on engagement metrics
- Flag high-risk clients

#### Output:
```json
{
  "cohortAnalysis": {
    "cohorts": [
      {
        "month": "2024-12",
        "size": 3,
        "retention": [
          {"month": 0, "rate": 100, "count": 3},
          {"month": 1, "rate": 100, "count": 3},
          {"month": 2, "rate": 66.7, "count": 2},
          ...
        ]
      }
    ],
    "averageRetention": [
      {"month": 0, "rate": 100},
      {"month": 1, "rate": 95.2},
      {"month": 2, "rate": 87.3},
      ...
    ]
  },
  "revenueCohorts": [
    {
      "cohort": "Dec 24",
      "revenue": 145000,
      "clientCount": 3,
      "revenuePerClient": 48333
    }
  ],
  "churnRisk": [
    {
      "client_id": 5,
      "client_name": "HealthCare Plus",
      "risk_score": 0.82,
      "last_activity": "2024-09-15",
      "days_inactive": 95
    }
  ]
}
```

**Visualization Data:**
- Retention curves (line charts)
- Cohort heatmaps
- Revenue trends by cohort
- Churn risk distribution

#### Success Criteria:
- ✓ All cohorts analyzed
- ✓ Retention curves generated
- ✓ Revenue metrics calculated
- ✓ Churn scores assigned

---

### 📈 **STAGE 8: Dashboard Builder**

**Type:** Parallel (after Stage 5)  
**Execution Time:** < 1 second  
**Technology:** React, Recharts, D3.js

#### Input:
```
┌─────────────────────────────────┐
│ Synthetic Data (CSV files)      │
│ from Stage 4                    │
│                                 │
│ Requirements Document           │
│ from Stage 5                    │
│                                 │
│ Advanced Analytics              │
│ from Stage 7 (optional)         │
└─────────────────────────────────┘
```

#### Process:

**1. Data Aggregation**
```javascript
// Calculate KPIs
const kpis = {
    totalClients: clients.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    totalMeetings: meetings.length,
    paymentRate: (payments.length / invoices.length) * 100
};

// Revenue by Agency
const revenueByAgency = agencies.map(agency => ({
    name: agency.agency_details,
    revenue: invoices
        .filter(inv => clients
            .find(c => c.client_id === inv.client_id)
            ?.agency_id === agency.agency_id
        )
        .reduce((sum, inv) => sum + inv.amount, 0)
}));
```

**2. Dashboard Creation (4 Types)**

**Executive Dashboard:**
- KPIs: Clients, Revenue, Payment Rate, Avg Invoice
- Charts: Revenue by Agency, Industry Distribution, Revenue Trend, Meeting Outcomes

**Finance Dashboard:**
- KPIs: Total Revenue, Outstanding AR, Payment Rate, Invoices
- Charts: Invoice Status, AR Aging, Revenue Trend, Payment Velocity

**Operations Dashboard:**
- KPIs: Staff Count, Meetings, Utilization, Clients
- Charts: Staff Utilization, Billable Split, Meeting Outcomes, Client Distribution

**Sales Dashboard:**
- KPIs: Active Clients, Meetings, Revenue/Client, Success Rate
- Charts: Revenue by Agency, Client Distribution, Meeting Outcomes, Revenue Trends

**3. Visualization Component Generation**
```javascript
// Example: Bar Chart Component
<BarChart data={revenueByAgency}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="revenue" fill="#3b82f6" />
</BarChart>
```

#### Output:
```
┌─────────────────────────────────────────────┐
│ Interactive Dashboards (4)                  │
├─────────────────────────────────────────────┤
│                                             │
│ 1. Executive Dashboard                      │
│    • 4 KPI cards                            │
│    • 4 visualizations                       │
│    • Real-time data binding                 │
│                                             │
│ 2. Finance Dashboard                        │
│    • 4 KPI cards                            │
│    • 4 visualizations (incl. AR aging)      │
│    • Drill-down capabilities                │
│                                             │
│ 3. Operations Dashboard                     │
│    • 4 KPI cards                            │
│    • 4 visualizations (incl. utilization)   │
│    • Staff performance tracking             │
│                                             │
│ 4. Sales Dashboard                          │
│    • 4 KPI cards                            │
│    • 4 visualizations (incl. pipeline)      │
│    • Client engagement metrics              │
│                                             │
└─────────────────────────────────────────────┘
```

**Deliverables:**
- React components (JSX files)
- Standalone HTML dashboards
- Dashboard screenshots (PNG)
- Usage documentation

#### Success Criteria:
- ✓ All 4 dashboards functional
- ✓ Data accurately displayed
- ✓ Interactive features working
- ✓ Mobile responsive

---

### 📦 **STAGE 9: Power BI Exporter**

**Type:** Parallel (after Stage 5)  
**Execution Time:** < 1 second  
**Technology:** DAX, Power Query M

#### Input:
```
┌─────────────────────────────────┐
│ Enhanced Schema                 │
│ from Stage 2                    │
│                                 │
│ Synthetic Data (CSV files)      │
│ from Stage 4                    │
│                                 │
│ Requirements Document           │
│ from Stage 5                    │
└─────────────────────────────────┘
```

#### Process:

**1. Generate DAX Measures**
```dax
// Revenue Measures
Total Revenue = SUM(Invoices[amount])

Total Payments = SUM(Payments[amount])

Payment Rate = DIVIDE([Total Payments], [Total Revenue], 0)

// Client Measures
Total Clients = DISTINCTCOUNT(Clients[client_id])

Active Clients = 
CALCULATE(
    DISTINCTCOUNT(Meetings[client_id]),
    DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -1, MONTH)
)

// CLV Measure
Client Lifetime Value = 
CALCULATE(
    [Total Revenue],
    ALLEXCEPT(Clients, Clients[client_id])
)

// Retention Measure
Retention Rate = 
VAR ClientsLastMonth = 
    CALCULATE(
        DISTINCTCOUNT(Clients[client_id]),
        DATEADD('Date'[Date], -1, MONTH)
    )
VAR ClientsStillActive = 
    CALCULATE(
        DISTINCTCOUNT(Clients[client_id]),
        FILTER(ALL('Date'), 'Date'[Date] = MAX('Date'[Date]))
    )
RETURN DIVIDE(ClientsStillActive, ClientsLastMonth, 0)
```

**2. Generate Power Query M Code**
```m
// Date Table
let
    StartDate = #date(2023, 1, 1),
    EndDate = #date(2025, 12, 31),
    NumberOfDays = Duration.Days(EndDate - StartDate) + 1,
    DateList = List.Dates(StartDate, NumberOfDays, #duration(1,0,0,0)),
    #"Converted to Table" = Table.FromList(
        DateList, 
        Splitter.SplitByNothing(), 
        {"Date"}
    ),
    #"Added Year" = Table.AddColumn(
        #"Converted to Table", 
        "Year", 
        each Date.Year([Date])
    ),
    #"Added Month" = Table.AddColumn(
        #"Added Year", 
        "Month", 
        each Date.Month([Date])
    )
in
    #"Added Month"
```

**3. Create Relationship Instructions**
```
Relationships to Create:
1. Clients[agency_id] → Agencies[agency_id] (Many-to-One, Both)
2. Clients[sic_code] → Ref_SIC_Codes[sic_code] (Many-to-One, Both)
3. Invoices[client_id] → Clients[client_id] (Many-to-One, Both)
4. Invoices[invoice_status_code] → Ref_Invoice_Status[invoice_status_code] (Many-to-One, Both)
5. Payments[invoice_id] → Invoices[invoice_id] (Many-to-One, Both)
6. Meetings[client_id] → Clients[client_id] (Many-to-One, Both)
7. Meetings[meeting_type_code] → Ref_Meeting_Types[meeting_type_code] (Many-to-One, Both)
8. Meetings[meeting_outcome_code] → Ref_Meeting_Outcomes[meeting_outcome_code] (Many-to-One, Both)
9. Staff[agency_id] → Agencies[agency_id] (Many-to-One, Both)
10. Staff_in_Meetings[meeting_id] → Meetings[meeting_id] (Many-to-One, Both)
11. Staff_in_Meetings[staff_id] → Staff[staff_id] (Many-to-One, Both)
```

**4. Create Import Guide**
- Step-by-step CSV import
- Relationship configuration
- Measure creation
- Dashboard template setup

#### Output:
```
┌─────────────────────────────────────────────┐
│ Power BI Resources                          │
├─────────────────────────────────────────────┤
│                                             │
│ Files Generated:                            │
│ • power_bi_measures.dax (15+ measures)      │
│ • power_bi_date_table.m (Power Query)       │
│ • power_bi_instructions.md (guide)          │
│ • power_bi_relationships.txt (mappings)     │
│ • dashboard_template.pbit (optional)        │
│                                             │
│ Measures Include:                           │
│ • Total Revenue                             │
│ • Total Payments                            │
│ • Payment Rate                              │
│ • Client Lifetime Value                     │
│ • Retention Rate                            │
│ • Revenue Growth MoM                        │
│ • Active Clients This Month                 │
│ • Billable Percentage                       │
│ • Average Invoice                           │
│ • Outstanding AR                            │
│ • ... (15 total)                            │
│                                             │
└─────────────────────────────────────────────┘
```

#### Success Criteria:
- ✓ All DAX measures syntactically valid
- ✓ Power Query code tested
- ✓ Relationships correctly defined
- ✓ Import guide clear and complete

---

### 🚀 **STAGE 10: Deployment Script Generator**

**Type:** Parallel (after Stage 5)  
**Execution Time:** < 1 second  
**Technology:** Bash scripting

#### Input:
```
┌─────────────────────────────────┐
│ SQL DDL                         │
│ from Stage 3                    │
│                                 │
│ CSV Files                       │
│ from Stage 4                    │
│                                 │
│ Enhanced Schema                 │
│ from Stage 2                    │
│                                 │
│ Parameters:                     │
│ • Target environment (dev/prod) │
│ • Database type (PostgreSQL)    │
│ • Host configuration            │
└─────────────────────────────────┘
```

#### Process:

**1. Database Setup Script**
```bash
#!/bin/bash

# Database Creation
psql -U postgres -c "CREATE DATABASE advertising_analytics;"

# Schema Deployment
psql -U postgres -d advertising_analytics -f schema.sql
```

**2. Data Import Script**
```bash
# Import CSVs
for file in *.csv; do
    table_name=${file%.csv}
    psql -U postgres -d advertising_analytics \
        -c "\copy $table_name FROM '$file' CSV HEADER;"
done
```

**3. Performance Optimization**
```bash
# Create Indexes
psql -U postgres -d advertising_analytics <<EOF
CREATE INDEX idx_clients_agency ON Clients(agency_id);
CREATE INDEX idx_invoices_client ON Invoices(client_id);
CREATE INDEX idx_invoices_date ON Invoices(invoice_date);
CREATE INDEX idx_payments_invoice ON Payments(invoice_id);
CREATE INDEX idx_meetings_client ON Meetings(client_id);
CREATE INDEX idx_meetings_date ON Meetings(start_date_time);
ANALYZE;
EOF
```

**4. User & Permission Setup**
```bash
# Create Users
psql -U postgres -d advertising_analytics <<EOF
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO analytics_user;
EOF
```

**5. Dashboard Deployment**
```bash
# Option A: Streamlit
pip install streamlit plotly pandas psycopg2
streamlit run dashboard.py --server.port 8501

# Option B: Power BI Gateway
# Install from: https://powerbi.microsoft.com/gateway/
# Configure connection string
```

**6. Scheduled Tasks**
```bash
# Add to crontab for daily refresh at 6 AM
echo "0 6 * * * /path/to/refresh_data.sh" | crontab -
```

**7. Health Check Script**
```bash
# Verify deployment
psql -U postgres -d advertising_analytics -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
    FROM pg_tables 
    WHERE schemaname = 'public';"
```

#### Output:
```
┌─────────────────────────────────────────────┐
│ Deployment Package                          │
├─────────────────────────────────────────────┤
│                                             │
│ Scripts Generated:                          │
│ • deploy.sh (main deployment script)        │
│ • setup_database.sh (DB creation)           │
│ • import_data.sh (CSV import)               │
│ • create_indexes.sh (optimization)          │
│ • setup_users.sh (security)                 │
│ • deploy_dashboard.sh (dashboard setup)     │
│ • health_check.sh (verification)            │
│ • rollback.sh (emergency rollback)          │
│                                             │
│ Configuration Files:                        │
│ • .env.example (environment variables)      │
│ • config.yaml (deployment config)           │
│ • requirements.txt (Python dependencies)    │
│                                             │
│ Documentation:                              │
│ • DEPLOYMENT.md (step-by-step guide)        │
│ • TROUBLESHOOTING.md (common issues)        │
│ • MAINTENANCE.md (ongoing operations)       │
│                                             │
└─────────────────────────────────────────────┘
```

#### Success Criteria:
- ✓ All scripts executable
- ✓ Error handling included
- ✓ Idempotent operations
- ✓ Rollback capability

---

### 🌐 **STAGE 11: Business Context Scraper**

**Type:** Independent (can run anytime)  
**Execution Time:** 5-15 seconds  
**Technology:** Claude API, Web Search

#### Input:
```
┌─────────────────────────────────┐
│ Schema Domain (inferred)        │
│ from Stage 2                    │
│                                 │
│ Optional:                       │
│ • Industry name                 │
│ • Company size                  │
│ • Geographic region             │
└─────────────────────────────────┘
```

#### Process:

**1. Domain Detection**
```javascript
// Analyze table names to infer domain
const domain = inferDomain(schema.tables);
// Result: "Advertising Agency"
```

**2. Claude API Research Request**
```javascript
const research = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
            role: 'user',
            content: `Research the ${domain} industry and provide:
            
1. Industry Size & Growth
   - Market size (USD)
   - Growth rate (CAGR)
   - Key trends

2. Key Performance Metrics
   - Standard KPIs
   - Industry benchmarks
   - Success metrics

3. Common Pain Points
   - Operational challenges
   - Technology gaps
   - Market pressures

4. Best Practices
   - Client retention strategies
   - Revenue optimization
   - Operational efficiency

5. Technology Stack
   - Common tools
   - Integration patterns
   - Emerging technologies

Provide specific, actionable insights in JSON format.`
        }]
    })
});
```

**3. Response Processing**
```javascript
const context = await research.json();
const insights = context.content[0].text;

// Parse and structure
const structured = {
    industry: domain,
    researched: new Date(),
    insights: insights,
    sources: extractSources(insights)
};
```

#### Output:
```json
{
  "industry": "Advertising Agency",
  "researched": "2025-12-18T10:30:00Z",
  "insights": {
    "marketSize": {
      "global": "$766 billion (2024)",
      "cagr": "6.1% (2024-2029)",
      "keyTrends": [
        "Digital transformation",
        "Data-driven decision making",
        "Personalization at scale"
      ]
    },
    "keyMetrics": {
      "clientRetention": "85-90% industry standard",
      "revenuePerClient": "$50K-$500K annually",
      "staffUtilization": "70-80% billable hours",
      "paymentTerms": "Net 30-45 days typical"
    },
    "painPoints": [
      "Client churn due to lack of data insights",
      "Inefficient staff allocation",
      "Payment delays and AR management",
      "Difficulty demonstrating ROI",
      "Fragmented data across systems"
    ],
    "bestPractices": {
      "clientRetention": [
        "Regular performance reviews with data",
        "Proactive communication of insights",
        "Value demonstration through analytics",
        "Personalized service based on data"
      ],
      "revenueOptimization": [
        "Dynamic pricing based on value",
        "Upselling through data insights",
        "Efficient resource allocation",
        "Quick invoicing and follow-up"
      ]
    },
    "technologyStack": {
      "commonTools": [
        "CRM: Salesforce, HubSpot",
        "Project Management: Asana, Monday.com",
        "Analytics: Tableau, Power BI",
        "Financial: QuickBooks, NetSuite"
      ],
      "emergingTech": [
        "AI-powered analytics",
        "Predictive churn modeling",
        "Real-time dashboards",
        "Automated reporting"
      ]
    }
  }
}
```

**File Output:**
- `business_context.json` (structured)
- `business_context.txt` (readable)
- `business_context.md` (formatted)

#### Success Criteria:
- ✓ Industry correctly identified
- ✓ Relevant insights gathered
- ✓ Actionable recommendations
- ✓ Current (2024-2025) data

---

## Output: Complete System Package

### 📦 Final Deliverables

```
advertising-agency-analytics/
│
├── 01-schema/
│   ├── parsed_schema.json
│   ├── enhanced_schema.json
│   └── schema_metadata.json
│
├── 02-database/
│   ├── schema.sql
│   ├── schema_postgresql.sql
│   ├── schema_mysql.sql
│   └── views.sql
│
├── 03-data/
│   ├── agencies.csv
│   ├── clients.csv
│   ├── staff.csv
│   ├── meetings.csv
│   ├── invoices.csv
│   ├── payments.csv
│   ├── staff_in_meetings.csv
│   └── ref_*.csv (4 files)
│
├── 04-documentation/
│   ├── requirements_document.txt
│   ├── requirements_document.json
│   ├── PRD_advertising_agency_analytics.txt
│   ├── PRD_advertising_agency_analytics.pdf
│   ├── business_context.json
│   └── business_context.md
│
├── 05-analytics/
│   ├── cohort_analysis.json
│   ├── retention_curves.json
│   ├── revenue_cohorts.json
│   └── churn_risk_scores.json
│
├── 06-dashboards/
│   ├── executive_dashboard.html
│   ├── finance_dashboard.html
│   ├── operations_dashboard.html
│   ├── sales_dashboard.html
│   └── components/ (React JSX files)
│
├── 07-powerbi/
│   ├── power_bi_measures.dax
│   ├── power_bi_date_table.m
│   ├── power_bi_instructions.md
│   ├── power_bi_relationships.txt
│   └── dashboard_template.pbit
│
├── 08-deployment/
│   ├── deploy.sh
│   ├── setup_database.sh
│   ├── import_data.sh
│   ├── create_indexes.sh
│   ├── setup_users.sh
│   ├── health_check.sh
│   ├── rollback.sh
│   ├── .env.example
│   ├── config.yaml
│   ├── DEPLOYMENT.md
│   ├── TROUBLESHOOTING.md
│   └── MAINTENANCE.md
│
└── 09-reports/
    ├── execution_summary.md
    ├── data_quality_report.json
    └── system_architecture.pdf
```

**Total Files:** 50+  
**Total Size:** ~5-10 MB  
**Documentation Pages:** ~100

---

## Execution Timeline

### Sequential Path (Critical Path)
```
Stage 1 (Vision API)       [5-10s]
    ↓
Stage 2 (Schema)           [<1s]
    ↓
Stage 3 (SQL)              [<1s]
    ↓
Stage 4 (Data)             [2-5s]
    ↓
Stage 5 (Requirements)     [<1s]
    
Total Sequential: 8-17 seconds
```

### Parallel Path (After Stage 5)
```
Stage 6 (PRD)              [<1s]  ┐
Stage 7 (Analytics)        [1-2s] │
Stage 8 (Dashboards)       [<1s]  ├─ Execute in parallel
Stage 9 (Power BI)         [<1s]  │
Stage 10 (Deploy)          [<1s]  ┘

Total Parallel: 1-2 seconds (longest task)
```

### Independent
```
Stage 11 (Context)         [5-15s] - Can run anytime
```

### **Total Execution Time: 9-19 seconds**
*(Excluding Stage 11 which is optional)*

---

## System Requirements

### Hardware
- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 100MB for system, 1GB for data
- **Network:** Stable internet for API calls

### Software
- **Node.js:** v16+ or **Python:** 3.8+
- **PostgreSQL:** 12+ or **MySQL:** 8+
- **Optional:** Power BI Desktop, Tableau
- **Browser:** Chrome/Firefox/Safari (latest)

### API Requirements
- **Anthropic API Key** (for Vision & Context)
- **Rate Limits:** 50 requests/minute

---

## Error Handling & Recovery

### Stage-Level Error Handling

**Stage 1 (Vision API):**
- **Timeout:** Retry with exponential backoff (3 attempts)
- **Invalid Image:** Return clear error, request new image
- **Incomplete Parse:** Flag for manual review, continue with partial

**Stage 2-3 (Schema/SQL):**
- **Validation Failure:** Log errors, attempt auto-fix
- **Circular Dependency:** Break cycle, notify user
- **Invalid SQL:** Syntax check, generate warning

**Stage 4 (Data):**
- **FK Violation:** Re-generate affected records
- **Data Type Mismatch:** Coerce or generate new
- **Size Limits:** Reduce row counts, notify user

**Stage 5-10 (Documents/Outputs):**
- **Template Error:** Use fallback template
- **File Write Error:** Retry with temp directory
- **API Failure:** Cache and retry, use defaults

### Recovery Mechanisms
1. **Checkpointing:** Save progress after each stage
2. **Rollback:** Revert to last successful stage
3. **Partial Success:** Allow completion with warnings
4. **Manual Override:** User can skip/modify stages

---

## Quality Assurance

### Automated Tests
- **Schema Validation:** All FKs resolvable
- **SQL Syntax Check:** Execute in test database
- **Data Integrity:** Check all FK references
- **Dashboard Rendering:** Automated screenshot comparison
- **Documentation:** Spell check, link validation

### Manual Review Points
1. **Post-Stage 1:** Verify all tables extracted
2. **Post-Stage 4:** Sample data quality check
3. **Post-Stage 8:** Dashboard usability review
4. **Pre-Deployment:** Security audit

---

## Performance Optimization

### Optimization Strategies
1. **Parallel Processing:** Stages 6-10 run concurrently
2. **Caching:** Schema parsed once, reused
3. **Lazy Loading:** Generate on-demand where possible
4. **Incremental Updates:** Only regenerate changed components

### Scalability Considerations
- **Small Schema (< 10 tables):** 8-12 seconds total
- **Medium Schema (10-30 tables):** 12-20 seconds total
- **Large Schema (30+ tables):** 20-40 seconds total

---

## Version Control & Tracking

### Versioning
```
v1.0.0 - Initial generation
v1.1.0 - Schema updated (added 2 tables)
v1.1.1 - Data regenerated
v2.0.0 - Major schema refactor
```

### Change Tracking
```json
{
  "version": "1.1.0",
  "changes": [
    {
      "stage": "Schema",
      "type": "addition",
      "description": "Added Marketing_Campaigns table",
      "timestamp": "2025-12-18T11:00:00Z"
    }
  ],
  "regenerated": ["SQL", "Data", "Dashboards"]
}
```

---

## Conclusion

This workflow design provides a complete, production-ready system for transforming ER diagrams into analytics platforms. The modular design allows for:

- **Flexibility:** Stages can be run independently or together
- **Speed:** Parallel processing reduces total time
- **Reliability:** Error handling at every stage
- **Scalability:** Handles schemas from 5 to 50+ tables
- **Completeness:** Everything from parsing to deployment

**Next Steps:**
1. Review and approve this design
2. Begin implementation of Stage 1 (Vision API)
3. Develop sequential stages 2-5
4. Implement parallel stages 6-10
5. Add Stage 11 (Context Scraper)
6. Integration testing
7. Production deployment

---

**Document Version:** 1.0  
**Last Updated:** December 18, 2025  
**Status:** Ready for Implementation