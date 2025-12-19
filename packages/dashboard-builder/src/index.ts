import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DashboardConfig {
  name: string;
  type: 'executive' | 'finance' | 'operations' | 'sales';
  kpis: KPIConfig[];
  charts: ChartConfig[];
}

export interface KPIConfig {
  label: string;
  value: string;
  format?: 'number' | 'currency' | 'percentage';
  color?: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  dataKey: string;
  xAxis?: string;
  yAxis?: string;
}

export function generateDashboardComponent(config: DashboardConfig): string {
  return `import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ${config.name}DashboardProps {
  data: any;
}

export const ${config.name}Dashboard: React.FC<${config.name}DashboardProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">${config.name} Dashboard</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        ${config.kpis.map((kpi, i) => `
        <div className="bg-gradient-to-br from-${kpi.color || 'blue'}-500 to-${kpi.color || 'blue'}-600 rounded-lg p-6 text-white">
          <div className="text-sm opacity-90">${kpi.label}</div>
          <div className="text-3xl font-bold mt-2">{data.${kpi.value}}</div>
        </div>`).join('')}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        ${config.charts.map(chart => generateChartCode(chart)).join('\n        ')}
      </div>
    </div>
  );
};

export default ${config.name}Dashboard;
`;
}

function generateChartCode(chart: ChartConfig): string {
  const chartTypes: Record<string, string> = {
    bar: `<div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">${chart.title}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.${chart.dataKey}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="${chart.xAxis || 'name'}" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="${chart.yAxis || 'value'}" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>`,
    line: `<div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">${chart.title}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.${chart.dataKey}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="${chart.xAxis || 'name'}" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="${chart.yAxis || 'value'}" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>`,
    pie: `<div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">${chart.title}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.${chart.dataKey}} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {data.${chart.dataKey}?.map((entry: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>`,
    area: `<div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">${chart.title}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.${chart.dataKey}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="${chart.xAxis || 'name'}" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="${chart.yAxis || 'value'}" stroke="#10b981" fill="#10b98130" />
            </AreaChart>
          </ResponsiveContainer>
        </div>`,
  };
  return chartTypes[chart.type] || chartTypes.bar;
}

export async function saveDashboard(config: DashboardConfig, outputDir: string): Promise<void> {
  const code = generateDashboardComponent(config);
  const filename = `${config.name}Dashboard.tsx`;
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(outputDir, filename), code);
}

export function getDefaultDashboardConfigs(): DashboardConfig[] {
  return [
    {
      name: 'Executive',
      type: 'executive',
      kpis: [
        { label: 'Total Clients', value: 'kpis.totalClients', color: 'blue' },
        { label: 'Total Revenue', value: 'kpis.totalRevenue', format: 'currency', color: 'green' },
        { label: 'Payment Rate', value: 'kpis.paymentRate', format: 'percentage', color: 'purple' },
        { label: 'Avg Invoice', value: 'kpis.avgInvoice', format: 'currency', color: 'orange' },
      ],
      charts: [
        { type: 'bar', title: 'Revenue by Agency', dataKey: 'revenueByAgency', xAxis: 'name', yAxis: 'revenue' },
        { type: 'pie', title: 'Industry Distribution', dataKey: 'industryDistribution' },
        { type: 'area', title: 'Revenue Trend', dataKey: 'revenueTrend', xAxis: 'month', yAxis: 'revenue' },
        { type: 'pie', title: 'Meeting Outcomes', dataKey: 'meetingOutcomes' },
      ],
    },
    {
      name: 'Finance',
      type: 'finance',
      kpis: [
        { label: 'Total Revenue', value: 'kpis.totalRevenue', color: 'green' },
        { label: 'Outstanding AR', value: 'kpis.outstandingAR', color: 'blue' },
        { label: 'Payment Rate', value: 'kpis.paymentRate', color: 'purple' },
        { label: 'Total Invoices', value: 'kpis.totalInvoices', color: 'orange' },
      ],
      charts: [
        { type: 'bar', title: 'AR Aging Analysis', dataKey: 'arAging', xAxis: 'category', yAxis: 'amount' },
        { type: 'pie', title: 'Invoice Status', dataKey: 'statusDistribution' },
        { type: 'line', title: 'Revenue Trend', dataKey: 'revenueTrend', xAxis: 'month', yAxis: 'revenue' },
        { type: 'bar', title: 'Payments by Month', dataKey: 'paymentsTrend' },
      ],
    },
    {
      name: 'Operations',
      type: 'operations',
      kpis: [
        { label: 'Total Meetings', value: 'kpis.totalMeetings', color: 'blue' },
        { label: 'Total Staff', value: 'kpis.totalStaff', color: 'green' },
        { label: 'Billable Rate', value: 'kpis.billableRate', format: 'percentage', color: 'purple' },
        { label: 'Avg Duration', value: 'kpis.avgDuration', color: 'orange' },
      ],
      charts: [
        { type: 'bar', title: 'Activity by Staff', dataKey: 'activityByStaff', xAxis: 'name', yAxis: 'count' },
        { type: 'pie', title: 'Meeting Types', dataKey: 'meetingTypes' },
        { type: 'line', title: 'Activity Trend', dataKey: 'activityTrend', xAxis: 'month', yAxis: 'count' },
        { type: 'bar', title: 'Workload Distribution', dataKey: 'workloadDistribution', xAxis: 'category', yAxis: 'hours' },
      ],
    },
    {
      name: 'Sales',
      type: 'sales',
      kpis: [
        { label: 'New Clients', value: 'kpis.newClients', color: 'blue' },
        { label: 'Conversion Rate', value: 'kpis.conversionRate', format: 'percentage', color: 'green' },
        { label: 'Pipeline Value', value: 'kpis.pipelineValue', format: 'currency', color: 'purple' },
        { label: 'Avg Deal Size', value: 'kpis.avgDealSize', format: 'currency', color: 'orange' },
      ],
      charts: [
        { type: 'bar', title: 'Sales Pipeline', dataKey: 'salesPipeline', xAxis: 'stage', yAxis: 'value' },
        { type: 'pie', title: 'Client Segments', dataKey: 'clientSegments' },
        { type: 'area', title: 'New Clients Trend', dataKey: 'newClientsTrend', xAxis: 'month', yAxis: 'count' },
        { type: 'bar', title: 'Win/Loss Analysis', dataKey: 'winLossAnalysis', xAxis: 'outcome', yAxis: 'count' },
      ],
    },
  ];
}

export async function saveAllDashboards(outputDir: string): Promise<void> {
  const configs = getDefaultDashboardConfigs();
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const config of configs) {
    await saveDashboard(config, outputDir);
  }
}

export function generateStaticHTMLDashboard(config: DashboardConfig, data: Record<string, unknown>): string {
  const kpiCards = config.kpis.map(kpi => `
    <div class="kpi-card ${kpi.color || 'blue'}">
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${formatKPIValue(data, kpi)}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.name} Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 24px; }
    .dashboard { max-width: 1400px; margin: 0 auto; }
    h1 { color: #1f2937; margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { padding: 24px; border-radius: 12px; color: white; }
    .kpi-card.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .kpi-card.green { background: linear-gradient(135deg, #10b981, #059669); }
    .kpi-card.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
    .kpi-card.orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .kpi-label { font-size: 14px; opacity: 0.9; }
    .kpi-value { font-size: 32px; font-weight: bold; margin-top: 8px; }
    .chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .chart-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .chart-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 16px; }
    .chart-container { height: 250px; }
    .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 14px; }
    @media (max-width: 768px) { .kpi-grid, .chart-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>${config.name} Dashboard</h1>
    <div class="kpi-grid">
      ${kpiCards}
    </div>
    <div class="chart-grid">
      ${config.charts.map((chart, i) => `
        <div class="chart-card">
          <div class="chart-title">${chart.title}</div>
          <div class="chart-container">
            <canvas id="chart${i}"></canvas>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="footer">
      Generated by ER Analytics Generator | ${new Date().toLocaleDateString()}
    </div>
  </div>
  <script>
    const chartData = ${JSON.stringify(data)};
    ${config.charts.map((chart, i) => generateChartJS(chart, i)).join('\n')}
  </script>
</body>
</html>`;
}

function formatKPIValue(data: Record<string, unknown>, kpi: KPIConfig): string {
  const value = getNestedValue(data, kpi.value);
  if (value === undefined || value === null) return '-';
  
  if (kpi.format === 'currency') {
    return '$' + Number(value).toLocaleString();
  }
  if (kpi.format === 'percentage') {
    return Number(value).toFixed(1) + '%';
  }
  return String(value);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], obj);
}

function generateChartJS(chart: ChartConfig, index: number): string {
  const chartType = chart.type === 'area' ? 'line' : chart.type;
  const fill = chart.type === 'area' ? 'true' : 'false';
  const jsChartType = chartType === 'pie' ? 'doughnut' : chartType;
  
  return `
    new Chart(document.getElementById('chart${index}'), {
      type: '${jsChartType}',
      data: {
        labels: (chartData.${chart.dataKey} || []).map(d => d.${chart.xAxis || 'name'}),
        datasets: [{
          data: (chartData.${chart.dataKey} || []).map(d => d.${chart.yAxis || 'value'}),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
          borderColor: '#3b82f6',
          fill: ${fill}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: ${jsChartType === 'doughnut' ? 'true' : 'false'} } }
      }
    });
  `;
}

export async function saveStaticHTMLDashboards(
  outputDir: string,
  data: Record<string, unknown>
): Promise<void> {
  const configs = getDefaultDashboardConfigs();
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const config of configs) {
    const html = generateStaticHTMLDashboard(config, data);
    const filename = `${config.type}_dashboard.html`;
    fs.writeFileSync(path.join(outputDir, filename), html);
  }
}
