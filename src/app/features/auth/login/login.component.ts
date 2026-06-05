import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-indigo-700">EduPay</h1>
          <p class="text-gray-500 mt-1">Sistema de gestión de pagos educativos</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field class="w-full mb-4" appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" aria-required="true" />
            <mat-icon matPrefix>email</mat-icon>
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <mat-error>Ingresá un correo válido</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="w-full mb-6" appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" aria-required="true" />
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <mat-error>La contraseña es requerida</mat-error>
            }
          </mat-form-field>

          @if (errorMsg()) {
            <p class="text-red-600 text-sm mb-4 text-center" role="alert">{{ errorMsg() }}</p>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="w-full"
            [disabled]="loading()"
            aria-label="Iniciar sesión"
          >
            @if (loading()) {
              <mat-spinner diameter="20" class="inline-block mr-2" />
            }
            Iniciar sesión
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          ¿No tenés cuenta?
          <a routerLink="/auth/register" class="text-indigo-600 font-medium hover:underline">Registrate</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => {
        const role = this.auth.role();
        this.router.navigate([role === 'ADMIN' ? '/admin' : '/parent']);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Credenciales incorrectas');
        this.loading.set(false);
      },
    });
  }
}
