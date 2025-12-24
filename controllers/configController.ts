import { Request, Response } from 'express';
import { ProductCatalog } from '../models/index-quotation';
import { logError } from '../utils/loggerHelper';

// Get product catalog
export const getProductCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string;

    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    const products = await ProductCatalog.findAll({
      where,
      order: [['category', 'ASC'], ['brand', 'ASC']]
    });

    // Group by category
    const catalog: any = {};
    products.forEach(product => {
      if (!catalog[product.category]) {
        catalog[product.category] = {
          brands: [],
          sizes: [],
          types: []
        };
      }

      if (product.brand && !catalog[product.category].brands.includes(product.brand)) {
        catalog[product.category].brands.push(product.brand);
      }

      if (product.size && !catalog[product.category].sizes.includes(product.size)) {
        catalog[product.category].sizes.push(product.size);
      }
    });

    // Format for API response
    const formattedCatalog: any = {};
    if (catalog.panel) {
      formattedCatalog.panels = {
        brands: catalog.panel.brands,
        sizes: catalog.panel.sizes
      };
    }
    if (catalog.inverter) {
      formattedCatalog.inverters = {
        types: ['String Inverter', 'Micro Inverter'], // Could be dynamic
        brands: catalog.inverter.brands,
        sizes: catalog.inverter.sizes
      };
    }
    if (catalog.structure) {
      formattedCatalog.structures = {
        types: ['Tin Shed', 'RCC', 'Flat Roof'], // Could be dynamic
        sizes: catalog.structure.sizes
      };
    }

    res.json({
      success: true,
      data: formattedCatalog
    });
  } catch (error) {
    logError('Get product catalog error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get Indian states
export const getIndianStates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const states = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    res.json({
      success: true,
      data: { states }
    });
  } catch (error) {
    logError('Get Indian states error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

