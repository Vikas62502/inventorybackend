import { z } from 'zod';

export const updateDealerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  mobile: z.string().min(10).max(15).optional(),
  company: z.string().max(255).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

