import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE = 'http://localhost:3001/api';

interface BusinessContextForm {
  industry: string;
  companySize: string;
  region: string;
  marketSize: string;
  growthRate: string;
  marketTrends: string;
  primaryKPIs: string;
  benchmarks: string;
  painPoints: string;
  techStack: string;
}

interface OutputData {
  schema?: { tables: Table[] };
  sql?: string;
  processedSchema?: { metadata?: SchemaMetadata; dependencyOrder?: string[] };
  requirements?: RequirementsDoc;
  prd?: PRDDoc;
  analytics?: AnalyticsData;
  dataFiles?: { name: string; rowCount: number }[];
  dashboards?: { name: string; file: string }[];
  powerbi?: Record<string, string>;
  deployScripts?: { name: string; desc: string }[];
}

interface Table {
  name: string;
  columns: { name: string; type: string; primaryKey?: boolean; foreignKey?: string | null }[];
}

interface SchemaMetadata {
  tableCount: number;
  totalColumns: number;
  relationships: number;
  complexity: string;
}

interface RequirementsDoc {
  title: string;
  stakeholders: { role: string; level: string; questions: { question: string; answerType: string; sqlComplexity: string; tables: string[] }[] }[];
}

interface PRDDoc {
  title: string;
  version: string;
  date: string;
  sections: { title: string; content?: string; subsections?: { title: string; content?: string; items?: string[] }[] }[];
}

interface AnalyticsData {
  cohortAnalysis?: { cohorts: CohortData[]; averageRetention: { month: string; retention: number }[] };
  revenueCohorts?: { cohort: string; revenue: number; clientCount: number; revenuePerClient: number }[];
  churnRisk?: { entityId: number; entityName: string; riskScore: number; lastActivity: string; daysInactive: number }[];
  trendAnalysis?: { period: string; value: number; growth: number }[];
  distributionAnalysis?: { category: string; count: number; percentage: number }[];
  topNAnalysis?: { entity: string; metric: string; value: number }[];
  rfmAnalysis?: { segment: string; count: number; avgRecency: number; avgFrequency: number; avgMonetary: number }[];
}

interface CohortData {
  cohort: string;
  size: number;
  retention: { month: number; rate: number; count: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const defaultBusinessContext: BusinessContextForm = {
  industry: '',
  companySize: '',
  region: '',
  marketSize: '',
  growthRate: '',
  marketTrends: '',
  primaryKPIs: '',
  benchmarks: '',
  painPoints: '',
  techStack: '',
};

export default function Preview() {
  const [activeTab, setActiveTab] = useState('schema');
  const [activeDashboard, setActiveDashboard] = useState('executive');
  const [loading, setLoading] = useState(true);
  const [outputData, setOutputData] = useState<OutputData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [businessContext, setBusinessContext] = useState<BusinessContextForm>(defaultBusinessContext);
  const [businessContextSaving, setBusinessContextSaving] = useState(false);
  const [businessContextSaved, setBusinessContextSaved] = useState(false);

  useEffect(() => {
    loadOutputs();
  }, []);

  const loadOutputs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/outputs`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match expected format
        const transformedData: OutputData = {
          schema: data['schema.json'],
          sql: data['schema.sql'],
          processedSchema: data['schema_processed.json'],
          requirements: data.docs?.['requirements.json'],
          prd: data.docs?.['PRD.json'],
          analytics: data.analytics?.['cohort_analysis.json'] || data.analytics?.['analytics.json'],
          dataFiles: data.data ? Object.keys(data.data).map(name => ({ name, rowCount: 0 })) : [],
          dashboards: data.dashboards ? Object.keys(data.dashboards).map(name => ({ name, file: name })) : [],
          powerbi: data.powerbi,
          deployScripts: data.deploy ? Object.keys(data.deploy).map(name => ({ name, desc: name })) : [],
        };
        setOutputData(transformedData);
      } else {
        setError('Failed to load outputs from server');
      }
    } catch (err) {
      setError('Server not running. Start with: pnpm start');
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async () => {
    try {
      const response = await fetch(`${API_BASE}/outputs-path`);
      const { path } = await response.json();
      alert(`Output folder: ${path}\n\nOpen this path in your file explorer.`);
    } catch (err) {
      console.error('Failed to get outputs path:', err);
    }
  };

  const downloadFile = async (filename: string) => {
    window.open(`${API_BASE}/download/file/${filename}`, '_blank');
  };

  const downloadFolder = async (subdir: string) => {
    window.open(`${API_BASE}/download/folder/${subdir}`, '_blank');
  };

  const downloadAllAsZip = async () => {
    window.open(`${API_BASE}/download/all`, '_blank');
  };

  const saveBusinessContext = async () => {
    setBusinessContextSaving(true);
    setBusinessContextSaved(false);
    try {
      const response = await fetch(`${API_BASE}/business-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessContext),
      });
      const result = await response.json();
      if (result.success) {
        setBusinessContextSaved(true);
        setTimeout(() => setBusinessContextSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save business context:', err);
    } finally {
      setBusinessContextSaving(false);
    }
  };

  const updateBusinessContext = (field: keyof BusinessContextForm, value: string) => {
    setBusinessContext(prev => ({ ...prev, [field]: value }));
  };

  const hasData = outputData && (outputData.schema || outputData.sql || (outputData.dataFiles && outputData.dataFiles.length > 0));

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
    { id: 'businessContext', label: 'Business Context', icon: '🏢' },
    { id: 'summary', label: 'Summary', icon: '🖥️' },
  ];

  const dashboardData = useMemo(() => {
    if (!outputData?.analytics) return null;
    const analytics = outputData.analytics;
    return {
      cohortRetention: analytics.cohortAnalysis?.averageRetention || [],
      revenueCohorts: analytics.revenueCohorts || [],
      churnRisk: analytics.churnRisk || [],
      trendAnalysis: analytics.trendAnalysis || [],
      distributionAnalysis: analytics.distributionAnalysis || [],
      topNAnalysis: analytics.topNAnalysis || [],
      rfmAnalysis: analytics.rfmAnalysis || [],
    };
  }, [outputData?.analytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading outputs...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Output Data</h2>
          <p className="text-gray-600 mb-6">
            Run the pipeline first to generate outputs. The preview will display data from the outputs folder.
          </p>
          <button
            onClick={loadOutputs}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                ER Analytics Generator - Output Preview
              </h1>
              <p className="text-gray-600">
                Parse → SQL → Data → Requirements → PRD → Analytics → Dashboards → Deploy
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadOutputs} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                🔄 Refresh
              </button>
              <button onClick={downloadAllAsZip} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                📦 Download All ZIP
              </button>
              <button onClick={openFolder} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                📁 Open Folder
              </button>
            </div>
          </div>
        </div>

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
            {activeTab === 'schema' && (
              <div className="space-y-4">
                {outputData?.schema?.tables ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">✓ Schema Extracted Successfully</h3>
                      <p className="text-green-700 text-sm">
                        {outputData.schema.tables.length} tables with full relationships
                        {outputData.processedSchema?.metadata && (
                          <> | {outputData.processedSchema.metadata.totalColumns} columns | {outputData.processedSchema.metadata.relationships} relationships | Complexity: {outputData.processedSchema.metadata.complexity}</>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {outputData.schema.tables.map(table => (
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
                  </>
                ) : (
                  <EmptyState message="No schema data available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'sql' && (
              <div className="space-y-4">
                {outputData?.sql ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Generated SQL DDL</h3>
                      <button onClick={() => downloadFile('schema.sql')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        📥 Download SQL
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-[500px]">
                      {outputData.sql}
                    </pre>
                  </>
                ) : (
                  <EmptyState message="No SQL data available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                {outputData?.dataFiles && outputData.dataFiles.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 mr-4">
                        <h3 className="font-semibold text-green-900 mb-2">✓ Synthetic Data Generated</h3>
                        <p className="text-green-700 text-sm">
                          {outputData.dataFiles.length} CSV files with {outputData.dataFiles.reduce((sum, f) => sum + f.rowCount, 0)} total rows
                        </p>
                      </div>
                      <button onClick={() => downloadFolder('data')} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        📥 Download All CSVs
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {outputData.dataFiles.map(file => (
                        <div key={file.name} className="border border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50">
                          <div className="text-2xl mb-2">📄</div>
                          <div className="font-medium text-gray-800">{file.name}</div>
                          <div className="text-sm text-gray-500">{file.rowCount} rows</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="No data files available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className="space-y-6">
                {outputData?.requirements ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">{outputData.requirements.title}</h2>
                      <button onClick={() => downloadFile('docs/requirements.json')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        📥 Download
                      </button>
                    </div>
                    {outputData.requirements.stakeholders.map((stakeholder, idx) => (
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
                          <span className="text-sm text-gray-500">{stakeholder.questions.length} questions</span>
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
                  </>
                ) : (
                  <EmptyState message="No requirements data available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'prd' && (
              <div className="space-y-6">
                {outputData?.prd ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">{outputData.prd.title}</h2>
                      <button onClick={() => downloadFile('docs/PRD.json')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        📥 Download PRD
                      </button>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-purple-800"><strong>Version:</strong> {outputData.prd.version} | <strong>Date:</strong> {outputData.prd.date}</p>
                    </div>
                    {outputData.prd.sections.map((section, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white">
                        <h3 className="text-xl font-bold text-gray-800 mb-3">{section.title}</h3>
                        {section.content && <p className="text-gray-700">{section.content}</p>}
                        {section.subsections && (
                          <div className="mt-4 space-y-3">
                            {section.subsections.map((sub, sIdx) => (
                              <div key={sIdx} className="ml-4">
                                <h4 className="font-semibold text-gray-700">{sub.title}</h4>
                                {sub.content && <p className="text-gray-600 text-sm">{sub.content}</p>}
                                {sub.items && (
                                  <ul className="list-disc list-inside text-gray-600 text-sm mt-1">
                                    {sub.items.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <EmptyState message="No PRD data available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {dashboardData && (dashboardData.cohortRetention.length > 0 || dashboardData.trendAnalysis.length > 0) ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics</h2>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Total Cohorts</div>
                        <div className="text-3xl font-bold mt-2">{outputData?.analytics?.cohortAnalysis?.cohorts?.length || 0}</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Churn Risk Entities</div>
                        <div className="text-3xl font-bold mt-2">{dashboardData.churnRisk.filter(c => c.riskScore > 0.5).length}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                        <div className="text-sm opacity-90">Month-6 Retention</div>
                        <div className="text-3xl font-bold mt-2">
                          {dashboardData.cohortRetention.find(c => c.month === 'Month 6')?.retention.toFixed(0) || 'N/A'}%
                        </div>
                      </div>
                    </div>

                    {dashboardData.cohortRetention.length > 0 && (
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
                    )}

                    {dashboardData.trendAnalysis.length > 0 && (
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Trend Analysis</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={dashboardData.trendAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f630" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {dashboardData.distributionAnalysis.length > 0 && (
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Distribution Analysis</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={dashboardData.distributionAnalysis} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percentage }) => `${category}: ${percentage}%`}>
                              {dashboardData.distributionAnalysis.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {dashboardData.rfmAnalysis.length > 0 && (
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">RFM Segmentation</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={dashboardData.rfmAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="segment" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8b5cf6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {dashboardData.churnRisk.length > 0 && (
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Churn Risk Scores</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Entity</th>
                                <th className="text-left py-2">Risk Score</th>
                                <th className="text-left py-2">Days Inactive</th>
                                <th className="text-left py-2">Last Activity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData.churnRisk.slice(0, 10).map((item, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="py-2">{item.entityName}</td>
                                  <td className="py-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      item.riskScore > 0.7 ? 'bg-red-100 text-red-700' :
                                      item.riskScore > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {(item.riskScore * 100).toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="py-2">{item.daysInactive}</td>
                                  <td className="py-2">{item.lastActivity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState message="No analytics data available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {outputData?.dashboards && outputData.dashboards.length > 0 ? (
                  <>
                    <div className="flex gap-4 mb-6">
                      {outputData.dashboards.map(dash => (
                        <button
                          key={dash.name}
                          onClick={() => setActiveDashboard(dash.name.toLowerCase().replace('dashboard', ''))}
                          className={`px-6 py-3 rounded-lg font-medium capitalize ${
                            activeDashboard === dash.name.toLowerCase().replace('dashboard', '')
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dash.name.replace('Dashboard', '')}
                        </button>
                      ))}
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">✓ Dashboard Components Generated</h3>
                      <p className="text-green-700 text-sm">
                        {outputData.dashboards.length} React dashboard components ready for use
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {outputData.dashboards.map(dash => (
                        <div key={dash.file} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50">
                          <div className="text-2xl">⚛️</div>
                          <div>
                            <div className="font-medium text-gray-800">{dash.file}</div>
                            <div className="text-sm text-gray-500">React Component</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="No dashboard components available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'powerbi' && (
              <div className="space-y-6">
                {outputData?.powerbi && Object.keys(outputData.powerbi).length > 0 ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800">Power BI Export Resources</h2>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                      <h3 className="font-semibold text-yellow-900 mb-3">📊 Power BI Integration</h3>
                      <p className="text-yellow-800">DAX measures, date tables, and import instructions ready for Power BI Desktop.</p>
                    </div>
                    
                    {outputData.powerbi['power_bi_measures.dax'] && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-gray-800">DAX Measures</h3>
                          <button onClick={() => downloadFolder('powerbi')} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                            📥 Download All Power BI
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto text-sm font-mono max-h-80">
                          {outputData.powerbi['power_bi_measures.dax']}
                        </pre>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      {Object.keys(outputData.powerbi).map(file => (
                        <div key={file} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50">
                          <div className="text-2xl">📄</div>
                          <div>
                            <div className="font-medium text-gray-800">{file}</div>
                            <div className="text-sm text-gray-500">{file.endsWith('.dax') ? 'DAX Measures' : file.endsWith('.m') ? 'Power Query' : 'Documentation'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="No Power BI resources available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'deploy' && (
              <div className="space-y-6">
                {outputData?.deployScripts && outputData.deployScripts.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Deployment Scripts</h2>
                      <button onClick={() => downloadFolder('deploy')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        📥 Download All Scripts
                      </button>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                      <h3 className="font-semibold text-green-900 mb-3">🚀 Automated Deployment</h3>
                      <p className="text-green-800">Complete bash scripts for PostgreSQL database setup, data import, and dashboard deployment.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {outputData.deployScripts.map(script => (
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
                  </>
                ) : (
                  <EmptyState message="No deployment scripts available. Run the pipeline first." />
                )}
              </div>
            )}

            {activeTab === 'businessContext' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Stage 11: Business Context Scraper</h2>
                  {businessContextSaved && (
                    <span className="text-green-600 font-medium">Saved successfully!</span>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">📋 Template Mode</h3>
                  <p className="text-amber-700 text-sm">
                    This stage provides a template for capturing business context. Fill in the sections below to enhance your analytics with industry-specific insights.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">🏭 Industry Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry Name</label>
                          <input type="text" value={businessContext.industry} onChange={(e) => updateBusinessContext('industry', e.target.value)} placeholder="e.g., Advertising & Marketing" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                          <select value={businessContext.companySize} onChange={(e) => updateBusinessContext('companySize', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select size...</option>
                            <option value="Small (1-50 employees)">Small (1-50 employees)</option>
                            <option value="Medium (51-500 employees)">Medium (51-500 employees)</option>
                            <option value="Large (500+ employees)">Large (500+ employees)</option>
                            <option value="Enterprise (5000+ employees)">Enterprise (5000+ employees)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                          <select value={businessContext.region} onChange={(e) => updateBusinessContext('region', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select region...</option>
                            <option value="North America">North America</option>
                            <option value="Europe">Europe</option>
                            <option value="Asia Pacific">Asia Pacific</option>
                            <option value="Latin America">Latin America</option>
                            <option value="Global">Global</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">📊 Industry Size & Growth</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Addressable Market (TAM)</label>
                          <input type="text" value={businessContext.marketSize} onChange={(e) => updateBusinessContext('marketSize', e.target.value)} placeholder="e.g., $850 billion globally" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Growth Rate</label>
                          <input type="text" value={businessContext.growthRate} onChange={(e) => updateBusinessContext('growthRate', e.target.value)} placeholder="e.g., 5.8% CAGR" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Key Market Trends</label>
                          <textarea rows={3} value={businessContext.marketTrends} onChange={(e) => updateBusinessContext('marketTrends', e.target.value)} placeholder="e.g., Digital transformation, AI adoption, sustainability focus..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">📈 Key Performance Metrics</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Primary KPIs</label>
                          <textarea rows={3} value={businessContext.primaryKPIs} onChange={(e) => updateBusinessContext('primaryKPIs', e.target.value)} placeholder="e.g., Client Retention Rate, Revenue per Client, Campaign ROI, Employee Utilization..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry Benchmarks</label>
                          <textarea rows={3} value={businessContext.benchmarks} onChange={(e) => updateBusinessContext('benchmarks', e.target.value)} placeholder="e.g., Average retention: 85%, Average revenue growth: 12%..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">⚠️ Common Pain Points</h3>
                      <div className="space-y-3">
                        <textarea rows={4} value={businessContext.painPoints} onChange={(e) => updateBusinessContext('painPoints', e.target.value)} placeholder="e.g., Client churn, resource allocation inefficiencies, project profitability tracking, invoicing delays..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">🛠️ Recommended Tech Stack</h3>
                      <div className="space-y-3">
                        <textarea rows={4} value={businessContext.techStack} onChange={(e) => updateBusinessContext('techStack', e.target.value)} placeholder="e.g., CRM: Salesforce/HubSpot, Project Management: Monday/Asana, Analytics: Tableau/Power BI, ERP: NetSuite..." className="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={saveBusinessContext} disabled={businessContextSaving} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                    {businessContextSaving ? 'Saving...' : '💾 Save Business Context'}
                  </button>
                  <button onClick={() => downloadFile('docs/business_context.json')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                    📄 Download JSON
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">💡 How This Data Is Used</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Industry context helps customize dashboard KPIs and metrics</li>
                    <li>• Pain points inform analytics focus areas and alerts</li>
                    <li>• Benchmarks enable comparison charts and performance tracking</li>
                    <li>• Tech stack recommendations guide deployment configurations</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Pipeline Summary</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Tables</div>
                    <div className="text-3xl font-bold mt-2">{outputData?.schema?.tables?.length || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Data Files</div>
                    <div className="text-3xl font-bold mt-2">{outputData?.dataFiles?.length || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Total Rows</div>
                    <div className="text-3xl font-bold mt-2">{outputData?.dataFiles?.reduce((sum, f) => sum + f.rowCount, 0) || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">Dashboards</div>
                    <div className="text-3xl font-bold mt-2">{outputData?.dashboards?.length || 0}</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Generated Outputs</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.schema ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Schema JSON</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.sql ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>SQL DDL</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.dataFiles?.length ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Synthetic Data</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.requirements ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Requirements Doc</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.prd ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>PRD</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.analytics ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Analytics</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.dashboards?.length ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Dashboards</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.powerbi ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Power BI</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${outputData?.deployScripts?.length ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Deploy Scripts</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={downloadAllAsZip}
                    className="flex-1 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    📦 Download Everything as ZIP
                  </button>
                  <button
                    onClick={openFolder}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    📁 Open Output Folder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📭</div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
