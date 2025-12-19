import type { Schema, RequirementsDocument, StakeholderRequirements, Question } from '@er-analytics/core';

export function generateRequirements(schema: Schema): RequirementsDocument {
  const domain = inferBusinessDomain(schema);
  
  return {
    title: `Analytics Requirements Document - ${domain} Platform`,
    generatedFrom: 'ER Diagram Analysis',
    stakeholders: [
      generateOperationalQuestions(schema),
      generateDataAnalystQuestions(schema),
      generateManagerQuestions(schema),
      generateFinanceQuestions(schema),
      generateSalesQuestions(schema),
      generateExecutiveQuestions(schema),
    ],
  };
}

function inferBusinessDomain(schema: Schema): string {
  const tableNames = schema.tables.map(t => t.name.toLowerCase()).join(' ');
  
  if (tableNames.includes('agency') || tableNames.includes('client') || tableNames.includes('campaign')) {
    return 'Advertising Agency';
  }
  if (tableNames.includes('order') || tableNames.includes('product') || tableNames.includes('cart')) {
    return 'E-Commerce';
  }
  if (tableNames.includes('patient') || tableNames.includes('doctor') || tableNames.includes('appointment')) {
    return 'Healthcare';
  }
  return 'Business Analytics';
}

function generateOperationalQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  
  for (const table of schema.tables) {
    if (!table.name.toLowerCase().startsWith('ref_')) {
      questions.push({
        question: `How many ${table.name.toLowerCase()} records exist?`,
        answerType: 'Single Metric',
        sqlComplexity: 'Simple',
        tables: [table.name],
      });
      questions.push({
        question: `What are the most recent ${table.name.toLowerCase()} entries?`,
        answerType: 'List',
        sqlComplexity: 'Simple',
        tables: [table.name],
      });
    }
  }

  const dateTable = schema.tables.find(t => t.columns.some(c => c.name.toLowerCase().includes('date')));
  if (dateTable) {
    questions.push({
      question: `What ${dateTable.name.toLowerCase()} were created today/this week?`,
      answerType: 'Filtered List',
      sqlComplexity: 'Simple',
      tables: [dateTable.name],
    });
  }

  questions.push({
    question: 'Which reference data categories are available?',
    answerType: 'Lookup List',
    sqlComplexity: 'Simple',
    tables: schema.tables.filter(t => t.name.toLowerCase().startsWith('ref_')).map(t => t.name),
  });

  return {
    role: 'Operational Staff',
    level: 'Basic',
    questions: questions.slice(0, 10),
  };
}

function generateDataAnalystQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  const allTables = schema.tables.map(t => t.name);

  questions.push({
    question: 'What is the data distribution across all primary entities?',
    answerType: 'Distribution Analysis',
    sqlComplexity: 'Moderate',
    tables: allTables,
  });

  questions.push({
    question: 'What are the data quality metrics (nulls, duplicates, outliers)?',
    answerType: 'Quality Report',
    sqlComplexity: 'Moderate',
    tables: allTables,
  });

  const tablesWithFKs = schema.tables.filter(t => t.columns.some(c => c.foreignKey));
  if (tablesWithFKs.length > 0) {
    questions.push({
      question: 'What is the referential integrity status across relationships?',
      answerType: 'Integrity Report',
      sqlComplexity: 'Complex',
      tables: tablesWithFKs.map(t => t.name),
    });
  }

  questions.push({
    question: 'What are the record counts and growth rates by entity type?',
    answerType: 'Growth Analysis',
    sqlComplexity: 'Moderate',
    tables: allTables,
  });

  questions.push({
    question: 'What correlations exist between key numeric fields?',
    answerType: 'Correlation Matrix',
    sqlComplexity: 'Complex',
    tables: allTables,
  });

  questions.push({
    question: 'What are the time-series patterns in transactional data?',
    answerType: 'Time Series Analysis',
    sqlComplexity: 'Complex',
    tables: schema.tables.filter(t => t.columns.some(c => c.name.toLowerCase().includes('date'))).map(t => t.name),
  });

  return {
    role: 'Data Analyst',
    level: 'Intermediate',
    questions,
  };
}

function generateManagerQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  const hasInvoices = schema.tables.some(t => t.name.toLowerCase().includes('invoice'));
  const hasClients = schema.tables.some(t => t.name.toLowerCase().includes('client'));
  const hasPayments = schema.tables.some(t => t.name.toLowerCase().includes('payment'));
  const hasMeetings = schema.tables.some(t => t.name.toLowerCase().includes('meeting'));
  const datesTables = schema.tables.filter(t => t.columns.some(c => c.name.toLowerCase().includes('date')));
  
  if (hasInvoices && hasClients) {
    questions.push({
      question: 'What is the average invoice value by client?',
      answerType: 'Comparative Metrics',
      sqlComplexity: 'Moderate',
      tables: ['Clients', 'Invoices'],
    });
  }

  questions.push({
    question: 'What are the trends over the past 6 months?',
    answerType: 'Time-based Analysis',
    sqlComplexity: 'Moderate',
    tables: datesTables.map(t => t.name),
  });

  questions.push({
    question: 'Which entities are performing above/below average?',
    answerType: 'Comparative Ranking',
    sqlComplexity: 'Moderate',
    tables: schema.tables.map(t => t.name),
  });

  if (hasPayments) {
    questions.push({
      question: 'What is the payment collection rate by period?',
      answerType: 'Rate Analysis',
      sqlComplexity: 'Moderate',
      tables: ['Payments', 'Invoices'],
    });
  }

  if (hasMeetings) {
    questions.push({
      question: 'What is the meeting activity by client/staff?',
      answerType: 'Activity Report',
      sqlComplexity: 'Moderate',
      tables: ['Meetings', 'Clients', 'Staff'],
    });
  }

  questions.push({
    question: 'What are the month-over-month changes in key metrics?',
    answerType: 'MoM Comparison',
    sqlComplexity: 'Moderate',
    tables: datesTables.map(t => t.name),
  });

  questions.push({
    question: 'Which categories/types have the highest activity?',
    answerType: 'Category Analysis',
    sqlComplexity: 'Moderate',
    tables: schema.tables.filter(t => t.name.toLowerCase().startsWith('ref_')).map(t => t.name),
  });

  return {
    role: 'Managers',
    level: 'Intermediate',
    questions,
  };
}

function generateFinanceQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  const hasInvoices = schema.tables.some(t => t.name.toLowerCase().includes('invoice'));
  const hasPayments = schema.tables.some(t => t.name.toLowerCase().includes('payment'));
  const hasClients = schema.tables.some(t => t.name.toLowerCase().includes('client'));

  if (hasInvoices) {
    questions.push({
      question: 'What is the total invoiced amount by period?',
      answerType: 'Revenue Report',
      sqlComplexity: 'Moderate',
      tables: ['Invoices'],
    });
    questions.push({
      question: 'What is the aging analysis of outstanding invoices?',
      answerType: 'AR Aging',
      sqlComplexity: 'Complex',
      tables: ['Invoices', 'Payments'],
    });
  }

  if (hasPayments) {
    questions.push({
      question: 'What is the payment collection trend?',
      answerType: 'Collection Trend',
      sqlComplexity: 'Moderate',
      tables: ['Payments'],
    });
    questions.push({
      question: 'What is the average days to payment by client?',
      answerType: 'DSO Analysis',
      sqlComplexity: 'Complex',
      tables: ['Invoices', 'Payments', 'Clients'],
    });
  }

  if (hasClients) {
    questions.push({
      question: 'What is the revenue concentration by client?',
      answerType: 'Concentration Analysis',
      sqlComplexity: 'Moderate',
      tables: ['Clients', 'Invoices'],
    });
  }

  questions.push({
    question: 'What is the cash flow forecast based on current receivables?',
    answerType: 'Cash Flow Forecast',
    sqlComplexity: 'Complex',
    tables: schema.tables.map(t => t.name),
  });

  return {
    role: 'Finance Team',
    level: 'Intermediate',
    questions,
  };
}

function generateSalesQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  const hasClients = schema.tables.some(t => t.name.toLowerCase().includes('client'));
  const hasMeetings = schema.tables.some(t => t.name.toLowerCase().includes('meeting'));
  const hasInvoices = schema.tables.some(t => t.name.toLowerCase().includes('invoice'));

  if (hasClients) {
    questions.push({
      question: 'What is the client acquisition trend?',
      answerType: 'Acquisition Trend',
      sqlComplexity: 'Moderate',
      tables: ['Clients'],
    });
    questions.push({
      question: 'Which clients have the highest engagement?',
      answerType: 'Engagement Ranking',
      sqlComplexity: 'Moderate',
      tables: ['Clients', 'Meetings', 'Invoices'],
    });
  }

  if (hasMeetings) {
    questions.push({
      question: 'What is the meeting-to-revenue conversion rate?',
      answerType: 'Conversion Analysis',
      sqlComplexity: 'Complex',
      tables: ['Meetings', 'Invoices'],
    });
    questions.push({
      question: 'What are the most effective meeting types?',
      answerType: 'Effectiveness Analysis',
      sqlComplexity: 'Moderate',
      tables: ['Meetings', 'Ref_Meeting_Types', 'Ref_Meeting_Outcomes'],
    });
  }

  if (hasInvoices) {
    questions.push({
      question: 'What is the win rate and average deal size?',
      answerType: 'Win Rate Analysis',
      sqlComplexity: 'Moderate',
      tables: ['Invoices', 'Clients'],
    });
  }

  questions.push({
    question: 'What is the pipeline health and forecast accuracy?',
    answerType: 'Pipeline Analysis',
    sqlComplexity: 'Complex',
    tables: schema.tables.map(t => t.name),
  });

  return {
    role: 'Sales Team',
    level: 'Intermediate',
    questions,
  };
}

function generateExecutiveQuestions(schema: Schema): StakeholderRequirements {
  const allTables = schema.tables.map(t => t.name);
  
  return {
    role: 'Executives',
    level: 'Advanced',
    questions: [
      {
        question: 'What are the key drivers of business performance?',
        answerType: 'Multi-dimensional Analysis',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
      {
        question: 'What is the customer lifetime value by segment?',
        answerType: 'Advanced Metric',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
      {
        question: 'What is the overall business health score?',
        answerType: 'Composite KPI',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
      {
        question: 'What are the predictive indicators for growth?',
        answerType: 'Predictive Analysis',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
      {
        question: 'What is the competitive positioning based on data trends?',
        answerType: 'Strategic Analysis',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
      {
        question: 'What operational efficiencies can be identified?',
        answerType: 'Efficiency Analysis',
        sqlComplexity: 'Complex',
        tables: allTables,
      },
    ],
  };
}

export function formatRequirementsAsText(doc: RequirementsDocument): string {
  let text = `${doc.title}\n${'='.repeat(doc.title.length)}\n\n`;
  text += `Generated From: ${doc.generatedFrom}\n\n`;

  for (const stakeholder of doc.stakeholders) {
    text += `\n${'='.repeat(60)}\n`;
    text += `STAKEHOLDER: ${stakeholder.role.toUpperCase()}\n`;
    text += `LEVEL: ${stakeholder.level}\n`;
    text += `${'='.repeat(60)}\n\n`;

    stakeholder.questions.forEach((q, idx) => {
      text += `${idx + 1}. ${q.question}\n`;
      text += `   Answer Type: ${q.answerType}\n`;
      text += `   SQL Complexity: ${q.sqlComplexity}\n`;
      text += `   Tables: ${q.tables.join(', ')}\n\n`;
    });
  }

  return text;
}

import * as fs from 'node:fs';
import * as path from 'node:path';

function getDomainSlug(schema: Schema): string {
  const domain = inferBusinessDomain(schema);
  return domain.toLowerCase().replace(/\s+/g, '_');
}

export async function saveRequirementsFiles(
  schema: Schema,
  requirements: RequirementsDocument,
  outputDir: string
): Promise<{ jsonFile: string; txtFile: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const domainSlug = getDomainSlug(schema);
  const jsonFile = `requirements_document_${domainSlug}.json`;
  const txtFile = `requirements_document_${domainSlug}.txt`;

  fs.writeFileSync(path.join(outputDir, jsonFile), JSON.stringify(requirements, null, 2));
  fs.writeFileSync(path.join(outputDir, txtFile), formatRequirementsAsText(requirements));

  // Also save with simple names for backward compatibility
  fs.writeFileSync(path.join(outputDir, 'requirements.json'), JSON.stringify(requirements, null, 2));
  fs.writeFileSync(path.join(outputDir, 'requirements.txt'), formatRequirementsAsText(requirements));

  return { jsonFile, txtFile };
}
