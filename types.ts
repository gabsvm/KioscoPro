
export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
  barcode?: string;
  isVariablePrice?: boolean; 
  isFavorite?: boolean; // New v3.0: Quick access in POS
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'DIGITAL' | 'OTHER' | 'CREDIT'; // CREDIT added for "Fiado"
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
  cae?: string;
  caeVto?: string;
}

export interface PaymentDetail {
  methodId: string;
  methodName: string;
  amount: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  totalProfit: number;
  paymentMethodId: string;
  paymentMethodName: string;
  payments?: PaymentDetail[];
  invoice?: InvoiceData;
  customerId?: string; // New v3.0
  status?: 'COMPLETED' | 'PENDING_PAYMENT'; // New v3.0: PENDING_PAYMENT = Fiado
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  dni?: string;
  address?: string;
  balance: number; // Positive means they owe us money
  lastPurchaseDate?: number;
  notes?: string;
}

export interface Transfer {
  id: string;
  timestamp: number;
  fromMethodId: string;
  toMethodId: string;
  amount: number;
  note?: string;
}

export interface CashMovement {
  id: string;
  timestamp: number;
  type: 'INCOME' | 'EXPENSE'; // INGRESO (Inyeccion) o GASTO (Retiro)
  amount: number;
  description: string;
  methodId: string;
  methodName: string;
  userId?: string; // Who made the movement
}

export interface Supplier {
  id: string;
  name: string;
  cuit: string;
  phone?: string;
  email?: string;
  balance: number;
}

export interface Expense {
  id: string;
  supplierId: string;
  date: number;
  amount: number;
  description: string;
  type: 'PURCHASE' | 'PAYMENT';
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
  sellerPin?: string;
}

export type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'FINANCE' | 'REPORTS' | 'SUPPLIERS' | 'HISTORY' | 'SETTINGS' | 'CUSTOMERS';

export type UserRole = 'ADMIN' | 'SELLER';

export interface DateRange {
  start: number;
  end: number;
}

export interface SuspendedSale {
  id: string;
  timestamp: number;
  items: CartItem[];
  note?: string;
}
