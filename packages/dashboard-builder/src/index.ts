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
  ];
}
