import type { Schema, RequirementsDocument, StakeholderRequirements, Question } from '@er-analytics/core';

export function generateRequirements(schema: Schema): RequirementsDocument {
  const domain = inferBusinessDomain(schema);
  
  return {
    title: `Analytics Requirements Document - ${domain} Platform`,
    generatedFrom: 'ER Diagram Analysis',
    stakeholders: [
      generateOperationalQuestions(schema),
      generateManagerQuestions(schema),
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
    }
  }

  return {
    role: 'Operational Staff',
    level: 'Basic',
    questions: questions.slice(0, 5),
  };
}

function generateManagerQuestions(schema: Schema): StakeholderRequirements {
  const questions: Question[] = [];
  const hasInvoices = schema.tables.some(t => t.name.toLowerCase().includes('invoice'));
  const hasClients = schema.tables.some(t => t.name.toLowerCase().includes('client'));
  
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
    tables: schema.tables.filter(t => 
      t.columns.some(c => c.name.toLowerCase().includes('date'))
    ).map(t => t.name),
  });

  return {
    role: 'Managers',
    level: 'Intermediate',
    questions,
  };
}

function generateExecutiveQuestions(schema: Schema): StakeholderRequirements {
  return {
    role: 'Executives',
    level: 'Advanced',
    questions: [
      {
        question: 'What are the key drivers of business performance?',
        answerType: 'Multi-dimensional Analysis',
        sqlComplexity: 'Complex',
        tables: schema.tables.map(t => t.name),
      },
      {
        question: 'What is the customer lifetime value by segment?',
        answerType: 'Advanced Metric',
        sqlComplexity: 'Complex',
        tables: schema.tables.map(t => t.name),
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
