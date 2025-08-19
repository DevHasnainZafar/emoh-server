interface UserCountResult {
  current: {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    timePeriod: string;
    startDate: Date | null;
  };
  comparison: ComparisonData | null;
  changes: {
    total: ChangeData;
    active: ChangeData;
    blocked: ChangeData;
  } | null;
}

interface ComparisonData {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  startDate: Date;
  endDate: Date;
}

interface ChangeData {
  change: number;
  percentage: number;
  trend: 'increase' | 'decrease' | 'no-change';
  text: string;
}