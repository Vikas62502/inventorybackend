import { z } from 'zod';

const stockRequestItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1, 'Product name is required').optional(),
  model: z.string().min(1, 'Model is required').optional(),
  quantity: z.number().int().positive('Quantity must be greater than 0')
}).refine((data) => data.product_id || (data.product_name && data.model), {
  message: 'Either product_id or both product_name and model must be provided'
});

export const createStockRequestSchema = z.object({
  items: z.union([
    z.array(stockRequestItemSchema).min(1, 'At least one item is required'),
    z.string() // Allow string for JSON parsing
  ]).optional(),
  product_id: z.string().optional(), // Legacy support
  product_name: z.string().optional(), // Legacy support
  model: z.string().optional(), // Legacy support
  quantity: z.number().int().positive().optional(), // Legacy support
  requested_from: z.string().min(1, 'Requested from is required'),
  notes: z.string().nullable().optional(),
  status: z.string().optional()
}).refine((data) => {
  // Either items array/string is provided, or legacy single-item fields are provided
  return data.items !== undefined || (data.product_id !== undefined || (data.product_name !== undefined && data.model !== undefined));
}, {
  message: 'Either items array or product_id (or product_name and model) must be provided'
});

export const updateStockRequestSchema = z.object({
  items: z.union([
    z.array(stockRequestItemSchema).min(1),
    z.string()
  ]).optional(),
  notes: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

