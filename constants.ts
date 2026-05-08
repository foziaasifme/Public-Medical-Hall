export const MASTER_PIN = "8885072";
export const ADMIN_PASS = "1234";

export const CURRENCY = "Rs. ";

// Helper for formatting amounts like "Rs. 1,200"
export const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return "Rs. 0";
  return "Rs. " + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Threshold for low stock warning
export const LOW_STOCK_THRESHOLD = 10;

// Threshold for expiry warning (days)
export const EXPIRY_WARNING_DAYS = 30;

export const CATEGORIES = ['General', 'Analgesic', 'Antibiotic', 'NSAID', 'Cardio', 'Diabetic', 'Allergy', 'Respiratory', 'Gastro', 'Neuro', 'Lifestyle', 'Psych', 'Thyroid', 'Pain'];
export const UNITS = ['Tablet', 'Strip', 'Bottle', 'Box', 'Injection', 'Inhaler', 'Tube'];

export const INITIAL_MEDICINES = [];
