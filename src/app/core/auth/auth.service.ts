import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { AuthResponse, JwtPayload, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'edupay_token';
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly token = this._token.asReadonly();

  readonly payload = computed<JwtPayload | null>(() => {
    const t = this._token();
    if (!t) return null;
    try {
      return jwtDecode<JwtPayload>(t);
    } catch {
      return null;
    }
  });

  readonly isAuthenticated = computed(() => {
    const p = this.payload();
    if (!p) return false;
    return p.exp * 1000 > Date.now();
  });

  readonly role = computed<UserRole | null>(() => this.payload()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly isParent = computed(() => this.role() === 'PARENT');
  readonly familyId = computed(() => this.payload()?.familyId ?? null);
  readonly userName = computed(() => this.payload()?.name ?? this.payload()?.email ?? null);

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password }).pipe(
      tap(res => this.setToken(res.access_token)),
    );
  }

  register(name: string, email: string, password: string, password_confirmation: string) {
    return this.http.post<AuthResponse>(`${API}/auth/register`, {
      name, email, password, password_confirmation,
    }).pipe(
      tap(res => this.setToken(res.access_token)),
    );
  }

  logout() {
    this.http.post(`${API}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }
}
