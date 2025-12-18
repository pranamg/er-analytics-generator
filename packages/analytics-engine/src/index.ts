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

export interface AnalyticsResult {
  cohortAnalysis: CohortAnalysis;
  revenueCohorts: RevenueCohort[];
  churnRisk: ChurnRiskScore[];
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

  return {
    cohortAnalysis: { cohorts: cohortData, averageRetention: avgRetention },
    revenueCohorts,
    churnRisk,
  };
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
