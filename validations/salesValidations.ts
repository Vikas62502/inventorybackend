import { z } from 'zod';

const saleItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1, 'Product name is required'),
  model: z.string().min(1, 'Model is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  line_total: z.number().min(0, 'Line total cannot be negative'),
  gst_rate: z.number().min(0).max(100).optional()
});

const addressSchema = z.object({
  id: z.string().optional(),
  line1: z.string().min(1, 'Address line1 is required').optional(),
  line2: z.string().nullable().optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().min(1, 'State is required').optional(),
  postal_code: z.string().min(1, 'Postal code is required').optional(),
  country: z.string().min(1, 'Country is required').optional()
});

export const createSaleSchema = z.object({
  type: z.enum(['B2B', 'B2C'], 'Type must be B2B or B2C'),
  customer_name: z.string().min(1, 'Customer name is required'),
  items: z.union([
    z.array(saleItemSchema).min(1, 'At least one item is required'),
    z.string() // Allow string for JSON parsing
  ]).optional(),
  product_id: z.string().optional(), // Legacy support
  product_name: z.string().optional(), // Legacy support
  model: z.string().optional(), // Legacy support
  quantity: z.number().int().positive().optional(), // Legacy support
  unit_price: z.number().min(0).optional(), // Legacy support
  line_total: z.number().min(0).optional(), // Legacy support
  product_summary: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  payment_status: z.enum(['pending', 'completed']).optional(),
  sale_date: z.string().datetime().or(z.date()).optional(),
  company_name: z.string().nullable().optional(),
  gst_number: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  billing_address_id: z.string().nullable().optional(),
  billing_address: addressSchema.nullable().optional(),
  delivery_address_id: z.string().nullable().optional(),
  delivery_address: addressSchema.nullable().optional(),
  delivery_matches_billing: z.boolean().or(z.string()).optional(),
  customer_email: z.string().email().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  delivery_instructions: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
}).refine((data) => {
  // Either items array/string is provided, or legacy single-item fields are provided
  return data.items !== undefined || (data.product_id !== undefined || (data.product_name !== undefined && data.model !== undefined));
}, {
  message: 'Either items array or product_id (or product_name and model) must be provided'
});

export const updateSaleSchema = z.object({
  customer_name: z.string().min(1).optional(),
  payment_status: z.enum(['pending', 'completed']).optional(),
  subtotal: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  product_summary: z.string().optional(),
  company_name: z.string().nullable().optional(),
  gst_number: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  delivery_matches_billing: z.boolean().or(z.string()).optional(),
  customer_email: z.string().email().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  delivery_instructions: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

