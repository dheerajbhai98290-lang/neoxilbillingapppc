import { Router, Request, Response } from 'express';
import {
  queryAll,
  queryOne,
  execute,
  transaction,
  logAudit,
  exportDatabaseJson,
  saveToDisk
} from './db.ts';
import {
  handleLogin,
  handleGetMe,
  handleLogout,
  handleUpdatePassword,
  handleRecoverAccount,
  authenticateUser
} from './auth.ts';

export const apiRouter = Router();

// ==========================================
// 1. PUBLIC AUTH & HEALTH ROUTES
// ==========================================
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', serverTime: new Date().toISOString() });
});

apiRouter.post('/auth/login', handleLogin);
apiRouter.post('/auth/recover-password', handleRecoverAccount);

// Protect all following routes with authentication
apiRouter.use(authenticateUser);

apiRouter.get('/auth/me', handleGetMe);
apiRouter.post('/auth/logout', handleLogout);
apiRouter.post('/auth/update-password', handleUpdatePassword);

// ==========================================
// 2. COMPANY SETTINGS & BANK DETAILS
// ==========================================
apiRouter.get('/settings', (req: Request, res: Response) => {
  const settings = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
  res.json(settings || {});
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const body = req.body;
  const now = new Date().toISOString();

  execute(
    `UPDATE company_settings SET
      company_name = ?,
      logo_url = ?,
      tagline = ?,
      description = ?,
      registered_address = ?,
      factory_address = ?,
      city = ?,
      state = ?,
      pincode = ?,
      phone = ?,
      email = ?,
      website = ?,
      gstin = ?,
      pan = ?,
      financial_year = ?,
      invoice_prefix = ?,
      purchase_prefix = ?,
      default_currency = ?,
      default_invoice_size = ?,
      default_terms = ?,
      updated_at = ?
    WHERE id = 'default'`,
    [
      body.company_name || 'NEOXILINDIA',
      body.logo_url || '/logo.svg',
      body.tagline || '',
      body.description || '',
      body.registered_address || '',
      body.factory_address || '',
      body.city || '',
      body.state || '',
      body.pincode || '',
      body.phone || '',
      body.email || '',
      body.website || '',
      body.gstin || '',
      body.pan || '',
      body.financial_year || '2026-2027',
      body.invoice_prefix || 'NXL-',
      body.purchase_prefix || 'PUR-',
      body.default_currency || 'INR',
      body.default_invoice_size || 'A5_LANDSCAPE',
      body.default_terms || '',
      now
    ]
  );

  logAudit('UPDATE_SETTINGS', 'company_settings', 'default', 'Company profile updated');
  const updated = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
  res.json(updated);
});

apiRouter.put('/settings/bank', (req: Request, res: Response) => {
  const { bank_name, account_holder, account_number, ifsc_code, branch, upi_id, qr_code_image } = req.body;
  const now = new Date().toISOString();

  execute(
    `UPDATE company_settings SET
      bank_name = ?,
      account_holder = ?,
      account_number = ?,
      ifsc_code = ?,
      branch = ?,
      upi_id = ?,
      qr_code_image = ?,
      updated_at = ?
    WHERE id = 'default'`,
    [
      bank_name || '',
      account_holder || '',
      account_number || '',
      ifsc_code || '',
      branch || '',
      upi_id || '',
      qr_code_image || '',
      now
    ]
  );

  logAudit('UPDATE_BANK', 'company_settings', 'default', 'Bank details & UPI QR configuration updated');
  const updated = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
  res.json(updated);
});

// ==========================================
// 3. DASHBOARD METRICS (Real Transactions)
// ==========================================
apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  // Today's Sales
  const todaySales = queryOne(
    `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
     FROM sales_invoices WHERE status = 'FINALIZED' AND date(invoice_date) = date(?)`,
    [today]
  );

  // Today's Purchases
  const todayPurchases = queryOne(
    `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
     FROM purchase_bills WHERE status = 'FINALIZED' AND date(purchase_date) = date(?)`,
    [today]
  );

  // Today's Expenses
  const todayExpenses = queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
     FROM expenses WHERE date(expense_date) = date(?)`,
    [today]
  );

  // Outstanding Receivables from Customers
  const customerOutstanding = queryOne(
    `SELECT COALESCE(SUM(balance_due), 0) as total 
     FROM sales_invoices WHERE status = 'FINALIZED' AND balance_due > 0`
  );

  // Outstanding Payables to Suppliers
  const supplierPayable = queryOne(
    `SELECT COALESCE(SUM(balance_payable), 0) as total 
     FROM purchase_bills WHERE status = 'FINALIZED' AND balance_payable > 0`
  );

  // Cash and Bank Balances
  const cashAccounts = queryAll('SELECT * FROM bank_accounts');
  const totalCashBank = cashAccounts.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);

  // Finished Product Stock valuation & count
  const finishedProducts = queryOne(
    `SELECT COUNT(*) as total_items, COALESCE(SUM(current_stock), 0) as total_units, COALESCE(SUM(current_stock * purchase_cost), 0) as stock_value 
     FROM products WHERE is_active = 1`
  );

  // Raw Material Stock valuation & count
  const rawMaterials = queryOne(
    `SELECT COUNT(*) as total_items, COALESCE(SUM(current_stock), 0) as total_units, COALESCE(SUM(current_stock * purchase_cost), 0) as stock_value 
     FROM raw_materials WHERE is_active = 1`
  );

  // Low stock products
  const lowStockProducts = queryAll(
    `SELECT id, name, category, current_stock, reorder_level, unit 
     FROM products WHERE is_active = 1 AND current_stock <= reorder_level LIMIT 10`
  );

  // Low stock raw materials
  const lowStockMaterials = queryAll(
    `SELECT id, name, category, current_stock, reorder_level, unit 
     FROM raw_materials WHERE is_active = 1 AND current_stock <= reorder_level LIMIT 10`
  );

  // Near-expiry batches (within 60 days)
  const todayDateObj = new Date();
  const alertDate60 = new Date(todayDateObj.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nearExpiryBatches = queryAll(
    `SELECT * FROM inventory_batches 
     WHERE quantity_remaining > 0 AND expiry_date IS NOT NULL AND expiry_date <= ? AND expiry_date >= ?
     ORDER BY expiry_date ASC LIMIT 10`,
    [alertDate60, today]
  );

  const expiredBatches = queryAll(
    `SELECT * FROM inventory_batches 
     WHERE quantity_remaining > 0 AND expiry_date IS NOT NULL AND expiry_date < ?
     ORDER BY expiry_date ASC LIMIT 10`,
    [today]
  );

  // Monthly Sales, Purchases, Expenses
  const monthlySales = queryOne(
    `SELECT COALESCE(SUM(taxable_amount), 0) as net_sales, COALESCE(SUM(grand_total), 0) as gross_sales 
     FROM sales_invoices WHERE status = 'FINALIZED' AND invoice_date LIKE ?`,
    [`${currentMonth}%`]
  );

  const monthlyExpenses = queryOne(
    `SELECT COALESCE(SUM(total_amount), 0) as total 
     FROM expenses WHERE expense_date LIKE ?`,
    [`${currentMonth}%`]
  );

  // Production and Wastage stats (Monthly)
  const monthlyProduction = queryOne(
    `SELECT COALESCE(SUM(accepted_quantity), 0) as total_produced, COALESCE(SUM(total_cost), 0) as total_cost 
     FROM production_batches WHERE status = 'COMPLETED' AND production_date LIKE ?`,
    [`${currentMonth}%`]
  );

  const monthlyWastage = queryOne(
    `SELECT COALESCE(SUM(quantity), 0) as total_qty, COALESCE(SUM(total_cost), 0) as total_cost 
     FROM wastage_records WHERE wastage_date LIKE ?`,
    [`${currentMonth}%`]
  );

  // Profit calculations
  // COGS = sum of items sold * purchase_cost
  const cogsQuery = queryOne(
    `SELECT COALESCE(SUM(si.quantity * p.purchase_cost), 0) as cogs
     FROM sales_invoice_items si
     JOIN sales_invoices inv ON si.invoice_id = inv.id
     JOIN products p ON si.product_id = p.id
     WHERE inv.status = 'FINALIZED' AND inv.invoice_date LIKE ?`,
    [`${currentMonth}%`]
  );

  const netSales = Number(monthlySales?.net_sales || 0);
  const cogs = Number(cogsQuery?.cogs || 0);
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - Number(monthlyExpenses?.total || 0) - Number(monthlyWastage?.total_cost || 0);

  res.json({
    today: {
      sales: Number(todaySales?.total || 0),
      salesCount: Number(todaySales?.count || 0),
      purchases: Number(todayPurchases?.total || 0),
      purchasesCount: Number(todayPurchases?.count || 0),
      expenses: Number(todayExpenses?.total || 0),
      expensesCount: Number(todayExpenses?.count || 0)
    },
    outstanding: {
      customerReceivable: Number(customerOutstanding?.total || 0),
      supplierPayable: Number(supplierPayable?.total || 0)
    },
    cashAndBank: {
      total: totalCashBank,
      accounts: cashAccounts
    },
    inventory: {
      finishedProducts: {
        itemsCount: Number(finishedProducts?.total_items || 0),
        units: Number(finishedProducts?.total_units || 0),
        value: Number(finishedProducts?.stock_value || 0)
      },
      rawMaterials: {
        itemsCount: Number(rawMaterials?.total_items || 0),
        units: Number(rawMaterials?.total_units || 0),
        value: Number(rawMaterials?.stock_value || 0)
      },
      lowStock: {
        products: lowStockProducts,
        rawMaterials: lowStockMaterials,
        totalAlerts: lowStockProducts.length + lowStockMaterials.length
      },
      expiry: {
        nearExpiry: nearExpiryBatches,
        expired: expiredBatches
      }
    },
    monthly: {
      netSales,
      cogs,
      grossProfit,
      operatingExpenses: Number(monthlyExpenses?.total || 0),
      wastageCost: Number(monthlyWastage?.total_cost || 0),
      estimatedNetProfit: netProfit,
      productionUnits: Number(monthlyProduction?.total_produced || 0),
      productionCost: Number(monthlyProduction?.total_cost || 0)
    }
  });
});

// ==========================================
// 4. CUSTOMER MASTER & LEDGER
// ==========================================
apiRouter.get('/customers', (req: Request, res: Response) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  let customers;
  if (search) {
    customers = queryAll(
      `SELECT * FROM customers 
       WHERE name LIKE ? OR customer_code LIKE ? OR phone LIKE ? OR gstin LIKE ? 
       ORDER BY name ASC`,
      [search, search, search, search]
    );
  } else {
    customers = queryAll('SELECT * FROM customers ORDER BY name ASC');
  }
  res.json(customers);
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.name) {
    res.status(400).json({ error: 'Customer name is required' });
    return;
  }
  const id = 'cust-' + Date.now();
  const code = b.customer_code || ('CUST-' + Math.floor(1000 + Math.random() * 9000));
  const opening = Number(b.opening_balance || 0);

  execute(
    `INSERT INTO customers (
      id, customer_code, name, phone, email,
      billing_address, billing_city, billing_state, billing_pincode,
      shipping_address, shipping_city, shipping_state, shipping_pincode,
      gstin, state_code, opening_balance, current_balance, credit_limit,
      payment_terms, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      b.name.trim(),
      b.phone || '',
      b.email || '',
      b.billing_address || '',
      b.billing_city || '',
      b.billing_state || 'Rajasthan',
      b.billing_pincode || '',
      b.shipping_address || b.billing_address || '',
      b.shipping_city || b.billing_city || '',
      b.shipping_state || b.billing_state || 'Rajasthan',
      b.shipping_pincode || b.billing_pincode || '',
      b.gstin || '',
      b.state_code || '08',
      opening,
      opening,
      Number(b.credit_limit || 0),
      b.payment_terms || 'Due on Receipt',
      b.notes || '',
      new Date().toISOString()
    ]
  );

  logAudit('CREATE_CUSTOMER', 'customers', id, `Created customer: ${b.name}`);
  res.json(queryOne('SELECT * FROM customers WHERE id = ?', [id]));
});

apiRouter.put('/customers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const b = req.body;
  const existing = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  execute(
    `UPDATE customers SET
      name = ?, phone = ?, email = ?,
      billing_address = ?, billing_city = ?, billing_state = ?, billing_pincode = ?,
      shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_pincode = ?,
      gstin = ?, state_code = ?, credit_limit = ?, payment_terms = ?, notes = ?
    WHERE id = ?`,
    [
      b.name.trim(),
      b.phone || '',
      b.email || '',
      b.billing_address || '',
      b.billing_city || '',
      b.billing_state || '',
      b.billing_pincode || '',
      b.shipping_address || '',
      b.shipping_city || '',
      b.shipping_state || '',
      b.shipping_pincode || '',
      b.gstin || '',
      b.state_code || '',
      Number(b.credit_limit || 0),
      b.payment_terms || '',
      b.notes || '',
      id
    ]
  );

  logAudit('UPDATE_CUSTOMER', 'customers', id, `Updated customer: ${b.name}`);
  res.json(queryOne('SELECT * FROM customers WHERE id = ?', [id]));
});

apiRouter.get('/customers/:id/ledger', (req: Request, res: Response) => {
  const customerId = req.params.id;
  const customer = queryOne('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  // Retrieve invoices, receipts, and returns
  const invoices = queryAll(
    `SELECT id, invoice_number as reference, invoice_date as date, 'INVOICE' as type, grand_total as debit, 0 as credit, notes 
     FROM sales_invoices WHERE customer_id = ? AND status = 'FINALIZED'`,
    [customerId]
  );

  const receiptsList = queryAll(
    `SELECT id, receipt_number as reference, receipt_date as date, 'RECEIPT' as type, 0 as debit, amount as credit, notes 
     FROM receipts WHERE customer_id = ?`,
    [customerId]
  );

  const returns = queryAll(
    `SELECT id, return_number as reference, return_date as date, 'SALE_RETURN' as type, 0 as debit, total_credit_amount as credit, notes 
     FROM sales_returns WHERE customer_id = ?`,
    [customerId]
  );

  const allTx = [...invoices, ...receiptsList, ...returns].sort((a, b) => a.date.localeCompare(b.date));

  // Running balance calculation starting from opening balance
  let running = Number(customer.opening_balance || 0);
  const ledger = [
    {
      date: customer.created_at.slice(0, 10),
      reference: 'OPENING-BAL',
      type: 'OPENING',
      debit: running >= 0 ? running : 0,
      credit: running < 0 ? Math.abs(running) : 0,
      balance: running,
      notes: 'Opening Balance'
    }
  ];

  for (const tx of allTx) {
    running = running + Number(tx.debit) - Number(tx.credit);
    ledger.push({
      ...tx,
      balance: running
    });
  }

  res.json({
    customer,
    currentBalance: running,
    transactions: ledger
  });
});

// ==========================================
// 5. SUPPLIER MASTER & LEDGER
// ==========================================
apiRouter.get('/suppliers', (req: Request, res: Response) => {
  const suppliers = queryAll('SELECT * FROM suppliers ORDER BY name ASC');
  res.json(suppliers);
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.name) {
    res.status(400).json({ error: 'Supplier name is required' });
    return;
  }
  const id = 'sup-' + Date.now();
  const code = b.supplier_code || ('SUP-' + Math.floor(1000 + Math.random() * 9000));
  const opening = Number(b.opening_balance || 0);

  execute(
    `INSERT INTO suppliers (
      id, supplier_code, name, phone, email,
      address, city, state, pincode, gstin, state_code,
      opening_balance, current_balance, payment_terms, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      b.name.trim(),
      b.phone || '',
      b.email || '',
      b.address || '',
      b.city || '',
      b.state || 'Rajasthan',
      b.pincode || '',
      b.gstin || '',
      b.state_code || '08',
      opening,
      opening,
      b.payment_terms || 'Net 30',
      b.notes || '',
      new Date().toISOString()
    ]
  );

  logAudit('CREATE_SUPPLIER', 'suppliers', id, `Created supplier: ${b.name}`);
  res.json(queryOne('SELECT * FROM suppliers WHERE id = ?', [id]));
});

apiRouter.put('/suppliers/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const b = req.body;
  execute(
    `UPDATE suppliers SET
      name = ?, phone = ?, email = ?,
      address = ?, city = ?, state = ?, pincode = ?,
      gstin = ?, state_code = ?, payment_terms = ?, notes = ?
    WHERE id = ?`,
    [
      b.name.trim(),
      b.phone || '',
      b.email || '',
      b.address || '',
      b.city || '',
      b.state || '',
      b.pincode || '',
      b.gstin || '',
      b.state_code || '',
      b.payment_terms || '',
      b.notes || '',
      id
    ]
  );

  res.json(queryOne('SELECT * FROM suppliers WHERE id = ?', [id]));
});

apiRouter.get('/suppliers/:id/ledger', (req: Request, res: Response) => {
  const supplierId = req.params.id;
  const supplier = queryOne('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found' });
    return;
  }

  const bills = queryAll(
    `SELECT id, purchase_number as reference, purchase_date as date, 'PURCHASE_BILL' as type, grand_total as credit, 0 as debit, notes 
     FROM purchase_bills WHERE supplier_id = ? AND status = 'FINALIZED'`,
    [supplierId]
  );

  const paymentsList = queryAll(
    `SELECT id, payment_number as reference, payment_date as date, 'PAYMENT' as type, 0 as credit, amount as debit, notes 
     FROM payments WHERE supplier_id = ?`,
    [supplierId]
  );

  const returns = queryAll(
    `SELECT id, return_number as reference, return_date as date, 'PURCHASE_RETURN' as type, 0 as credit, total_debit_amount as debit, notes 
     FROM purchase_returns WHERE supplier_id = ?`,
    [supplierId]
  );

  const allTx = [...bills, ...paymentsList, ...returns].sort((a, b) => a.date.localeCompare(b.date));

  let running = Number(supplier.opening_balance || 0);
  const ledger = [
    {
      date: supplier.created_at.slice(0, 10),
      reference: 'OPENING-BAL',
      type: 'OPENING',
      debit: running < 0 ? Math.abs(running) : 0,
      credit: running >= 0 ? running : 0,
      balance: running,
      notes: 'Opening Balance'
    }
  ];

  for (const tx of allTx) {
    running = running + Number(tx.credit) - Number(tx.debit);
    ledger.push({
      ...tx,
      balance: running
    });
  }

  res.json({
    supplier,
    currentBalance: running,
    transactions: ledger
  });
});

// ==========================================
// 6. FINISHED PRODUCTS MASTER
// ==========================================
apiRouter.get('/products', (req: Request, res: Response) => {
  const products = queryAll('SELECT * FROM products ORDER BY name ASC');
  res.json(products);
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.name || !b.unit) {
    res.status(400).json({ error: 'Product name and unit are required' });
    return;
  }

  const id = 'prod-' + Date.now();
  const code = b.product_code || ('PRD-' + Math.floor(1000 + Math.random() * 9000));
  const openingStock = Number(b.opening_stock || 0);

  transaction(() => {
    execute(
      `INSERT INTO products (
        id, product_code, name, category, sku, size, unit,
        hsn_code, gst_rate, purchase_cost, retail_rate, wholesale_rate,
        opening_stock, current_stock, reorder_level, is_active, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code,
        b.name.trim(),
        b.category || 'Floor Cleaner',
        b.sku || '',
        b.size || '1 Ltr',
        b.unit,
        b.hsn_code || '3402',
        Number(b.gst_rate || 18.0),
        Number(b.purchase_cost || 0),
        Number(b.retail_rate || 0),
        Number(b.wholesale_rate || 0),
        openingStock,
        openingStock,
        Number(b.reorder_level || 10),
        b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1,
        b.notes || '',
        new Date().toISOString()
      ]
    );

    // If opening stock > 0, log opening stock movement
    if (openingStock > 0) {
      execute(
        `INSERT INTO inventory_movements (
          id, movement_date, item_type, item_id, movement_type,
          reference_type, reference_number, quantity, balance_after, unit_cost, total_value, notes, created_at
        ) VALUES (?, ?, 'PRODUCT', ?, 'OPENING', 'INITIAL', 'OPN-STOCK', ?, ?, ?, ?, 'Opening stock balance', ?)`,
        [
          'mov-' + Date.now(),
          new Date().toISOString().slice(0, 10),
          id,
          openingStock,
          openingStock,
          Number(b.purchase_cost || 0),
          openingStock * Number(b.purchase_cost || 0),
          new Date().toISOString()
        ]
      );
    }
  });

  logAudit('CREATE_PRODUCT', 'products', id, `Created finished product: ${b.name}`);
  res.json(queryOne('SELECT * FROM products WHERE id = ?', [id]));
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const b = req.body;
  const existing = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  execute(
    `UPDATE products SET
      name = ?, category = ?, sku = ?, size = ?, unit = ?,
      hsn_code = ?, gst_rate = ?, purchase_cost = ?, retail_rate = ?, wholesale_rate = ?,
      reorder_level = ?, is_active = ?, notes = ?
    WHERE id = ?`,
    [
      b.name.trim(),
      b.category || existing.category,
      b.sku || '',
      b.size || '',
      b.unit,
      b.hsn_code || '',
      Number(b.gst_rate || 18.0),
      Number(b.purchase_cost || 0),
      Number(b.retail_rate || 0),
      Number(b.wholesale_rate || 0),
      Number(b.reorder_level || 10),
      b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1,
      b.notes || '',
      id
    ]
  );

  logAudit('UPDATE_PRODUCT', 'products', id, `Updated finished product: ${b.name}`);
  res.json(queryOne('SELECT * FROM products WHERE id = ?', [id]));
});

// ==========================================
// 7. RAW MATERIALS & PACKAGING INVENTORY
// ==========================================
apiRouter.get('/raw-materials', (req: Request, res: Response) => {
  const materials = queryAll('SELECT * FROM raw_materials ORDER BY name ASC');
  res.json(materials);
});

apiRouter.post('/raw-materials', (req: Request, res: Response) => {
  const b = req.body;
  if (!b.name || !b.unit) {
    res.status(400).json({ error: 'Material name and unit are required' });
    return;
  }

  const id = 'mat-' + Date.now();
  const code = b.material_code || ('MAT-' + Math.floor(1000 + Math.random() * 9000));
  const openingStock = Number(b.opening_stock || 0);

  transaction(() => {
    execute(
      `INSERT INTO raw_materials (
        id, material_code, name, category, unit,
        hsn_code, gst_rate, purchase_cost, opening_stock, current_stock,
        reorder_level, supplier_id, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code,
        b.name.trim(),
        b.category || 'Chemical',
        b.unit,
        b.hsn_code || '',
        Number(b.gst_rate || 18.0),
        Number(b.purchase_cost || 0),
        openingStock,
        openingStock,
        Number(b.reorder_level || 10),
        b.supplier_id || null,
        b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1,
        new Date().toISOString()
      ]
    );

    if (openingStock > 0) {
      execute(
        `INSERT INTO inventory_movements (
          id, movement_date, item_type, item_id, movement_type,
          reference_type, reference_number, quantity, balance_after, unit_cost, total_value, notes, created_at
        ) VALUES (?, ?, 'RAW_MATERIAL', ?, 'OPENING', 'INITIAL', 'OPN-MAT', ?, ?, ?, ?, 'Opening material balance', ?)`,
        [
          'mov-' + Date.now(),
          new Date().toISOString().slice(0, 10),
          id,
          openingStock,
          openingStock,
          Number(b.purchase_cost || 0),
          openingStock * Number(b.purchase_cost || 0),
          new Date().toISOString()
        ]
      );
    }
  });

  logAudit('CREATE_MATERIAL', 'raw_materials', id, `Created material: ${b.name}`);
  res.json(queryOne('SELECT * FROM raw_materials WHERE id = ?', [id]));
});

apiRouter.put('/raw-materials/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const b = req.body;
  execute(
    `UPDATE raw_materials SET
      name = ?, category = ?, unit = ?,
      hsn_code = ?, gst_rate = ?, purchase_cost = ?,
      reorder_level = ?, supplier_id = ?, is_active = ?
    WHERE id = ?`,
    [
      b.name.trim(),
      b.category,
      b.unit,
      b.hsn_code || '',
      Number(b.gst_rate || 18.0),
      Number(b.purchase_cost || 0),
      Number(b.reorder_level || 10),
      b.supplier_id || null,
      b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1,
      id
    ]
  );
  res.json(queryOne('SELECT * FROM raw_materials WHERE id = ?', [id]));
});

// ==========================================
// 8. BILL OF MATERIALS (BOM) / RECIPES
// ==========================================
apiRouter.get('/recipes', (req: Request, res: Response) => {
  const boms = queryAll(
    `SELECT b.*, p.name as product_name, p.category as product_category 
     FROM bills_of_materials b
     JOIN products p ON b.product_id = p.id
     ORDER BY b.recipe_name ASC`
  );
  const result = boms.map(bom => {
    const items = queryAll(
      `SELECT bi.*, m.name as material_name, m.category as material_category, m.purchase_cost as latest_cost 
       FROM bom_items bi
       JOIN raw_materials m ON bi.raw_material_id = m.id
       WHERE bi.bom_id = ?`,
      [bom.id]
    );
    return { ...bom, items };
  });
  res.json(result);
});

apiRouter.post('/recipes', (req: Request, res: Response) => {
  const { product_id, recipe_name, version, expected_output_qty, output_unit, labour_cost_est, overhead_cost_est, expected_yield_pct, instructions, items } = req.body;
  if (!product_id || !recipe_name || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Product, recipe name, and ingredients items are required' });
    return;
  }

  const bomId = 'bom-' + Date.now();
  transaction(() => {
    execute(
      `INSERT INTO bills_of_materials (
        id, product_id, recipe_name, version, expected_output_qty, output_unit,
        labour_cost_est, overhead_cost_est, expected_yield_pct, instructions, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        bomId,
        product_id,
        recipe_name,
        version || '1.0',
        Number(expected_output_qty || 1),
        output_unit || 'Bottle',
        Number(labour_cost_est || 0),
        Number(overhead_cost_est || 0),
        Number(expected_yield_pct || 98.0),
        instructions || '',
        new Date().toISOString()
      ]
    );

    for (const item of items) {
      execute(
        `INSERT INTO bom_items (id, bom_id, raw_material_id, quantity, unit, cost_per_unit)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'bomi-' + Math.random().toString(36).substring(2, 9),
          bomId,
          item.raw_material_id,
          Number(item.quantity),
          item.unit,
          Number(item.cost_per_unit || 0)
        ]
      );
    }
  });

  logAudit('CREATE_RECIPE', 'bills_of_materials', bomId, `Created BOM recipe: ${recipe_name}`);
  res.json({ success: true, id: bomId });
});

// ==========================================
// 9. MANUFACTURING & PRODUCTION BATCHES
// ==========================================
apiRouter.get('/production', (req: Request, res: Response) => {
  const batches = queryAll(
    `SELECT pb.*, p.name as product_name, p.category as product_category 
     FROM production_batches pb
     JOIN products p ON pb.product_id = p.id
     ORDER BY pb.production_date DESC, pb.created_at DESC`
  );
  const result = batches.map(batch => {
    const consumed = queryAll(
      `SELECT pc.*, rm.name as material_name, rm.category as material_category 
       FROM production_consumption pc
       JOIN raw_materials rm ON pc.raw_material_id = rm.id
       WHERE pc.batch_id = ?`,
      [batch.id]
    );
    return { ...batch, consumed };
  });
  res.json(result);
});

apiRouter.post('/production', (req: Request, res: Response) => {
  const b = req.body;
  const {
    product_id,
    bom_id,
    production_date,
    mfg_date,
    expiry_date,
    planned_quantity,
    accepted_quantity,
    rejected_quantity,
    wasted_quantity,
    unit,
    labour_cost,
    electricity_overhead_cost,
    additional_expenses,
    materials_consumed, // Array of { raw_material_id, quantity, unit, cost_per_unit }
    notes
  } = b;

  if (!product_id || !accepted_quantity || !materials_consumed || materials_consumed.length === 0) {
    res.status(400).json({ error: 'Product, accepted quantity, and consumed materials are required' });
    return;
  }

  // Generate unique batch number if not specified
  const batchNumber = b.batch_number || ('BAT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
  const batchId = 'batch-' + Date.now();
  const now = new Date().toISOString();

  try {
    transaction(() => {
      // 1. Calculate raw material and packaging costs
      let rawMaterialCost = 0;
      let packagingCost = 0;

      for (const mat of materials_consumed) {
        const materialRecord = queryOne('SELECT * FROM raw_materials WHERE id = ?', [mat.raw_material_id]);
        if (!materialRecord) {
          throw new Error(`Raw material with ID ${mat.raw_material_id} not found`);
        }

        const qty = Number(mat.quantity);
        const costPerUnit = Number(mat.cost_per_unit || materialRecord.purchase_cost || 0);
        const lineTotal = qty * costPerUnit;

        if (materialRecord.category.toLowerCase().includes('packaging') || materialRecord.category.toLowerCase().includes('bottle') || materialRecord.category.toLowerCase().includes('cap') || materialRecord.category.toLowerCase().includes('label') || materialRecord.category.toLowerCase().includes('carton')) {
          packagingCost += lineTotal;
        } else {
          rawMaterialCost += lineTotal;
        }

        // Deduct raw material stock
        const newStock = Number(materialRecord.current_stock) - qty;
        execute('UPDATE raw_materials SET current_stock = ? WHERE id = ?', [newStock, mat.raw_material_id]);

        // Record stock ledger movement for consumption
        execute(
          `INSERT INTO inventory_movements (
            id, movement_date, item_type, item_id, movement_type,
            reference_type, reference_id, reference_number, batch_number,
            quantity, balance_after, unit_cost, total_value, notes, created_at
          ) VALUES (?, ?, 'RAW_MATERIAL', ?, 'PRODUCTION_CONSUMED', 'PRODUCTION_BATCH', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            production_date,
            mat.raw_material_id,
            batchId,
            batchNumber,
            batchNumber,
            -qty,
            newStock,
            costPerUnit,
            lineTotal,
            `Consumed in batch ${batchNumber}`,
            now
          ]
        );

        // Record consumption detail
        execute(
          `INSERT INTO production_consumption (id, batch_id, raw_material_id, quantity, unit, cost_per_unit, total_cost)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'pc-' + Math.random().toString(36).substring(2, 9),
            batchId,
            mat.raw_material_id,
            qty,
            mat.unit || materialRecord.unit,
            costPerUnit,
            lineTotal
          ]
        );
      }

      const totalLabor = Number(labour_cost || 0);
      const totalOverhead = Number(electricity_overhead_cost || 0);
      const totalAdditional = Number(additional_expenses || 0);
      const totalCost = rawMaterialCost + packagingCost + totalLabor + totalOverhead + totalAdditional;
      const acceptedQty = Number(accepted_quantity);
      const costPerUnit = acceptedQty > 0 ? (totalCost / acceptedQty) : 0;
      const plannedQty = Number(planned_quantity || acceptedQty);
      const yieldPct = plannedQty > 0 ? ((acceptedQty / plannedQty) * 100) : 100;

      // 2. Insert batch record
      execute(
        `INSERT INTO production_batches (
          id, batch_number, bom_id, product_id, production_date, mfg_date, expiry_date,
          planned_quantity, accepted_quantity, rejected_quantity, wasted_quantity, unit,
          raw_material_cost, packaging_cost, labour_cost, electricity_overhead_cost, additional_expenses,
          total_cost, cost_per_unit, yield_percentage, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
        [
          batchId,
          batchNumber,
          bom_id || null,
          product_id,
          production_date,
          mfg_date || production_date,
          expiry_date || null,
          plannedQty,
          acceptedQty,
          Number(rejected_quantity || 0),
          Number(wasted_quantity || 0),
          unit,
          rawMaterialCost,
          packagingCost,
          totalLabor,
          totalOverhead,
          totalAdditional,
          totalCost,
          costPerUnit,
          yieldPct,
          notes || '',
          now
        ]
      );

      // 3. Increase finished product stock
      const product = queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
      const newProductStock = Number(product.current_stock) + acceptedQty;
      // Also update purchase_cost with calculated manufacturing cost if costPerUnit > 0
      execute('UPDATE products SET current_stock = ?, purchase_cost = ? WHERE id = ?', [newProductStock, costPerUnit, product_id]);

      // 4. Create finished goods inventory batch for FEFO tracking
      execute(
        `INSERT INTO inventory_batches (
          id, batch_number, item_type, item_id, mfg_date, expiry_date,
          quantity_received, quantity_remaining, cost_per_unit, storage_location, status, created_at
        ) VALUES (?, ?, 'PRODUCT', ?, ?, ?, ?, ?, ?, 'Factory Warehouse', 'ACTIVE', ?)`,
        [
          'invb-' + Date.now(),
          batchNumber,
          product_id,
          mfg_date || production_date,
          expiry_date || null,
          acceptedQty,
          acceptedQty,
          costPerUnit,
          now
        ]
      );

      // 5. Stock movement for finished product
      execute(
        `INSERT INTO inventory_movements (
          id, movement_date, item_type, item_id, movement_type,
          reference_type, reference_id, reference_number, batch_number,
          quantity, balance_after, unit_cost, total_value, notes, created_at
        ) VALUES (?, ?, 'PRODUCT', ?, 'PRODUCTION_IN', 'PRODUCTION_BATCH', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'mov-' + Date.now() + '-p',
          production_date,
          product_id,
          batchId,
          batchNumber,
          batchNumber,
          acceptedQty,
          newProductStock,
          costPerUnit,
          totalCost,
          `Batch output produced: ${batchNumber}`,
          now
        ]
      );

      // 6. Record wastage if wasted_quantity > 0
      const wastedQty = Number(wasted_quantity || 0);
      if (wastedQty > 0) {
        const wasteCost = wastedQty * costPerUnit;
        execute(
          `INSERT INTO wastage_records (
            id, wastage_number, wastage_date, item_type, item_id, item_name,
            batch_number, quantity, unit, unit_cost, total_cost, reason, notes, created_at
          ) VALUES (?, ?, ?, 'PRODUCT', ?, ?, ?, ?, ?, ?, ?, 'Rejected Production', ?, ?)`,
          [
            'wst-' + Date.now(),
            'WST-' + batchNumber,
            production_date,
            product_id,
            product.name,
            batchNumber,
            wastedQty,
            unit,
            costPerUnit,
            wasteCost,
            `Wastage from production batch ${batchNumber}`,
            now
          ]
        );
      }
    });

    logAudit('CREATE_BATCH', 'production_batches', batchId, `Finalized production batch: ${batchNumber} (${accepted_quantity} ${unit})`);
    res.json({ success: true, batchId, batchNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Production batch transaction failed' });
  }
});

// Reversal of an incorrectly posted production batch
apiRouter.post('/production/:id/reverse', (req: Request, res: Response) => {
  const batchId = req.params.id;
  const batch = queryOne('SELECT * FROM production_batches WHERE id = ?', [batchId]);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }
  if (batch.status === 'REVERSED') {
    res.status(400).json({ error: 'Batch has already been reversed' });
    return;
  }

  const now = new Date().toISOString();
  try {
    transaction(() => {
      // 1. Revert finished goods stock
      const product = queryOne('SELECT * FROM products WHERE id = ?', [batch.product_id]);
      const newProductStock = Number(product.current_stock) - Number(batch.accepted_quantity);
      execute('UPDATE products SET current_stock = ? WHERE id = ?', [newProductStock, batch.product_id]);

      // Stock movement for reversal
      execute(
        `INSERT INTO inventory_movements (
          id, movement_date, item_type, item_id, movement_type,
          reference_type, reference_id, reference_number, batch_number,
          quantity, balance_after, unit_cost, total_value, notes, created_at
        ) VALUES (?, ?, 'PRODUCT', ?, 'ADJUSTMENT', 'PRODUCTION_BATCH_REVERSAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'mov-' + Date.now() + '-rev',
          new Date().toISOString().slice(0, 10),
          batch.product_id,
          batch.id,
          batch.batch_number,
          batch.batch_number,
          -Number(batch.accepted_quantity),
          newProductStock,
          batch.cost_per_unit,
          batch.total_cost,
          `Batch reversal: ${batch.batch_number}`,
          now
        ]
      );

      // Mark inventory batch consumed/cancelled
      execute("UPDATE inventory_batches SET status = 'CONSUMED', quantity_remaining = 0 WHERE batch_number = ?", [batch.batch_number]);

      // 2. Revert raw materials consumed
      const consumptions = queryAll('SELECT * FROM production_consumption WHERE batch_id = ?', [batch.id]);
      for (const c of consumptions) {
        const mat = queryOne('SELECT * FROM raw_materials WHERE id = ?', [c.raw_material_id]);
        const newMatStock = Number(mat.current_stock) + Number(c.quantity);
        execute('UPDATE raw_materials SET current_stock = ? WHERE id = ?', [newMatStock, c.raw_material_id]);

        execute(
          `INSERT INTO inventory_movements (
            id, movement_date, item_type, item_id, movement_type,
            reference_type, reference_id, reference_number, batch_number,
            quantity, balance_after, unit_cost, total_value, notes, created_at
          ) VALUES (?, ?, 'RAW_MATERIAL', ?, 'ADJUSTMENT', 'PRODUCTION_BATCH_REVERSAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            new Date().toISOString().slice(0, 10),
            c.raw_material_id,
            batch.id,
            batch.batch_number,
            batch.batch_number,
            Number(c.quantity),
            newMatStock,
            c.cost_per_unit,
            c.total_cost,
            `Restored from batch reversal: ${batch.batch_number}`,
            now
          ]
        );
      }

      // Mark batch as REVERSED
      execute("UPDATE production_batches SET status = 'REVERSED' WHERE id = ?", [batch.id]);
    });

    logAudit('REVERSE_BATCH', 'production_batches', batchId, `Reversed production batch: ${batch.batch_number}`);
    res.json({ success: true, message: `Batch ${batch.batch_number} reversed successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch reversal failed' });
  }
});

// ==========================================
// 10. SALES INVOICES (A5 & A4)
// ==========================================
apiRouter.get('/invoices', (req: Request, res: Response) => {
  const invoices = queryAll(
    `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.gstin as customer_gstin 
     FROM sales_invoices i
     JOIN customers c ON i.customer_id = c.id
     ORDER BY i.invoice_date DESC, i.created_at DESC`
  );
  res.json(invoices);
});

apiRouter.get('/invoices/:id', (req: Request, res: Response) => {
  const invoice = queryOne(
    `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
            c.billing_address as cust_billing_address, c.shipping_address as cust_shipping_address,
            c.gstin as cust_gstin, c.current_balance as cust_current_balance
     FROM sales_invoices i
     JOIN customers c ON i.customer_id = c.id
     WHERE i.id = ?`,
    [req.params.id]
  );
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  const items = queryAll('SELECT * FROM sales_invoice_items WHERE invoice_id = ? ORDER BY item_index ASC', [invoice.id]);
  const settings = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
  res.json({ ...invoice, items, settings });
});

apiRouter.post('/invoices', (req: Request, res: Response) => {
  const b = req.body;
  const isDraft = b.isDraft === true;
  const items = b.items;

  if (!b.customer_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Customer and invoice items are required' });
    return;
  }

  const invoiceId = 'inv-' + Date.now();
  const now = new Date().toISOString();

  try {
    const result = transaction(() => {
      const settings = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
      const customer = queryOne('SELECT * FROM customers WHERE id = ?', [b.customer_id]);
      if (!customer) throw new Error('Customer not found');

      // Generate invoice number
      let invoiceNumber = b.invoice_number;
      if (!invoiceNumber) {
        const prefix = settings.invoice_prefix || 'NXL-';
        const nextNum = Number(settings.invoice_next_number || 101);
        invoiceNumber = `${prefix}${nextNum}`;
        execute('UPDATE company_settings SET invoice_next_number = ? WHERE id = ?', [nextNum + 1, 'default']);
      }

      // Compute calculations
      let subtotal = 0;
      let itemDiscountsTotal = 0;
      let taxableAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      // Determine intra-state vs inter-state
      const companyState = (settings.state || 'Rajasthan').trim().toLowerCase();
      const placeOfSupply = (b.place_of_supply || customer.billing_state || 'Rajasthan').trim().toLowerCase();
      const isIntraState = companyState === placeOfSupply;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const gross = qty * rate;
        const discountAmt = Number(item.discount_amount || (gross * (Number(item.discount_pct || 0) / 100)));
        const taxable = gross - discountAmt;
        const gstRate = Number(item.gst_rate || 18.0);

        let itemCgstRate = 0, itemCgstAmt = 0;
        let itemSgstRate = 0, itemSgstAmt = 0;
        let itemIgstRate = 0, itemIgstAmt = 0;

        if (isIntraState) {
          itemCgstRate = gstRate / 2;
          itemSgstRate = gstRate / 2;
          itemCgstAmt = (taxable * itemCgstRate) / 100;
          itemSgstAmt = (taxable * itemSgstRate) / 100;
        } else {
          itemIgstRate = gstRate;
          itemIgstAmt = (taxable * itemIgstRate) / 100;
        }

        const itemTotal = taxable + itemCgstAmt + itemSgstAmt + itemIgstAmt;

        subtotal += gross;
        itemDiscountsTotal += discountAmt;
        taxableAmount += taxable;
        cgstAmount += itemCgstAmt;
        sgstAmount += itemSgstAmt;
        igstAmount += itemIgstAmt;

        // Insert item record
        execute(
          `INSERT INTO sales_invoice_items (
            id, invoice_id, item_index, product_id, product_name, hsn_code, unit, batch_number,
            quantity, rate, discount_pct, discount_amount, taxable_amount, gst_rate,
            cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'invi-' + Math.random().toString(36).substring(2, 9),
            invoiceId,
            i + 1,
            item.product_id,
            item.product_name,
            item.hsn_code || '3402',
            item.unit || 'Bottle',
            item.batch_number || '',
            qty,
            rate,
            Number(item.discount_pct || 0),
            discountAmt,
            taxable,
            gstRate,
            itemCgstRate,
            itemCgstAmt,
            itemSgstRate,
            itemSgstAmt,
            itemIgstRate,
            itemIgstAmt,
            itemTotal
          ]
        );

        // If finalizing right now (not draft), deduct product stock and log movement!
        if (!isDraft) {
          const product = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
          if (product) {
            const newStock = Number(product.current_stock) - qty;
            execute('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);

            execute(
              `INSERT INTO inventory_movements (
                id, movement_date, item_type, item_id, movement_type,
                reference_type, reference_id, reference_number, batch_number,
                quantity, balance_after, unit_cost, total_value, notes, created_at
              ) VALUES (?, ?, 'PRODUCT', ?, 'SALE', 'SALES_INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'mov-' + Date.now() + '-' + i,
                b.invoice_date || now.slice(0, 10),
                item.product_id,
                invoiceId,
                invoiceNumber,
                item.batch_number || '',
                -qty,
                newStock,
                rate,
                taxable,
                `Sale invoice ${invoiceNumber} to ${customer.name}`,
                now
              ]
            );
          }
        }
      }

      const invDiscount = Number(b.invoice_discount_amount || 0);
      const freight = Number(b.freight_charges || 0);
      const other = Number(b.other_charges || 0);
      const totalTax = cgstAmount + sgstAmount + igstAmount;
      const rawGrandTotal = taxableAmount - invDiscount + totalTax + freight + other;
      const roundOff = Math.round(rawGrandTotal) - rawGrandTotal;
      const grandTotal = Math.round(rawGrandTotal);

      const paidAmount = Number(b.paid_amount || 0);
      const balanceDue = grandTotal - paidAmount;
      const paymentStatus = balanceDue <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      const status = isDraft ? 'DRAFT' : 'FINALIZED';

      // Insert master invoice record
      execute(
        `INSERT INTO sales_invoices (
          id, invoice_number, customer_id, invoice_date, due_date, status, sale_type,
          place_of_supply, billing_name, billing_address, billing_gstin,
          shipping_name, shipping_address, transporter_name, vehicle_number, lr_number, payment_terms,
          subtotal, item_discounts_total, invoice_discount_amount, taxable_amount,
          cgst_amount, sgst_amount, igst_amount, total_tax, freight_charges, other_charges,
          round_off, grand_total, paid_amount, balance_due, payment_status, notes, terms_and_conditions,
          created_at, finalized_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          invoiceNumber,
          b.customer_id,
          b.invoice_date || now.slice(0, 10),
          b.due_date || b.invoice_date || now.slice(0, 10),
          status,
          b.sale_type || 'WHOLESALE',
          b.place_of_supply || customer.billing_state || 'Rajasthan',
          b.billing_name || customer.name,
          b.billing_address || customer.billing_address || '',
          b.billing_gstin || customer.gstin || '',
          b.shipping_name || b.billing_name || customer.name,
          b.shipping_address || b.billing_address || customer.shipping_address || '',
          b.transporter_name || '',
          b.vehicle_number || '',
          b.lr_number || '',
          b.payment_terms || customer.payment_terms || 'Due on Receipt',
          subtotal,
          itemDiscountsTotal,
          invDiscount,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          igstAmount,
          totalTax,
          freight,
          other,
          roundOff,
          grandTotal,
          paidAmount,
          balanceDue,
          paymentStatus,
          b.notes || '',
          b.terms_and_conditions || settings.default_terms || '',
          now,
          isDraft ? null : now
        ]
      );

      // If finalized: update customer outstanding balance & record receipt if paid > 0
      if (!isDraft) {
        const newCustomerBal = Number(customer.current_balance) + balanceDue;
        execute('UPDATE customers SET current_balance = ? WHERE id = ?', [newCustomerBal, customer.id]);

        if (paidAmount > 0) {
          const receiptId = 'rec-' + Date.now();
          const receiptNo = 'RCP-' + invoiceNumber;
          execute(
            `INSERT INTO receipts (
              id, receipt_number, receipt_date, customer_id, amount,
              payment_mode, account_id, reference_no, invoice_id, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              receiptId,
              receiptNo,
              b.invoice_date || now.slice(0, 10),
              customer.id,
              paidAmount,
              b.payment_mode || 'CASH',
              b.account_id || 'acc-cash',
              invoiceNumber,
              invoiceId,
              `Payment received upon invoice ${invoiceNumber}`,
              now
            ]
          );

          // Update bank/cash account balance
          const accId = b.account_id || 'acc-cash';
          const acc = queryOne('SELECT * FROM bank_accounts WHERE id = ?', [accId]);
          if (acc) {
            execute('UPDATE bank_accounts SET current_balance = ? WHERE id = ?', [Number(acc.current_balance) + paidAmount, accId]);
          }
        }
      }

      return { invoiceId, invoiceNumber, status };
    });

    logAudit(isDraft ? 'CREATE_DRAFT_INVOICE' : 'FINALIZE_INVOICE', 'sales_invoices', result.invoiceId, `Created invoice ${result.invoiceNumber}`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Invoice creation failed' });
  }
});

// Finalize a previously saved draft invoice
apiRouter.post('/invoices/:id/finalize', (req: Request, res: Response) => {
  const invoiceId = req.params.id;
  const invoice = queryOne('SELECT * FROM sales_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  if (invoice.status !== 'DRAFT') {
    res.status(400).json({ error: 'Invoice is already finalized or cancelled' });
    return;
  }

  const now = new Date().toISOString();
  try {
    transaction(() => {
      const items = queryAll('SELECT * FROM sales_invoice_items WHERE invoice_id = ?', [invoiceId]);
      const customer = queryOne('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]);

      // Deduct stock for all items
      for (const item of items) {
        const product = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (product) {
          const newStock = Number(product.current_stock) - Number(item.quantity);
          execute('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);

          execute(
            `INSERT INTO inventory_movements (
              id, movement_date, item_type, item_id, movement_type,
              reference_type, reference_id, reference_number, batch_number,
              quantity, balance_after, unit_cost, total_value, notes, created_at
            ) VALUES (?, ?, 'PRODUCT', ?, 'SALE', 'SALES_INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              invoice.invoice_date,
              item.product_id,
              invoice.id,
              invoice.invoice_number,
              item.batch_number || '',
              -Number(item.quantity),
              newStock,
              item.rate,
              item.taxable_amount,
              `Finalized sale ${invoice.invoice_number} to ${customer.name}`,
              now
            ]
          );
        }
      }

      // Update customer balance
      const newCustomerBal = Number(customer.current_balance) + Number(invoice.balance_due);
      execute('UPDATE customers SET current_balance = ? WHERE id = ?', [newCustomerBal, customer.id]);

      // Update invoice status
      execute("UPDATE sales_invoices SET status = 'FINALIZED', finalized_at = ? WHERE id = ?", [now, invoiceId]);
    });

    logAudit('FINALIZE_DRAFT_INVOICE', 'sales_invoices', invoiceId, `Finalized draft invoice ${invoice.invoice_number}`);
    res.json({ success: true, message: `Invoice ${invoice.invoice_number} finalized successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Invoice finalization failed' });
  }
});

// Cancel a finalized invoice (Auditable rollback)
apiRouter.post('/invoices/:id/cancel', (req: Request, res: Response) => {
  const invoiceId = req.params.id;
  const { reason } = req.body;
  const invoice = queryOne('SELECT * FROM sales_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  if (invoice.status === 'CANCELLED') {
    res.status(400).json({ error: 'Invoice is already cancelled' });
    return;
  }

  const now = new Date().toISOString();
  try {
    transaction(() => {
      // If was finalized, restore stock & adjust customer balance
      if (invoice.status === 'FINALIZED') {
        const items = queryAll('SELECT * FROM sales_invoice_items WHERE invoice_id = ?', [invoiceId]);
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]);

        for (const item of items) {
          const product = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
          if (product) {
            const restoredStock = Number(product.current_stock) + Number(item.quantity);
            execute('UPDATE products SET current_stock = ? WHERE id = ?', [restoredStock, item.product_id]);

            execute(
              `INSERT INTO inventory_movements (
                id, movement_date, item_type, item_id, movement_type,
                reference_type, reference_id, reference_number, batch_number,
                quantity, balance_after, unit_cost, total_value, notes, created_at
              ) VALUES (?, ?, 'PRODUCT', ?, 'ADJUSTMENT', 'INVOICE_CANCELLATION', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'mov-' + Date.now() + '-c',
                now.slice(0, 10),
                item.product_id,
                invoice.id,
                invoice.invoice_number,
                item.batch_number || '',
                Number(item.quantity),
                restoredStock,
                item.rate,
                item.taxable_amount,
                `Restored from cancelled invoice ${invoice.invoice_number}: ${reason || ''}`,
                now
              ]
            );
          }
        }

        const newCustomerBal = Number(customer.current_balance) - Number(invoice.balance_due);
        execute('UPDATE customers SET current_balance = ? WHERE id = ?', [newCustomerBal, customer.id]);
      }

      execute("UPDATE sales_invoices SET status = 'CANCELLED' WHERE id = ?", [invoiceId]);
    });

    logAudit('CANCEL_INVOICE', 'sales_invoices', invoiceId, `Cancelled invoice ${invoice.invoice_number}. Reason: ${reason || 'N/A'}`);
    res.json({ success: true, message: `Invoice ${invoice.invoice_number} cancelled successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Invoice cancellation failed' });
  }
});

// ==========================================
// 11. PURCHASE BILL MANAGEMENT
// ==========================================
apiRouter.get('/purchases', (req: Request, res: Response) => {
  const bills = queryAll(
    `SELECT pb.*, s.name as supplier_name, s.phone as supplier_phone, s.gstin as supplier_gstin 
     FROM purchase_bills pb
     JOIN suppliers s ON pb.supplier_id = s.id
     ORDER BY pb.purchase_date DESC, pb.created_at DESC`
  );
  res.json(bills);
});

apiRouter.get('/purchases/:id', (req: Request, res: Response) => {
  const bill = queryOne(
    `SELECT pb.*, s.name as supplier_name, s.phone as supplier_phone, s.address as supplier_address, s.gstin as supplier_gstin 
     FROM purchase_bills pb
     JOIN suppliers s ON pb.supplier_id = s.id
     WHERE pb.id = ?`,
    [req.params.id]
  );
  if (!bill) {
    res.status(404).json({ error: 'Purchase bill not found' });
    return;
  }
  const items = queryAll('SELECT * FROM purchase_bill_items WHERE purchase_id = ? ORDER BY item_index ASC', [bill.id]);
  res.json({ ...bill, items });
});

apiRouter.post('/purchases', (req: Request, res: Response) => {
  const b = req.body;
  const items = b.items;

  if (!b.supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Supplier and purchase items are required' });
    return;
  }

  const purchaseId = 'pur-' + Date.now();
  const now = new Date().toISOString();

  try {
    const result = transaction(() => {
      const supplier = queryOne('SELECT * FROM suppliers WHERE id = ?', [b.supplier_id]);
      if (!supplier) throw new Error('Supplier not found');

      // Duplicate supplier invoice check
      if (b.supplier_invoice_number) {
        const existing = queryOne(
          'SELECT id, purchase_number FROM purchase_bills WHERE supplier_id = ? AND supplier_invoice_number = ?',
          [b.supplier_id, b.supplier_invoice_number.trim()]
        );
        if (existing) {
          throw new Error(`Supplier invoice number "${b.supplier_invoice_number}" is already recorded in bill ${existing.purchase_number}`);
        }
      }

      const settings = queryOne('SELECT * FROM company_settings WHERE id = ?', ['default']);
      const prefix = settings.purchase_prefix || 'PUR-';
      const nextNum = Number(settings.purchase_next_number || 1);
      const purchaseNumber = `${prefix}${nextNum}`;
      execute('UPDATE company_settings SET purchase_next_number = ? WHERE id = ?', [nextNum + 1, 'default']);

      let subtotal = 0;
      let taxableAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      const companyState = (settings.state || 'Rajasthan').trim().toLowerCase();
      const supplierState = (supplier.state || 'Rajasthan').trim().toLowerCase();
      const isIntraState = companyState === supplierState;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const gross = qty * rate;
        const discountAmt = Number(item.discount_amount || 0);
        const taxable = gross - discountAmt;
        const gstRate = Number(item.gst_rate || 18.0);

        let itemCgstAmt = 0;
        let itemSgstAmt = 0;
        let itemIgstAmt = 0;

        if (isIntraState) {
          itemCgstAmt = (taxable * (gstRate / 2)) / 100;
          itemSgstAmt = (taxable * (gstRate / 2)) / 100;
        } else {
          itemIgstAmt = (taxable * gstRate) / 100;
        }

        const itemTotal = taxable + itemCgstAmt + itemSgstAmt + itemIgstAmt;
        subtotal += gross;
        taxableAmount += taxable;
        cgstAmount += itemCgstAmt;
        sgstAmount += itemSgstAmt;
        igstAmount += itemIgstAmt;

        execute(
          `INSERT INTO purchase_bill_items (
            id, purchase_id, item_index, item_type, item_id, item_name, hsn_code, unit,
            batch_number, expiry_date, quantity, rate, discount_amount, taxable_amount,
            gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'puri-' + Math.random().toString(36).substring(2, 9),
            purchaseId,
            i + 1,
            item.item_type || 'RAW_MATERIAL',
            item.item_id,
            item.item_name,
            item.hsn_code || '',
            item.unit || 'Kg',
            item.batch_number || '',
            item.expiry_date || null,
            qty,
            rate,
            discountAmt,
            taxable,
            gstRate,
            itemCgstAmt,
            itemSgstAmt,
            itemIgstAmt,
            itemTotal
          ]
        );

        // Update inventory for raw material or finished product
        if (item.item_type === 'PRODUCT') {
          const p = queryOne('SELECT * FROM products WHERE id = ?', [item.item_id]);
          if (p) {
            const newStock = Number(p.current_stock) + qty;
            execute('UPDATE products SET current_stock = ?, purchase_cost = ? WHERE id = ?', [newStock, rate, item.item_id]);
            execute(
              `INSERT INTO inventory_movements (
                id, movement_date, item_type, item_id, movement_type,
                reference_type, reference_id, reference_number, batch_number,
                quantity, balance_after, unit_cost, total_value, notes, created_at
              ) VALUES (?, ?, 'PRODUCT', ?, 'PURCHASE', 'PURCHASE_BILL', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'mov-' + Date.now() + '-' + i,
                b.purchase_date || now.slice(0, 10),
                item.item_id,
                purchaseId,
                purchaseNumber,
                item.batch_number || '',
                qty,
                newStock,
                rate,
                taxable,
                `Purchase bill ${purchaseNumber} from ${supplier.name}`,
                now
              ]
            );
          }
        } else {
          // RAW MATERIAL
          const rm = queryOne('SELECT * FROM raw_materials WHERE id = ?', [item.item_id]);
          if (rm) {
            const newStock = Number(rm.current_stock) + qty;
            execute('UPDATE raw_materials SET current_stock = ?, purchase_cost = ? WHERE id = ?', [newStock, rate, item.item_id]);
            execute(
              `INSERT INTO inventory_movements (
                id, movement_date, item_type, item_id, movement_type,
                reference_type, reference_id, reference_number, batch_number,
                quantity, balance_after, unit_cost, total_value, notes, created_at
              ) VALUES (?, ?, 'RAW_MATERIAL', ?, 'PURCHASE', 'PURCHASE_BILL', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'mov-' + Date.now() + '-' + i,
                b.purchase_date || now.slice(0, 10),
                item.item_id,
                purchaseId,
                purchaseNumber,
                item.batch_number || '',
                qty,
                newStock,
                rate,
                taxable,
                `Purchase bill ${purchaseNumber} from ${supplier.name}`,
                now
              ]
            );
          }
        }
      }

      const freight = Number(b.freight_charges || 0);
      const other = Number(b.other_charges || 0);
      const discount = Number(b.discount_amount || 0);
      const totalTax = cgstAmount + sgstAmount + igstAmount;
      const rawGrandTotal = taxableAmount - discount + totalTax + freight + other;
      const roundOff = Math.round(rawGrandTotal) - rawGrandTotal;
      const grandTotal = Math.round(rawGrandTotal);

      const paidAmount = Number(b.paid_amount || 0);
      const balancePayable = grandTotal - paidAmount;
      const paymentStatus = balancePayable <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

      execute(
        `INSERT INTO purchase_bills (
          id, purchase_number, supplier_invoice_number, supplier_id, purchase_date, due_date,
          status, subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
          freight_charges, other_charges, round_off, grand_total, paid_amount, balance_payable,
          payment_status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'FINALIZED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          purchaseNumber,
          b.supplier_invoice_number || '',
          b.supplier_id,
          b.purchase_date || now.slice(0, 10),
          b.due_date || b.purchase_date || now.slice(0, 10),
          subtotal,
          discount,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          igstAmount,
          freight,
          other,
          roundOff,
          grandTotal,
          paidAmount,
          balancePayable,
          paymentStatus,
          b.notes || '',
          now
        ]
      );

      // Update supplier balance
      const newSupplierBal = Number(supplier.current_balance) + balancePayable;
      execute('UPDATE suppliers SET current_balance = ? WHERE id = ?', [newSupplierBal, supplier.id]);

      // If paid > 0, record payment entry
      if (paidAmount > 0) {
        const paymentId = 'pay-' + Date.now();
        const paymentNo = 'PAY-' + purchaseNumber;
        execute(
          `INSERT INTO payments (
            id, payment_number, payment_date, supplier_id, amount,
            payment_mode, account_id, reference_no, purchase_id, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            paymentId,
            paymentNo,
            b.purchase_date || now.slice(0, 10),
            supplier.id,
            paidAmount,
            b.payment_mode || 'BANK_TRANSFER',
            b.account_id || 'acc-cash',
            purchaseNumber,
            purchaseId,
            `Paid on purchase bill ${purchaseNumber}`,
            now
          ]
        );

        const accId = b.account_id || 'acc-cash';
        const acc = queryOne('SELECT * FROM bank_accounts WHERE id = ?', [accId]);
        if (acc) {
          execute('UPDATE bank_accounts SET current_balance = ? WHERE id = ?', [Number(acc.current_balance) - paidAmount, accId]);
        }
      }

      return { purchaseId, purchaseNumber };
    });

    logAudit('CREATE_PURCHASE', 'purchase_bills', result.purchaseId, `Created purchase bill ${result.purchaseNumber}`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Purchase bill creation failed' });
  }
});

// ==========================================
// 12. WASTAGE REGISTER
// ==========================================
apiRouter.get('/wastage', (req: Request, res: Response) => {
  const records = queryAll('SELECT * FROM wastage_records ORDER BY wastage_date DESC, created_at DESC');
  res.json(records);
});

apiRouter.post('/wastage', (req: Request, res: Response) => {
  const { item_type, item_id, batch_number, quantity, reason, notes, wastage_date } = req.body;
  if (!item_id || !quantity || !reason) {
    res.status(400).json({ error: 'Item, quantity, and reason are required' });
    return;
  }

  const now = new Date().toISOString();
  const wastageId = 'wst-' + Date.now();
  const wastageNumber = 'WST-' + Math.floor(1000 + Math.random() * 9000);
  const qty = Number(quantity);

  try {
    transaction(() => {
      let itemName = '';
      let unit = '';
      let unitCost = 0;
      let newStock = 0;

      if (item_type === 'PRODUCT') {
        const prod = queryOne('SELECT * FROM products WHERE id = ?', [item_id]);
        if (!prod) throw new Error('Product not found');
        itemName = prod.name;
        unit = prod.unit;
        unitCost = Number(prod.purchase_cost || 0);
        newStock = Number(prod.current_stock) - qty;
        execute('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item_id]);
      } else {
        const mat = queryOne('SELECT * FROM raw_materials WHERE id = ?', [item_id]);
        if (!mat) throw new Error('Raw material not found');
        itemName = mat.name;
        unit = mat.unit;
        unitCost = Number(mat.purchase_cost || 0);
        newStock = Number(mat.current_stock) - qty;
        execute('UPDATE raw_materials SET current_stock = ? WHERE id = ?', [newStock, item_id]);
      }

      const totalCost = qty * unitCost;

      execute(
        `INSERT INTO wastage_records (
          id, wastage_number, wastage_date, item_type, item_id, item_name,
          batch_number, quantity, unit, unit_cost, total_cost, reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wastageId,
          wastageNumber,
          wastage_date || now.slice(0, 10),
          item_type || 'PRODUCT',
          item_id,
          itemName,
          batch_number || '',
          qty,
          unit,
          unitCost,
          totalCost,
          reason,
          notes || '',
          now
        ]
      );

      // Record stock ledger movement
      execute(
        `INSERT INTO inventory_movements (
          id, movement_date, item_type, item_id, movement_type,
          reference_type, reference_id, reference_number, batch_number,
          quantity, balance_after, unit_cost, total_value, notes, created_at
        ) VALUES (?, ?, ?, ?, 'WASTAGE', 'WASTAGE_REGISTER', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'mov-' + Date.now(),
          wastage_date || now.slice(0, 10),
          item_type || 'PRODUCT',
          item_id,
          wastageId,
          wastageNumber,
          batch_number || '',
          -qty,
          newStock,
          unitCost,
          totalCost,
          `Wastage recorded: ${reason}`,
          now
        ]
      );
    });

    logAudit('RECORD_WASTAGE', 'wastage_records', wastageId, `Recorded wastage: ${qty} units of ${item_id} (${reason})`);
    res.json({ success: true, wastageNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Wastage registration failed' });
  }
});

// ==========================================
// 13. EXPENSES & CATEGORIES
// ==========================================
apiRouter.get('/expense-categories', (req: Request, res: Response) => {
  const categories = queryAll('SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name ASC');
  res.json(categories);
});

apiRouter.post('/expense-categories', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  const id = 'cat-' + Date.now();
  execute(
    'INSERT INTO expense_categories (id, name, description, is_active) VALUES (?, ?, ?, 1)',
    [id, name.trim(), description || '']
  );
  res.json({ id, name: name.trim() });
});

apiRouter.get('/expenses', (req: Request, res: Response) => {
  const expenses = queryAll(
    `SELECT e.*, c.name as category_name 
     FROM expenses e
     JOIN expense_categories c ON e.category_id = c.id
     ORDER BY e.expense_date DESC, e.created_at DESC`
  );
  res.json(expenses);
});

apiRouter.post('/expenses', (req: Request, res: Response) => {
  const {
    category_id,
    expense_date,
    description,
    payee,
    amount,
    tax_amount,
    payment_mode,
    account_id,
    reference_no,
    allocated_to_type,
    allocated_to_id,
    notes
  } = req.body;

  if (!category_id || !amount) {
    res.status(400).json({ error: 'Category and amount are required' });
    return;
  }

  const id = 'exp-' + Date.now();
  const expenseNumber = 'EXP-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const totalAmt = Number(amount) + Number(tax_amount || 0);

  transaction(() => {
    execute(
      `INSERT INTO expenses (
        id, expense_number, expense_date, category_id, description, payee,
        amount, tax_amount, total_amount, payment_mode, account_id, reference_no,
        allocated_to_type, allocated_to_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        expenseNumber,
        expense_date || now.slice(0, 10),
        category_id,
        description || '',
        payee || '',
        Number(amount),
        Number(tax_amount || 0),
        totalAmt,
        payment_mode || 'CASH',
        account_id || 'acc-cash',
        reference_no || '',
        allocated_to_type || 'GENERAL',
        allocated_to_id || null,
        notes || '',
        now
      ]
    );

    // Deduct from bank or cash account
    const accId = account_id || 'acc-cash';
    const acc = queryOne('SELECT * FROM bank_accounts WHERE id = ?', [accId]);
    if (acc) {
      execute('UPDATE bank_accounts SET current_balance = ? WHERE id = ?', [Number(acc.current_balance) - totalAmt, accId]);
    }
  });

  logAudit('CREATE_EXPENSE', 'expenses', id, `Recorded expense ${expenseNumber}: ₹${totalAmt}`);
  res.json({ success: true, expenseNumber });
});

// ==========================================
// 14. RECEIPTS & PAYMENTS (Money Movement)
// ==========================================
apiRouter.get('/receipts', (req: Request, res: Response) => {
  const receipts = queryAll(
    `SELECT r.*, c.name as customer_name 
     FROM receipts r
     JOIN customers c ON r.customer_id = c.id
     ORDER BY r.receipt_date DESC, r.created_at DESC`
  );
  res.json(receipts);
});

apiRouter.post('/receipts', (req: Request, res: Response) => {
  const { customer_id, amount, receipt_date, payment_mode, account_id, reference_no, invoice_id, notes } = req.body;
  if (!customer_id || !amount) {
    res.status(400).json({ error: 'Customer and amount are required' });
    return;
  }

  const id = 'rec-' + Date.now();
  const receiptNo = 'RCP-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const amt = Number(amount);

  transaction(() => {
    execute(
      `INSERT INTO receipts (
        id, receipt_number, receipt_date, customer_id, amount,
        payment_mode, account_id, reference_no, invoice_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        receiptNo,
        receipt_date || now.slice(0, 10),
        customer_id,
        amt,
        payment_mode || 'CASH',
        account_id || 'acc-cash',
        reference_no || '',
        invoice_id || null,
        notes || '',
        now
      ]
    );

    // Reduce customer balance
    const cust = queryOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
    execute('UPDATE customers SET current_balance = ? WHERE id = ?', [Number(cust.current_balance) - amt, customer_id]);

    // If specific invoice referenced, reduce invoice balance due
    if (invoice_id) {
      const inv = queryOne('SELECT * FROM sales_invoices WHERE id = ?', [invoice_id]);
      if (inv) {
        const newPaid = Number(inv.paid_amount) + amt;
        const newBal = Number(inv.grand_total) - newPaid;
        const newStatus = newBal <= 0 ? 'PAID' : 'PARTIALLY_PAID';
        execute('UPDATE sales_invoices SET paid_amount = ?, balance_due = ?, payment_status = ? WHERE id = ?', [newPaid, newBal, newStatus, invoice_id]);
      }
    }

    // Add to bank/cash account
    const accId = account_id || 'acc-cash';
    const acc = queryOne('SELECT * FROM bank_accounts WHERE id = ?', [accId]);
    if (acc) {
      execute('UPDATE bank_accounts SET current_balance = ? WHERE id = ?', [Number(acc.current_balance) + amt, accId]);
    }
  });

  logAudit('CREATE_RECEIPT', 'receipts', id, `Received ₹${amt} from customer ${customer_id}`);
  res.json({ success: true, receiptNumber: receiptNo });
});

apiRouter.get('/payments', (req: Request, res: Response) => {
  const payments = queryAll(
    `SELECT p.*, s.name as supplier_name 
     FROM payments p
     JOIN suppliers s ON p.supplier_id = s.id
     ORDER BY p.payment_date DESC, p.created_at DESC`
  );
  res.json(payments);
});

apiRouter.post('/payments', (req: Request, res: Response) => {
  const { supplier_id, amount, payment_date, payment_mode, account_id, reference_no, purchase_id, notes } = req.body;
  if (!supplier_id || !amount) {
    res.status(400).json({ error: 'Supplier and amount are required' });
    return;
  }

  const id = 'pay-' + Date.now();
  const paymentNo = 'PAY-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const amt = Number(amount);

  transaction(() => {
    execute(
      `INSERT INTO payments (
        id, payment_number, payment_date, supplier_id, amount,
        payment_mode, account_id, reference_no, purchase_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        paymentNo,
        payment_date || now.slice(0, 10),
        supplier_id,
        amt,
        payment_mode || 'BANK_TRANSFER',
        account_id || 'acc-cash',
        reference_no || '',
        purchase_id || null,
        notes || '',
        now
      ]
    );

    // Reduce supplier balance
    const sup = queryOne('SELECT * FROM suppliers WHERE id = ?', [supplier_id]);
    execute('UPDATE suppliers SET current_balance = ? WHERE id = ?', [Number(sup.current_balance) - amt, supplier_id]);

    // If specific purchase bill referenced, reduce bill balance
    if (purchase_id) {
      const bill = queryOne('SELECT * FROM purchase_bills WHERE id = ?', [purchase_id]);
      if (bill) {
        const newPaid = Number(bill.paid_amount) + amt;
        const newBal = Number(bill.grand_total) - newPaid;
        const newStatus = newBal <= 0 ? 'PAID' : 'PARTIALLY_PAID';
        execute('UPDATE purchase_bills SET paid_amount = ?, balance_payable = ?, payment_status = ? WHERE id = ?', [newPaid, newBal, newStatus, purchase_id]);
      }
    }

    // Deduct from bank/cash account
    const accId = account_id || 'acc-cash';
    const acc = queryOne('SELECT * FROM bank_accounts WHERE id = ?', [accId]);
    if (acc) {
      execute('UPDATE bank_accounts SET current_balance = ? WHERE id = ?', [Number(acc.current_balance) - amt, accId]);
    }
  });

  logAudit('CREATE_PAYMENT', 'payments', id, `Paid ₹${amt} to supplier ${supplier_id}`);
  res.json({ success: true, paymentNumber: paymentNo });
});

// ==========================================
// 15. BANK & CASHBOOK ACCOUNTS
// ==========================================
apiRouter.get('/accounts', (req: Request, res: Response) => {
  const accounts = queryAll('SELECT * FROM bank_accounts ORDER BY is_default DESC, account_name ASC');
  res.json(accounts);
});

apiRouter.post('/accounts', (req: Request, res: Response) => {
  const { account_name, account_type, bank_name, account_number, ifsc_code, branch, opening_balance } = req.body;
  if (!account_name) {
    res.status(400).json({ error: 'Account name is required' });
    return;
  }
  const id = 'acc-' + Date.now();
  const opening = Number(opening_balance || 0);
  execute(
    `INSERT INTO bank_accounts (
      id, account_name, account_type, bank_name, account_number, ifsc_code, branch,
      opening_balance, current_balance, is_default, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      account_name.trim(),
      account_type || 'BANK',
      bank_name || '',
      account_number || '',
      ifsc_code || '',
      branch || '',
      opening,
      opening,
      new Date().toISOString()
    ]
  );
  res.json(queryOne('SELECT * FROM bank_accounts WHERE id = ?', [id]));
});

// ==========================================
// 16. SALES & PURCHASE RETURNS
// ==========================================
apiRouter.get('/sales-returns', (req: Request, res: Response) => {
  const returns = queryAll(
    `SELECT sr.*, c.name as customer_name, p.name as product_name 
     FROM sales_returns sr
     JOIN customers c ON sr.customer_id = c.id
     JOIN products p ON sr.product_id = p.id
     ORDER BY sr.return_date DESC, sr.created_at DESC`
  );
  res.json(returns);
});

apiRouter.post('/sales-returns', (req: Request, res: Response) => {
  const {
    invoice_id,
    customer_id,
    product_id,
    batch_number,
    quantity,
    unit,
    rate,
    stock_condition, // 'SALEABLE', 'QUARANTINE', 'DAMAGED', 'WASTAGE'
    reason,
    notes,
    return_date
  } = req.body;

  if (!customer_id || !product_id || !quantity) {
    res.status(400).json({ error: 'Customer, product, and quantity are required' });
    return;
  }

  const returnId = 'sret-' + Date.now();
  const returnNumber = 'SRN-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();
  const qty = Number(quantity);
  const rRate = Number(rate || 0);
  const taxable = qty * rRate;
  const gstAmt = taxable * 0.18; // 18% standard GST rate
  const totalCredit = taxable + gstAmt;

  try {
    transaction(() => {
      execute(
        `INSERT INTO sales_returns (
          id, return_number, return_date, invoice_id, customer_id, product_id,
          batch_number, quantity, unit, rate, taxable_amount, gst_amount,
          total_credit_amount, stock_condition, reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          returnNumber,
          return_date || now.slice(0, 10),
          invoice_id || null,
          customer_id,
          product_id,
          batch_number || '',
          qty,
          unit || 'Bottle',
          rRate,
          taxable,
          gstAmt,
          totalCredit,
          stock_condition || 'SALEABLE',
          reason || 'Customer return',
          notes || '',
          now
        ]
      );

      // Reduce customer outstanding balance by credit amount
      const cust = queryOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
      execute('UPDATE customers SET current_balance = ? WHERE id = ?', [Number(cust.current_balance) - totalCredit, customer_id]);

      // Only RESTOCK if stock condition is SALEABLE
      const prod = queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
      if (stock_condition === 'SALEABLE') {
        const newStock = Number(prod.current_stock) + qty;
        execute('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, product_id]);

        execute(
          `INSERT INTO inventory_movements (
            id, movement_date, item_type, item_id, movement_type,
            reference_type, reference_id, reference_number, batch_number,
            quantity, balance_after, unit_cost, total_value, notes, created_at
          ) VALUES (?, ?, 'PRODUCT', ?, 'SALE_RETURN', 'SALES_RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'mov-' + Date.now(),
            return_date || now.slice(0, 10),
            product_id,
            returnId,
            returnNumber,
            batch_number || '',
            qty,
            newStock,
            rRate,
            taxable,
            `Sale return restocked: ${returnNumber}`,
            now
          ]
        );
      } else {
        // Record as wastage
        execute(
          `INSERT INTO wastage_records (
            id, wastage_number, wastage_date, item_type, item_id, item_name,
            batch_number, quantity, unit, unit_cost, total_cost, reason, notes, created_at
          ) VALUES (?, ?, ?, 'PRODUCT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'wst-' + Date.now(),
            'WST-' + returnNumber,
            return_date || now.slice(0, 10),
            product_id,
            prod.name,
            batch_number || '',
            qty,
            unit || 'Bottle',
            Number(prod.purchase_cost || 0),
            qty * Number(prod.purchase_cost || 0),
            `Sales return unsaleable condition: ${stock_condition} (${reason})`,
            notes || '',
            now
          ]
        );
      }
    });

    logAudit('CREATE_SALES_RETURN', 'sales_returns', returnId, `Created sales return ${returnNumber} for ₹${totalCredit}`);
    res.json({ success: true, returnNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sales return failed' });
  }
});

// ==========================================
// 17. COMPREHENSIVE REPORTS & AUDIT LOGS
// ==========================================
apiRouter.get('/reports/gst-summary', (req: Request, res: Response) => {
  const fromDate = (req.query.from as string) || '2020-01-01';
  const toDate = (req.query.to as string) || '2099-12-31';

  // Outward Supplies (Sales)
  const salesSummary = queryOne(
    `SELECT 
       COALESCE(SUM(taxable_amount), 0) as total_taxable,
       COALESCE(SUM(cgst_amount), 0) as total_cgst,
       COALESCE(SUM(sgst_amount), 0) as total_sgst,
       COALESCE(SUM(igst_amount), 0) as total_igst,
       COALESCE(SUM(total_tax), 0) as total_tax,
       COALESCE(SUM(grand_total), 0) as total_invoice_value,
       COUNT(*) as invoice_count
     FROM sales_invoices 
     WHERE status = 'FINALIZED' AND invoice_date >= ? AND invoice_date <= ?`,
    [fromDate, toDate]
  );

  // Inward Supplies (Purchases)
  const purchaseSummary = queryOne(
    `SELECT 
       COALESCE(SUM(taxable_amount), 0) as total_taxable,
       COALESCE(SUM(cgst_amount), 0) as total_cgst,
       COALESCE(SUM(sgst_amount), 0) as total_sgst,
       COALESCE(SUM(igst_amount), 0) as total_igst,
       COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_tax,
       COALESCE(SUM(grand_total), 0) as total_bill_value,
       COUNT(*) as bill_count
     FROM purchase_bills 
     WHERE status = 'FINALIZED' AND purchase_date >= ? AND purchase_date <= ?`,
    [fromDate, toDate]
  );

  // HSN-wise sales summary
  const hsnSummary = queryAll(
    `SELECT 
       si.hsn_code,
       si.gst_rate,
       COALESCE(SUM(si.quantity), 0) as total_qty,
       si.unit,
       COALESCE(SUM(si.taxable_amount), 0) as taxable_amount,
       COALESCE(SUM(si.cgst_amount), 0) as cgst_amount,
       COALESCE(SUM(si.sgst_amount), 0) as sgst_amount,
       COALESCE(SUM(si.igst_amount), 0) as igst_amount,
       COALESCE(SUM(si.total_amount), 0) as total_amount
     FROM sales_invoice_items si
     JOIN sales_invoices inv ON si.invoice_id = inv.id
     WHERE inv.status = 'FINALIZED' AND inv.invoice_date >= ? AND inv.invoice_date <= ?
     GROUP BY si.hsn_code, si.gst_rate, si.unit`,
    [fromDate, toDate]
  );

  res.json({
    period: { fromDate, toDate },
    outward: salesSummary,
    inward: purchaseSummary,
    hsnSummary
  });
});

apiRouter.get('/reports/stock-ledger', (req: Request, res: Response) => {
  const movements = queryAll(
    `SELECT m.*, 
            CASE WHEN m.item_type = 'PRODUCT' THEN p.name ELSE rm.name END as item_name
     FROM inventory_movements m
     LEFT JOIN products p ON m.item_type = 'PRODUCT' AND m.item_id = p.id
     LEFT JOIN raw_materials rm ON m.item_type = 'RAW_MATERIAL' AND m.item_id = rm.id
     ORDER BY m.movement_date DESC, m.created_at DESC LIMIT 200`
  );
  res.json(movements);
});

apiRouter.get('/reports/profit-loss', (req: Request, res: Response) => {
  const fromDate = (req.query.from as string) || '2020-01-01';
  const toDate = (req.query.to as string) || '2099-12-31';

  // Sales
  const sales = queryOne(
    `SELECT COALESCE(SUM(taxable_amount), 0) as net_sales, COALESCE(SUM(grand_total), 0) as gross_sales 
     FROM sales_invoices WHERE status = 'FINALIZED' AND invoice_date >= ? AND invoice_date <= ?`,
    [fromDate, toDate]
  );

  // COGS
  const cogsData = queryOne(
    `SELECT COALESCE(SUM(si.quantity * p.purchase_cost), 0) as cogs
     FROM sales_invoice_items si
     JOIN sales_invoices inv ON si.invoice_id = inv.id
     JOIN products p ON si.product_id = p.id
     WHERE inv.status = 'FINALIZED' AND inv.invoice_date >= ? AND inv.invoice_date <= ?`,
    [fromDate, toDate]
  );

  // Wastage Cost
  const wastage = queryOne(
    `SELECT COALESCE(SUM(total_cost), 0) as total_wastage 
     FROM wastage_records WHERE wastage_date >= ? AND wastage_date <= ?`,
    [fromDate, toDate]
  );

  // Expenses category-wise
  const expensesByCategory = queryAll(
    `SELECT c.name as category_name, COALESCE(SUM(e.total_amount), 0) as total_amount
     FROM expenses e
     JOIN expense_categories c ON e.category_id = c.id
     WHERE e.expense_date >= ? AND e.expense_date <= ?
     GROUP BY c.id ORDER BY total_amount DESC`,
    [fromDate, toDate]
  );

  const totalExpenses = expensesByCategory.reduce((sum, c) => sum + Number(c.total_amount), 0);
  const netSales = Number(sales?.net_sales || 0);
  const cogs = Number(cogsData?.cogs || 0);
  const grossProfit = netSales - cogs;
  const netProfit = grossProfit - totalExpenses - Number(wastage?.total_wastage || 0);

  res.json({
    period: { fromDate, toDate },
    revenue: {
      grossSales: Number(sales?.gross_sales || 0),
      netSales: netSales
    },
    cogs: cogs,
    grossProfit: grossProfit,
    grossProfitMargin: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : '0.00',
    operatingExpenses: {
      breakdown: expensesByCategory,
      total: totalExpenses
    },
    wastageCost: Number(wastage?.total_wastage || 0),
    estimatedNetProfit: netProfit,
    netProfitMargin: netSales > 0 ? ((netProfit / netSales) * 100).toFixed(2) : '0.00'
  });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = queryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
  res.json(logs);
});

// ==========================================
// 18. DATABASE BACKUP & RESTORE
// ==========================================
apiRouter.get('/backup/export', (req: Request, res: Response) => {
  const snapshot = exportDatabaseJson();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=neoxilindia-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.json({
    app: 'NEOXILINDIA Billing & Business Management',
    version: '1.0',
    exportTimestamp: new Date().toISOString(),
    data: snapshot
  });
});

apiRouter.post('/backup/restore', (req: Request, res: Response) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Valid database backup data object required' });
    return;
  }

  try {
    transaction(() => {
      // Iterate through tables and restore records
      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Don't wipe admin users during restore unless explicitly requested
        execute(`DELETE FROM ${table}`);
        const sample = rows[0];
        const columns = Object.keys(sample);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        for (const row of rows) {
          const values = columns.map(c => row[c]);
          execute(sql, values);
        }
      }
    });

    saveToDisk();
    logAudit('RESTORE_DATABASE', 'system', 'all', 'Database restored from JSON backup snapshot');
    res.json({ success: true, message: 'Database restored successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Database restore failed' });
  }
});
