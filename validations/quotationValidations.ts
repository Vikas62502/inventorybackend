import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/)
});

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobile: z.string().regex(/^\d{10}$/),
  email: z.string().email(),
  address: addressSchema
});

const productsSchema = z.object({
  systemType: z.enum(['on-grid', 'off-grid', 'hybrid', 'dcr', 'non-dcr', 'both', 'customize']),
  panelBrand: z.string().nullish(),
  panelSize: z.string().nullish(),
  panelQuantity: z.number().int().positive().nullish(),
  panelPrice: z.number().nonnegative().nullish(),
  dcrPanelBrand: z.string().nullish(),
  dcrPanelSize: z.string().nullish(),
  dcrPanelQuantity: z.number().int().positive().nullish(),
  nonDcrPanelBrand: z.string().nullish(),
  nonDcrPanelSize: z.string().nullish(),
  nonDcrPanelQuantity: z.number().int().positive().nullish(),
  inverterType: z.string().nullish(),
  inverterBrand: z.string().nullish(),
  inverterSize: z.string().nullish(),
  inverterPrice: z.number().nonnegative().nullish(),
  structureType: z.string().nullish(),
  structureSize: z.string().nullish(),
  structurePrice: z.number().nonnegative().nullish(),
  meterBrand: z.string().nullish(),
  meterPrice: z.number().nonnegative().nullish(),
  acCableBrand: z.string().nullish(),
  acCableSize: z.string().nullish(),
  acCablePrice: z.number().nonnegative().nullish(),
  dcCableBrand: z.string().nullish(),
  dcCableSize: z.string().nullish(),
  dcCablePrice: z.number().nonnegative().nullish(),
  acdb: z.string().nullish(),
  acdbPrice: z.number().nonnegative().nullish(),
  dcdb: z.string().nullish(),
  dcdbPrice: z.number().nonnegative().nullish(),
  hybridInverter: z.string().nullish(),
  batteryCapacity: z.string().nullish(),
  batteryPrice: z.number().nonnegative().nullish(),
  centralSubsidy: z.number().nonnegative().default(0),
  stateSubsidy: z.number().nonnegative().default(0),
  customPanels: z.array(z.object({
    brand: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().int().positive(),
    type: z.enum(['dcr', 'non-dcr']),
    price: z.number().nonnegative()
  })).nullish()
});

export const createQuotationSchema = z.object({
  customerId: z.string().nullish(),
  customer: customerSchema.nullish(),
  products: productsSchema,
  discount: z.number().min(0).max(100).default(0)
}).refine((data) => data.customerId || data.customer, {
  message: 'Either customerId or customer object is required'
});

export const updateDiscountSchema = z.object({
  discount: z.number().min(0).max(100)
});


