import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { Database, Table, FileText, BarChart3, Download, Users, DollarSign, Calendar, TrendingUp, Image, Zap, Globe, FileCode, Package } from 'lucide-react';

// EXPANDED SCHEMA
const parsedSchema = {
  tables: [
    {
      name: "Agencies",
      columns: [
        { name: "agency_id", type: "INT", primaryKey: true },
        { name: "agency_details", type: "VARCHAR(255)" }
      ]
    },
    {
      name: "Clients",
      columns: [
        { name: "client_id", type: "INT", primaryKey: true },
        { name: "agency_id", type: "INT", foreignKey: "Agencies(agency_id)" },
        { name: "sic_code", type: "VARCHAR(50)", foreignKey: "Ref_SIC_Codes(sic_code)" },
        { name: "client_details", type: "TEXT" },
        { name: "signup_date", type: "DATE" }
      ]
    },
    {
      name: "Staff",
      columns: [
        { name: "staff_id", type: "INT", primaryKey: true },
        { name: "agency_id", type: "INT", foreignKey: "Agencies(agency_id)" },
        { name: "staff_details", type: "TEXT" }
      ]
    },
    {
      name: "Meetings",
      columns: [
        { name: "meeting_id", type: "INT", primaryKey: true },
        { name: "client_id", type: "INT", foreignKey: "Clients(client_id)" },
        { name: "meeting_type_code", type: "VARCHAR(20)", foreignKey: "Ref_Meeting_Types(meeting_type_code)" },
        { name: "meeting_outcome_code", type: "VARCHAR(20)", foreignKey: "Ref_Meeting_Outcomes(meeting_outcome_code)" },
        { name: "billable_yn", type: "CHAR(1)" },
        { name: "start_date_time", type: "DATETIME" },
        { name: "end_date_time", type: "DATETIME" },
        { name: "purpose_of_meeting", type: "TEXT" },
        { name: "other_details", type: "TEXT" }
      ]
    },
    {
      name: "Staff_in_Meetings",
      columns: [
        { name: "meeting_id", type: "INT", primaryKey: true, foreignKey: "Meetings(meeting_id)" },
        { name: "staff_id", type: "INT", primaryKey: true, foreignKey: "Staff(staff_id)" }
      ]
    },
    {
      name: "Invoices",
      columns: [
        { name: "invoice_id", type: "INT", primaryKey: true },
        { name: "client_id", type: "INT", foreignKey: "Clients(client_id)" },
        { name: "invoice_status_code", type: "VARCHAR(20)", foreignKey: "Ref_Invoice_Status(invoice_status_code)" },
        { name: "invoice_details", type: "TEXT" },
        { name: "amount", type: "DECIMAL(10,2)" },
        { name: "invoice_date", type: "DATE" }
      ]
    },
    {
      name: "Payments",
      columns: [
        { name: "payment_id", type: "INT", primaryKey: true },
        { name: "invoice_id", type: "INT", foreignKey: "Invoices(invoice_id)" },
        { name: "payment_details", type: "TEXT" },
        { name: "amount", type: "DECIMAL(10,2)" },
        { name: "payment_date", type: "DATE" }
      ]
    },
    {
      name: "Ref_Invoice_Status",
      columns: [
        { name: "invoice_status_code", type: "VARCHAR(20)", primaryKey: true },
        { name: "invoice_status_description", type: "VARCHAR(100)" }
      ]
    },
    {
      name: "Ref_SIC_Codes",
      columns: [
        { name: "sic_code", type: "VARCHAR(50)", primaryKey: true },
        { name: "sic_description", type: "VARCHAR(255)" }
      ]
    },
    {
      name: "Ref_Meeting_Types",
      columns: [
        { name: "meeting_type_code", type: "VARCHAR(20)", primaryKey: true },
        { name: "meeting_type_description", type: "VARCHAR(255)" }
      ]
    },
    {
      name: "Ref_Meeting_Outcomes",
      columns: [
        { name: "meeting_outcome_code", type: "VARCHAR(20)", primaryKey: true },
        { name: "meeting_outcome_description", type: "VARCHAR(255)" }
      ]
    }
  ]
};

// Generate SQL DDL
const generateSQL = () => {
  let sql = "-- Database Schema for Advertising Agencies\n";
  sql += "-- Generated from ER Diagram\n\n";
  
  parsedSchema.tables.forEach(table => {
    sql += `CREATE TABLE ${table.name} (\n`;
    const pkCols = table.columns.filter(c => c.primaryKey).map(c => c.name);
    
    table.columns.forEach((col, idx) => {
      sql += `    ${col.name} ${col.type}`;
      if (col.primaryKey && pkCols.length === 1) sql += " PRIMARY KEY";
      if (idx < table.columns.length - 1) sql += ",";
      sql += "\n";
    });
    
    if (pkCols.length > 1) {
      sql += `    PRIMARY KEY (${pkCols.join(', ')})\n`;
    }
    
    sql += ");\n\n";
  });
  
  sql += "-- Foreign Key Constraints\n\n";
  parsedSchema.tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.foreignKey) {
        const [refTable, refCol] = col.foreignKey.split(/[()]/);
        sql += `ALTER TABLE ${table.name}\n`;
        sql += `    ADD FOREIGN KEY (${col.name}) REFERENCES ${refTable}(${refCol});\n\n`;
      }
    });
  });
  
  sql += "-- Useful Views\n\n";
  sql += `CREATE VIEW client_revenue_summary AS
SELECT 
    c.client_id,
    c.client_details,
    c.signup_date,
    a.agency_details,
    COUNT(DISTINCT i.invoice_id) as total_invoices,
    SUM(i.amount) as total_revenue,
    SUM(p.amount) as total_payments,
    COUNT(DISTINCT m.meeting_id) as total_meetings
FROM Clients c
JOIN Agencies a ON c.agency_id = a.agency_id
LEFT JOIN Invoices i ON c.client_id = i.client_id
LEFT JOIN Payments p ON i.invoice_id = p.invoice_id
LEFT JOIN Meetings m ON c.client_id = m.client_id
GROUP BY c.client_id, c.client_details, c.signup_date, a.agency_details;\n\n`;

  sql += `CREATE VIEW staff_utilization AS
SELECT 
    s.staff_id,
    s.staff_details,
    a.agency_details,
    COUNT(DISTINCT sim.meeting_id) as meetings_attended,
    COUNT(DISTINCT m.client_id) as unique_clients
FROM Staff s
JOIN Agencies a ON s.agency_id = a.agency_id
LEFT JOIN Staff_in_Meetings sim ON s.staff_id = sim.staff_id
LEFT JOIN Meetings m ON sim.meeting_id = m.meeting_id
GROUP BY s.staff_id, s.staff_details, a.agency_details;\n\n`;
  
  return sql;
};

// ENHANCED SYNTHETIC DATA GENERATOR with signup dates for cohort analysis
const generateSyntheticData = () => {
  const agencies = [
    "Creative Minds Agency", "Digital Solutions Ltd", "Brand Builders Inc",
    "Marketing Masters", "AdTech Partners", "Strategy First Agency"
  ];
  
  const sicCodes = [
    { code: "GOVT", desc: "Government" },
    { code: "CONST", desc: "Construction" },
    { code: "IND", desc: "Std Industrial Classification" },
    { code: "TECH", desc: "Technology" },
    { code: "RETAIL", desc: "Retail" }
  ];
  
  const statusCodes = [
    { code: "PAID", desc: "Paid" },
    { code: "PENDING", desc: "Pending" },
    { code: "DISPUTED", desc: "Disputed" }
  ];
  
  const meetingTypes = [
    { code: "INIT", desc: "Initial Pitch" },
    { code: "PRES", desc: "Presentation" },
    { code: "PROG", desc: "Progress Meeting" },
    { code: "REV", desc: "Review Meeting" }
  ];
  
  const meetingOutcomes = [
    { code: "ACCEPT", desc: "Pitch Accepted" },
    { code: "REJECT", desc: "Pitch Rejected" },
    { code: "FOLLOW", desc: "Follow-up Required" },
    { code: "COMPLETE", desc: "Completed Successfully" }
  ];
  
  const clientNames = [
    "Acme Corporation", "TechStart Inc", "Global Retail Co", "BuildRight LLC",
    "HealthCare Plus", "Finance First", "EduLearn Systems", "GreenEnergy Corp",
    "FoodDelight Chains", "AutoDrive Motors", "Fashion Forward", "HomeComfort Ltd",
    "SportGear Pro", "TravelEasy Agency", "PetCare Solutions"
  ];
  
  const staffNames = [
    "Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim",
    "Jessica Williams", "Robert Taylor", "Amanda Martinez", "James Anderson",
    "Lisa Thompson", "Christopher Lee", "Maria Garcia", "Daniel White"
  ];
  
  const agenciesData = agencies.map((name, idx) => ({
    agency_id: idx + 1,
    agency_details: name
  }));
  
  const sicCodesData = sicCodes.map(sc => ({
    sic_code: sc.code,
    sic_description: sc.desc
  }));
  
  const statusCodesData = statusCodes.map(st => ({
    invoice_status_code: st.code,
    invoice_status_description: st.desc
  }));
  
  const meetingTypesData = meetingTypes.map(mt => ({
    meeting_type_code: mt.code,
    meeting_type_description: mt.desc
  }));
  
  const meetingOutcomesData = meetingOutcomes.map(mo => ({
    meeting_outcome_code: mo.code,
    meeting_outcome_description: mo.desc
  }));
  
  const staffData = staffNames.map((name, idx) => ({
    staff_id: idx + 1,
    agency_id: Math.floor(Math.random() * agencies.length) + 1,
    staff_details: name
  }));
  
  // Generate Clients with signup dates for cohort analysis
  const clientsData = clientNames.map((name, idx) => {
    const monthsAgo = Math.floor(Math.random() * 12);
    const signupDate = new Date();
    signupDate.setMonth(signupDate.getMonth() - monthsAgo);
    
    return {
      client_id: idx + 1,
      agency_id: Math.floor(Math.random() * agencies.length) + 1,
      sic_code: sicCodes[Math.floor(Math.random() * sicCodes.length)].code,
      client_details: name,
      signup_date: signupDate.toISOString().split('T')[0]
    };
  });
  
  const meetingsData = [];
  let meetingId = 1;
  clientsData.forEach(client => {
    const numMeetings = Math.floor(Math.random() * 6) + 1;
    for (let i = 0; i < numMeetings; i++) {
      const monthsAgo = Math.floor(Math.random() * 12);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);
      startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1 + Math.floor(Math.random() * 2));
      
      meetingsData.push({
        meeting_id: meetingId++,
        client_id: client.client_id,
        meeting_type_code: meetingTypes[Math.floor(Math.random() * meetingTypes.length)].code,
        meeting_outcome_code: meetingOutcomes[Math.floor(Math.random() * meetingOutcomes.length)].code,
        billable_yn: Math.random() > 0.3 ? 'Y' : 'N',
        start_date_time: startDate.toISOString(),
        end_date_time: endDate.toISOString(),
        purpose_of_meeting: `Discuss ${['campaign strategy', 'creative concepts', 'budget allocation', 'performance metrics'][Math.floor(Math.random() * 4)]}`,
        other_details: `Meeting with ${client.client_details}`
      });
    }
  });
  
  const staffInMeetingsData = [];
  meetingsData.forEach(meeting => {
    const numStaff = Math.floor(Math.random() * 3) + 1;
    const selectedStaff = new Set();
    while (selectedStaff.size < numStaff) {
      const staffId = Math.floor(Math.random() * staffData.length) + 1;
      if (!selectedStaff.has(staffId)) {
        selectedStaff.add(staffId);
        staffInMeetingsData.push({
          meeting_id: meeting.meeting_id,
          staff_id: staffId
        });
      }
    }
  });
  
  const invoicesData = [];
  let invoiceId = 1;
  clientsData.forEach(client => {
    const numInvoices = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numInvoices; i++) {
      const monthsAgo = Math.floor(Math.random() * 12);
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      
      const statusWeights = [0.6, 0.3, 0.1];
      const rand = Math.random();
      let status = 'PAID';
      if (rand > 0.6 && rand <= 0.9) status = 'PENDING';
      else if (rand > 0.9) status = 'DISPUTED';
      
      invoicesData.push({
        invoice_id: invoiceId++,
        client_id: client.client_id,
        invoice_status_code: status,
        invoice_details: `Services for ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        amount: Math.floor(Math.random() * 50000) + 5000,
        invoice_date: date.toISOString().split('T')[0]
      });
    }
  });
  
  const paymentsData = [];
  let paymentId = 1;
  invoicesData.forEach(invoice => {
    if (invoice.invoice_status_code === 'PAID') {
      const paymentDate = new Date(invoice.invoice_date);
      paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 30) + 5);
      
      paymentsData.push({
        payment_id: paymentId++,
        invoice_id: invoice.invoice_id,
        payment_details: `Payment for Invoice ${invoice.invoice_id}`,
        amount: invoice.amount,
        payment_date: paymentDate.toISOString().split('T')[0]
      });
    }
  });
  
  return {
    agencies: agenciesData,
    clients: clientsData,
    staff: staffData,
    meetings: meetingsData,
    staff_in_meetings: staffInMeetingsData,
    invoices: invoicesData,
    payments: paymentsData,
    ref_sic_codes: sicCodesData,
    ref_invoice_status: statusCodesData,
    ref_meeting_types: meetingTypesData,
    ref_meeting_outcomes: meetingOutcomesData
  };
};

// REQUIREMENTS DOCUMENT GENERATOR
const generateRequirementsDoc = () => {
  return {
    title: "Analytics Requirements Document - Advertising Agency Platform",
    generatedFrom: "ER Diagram Analysis",
    stakeholders: [
      {
        role: "Operational Staff",
        level: "Basic",
        questions: [
          {
            question: "How many active clients do we have?",
            answerType: "Single Metric",
            sqlComplexity: "Simple",
            tables: ["Clients"]
          },
          {
            question: "Which agencies have the most clients?",
            answerType: "Ranked List",
            sqlComplexity: "Simple",
            tables: ["Agencies", "Clients"]
          },
          {
            question: "How many meetings were held last month?",
            answerType: "Single Metric",
            sqlComplexity: "Simple",
            tables: ["Meetings"]
          },
          {
            question: "What is the current invoice status breakdown?",
            answerType: "Distribution",
            sqlComplexity: "Simple",
            tables: ["Invoices", "Ref_Invoice_Status"]
          },
          {
            question: "Which staff members attended the most meetings?",
            answerType: "Ranked List",
            sqlComplexity: "Moderate",
            tables: ["Staff", "Staff_in_Meetings"]
          }
        ]
      },
      {
        role: "Managers",
        level: "Intermediate",
        questions: [
          {
            question: "What is the average invoice value by agency?",
            answerType: "Comparative Metrics",
            sqlComplexity: "Moderate",
            tables: ["Agencies", "Clients", "Invoices"]
          },
          {
            question: "Which industry sectors (SIC codes) generate the most revenue?",
            answerType: "Revenue Analysis",
            sqlComplexity: "Moderate",
            tables: ["Clients", "Ref_SIC_Codes", "Invoices"]
          },
          {
            question: "What is the meeting-to-deal conversion rate by meeting type?",
            answerType: "Conversion Funnel",
            sqlComplexity: "Complex",
            tables: ["Meetings", "Ref_Meeting_Types", "Ref_Meeting_Outcomes", "Invoices"]
          },
          {
            question: "How does staff utilization correlate with client satisfaction?",
            answerType: "Correlation Analysis",
            sqlComplexity: "Complex",
            tables: ["Staff", "Staff_in_Meetings", "Meetings", "Ref_Meeting_Outcomes"]
          },
          {
            question: "What is the average payment delay by invoice status?",
            answerType: "Time-based Metrics",
            sqlComplexity: "Moderate",
            tables: ["Invoices", "Payments"]
          },
          {
            question: "Which clients have the highest meeting frequency?",
            answerType: "Client Engagement Score",
            sqlComplexity: "Moderate",
            tables: ["Clients", "Meetings"]
          }
        ]
      },
      {
        role: "Executives",
        level: "Advanced",
        questions: [
          {
            question: "What is the client lifetime value (CLV) by industry segment?",
            answerType: "Advanced Metric",
            sqlComplexity: "Complex",
            tables: ["Clients", "Ref_SIC_Codes", "Invoices", "Payments", "Meetings"]
          },
          {
            question: "How do meeting outcomes correlate with invoice payment rates?",
            answerType: "Multi-dimensional Analysis",
            sqlComplexity: "Complex",
            tables: ["Meetings", "Ref_Meeting_Outcomes", "Invoices", "Payments"]
          },
          {
            question: "What are the key drivers of client churn risk?",
            answerType: "Predictive Analysis",
            sqlComplexity: "Complex",
            tables: ["Clients", "Meetings", "Invoices", "Payments"]
          },
          {
            question: "What is the ROI by agency and how does it trend over time?",
            answerType: "ROI Trend Analysis",
            sqlComplexity: "Complex",
            tables: ["Agencies", "Clients", "Invoices", "Payments", "Meetings", "Staff"]
          },
          {
            question: "How does staff allocation efficiency impact revenue per client?",
            answerType: "Efficiency Metrics",
            sqlComplexity: "Complex",
            tables: ["Staff", "Staff_in_Meetings", "Meetings", "Clients", "Invoices"]
          },
          {
            question: "What is the optimal meeting cadence for different client segments?",
            answerType: "Optimization Analysis",
            sqlComplexity: "Complex",
            tables: ["Clients", "Meetings", "Ref_Meeting_Types", "Invoices"]
          }
        ]
      }
    ]
  };
};

// PRD GENERATOR
const generatePRD = (requirementsDoc) => {
  return {
    title: "Product Requirements Document: Advertising Agency Analytics Platform",
    version: "1.0",
    date: new Date().toLocaleDateString(),
    
    sections: [
      {
        title: "1. Executive Summary",
        content: `This document outlines the requirements for an analytics platform designed for advertising agencies. The platform will provide comprehensive insights into client relationships, revenue performance, staff utilization, and operational efficiency. Based on analysis of the database schema encompassing ${parsedSchema.tables.length} core tables, this platform addresses the needs of three primary stakeholder groups: operational staff, managers, and executives.`
      },
      {
        title: "2. Business Context",
        content: `Advertising agencies manage complex relationships between multiple entities: agencies, clients, staff, meetings, and financial transactions. The platform must provide visibility into these relationships and enable data-driven decision making at all organizational levels. Key business drivers include improving client retention, optimizing staff utilization, accelerating payment cycles, and increasing revenue per client.`
      },
      {
        title: "3. Stakeholder Profiles",
        subsections: requirementsDoc.stakeholders.map(s => ({
          title: s.role,
          level: s.level,
          needs: `${s.role} require ${s.level.toLowerCase()}-level analytics focusing on ${s.questions.length} key question areas. Primary focus: ${s.questions[0].answerType.toLowerCase()} and operational visibility.`,
          keyQuestions: s.questions.length
        }))
      },
      {
        title: "4. Functional Requirements",
        subsections: [
          {
            title: "4.1 Data Integration",
            items: [
              "Real-time synchronization with operational database",
              "Support for batch data imports from CSV/Excel",
              "API endpoints for third-party integrations",
              "Data validation and quality checks on import"
            ]
          },
          {
            title: "4.2 Dashboard Capabilities",
            items: [
              "Role-based dashboard access (Executive, Finance, Operations, Sales)",
              "Customizable KPI widgets and metrics",
              "Interactive drill-down capabilities",
              "Export functionality (PDF, Excel, Power BI)",
              "Scheduled report generation and distribution"
            ]
          },
          {
            title: "4.3 Advanced Analytics",
            items: [
              "Cohort analysis for client retention tracking",
              "Revenue retention curves by signup cohort",
              "Predictive churn risk scoring",
              "Staff utilization and efficiency metrics",
              "Meeting outcome correlation analysis"
            ]
          },
          {
            title: "4.4 Reporting",
            items: [
              "Ad-hoc query builder for custom reports",
              "Automated email delivery of scheduled reports",
              "Executive summary reports with key insights",
              "Exportable data tables in multiple formats"
            ]
          }
        ]
      },
      {
        title: "5. Dashboard Specifications",
        subsections: [
          {
            title: "5.1 Executive Dashboard",
            components: [
              "KPI Cards: Total Clients, Revenue, Payment Rate, Avg Invoice",
              "Revenue by Agency (Bar Chart)",
              "Industry Revenue Distribution (Pie Chart)",
              "6-Month Revenue Trend (Area Chart)",
              "Meeting Outcomes (Pie Chart)",
              "Cohort Retention Analysis (Line Chart)"
            ]
          },
          {
            title: "5.2 Finance Dashboard",
            components: [
              "KPI Cards: Total Revenue, Outstanding AR, Payment Rate, Invoices",
              "Invoice Status Distribution (Stacked Bar)",
              "AR Aging Analysis (Bar Chart)",
              "Revenue Trend (Line Chart)",
              "Payment Velocity Metrics"
            ]
          },
          {
            title: "5.3 Operations Dashboard",
            components: [
              "KPI Cards: Staff Count, Meetings, Utilization, Clients",
              "Staff Utilization Top Performers (Horizontal Bar)",
              "Billable vs Non-Billable Split (Pie Chart)",
              "Meeting Outcomes (Bar Chart)",
              "Client Distribution by Agency"
            ]
          },
          {
            title: "5.4 Sales Dashboard",
            components: [
              "KPI Cards: Active Clients, Meetings, Revenue/Client, Success Rate",
              "Revenue by Agency with Client Count (Dual Axis)",
              "Client Distribution by Industry (Pie Chart)",
              "Meeting Outcomes (Bar Chart)",
              "Revenue Trends (Line Chart)"
            ]
          }
        ]
      },
      {
        title: "6. Data Requirements",
        subsections: [
          {
            title: "6.1 Refresh Frequency",
            content: "Executive/Finance dashboards: Daily refresh at 6 AM. Operations/Sales dashboards: Real-time or hourly refresh. Cohort analysis: Weekly refresh."
          },
          {
            title: "6.2 Data Retention",
            content: "Maintain 24 months of historical data for trending. Archive data older than 24 months to cold storage. Cohort analysis requires minimum 12 months of data."
          },
          {
            title: "6.3 Performance Requirements",
            content: "Dashboard load time: < 3 seconds. Query response time: < 5 seconds for standard queries. Export generation: < 30 seconds for datasets up to 10,000 rows."
          }
        ]
      },
      {
        title: "7. Success Metrics",
        subsections: [
          {
            title: "7.1 Platform Adoption",
            metrics: ["Daily Active Users (DAU) > 80% of target users", "Average session duration > 10 minutes", "Dashboard interaction rate > 60%"]
          },
          {
            title: "7.2 Business Impact",
            metrics: ["Reduction in payment cycle time by 15%", "Improvement in client retention by 10%", "Increase in staff utilization by 12%", "Revenue growth correlation with platform insights"]
          }
        ]
      },
      {
        title: "8. Technical Stack Recommendations",
        content: `Frontend: React with Recharts for visualizations. Backend: Python (FastAPI) or Node.js. Database: PostgreSQL or SQL Server. BI Integration: Power BI, Tableau compatibility. Authentication: OAuth 2.0 / SSO. Hosting: Cloud (AWS/Azure) with auto-scaling.`
      }
    ]
  };
};

// POWER BI EXPORT HELPERS
const generatePowerBIResources = (syntheticData) => {
  // Generate DAX measures
  const daxMeasures = `// DAX Measures for Power BI
// Copy these into your Power BI model

Total Revenue = SUM(Invoices[amount])

Total Payments = SUM(Payments[amount])

Payment Rate = DIVIDE([Total Payments], [Total Revenue], 0)

Outstanding AR = [Total Revenue] - [Total Payments]

Average Invoice = AVERAGE(Invoices[amount])

Total Clients = DISTINCTCOUNT(Clients[client_id])

Total Meetings = COUNTROWS(Meetings)

Billable Meetings = CALCULATE(COUNTROWS(Meetings), Meetings[billable_yn] = "Y")

Billable Percentage = DIVIDE([Billable Meetings], [Total Meetings], 0)

Client Lifetime Value = 
CALCULATE(
    [Total Revenue],
    ALLEXCEPT(Clients, Clients[client_id])
)

Revenue Growth MoM = 
VAR CurrentMonth = [Total Revenue]
VAR PreviousMonth = CALCULATE([Total Revenue], DATEADD('Date'[Date], -1, MONTH))
RETURN DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth, 0)

Active Clients This Month = 
CALCULATE(
    DISTINCTCOUNT(Meetings[client_id]),
    DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -1, MONTH)
)

Retention Rate = 
VAR ClientsLastMonth = 
    CALCULATE(
        DISTINCTCOUNT(Clients[client_id]),
        DATEADD('Date'[Date], -1, MONTH)
    )
VAR ClientsStillActive = 
    CALCULATE(
        DISTINCTCOUNT(Clients[client_id]),
        FILTER(
            ALL('Date'),
            'Date'[Date] = MAX('Date'[Date])
        )
    )
RETURN DIVIDE(ClientsStillActive, ClientsLastMonth, 0)
`;

  // Generate Power BI import script
  const powerBIScript = `# Power BI Import Instructions

## Step 1: Import Data
1. Open Power BI Desktop
2. Click "Get Data" > "Text/CSV"
3. Import each CSV file:
   - agencies.csv
   - clients.csv
   - staff.csv
   - meetings.csv
   - invoices.csv
   - payments.csv
   - staff_in_meetings.csv
   - ref_*.csv files

## Step 2: Create Relationships
In the Model view, create these relationships:
1. Clients[agency_id] → Agencies[agency_id] (Many-to-One)
2. Clients[sic_code] → Ref_SIC_Codes[sic_code] (Many-to-One)
3. Invoices[client_id] → Clients[client_id] (Many-to-One)
4. Invoices[invoice_status_code] → Ref_Invoice_Status[invoice_status_code] (Many-to-One)
5. Payments[invoice_id] → Invoices[invoice_id] (Many-to-One)
6. Meetings[client_id] → Clients[client_id] (Many-to-One)
7. Meetings[meeting_type_code] → Ref_Meeting_Types[meeting_type_code] (Many-to-One)
8. Meetings[meeting_outcome_code] → Ref_Meeting_Outcomes[meeting_outcome_code] (Many-to-One)
9. Staff[agency_id] → Agencies[agency_id] (Many-to-One)
10. Staff_in_Meetings[meeting_id] → Meetings[meeting_id] (Many-to-One)
11. Staff_in_Meetings[staff_id] → Staff[staff_id] (Many-to-One)

## Step 3: Create Date Table
Power Query (M) code:
\`\`\`
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
    #"Added Quarter" = Table.AddColumn(#"Added Month Name", "Quarter", each "Q" & Number.ToText(Date.QuarterOfYear([Date])))
in
    #"Added Quarter"
\`\`\`

## Step 4: Add DAX Measures
Copy the DAX measures from the DAX Measures tab and create them in your model.

## Step 5: Create Visualizations
Use the dashboard specifications from the PRD to build:
- Executive Dashboard
- Finance Dashboard
- Operations Dashboard
- Sales Dashboard
`;

  return { daxMeasures, powerBIScript };
};

const App = () => {
  const [activeTab, setActiveTab] = useState('schema');
  const [activeDashboard, setActiveDashboard] = useState('executive');
  const [loading, setLoading] = useState(false);
  const [scrapedContext, setScrapedContext] = useState(null);
  
  const syntheticData = useMemo(() => generateSyntheticData(), []);
  const sqlCode = useMemo(() => generateSQL(), []);
  const requirementsDoc = useMemo(() => generateRequirementsDoc(), []);
  const prdDoc = useMemo(() => generatePRD(requirementsDoc), [requirementsDoc]);
  const powerBIResources = useMemo(() => generatePowerBIResources(syntheticData), [syntheticData]);
  
  // ADVANCED ANALYTICS: Cohort Analysis
  const cohortData = useMemo(() => {
    const cohorts = {};
    
    // Group clients by signup month
    syntheticData.clients.forEach(client => {
      const cohortMonth = client.signup_date.substring(0, 7);
      if (!cohorts[cohortMonth]) {
        cohorts[cohortMonth] = [];
      }
      cohorts[cohortMonth].push(client.client_id);
    });
    
    // Calculate retention for each cohort
    const cohortRetention = Object.keys(cohorts).sort().map(cohortMonth => {
      const cohortSize = cohorts[cohortMonth].length;
      const cohortDate = new Date(cohortMonth + '-01');
      
      // Calculate retention at different months
      const retention = [];
      for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
        const targetDate = new Date(cohortDate);
        targetDate.setMonth(targetDate.getMonth() + monthOffset);
        const targetMonth = targetDate.toISOString().substring(0, 7);
        
        // Count clients from this cohort that had activity in target month
        const activeClients = cohorts[cohortMonth].filter(clientId => {
          return syntheticData.invoices.some(inv => 
            inv.client_id === clientId && 
            inv.invoice_date.startsWith(targetMonth)
          );
        }).length;
        
        retention.push({
          month: monthOffset,
          rate: cohortSize > 0 ? (activeClients / cohortSize * 100).toFixed(1) : 0,
          count: activeClients
        });
      }
      
      return {
        cohort: new Date(cohortMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cohortMonth,
        size: cohortSize,
        retention
      };
    });
    
    // Average retention curve across all cohorts
    const avgRetention = [];
    for (let month = 0; month <= 6; month++) {
      const rates = cohortRetention
        .map(c => parseFloat(c.retention[month]?.rate || 0))
        .filter(r => r > 0);
      const avg = rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) : 0;
      avgRetention.push({
        month: `Month ${month}`,
        retention: parseFloat(avg)
      });
    }
    
    return { cohortRetention, avgRetention };
  }, [syntheticData]);
  
  // Revenue Cohort Analysis
  const revenueCohorts = useMemo(() => {
    const cohorts = {};
    
    syntheticData.clients.forEach(client => {
      const cohortMonth = client.signup_date.substring(0, 7);
      if (!cohorts[cohortMonth]) {
        cohorts[cohortMonth] = { clients: [], revenue: [] };
      }
      cohorts[cohortMonth].clients.push(client.client_id);
    });
    
    return Object.keys(cohorts).sort().slice(-6).map(cohortMonth => {
      const cohortClients = cohorts[cohortMonth].clients;
      const revenue = syntheticData.invoices
        .filter(inv => cohortClients.includes(inv.client_id))
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      return {
        cohort: new Date(cohortMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(revenue),
        clientCount: cohortClients.length,
        revenuePerClient: cohortClients.length > 0 ? Math.round(revenue / cohortClients.length) : 0
      };
    });
  }, [syntheticData]);
  
  // Dashboard Analytics (existing code)
  const dashboardData = useMemo(() => {
    const revenueByAgency = syntheticData.agencies.map(agency => {
      const agencyClients = syntheticData.clients.filter(c => c.agency_id === agency.agency_id);
      const clientIds = agencyClients.map(c => c.client_id);
      const revenue = syntheticData.invoices
        .filter(i => clientIds.includes(i.client_id))
        .reduce((sum, i) => sum + i.amount, 0);
      
      return {
        name: agency.agency_details.split(' ')[0],
        revenue: Math.round(revenue),
        clients: agencyClients.length
      };
    });
    
    const statusDistribution = syntheticData.ref_invoice_status.map(status => {
      const count = syntheticData.invoices.filter(i => i.invoice_status_code === status.invoice_status_code).length;
      const amount = syntheticData.invoices
        .filter(i => i.invoice_status_code === status.invoice_status_code)
        .reduce((sum, i) => sum + i.amount, 0);
      return {
        name: status.invoice_status_description,
        value: count,
        amount: Math.round(amount)
      };
    });
    
    const monthlyRevenue = {};
    syntheticData.invoices.forEach(invoice => {
      const month = invoice.invoice_date.substring(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + invoice.amount;
    });
    const revenueTrend = Object.keys(monthlyRevenue)
      .sort()
      .slice(-6)
      .map(month => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(monthlyRevenue[month])
      }));
    
    const industryDistribution = syntheticData.ref_sic_codes.map(sic => {
      const clients = syntheticData.clients.filter(c => c.sic_code === sic.sic_code);
      const clientIds = clients.map(c => c.client_id);
      const revenue = syntheticData.invoices
        .filter(i => clientIds.includes(i.client_id))
        .reduce((sum, i) => sum + i.amount, 0);
      
      return {
        name: sic.sic_description,
        value: clients.length,
        revenue: Math.round(revenue)
      };
    });
    
    const meetingOutcomes = syntheticData.ref_meeting_outcomes.map(outcome => {
      const count = syntheticData.meetings.filter(m => m.meeting_outcome_code === outcome.meeting_outcome_code).length;
      return {
        name: outcome.meeting_outcome_description,
        value: count
      };
    });
    
    const staffUtilization = syntheticData.staff.map(staff => {
      const meetings = syntheticData.staff_in_meetings.filter(sim => sim.staff_id === staff.staff_id);
      return {
        name: staff.staff_details.split(' ')[0],
        meetings: meetings.length
      };
    }).sort((a, b) => b.meetings - a.meetings).slice(0, 6);
    
    const arAging = syntheticData.invoices
      .filter(i => i.invoice_status_code === 'PENDING' || i.invoice_status_code === 'DISPUTED')
      .map(invoice => {
        const daysOld = Math.floor((new Date() - new Date(invoice.invoice_date)) / (1000 * 60 * 60 * 24));
        let category = '0-30 days';
        if (daysOld > 30 && daysOld <= 60) category = '31-60 days';
        else if (daysOld > 60 && daysOld <= 90) category = '61-90 days';
        else if (daysOld > 90) category = '90+ days';
        
        return { category, amount: invoice.amount };
      })
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.category === curr.category);
        if (existing) {
          existing.amount += curr.amount;
        } else {
          acc.push({ category: curr.category, amount: curr.amount });
        }
        return acc;
      }, [])
      .map(item => ({ ...item, amount: Math.round(item.amount) }));
    
    const billableBreakdown = [
      {
        name: 'Billable',
        value: syntheticData.meetings.filter(m => m.billable_yn === 'Y').length
      },
      {
        name: 'Non-Billable',
        value: syntheticData.meetings.filter(m => m.billable_yn === 'N').length
      }
    ];
    
    const totalRevenue = syntheticData.invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPayments = syntheticData.payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentRate = ((totalPayments / totalRevenue) * 100).toFixed(1);
    const avgInvoice = Math.round(totalRevenue / syntheticData.invoices.length);
    
    return {
      revenueByAgency,
      statusDistribution,
      revenueTrend,
      industryDistribution,
      meetingOutcomes,
      staffUtilization,
      arAging,
      billableBreakdown,
      kpis: {
        totalClients: syntheticData.clients.length,
        totalInvoices: syntheticData.invoices.length,
        totalRevenue: Math.round(totalRevenue),
        paymentRate,
        totalMeetings: syntheticData.meetings.length,
        avgInvoice,
        totalStaff: syntheticData.staff.length,
        outstandingAR: Math.round(totalRevenue - totalPayments)
      }
    };
  }, [syntheticData]);
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  const downloadData = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };
  
  const downloadRequirements = () => {
    let text = `${requirementsDoc.title}\n`;
    text += `${'='.repeat(requirementsDoc.title.length)}\n\n`;
    text += `Generated From: ${requirementsDoc.generatedFrom}\n\n`;
    
    requirementsDoc.stakeholders.forEach(stakeholder => {
      text += `\n${'='.repeat(60)}\n`;
      text += `STAKEHOLDER: ${stakeholder.role.toUpperCase()}\n`;
      text += `LEVEL: ${stakeholder.level}\n`;
      text += `${'='.repeat(60)}\n\n`;
      
      stakeholder.questions.forEach((q, idx) => {
        text += `${idx + 1}. ${q.question}\n`;
        text += `   Answer Type: ${q.answerType}\n`;
        text += `   SQL Complexity: ${q.sqlComplexity}\n`;
        text += `   Tables Required: ${q.tables.join(', ')}\n\n`;
      });
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements_document.txt';
    a.click();
  };
  
  const downloadPRD = () => {
    let text = `${prdDoc.title}\n`;
    text += `${'='.repeat(prdDoc.title.length)}\n`;
    text += `Version: ${prdDoc.version} | Date: ${prdDoc.date}\n\n`;
    
    prdDoc.sections.forEach(section => {
      text += `\n${section.title}\n`;
      text += `${'-'.repeat(section.title.length)}\n\n`;
      
      if (section.content) {
        text += `${section.content}\n`;
      }
      
      if (section.subsections) {
        section.subsections.forEach(sub => {
          text += `\n  ${sub.title || sub.role}\n`;
          if (sub.content) text += `  ${sub.content}\n`;
          if (sub.needs) text += `  Needs: ${sub.needs}\n`;
          if (sub.level) text += `  Level: ${sub.level}\n`;
          if (sub.items) {
            sub.items.forEach(item => text += `    • ${item}\n`);
          }
          if (sub.components) {
            sub.components.forEach(comp => text += `    • ${comp}\n`);
          }
          if (sub.metrics) {
            sub.metrics.forEach(metric => text += `    • ${metric}\n`);
          }
        });
      }
      
      text += '\n';
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PRD_advertising_agency_analytics.txt';
    a.click();
  };
  
  const downloadAllData = () => {
    Object.keys(syntheticData).forEach(tableName => {
      if (Array.isArray(syntheticData[tableName]) && syntheticData[tableName].length > 0) {
        downloadData(syntheticData[tableName], `${tableName}.csv`);
      }
    });
  };
  
  // WEB SCRAPER - Uses Claude API to gather business context
  const scrapeBusinessContext = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Research the advertising agency industry and provide key business context for an analytics platform. Include:
1. Industry size and growth trends
2. Key performance metrics used in the industry
3. Common pain points in agency operations
4. Best practices for client retention
5. Typical technology stack

Provide a structured summary in JSON format with sections for each topic.`
          }]
        })
      });
      
      const data = await response.json();
      const context = data.content[0].text;
      setScrapedContext(context);
    } catch (error) {
      setScrapedContext('Error fetching context. Please check API connectivity.');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate deployment script
  const generateDeploymentScript = () => {
    return `#!/bin/bash
# Deployment Script for Advertising Agency Analytics Platform
# Generated: ${new Date().toLocaleString()}

echo "Starting deployment process..."

# Step 1: Database Setup
echo "Step 1: Setting up database..."
psql -U postgres -c "CREATE DATABASE advertising_analytics;"
psql -U postgres -d advertising_analytics -f schema.sql

# Step 2: Load Data
echo "Step 2: Loading synthetic data..."
for file in *.csv; do
    table_name=\${file%.csv}
    psql -U postgres -d advertising_analytics -c "\\copy \$table_name FROM '\$file' CSV HEADER;"
    echo "Loaded \$file into \$table_name"
done

# Step 3: Create Indexes
echo "Step 3: Creating performance indexes..."
psql -U postgres -d advertising_analytics <<EOF
CREATE INDEX idx_clients_agency ON Clients(agency_id);
CREATE INDEX idx_invoices_client ON Invoices(client_id);
CREATE INDEX idx_invoices_date ON Invoices(invoice_date);
CREATE INDEX idx_payments_invoice ON Payments(invoice_id);
CREATE INDEX idx_meetings_client ON Meetings(client_id);
CREATE INDEX idx_meetings_date ON Meetings(start_date_time);
CREATE INDEX idx_staff_meetings ON Staff_in_Meetings(meeting_id, staff_id);
EOF

# Step 4: Grant Permissions
echo "Step 4: Setting up user permissions..."
psql -U postgres -d advertising_analytics <<EOF
CREATE USER analytics_user WITH PASSWORD 'secure_password_here';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO analytics_user;
EOF

# Step 5: Setup Power BI Gateway (Windows)
echo "Step 5: Power BI Gateway configuration..."
echo "Install Power BI Gateway from: https://powerbi.microsoft.com/en-us/gateway/"
echo "Configure connection string: Server=localhost;Database=advertising_analytics;User=analytics_user;"

# Step 6: Deploy Dashboard
echo "Step 6: Dashboard deployment..."
# Option A: Streamlit
# pip install streamlit plotly pandas psycopg2
# streamlit run dashboard.py --server.port 8501

# Option B: Power BI
# Open Power BI Desktop
# Import data using connection string above
# Load .pbix template from powerbi_template folder

# Step 7: Schedule Data Refresh
echo "Step 7: Setting up scheduled refresh..."
# Add to crontab for daily refresh at 6 AM
# 0 6 * * * /path/to/refresh_data.sh

echo "Deployment complete!"
echo "Access dashboard at: http://localhost:8501 (Streamlit)"
echo "Or open Power BI Desktop and connect to database"
`;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Complete ER Diagram Pipeline with Advanced Analytics
          </h1>
          <p className="text-gray-600">
            Parse → SQL → Data → Requirements → PRD → Dashboards → Deploy
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {[
              { id: 'vision', icon: Image, label: 'Vision API' },
              { id: 'schema', icon: Database, label: 'Schema' },
              { id: 'sql', icon: FileText, label: 'SQL' },
              { id: 'data', icon: Table, label: 'Data' },
              { id: 'requirements', icon: FileText, label: 'Requirements' },
              { id: 'prd', icon: FileCode, label: 'PRD' },
              { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
              { id: 'dashboard', icon: BarChart3, label: 'Dashboards' },
              { id: 'powerbi', icon: Package, label: 'Power BI' },
              { id: 'deploy', icon: Zap, label: 'Deploy' },
              { id: 'scraper', icon: Globe, label: 'Context' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {/* Vision API Tab */}
            {activeTab === 'vision' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3 text-lg">Claude Vision API Integration</h3>
                  <p className="text-blue-800 mb-4">
                    Use Claude's Vision API to automatically parse ER diagrams from images.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 text-lg">Python Implementation:</h4>
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
{`import anthropic
import base64
import json

def parse_er_diagram(image_path):
    """Parse an ER diagram image using Claude Vision API"""
    
    client = anthropic.Anthropic(api_key="your-api-key-here")
    
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    
    media_type = "image/png"
    if image_path.lower().endswith(('.jpg', '.jpeg')):
        media_type = "image/jpeg"
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": """Analyze this ER diagram and extract schema as JSON:
{
  "tables": [
    {
      "name": "TableName",
      "columns": [
        {
          "name": "column_name",
          "type": "DATA_TYPE",
          "primaryKey": true/false,
          "foreignKey": "RefTable(refColumn)" or null
        }
      ]
    }
  ]
}"""
                }
            ]
        }]
    )
    
    response_text = message.content[0].text
    schema = json.loads(response_text.strip())
    return schema

schema = parse_er_diagram("advertising_agency_er.png")
print(json.dumps(schema, indent=2))`}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Schema Tab */}
            {activeTab === 'schema' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">✓ Complete Schema Extracted</h3>
                  <p className="text-green-700 text-sm">
                    {parsedSchema.tables.length} tables with full relationships including signup dates for cohort analysis
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedSchema.tables.map(table => (
                    <div key={table.name} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">{table.name}</h3>
                      <div className="space-y-2">
                        {table.columns.map(col => (
                          <div key={col.name} className="flex items-center gap-3 text-sm">
                            <span className="font-mono bg-white px-3 py-1 rounded border border-gray-300 min-w-[150px]">
                              {col.name}
                            </span>
                            <span className="text-gray-600 text-xs">{col.type}</span>
                            {col.primaryKey && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                PK
                              </span>
                            )}
                            {col.foreignKey && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                FK
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* SQL Tab */}
            {activeTab === 'sql' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Generated SQL DDL with Views</h3>
                  <button
                    onClick={() => {
                      const blob = new Blob([sqlCode], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'schema.sql';
                      a.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Download SQL
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-[600px]">
                  {sqlCode}
                </pre>
              </div>
            )}
            
            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 mr-4">
                    <h3 className="font-semibold text-green-900 mb-2">✓ Complete Dataset Generated</h3>
                    <p className="text-green-700 text-sm">
                      {syntheticData.invoices.length} invoices, {syntheticData.meetings.length} meetings, {syntheticData.staff_in_meetings.length} staff assignments
                    </p>
                  </div>
                  <button
                    onClick={downloadAllData}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={20} />
                    Download All CSVs
                  </button>
                </div>
                
                {['clients', 'staff', 'meetings', 'invoices'].map(tableName => (
                  <div key={tableName}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {tableName.replace('_', ' ')} ({syntheticData[tableName].length} records)
                      </h3>
                      <button
                        onClick={() => downloadData(syntheticData[tableName], `${tableName}.csv`)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Download CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 rounded-lg text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {Object.keys(syntheticData[tableName][0]).map(key => (
                              <th key={key} className="px-4 py-2 text-left font-semibold">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {syntheticData[tableName].slice(0, 3).map((row, idx) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-2">
                                  {typeof val === 'string' && val.length > 30 
                                    ? val.substring(0, 30) + '...' 
                                    : typeof val === 'number' && val > 1000
                                    ? val.toLocaleString()
                                    : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Requirements Tab */}
            {activeTab === 'requirements' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">{requirementsDoc.title}</h2>
                  <button
                    onClick={downloadRequirements}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
                
                {requirementsDoc.stakeholders.map((stakeholder, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{stakeholder.role}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                          stakeholder.level === 'Basic' ? 'bg-green-100 text-green-700' :
                          stakeholder.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {stakeholder.level} Level
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {stakeholder.questions.map((q, qIdx) => (
                        <div key={qIdx} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50 rounded">
                          <h4 className="font-semibold text-gray-800 mb-2">
                            {qIdx + 1}. {q.question}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {q.answerType}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              q.sqlComplexity === 'Simple' ? 'bg-green-100 text-green-700' :
                              q.sqlComplexity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              SQL: {q.sqlComplexity}
                            </span>
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {q.tables.join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* PRD Tab */}
            {activeTab === 'prd' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">{prdDoc.title}</h2>
                  <button
                    onClick={downloadPRD}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Download size={16} />
                    Download PRD
                  </button>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800">
                    <strong>Version:</strong> {prdDoc.version} | <strong>Date:</strong> {prdDoc.date}
                  </p>
                </div>
                
                {prdDoc.sections.map((section, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">{section.title}</h3>
                    
                    {section.content && (
                      <p className="text-gray-700 mb-4">{section.content}</p>
                    )}
                    
                    {section.subsections && (
                      <div className="space-y-4">
                        {section.subsections.map((sub, subIdx) => (
                          <div key={subIdx} className="ml-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">
                              {sub.title || sub.role}
                            </h4>
                            {sub.content && <p className="text-gray-600 text-sm mb-2">{sub.content}</p>}
                            {sub.needs && <p className="text-gray-600 text-sm mb-2"><strong>Needs:</strong> {sub.needs}</p>}
                            {sub.items && (
                              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                {sub.items.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                            {sub.components && (
                              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                {sub.components.map((comp, i) => (
                                  <li key={i}>{comp}</li>
                                ))}
                              </ul>
                            )}
                            {sub.metrics && (
                              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                {sub.metrics.map((metric, i) => (
                                  <li key={i}>{metric}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Advanced Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics: Cohort & Retention Analysis</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Total Cohorts</div>
                    <div className="text-3xl font-bold mt-2">{cohortData.cohortRetention.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Avg Month-0 Size</div>
                    <div className="text-3xl font-bold mt-2">
                      {(cohortData.cohortRetention.reduce((sum, c) => sum + c.size, 0) / cohortData.cohortRetention.length).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Month-6 Retention</div>
                    <div className="text-3xl font-bold mt-2">
                      {cohortData.avgRetention[6]?.retention || 0}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Average Retention Curve Across All Cohorts</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cohortData.avgRetention}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Revenue by Signup Cohort</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueCohorts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cohort" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Total Revenue ($)" />
                      <Bar yAxisId="right" dataKey="clientCount" fill="#10b981" name="Clients" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Revenue Per Client by Cohort</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueCohorts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cohort" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                      <Line type="monotone" dataKey="revenuePerClient" stroke="#8b5cf6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">📊 Cohort Analysis Insights</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li>• Cohort analysis tracks client groups based on their signup month</li>
                    <li>• Retention curves show how many clients remain active over time</li>
                    <li>• Revenue per client metrics help identify high-value cohorts</li>
                    <li>• Use these insights to optimize client acquisition strategies</li>
                    <li>• Compare cohort performance to identify seasonal patterns</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Dashboard Tab - keeping existing content */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                  {[
                    { id: 'executive', icon: TrendingUp, label: 'Executive', color: 'blue' },
                    { id: 'finance', icon: DollarSign, label: 'Finance', color: 'green' },
                    { id: 'operations', icon: Users, label: 'Operations', color: 'purple' },
                    { id: 'sales', icon: Calendar, label: 'Sales', color: 'orange' }
                  ].map(dash => (
                    <button
                      key={dash.id}
                      onClick={() => setActiveDashboard(dash.id)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                        activeDashboard === dash.id
                          ? `bg-${dash.color}-600 text-white shadow-lg`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <dash.icon size={20} />
                      {dash.label}
                    </button>
                  ))}
                </div>
                
                {/* Executive Dashboard */}
                {activeDashboard === 'executive' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Executive Dashboard</h2>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Total Clients</div>
                        <div className="text-3xl font-bold mt-2">{dashboardData.kpis.totalClients}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Total Revenue</div>
                        <div className="text-3xl font-bold mt-2">${(dashboardData.kpis.totalRevenue / 1000).toFixed(0)}K</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Payment Rate</div>
                        <div className="text-3xl font-bold mt-2">{dashboardData.kpis.paymentRate}%</div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Avg Invoice</div>
                        <div className="text-3xl font-bold mt-2">${(dashboardData.kpis.avgInvoice / 1000).toFixed(0)}K</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Revenue by Agency</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={dashboardData.revenueByAgency}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Industry Revenue</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={dashboardData.industryDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, revenue }) => `${name}: ${(revenue/1000).toFixed(0)}K`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="revenue"
                            >
                              {dashboardData.industryDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={dashboardData.revenueTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98130" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Meeting Outcomes</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={dashboardData.meetingOutcomes}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {dashboardData.meetingOutcomes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Other dashboards abbreviated for space */}
                {activeDashboard === 'finance' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Finance Dashboard</h2>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Total Revenue', value: `${(dashboardData.kpis.totalRevenue / 1000).toFixed(0)}K`, color: 'green' },
                        { label: 'Outstanding AR', value: `${(dashboardData.kpis.outstandingAR / 1000).toFixed(0)}K`, color: 'blue' },
                        { label: 'Payment Rate', value: `${dashboardData.kpis.paymentRate}%`, color: 'purple' },
                        { label: 'Total Invoices', value: dashboardData.kpis.totalInvoices, color: 'orange' }
                      ].map((kpi, i) => (
                        <div key={i} className={`bg-gradient-to-br from-${kpi.color}-500 to-${kpi.color}-600 rounded-lg p-6 text-white`}>
                          <div className="text-sm opacity-90">{kpi.label}</div>
                          <div className="text-3xl font-bold mt-2">{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-4">AR Aging Analysis</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboardData.arAging}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                          <Bar dataKey="amount" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {activeDashboard === 'operations' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Operations Dashboard</h2>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-4">Staff Utilization</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboardData.staffUtilization} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="meetings" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {activeDashboard === 'sales' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Sales Dashboard</h2>
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-4">Revenue by Agency</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboardData.revenueByAgency}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" />
                          <Bar yAxisId="right" dataKey="clients" fill="#10b981" name="Clients" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Power BI Tab */}
            {activeTab === 'powerbi' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Power BI Export Resources</h2>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-900 mb-3">📊 Power BI Integration Guide</h3>
                  <p className="text-yellow-800">
                    Complete resources for importing data into Power BI and creating professional dashboards.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 text-lg">DAX Measures</h3>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([powerBIResources.daxMeasures], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'power_bi_measures.dax';
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <Download size={16} />
                      Download DAX
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
                    {powerBIResources.daxMeasures}
                  </pre>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 text-lg">Power BI Import Instructions</h3>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([powerBIResources.powerBIScript], { type: 'text/markdown' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'power_bi_instructions.md';
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <Download size={16} />
                      Download Instructions
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
                    {powerBIResources.powerBIScript}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Deploy Tab */}
            {activeTab === 'deploy' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Deployment Script & Guide</h2>
                
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-3">🚀 Automated Deployment</h3>
                  <p className="text-green-800">
                    Complete bash script for deploying database, loading data, and setting up dashboards.
                  </p>
                </div>
                
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      const script = generateDeploymentScript();
                      const blob = new Blob([script], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'deploy.sh';
                      a.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={16} />
                    Download deploy.sh
                  </button>
                </div>
                
                <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-[600px]">
                  {generateDeploymentScript()}
                </pre>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">📋 Deployment Checklist</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li>✓ Download all CSV files from the Data tab</li>
                    <li>✓ Download schema.sql from the SQL tab</li>
                    <li>✓ Download deploy.sh script</li>
                    <li>✓ Ensure PostgreSQL is installed and running</li>
                    <li>✓ Update database credentials in script</li>
                    <li>✓ Make script executable: chmod +x deploy.sh</li>
                    <li>✓ Run deployment: ./deploy.sh</li>
                    <li>✓ Verify data import with sample queries</li>
                    <li>✓ Import into Power BI or connect dashboard</li>
                  </ul>
                </div>
              </div>
            )}
            
            {/* Web Scraper / Context Tab */}
            {activeTab === 'scraper' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Business Context Research</h2>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                  <h3 className="font-semibold text-indigo-900 mb-3">🌐 AI-Powered Context Gathering</h3>
                  <p className="text-indigo-800 mb-4">
                    Use Claude API to research industry trends, best practices, and business context for your analytics platform.
                  </p>
                  <button
                    onClick={scrapeBusinessContext}
                    disabled={loading}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Globe size={20} />
                    {loading ? 'Researching...' : 'Research Industry Context'}
                  </button>
                </div>
                
                {scrapedContext && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800">Research Results</h3>
                      <button
                        onClick={() => {
                          const blob = new Blob([scrapedContext], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'business_context.txt';
                          a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                    <pre className="bg-gray-50 p-6 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                      {scrapedContext}
                    </pre>
                  </div>
                )}
                
                {!scrapedContext && !loading && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <Globe size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Click the button above to research advertising agency industry context using Claude API
                    </p>
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-900 mb-3">💡 What You'll Get</h3>
                  <ul className="space-y-2 text-yellow-800 text-sm">
                    <li>• Industry size and growth trends</li>
                    <li>• Key performance metrics and benchmarks</li>
                    <li>• Common operational challenges</li>
                    <li>• Client retention best practices</li>
                    <li>• Technology stack recommendations</li>
                    <li>• Competitive landscape insights</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;