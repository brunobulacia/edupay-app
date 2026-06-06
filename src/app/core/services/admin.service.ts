import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ParentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  family_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listUsers() {
    return this.http.get<ParentUser[]>(`${this.api}/admin/users`);
  }

  createUser(data: { name: string; email: string; password: string; role: string; family_id: string | null }) {
    return this.http.post<ParentUser>(`${this.api}/admin/users`, data);
  }

  assignFamily(userId: number, familyId: string | null) {
    return this.http.patch<ParentUser>(`${this.api}/admin/users/${userId}/family`, { family_id: familyId });
  }
}
