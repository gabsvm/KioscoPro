
export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
  barcode?: string;
  isVariablePrice?: boolean; 
  isFavorite?: boolean; 
}

export interface Promotion {
  id: string;
  name: string; 
  productId: string;
  triggerQuantity: number; 
  promotionalPrice: number; 
  isActive: boolean;
}

export interface ComboPart {
  name: string;
  eligibleProductIds: string[];
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  parts: ComboPart[];
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'DIGITAL' | 'OTHER' | 'CREDIT'; 
  balance: number;
}

export interface CartItem extends Partial<Product> {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  costPrice?: number;
  category?: string;
  isVariablePrice?: boolean;
  appliedPromotionId?: string;
  isCombo?: boolean;
  selectedProductIds?: string[]; // IDs of products chosen for combo parts
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  isPromo?: boolean;
  isCombo?: boolean;
  comboComponentIds?: string[]; // To track what was deducted
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
  customerId?: string; 
  status?: 'COMPLETED' | 'PENDING_PAYMENT'; 
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  dni?: string;
  address?: string;
  balance: number; 
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
  type: 'INCOME' | 'EXPENSE'; 
  amount: number;
  description: string;
  methodId: string;
  methodName: string;
  userId?: string; 
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
  logoUrl?: string; 
}

export type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'FINANCE' | 'REPORTS' | 'SUPPLIERS' | 'HISTORY' | 'SETTINGS' | 'CUSTOMERS' | 'PROMOTIONS' | 'COMBOS';

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
