import { Routes } from '@angular/router';

export const parentRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/parent-layout.component').then(m => m.ParentLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./payments/parent-payments.component').then(m => m.ParentPaymentsComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./history/payment-history.component').then(m => m.PaymentHistoryComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/document-upload.component').then(m => m.DocumentUploadComponent),
      },
    ],
  },
];
