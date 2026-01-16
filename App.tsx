import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Reports from './components/Reports';
import Suppliers from './components/Suppliers';
import SalesHistory from './components/SalesHistory';
import Auth from './components/Auth';
import { ViewState, Product, PaymentMethod, Sale, Transfer, CartItem, Supplier, Expense, InvoiceData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { auth } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';

// Helper to persist state (scoped by userID or 'guest')
function useLocalStorage<T>(key: string, initialValue: T, userId: string | undefined, isGuest: boolean): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Key Logic: If Guest, use bare key. If User, use "uid_key".
  const actualKey = (isGuest || !userId) ? key : `${userId}_${key}`;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(actualKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Re-read storage when key changes (e.g., login happens)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(actualKey);
      if (item) {
        setStoredValue(JSON.parse(item));
      } else {
        // If no data found for this key (e.g. new user), we might want to keep current state 
        // IF we just migrated. However, standard behavior is reset to initial.
        // We will handle migration externally to this hook.
        if (!userId && !isGuest) {
            // Initial load before auth determines state
            return;
        }
        setStoredValue(initialValue);
      }
    } catch (e) {
      console.error(e);
    }
  }, [actualKey]);

  // Persist changes
  useEffect(() => {
    try {
      window.localStorage.setItem(actualKey, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [actualKey, storedValue]);

  return [storedValue, setStoredValue];
}

// Initial Data Seed
const initialProducts: Product[] = [
  { id: '1', name: 'Coca Cola 500ml', costPrice: 500, sellingPrice: 1000, stock: 50, category: 'Bebidas' },
  { id: '2', name: 'Alfajor Jorgito', costPrice: 300, sellingPrice: 700, stock: 24, category: 'Kiosco' },
  { id: '3', name: 'Galletitas Oreo', costPrice: 800, sellingPrice: 1500, stock: 4, category: 'Kiosco' },
];

const initialPaymentMethods: PaymentMethod[] = [
  { id: 'pm_1', name: 'Caja Chica', type: 'CASH', balance: 0 },
  { id: 'pm_2', name: 'MercadoPago', type: 'DIGITAL', balance: 0 },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<ViewState>('DASHBOARD');

  // Keys definition for migration
  const STORAGE_KEYS = ['products', 'sales', 'paymentMethods', 'transfers', 'suppliers', 'expenses', 'lowStockThreshold'];

  // Auth Listener & Migration Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User just logged in. Check if we have Guest Data to migrate.
        // Migration strategy: Check if user data exists. If NOT, and Guest data EXISTS, copy it.
        
        STORAGE_KEYS.forEach(key => {
            const guestData = window.localStorage.getItem(key);
            const userKey = `${currentUser.uid}_${key}`;
            const userData = window.localStorage.getItem(userKey);

            if (guestData && !userData) {
                console.log(`Migrating ${key} from Guest to User ${currentUser.uid}`);
                window.localStorage.setItem(userKey, guestData);
                // Optional: Clear guest data after migration? 
                // window.localStorage.removeItem(key); 
                // Let's keep it for safety, or clear it if we want strict separation.
                // For "Version 2.0" sync experience, let's leave it as a "copy".
            }
        });
        
        setUser(currentUser);
        setIsGuestMode(false);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const userId = user?.uid;
  // If user is logged in, use userId. If guest mode, use no ID (base keys).
  
  const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts, userId, isGuestMode);
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', [], userId, isGuestMode);
  const [paymentMethods, setPaymentMethods] = useLocalStorage<PaymentMethod[]>('paymentMethods', initialPaymentMethods, userId, isGuestMode);
  const [transfers, setTransfers] = useLocalStorage<Transfer[]>('transfers', [], userId, isGuestMode);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', [], userId, isGuestMode);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', [], userId, isGuestMode);
  const [lowStockThreshold, setLowStockThreshold] = useLocalStorage<number>('lowStockThreshold', 5, userId, isGuestMode);

  // --- Actions ---

  // Inventory
  const handleAddProduct = (newProduct: Omit<Product, 'id'>) => {
    const product = { ...newProduct, id: uuidv4() };
    setProducts([...products, product]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // POS
  const handleCompleteSale = (cartItems: CartItem[], methodId: string, invoiceData?: InvoiceData): Sale | undefined => {
    const method = paymentMethods.find(p => p.id === methodId);
    if (!method) return;

    const totalAmount = cartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    const totalCost = cartItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
    
    const saleItems = cartItems.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.sellingPrice,
      unitCost: item.costPrice,
      subtotal: item.sellingPrice * item.quantity
    }));

    const newSale: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: saleItems,
      totalAmount,
      totalProfit: totalAmount - totalCost,
      paymentMethodId: methodId,
      paymentMethodName: method.name,
      invoice: invoiceData
    };

    setSales([...sales, newSale]);

    setProducts(prevProducts => prevProducts.map(p => {
      const soldItem = cartItems.find(i => i.id === p.id);
      if (soldItem) {
        return { ...p, stock: p.stock - soldItem.quantity };
      }
      return p;
    }));

    setPaymentMethods(prevMethods => prevMethods.map(pm => {
      if (pm.id === methodId) {
        return { ...pm, balance: pm.balance + totalAmount };
      }
      return pm;
    }));

    return newSale;
  };

  // Finance
  const handleAddMethod = (name: string, type: PaymentMethod['type']) => {
    const newMethod: PaymentMethod = { id: uuidv4(), name, type, balance: 0 };
    setPaymentMethods([...paymentMethods, newMethod]);
  };

  const handleTransfer = (fromId: string, toId: string, amount: number, note: string) => {
    const fromMethod = paymentMethods.find(m => m.id === fromId);
    const toMethod = paymentMethods.find(m => m.id === toId);

    if (!fromMethod || !toMethod) return;
    if (fromMethod.balance < amount) {
      alert("Fondos insuficientes en la caja de origen.");
      return;
    }

    setPaymentMethods(prev => prev.map(m => {
      if (m.id === fromId) return { ...m, balance: m.balance - amount };
      if (m.id === toId) return { ...m, balance: m.balance + amount };
      return m;
    }));

    const newTransfer: Transfer = {
      id: uuidv4(),
      timestamp: Date.now(),
      fromMethodId: fromId,
      toMethodId: toId,
      amount,
      note
    };
    setTransfers([...transfers, newTransfer]);
  };

  // Suppliers
  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
    const newSupplier: Supplier = { ...supplierData, id: uuidv4(), balance: 0 };
    setSuppliers([...suppliers, newSupplier]);
  };

  const handleAddExpense = (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => {
    const newExpense: Expense = {
      id: uuidv4(),
      supplierId,
      amount,
      date: Date.now(),
      description,
      type
    };
    setExpenses([...expenses, newExpense]);

    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        const delta = type === 'PURCHASE' ? amount : -amount;
        return { ...s, balance: s.balance + delta };
      }
      return s;
    }));

    if (type === 'PAYMENT' && paymentMethodId) {
      setPaymentMethods(prev => prev.map(m => {
        if (m.id === paymentMethodId) {
          return { ...m, balance: m.balance - amount };
        }
        return m;
      }));
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
        setIsGuestMode(false); // Reset guest mode on full logout
    });
  };

  // Loading State
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Auth Guard
  if (!user && !isGuestMode) {
    return <Auth onGuestLogin={() => setIsGuestMode(true)} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} />;
      case 'POS':
        return <POS products={products} paymentMethods={paymentMethods} onCompleteSale={handleCompleteSale} />;
      case 'HISTORY':
        return <SalesHistory sales={sales} />;
      case 'INVENTORY':
        return (
          <Inventory 
            products={products} 
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct} 
            onDeleteProduct={handleDeleteProduct}
            lowStockThreshold={lowStockThreshold}
            onUpdateThreshold={setLowStockThreshold}
          />
        );
      case 'SUPPLIERS':
        return <Suppliers suppliers={suppliers} expenses={expenses} paymentMethods={paymentMethods} onAddSupplier={handleAddSupplier} onAddExpense={handleAddExpense} />;
      case 'FINANCE':
        return <Finance paymentMethods={paymentMethods} transfers={transfers} onAddMethod={handleAddMethod} onTransfer={handleTransfer} />;
      case 'REPORTS':
        return <Reports sales={sales} paymentMethods={paymentMethods} />;
      default:
        return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} />;
    }
  };

  return (
    <Layout 
      currentView={view} 
      setView={setView} 
      userEmail={user?.email} 
      isGuest={isGuestMode && !user}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;