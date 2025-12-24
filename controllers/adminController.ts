import { Request, Response } from 'express';
import { Quotation, Dealer, Customer, Visitor } from '../models/index-quotation';
import { Op } from 'sequelize';
import { logError } from '../utils/loggerHelper';

// Get all quotations (admin)
export const getAllQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer || req.dealer.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'Insufficient permissions' }
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const dealerId = req.query.dealerId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};

    if (status) where.status = status;
    if (dealerId) where.dealerId = dealerId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const quotations = await Quotation.findAndCountAll({
      where,
      include: [
        {
          model: Dealer,
          as: 'dealer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['firstName', 'lastName', 'mobile']
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        quotations: quotations.rows.map(q => {
          const qAny = q as any;
          return {
            id: q.id,
            dealer: qAny.dealer ? {
              id: qAny.dealer.id,
              firstName: qAny.dealer.firstName,
              lastName: qAny.dealer.lastName
            } : null,
            customer: qAny.customer ? {
              firstName: qAny.customer.firstName,
              lastName: qAny.customer.lastName,
              mobile: qAny.customer.mobile
            } : null,
            systemType: q.systemType,
            finalAmount: Number(q.finalAmount),
            status: q.status,
            createdAt: q.createdAt
          };
        }),
        pagination: {
          page,
          limit,
          total: quotations.count,
          totalPages: Math.ceil(quotations.count / limit)
        }
      }
    });
  } catch (error) {
    logError('Get all quotations error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Update quotation status (admin)
export const updateQuotationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer || req.dealer.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'Insufficient permissions' }
      });
      return;
    }

    const { quotationId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Invalid status',
          details: [{ field: 'status', message: 'Status must be one of: pending, approved, rejected, completed' }]
        }
      });
      return;
    }

    const quotation = await Quotation.findByPk(quotationId);
    if (!quotation) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Quotation not found' }
      });
      return;
    }

    await quotation.update({ status });

    res.json({
      success: true,
      data: {
        id: quotation.id,
        status: quotation.status,
        updatedAt: quotation.updatedAt
      }
    });
  } catch (error) {
    logError('Update quotation status error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get all dealers (admin)
export const getAllDealers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer || req.dealer.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'Insufficient permissions' }
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = { role: 'dealer' };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const dealers = await Dealer.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Get statistics for each dealer
    const dealersWithStats = await Promise.all(
      dealers.rows.map(async (dealer) => {
        const quotationCount = await Quotation.count({ where: { dealerId: dealer.id } });
        const totalRevenue = await Quotation.sum('finalAmount', { where: { dealerId: dealer.id } }) || 0;

        return {
          ...dealer.toJSON(),
          quotationCount,
          totalRevenue: Number(totalRevenue)
        };
      })
    );

    res.json({
      success: true,
      data: {
        dealers: dealersWithStats,
        pagination: {
          page,
          limit,
          total: dealers.count,
          totalPages: Math.ceil(dealers.count / limit)
        }
      }
    });
  } catch (error) {
    logError('Get all dealers error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get system statistics (admin)
export const getSystemStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer || req.dealer.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'Insufficient permissions' }
      });
      return;
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const quotations = await Quotation.findAll({ where });
    const totalQuotations = quotations.length;
    const totalRevenue = quotations.reduce((sum, q) => sum + Number(q.finalAmount), 0);
    const uniqueCustomers = [...new Set(quotations.map(q => q.customerId))].length;
    const activeDealers = [...new Set(quotations.map(q => q.dealerId))].length;

    // This month's data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthQuotations = quotations.filter(q => new Date(q.createdAt) >= startOfMonth);
    const thisMonth = {
      quotations: thisMonthQuotations.length,
      revenue: thisMonthQuotations.reduce((sum, q) => sum + Number(q.finalAmount), 0),
      newCustomers: [...new Set(thisMonthQuotations.map(q => q.customerId))].length,
      newVisitors: await Visitor.count({
        where: {
          createdAt: { [Op.gte]: startOfMonth }
        }
      })
    };

    // Status breakdown
    const statusBreakdown = {
      pending: quotations.filter(q => q.status === 'pending').length,
      approved: quotations.filter(q => q.status === 'approved').length,
      rejected: quotations.filter(q => q.status === 'rejected').length,
      completed: quotations.filter(q => q.status === 'completed').length
    };

    // Top dealers
    const dealerStats = new Map<string, { count: number; revenue: number }>();
    quotations.forEach(q => {
      const existing = dealerStats.get(q.dealerId) || { count: 0, revenue: 0 };
      dealerStats.set(q.dealerId, {
        count: existing.count + 1,
        revenue: existing.revenue + Number(q.finalAmount)
      });
    });

    const topDealers = Array.from(dealerStats.entries())
      .map(([dealerId, stats]) => ({ dealerId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get dealer names
    const dealerIds = topDealers.map(d => d.dealerId);
    const dealers = await Dealer.findAll({
      where: { id: { [Op.in]: dealerIds } },
      attributes: ['id', 'firstName', 'lastName']
    });

    const topDealersWithNames = topDealers.map(td => {
      const dealer = dealers.find(d => d.id === td.dealerId);
      return {
        dealerId: td.dealerId,
        dealerName: dealer ? `${dealer.firstName} ${dealer.lastName}` : 'Unknown',
        quotationCount: td.count,
        revenue: td.revenue
      };
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalQuotations,
          totalRevenue,
          totalCustomers: uniqueCustomers,
          activeDealers,
          totalVisitors: await Visitor.count(),
          activeVisitors: await Visitor.count({ where: { isActive: true } })
        },
        thisMonth,
        statusBreakdown,
        topDealers: topDealersWithNames
      }
    });
  } catch (error) {
    logError('Get system statistics error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

