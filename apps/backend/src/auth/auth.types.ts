export interface RequestUser {
  id: string;
  role: 'admin' | 'user' | 'agent' | 'guest';
  isAdmin: boolean;
  name?: string;
}
