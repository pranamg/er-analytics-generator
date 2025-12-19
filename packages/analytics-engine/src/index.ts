export interface CohortData {
  cohort: string;
  size: number;
  retention: { month: number; rate: number; count: number }[];
}

export interface CohortAnalysis {
  cohorts: CohortData[];
  averageRetention: { month: string; retention: number }[];
}

export interface RevenueCohort {
  cohort: string;
  revenue: number;
  clientCount: number;
  revenuePerClient: number;
}

export interface ChurnRiskScore {
  entityId: number;
  entityName: string;
  riskScore: number;
  lastActivity: string;
  daysInactive: number;
}

export interface TrendData {
  period: string;
  value: number;
  growth: number;
}

export interface DistributionData {
  category: string;
  count: number;
  percentage: number;
}

export interface TopNData {
  entity: string;
  metric: string;
  value: number;
}

export interface RFMSegment {
  segment: string;
  count: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
}

export interface AnalyticsResult {
  cohortAnalysis: CohortAnalysis;
  revenueCohorts: RevenueCohort[];
  churnRisk: ChurnRiskScore[];
  trendAnalysis: TrendData[];
  distributionAnalysis: DistributionData[];
  topNAnalysis: TopNData[];
  rfmAnalysis: RFMSegment[];
}

import * as fs from 'node:fs';
import * as path from 'node:path';

export async function saveAnalyticsResults(
  results: AnalyticsResult,
  outputDir: string
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save individual files per design doc specification
  fs.writeFileSync(
    path.join(outputDir, 'cohort_analysis.json'),
    JSON.stringify(results.cohortAnalysis, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'retention_curves.json'),
    JSON.stringify({
      averageRetention: results.cohortAnalysis.averageRetention,
      cohortRetention: results.cohortAnalysis.cohorts.map(c => ({
        cohort: c.cohort,
        size: c.size,
        retention: c.retention,
      })),
    }, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'revenue_cohorts.json'),
    JSON.stringify(results.revenueCohorts, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, 'churn_risk_scores.json'),
    JSON.stringify(results.churnRisk, null, 2)
  );

  // Also save the combined analytics.json for backward compatibility
  fs.writeFileSync(
    path.join(outputDir, 'analytics.json'),
    JSON.stringify(results, null, 2)
  );
}

export function performCohortAnalysis(
  entities: { id: number; name: string; signup_date: string }[],
  activities: { entity_id: number; date: string; amount?: number }[]
): AnalyticsResult {
  const cohorts = groupByCohort(entities);
  const cohortData = calculateRetention(cohorts, activities);
  const avgRetention = calculateAverageRetention(cohortData);
  const revenueCohorts = calculateRevenueCohorts(cohorts, activities);
  const churnRisk = calculateChurnRisk(entities, activities);
  const trendAnalysis = calculateTrendAnalysis(activities);
  const distributionAnalysis = calculateDistribution(entities, activities);
  const topNAnalysis = calculateTopN(entities, activities);
  const rfmAnalysis = calculateRFM(entities, activities);

  return {
    cohortAnalysis: { cohorts: cohortData, averageRetention: avgRetention },
    revenueCohorts,
    churnRisk,
    trendAnalysis,
    distributionAnalysis,
    topNAnalysis,
    rfmAnalysis,
  };
}

function calculateTrendAnalysis(activities: { date: string; amount?: number }[]): TrendData[] {
  const monthlyData = new Map<string, { count: number; amount: number }>();
  
  for (const activity of activities) {
    const month = activity.date.substring(0, 7);
    const existing = monthlyData.get(month) || { count: 0, amount: 0 };
    monthlyData.set(month, {
      count: existing.count + 1,
      amount: existing.amount + (activity.amount || 0),
    });
  }
  
  const sorted = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const result: TrendData[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const [month, data] = sorted[i];
    const prevValue = i > 0 ? sorted[i - 1][1].amount : data.amount;
    const growth = prevValue > 0 ? ((data.amount - prevValue) / prevValue) * 100 : 0;
    
    result.push({
      period: formatMonthLabel(month),
      value: Math.round(data.amount),
      growth: parseFloat(growth.toFixed(1)),
    });
  }
  
  return result.slice(-12);
}

function calculateDistribution(
  entities: { id: number; name: string }[],
  activities: { entity_id: number; amount?: number }[]
): DistributionData[] {
  const entityActivity = new Map<number, number>();
  
  for (const activity of activities) {
    const count = entityActivity.get(activity.entity_id) || 0;
    entityActivity.set(activity.entity_id, count + 1);
  }
  
  const activityCounts = Array.from(entityActivity.values());
  const total = activityCounts.reduce((sum, c) => sum + c, 0);
  
  const buckets = [
    { name: 'High Activity', min: 10, max: Infinity },
    { name: 'Medium Activity', min: 5, max: 9 },
    { name: 'Low Activity', min: 1, max: 4 },
    { name: 'No Activity', min: 0, max: 0 },
  ];
  
  const result: DistributionData[] = [];
  
  for (const bucket of buckets) {
    const count = activityCounts.filter(c => c >= bucket.min && c <= bucket.max).length;
    result.push({
      category: bucket.name,
      count,
      percentage: parseFloat(((count / entities.length) * 100).toFixed(1)),
    });
  }
  
  return result;
}

function calculateTopN(
  entities: { id: number; name: string }[],
  activities: { entity_id: number; amount?: number }[]
): TopNData[] {
  const entityRevenue = new Map<number, number>();
  
  for (const activity of activities) {
    if (activity.amount) {
      const current = entityRevenue.get(activity.entity_id) || 0;
      entityRevenue.set(activity.entity_id, current + activity.amount);
    }
  }
  
  const sorted = Array.from(entityRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  return sorted.map(([entityId, revenue]) => {
    const entity = entities.find(e => e.id === entityId);
    return {
      entity: entity?.name || `Entity ${entityId}`,
      metric: 'Revenue',
      value: Math.round(revenue),
    };
  });
}

function calculateRFM(
  entities: { id: number; name: string }[],
  activities: { entity_id: number; date: string; amount?: number }[]
): RFMSegment[] {
  const now = new Date();
  const entityMetrics = new Map<number, { recency: number; frequency: number; monetary: number }>();
  
  for (const entity of entities) {
    const entityActivities = activities.filter(a => a.entity_id === entity.id);
    
    if (entityActivities.length === 0) {
      entityMetrics.set(entity.id, { recency: 365, frequency: 0, monetary: 0 });
      continue;
    }
    
    const lastActivity = entityActivities.sort((a, b) => b.date.localeCompare(a.date))[0];
    const recency = Math.floor((now.getTime() - new Date(lastActivity.date).getTime()) / (1000 * 60 * 60 * 24));
    const frequency = entityActivities.length;
    const monetary = entityActivities.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    entityMetrics.set(entity.id, { recency, frequency, monetary });
  }
  
  const metrics = Array.from(entityMetrics.values());
  const avgRecency = metrics.reduce((sum, m) => sum + m.recency, 0) / metrics.length;
  const avgFrequency = metrics.reduce((sum, m) => sum + m.frequency, 0) / metrics.length;
  const avgMonetary = metrics.reduce((sum, m) => sum + m.monetary, 0) / metrics.length;
  
  const segments: Record<string, { ids: number[]; recency: number[]; frequency: number[]; monetary: number[] }> = {
    'Champions': { ids: [], recency: [], frequency: [], monetary: [] },
    'Loyal Customers': { ids: [], recency: [], frequency: [], monetary: [] },
    'At Risk': { ids: [], recency: [], frequency: [], monetary: [] },
    'Need Attention': { ids: [], recency: [], frequency: [], monetary: [] },
    'Lost': { ids: [], recency: [], frequency: [], monetary: [] },
  };
  
  for (const [entityId, m] of entityMetrics) {
    let segment: string;
    
    if (m.recency < avgRecency && m.frequency > avgFrequency && m.monetary > avgMonetary) {
      segment = 'Champions';
    } else if (m.frequency > avgFrequency && m.monetary > avgMonetary) {
      segment = 'Loyal Customers';
    } else if (m.recency > avgRecency * 2) {
      segment = 'Lost';
    } else if (m.recency > avgRecency) {
      segment = 'At Risk';
    } else {
      segment = 'Need Attention';
    }
    
    segments[segment].ids.push(entityId);
    segments[segment].recency.push(m.recency);
    segments[segment].frequency.push(m.frequency);
    segments[segment].monetary.push(m.monetary);
  }
  
  return Object.entries(segments).map(([name, data]) => ({
    segment: name,
    count: data.ids.length,
    avgRecency: data.recency.length > 0 ? Math.round(data.recency.reduce((a, b) => a + b, 0) / data.recency.length) : 0,
    avgFrequency: data.frequency.length > 0 ? parseFloat((data.frequency.reduce((a, b) => a + b, 0) / data.frequency.length).toFixed(1)) : 0,
    avgMonetary: data.monetary.length > 0 ? Math.round(data.monetary.reduce((a, b) => a + b, 0) / data.monetary.length) : 0,
  }));
}

function formatMonthLabel(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function groupByCohort(entities: { id: number; signup_date: string }[]): Map<string, number[]> {
  const cohorts = new Map<string, number[]>();
  
  for (const entity of entities) {
    const cohortMonth = entity.signup_date.substring(0, 7);
    if (!cohorts.has(cohortMonth)) {
      cohorts.set(cohortMonth, []);
    }
    cohorts.get(cohortMonth)!.push(entity.id);
  }
  
  return cohorts;
}

function calculateRetention(
  cohorts: Map<string, number[]>,
  activities: { entity_id: number; date: string }[]
): CohortData[] {
  const result: CohortData[] = [];

  for (const [cohortMonth, entityIds] of cohorts) {
    const cohortDate = new Date(cohortMonth + '-01');
    const retention: CohortData['retention'] = [];

    for (let monthOffset = 0; monthOffset <= 6; monthOffset++) {
      const targetDate = new Date(cohortDate);
      targetDate.setMonth(targetDate.getMonth() + monthOffset);
      const targetMonth = targetDate.toISOString().substring(0, 7);

      const activeCount = new Set(
        activities
          .filter(a => entityIds.includes(a.entity_id) && a.date.startsWith(targetMonth))
          .map(a => a.entity_id)
      ).size;

      retention.push({
        month: monthOffset,
        rate: entityIds.length > 0 ? (activeCount / entityIds.length) * 100 : 0,
        count: activeCount,
      });
    }

    result.push({
      cohort: formatCohortLabel(cohortMonth),
      size: entityIds.length,
      retention,
    });
  }

  return result.sort((a, b) => a.cohort.localeCompare(b.cohort));
}

function calculateAverageRetention(cohorts: CohortData[]): { month: string; retention: number }[] {
  const result: { month: string; retention: number }[] = [];

  for (let month = 0; month <= 6; month++) {
    const rates = cohorts.map(c => c.retention[month]?.rate || 0).filter(r => r > 0);
    const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    result.push({ month: `Month ${month}`, retention: parseFloat(avg.toFixed(1)) });
  }

  return result;
}

function calculateRevenueCohorts(
  cohorts: Map<string, number[]>,
  activities: { entity_id: number; amount?: number }[]
): RevenueCohort[] {
  const result: RevenueCohort[] = [];

  for (const [cohortMonth, entityIds] of cohorts) {
    const revenue = activities
      .filter(a => entityIds.includes(a.entity_id) && a.amount)
      .reduce((sum, a) => sum + (a.amount || 0), 0);

    result.push({
      cohort: formatCohortLabel(cohortMonth),
      revenue: Math.round(revenue),
      clientCount: entityIds.length,
      revenuePerClient: entityIds.length > 0 ? Math.round(revenue / entityIds.length) : 0,
    });
  }

  return result;
}

function calculateChurnRisk(
  entities: { id: number; name: string }[],
  activities: { entity_id: number; date: string }[]
): ChurnRiskScore[] {
  const now = new Date();
  const result: ChurnRiskScore[] = [];

  for (const entity of entities) {
    const entityActivities = activities.filter(a => a.entity_id === entity.id);
    const lastActivity = entityActivities.length > 0
      ? entityActivities.sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;

    const daysInactive = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 365;

    const riskScore = Math.min(1, daysInactive / 90);

    result.push({
      entityId: entity.id,
      entityName: entity.name,
      riskScore: parseFloat(riskScore.toFixed(2)),
      lastActivity: lastActivity || 'Never',
      daysInactive,
    });
  }

  return result.sort((a, b) => b.riskScore - a.riskScore);
}

function formatCohortLabel(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
