import { Request, Response } from 'express';
import { Dealer, Quotation } from '../models/index-quotation';
import { Op } from 'sequelize';
import { logError } from '../utils/loggerHelper';

// Get dealer profile
export const getDealerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const dealer = await Dealer.findByPk(req.dealer.id, {
      attributes: { exclude: ['password'] }
    });

    if (!dealer) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Dealer not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: dealer
    });
  } catch (error) {
    logError('Get dealer profile error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Update dealer profile
export const updateDealerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { firstName, lastName, email, mobile, company } = req.body;
    const dealer = await Dealer.findByPk(req.dealer.id);

    if (!dealer) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Dealer not found' }
      });
      return;
    }

    // Check if email is already taken by another dealer
    if (email && email !== dealer.email) {
      const existingDealer = await Dealer.findOne({ where: { email, id: { [Op.ne]: dealer.id } } });
      if (existingDealer) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RES_002',
            message: 'Email already exists',
            details: [{ field: 'email', message: 'Email already exists' }]
          }
        });
        return;
      }
    }

    await dealer.update({
      firstName: firstName || dealer.firstName,
      lastName: lastName || dealer.lastName,
      email: email || dealer.email,
      mobile: mobile || dealer.mobile,
      company: company !== undefined ? company : dealer.company
    });

    const updatedDealer = await Dealer.findByPk(dealer.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: updatedDealer
    });
  } catch (error) {
    logError('Update dealer profile error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get dealer statistics
export const getDealerStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { startDate, endDate } = req.query;
    const where: any = { dealerId: req.dealer.id };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate as string);
    }

    // Get all quotations
    const allQuotations = await Quotation.findAll({ where });
    const totalQuotations = allQuotations.length;
    const totalRevenue = allQuotations.reduce((sum, q) => sum + Number(q.finalAmount), 0);

    // Get unique customers
    const uniqueCustomerIds = [...new Set(allQuotations.map(q => q.customerId))];
    const totalCustomers = uniqueCustomerIds.length;

    // This month's data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthQuotations = await Quotation.findAll({
      where: {
        dealerId: req.dealer.id,
        createdAt: { [Op.gte]: startOfMonth }
      }
    });
    const thisMonth = {
      quotations: thisMonthQuotations.length,
      revenue: thisMonthQuotations.reduce((sum, q) => sum + Number(q.finalAmount), 0)
    };

    // Status breakdown
    const statusBreakdown = {
      pending: allQuotations.filter(q => q.status === 'pending').length,
      approved: allQuotations.filter(q => q.status === 'approved').length,
      rejected: allQuotations.filter(q => q.status === 'rejected').length,
      completed: allQuotations.filter(q => q.status === 'completed').length
    };

    res.json({
      success: true,
      data: {
        totalQuotations,
        totalCustomers,
        totalRevenue,
        thisMonth,
        statusBreakdown
      }
    });
  } catch (error) {
    logError('Get dealer statistics error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

