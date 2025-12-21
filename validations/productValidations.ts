import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  model: z.string().min(1, 'Model is required').max(255, 'Model must be less than 255 characters'),
  wattage: z.string().nullable().optional(),
  category: z.string().min(1, 'Category is required').max(255, 'Category must be less than 255 characters'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').optional().default(0),
  unit_price: z.number().min(0, 'Unit price cannot be negative').nullable().optional(),
  image: z.string().nullable().optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  model: z.string().min(1).max(255).optional(),
  wattage: z.string().nullable().optional(),
  category: z.string().min(1).max(255).optional(),
  quantity: z.number().int().min(0).optional(),
  unit_price: z.number().min(0).nullable().optional(),
  image: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});



