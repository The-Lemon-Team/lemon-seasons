export interface RequestUser {
  id: string;
  role: 'admin' | 'user' | 'guest';
  isAdmin: boolean;
  name?: string;
}
