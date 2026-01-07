import { z } from 'zod';

// Helper to validate array field
const validateArrayField = (fieldName: string) => 
  z.array(z.string().min(1, `${fieldName} items must be non-empty strings`))
    .min(1, `At least one ${fieldName.toLowerCase()} is required`);

// Schema for product catalog structure
export const productCatalogSchema = z.object({
  panels: z.object({
    brands: validateArrayField('Panel brands'),
    sizes: validateArrayField('Panel sizes')
  }),
  inverters: z.object({
    types: validateArrayField('Inverter types'),
    brands: validateArrayField('Inverter brands'),
    sizes: validateArrayField('Inverter sizes')
  }),
  structures: z.object({
    types: validateArrayField('Structure types'),
    sizes: validateArrayField('Structure sizes')
  }),
  meters: z.object({
    brands: validateArrayField('Meter brands')
  }),
  cables: z.object({
    brands: validateArrayField('Cable brands'),
    sizes: validateArrayField('Cable sizes')
  }),
  acdb: z.object({
    options: validateArrayField('ACDB options')
  }),
  dcdb: z.object({
    options: validateArrayField('DCDB options')
  })
});

// Schema for PUT request - accepts the full catalog structure
export const updateProductCatalogSchema = productCatalogSchema;
