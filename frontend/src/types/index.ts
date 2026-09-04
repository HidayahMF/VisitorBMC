export interface User {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'SECURITY';
}

export interface AuthResponse {
  user: User;
}
