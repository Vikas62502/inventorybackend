/// <reference types="express" />

interface UserAttributes {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'super-admin' | 'admin' | 'agent' | 'account';
  is_active: boolean;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserAttributes;
    }
  }
}

export {};

