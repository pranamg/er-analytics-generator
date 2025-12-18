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
  
  return {
    title: `Product Requirements Document: ${domain} Analytics Platform`,
    version: '1.0',
    date: new Date().toLocaleDateString(),
    sections: [
      {
        title: '1. Executive Summary',
        content: `This platform provides comprehensive analytics for ${domain.toLowerCase()} operations, covering ${schema.tables.length} data entities with ${requirements.stakeholders.length} stakeholder levels.`,
      },
      {
        title: '2. Business Context',
        content: `The platform addresses operational visibility, performance tracking, and data-driven decision making for ${domain.toLowerCase()} businesses.`,
      },
      {
        title: '3. Stakeholder Profiles',
        subsections: requirements.stakeholders.map(s => ({
          title: s.role,
          content: `${s.level}-level analytics with ${s.questions.length} key question areas.`,
        })),
      },
      {
        title: '4. Functional Requirements',
        subsections: [
          { title: 'Data Integration', items: ['Real-time sync', 'CSV/Excel import', 'API endpoints'] },
          { title: 'Dashboard Capabilities', items: ['Role-based access', 'Custom KPIs', 'Drill-down', 'Export'] },
          { title: 'Advanced Analytics', items: ['Cohort analysis', 'Retention curves', 'Churn prediction'] },
        ],
      },
      {
        title: '5. Dashboard Specifications',
        subsections: [
          { title: 'Executive Dashboard', items: ['KPI cards', 'Revenue charts', 'Trend analysis'] },
          { title: 'Finance Dashboard', items: ['AR aging', 'Payment tracking', 'Invoice status'] },
          { title: 'Operations Dashboard', items: ['Utilization metrics', 'Activity tracking'] },
        ],
      },
      {
        title: '6. Technical Stack',
        content: 'Frontend: React + Recharts. Backend: Node.js/Python. Database: PostgreSQL. BI: Power BI compatible.',
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
