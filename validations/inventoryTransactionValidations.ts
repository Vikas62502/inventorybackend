import { z } from 'zod';

export const createInventoryTransactionSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  transaction_type: z.enum(['purchase', 'sale', 'return', 'adjustment', 'transfer'], 'Invalid transaction type'),
  quantity: z.number().int('Quantity must be an integer'),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  related_stock_request_id: z.string().nullable().optional(),
  related_sale_id: z.string().nullable().optional()
});

