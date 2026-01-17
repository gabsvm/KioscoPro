export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
  barcode?: string;
  isVariablePrice?: boolean; // If true, price is set at POS time (e.g. Fiambrería)
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'DIGITAL' | 'OTHER';
  balance: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export interface InvoiceData {
  type: 'A' | 'B' | 'C' | 'X';
  number: string;
  clientName: string;
  clientCuit: string;
  clientAddress: string;
  conditionIva: 'Resp. Inscripto' | 'Monotributista' | 'Consumidor Final' | 'Exento';
  cae?: string; // Simulated
  caeVto?: string; // Simulated
}

export interface PaymentDetail {
  methodId: string;
  methodName: string;
  amount: number;
}

export interface Sale {
  id: string;
  timestamp: number; // Unix timestamp
  items: SaleItem[];
  totalAmount: number;
  totalProfit: number;
  paymentMethodId: string; // Deprecated but kept for backward compatibility (primary method)
  paymentMethodName: string; // Deprecated but kept for backward compatibility
  payments?: PaymentDetail[]; // New: Supports split payments
  invoice?: InvoiceData;
}

export interface Transfer {
  id: string;
  timestamp: number;
  fromMethodId: string;
  toMethodId: string;
  amount: number;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  cuit: string;
  phone?: string;
  email?: string;
  balance: number; // Positive means we owe them money
}

export interface Expense {
  id: string;
  supplierId: string;
  date: number;
  amount: number;
  description: string;
  type: 'PURCHASE' | 'PAYMENT'; // Purchase increases debt, Payment decreases it
}

export interface StoreProfile {
  name: string;
  owner: string;
  address: string;
  city: string;
  cuit: string;
  iibb: string;
  startDate: string;
  ivaCondition: string;
  sellerPin?: string; // PIN to exit seller mode
}

export type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'FINANCE' | 'REPORTS' | 'SUPPLIERS' | 'HISTORY' | 'SETTINGS';

export type UserRole = 'ADMIN' | 'SELLER';

export interface DateRange {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
}