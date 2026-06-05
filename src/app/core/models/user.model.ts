export type UserRole = 'ADMIN' | 'PARENT';

export interface JwtPayload {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
  jti: string;
  prv: string;
  role?: UserRole;
  family_id?: string;
  email?: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
}
