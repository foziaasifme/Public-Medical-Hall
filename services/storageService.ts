import { INITIAL_MEDICINES } from '../constants';
import { Medicine, Sale, StockEntry, Patient, Supplier, CompanySettings, PatientReport, LabTestRecord, User } from '../types';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy,
  writeBatch,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const MEDICINES_KEY = 'pharma_core_medicines';
const SALES_KEY = 'pharma_core_sales';
const STOCK_KEY = 'pharma_core_stock';
const PATIENTS_KEY = 'pharma_core_patients';
const PATIENT_REPORTS_KEY = 'pharma_core_patient_reports';
const LAB_TESTS_KEY = 'pharma_core_lab_tests';
const SUPPLIERS_KEY = 'pharma_core_suppliers';
const COMPANY_KEY = 'pharma_core_company';
const LAST_BACKUP_KEY = 'pharma_core_last_backup';
const USERS_KEY = 'pharma_core_users';
const CART_KEY = 'pharma_core_cart';

class StorageService {
  // ... existing methods ...
  private notifyDataChange() {
    window.dispatchEvent(new Event('pharma-data-change'));
  }

  // --- Cart ---
  getCart(): any[] {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveCart(cart: any[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
  }

  addToCart(medicine: Medicine) {
    const cart = this.getCart();
    const existingIndex = cart.findIndex(item => item.id === medicine.id && item.saleUnit === medicine.unit);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        ...medicine,
        quantity: 1,
        saleUnit: medicine.unit,
        salePrice: medicine.salePrice,
        skuDeduction: 1
      });
    }
    this.saveCart(cart);
  }

  clearCart() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: [] }));
  }
  // Helper to check if online
  private isOnline(): boolean {
    return navigator.onLine && localStorage.getItem('USE_FIREBASE') === 'true';
  }

  // --- Company Settings ---
  async getCompanySettings(): Promise<CompanySettings> {
    const path = 'settings/company';
    try {
      if (this.isOnline()) {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanySettings;
          localStorage.setItem(COMPANY_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.GET, path);
      }
      console.error("Error fetching company settings from Firebase", e);
    }
    
    const defaultSettings: CompanySettings = { 
      name: 'Public Medical Hall', 
      license: '04-366-005607842M', 
      address: 'Railway Chowk Near Awami Book Center, Multan Road Lodhran', 
      contact: '+923006855515',
      contactPersonName: 'Waqar Ahmad',
      doctorName: 'Waqar Ahmad',
      backupWeekly: true,
      backupWeeklyDay: 'Friday',
      backupWeeklyTime: '09:30',
      backupDataType: 'full',
      taxRate: 0
    };
    
    const stored = localStorage.getItem(COMPANY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure defaults exist for newly added backup properties if missing
      return {
        ...defaultSettings,
        ...parsed,
        backupWeekly: parsed.backupWeekly ?? defaultSettings.backupWeekly,
        backupWeeklyDay: parsed.backupWeeklyDay || defaultSettings.backupWeeklyDay,
        backupWeeklyTime: parsed.backupWeeklyTime || defaultSettings.backupWeeklyTime,
        backupDataType: parsed.backupDataType || defaultSettings.backupDataType,
        taxRate: parsed.taxRate ?? defaultSettings.taxRate
      };
    }
    
    return defaultSettings;
  }

  async saveCompanySettings(settings: CompanySettings) {
    const path = 'settings/company';
    localStorage.setItem(COMPANY_KEY, JSON.stringify(settings));
    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'settings', 'company'), settings);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error saving company settings to Firebase", e);
      }
    }
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    const path = 'users';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
          users.push({ ...doc.data() as User, id: doc.id });
        });
        if (users.length > 0) {
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          return users;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching users from Firebase", e);
    }
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async saveUser(user: User) {
    const path = 'users';
    const users = await this.getUsers();
    
    // Check if updating or adding
    if (user.id) {
       const index = users.findIndex(u => u.id === user.id);
       if (index >= 0) {
         users[index] = user;
       } else {
         users.push(user);
       }
    } else {
       user.id = `usr-${Date.now()}`;
       users.push(user);
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (this.isOnline() && user.id) {
      try {
        await setDoc(doc(db, 'users', user.id), user as any);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, `${path}/${user.id}`);
        }
        console.error("Error saving user to Firebase", e);
      }
    }
  }

  async deleteUser(id: string) {
    const path = `users/${id}`;
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    if (this.isOnline()) {
       try {
         await deleteDoc(doc(db, 'users', id));
       } catch (e) {
         if (e instanceof Error && e.message.includes('permission')) {
             handleFirestoreError(e, OperationType.DELETE, path);
         }
         console.error("Error deleting user", e);
       }
    }
  }

  // --- Medicines ---
  private migrateMedicines(data: any[]): Medicine[] {
    return data.map(med => {
      let purchasePrice = med.purchasePrice;
      if (purchasePrice === undefined && med.price !== undefined) {
        purchasePrice = med.price;
      }
      
      let salePrice = med.salePrice;
      if (salePrice === undefined && purchasePrice !== undefined) {
        salePrice = Math.round(purchasePrice * 1.25 * 100) / 100;
      }

      return {
        ...med,
        purchasePrice: purchasePrice ?? 0,
        salePrice: salePrice ?? 0
      };
    });
  }

  async getMedicines(): Promise<Medicine[]> {
    const path = 'medicines';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'medicines'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        let medicines: Medicine[] = [];
        querySnapshot.forEach((doc) => {
          medicines.push({ ...doc.data() as any, id: doc.id });
        });
        
        if (medicines.length > 0) {
          medicines = this.migrateMedicines(medicines);
          localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
          return medicines;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching medicines from Firebase", e);
    }

    const stored = localStorage.getItem(MEDICINES_KEY);
    if (!stored) {
      const initial: Medicine[] = this.migrateMedicines([...INITIAL_MEDICINES]);
      localStorage.setItem(MEDICINES_KEY, JSON.stringify(initial));
      return initial;
    }
    return this.migrateMedicines(JSON.parse(stored));
  }

  async saveMedicines(medicines: Medicine[]) {
    const path = 'medicines';
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
    if (this.isOnline()) {
      try {
        // Firestore batches have a limit of 500 operations.
        // Split medicines into chunks of 450 to be safe.
        const chunkSize = 450;
        for (let i = 0; i < medicines.length; i += chunkSize) {
          const chunk = medicines.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(med => {
            const ref = doc(db, 'medicines', med.id);
            batch.set(ref, med);
          });
          await batch.commit();
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error syncing medicines to Firebase", e);
      }
    }
    this.notifyDataChange();
  }

  async updateMedicine(medicine: Medicine) {
    const medicines = await this.getMedicines();
    const index = medicines.findIndex(m => m.id === medicine.id);
    if (index >= 0) {
      medicines[index] = medicine;
    } else {
      medicines.push(medicine);
    }
    await this.saveMedicines(medicines);
  }

  // --- Sales ---
  async getSales(): Promise<Sale[]> {
    const path = 'sales';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const sales: Sale[] = [];
        querySnapshot.forEach((doc) => {
          sales.push({ ...doc.data() as Sale, id: doc.id });
        });
        localStorage.setItem(SALES_KEY, JSON.stringify(sales));
        return sales;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching sales from Firebase", e);
    }
    const stored = localStorage.getItem(SALES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async saveSales(sales: Sale[]) {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    await this.syncBatch('sales', sales);
    this.notifyDataChange();
  }

  async saveStockEntries(entries: StockEntry[]) {
    localStorage.setItem(STOCK_KEY, JSON.stringify(entries));
    await this.syncBatch('stockEntries', entries);
    this.notifyDataChange();
  }

  async savePatients(patients: Patient[]) {
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    await this.syncBatch('patients', patients);
    this.notifyDataChange();
  }

  async saveSuppliers(suppliers: Supplier[]) {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
    await this.syncBatch('suppliers', suppliers);
    this.notifyDataChange();
  }

  async addSale(sale: Sale) {
    const sales = await this.getSales();
    sales.push(sale);
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    
    const medicines = await this.getMedicines();
    const stockEntries = await this.getStockEntries();
    const timestamp = new Date().toISOString();

    sale.items.forEach(item => {
      const medIndex = medicines.findIndex(m => m.id === item.id);
      if (medIndex >= 0) {
        const deductionAmount = item.quantity * item.skuDeduction;
        medicines[medIndex].stock = Math.max(0, medicines[medIndex].stock - deductionAmount);

        const entry: StockEntry = {
          id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: timestamp,
          medicineId: item.id,
          medicineName: item.name,
          quantity: deductionAmount,
          type: 'OUT',
          reason: `Sale #${sale.id.substr(-6)}`,
          batchNumber: medicines[medIndex].batchNumber
        };
        stockEntries.push(entry);
      }
    });

    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
    localStorage.setItem(STOCK_KEY, JSON.stringify(stockEntries));

    if (this.isOnline()) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', sale.id), sale);
        sale.items.forEach(item => {
          const med = medicines.find(m => m.id === item.id);
          if (med) batch.set(doc(db, 'medicines', med.id), med);
        });
        const newEntries = stockEntries.filter(e => e.reason.includes(sale.id.substr(-6)));
        newEntries.forEach(entry => batch.set(doc(db, 'stockEntries', entry.id), entry));
        await batch.commit();
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, 'sales/medicines/stockEntries');
        }
        console.error("Error syncing sale to Firebase", e);
      }
    }
  }

  async updateSale(sale: Sale) {
    const path = `sales/${sale.id}`;
    const sales = await this.getSales();
    const index = sales.findIndex(s => s.id === sale.id);
    if (index >= 0) {
      sales[index] = sale;
      localStorage.setItem(SALES_KEY, JSON.stringify(sales));
      if (this.isOnline()) {
        try {
          await updateDoc(doc(db, 'sales', sale.id), sale as any);
        } catch (e) {
          if (e instanceof Error && e.message.includes('permission')) {
             handleFirestoreError(e, OperationType.UPDATE, path);
          }
          console.error("Error updating sale", e);
        }
      }
    }
  }

  async deleteSale(id: string) {
    const path = `sales/${id}`;
    const sales = await this.getSales();
    const filtered = sales.filter(s => s.id !== id);
    localStorage.setItem(SALES_KEY, JSON.stringify(filtered));
    if (this.isOnline()) {
       try {
         await deleteDoc(doc(db, 'sales', id));
       } catch (e) {
         if (e instanceof Error && e.message.includes('permission')) {
             handleFirestoreError(e, OperationType.DELETE, path);
         }
         console.error("Error deleting sale", e);
       }
    }
  }

  // --- Stock Entries ---
  async getStockEntries(): Promise<StockEntry[]> {
    const path = 'stockEntries';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'stockEntries'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const entries: StockEntry[] = [];
        querySnapshot.forEach((doc) => {
          entries.push({ ...doc.data() as StockEntry, id: doc.id });
        });
        localStorage.setItem(STOCK_KEY, JSON.stringify(entries));
        return entries;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching stock entries from Firebase", e);
    }
    const stored = localStorage.getItem(STOCK_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addStockEntry(entry: StockEntry) {
    const entries = await this.getStockEntries();
    entries.push(entry);
    localStorage.setItem(STOCK_KEY, JSON.stringify(entries));

    const medicines = await this.getMedicines();
    const medIndex = medicines.findIndex(m => m.id === entry.medicineId);
    if (medIndex >= 0) {
      if (entry.type === 'IN') {
        medicines[medIndex].stock += entry.quantity;
      } else {
        medicines[medIndex].stock = Math.max(0, medicines[medIndex].stock - entry.quantity);
      }
      if (entry.batchNumber && entry.type === 'IN') {
        medicines[medIndex].batchNumber = entry.batchNumber;
      }
      if (entry.purchasePrice && entry.type === 'IN') {
        medicines[medIndex].purchasePrice = entry.purchasePrice;
      }
      await this.saveMedicines(medicines);
    }

    if (this.isOnline()) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'stockEntries', entry.id), entry);
        if (medIndex >= 0) batch.set(doc(db, 'medicines', medicines[medIndex].id), medicines[medIndex]);
        await batch.commit();
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, 'stockEntries/medicines');
        }
        console.error("Error syncing stock entry to Firebase", e);
      }
    }
  }

  // --- Patients ---
  async getPatients(): Promise<Patient[]> {
    const path = 'patients';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'patients'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const patients: Patient[] = [];
        querySnapshot.forEach((doc) => {
          patients.push({ ...doc.data() as Patient, id: doc.id });
        });
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
        return patients;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching patients from Firebase", e);
    }
    const stored = localStorage.getItem(PATIENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addPatient(patient: Patient) {
    const path = `patients/${patient.id}`;
    const patients = await this.getPatients();
    patients.push(patient);
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'patients', patient.id), patient);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error saving patient to Firebase", e);
      }
    }
  }

  async updatePatient(patient: Patient) {
    const path = `patients/${patient.id}`;
    const patients = await this.getPatients();
    const index = patients.findIndex(p => p.id === patient.id);
    if (index !== -1) {
      patients[index] = patient;
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    }

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'patients', patient.id), patient);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error updating patient in Firebase", e);
      }
    }
  }

  async deletePatient(id: string) {
    const path = `patients/${id}`;
    const patients = await this.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(filtered));

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'patients', id), { ...patients.find(p => p.id === id), isActive: false });
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error deleting patient in Firebase", e);
      }
    }
  }

  // --- Patient Reports ---
  async getPatientReports(): Promise<PatientReport[]> {
    const path = 'patientReports';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'patientReports'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const reports: PatientReport[] = [];
        querySnapshot.forEach((doc) => {
          reports.push({ ...doc.data() as PatientReport, id: doc.id });
        });
        localStorage.setItem(PATIENT_REPORTS_KEY, JSON.stringify(reports));
        return reports;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching patient reports from Firebase", e);
    }
    const stored = localStorage.getItem(PATIENT_REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addPatientReport(report: PatientReport) {
    const path = `patientReports/${report.id}`;
    const reports = await this.getPatientReports();
    reports.push(report);
    localStorage.setItem(PATIENT_REPORTS_KEY, JSON.stringify(reports));

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'patientReports', report.id), report);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error saving patient report to Firebase", e);
      }
    }
  }

  // --- Lab Tests ---
  async getLabTests(): Promise<LabTestRecord[]> {
    const path = 'labTests';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'labTests'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const tests: LabTestRecord[] = [];
        querySnapshot.forEach((doc) => {
          tests.push({ ...doc.data() as LabTestRecord, id: doc.id });
        });
        localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(tests));
        return tests;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching lab tests from Firebase", e);
    }
    const stored = localStorage.getItem(LAB_TESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addLabTest(test: LabTestRecord) {
    const path = `labTests/${test.id}`;
    const tests = await this.getLabTests();
    tests.push(test);
    localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(tests));

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'labTests', test.id), test);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error saving lab test to Firebase", e);
      }
    }
  }

  async updateLabTest(test: LabTestRecord) {
    const path = `labTests/${test.id}`;
    const tests = await this.getLabTests();
    const index = tests.findIndex(t => t.id === test.id);
    if (index !== -1) {
      tests[index] = test;
      localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(tests));
    }

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'labTests', test.id), test);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error updating lab test in Firebase", e);
      }
    }
  }

  async deleteLabTest(id: string) {
    const path = `labTests/${id}`;
    let tests = await this.getLabTests();
    tests = tests.filter(t => t.id !== id);
    localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(tests));

    if (this.isOnline()) {
      try {
        await deleteDoc(doc(db, 'labTests', id));
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.DELETE, path);
        }
        console.error("Error deleting lab test in Firebase", e);
      }
    }
  }

  // --- Suppliers ---
  async getSuppliers(): Promise<Supplier[]> {
    const path = 'suppliers';
    try {
      if (this.isOnline()) {
        const q = query(collection(db, 'suppliers'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const suppliers: Supplier[] = [];
        querySnapshot.forEach((doc) => {
          suppliers.push({ ...doc.data() as Supplier, id: doc.id });
        });
        localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
        return suppliers;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
      console.error("Error fetching suppliers from Firebase", e);
    }
    const stored = localStorage.getItem(SUPPLIERS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async addSupplier(supplier: Supplier) {
    const path = `suppliers/${supplier.id}`;
    const suppliers = await this.getSuppliers();
    suppliers.push(supplier);
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));

    if (this.isOnline()) {
      try {
        await setDoc(doc(db, 'suppliers', supplier.id), supplier);
      } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
          handleFirestoreError(e, OperationType.WRITE, path);
        }
        console.error("Error saving supplier to Firebase", e);
      }
    }
  }

  // --- Data Management (Backup/Restore) ---
  
  async exportDataJSON(): Promise<string> {
    const data = {
      medicines: await this.getMedicines(),
      sales: await this.getSales(),
      stockEntries: await this.getStockEntries(),
      patients: await this.getPatients(),
      patientReports: await this.getPatientReports(),
      labTests: await this.getLabTests(),
      suppliers: await this.getSuppliers(),
      company: await this.getCompanySettings(),
      timestamp: new Date().toISOString(),
      appVersion: '2.1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  async exportInventoryJSON(): Promise<string> {
    const data = {
      medicines: await this.getMedicines(),
      timestamp: new Date().toISOString(),
      appVersion: '2.1.0'
    };
    return JSON.stringify(data, null, 2);
  }

  async exportDataCSV(type: 'medicines' | 'sales'): Promise<string> {
    if (type === 'medicines') {
      const medicines = await this.getMedicines();
      const headers = ['ID', 'Name', 'Generic Name', 'Category', 'Purchase Price', 'Sale Price', 'Stock', 'Expiry Date', 'Batch', 'Unit'];
      const rows = medicines.map(m => [
        m.id, m.name, m.genericName, m.category, m.purchasePrice, m.salePrice, m.stock, m.expiryDate, m.batchNumber, m.unit
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else {
      const sales = await this.getSales();
      const headers = ['ID', 'Date', 'Total', 'Staff', 'Payment', 'Customer', 'Phone'];
      const rows = sales.map(s => [
        s.id, s.date, s.total, s.staffName, s.paymentMethod, s.customerName || '', s.customerPhone || ''
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
  }

  async exportDataSQL(): Promise<string> {
    const medicines = await this.getMedicines();
    const sales = await this.getSales();
    let sql = `-- Pharma-Core SQL Export\n-- Generated: ${new Date().toISOString()}\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS medicines (id TEXT PRIMARY KEY, name TEXT, generic_name TEXT, category TEXT, purchase_price REAL, sale_price REAL, stock INTEGER, expiry_date TEXT, batch_number TEXT, unit TEXT);\n`;
    medicines.forEach(m => {
      sql += `INSERT INTO medicines VALUES ('${m.id}', '${m.name.replace(/'/g, "''")}', '${m.genericName.replace(/'/g, "''")}', '${m.category}', ${m.purchasePrice}, ${m.salePrice}, ${m.stock}, '${m.expiryDate}', '${m.batchNumber}', '${m.unit}');\n`;
    });
    sql += `\nCREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, date TEXT, total REAL, staff_name TEXT, payment_method TEXT, customer_name TEXT, customer_phone TEXT);\n`;
    sales.forEach(s => {
      sql += `INSERT INTO sales VALUES ('${s.id}', '${s.date}', ${s.total}, '${s.staffName}', '${s.paymentMethod}', '${(s.customerName || '').replace(/'/g, "''")}', '${s.customerPhone || ''}');\n`;
    });
    return sql;
  }

  private async syncBatch(collectionName: string, items: any[]) {
    if (!this.isOnline()) return;
    try {
      const chunkSize = 450;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const ref = doc(db, collectionName, item.id);
          batch.set(ref, item);
        });
        await batch.commit();
      }
    } catch (e) {
      console.error(`Error syncing ${collectionName} to Firebase`, e);
    }
  }

  async importData(jsonString: string): Promise<{success: boolean, message: string}> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.timestamp) return { success: false, message: "Invalid backup file format." };

      if (data.medicines) await this.saveMedicines(data.medicines);
      if (data.sales) {
        localStorage.setItem(SALES_KEY, JSON.stringify(data.sales));
        await this.syncBatch('sales', data.sales);
      }
      if (data.stockEntries) {
        localStorage.setItem(STOCK_KEY, JSON.stringify(data.stockEntries));
        await this.syncBatch('stockEntries', data.stockEntries);
      }
      if (data.patients) {
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(data.patients));
        await this.syncBatch('patients', data.patients);
      }
      if (data.patientReports) {
        localStorage.setItem(PATIENT_REPORTS_KEY, JSON.stringify(data.patientReports));
        await this.syncBatch('patientReports', data.patientReports);
      }
      if (data.labTests) {
        localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(data.labTests));
        await this.syncBatch('labTests', data.labTests);
      }
      if (data.suppliers) {
        localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(data.suppliers));
        await this.syncBatch('suppliers', data.suppliers);
      }
      if (data.company) await this.saveCompanySettings(data.company);

      this.notifyDataChange();
      return { success: true, message: "Data restored successfully." };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Error parsing backup file." };
    }
  }

  async checkAutoBackup() {
    const settings = await this.getCompanySettings();
    const { 
      backupDaily, 
      backupWeekly, 
      backupMonthly,
      backupDailyTime = '23:00',
      backupWeeklyTime = '23:00',
      backupMonthlyTime = '23:00',
      backupDailyDate,
      backupWeeklyDay = 'Friday',
      backupMonthlyDate
    } = settings;

    const lastBackupStr = localStorage.getItem(LAST_BACKUP_KEY);
    const now = new Date();

    if (!lastBackupStr) {
      await this.performAutoBackup('Initial');
      return;
    }

    let lastBackupLocalStr;
    try {
        const lastLocal = JSON.parse(lastBackupStr);
        lastBackupLocalStr = lastLocal.date || lastBackupStr;
    } catch {
        lastBackupLocalStr = lastBackupStr;
    }
    const lastDate = new Date(lastBackupLocalStr);
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    let shouldBackup = false;

    if (backupDaily) {
      const [dHours, dMins] = backupDailyTime.split(':').map(Number);
      const isPastTime = now.getHours() > dHours || (now.getHours() === dHours && now.getMinutes() >= dMins);
      const isPastDate = !backupDailyDate || new Date(backupDailyDate) <= now;
      if (isPastDate && (diffDays >= 1 || (now.getDate() !== lastDate.getDate() && isPastTime))) shouldBackup = true;
    }
    if (backupWeekly) {
      const [wHours, wMins] = backupWeeklyTime.split(':').map(Number);
      const isPastTime = now.getHours() > wHours || (now.getHours() === wHours && now.getMinutes() >= wMins);
      
      const dayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      const targetDay = dayMap[backupWeeklyDay];
      const isTargetDay = now.getDay() === targetDay;

      // if today is the day and it's past time, and we haven't backed up today
      if (isTargetDay && isPastTime && (diffDays >= 1 || now.getDate() !== lastDate.getDate())) {
         shouldBackup = true;
      } else if (diffDays >= 7) {
         // fallback if app wasn't opened on the target day for a whole week
         shouldBackup = true;
      }
    }
    if (backupMonthly) {
      const [mHours, mMins] = backupMonthlyTime.split(':').map(Number);
      const isPastTime = now.getHours() > mHours || (now.getHours() === mHours && now.getMinutes() >= mMins);
      const isPastDate = !backupMonthlyDate || new Date(backupMonthlyDate) <= now;
      if (isPastDate && (diffDays >= 30 || (diffDays >= 29 && isPastTime))) shouldBackup = true;
    }

    if (shouldBackup) {
      await this.performAutoBackup('Scheduled');
    }
  }

  private async performAutoBackup(type: string) {
    const settings = await this.getCompanySettings();
    let data = '';
    let dataTypeLabel = 'full';
    
    if (settings.backupDataType === 'inventory') {
       data = await this.exportInventoryJSON();
       dataTypeLabel = 'inventory';
    } else {
       data = await this.exportDataJSON();
    }
    
    // In the future we can handle 'reports' if needed, for now just export full data and inventory JSON natively.
    // If we wanted exact reports, we'd add another switch case.

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharma_backup_${dataTypeLabel}_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify({ date: new Date().toISOString() }));
  }

  resetData() {
    localStorage.clear();
    window.location.reload();
  }
}

export const storageService = new StorageService();
