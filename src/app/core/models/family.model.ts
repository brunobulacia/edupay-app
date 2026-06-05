export interface Family {
  id: number;
  external_id: string;
  tutor_name: string;
  tutor_email: string;
  active: boolean;
  created_at: string;
}

export interface FamilyFinancialStatus {
  totalDue: number;
  totalPaid: number;
  totalOverdue: number;
  paidMonths: number[];
  pendingMonths: number[];
  overdueMonths: number[];
}

export interface RiskScore {
  familyId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  modelVersion: string;
  predictionDate: string;
  _service: string;
}

export interface ClusterResult {
  familyId: string;
  cluster: number;
  clusterLabel: string;
  recommendedAction: string;
  modelVersion: string;
  _service: string;
}
