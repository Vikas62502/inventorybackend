/**
 * Shipped: Admin Catalog Price set API
 *
 * GET/PUT /api/quotations/catalog-component-pricing
 * GET/PUT /api/config/catalog-component-pricing
 *
 * system_config key: catalog_component_pricing
 * See create-quotation-flow/BACKEND_CATALOG_COMPONENT_PRICING.ts for FE contract.
 */

export {
  emptyCatalogComponentPricing,
  normalizeCatalogComponentPricing,
  CATALOG_COMPONENT_KEYS
} from './utils/catalogComponentPricing';
