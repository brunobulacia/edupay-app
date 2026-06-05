import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';

export interface CollectionByMethod {
  paymentMethod: string;
  amount: number;
}

export interface CollectionDashboard {
  year: number;
  month: number;
  totalCollected: number;
  byMethod: CollectionByMethod[];
}

export interface DelinquencyDashboard {
  year: number;
  month: number;
  familiesInArrears: number;
  totalDebt: number;
}

export interface FamilyInfo {
  id: string;
  externalId: string;
  tutorName: string;
  tutorEmail: string;
  active: boolean;
}

export interface FamilyFinancialStatus {
  family: FamilyInfo;
  totalDebt: number;
  riskScore: number;
  monthsPaid: number;
  monthsPending: number;
  monthsInArrears: number;
}

export interface StudentArrears {
  studentExternalId: string;
  fullName: string;
  pendingAmount: number;
}

export interface DocumentView {
  id: string;
  familyId: string;
  familyName: string;
  documentType: string;
  storageKey: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
}

const COLLECTION_QUERY = gql`
  query CollectionDashboard($year: Int!, $month: Int!) {
    collectionDashboard(year: $year, month: $month) {
      year
      month
      totalCollected
      byMethod {
        paymentMethod
        amount
      }
    }
  }
`;

const DELINQUENCY_QUERY = gql`
  query DelinquencyDashboard($year: Int!, $month: Int!) {
    delinquencyDashboard(year: $year, month: $month) {
      year
      month
      familiesInArrears
      totalDebt
    }
  }
`;

const FAMILY_STATUS_QUERY = gql`
  query FamilyStatus($familyId: ID!) {
    familyFinancialStatus(familyId: $familyId) {
      family {
        id
        externalId
        tutorName
        tutorEmail
        active
      }
      totalDebt
      riskScore
      monthsPaid
      monthsPending
      monthsInArrears
    }
  }
`;

const STUDENTS_IN_ARREARS_QUERY = gql`
  query StudentsInArrears($limit: Int) {
    studentsInArrears(limit: $limit) {
      studentExternalId
      fullName
      pendingAmount
    }
  }
`;

const REGISTER_FAMILY_MUTATION = gql`
  mutation RegisterFamily($input: RegisterFamilyInput!) {
    registerFamily(input: $input) {
      id
      externalId
      tutorName
      tutorEmail
      active
    }
  }
`;

const REVIEW_DOCUMENT_MUTATION = gql`
  mutation ReviewDocument($input: ReviewDocumentInput!) {
    reviewDocument(input: $input) {
      id
      documentId
      status
    }
  }
`;

const LIST_DOCUMENTS_QUERY = gql`
  query ListDocuments($status: String) {
    listDocuments(status: $status) {
      id
      familyId
      familyName
      documentType
      storageKey
      status
      uploadedBy
      uploadedAt
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class ErpService {
  private readonly apollo = inject(Apollo);

  getCollectionDashboard(year: number, month: number) {
    return this.apollo
      .query<{ collectionDashboard: CollectionDashboard }>({
        query: COLLECTION_QUERY,
        variables: { year, month },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.collectionDashboard));
  }

  getDelinquencyDashboard(year: number, month: number) {
    return this.apollo
      .query<{ delinquencyDashboard: DelinquencyDashboard }>({
        query: DELINQUENCY_QUERY,
        variables: { year, month },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.delinquencyDashboard));
  }

  getFamilyStatus(familyId: string | number) {
    return this.apollo
      .query<{ familyFinancialStatus: FamilyFinancialStatus }>({
        query: FAMILY_STATUS_QUERY,
        variables: { familyId: String(familyId) },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.familyFinancialStatus));
  }

  getStudentsInArrears(limit = 50) {
    return this.apollo
      .query<{ studentsInArrears: StudentArrears[] }>({
        query: STUDENTS_IN_ARREARS_QUERY,
        variables: { limit },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.studentsInArrears));
  }

  registerFamily(input: { externalId: string; tutorName: string; tutorEmail: string }) {
    return this.apollo
      .mutate<{ registerFamily: FamilyInfo }>({
        mutation: REGISTER_FAMILY_MUTATION,
        variables: { input },
      })
      .pipe(map((r) => r.data!.registerFamily));
  }

  reviewDocument(input: {
    documentId: string;
    reviewerUser: string;
    status: 'APPROVED' | 'REJECTED';
    reason?: string;
  }) {
    return this.apollo
      .mutate<{ reviewDocument: { id: string; documentId: string; status: string } }>({
        mutation: REVIEW_DOCUMENT_MUTATION,
        variables: { input },
      })
      .pipe(map((r) => r.data!.reviewDocument));
  }

  listDocuments(status?: string) {
    return this.apollo
      .query<{ listDocuments: DocumentView[] }>({
        query: LIST_DOCUMENTS_QUERY,
        variables: { status: status ?? null },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.listDocuments));
  }
}
