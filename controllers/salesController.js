const {
  Sale,
  SaleItem,
  Address,
  Product,
  User,
  AdminInventory,
  InventoryTransaction
} = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const buildSaleIncludes = () => ([
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'name'],
    required: false
  },
  {
    model: User,
    as: 'billConfirmer',
    attributes: ['id', 'name'],
    required: false
  },
  {
    model: SaleItem,
    as: 'items'
  },
  {
    model: Address,
    as: 'billingAddress'
  },
  {
    model: Address,
    as: 'deliveryAddress'
  }
]);

const normalizeSaleItems = async (rawItems, transaction) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one sale item is required');
  }

  const normalized = [];

  for (const item of rawItems) {
    const quantity = Number(item.quantity);

    if (!quantity || quantity <= 0 || Number.isNaN(quantity)) {
      throw new Error('Each sale item must have a quantity greater than 0');
    }

    let productId = item.product_id || null;
    let productName = item.product_name;
    let model = item.model;
    let productRecord = null;

    if (productId) {
      productRecord = await Product.findByPk(productId, { transaction });
      if (!productRecord) {
        throw new Error(`Product not found for id ${productId}`);
      }
      productName = productName || productRecord.name;
      model = model || productRecord.model;
    }

    if (!productName || !model) {
      throw new Error('product_name and model are required for each sale item if product_id is not provided');
    }

    let unitPrice;
    if (item.unit_price !== undefined) {
      unitPrice = Number(item.unit_price);
    } else if (productRecord && productRecord.unit_price !== null && productRecord.unit_price !== undefined) {
      unitPrice = Number(productRecord.unit_price);
    } else {
      unitPrice = NaN;
    }

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('Each sale item must have a non-negative unit_price');
    }

    const lineTotal = item.line_total !== undefined ? Number(item.line_total) : quantity * unitPrice;

    if (Number.isNaN(lineTotal) || lineTotal < 0) {
      throw new Error('Each sale item must have a non-negative line_total');
    }

    const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : 0;

    if (Number.isNaN(gstRate) || gstRate < 0) {
      throw new Error('Each sale item must have a non-negative gst_rate');
    }

    normalized.push({
      product_id: productId,
      product_name: productName,
      model,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      gst_rate: gstRate
    });
  }

  return normalized;
};

const createAddressIfNeeded = async (idParam, payload, transaction) => {
  if (idParam) {
    return idParam;
  }

  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  const { id, line1, city, state, postal_code, country, line2 } = payload;

  if (id) {
    return id;
  }

  if (!line1 || !city || !state || !postal_code || !country) {
    throw new Error('Address must include line1, city, state, postal_code, and country');
  }

  const address = await Address.create({
    id: uuidv4(),
    line1,
    line2: line2 || null,
    city,
    state,
    postal_code,
    country
  }, { transaction });

  return address.id;
};

const tryReduceAdminInventory = async (adminId, productId, quantity, transaction) => {
  const inventory = await AdminInventory.findOne({
    where: { admin_id: adminId, product_id: productId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!inventory || inventory.quantity < quantity) {
    return false;
  }

  await inventory.decrement('quantity', { by: quantity, transaction });
  await inventory.reload({ transaction });
  if (inventory.quantity <= 0) {
    await inventory.destroy({ transaction });
  }

  return true;
};

const reduceCentralInventory = async (productId, quantity, transaction) => {
  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });

  if (!product || product.quantity < quantity) {
    throw new Error('Insufficient central inventory for sale');
  }

  await product.decrement('quantity', { by: quantity, transaction });
};

const logSaleTransaction = async ({ productId, saleId, quantity, customerName, createdBy, transaction }) => {
  await InventoryTransaction.create({
    id: uuidv4(),
    product_id: productId,
    transaction_type: 'sale',
    quantity: -quantity,
    reference: saleId,
    related_sale_id: saleId,
    created_by: createdBy,
    notes: `Sale to ${customerName}`
  }, { transaction });
};

const buildProductSummary = (items) => items
  .map((item) => `${item.product_name} (${item.quantity})`)
  .join(', ');

// Get all sales
const getAllSales = async (req, res) => {
  try {
    const { type, payment_status, customer_name, start_date, end_date } = req.query;
    const where = {};

    if (type) {
      where.type = type;
    }

    if (payment_status) {
      where.payment_status = payment_status;
    }

    if (customer_name) {
      where.customer_name = { [Op.iLike]: `%${customer_name}%` };
    }

    if (start_date || end_date) {
      where.sale_date = {};
      if (start_date) {
        where.sale_date[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.sale_date[Op.lte] = new Date(end_date);
      }
    }

    const sales = await Sale.findAll({
      where,
      include: buildSaleIncludes(),
      order: [['sale_date', 'DESC']]
    });

    res.json(sales);
  } catch (error) {
    console.error('Get all sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get sale by ID
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id, {
      include: buildSaleIncludes()
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Get sale by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create sale
const createSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      type,
      customer_name,
      items: rawItems,
      product_summary,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      payment_status,
      sale_date,
      company_name,
      gst_number,
      contact_person,
      billing_address_id,
      billing_address,
      delivery_address_id,
      delivery_address,
      delivery_matches_billing,
      customer_email,
      customer_phone,
      delivery_instructions,
      notes
    } = req.body;

    if (!type || !customer_name) {
      throw new Error('type and customer_name are required');
    }

    if (!['B2B', 'B2C'].includes(type)) {
      throw new Error('Type must be B2B or B2C');
    }

    let saleItems = rawItems;

    if (typeof saleItems === 'string') {
      try {
        saleItems = JSON.parse(saleItems);
      } catch (parseError) {
        throw new Error('items must be a JSON array');
      }
    }

    // Legacy single-item payload support
    if ((!saleItems || !saleItems.length) && req.body.product_id) {
      saleItems = [{
        product_id: req.body.product_id,
        product_name: req.body.product_name,
        model: req.body.model,
        quantity: req.body.quantity,
        unit_price: req.body.unit_price,
        line_total: req.body.line_total
      }];
    }

    const normalizedItems = await normalizeSaleItems(saleItems, transaction);
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const computedSubtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const subtotalValue = subtotal !== undefined ? Number(subtotal) : computedSubtotal;
    const taxAmountValue = tax_amount !== undefined ? Number(tax_amount) : 0;
    const discountAmountValue = discount_amount !== undefined ? Number(discount_amount) : 0;
    const totalAmountValue = subtotalValue + taxAmountValue - discountAmountValue;

    if (Number.isNaN(subtotalValue) || subtotalValue < 0) {
      throw new Error('Subtotal must be a non-negative number');
    }

    if (Number.isNaN(taxAmountValue) || taxAmountValue < 0) {
      throw new Error('Tax amount must be a non-negative number');
    }

    if (Number.isNaN(discountAmountValue) || discountAmountValue < 0) {
      throw new Error('Discount amount must be a non-negative number');
    }

    if (Number.isNaN(totalAmountValue) || totalAmountValue < 0) {
      throw new Error('Total amount must be a non-negative number');
    }

    if (totalQuantity <= 0) {
      throw new Error('Total quantity must be greater than 0');
    }

    const billingAddressId = await createAddressIfNeeded(billing_address_id, billing_address, transaction);
    let deliveryAddressId = await createAddressIfNeeded(delivery_address_id, delivery_address, transaction);

    const matchesBilling = delivery_matches_billing === true || delivery_matches_billing === 'true';

    if (matchesBilling && billingAddressId && !deliveryAddressId) {
      deliveryAddressId = billingAddressId;
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const saleRecord = await Sale.create({
      id: uuidv4(),
      type,
      customer_name,
      product_summary: product_summary || buildProductSummary(normalizedItems),
      total_quantity: totalQuantity,
      subtotal: subtotalValue,
      tax_amount: taxAmountValue,
      discount_amount: discountAmountValue,
      total_amount: totalAmountValue,
      payment_status: payment_status || 'pending',
      sale_date: sale_date ? new Date(sale_date) : new Date(),
      image: imagePath,
      created_by: req.user.id,
      company_name: company_name || null,
      gst_number: gst_number || null,
      contact_person: contact_person || null,
      billing_address_id: billingAddressId,
      delivery_address_id: deliveryAddressId,
      delivery_matches_billing: matchesBilling,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      delivery_instructions: delivery_instructions || null,
      notes: notes || null
    }, { transaction });

    for (const item of normalizedItems) {
      await SaleItem.create({
        id: uuidv4(),
        sale_id: saleRecord.id,
        product_id: item.product_id,
        product_name: item.product_name,
        model: item.model,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        gst_rate: item.gst_rate
      }, { transaction });
    }

    for (const item of normalizedItems) {
      if (!item.product_id) {
        continue;
      }

      let reduced = false;

      if (req.user.role === 'admin') {
        reduced = await tryReduceAdminInventory(req.user.id, item.product_id, item.quantity, transaction);
      }

      if (!reduced) {
        await reduceCentralInventory(item.product_id, item.quantity, transaction);
      }

      await logSaleTransaction({
        productId: item.product_id,
        saleId: saleRecord.id,
        quantity: item.quantity,
        customerName: customer_name,
        createdBy: req.user.id,
        transaction
      });
    }

    await transaction.commit();

    const created = await Sale.findByPk(saleRecord.id, {
      include: buildSaleIncludes()
    });

    res.status(201).json(created);
  } catch (error) {
    await transaction.rollback();
    console.error('Create sale error:', error);
    res.status(400).json({ error: error.message || 'Unable to create sale' });
  }
};

// Update sale
const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_name,
      payment_status,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      product_summary,
      company_name,
      gst_number,
      contact_person,
      delivery_matches_billing,
      customer_email,
      customer_phone,
      delivery_instructions,
      notes
    } = req.body;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const canUpdate =
      sale.created_by === req.user.id ||
      req.user.role === 'super-admin' ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        error: 'You do not have permission to update this sale'
      });
    }

    const updates = {};

    if (customer_name) {
      updates.customer_name = customer_name;
    }

    if (payment_status) {
      if (!['pending', 'completed'].includes(payment_status)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }
      updates.payment_status = payment_status;
    }

    if (subtotal !== undefined) {
      const value = Number(subtotal);
      if (Number.isNaN(value) || value < 0) {
        return res.status(400).json({ error: 'Subtotal must be a non-negative number' });
      }
      updates.subtotal = value;
    }

    if (tax_amount !== undefined) {
      const value = Number(tax_amount);
      if (Number.isNaN(value) || value < 0) {
        return res.status(400).json({ error: 'Tax amount must be a non-negative number' });
      }
      updates.tax_amount = value;
    }

    if (discount_amount !== undefined) {
      const value = Number(discount_amount);
      if (Number.isNaN(value) || value < 0) {
        return res.status(400).json({ error: 'Discount amount must be a non-negative number' });
      }
      updates.discount_amount = value;
    }

    if (total_amount !== undefined) {
      const value = Number(total_amount);
      if (Number.isNaN(value) || value < 0) {
        return res.status(400).json({ error: 'Total amount must be a non-negative number' });
      }
      updates.total_amount = value;
    }

    if (product_summary) {
      updates.product_summary = product_summary;
    }

    if (company_name !== undefined) {
      updates.company_name = company_name;
    }

    if (gst_number !== undefined) {
      updates.gst_number = gst_number;
    }

    if (contact_person !== undefined) {
      updates.contact_person = contact_person;
    }

    if (delivery_matches_billing !== undefined) {
      updates.delivery_matches_billing = delivery_matches_billing === true || delivery_matches_billing === 'true';
    }

    if (customer_email !== undefined) {
      updates.customer_email = customer_email;
    }

    if (customer_phone !== undefined) {
      updates.customer_phone = customer_phone;
    }

    if (delivery_instructions !== undefined) {
      updates.delivery_instructions = delivery_instructions;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    await sale.update(updates);

    const updated = await Sale.findByPk(id, {
      include: buildSaleIncludes()
    });

    res.json(updated);
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Confirm B2B bill
const confirmB2BBill = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.type !== 'B2B') {
      return res.status(400).json({ error: 'Only B2B sales can have bill confirmation' });
    }

    if (req.user.role !== 'account') {
      return res.status(403).json({
        error: 'Only account managers can confirm bills'
      });
    }

    const billImage = req.file ? `/uploads/${req.file.filename}` : sale.bill_image;

    if (!billImage) {
      return res.status(400).json({ error: 'Bill image is required' });
    }

    await sale.update({
      bill_image: billImage,
      bill_confirmed_date: new Date(),
      bill_confirmed_by_id: req.user.id,
      bill_confirmed_by_name: req.user.name,
      payment_status: 'completed'
    });

    const updated = await Sale.findByPk(id, {
      include: buildSaleIncludes()
    });

    res.json(updated);
  } catch (error) {
    console.error('Confirm B2B bill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete sale
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const canDelete =
      sale.created_by === req.user.id ||
      req.user.role === 'super-admin';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this sale'
      });
    }

    await SaleItem.destroy({ where: { sale_id: id } });
    await sale.destroy();
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get sales summary
const getSalesSummary = async (req, res) => {
  try {
    const summary = await Sale.findAll({
      attributes: [
        'type',
        'payment_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'sale_count'],
        [sequelize.fn('SUM', sequelize.col('total_quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'total_subtotal']
      ],
      group: ['type', 'payment_status'],
      order: [['type', 'ASC'], ['payment_status', 'ASC']],
      raw: true
    });

    res.json(summary);
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  confirmB2BBill,
  deleteSale,
  getSalesSummary
};
