import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Customer, Quotation } from '../models/index-quotation';
import { Op } from 'sequelize';
import { logError, logInfo } from '../utils/loggerHelper';

// Create customer
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { firstName, lastName, mobile, email, address } = req.body;

    // Check if customer with mobile already exists
    const existingCustomer = await Customer.findOne({ where: { mobile } });
    if (existingCustomer) {
      res.status(400).json({
        success: false,
        error: {
          code: 'RES_002',
          message: 'Customer with this mobile number already exists',
          details: [{ field: 'mobile', message: 'Mobile number already exists' }]
        }
      });
      return;
    }

    const customer = await Customer.create({
      id: uuidv4(),
      firstName,
      lastName,
      mobile,
      email,
      streetAddress: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      dealerId: req.dealer.id
    });

    logInfo('Customer created', { customerId: customer.id, dealerId: req.dealer.id });

    res.status(201).json({
      success: true,
      data: {
        ...customer.toJSON(),
        address: {
          street: customer.streetAddress,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode
        }
      }
    });
  } catch (error) {
    logError('Create customer error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get customers with pagination
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
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
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = { dealerId: req.dealer.id };

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: ['id', 'firstName', 'lastName', 'mobile', 'email', 'city', 'state', 'createdAt']
    });

    res.json({
      success: true,
      data: {
        customers: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logError('Get customers error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { customerId } = req.params;
    const customer = await Customer.findOne({
      where: { id: customerId, dealerId: req.dealer.id }
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Customer not found' }
      });
      return;
    }

    // Get customer's quotations
    const quotations = await Quotation.findAll({
      where: { customerId: customer.id },
      attributes: ['id', 'systemType', 'finalAmount', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        ...customer.toJSON(),
        address: {
          street: customer.streetAddress,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode
        },
        quotations
      }
    });
  } catch (error) {
    logError('Get customer by ID error', error, { customerId: req.params.customerId });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Update customer
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { customerId } = req.params;
    const { firstName, lastName, mobile, email, address } = req.body;

    const customer = await Customer.findOne({
      where: { id: customerId, dealerId: req.dealer.id }
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Customer not found' }
      });
      return;
    }

    // Check if mobile is already taken by another customer
    if (mobile && mobile !== customer.mobile) {
      const existingCustomer = await Customer.findOne({
        where: { mobile, id: { [Op.ne]: customer.id } }
      });
      if (existingCustomer) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RES_002',
            message: 'Mobile number already exists',
            details: [{ field: 'mobile', message: 'Mobile number already exists' }]
          }
        });
        return;
      }
    }

    await customer.update({
      firstName: firstName || customer.firstName,
      lastName: lastName || customer.lastName,
      mobile: mobile || customer.mobile,
      email: email || customer.email,
      streetAddress: address?.street || customer.streetAddress,
      city: address?.city || customer.city,
      state: address?.state || customer.state,
      pincode: address?.pincode || customer.pincode
    });

    const updatedCustomer = await Customer.findByPk(customer.id);

    res.json({
      success: true,
      data: {
        ...updatedCustomer!.toJSON(),
        address: {
          street: updatedCustomer!.streetAddress,
          city: updatedCustomer!.city,
          state: updatedCustomer!.state,
          pincode: updatedCustomer!.pincode
        }
      }
    });
  } catch (error) {
    logError('Update customer error', error, { customerId: req.params.customerId });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

