export type PaymentMethod = 'QR' | 'STRIPE' | 'BLOCKCHAIN';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED';

export interface Payment {
  id: string;
  familyId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
}

export interface Balance {
  familyId: string;
  totalDue: number;
  totalPaid: number;
  pendingAmount: number;
}
