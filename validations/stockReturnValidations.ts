import { z } from 'zod';

export const createStockReturnSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export const updateStockReturnSchema = z.object({
  quantity: z.number().int().positive('Quantity must be greater than 0').optional(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});



