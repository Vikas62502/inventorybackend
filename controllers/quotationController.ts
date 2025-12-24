import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Quotation, QuotationProduct, CustomPanel, Customer } from '../models/index-quotation';
import { Op } from 'sequelize';
import { logError, logInfo } from '../utils/loggerHelper';

// Helper function to generate quotation ID
const generateQuotationId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to calculate pricing
const calculatePricing = (products: any, discount: number = 0) => {
  const panelPrice = Number(products.panelPrice || 0);
  const inverterPrice = Number(products.inverterPrice || 0);
  const structurePrice = Number(products.structurePrice || 0);
  const meterPrice = Number(products.meterPrice || 0);
  const acCablePrice = Number(products.acCablePrice || 0);
  const dcCablePrice = Number(products.dcCablePrice || 0);
  const acdbPrice = Number(products.acdbPrice || 0);
  const dcdbPrice = Number(products.dcdbPrice || 0);
  const batteryPrice = Number(products.batteryPrice || 0);

  const cablePrice = acCablePrice + dcCablePrice;
  const acdbDcdbPrice = acdbPrice + dcdbPrice;

  const subtotal = panelPrice + inverterPrice + structurePrice + meterPrice + 
                   cablePrice + acdbDcdbPrice + batteryPrice;

  const centralSubsidy = Number(products.centralSubsidy || 0);
  const stateSubsidy = Number(products.stateSubsidy || 0);
  const totalSubsidy = centralSubsidy + stateSubsidy;

  const totalAmount = subtotal - totalSubsidy;
  const discountAmount = (totalAmount * discount) / 100;
  const finalAmount = totalAmount - discountAmount;

  return {
    panelPrice,
    inverterPrice,
    structurePrice,
    meterPrice,
    cablePrice,
    acdbDcdbPrice,
    subtotal,
    centralSubsidy,
    stateSubsidy,
    totalAmount,
    discountAmount,
    finalAmount
  };
};

// Create quotation
export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { customerId, customer, products, discount = 0 } = req.body;

    // Handle customer creation if customer object is provided
    let finalCustomerId = customerId;
    if (customer && !customerId) {
      // Check if customer exists by mobile
      let existingCustomer = await Customer.findOne({ where: { mobile: customer.mobile } });
      if (!existingCustomer) {
        existingCustomer = await Customer.create({
          id: uuidv4(),
          firstName: customer.firstName,
          lastName: customer.lastName,
          mobile: customer.mobile,
          email: customer.email,
          streetAddress: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          pincode: customer.address.pincode,
          dealerId: req.dealer.id
        });
      }
      finalCustomerId = existingCustomer.id;
    }

    if (!finalCustomerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_002',
          message: 'Customer ID or customer object is required'
        }
      });
      return;
    }

    // Verify customer belongs to dealer
    const customerRecord = await Customer.findOne({
      where: { id: finalCustomerId, dealerId: req.dealer.id }
    });

    if (!customerRecord) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Customer not found' }
      });
      return;
    }

    // Calculate pricing
    const pricing = calculatePricing(products, discount);

    // Generate quotation ID
    let quotationId = generateQuotationId();
    // Ensure unique ID
    while (await Quotation.findByPk(quotationId)) {
      quotationId = generateQuotationId();
    }

    // Calculate valid until date (5 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 5);

    // Create quotation
    const quotation = await Quotation.create({
      id: quotationId,
      dealerId: req.dealer.id,
      customerId: finalCustomerId,
      systemType: products.systemType,
      status: 'pending',
      discount,
      finalAmount: pricing.finalAmount,
      validUntil
    });

    // Create quotation products
    await QuotationProduct.create({
      id: uuidv4(),
      quotationId: quotation.id,
      systemType: products.systemType,
      panelBrand: products.panelBrand,
      panelSize: products.panelSize,
      panelQuantity: products.panelQuantity,
      panelPrice: products.panelPrice,
      dcrPanelBrand: products.dcrPanelBrand,
      dcrPanelSize: products.dcrPanelSize,
      dcrPanelQuantity: products.dcrPanelQuantity,
      nonDcrPanelBrand: products.nonDcrPanelBrand,
      nonDcrPanelSize: products.nonDcrPanelSize,
      nonDcrPanelQuantity: products.nonDcrPanelQuantity,
      inverterType: products.inverterType,
      inverterBrand: products.inverterBrand,
      inverterSize: products.inverterSize,
      inverterPrice: products.inverterPrice,
      structureType: products.structureType,
      structureSize: products.structureSize,
      structurePrice: products.structurePrice,
      meterBrand: products.meterBrand,
      meterPrice: products.meterPrice,
      acCableBrand: products.acCableBrand,
      acCableSize: products.acCableSize,
      acCablePrice: products.acCablePrice,
      dcCableBrand: products.dcCableBrand,
      dcCableSize: products.dcCableSize,
      dcCablePrice: products.dcCablePrice,
      acdb: products.acdb,
      acdbPrice: products.acdbPrice,
      dcdb: products.dcdb,
      dcdbPrice: products.dcdbPrice,
      hybridInverter: products.hybridInverter,
      batteryCapacity: products.batteryCapacity,
      batteryPrice: products.batteryPrice,
      centralSubsidy: products.centralSubsidy || 0,
      stateSubsidy: products.stateSubsidy || 0,
      subtotal: pricing.subtotal,
      totalAmount: pricing.totalAmount
    });

    // Handle custom panels if systemType is 'customize'
    if (products.systemType === 'customize' && products.customPanels) {
      for (const panel of products.customPanels) {
        await CustomPanel.create({
          id: uuidv4(),
          quotationId: quotation.id,
          brand: panel.brand,
          size: panel.size,
          quantity: panel.quantity,
          type: panel.type,
          price: panel.price
        });
      }
    }

    logInfo('Quotation created', { quotationId: quotation.id, dealerId: req.dealer.id });

    res.status(201).json({
      success: true,
      data: {
        id: quotation.id,
        dealerId: quotation.dealerId,
        customerId: quotation.customerId,
        systemType: quotation.systemType,
        status: quotation.status,
        discount: quotation.discount,
        pricing,
        createdAt: quotation.createdAt,
        validUntil: quotation.validUntil
      }
    });
  } catch (error) {
    logError('Create quotation error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get quotations with pagination
export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = { dealerId: req.dealer.id };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    let quotations;
    if (search) {
      // Search by quotation ID or customer name/mobile
      quotations = await Quotation.findAndCountAll({
        where,
        include: [{
          model: Customer,
          as: 'customer',
          where: {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${search}%` } },
              { lastName: { [Op.iLike]: `%${search}%` } },
              { mobile: { [Op.iLike]: `%${search}%` } }
            ]
          },
          required: true
        }],
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });
    } else {
      quotations = await Quotation.findAndCountAll({
        where,
        include: [{
          model: Customer,
          as: 'customer',
          attributes: ['firstName', 'lastName', 'mobile']
        }],
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });
    }

    const formattedQuotations = quotations.rows.map(q => {
      const customer = (q as any).customer;
      return {
        id: q.id,
        customer: customer ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          mobile: customer.mobile
        } : null,
        systemType: q.systemType,
        finalAmount: Number(q.finalAmount),
        status: q.status,
        createdAt: q.createdAt,
        validUntil: q.validUntil
      };
    });

    res.json({
      success: true,
      data: {
        quotations: formattedQuotations,
        pagination: {
          page,
          limit,
          total: quotations.count,
          totalPages: Math.ceil(quotations.count / limit),
          hasNext: page < Math.ceil(quotations.count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logError('Get quotations error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get quotation by ID
export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { quotationId } = req.params;
    const quotation = await Quotation.findOne({
      where: { id: quotationId, dealerId: req.dealer.id },
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: QuotationProduct,
          as: 'products'
        },
        {
          model: CustomPanel,
          as: 'customPanels'
        }
      ]
    });

    if (!quotation) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Quotation not found' }
      });
      return;
    }

    const quotationAny = quotation as any;
    const products = quotationAny.products;
    const customer = quotationAny.customer;
    const pricing = calculatePricing(products || {}, quotation.discount);

    res.json({
      success: true,
      data: {
        id: quotation.id,
        dealerId: quotation.dealerId,
        customer: customer ? {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          mobile: customer.mobile,
          email: customer.email,
          address: {
            street: customer.streetAddress,
            city: customer.city,
            state: customer.state,
            pincode: customer.pincode
          }
        } : null,
        products: products ? {
          systemType: products.systemType,
          panelBrand: products.panelBrand,
          panelSize: products.panelSize,
          panelQuantity: products.panelQuantity,
          dcrPanelBrand: products.dcrPanelBrand,
          dcrPanelSize: products.dcrPanelSize,
          dcrPanelQuantity: products.dcrPanelQuantity,
          nonDcrPanelBrand: products.nonDcrPanelBrand,
          nonDcrPanelSize: products.nonDcrPanelSize,
          nonDcrPanelQuantity: products.nonDcrPanelQuantity,
          inverterType: products.inverterType,
          inverterBrand: products.inverterBrand,
          inverterSize: products.inverterSize,
          structureType: products.structureType,
          structureSize: products.structureSize,
          meterBrand: products.meterBrand,
          acCableBrand: products.acCableBrand,
          acCableSize: products.acCableSize,
          dcCableBrand: products.dcCableBrand,
          dcCableSize: products.dcCableSize,
          acdb: products.acdb,
          dcdb: products.dcdb,
          hybridInverter: products.hybridInverter,
          batteryCapacity: products.batteryCapacity,
          centralSubsidy: Number(products.centralSubsidy || 0),
          stateSubsidy: Number(products.stateSubsidy || 0)
        } : null,
        pricing,
        status: quotation.status,
        discount: quotation.discount,
        createdAt: quotation.createdAt,
        validUntil: quotation.validUntil
      }
    });
  } catch (error) {
    logError('Get quotation by ID error', error, { quotationId: req.params.quotationId });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Update quotation discount
export const updateQuotationDiscount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { quotationId } = req.params;
    const { discount } = req.body;

    if (discount < 0 || discount > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Discount must be between 0 and 100',
          details: [{ field: 'discount', message: 'Discount must be between 0 and 100' }]
        }
      });
      return;
    }

    const quotation = await Quotation.findOne({
      where: { id: quotationId, dealerId: req.dealer.id },
      include: [{ model: QuotationProduct, as: 'products' }]
    });

    if (!quotation) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Quotation not found' }
      });
      return;
    }

    // Recalculate pricing with new discount
    const quotationAny = quotation as any;
    const pricing = calculatePricing(quotationAny.products || {}, discount);
    
    await quotation.update({
      discount,
      finalAmount: pricing.finalAmount
    });

    res.json({
      success: true,
      data: {
        id: quotation.id,
        discount: quotation.discount,
        finalAmount: quotation.finalAmount,
        updatedAt: quotation.updatedAt
      }
    });
  } catch (error) {
    logError('Update quotation discount error', error, { quotationId: req.params.quotationId });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Download quotation PDF (placeholder - implement PDF generation later)
export const downloadQuotationPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { quotationId } = req.params;
    const quotation = await Quotation.findOne({
      where: { id: quotationId, dealerId: req.dealer.id }
    });

    if (!quotation) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Quotation not found' }
      });
      return;
    }

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    res.status(501).json({
      success: false,
      error: { code: 'SYS_001', message: 'PDF generation not yet implemented' }
    });
  } catch (error) {
    logError('Download quotation PDF error', error, { quotationId: req.params.quotationId });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

