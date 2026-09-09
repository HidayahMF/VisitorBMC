export interface User {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'SECURITY' | 'MONITORING';
}

export interface AuthResponse {
  user: User;
}
