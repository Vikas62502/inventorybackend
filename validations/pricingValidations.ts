import { z } from 'zod';

// Component Pricing Schemas
const panelPricingSchema = z.object({
  brand: z.string().min(1, 'Panel brand is required'),
  size: z.string().min(1, 'Panel size is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

const inverterPricingSchema = z.object({
  brand: z.string().min(1, 'Inverter brand is required'),
  size: z.string().min(1, 'Inverter size is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

const structurePricingSchema = z.object({
  type: z.string().min(1, 'Structure type is required'),
  size: z.string().min(1, 'Structure size is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

const meterPricingSchema = z.object({
  brand: z.string().min(1, 'Meter brand is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

const cablePricingSchema = z.object({
  brand: z.string().min(1, 'Cable brand is required'),
  size: z.string().min(1, 'Cable size is required'),
  type: z.enum(['AC', 'DC'], 'Cable type must be AC or DC'),
  price: z.number().min(0, 'Price must be non-negative')
});

const acdbPricingSchema = z.object({
  option: z.string().min(1, 'ACDB option is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

const dcdbPricingSchema = z.object({
  option: z.string().min(1, 'DCDB option is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

// System Pricing Schemas
const systemPricingSchema = z.object({
  systemSize: z.string().min(1, 'System size is required'),
  phase: z.enum(['1-Phase', '3-Phase'], 'Phase must be 1-Phase or 3-Phase'),
  inverterSize: z.string().min(1, 'Inverter size is required'),
  panelType: z.string().min(1, 'Panel type is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  notes: z.string().optional()
});

const bothSystemPricingSchema = z.object({
  systemSize: z.string().min(1, 'System size is required'),
  phase: z.enum(['1-Phase', '3-Phase'], 'Phase must be 1-Phase or 3-Phase'),
  inverterSize: z.string().min(1, 'Inverter size is required'),
  dcrCapacity: z.string().min(1, 'DCR capacity is required'),
  nonDcrCapacity: z.string().min(1, 'Non-DCR capacity is required'),
  panelType: z.string().min(1, 'Panel type is required'),
  price: z.number().min(0, 'Price must be non-negative')
});

// System Configuration Preset Schema
const systemConfigurationPresetSchema = z.object({
  systemType: z.enum(['dcr', 'non-dcr', 'both'], 'System type must be dcr, non-dcr, or both'),
  systemSize: z.string().min(1, 'System size is required'),
  panelBrand: z.string().min(1, 'Panel brand is required'),
  panelSize: z.string().min(1, 'Panel size is required'),
  inverterBrand: z.string().min(1, 'Inverter brand is required'),
  inverterSize: z.string().min(1, 'Inverter size is required'),
  inverterType: z.string().min(1, 'Inverter type is required'),
  structureType: z.string().min(1, 'Structure type is required'),
  structureSize: z.string().min(1, 'Structure size is required'),
  meterBrand: z.string().min(1, 'Meter brand is required'),
  acCableBrand: z.string().min(1, 'AC cable brand is required'),
  acCableSize: z.string().min(1, 'AC cable size is required'),
  dcCableBrand: z.string().min(1, 'DC cable brand is required'),
  dcCableSize: z.string().min(1, 'DC cable size is required'),
  acdb: z.string().min(1, 'ACDB option is required'),
  dcdb: z.string().min(1, 'DCDB option is required')
});

// Complete Pricing Tables Schema
export const pricingTablesSchema = z.object({
  // Component pricing
  panels: z.array(panelPricingSchema).optional(),
  inverters: z.array(inverterPricingSchema).optional(),
  structures: z.array(structurePricingSchema).optional(),
  meters: z.array(meterPricingSchema).optional(),
  cables: z.array(cablePricingSchema).optional(),
  acdb: z.array(acdbPricingSchema).optional(),
  dcdb: z.array(dcdbPricingSchema).optional(),
  
  // System pricing
  dcr: z.array(systemPricingSchema).optional(),
  nonDcr: z.array(systemPricingSchema).optional(),
  both: z.array(bothSystemPricingSchema).optional(),
  
  // System configuration presets
  systemConfigs: z.array(systemConfigurationPresetSchema).optional()
}).refine(
  (data) => {
    // At least one pricing category must be provided
    return (
      (data.panels && data.panels.length > 0) ||
      (data.inverters && data.inverters.length > 0) ||
      (data.structures && data.structures.length > 0) ||
      (data.meters && data.meters.length > 0) ||
      (data.cables && data.cables.length > 0) ||
      (data.acdb && data.acdb.length > 0) ||
      (data.dcdb && data.dcdb.length > 0) ||
      (data.dcr && data.dcr.length > 0) ||
      (data.nonDcr && data.nonDcr.length > 0) ||
      (data.both && data.both.length > 0) ||
      (data.systemConfigs && data.systemConfigs.length > 0)
    );
  },
  {
    message: 'At least one pricing category must be provided'
  }
);

// Schema for updating pricing tables
export const updatePricingTablesSchema = pricingTablesSchema;

