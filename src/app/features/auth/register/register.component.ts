import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password')?.value;
  const confirm = control.get('password_confirmation')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-register',
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
          <p class="text-gray-500 mt-1">Crear cuenta</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field class="w-full mb-4" appearance="outline">
            <mat-label>Nombre completo</mat-label>
            <input matInput type="text" formControlName="name" autocomplete="name" aria-required="true" />
            <mat-icon matPrefix>person</mat-icon>
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>El nombre es requerido</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="w-full mb-4" appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" aria-required="true" />
            <mat-icon matPrefix>email</mat-icon>
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <mat-error>Ingresá un correo válido</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="w-full mb-4" appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput [type]="showPw() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" aria-required="true" />
            <mat-icon matPrefix>lock</mat-icon>
            <button mat-icon-button matSuffix type="button" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Ocultar' : 'Mostrar'">
              <mat-icon>{{ showPw() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <mat-error>Mínimo 8 caracteres</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="w-full mb-6" appearance="outline">
            <mat-label>Confirmar contraseña</mat-label>
            <input matInput [type]="showPw() ? 'text' : 'password'" formControlName="password_confirmation" autocomplete="new-password" aria-required="true" />
            <mat-icon matPrefix>lock_outline</mat-icon>
            @if (form.errors?.['passwordsMismatch'] && form.get('password_confirmation')?.touched) {
              <mat-error>Las contraseñas no coinciden</mat-error>
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
            aria-label="Crear cuenta"
          >
            @if (loading()) {
              <mat-spinner diameter="20" class="inline-block mr-2" />
            }
            Crear cuenta
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          ¿Ya tenés cuenta?
          <a routerLink="/auth/login" class="text-indigo-600 font-medium hover:underline">Iniciar sesión</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly showPw = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);

    const { name, email, password, password_confirmation } = this.form.getRawValue();
    this.auth.register(name!, email!, password!, password_confirmation!).subscribe({
      next: () => {
        const role = this.auth.role();
        this.router.navigate([role === 'ADMIN' ? '/admin' : '/parent']);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.error?.errors;
        this.errorMsg.set(typeof msg === 'string' ? msg : 'Error al registrarse');
        this.loading.set(false);
      },
    });
  }
}
