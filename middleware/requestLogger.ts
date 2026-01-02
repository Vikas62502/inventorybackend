import { Request, Response, NextFunction } from 'express';
import { logInfo } from '../utils/loggerHelper';

/**
 * Middleware to log request body before validation
 * This helps debug what the backend actually receives from the frontend
 */
export const logRequestBeforeValidation = (req: Request, _res: Response, next: NextFunction): void => {
  // Only log for POST/PUT/PATCH requests with body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    logInfo('📥 Request received BEFORE validation', {
      method: req.method,
      path: req.path,
      url: req.url,
      contentType: req.get('content-type'),
      bodySize: JSON.stringify(req.body).length,
      bodyKeys: Object.keys(req.body),
      // Log pricing fields specifically
      pricingFields: {
        subtotal: req.body.subtotal,
        subtotalType: typeof req.body.subtotal,
        totalAmount: req.body.totalAmount,
        totalAmountType: typeof req.body.totalAmount,
        finalAmount: req.body.finalAmount,
        finalAmountType: typeof req.body.finalAmount,
        centralSubsidy: req.body.centralSubsidy,
        stateSubsidy: req.body.stateSubsidy,
        totalSubsidy: req.body.totalSubsidy,
        discount: req.body.discount
      },
      // Log products object structure
      productsFields: req.body.products ? {
        hasProducts: true,
        productsKeys: Object.keys(req.body.products),
        systemPrice: req.body.products.systemPrice,
        systemPriceType: typeof req.body.products.systemPrice,
        systemType: req.body.products.systemType
      } : { hasProducts: false },
      // Full body (truncated if too large)
      fullBody: JSON.stringify(req.body).length > 5000 
        ? JSON.stringify(req.body).substring(0, 5000) + '... (truncated)'
        : req.body
    });
  }
  next();
};

/**
 * Middleware to log request body after validation
 * This shows what the validated/transformed body looks like
 */
export const logRequestAfterValidation = (req: Request, _res: Response, next: NextFunction): void => {
  // Only log for POST/PUT/PATCH requests with body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    logInfo('✅ Request validated - AFTER validation', {
      method: req.method,
      path: req.path,
      bodyKeys: Object.keys(req.body),
      // Log pricing fields specifically after validation
      pricingFields: {
        subtotal: req.body.subtotal,
        subtotalType: typeof req.body.subtotal,
        totalAmount: req.body.totalAmount,
        totalAmountType: typeof req.body.totalAmount,
        finalAmount: req.body.finalAmount,
        finalAmountType: typeof req.body.finalAmount,
        centralSubsidy: req.body.centralSubsidy,
        stateSubsidy: req.body.stateSubsidy,
        totalSubsidy: req.body.totalSubsidy,
        discount: req.body.discount
      },
      // Log products object structure after validation
      productsFields: req.body.products ? {
        hasProducts: true,
        productsKeys: Object.keys(req.body.products),
        systemPrice: req.body.products.systemPrice,
        systemPriceType: typeof req.body.products.systemPrice,
        systemType: req.body.products.systemType
      } : { hasProducts: false },
      // Full body (truncated if too large)
      fullBody: JSON.stringify(req.body).length > 5000 
        ? JSON.stringify(req.body).substring(0, 5000) + '... (truncated)'
        : req.body
    });
  }
  next();
};

