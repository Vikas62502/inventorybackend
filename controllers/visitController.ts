import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Visit, VisitAssignment, Quotation, Visitor } from '../models/index-quotation';
import { logError, logInfo } from '../utils/loggerHelper';

// Create visit
export const createVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { quotationId, visitDate, visitTime, location, locationLink, notes, visitors } = req.body;

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

    const visit = await Visit.create({
      id: uuidv4(),
      quotationId,
      dealerId: req.dealer.id,
      visitDate,
      visitTime,
      location,
      locationLink,
      notes,
      status: 'pending'
    });

    // Create visit assignments
    if (visitors && Array.isArray(visitors)) {
      for (const visitorData of visitors) {
        const visitor = await Visitor.findByPk(visitorData.visitorId);
        if (visitor) {
          await VisitAssignment.create({
            id: uuidv4(),
            visitId: visit.id,
            visitorId: visitor.id,
            visitorName: `${visitor.firstName} ${visitor.lastName}`
          });
        }
      }
    }

    // Get visit with assignments
    const visitWithAssignments = await Visit.findByPk(visit.id, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    logInfo('Visit created', { visitId: visit.id, quotationId, dealerId: req.dealer.id });

    const visitAny = visitWithAssignments as any;
    res.status(201).json({
      success: true,
      data: {
        ...visitAny.toJSON(),
        visitors: (visitAny.assignments || []).map((a: any) => ({
          visitorId: a.visitorId,
          visitorName: a.visitorName
        }))
      }
    });
  } catch (error) {
    logError('Create visit error', error, { dealerId: req.dealer?.id });
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Get visits for quotation
export const getVisitsForQuotation = async (req: Request, res: Response): Promise<void> => {
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

    const visits = await Visit.findAll({
      where: { quotationId },
      include: [{ model: VisitAssignment, as: 'assignments' }],
      order: [['visitDate', 'DESC'], ['visitTime', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        visits: visits.map(v => {
          const vAny = v as any;
          return {
            id: v.id,
            visitDate: v.visitDate,
            visitTime: v.visitTime,
            location: v.location,
            locationLink: v.locationLink,
            status: v.status,
            visitors: (vAny.assignments || []).map((a: any) => ({
              visitorId: a.visitorId,
              visitorName: a.visitorName
            })),
            createdAt: v.createdAt
          };
        })
      }
    });
  } catch (error) {
    logError('Get visits for quotation error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Approve visit (visitor)
export const approveVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const visit = await Visit.findByPk(visitId, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    // Check if visitor is assigned to this visit
    const visitAny = visit as any;
    const assignment = (visitAny.assignments || []).find((a: any) => a.visitorId === req.visitor!.id);
    if (!assignment) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'You are not assigned to this visit' }
      });
      return;
    }

    if (visit.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: { code: 'VAL_001', message: 'Visit is not in pending status' }
      });
      return;
    }

    await visit.update({ status: 'approved' });

    res.json({
      success: true,
      data: {
        id: visit.id,
        status: visit.status,
        updatedAt: visit.updatedAt
      }
    });
  } catch (error) {
    logError('Approve visit error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Complete visit (visitor)
export const completeVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const { length, width, height, images, notes } = req.body;

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    const visitAny = visit as any;
    const assignment = (visitAny.assignments || []).find((a: any) => a.visitorId === req.visitor!.id);
    if (!assignment) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'You are not assigned to this visit' }
      });
      return;
    }

    await visit.update({
      status: 'completed',
      length,
      width,
      height,
      images: images || [],
      feedback: notes
    });

    res.json({
      success: true,
      data: {
        id: visit.id,
        status: visit.status,
        length: visit.length,
        width: visit.width,
        height: visit.height,
        images: visit.images,
        notes: visit.feedback || notes,
        updatedAt: visit.updatedAt
      }
    });
  } catch (error) {
    logError('Complete visit error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Mark visit as incomplete
export const markVisitIncomplete = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const { reason } = req.body;

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    const visitAny = visit as any;
    const assignment = (visitAny.assignments || []).find((a: any) => a.visitorId === req.visitor!.id);
    if (!assignment) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'You are not assigned to this visit' }
      });
      return;
    }

    await visit.update({
      status: 'incomplete',
      rejectionReason: reason
    });

    res.json({
      success: true,
      data: {
        id: visit.id,
        status: visit.status,
        rejectionReason: visit.rejectionReason,
        updatedAt: visit.updatedAt
      }
    });
  } catch (error) {
    logError('Mark visit incomplete error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Reschedule visit
export const rescheduleVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const { reason } = req.body;

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    const visitAny = visit as any;
    const assignment = (visitAny.assignments || []).find((a: any) => a.visitorId === req.visitor!.id);
    if (!assignment) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'You are not assigned to this visit' }
      });
      return;
    }

    await visit.update({
      status: 'rescheduled',
      rejectionReason: reason
    });

    res.json({
      success: true,
      data: {
        id: visit.id,
        status: visit.status,
        rejectionReason: visit.rejectionReason,
        updatedAt: visit.updatedAt
      }
    });
  } catch (error) {
    logError('Reschedule visit error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Reject visit
export const rejectVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.visitor) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const { rejectionReason } = req.body;

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: VisitAssignment, as: 'assignments' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    const visitAny = visit as any;
    const assignment = (visitAny.assignments || []).find((a: any) => a.visitorId === req.visitor!.id);
    if (!assignment) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'You are not assigned to this visit' }
      });
      return;
    }

    await visit.update({
      status: 'rejected',
      rejectionReason
    });

    res.json({
      success: true,
      data: {
        id: visit.id,
        status: visit.status,
        rejectionReason: visit.rejectionReason,
        updatedAt: visit.updatedAt
      }
    });
  } catch (error) {
    logError('Reject visit error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

// Delete visit
export const deleteVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.dealer) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_003', message: 'User not authenticated' }
      });
      return;
    }

    const { visitId } = req.params;
    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Quotation, as: 'quotation' }]
    });

    if (!visit) {
      res.status(404).json({
        success: false,
        error: { code: 'RES_001', message: 'Visit not found' }
      });
      return;
    }

    if (visit.dealerId !== req.dealer.id) {
      res.status(403).json({
        success: false,
        error: { code: 'AUTH_004', message: 'Insufficient permissions' }
      });
      return;
    }

    await visit.destroy();

    res.json({
      success: true,
      message: 'Visit deleted successfully'
    });
  } catch (error) {
    logError('Delete visit error', error);
    res.status(500).json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' }
    });
  }
};

