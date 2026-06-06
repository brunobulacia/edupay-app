import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'families',
        loadComponent: () =>
          import('./families/families.component').then(m => m.FamiliesComponent),
      },
      {
        path: 'families/new',
        loadComponent: () =>
          import('./families/family-form.component').then(m => m.FamilyFormComponent),
      },
      {
        path: 'families/:id',
        loadComponent: () =>
          import('./families/family-detail.component').then(m => m.FamilyDetailComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./payments/payments.component').then(m => m.PaymentsComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/document-queue.component').then(m => m.DocumentQueueComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'bi',
        loadComponent: () =>
          import('./bi/bi-layout.component').then(m => m.BiLayoutComponent),
        children: [
          { path: '', redirectTo: 'collection', pathMatch: 'full' },
          {
            path: 'collection',
            loadComponent: () =>
              import('./bi/collection-dashboard.component').then(m => m.CollectionDashboardComponent),
          },
          {
            path: 'delinquency',
            loadComponent: () =>
              import('./bi/delinquency-dashboard.component').then(m => m.DelinquencyDashboardComponent),
          },
          {
            path: 'projection',
            loadComponent: () =>
              import('./bi/projection-dashboard.component').then(m => m.ProjectionDashboardComponent),
          },
          {
            path: 'segmentation',
            loadComponent: () =>
              import('./bi/segmentation-dashboard.component').then(m => m.SegmentationDashboardComponent),
          },
        ],
      },
    ],
  },
];
