import { z } from 'zod';

export const createVisitSchema = z.object({
  quotationId: z.string().min(1),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visitTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().min(1),
  locationLink: z.string().optional(),
  notes: z.string().optional(),
  visitors: z.array(z.object({
    visitorId: z.string().min(1)
  })).optional()
}).refine((data) => {
  // If locationLink is provided and not empty, it must be a valid URL
  if (data.locationLink && data.locationLink.trim() !== '') {
    try {
      new URL(data.locationLink);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'locationLink must be a valid URL if provided',
  path: ['locationLink']
});

export const completeVisitSchema = z.object({
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export const incompleteVisitSchema = z.object({
  reason: z.string().min(1, 'Reason is required')
});

export const rescheduleVisitSchema = z.object({
  reason: z.string().min(1, 'Reason is required')
});

export const rejectVisitSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required')
});


