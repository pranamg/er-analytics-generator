import type { Schema, RequirementsDocument } from '@er-analytics/core';

export interface PRDDocument {
  title: string;
  version: string;
  date: string;
  sections: PRDSection[];
}

export interface PRDSection {
  title: string;
  content?: string;
  subsections?: { title: string; content?: string; items?: string[] }[];
}

export function generatePRD(schema: Schema, requirements: RequirementsDocument): PRDDocument {
  const domain = inferDomain(schema);
  const totalQuestions = requirements.stakeholders.reduce((sum, s) => sum + s.questions.length, 0);
  const totalColumns = schema.tables.reduce((sum, t) => sum + t.columns.length, 0);
  const relationships = schema.tables.reduce((sum, t) => sum + t.columns.filter(c => c.foreignKey).length, 0);
  
  return {
    title: `Product Requirements Document: ${domain} Analytics Platform`,
    version: '1.0',
    date: new Date().toLocaleDateString(),
    sections: [
      {
        title: '1. Executive Summary',
        content: `This platform provides comprehensive analytics for ${domain.toLowerCase()} operations, covering ${schema.tables.length} data entities with ${totalColumns} attributes and ${relationships} relationships. The system addresses ${totalQuestions} analytical questions across ${requirements.stakeholders.length} stakeholder groups.`,
      },
      {
        title: '2. Business Context',
        content: `The platform addresses operational visibility, performance tracking, and data-driven decision making for ${domain.toLowerCase()} businesses. It enables stakeholders from operations to executive levels to access relevant insights through role-appropriate interfaces.`,
        subsections: [
          { title: 'Business Objectives', items: ['Improve operational efficiency', 'Enable data-driven decisions', 'Reduce reporting overhead', 'Increase stakeholder self-service'] },
          { title: 'Success Metrics', items: ['Time-to-insight reduction', 'Report automation rate', 'User adoption rate', 'Data accuracy score'] },
        ],
      },
      {
        title: '3. Stakeholder Profiles',
        subsections: requirements.stakeholders.map(s => ({
          title: s.role,
          content: `${s.level}-level analytics with ${s.questions.length} key question areas covering ${s.questions.map(q => q.answerType).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.`,
        })),
      },
      {
        title: '4. Functional Requirements',
        subsections: [
          { title: 'Data Integration', items: ['Real-time database synchronization', 'CSV/Excel file import', 'REST API endpoints', 'Scheduled data refresh', 'Data validation rules'] },
          { title: 'Dashboard Capabilities', items: ['Role-based access control', 'Custom KPI configuration', 'Interactive drill-down', 'Export to PDF/Excel', 'Scheduled report delivery', 'Mobile-responsive design'] },
          { title: 'Advanced Analytics', items: ['Cohort analysis', 'Retention curves', 'Churn prediction', 'RFM segmentation', 'Trend forecasting', 'Anomaly detection'] },
          { title: 'User Management', items: ['SSO integration', 'Role-based permissions', 'Audit logging', 'Session management'] },
        ],
      },
      {
        title: '5. Dashboard Specifications',
        subsections: [
          { title: 'Executive Dashboard', items: ['KPI summary cards', 'Revenue trend charts', 'Performance scorecards', 'Alert notifications', 'Benchmark comparisons'] },
          { title: 'Finance Dashboard', items: ['AR aging analysis', 'Payment tracking', 'Invoice status distribution', 'Cash flow projections', 'Revenue recognition'] },
          { title: 'Operations Dashboard', items: ['Utilization metrics', 'Activity tracking', 'Resource allocation', 'Process efficiency KPIs', 'Workload distribution'] },
          { title: 'Sales Dashboard', items: ['Pipeline analysis', 'Conversion funnels', 'Client acquisition trends', 'Win/loss analysis', 'Territory performance'] },
        ],
      },
      {
        title: '6. Data Dictionary',
        subsections: schema.tables.slice(0, 10).map(t => ({
          title: t.name,
          content: `${t.columns.length} columns including ${t.columns.filter(c => c.primaryKey).length} primary key(s) and ${t.columns.filter(c => c.foreignKey).length} foreign key(s).`,
        })),
      },
      {
        title: '7. User Stories',
        subsections: [
          { title: 'Operations', items: requirements.stakeholders.find(s => s.role.includes('Operational'))?.questions.slice(0, 3).map(q => `As an operator, I want to know: ${q.question}`) || [] },
          { title: 'Management', items: requirements.stakeholders.find(s => s.role.includes('Manager'))?.questions.slice(0, 3).map(q => `As a manager, I want to know: ${q.question}`) || [] },
          { title: 'Executive', items: requirements.stakeholders.find(s => s.role.includes('Executive'))?.questions.slice(0, 3).map(q => `As an executive, I want to know: ${q.question}`) || [] },
        ],
      },
      {
        title: '8. Technical Stack',
        content: 'Frontend: React 18 + Recharts + TailwindCSS. Backend: Node.js with TypeScript. Database: PostgreSQL 15+. BI Integration: Power BI compatible exports.',
        subsections: [
          { title: 'Infrastructure', items: ['Docker containerization', 'Kubernetes orchestration', 'CI/CD pipeline', 'Automated testing'] },
          { title: 'Security', items: ['HTTPS encryption', 'JWT authentication', 'Role-based authorization', 'Data encryption at rest'] },
        ],
      },
      {
        title: '9. Acceptance Criteria',
        subsections: [
          { title: 'Performance', items: ['Dashboard load time < 3 seconds', 'Query response time < 2 seconds', '99.9% uptime SLA'] },
          { title: 'Data Quality', items: ['100% referential integrity', 'Data freshness < 15 minutes', 'Zero data loss guarantee'] },
          { title: 'Usability', items: ['Mobile-responsive design', 'Accessibility WCAG 2.1 AA', 'Intuitive navigation'] },
        ],
      },
      {
        title: '10. Implementation Roadmap',
        subsections: [
          { title: 'Phase 1: Foundation', items: ['Database schema deployment', 'Basic dashboards', 'User authentication'] },
          { title: 'Phase 2: Analytics', items: ['Advanced analytics features', 'Cohort analysis', 'Custom reports'] },
          { title: 'Phase 3: Integration', items: ['Power BI export', 'API development', 'External system integration'] },
        ],
      },
    ],
  };
}

function inferDomain(schema: Schema): string {
  const names = schema.tables.map(t => t.name.toLowerCase()).join(' ');
  if (names.includes('agency')) return 'Advertising Agency';
  if (names.includes('order')) return 'E-Commerce';
  return 'Business';
}

export function formatPRDAsText(prd: PRDDocument): string {
  let text = `${prd.title}\n${'='.repeat(prd.title.length)}\n`;
  text += `Version: ${prd.version} | Date: ${prd.date}\n\n`;

  for (const section of prd.sections) {
    text += `\n${section.title}\n${'-'.repeat(section.title.length)}\n`;
    if (section.content) text += `${section.content}\n`;
    if (section.subsections) {
      for (const sub of section.subsections) {
        text += `\n  ${sub.title}\n`;
        if (sub.content) text += `  ${sub.content}\n`;
        if (sub.items) sub.items.forEach(item => text += `    - ${item}\n`);
      }
    }
  }
  return text;
}

import * as fs from 'node:fs';
import * as path from 'node:path';

function getDomainSlug(schema: Schema): string {
  const domain = inferDomain(schema);
  return domain.toLowerCase().replace(/\s+/g, '_');
}

export async function savePRDFiles(
  schema: Schema,
  prd: PRDDocument,
  outputDir: string
): Promise<{ jsonFile: string; txtFile: string; htmlFile: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const domainSlug = getDomainSlug(schema);
  const jsonFile = `PRD_${domainSlug}_analytics.json`;
  const txtFile = `PRD_${domainSlug}_analytics.txt`;
  const htmlFile = `PRD_${domainSlug}_analytics.html`;

  fs.writeFileSync(path.join(outputDir, jsonFile), JSON.stringify(prd, null, 2));
  fs.writeFileSync(path.join(outputDir, txtFile), formatPRDAsText(prd));
  fs.writeFileSync(path.join(outputDir, htmlFile), formatPRDAsHTML(prd));

  // Also save with simple names for backward compatibility
  fs.writeFileSync(path.join(outputDir, 'PRD.json'), JSON.stringify(prd, null, 2));
  fs.writeFileSync(path.join(outputDir, 'PRD.txt'), formatPRDAsText(prd));
  fs.writeFileSync(path.join(outputDir, 'PRD.html'), formatPRDAsHTML(prd));

  return { jsonFile, txtFile, htmlFile };
}

export function formatPRDAsHTML(prd: PRDDocument): string {
  const sections = prd.sections.map(section => {
    let content = `<h2>${section.title}</h2>`;
    if (section.content) {
      content += `<p>${section.content}</p>`;
    }
    if (section.subsections) {
      for (const sub of section.subsections) {
        content += `<h3>${sub.title}</h3>`;
        if (sub.content) content += `<p>${sub.content}</p>`;
        if (sub.items && sub.items.length > 0) {
          content += '<ul>' + sub.items.map(item => `<li>${item}</li>`).join('') + '</ul>';
        }
      }
    }
    return content;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prd.title}</title>
  <style>
    @media print {
      body { font-size: 11pt; }
      h1 { font-size: 18pt; }
      h2 { font-size: 14pt; page-break-after: avoid; }
      h3 { font-size: 12pt; page-break-after: avoid; }
      .no-print { display: none; }
    }
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #2c5282; margin-top: 30px; border-bottom: 1px solid #bee3f8; padding-bottom: 5px; }
    h3 { color: #2b6cb0; margin-top: 20px; }
    p { margin: 10px 0; text-align: justify; }
    ul { margin: 10px 0 10px 20px; }
    li { margin: 5px 0; }
    .header { text-align: center; margin-bottom: 30px; }
    .meta { color: #718096; font-size: 14px; margin-bottom: 30px; }
    .print-btn { background: #3182ce; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
    .print-btn:hover { background: #2c5282; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <h1>${prd.title}</h1>
    <div class="meta">Version ${prd.version} | ${prd.date}</div>
  </div>
  ${sections}
  <div class="meta" style="margin-top: 40px; text-align: center;">
    Generated by ER Analytics Generator
  </div>
</body>
</html>`;
}
