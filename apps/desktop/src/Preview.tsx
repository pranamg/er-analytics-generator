import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Sample data that would be loaded from outputs/
const sampleSchema = {
  tables: [
    { name: "Agencies", columns: [{ name: "agency_id", type: "INT", primaryKey: true }, { name: "agency_details", type: "TEXT" }] },
    { name: "Clients", columns: [{ name: "client_id", type: "INT", primaryKey: true }, { name: "agency_id", type: "INT", foreignKey: "Agencies(agency_id)" }, { name: "sic_code", type: "VARCHAR(50)", foreignKey: "Ref_SIC_Codes(sic_code)" }, { name: "client_details", type: "TEXT" }] },
    { name: "Staff", columns: [{ name: "staff_id", type: "INT", primaryKey: true }, { name: "agency_id", type: "INT", foreignKey: "Agencies(agency_id)" }, { name: "staff_details", type: "TEXT" }] },
    { name: "Meetings", columns: [{ name: "meeting_id", type: "INT", primaryKey: true }, { name: "client_id", type: "INT", foreignKey: "Clients(client_id)" }, { name: "meeting_type_code", type: "VARCHAR(50)" }, { name: "meeting_outcome_code", type: "VARCHAR(50)" }, { name: "billable_yn", type: "BOOLEAN" }, { name: "start_date_time", type: "DATETIME" }, { name: "end_date_time", type: "DATETIME" }, { name: "purpose_of_meeting", type: "TEXT" }, { name: "other_details", type: "TEXT" }] },
    { name: "Invoices", columns: [{ name: "invoice_id", type: "INT", primaryKey: true }, { name: "client_id", type: "INT", foreignKey: "Clients(client_id)" }, { name: "invoice_status_code", type: "VARCHAR(50)" }, { name: "invoice_details", type: "TEXT" }] },
    { name: "Payments", columns: [{ name: "payment_id", type: "INT", primaryKey: true }, { name: "invoice_id", type: "INT", foreignKey: "Invoices(invoice_id)" }, { name: "payment_details", type: "TEXT" }] },
    { name: "Staff_in_Meetings", columns: [{ name: "meeting_id", type: "INT", primaryKey: true, foreignKey: "Meetings(meeting_id)" }, { name: "staff_id", type: "INT", primaryKey: true, foreignKey: "Staff(staff_id)" }] },
    { name: "Ref_SIC_Codes", columns: [{ name: "sic_code", type: "VARCHAR(50)", primaryKey: true }, { name: "sic_description", type: "VARCHAR(255)" }] },
    { name: "Ref_Invoice_Status", columns: [{ name: "invoice_status_code", type: "VARCHAR(50)", primaryKey: true }, { name: "invoice_status_description", type: "VARCHAR(255)" }] },
    { name: "Ref_Meeting_Types", columns: [{ name: "meeting_type_code", type: "VARCHAR(50)", primaryKey: true }, { name: "meeting_type_description", type: "VARCHAR(255)" }] },
    { name: "Ref_Meeting_Outcomes", columns: [{ name: "meeting_outcome_code", type: "VARCHAR(50)", primaryKey: true }, { name: "meeting_outcome_description", type: "VARCHAR(255)" }] },
  ]
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Generate sample dashboard data
const generateDashboardData = () => {
  const revenueByAgency = [
    { name: 'Creative', revenue: 125000, clients: 4 },
    { name: 'Digital', revenue: 98000, clients: 3 },
    { name: 'Brand', revenue: 156000, clients: 5 },
    { name: 'Marketing', revenue: 87000, clients: 2 },
    { name: 'AdTech', revenue: 134000, clients: 4 },
  ];
  
  const statusDistribution = [
    { name: 'Paid', value: 35, amount: 420000 },
    { name: 'Pending', value: 12, amount: 145000 },
    { name: 'Disputed', value: 3, amount: 35000 },
  ];
  
  const revenueTrend = [
    { month: 'Jul 24', revenue: 85000 },
    { month: 'Aug 24', revenue: 92000 },
    { month: 'Sep 24', revenue: 78000 },
    { month: 'Oct 24', revenue: 105000 },
    { month: 'Nov 24', revenue: 118000 },
    { month: 'Dec 24', revenue: 122000 },
  ];
  
  const industryDistribution = [
    { name: 'Technology', value: 5, revenue: 180000 },
    { name: 'Retail', value: 4, revenue: 120000 },
    { name: 'Government', value: 2, revenue: 95000 },
    { name: 'Construction', value: 3, revenue: 85000 },
    { name: 'Industrial', value: 1, revenue: 45000 },
  ];
  
  const meetingOutcomes = [
    { name: 'Accepted', value: 25 },
    { name: 'Rejected', value: 8 },
    { name: 'Follow-up', value: 15 },
    { name: 'Completed', value: 32 },
  ];
  
  const cohortRetention = [
    { month: 'Month 0', retention: 100 },
    { month: 'Month 1', retention: 92 },
    { month: 'Month 2', retention: 85 },
    { month: 'Month 3', retention: 78 },
    { month: 'Month 4', retention: 72 },
    { month: 'Month 5', retention: 68 },
    { month: 'Month 6', retention: 65 },
  ];
  
  return {
    revenueByAgency,
    statusDistribution,
    revenueTrend,
    industryDistribution,
    meetingOutcomes,
    cohortRetention,
    kpis: {
      totalClients: 15,
      totalRevenue: 600000,
      paymentRate: '70.0',
      avgInvoice: 12000,
      totalMeetings: 80,
      totalStaff: 12,
      outstandingAR: 180000,
    }
  };
};

const sqlCode = `-- Database Schema
-- Generated: ${new Date().toISOString()}
-- Dialect: postgresql
-- Tables: 11

CREATE TABLE Agencies (
    agency_id INT PRIMARY KEY,
    agency_details TEXT
);

CREATE TABLE Ref_SIC_Codes (
    sic_code VARCHAR(50) PRIMARY KEY,
    sic_description VARCHAR(255)
);

CREATE TABLE Clients (
    client_id INT PRIMARY KEY,
    agency_id INT,
    sic_code VARCHAR(50),
    client_details TEXT
);

-- ... (more tables)

-- Foreign Key Constraints
ALTER TABLE Clients
    ADD FOREIGN KEY (agency_id) REFERENCES Agencies(agency_id);

ALTER TABLE Clients
    ADD FOREIGN KEY (sic_code) REFERENCES Ref_SIC_Codes(sic_code);

-- ... (more constraints)

-- Indexes
CREATE INDEX idx_clients_agency ON Clients(agency_id);
CREATE INDEX idx_invoices_client ON Invoices(client_id);
`;

const requirementsDoc = {
  title: "Analytics Requirements Document - Advertising Agency Platform",
  stakeholders: [
    {
      role: "Operational Staff",
      level: "Basic",
      questions: [
        { question: "How many active clients do we have?", answerType: "Single Metric", sqlComplexity: "Simple", tables: ["Clients"] },
        { question: "Which agencies have the most clients?", answerType: "Ranked List", sqlComplexity: "Simple", tables: ["Agencies", "Clients"] },
        { question: "What is the current invoice status breakdown?", answerType: "Distribution", sqlComplexity: "Simple", tables: ["Invoices"] },
      ]
    },
    {
      role: "Managers",
      level: "Intermediate", 
      questions: [
        { question: "What is the average invoice value by agency?", answerType: "Comparative Metrics", sqlComplexity: "Moderate", tables: ["Agencies", "Clients", "Invoices"] },
        { question: "Which industry sectors generate the most revenue?", answerType: "Revenue Analysis", sqlComplexity: "Moderate", tables: ["Clients", "Ref_SIC_Codes", "Invoices"] },
      ]
    },
    {
      role: "Executives",
      level: "Advanced",
      questions: [
        { question: "What is the client lifetime value by segment?", answerType: "Advanced Metric", sqlComplexity: "Complex", tables: ["Clients", "Invoices", "Payments"] },
        { question: "What are the key drivers of client churn?", answerType: "Predictive Analysis", sqlComplexity: "Complex", tables: ["Clients", "Meetings", "Invoices"] },
      ]
    }
  ]
};

const daxMeasures = `// DAX Measures for Power BI
// Generated for Advertising Agency Analytics

Total Revenue = SUM(Invoices[amount])

Total Payments = SUM(Payments[amount])

Payment Rate = DIVIDE([Total Payments], [Total Revenue], 0)

Outstanding AR = [Total Revenue] - [Total Payments]

Total Clients = DISTINCTCOUNT(Clients[client_id])

Total Meetings = COUNTROWS(Meetings)

Billable Percentage = 
DIVIDE(
    CALCULATE(COUNTROWS(Meetings), Meetings[billable_yn] = "Y"),
    [Total Meetings], 
    0
)

Client Lifetime Value = 
CALCULATE(
    [Total Revenue],
    ALLEXCEPT(Clients, Clients[client_id])
)

Revenue Growth MoM = 
VAR CurrentMonth = [Total Revenue]
VAR PreviousMonth = CALCULATE([Total Revenue], DATEADD('Date'[Date], -1, MONTH))
RETURN DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth, 0)
`;

export default function Preview() {
  const [activeTab, setActiveTab] = useState('schema');
  const [activeDashboard, setActiveDashboard] = useState('executive');
  
  const dashboardData = useMemo(() => generateDashboardData(), []);

  const tabs = [
    { id: 'schema', label: 'Schema', icon: '🗃️' },
    { id: 'sql', label: 'SQL', icon: '📄' },
    { id: 'data', label: 'Data', icon: '📊' },
    { id: 'requirements', label: 'Requirements', icon: '📋' },
    { id: 'prd', label: 'PRD', icon: '📝' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'dashboard', label: 'Dashboards', icon: '📉' },
    { id: 'powerbi', label: 'Power BI', icon: '⚡' },
    { id: 'deploy', label: 'Deploy', icon: '🚀' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ER Analytics Generator - Output Preview
          </h1>
          <p className="text-gray-600">
            Parse → SQL → Data → Requirements → PRD → Analytics → Dashboards → Deploy
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Schema Tab */}
            {activeTab === 'schema' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">✓ Schema Extracted Successfully</h3>
                  <p className="text-green-700 text-sm">
                    {sampleSchema.tables.length} tables with full relationships
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sampleSchema.tables.map(table => (
                    <div key={table.name} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">{table.name}</h3>
                      <div className="space-y-1">
                        {table.columns.map(col => (
                          <div key={col.name} className="flex items-center gap-2 text-sm">
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-300 text-xs">
                              {col.name}
                            </span>
                            {col.primaryKey && (
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">PK</span>
                            )}
                            {col.foreignKey && (
                              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">FK</span>
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
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Generated SQL DDL</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    📥 Download SQL
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
                  {sqlCode}
                </pre>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 mr-4">
                    <h3 className="font-semibold text-green-900 mb-2">✓ Synthetic Data Generated</h3>
                    <p className="text-green-700 text-sm">11 CSV files with realistic data</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    📥 Download All CSVs
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Agencies', 'Clients', 'Staff', 'Meetings', 'Invoices', 'Payments', 'Staff_in_Meetings', 'Ref_SIC_Codes'].map(table => (
                    <div key={table} className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                      <div className="text-2xl mb-2">📄</div>
                      <div className="font-medium text-gray-800">{table}.csv</div>
                      <div className="text-sm text-gray-500">10 rows</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements Tab */}
            {activeTab === 'requirements' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">{requirementsDoc.title}</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    📥 Download
                  </button>
                </div>
                
                {requirementsDoc.stakeholders.map((stakeholder, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{stakeholder.role}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        stakeholder.level === 'Basic' ? 'bg-green-100 text-green-700' :
                        stakeholder.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {stakeholder.level}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {stakeholder.questions.map((q, qIdx) => (
                        <div key={qIdx} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50 rounded">
                          <h4 className="font-semibold text-gray-800">{qIdx + 1}. {q.question}</h4>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">{q.answerType}</span>
                            <span className={`px-2 py-1 rounded ${
                              q.sqlComplexity === 'Simple' ? 'bg-green-100 text-green-700' :
                              q.sqlComplexity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>SQL: {q.sqlComplexity}</span>
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
                  <h2 className="text-2xl font-bold text-gray-800">Product Requirements Document</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    📥 Download PRD
                  </button>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800"><strong>Version:</strong> 1.0 | <strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
                
                {[
                  { title: '1. Executive Summary', content: 'This platform provides comprehensive analytics for advertising agency operations, covering 11 data entities with 3 stakeholder levels.' },
                  { title: '2. Business Context', content: 'Advertising agencies manage complex relationships between agencies, clients, staff, meetings, and financial transactions.' },
                  { title: '3. Functional Requirements', items: ['Real-time database sync', 'Role-based dashboards', 'Cohort analysis', 'Export to Power BI'] },
                  { title: '4. Dashboard Specifications', items: ['Executive Dashboard', 'Finance Dashboard', 'Operations Dashboard', 'Sales Dashboard'] },
                  { title: '5. Technical Stack', content: 'Frontend: React + Recharts. Backend: Node.js. Database: PostgreSQL. BI: Power BI compatible.' },
                ].map((section, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white">
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{section.title}</h3>
                    {section.content && <p className="text-gray-700">{section.content}</p>}
                    {section.items && (
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {section.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics: Cohort & Retention</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Total Cohorts</div>
                    <div className="text-3xl font-bold mt-2">6</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Avg Cohort Size</div>
                    <div className="text-3xl font-bold mt-2">2.5</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Month-6 Retention</div>
                    <div className="text-3xl font-bold mt-2">65%</div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Average Retention Curve</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData.cohortRetention}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex gap-4 mb-6">
                  {['executive', 'finance', 'operations', 'sales'].map(dash => (
                    <button
                      key={dash}
                      onClick={() => setActiveDashboard(dash)}
                      className={`px-6 py-3 rounded-lg font-medium capitalize ${
                        activeDashboard === dash
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {dash}
                    </button>
                  ))}
                </div>

                {/* KPI Cards */}
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

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Revenue by Agency</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dashboardData.revenueByAgency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="revenue" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Industry Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={dashboardData.industryDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="revenue"
                          label={({ name }) => name}
                        >
                          {dashboardData.industryDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={dashboardData.revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
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
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {dashboardData.meetingOutcomes.map((_, index) => (
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

            {/* Power BI Tab */}
            {activeTab === 'powerbi' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Power BI Export Resources</h2>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-900 mb-3">📊 Power BI Integration</h3>
                  <p className="text-yellow-800">DAX measures, date tables, and import instructions ready for Power BI Desktop.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">DAX Measures</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                      📥 Download DAX
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-80">
                    {daxMeasures}
                  </pre>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'power_bi_measures.dax', desc: 'DAX measures for KPIs' },
                    { name: 'power_bi_date_table.m', desc: 'Power Query date table' },
                    { name: 'power_bi_relationships.txt', desc: 'Relationship mappings' },
                    { name: 'power_bi_instructions.md', desc: 'Setup guide' },
                  ].map(file => (
                    <div key={file.name} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className="text-2xl">📄</div>
                      <div>
                        <div className="font-medium text-gray-800">{file.name}</div>
                        <div className="text-sm text-gray-500">{file.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deploy Tab */}
            {activeTab === 'deploy' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Deployment Scripts</h2>
                
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-3">🚀 Automated Deployment</h3>
                  <p className="text-green-800">Complete bash scripts for PostgreSQL database setup, data import, and dashboard deployment.</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'deploy.sh', desc: 'Main deployment' },
                    { name: 'setup_database.sh', desc: 'DB creation' },
                    { name: 'import_data.sh', desc: 'CSV import' },
                    { name: 'create_indexes.sh', desc: 'Performance indexes' },
                    { name: 'setup_users.sh', desc: 'User permissions' },
                    { name: 'health_check.sh', desc: 'Verification' },
                    { name: 'rollback.sh', desc: 'Emergency rollback' },
                  ].map(script => (
                    <div key={script.name} className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                      <div className="text-2xl mb-2">📜</div>
                      <div className="font-medium text-gray-800 text-sm">{script.name}</div>
                      <div className="text-xs text-gray-500">{script.desc}</div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">📋 Deployment Checklist</h3>
                  <ul className="space-y-2 text-blue-800 text-sm">
                    <li>✓ Download all CSV files from Data tab</li>
                    <li>✓ Download schema.sql from SQL tab</li>
                    <li>✓ Download deployment scripts</li>
                    <li>✓ Ensure PostgreSQL is installed</li>
                    <li>✓ Run: chmod +x deploy.sh && ./deploy.sh</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
