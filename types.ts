
export interface Medicine {
  id: string;
  name: string;
  genericName: string; // Salt
  category: string;
  brandName?: string;
  modelName?: string;
  rackNo?: string;
  minStock?: number;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  expiryDate: string;
  batchNumber: string;
  unit: 'Tablet' | 'Strip' | 'Bottle' | 'Box' | 'Injection' | 'Inhaler' | 'Tube';
}

export interface CartItem extends Medicine {
  quantity: number;
  saleUnit: string;     // The unit being sold (e.g. 'Box')
  salePrice: number;    // The price of the unit being sold
  skuDeduction: number; // Stock deduction factor (e.g. 10 if selling Box when SKU is Strip)
}

  export interface Sale {
    id: string;
    date: string;
    items: CartItem[];
    total: number;
    subTotal?: number;
    discount?: number;
    tax?: number;
    taxRate?: number;
    staffName: string;
    paymentMethod: 'Cash' | 'Credit';
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
  }

export interface StockEntry {
  id: string;
  date: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string; // e.g., 'New Batch', 'Expired', 'Damaged'
  batchNumber?: string;
  supplier?: string;
  purchasePrice?: number;
}

export interface PatientReport {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  details: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  address?: string;
  age?: string;
  gender?: 'Male' | 'Female' | 'Other';
  referredBy?: string;
  visitPurpose?: string;
  history: string[]; // Array of sale IDs
  isActive: boolean; // Added status
  registeredAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  medicinesSupplied: string[];
}

export interface User {
  id?: string;
  username: string;
  password?: string;
  role: 'admin' | 'staff';
  permissions: {
    inventory: boolean;
    stock: boolean;
    suppliers: boolean;
    settings: boolean;
    dashboard?: boolean;
    patients?: boolean;
    labTest?: boolean;
    counter?: boolean;
    reports?: boolean;
  };
}

export interface CompanySettings {
  name: string;
  license: string;
  address: string;
  contact: string;
  doctorName?: string;
  doctorDegree?: string;
  contactPersonName?: string;
  mobileNo?: string;
  whatsappNo?: string;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  backupDaily?: boolean;
  backupDailyTime?: string;
  backupDailyDate?: string;
  backupWeekly?: boolean;
  backupWeeklyTime?: string;
  backupWeeklyDate?: string;
  backupWeeklyDay?: string;
  backupMonthly?: boolean;
  backupMonthlyTime?: string;
  backupMonthlyDate?: string;
  backupTime?: string;
  backupDate?: string;
  backupDataType?: 'full' | 'inventory' | 'reports';
  defaultDiscount?: number;
  saleRate?: number;
  taxRate?: number;
}

export interface LabTestRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  testType: string;
  category?: string;
  resultValue: number | string;
  unit: string;
  normalRange: string;
  notes?: string;
  reportingDate?: string;
}

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  COUNTER = 'COUNTER',
  INVENTORY = 'INVENTORY',
  SUPPLIERS = 'SUPPLIERS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  DOCTOR_PROFILE = 'DOCTOR_PROFILE',
  DEVELOPER_PORTAL = 'DEVELOPER_PORTAL'
}