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
  email: z.union([z.string().email(), z.literal('')]).optional(),
  address: addressSchema
});

const productsSchema = z.object({
  systemType: z.enum(['on-grid', 'off-grid', 'hybrid', 'dcr', 'non-dcr', 'both', 'customize']),
  phase: z.enum(['1-Phase', '3-Phase'], 'Phase must be 1-Phase or 3-Phase').optional(),
  panelBrand: z.string().nullish(),
  panelSize: z.string().nullish(),
  panelQuantity: z.number().int().positive().nullish(),
  panelPrice: z.number().nonnegative().nullish(),
  dcrPanelBrand: z.string().nullish(),
  dcrPanelSize: z.string().nullish(),
  dcrPanelQuantity: z.number().int().nonnegative().nullish(),
  nonDcrPanelBrand: z.string().nullish(),
  nonDcrPanelSize: z.string().nullish(),
  nonDcrPanelQuantity: z.number().int().nonnegative().nullish(),
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

const paymentModeEnum = z.enum(
  ['cash', 'upi', 'loan', 'netbanking', 'bank_transfer', 'cheque', 'card'],
  { message: 'Invalid payment mode' }
);

const paymentStatusEnum = z.enum(['pending', 'partial', 'completed'], {
  message: 'Invalid payment status'
});

// Accept number or string that can be converted to number (disallow empty string)
const numberOrStringNumber = z.union([
  z.number(),
  z.string().transform((val) => {
    if (val.trim() === '') {
      throw new Error('Invalid number');
    }
    const num = Number(val);
    if (isNaN(num)) throw new Error('Invalid number');
    return num;
  })
]);

export const createQuotationSchema = z.object({
  customerId: z.string().nullish(),
  customer: customerSchema.nullish(),
  products: productsSchema,
  discount: z.number().min(0).max(100).default(0),
  // Pricing fields - required at root level
  subtotal: numberOrStringNumber.pipe(z.number().positive('Subtotal must be greater than 0')).optional(),
  totalAmount: numberOrStringNumber.pipe(z.number().nonnegative('Total amount must be a valid number')).optional(),
  finalAmount: numberOrStringNumber.pipe(z.number().nonnegative('Final amount must be a valid number')).optional(),
  // Optional payment fields (single payment)
  paymentMode: paymentModeEnum.optional(),
  paidAmount: numberOrStringNumber.pipe(z.number().nonnegative()).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format').optional(),
  paymentStatus: paymentStatusEnum.optional(),
  // Optional pricing fields
  centralSubsidy: z.number().nonnegative().default(0).nullish(),
  stateSubsidy: z.number().nonnegative().default(0).nullish(),
  totalSubsidy: z.number().nonnegative().default(0).nullish(),
  amountAfterSubsidy: z.number().nonnegative().default(0).nullish(),
  discountAmount: z.number().nonnegative().default(0).nullish(),
  // Optional nested pricing object (for backward compatibility)
  pricing: z.object({
    subtotal: numberOrStringNumber.pipe(z.number().positive()).nullish(),
    totalAmount: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    finalAmount: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    centralSubsidy: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    stateSubsidy: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    totalSubsidy: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    amountAfterSubsidy: numberOrStringNumber.pipe(z.number().nonnegative()).nullish(),
    discountAmount: numberOrStringNumber.pipe(z.number().nonnegative()).nullish()
  }).nullish()
})
  .refine((data) => data.customerId || data.customer, {
  message: 'Either customerId or customer object is required'
})
  .refine((data) => data.subtotal !== undefined || data.pricing?.subtotal !== undefined, {
    path: ['subtotal'],
    message: 'Subtotal is required and must be greater than 0'
  })
  .refine((data) => data.totalAmount !== undefined || data.pricing?.totalAmount !== undefined, {
    path: ['totalAmount'],
    message: 'Total amount is required'
  })
  .refine((data) => data.finalAmount !== undefined || data.pricing?.finalAmount !== undefined, {
    path: ['finalAmount'],
    message: 'Final amount is required'
  });

export const updateDiscountSchema = z.object({
  discount: numberOrStringNumber.pipe(z.number().min(0).max(100))
});

export const updateProductsSchema = z.object({
  products: productsSchema
});

export const updatePricingSchema = z.object({
  subtotal: z.number().nonnegative().optional(),
  stateSubsidy: z.number().nonnegative().optional(),
  centralSubsidy: z.number().nonnegative().optional(),
  discount: numberOrStringNumber.pipe(z.number().min(0).max(100)).optional(),
  finalAmount: z.number().nonnegative().optional(),
  paymentMode: paymentModeEnum.optional(),
  paidAmount: numberOrStringNumber.pipe(z.number().nonnegative()).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format').optional(),
  paymentStatus: paymentStatusEnum.optional()
}).refine((data) => {
  // At least one field must be provided and not undefined
  const hasValue = Object.keys(data).some(key => data[key as keyof typeof data] !== undefined);
  return hasValue;
}, {
  message: 'At least one pricing field must be provided'
});


