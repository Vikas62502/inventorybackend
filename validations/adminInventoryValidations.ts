import { z } from 'zod';

export const upsertAdminInventorySchema = z.object({
  admin_id: z.string().min(1, 'Admin ID is required'),
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative')
});

export const updateAdminInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative')
});


