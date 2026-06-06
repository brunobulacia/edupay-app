import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

type PaymentMethod = 'QR' | 'STRIPE' | 'BLOCKCHAIN';
type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED';

@Component({
  selector: 'app-parent-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Mis pagos</h1>

      <!-- New payment form -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Registrar pago</h2>
        <form [formGroup]="form" (ngSubmit)="submitPayment()" novalidate class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <mat-form-field appearance="outline">
            <mat-label>Monto (Bs.)</mat-label>
            <input matInput type="number" formControlName="amount" min="1" aria-required="true" />
            @if (form.get('amount')?.invalid && form.get('amount')?.touched) {
              <mat-error>Monto inválido</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Método de pago</mat-label>
            <mat-select formControlName="method" aria-required="true">
              <mat-option value="QR">QR</mat-option>
              <mat-option value="STRIPE">Tarjeta (Stripe)</mat-option>
              <mat-option value="BLOCKCHAIN">Blockchain</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Vencimiento</mat-label>
            <input matInput type="date" formControlName="dueDate" aria-required="true" />
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="paying()"
            aria-label="Registrar pago"
          >
            @if (paying()) {
              <mat-spinner diameter="18" class="inline-block mr-2" />
            } @else {
              <mat-icon>add</mat-icon>
            }
            Registrar
          </button>
        </form>
      </div>

      <!-- Payments list -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="48" aria-label="Cargando pagos" />
        </div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Mis pagos">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="px-6 py-3 text-right font-medium" scope="col">Monto</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Método</th>
                  <th class="px-6 py-3 text-center font-medium" scope="col">Estado</th>
                  <th class="px-6 py-3 text-left font-medium" scope="col">Vencimiento</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (p of payments(); track p.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 text-right tabular-nums font-medium">Bs. {{ p.amount }}</td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{{ p.method }}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(p.status)">{{ p.status }}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-500 text-xs">{{ p.dueDate }}</td>
                  </tr>
                }
                @empty {
                  <tr>
                    <td colspan="4" class="px-6 py-12 text-center text-gray-400">No tenés pagos registrados</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class ParentPaymentsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly payments = signal<any[]>([]);

  readonly form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    method: ['QR', Validators.required],
    dueDate: ['', Validators.required],
  });

  ngOnInit() {
    const familyId = this.auth.familyId();
    if (!familyId) { this.loading.set(false); return; }
    this.loadPayments(String(familyId));
  }

  private loadPayments(familyId: string) {
    this.http.get<any>(`${environment.apiUrl}/pagos/families/${familyId}/balance`).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.payments.set(data?.payments ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submitPayment() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.paying.set(true);

    const familyId = String(this.auth.familyId());
    const { amount, method, dueDate } = this.form.getRawValue();
    const body = { familyId, amount, method, currency: 'BOB', dueDate };

    this.http.post<any>('${environment.apiUrl}/pagos/payments', body).subscribe({
      next: (res) => {
        const payment = res?.data ?? res;
        this.payments.update(list => [payment, ...list]);
        this.form.reset({ method: 'QR' });
        this.paying.set(false);
        this.snack.open('Pago registrado exitosamente', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.paying.set(false);
        this.snack.open(err?.error?.message ?? 'Error al registrar el pago', 'OK', { duration: 4000 });
      },
    });
  }

  statusClass(status: PaymentStatus): string {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REVERSED': return 'bg-red-100 text-red-800';
    }
  }
}
