import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'neoxilindia.sqlite');

let db: any = null;

// Convert SQLite results to array of JavaScript objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(sql, params);
  return all.length > 0 ? all[0] : null;
}

let inTransaction = false;

export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  if (!inTransaction) {
    saveToDisk();
  }
}

export function transaction<T>(fn: () => T): T {
  if (!db) throw new Error('Database not initialized');
  inTransaction = true;
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    inTransaction = false;
    saveToDisk();
    return result;
  } catch (err) {
    try {
      db.run('ROLLBACK');
    } catch (_) {}
    inTransaction = false;
    throw err;
  }
}

export function saveToDisk(): void {
  if (!db) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

export function exportDatabaseJson(): Record<string, any[]> {
  const tables = [
    'admin_users',
    'company_settings',
    'bank_accounts',
    'expense_categories',
    'customers',
    'suppliers',
    'products',
    'raw_materials',
    'bills_of_materials',
    'bom_items',
    'production_batches',
    'production_consumption',
    'inventory_batches',
    'inventory_movements',
    'sales_invoices',
    'sales_invoice_items',
    'purchase_bills',
    'purchase_bill_items',
    'receipts',
    'payments',
    'sales_returns',
    'purchase_returns',
    'wastage_records',
    'expenses',
    'audit_logs'
  ];
  const exportData: Record<string, any[]> = {};
  for (const table of tables) {
    try {
      exportData[table] = queryAll(`SELECT * FROM ${table}`);
    } catch {
      exportData[table] = [];
    }
  }
  return exportData;
}

export async function initDatabase(): Promise<any> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database from disk.');
    } catch (err) {
      console.warn('Existing database corrupted or unreadable, creating fresh:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created new database.');
  }

  // Enforce foreign key constraints
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  createTables();

  // Seed default owner admin if none exists
  seedDefaultAdmin();

  // Seed initial company settings if none exists
  seedDefaultCompanySettings();

  // Seed default expense categories if none exists
  seedDefaultExpenseCategories();

  saveToDisk();
  return db;
}

function createTables() {
  db.run(`
    -- Administrator Account (Single owner in Version 1)
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      recovery_pin TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    );

    -- Company Settings & Branding
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      logo_url TEXT,
      tagline TEXT,
      description TEXT,
      registered_address TEXT,
      factory_address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      gstin TEXT,
      pan TEXT,
      financial_year TEXT,
      invoice_prefix TEXT,
      invoice_next_number INTEGER,
      purchase_prefix TEXT,
      purchase_next_number INTEGER,
      default_currency TEXT,
      default_invoice_size TEXT,
      default_terms TEXT,
      bank_name TEXT,
      account_holder TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      branch TEXT,
      upi_id TEXT,
      qr_code_image TEXT,
      updated_at TEXT
    );

    -- Bank & Cash Accounts
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL, -- 'CASH', 'BANK', 'UPI'
      bank_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      branch TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      billing_address TEXT,
      billing_city TEXT,
      billing_state TEXT,
      billing_pincode TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_pincode TEXT,
      gstin TEXT,
      state_code TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      payment_terms TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gstin TEXT,
      state_code TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      payment_terms TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Finished Products Master
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT,
      size TEXT,
      unit TEXT NOT NULL,
      hsn_code TEXT,
      gst_rate REAL DEFAULT 18.0,
      purchase_cost REAL DEFAULT 0,
      retail_rate REAL DEFAULT 0,
      wholesale_rate REAL DEFAULT 0,
      opening_stock REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      reorder_level REAL DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Raw Materials & Packaging Inventory
    CREATE TABLE IF NOT EXISTS raw_materials (
      id TEXT PRIMARY KEY,
      material_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Chemical', 'Fragrance', 'Colour', 'Bottle', 'Cap', 'Label', 'Carton', etc.
      unit TEXT NOT NULL,
      hsn_code TEXT,
      gst_rate REAL DEFAULT 18.0,
      purchase_cost REAL DEFAULT 0,
      opening_stock REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      reorder_level REAL DEFAULT 10,
      supplier_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Bills of Materials (BOM) / Production Recipes
    CREATE TABLE IF NOT EXISTS bills_of_materials (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      recipe_name TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      expected_output_qty REAL NOT NULL,
      output_unit TEXT NOT NULL,
      labour_cost_est REAL DEFAULT 0,
      overhead_cost_est REAL DEFAULT 0,
      expected_yield_pct REAL DEFAULT 98.0,
      expected_wastage_pct REAL DEFAULT 2.0,
      instructions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bom_items (
      id TEXT PRIMARY KEY,
      bom_id TEXT NOT NULL,
      raw_material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      cost_per_unit REAL DEFAULT 0
    );

    -- Production Batches
    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      bom_id TEXT,
      product_id TEXT NOT NULL,
      production_date TEXT NOT NULL,
      mfg_date TEXT NOT NULL,
      expiry_date TEXT,
      planned_quantity REAL NOT NULL,
      accepted_quantity REAL NOT NULL,
      rejected_quantity REAL DEFAULT 0,
      wasted_quantity REAL DEFAULT 0,
      unit TEXT NOT NULL,
      raw_material_cost REAL DEFAULT 0,
      packaging_cost REAL DEFAULT 0,
      labour_cost REAL DEFAULT 0,
      electricity_overhead_cost REAL DEFAULT 0,
      additional_expenses REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      yield_percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'COMPLETED', -- 'COMPLETED', 'REVERSED'
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production_consumption (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      raw_material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      cost_per_unit REAL NOT NULL,
      total_cost REAL NOT NULL
    );

    -- Inventory Batches & Expiry (FEFO)
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'PRODUCT' or 'RAW_MATERIAL'
      item_id TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT,
      quantity_received REAL NOT NULL,
      quantity_remaining REAL NOT NULL,
      cost_per_unit REAL NOT NULL,
      storage_location TEXT,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'QUARANTINE', 'CONSUMED'
      created_at TEXT NOT NULL
    );

    -- Stock Movement Ledger (Audit Trail of Every Physical In/Out)
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      movement_date TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'PRODUCT' or 'RAW_MATERIAL'
      item_id TEXT NOT NULL,
      movement_type TEXT NOT NULL, -- 'OPENING', 'PURCHASE', 'PRODUCTION_IN', 'PRODUCTION_CONSUMED', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'WASTAGE', 'ADJUSTMENT'
      reference_type TEXT,
      reference_id TEXT,
      reference_number TEXT,
      batch_number TEXT,
      quantity REAL NOT NULL, -- positive for in, negative for out
      balance_after REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      total_value REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Sales Invoices (Draft & Finalized)
    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL, -- 'DRAFT', 'FINALIZED', 'CANCELLED'
      sale_type TEXT DEFAULT 'WHOLESALE', -- 'RETAIL', 'WHOLESALE', 'CREDIT', 'CASH'
      place_of_supply TEXT NOT NULL,
      billing_name TEXT NOT NULL,
      billing_address TEXT NOT NULL,
      billing_gstin TEXT,
      shipping_name TEXT,
      shipping_address TEXT,
      transporter_name TEXT,
      vehicle_number TEXT,
      lr_number TEXT,
      payment_terms TEXT,
      subtotal REAL DEFAULT 0,
      item_discounts_total REAL DEFAULT 0,
      invoice_discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_tax REAL DEFAULT 0,
      freight_charges REAL DEFAULT 0,
      other_charges REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_due REAL NOT NULL,
      payment_status TEXT DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID'
      notes TEXT,
      terms_and_conditions TEXT,
      created_at TEXT NOT NULL,
      finalized_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_index INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT NOT NULL,
      batch_number TEXT,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      cgst_rate REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_rate REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_rate REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    -- Purchase Bills
    CREATE TABLE IF NOT EXISTS purchase_bills (
      id TEXT PRIMARY KEY,
      purchase_number TEXT UNIQUE NOT NULL,
      supplier_invoice_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL, -- 'FINALIZED', 'CANCELLED'
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      freight_charges REAL DEFAULT 0,
      other_charges REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_payable REAL NOT NULL,
      payment_status TEXT DEFAULT 'UNPAID',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_bill_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      item_index INTEGER NOT NULL,
      item_type TEXT NOT NULL, -- 'RAW_MATERIAL' or 'PRODUCT'
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    -- Customer Receipts (Money In)
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      receipt_date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL, -- 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'
      account_id TEXT,
      reference_no TEXT,
      invoice_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Supplier Payments (Money Out)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL, -- 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'
      account_id TEXT,
      reference_no TEXT,
      purchase_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Sales Returns & Credit Notes
    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      return_date TEXT NOT NULL,
      invoice_id TEXT,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      batch_number TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      rate REAL NOT NULL,
      taxable_amount REAL NOT NULL,
      gst_amount REAL NOT NULL,
      total_credit_amount REAL NOT NULL,
      stock_condition TEXT NOT NULL, -- 'SALEABLE', 'QUARANTINE', 'DAMAGED', 'WASTAGE'
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Purchase Returns & Debit Notes
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      return_date TEXT NOT NULL,
      purchase_id TEXT,
      supplier_id TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'PRODUCT' or 'RAW_MATERIAL'
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      rate REAL NOT NULL,
      total_debit_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Wastage Register
    CREATE TABLE IF NOT EXISTS wastage_records (
      id TEXT PRIMARY KEY,
      wastage_number TEXT UNIQUE NOT NULL,
      wastage_date TEXT NOT NULL,
      item_type TEXT NOT NULL, -- 'PRODUCT' or 'RAW_MATERIAL'
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      batch_number TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      expense_date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      description TEXT NOT NULL,
      payee TEXT,
      amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      account_id TEXT,
      reference_no TEXT,
      allocated_to_type TEXT, -- 'GENERAL', 'PRODUCTION_BATCH', 'PRODUCT'
      allocated_to_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT
    );
  `);
}

function seedDefaultAdmin() {
  const existing = queryOne('SELECT id FROM admin_users LIMIT 1');
  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('neoxil@admin2026', salt);
    const now = new Date().toISOString();
    execute(
      `INSERT INTO admin_users (id, username, password_hash, full_name, email, recovery_pin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin-1', 'admin', hash, 'Business Owner', '', '98290', now]
    );
    console.log('Seeded default administrator account: admin / neoxil@admin2026');
  }
}

function seedDefaultCompanySettings() {
  const existing = queryOne('SELECT id FROM company_settings WHERE id = ?', ['default']);
  if (!existing) {
    const now = new Date().toISOString();
    execute(
      `INSERT INTO company_settings (
        id, company_name, logo_url, tagline, description,
        registered_address, factory_address, city, state, pincode,
        phone, email, website, gstin, pan, financial_year,
        invoice_prefix, invoice_next_number, purchase_prefix, purchase_next_number,
        default_currency, default_invoice_size, default_terms,
        bank_name, account_holder, account_number, ifsc_code, branch, upi_id, qr_code_image,
        updated_at
      ) VALUES (
        'default', 'NEOXILINDIA', '/logo.svg', 'Leading Cleaning Chemicals & Hygiene Solutions', 'Manufacturers & Wholesalers of Premium Household & Industrial Cleaning Products',
        '', '', '', 'Rajasthan', '',
        '', '', '', '', '', '2026-2027',
        'NXL-', 101, 'PUR-', 1,
        'INR', 'A5_LANDSCAPE', '1. Goods once sold will not be taken back without prior inspection.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to local jurisdiction only.',
        '', '', '', '', '', '', '',
        ?
      )`,
      [now]
    );
  }

  // Ensure default Cash account exists
  const cashAccount = queryOne('SELECT id FROM bank_accounts WHERE account_type = ?', ['CASH']);
  if (!cashAccount) {
    execute(
      `INSERT INTO bank_accounts (id, account_name, account_type, opening_balance, current_balance, is_default, created_at)
       VALUES ('acc-cash', 'Cash in Hand', 'CASH', 0, 0, 1, ?)`,
      [new Date().toISOString()]
    );
  }
}

function seedDefaultExpenseCategories() {
  const count = queryOne('SELECT COUNT(*) as cnt FROM expense_categories');
  if (count && count.cnt === 0) {
    const defaultCategories = [
      'Petrol & Fuel',
      'Transport & Freight',
      'Loading & Unloading',
      'Electricity & Factory Overhead',
      'Rent & Premises',
      'Salaries & Wages',
      'Packaging & Supplies',
      'Repairs & Maintenance',
      'Telephone & Internet',
      'Advertising & Marketing',
      'Printing & Stationery',
      'Bank Charges',
      'Professional & Legal Fees',
      'Taxes & Statutory Fees',
      'Miscellaneous Expenses'
    ];
    for (let i = 0; i < defaultCategories.length; i++) {
      execute(
        `INSERT INTO expense_categories (id, name, description, is_active) VALUES (?, ?, ?, 1)`,
        [`cat-${i + 1}`, defaultCategories[i], `${defaultCategories[i]} for business operations`]
      );
    }
  }
}

export function logAudit(action: string, entityType: string, entityId: string | null, details: string, ip: string = '') {
  try {
    const id = 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    execute(
      `INSERT INTO audit_logs (id, timestamp, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, new Date().toISOString(), action, entityType, entityId, details, ip]
    );
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
