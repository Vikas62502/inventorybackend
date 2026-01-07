/// <reference types="express" />

// Inventory System User Attributes
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

// Quotation System User Attributes
interface QuotationUserAttributes {
  id: string;
  username: string;
  role: 'dealer' | 'admin' | 'visitor';
}

declare global {
  namespace Express {
    interface Request {
      // Inventory system user
      user?: UserAttributes | QuotationUserAttributes;
      // Quotation system specific
      dealer?: {
        id: string;
        username: string;
        role: 'dealer' | 'admin';
      };
      visitor?: {
        id: string;
        username: string;
      };
    }
  }
}

export {};

