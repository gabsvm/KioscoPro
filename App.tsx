import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Finance from './components/Finance';
import Reports from './components/Reports';
import Suppliers from './components/Suppliers';
import SalesHistory from './components/SalesHistory';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { ViewState, Product, PaymentMethod, Sale, Transfer, CartItem, Supplier, Expense, InvoiceData, StoreProfile, UserRole } from './types';
import { v4 as uuidv4 } from 'uuid';
import { auth } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Lock } from 'lucide-react';

// Helper to persist state (scoped by userID or 'guest')
function useLocalStorage<T>(key: string, initialValue: T, userId: string | undefined, isGuest: boolean): [T, React.Dispatch<React.SetStateAction<T>>] {
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

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(actualKey);
      if (item) {
        setStoredValue(JSON.parse(item));
      } else {
        if (!userId && !isGuest) {
            return;
        }
        setStoredValue(initialValue);
      }
    } catch (e) {
      console.error(e);
    }
  }, [actualKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(actualKey, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [actualKey, storedValue]);

  return [storedValue, setStoredValue];
}

const initialProducts: Product[] = [
  { id: '1', name: 'Coca Cola 500ml', costPrice: 500, sellingPrice: 1000, stock: 50, category: 'Bebidas' },
  { id: '2', name: 'Alfajor Jorgito', costPrice: 300, sellingPrice: 700, stock: 24, category: 'Kiosco' },
  { id: '3', name: 'Galletitas Oreo', costPrice: 800, sellingPrice: 1500, stock: 4, category: 'Kiosco' },
];

const initialPaymentMethods: PaymentMethod[] = [
  { id: 'pm_1', name: 'Caja Chica', type: 'CASH', balance: 0 },
  { id: 'pm_2', name: 'MercadoPago', type: 'DIGITAL', balance: 0 },
];

const initialStoreProfile: StoreProfile = {
  name: "MI KIOSCO",
  owner: "DUEÑO RESPONSABLE",
  address: "CALLE FALSA 123",
  city: "CIUDAD",
  cuit: "20-00000000-0",
  iibb: "000-000000",
  startDate: "01/01/2024",
  ivaCondition: "Consumidor Final"
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const STORAGE_KEYS = ['products', 'sales', 'paymentMethods', 'transfers', 'suppliers', 'expenses', 'lowStockThreshold', 'storeProfile'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        STORAGE_KEYS.forEach(key => {
            const guestData = window.localStorage.getItem(key);
            const userKey = `${currentUser.uid}_${key}`;
            const userData = window.localStorage.getItem(userKey);

            if (guestData && !userData) {
                window.localStorage.setItem(userKey, guestData);
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
  
  const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts, userId, isGuestMode);
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', [], userId, isGuestMode);
  const [paymentMethods, setPaymentMethods] = useLocalStorage<PaymentMethod[]>('paymentMethods', initialPaymentMethods, userId, isGuestMode);
  const [transfers, setTransfers] = useLocalStorage<Transfer[]>('transfers', [], userId, isGuestMode);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', [], userId, isGuestMode);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', [], userId, isGuestMode);
  const [lowStockThreshold, setLowStockThreshold] = useLocalStorage<number>('lowStockThreshold', 5, userId, isGuestMode);
  const [storeProfile, setStoreProfile] = useLocalStorage<StoreProfile>('storeProfile', initialStoreProfile, userId, isGuestMode);

  // --- Actions ---

  const handleAddProduct = (newProduct: Omit<Product, 'id'>) => {
    if (userRole !== 'ADMIN') return;
    const product = { ...newProduct, id: uuidv4() };
    setProducts([...products, product]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    if (userRole !== 'ADMIN') return;
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

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

  const handleAddMethod = (name: string, type: PaymentMethod['type']) => {
    if (userRole !== 'ADMIN') return;
    const newMethod: PaymentMethod = { id: uuidv4(), name, type, balance: 0 };
    setPaymentMethods([...paymentMethods, newMethod]);
  };

  const handleTransfer = (fromId: string, toId: string, amount: number, note: string) => {
    if (userRole !== 'ADMIN') return;
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

  const handleAddSupplier = (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
    if (userRole !== 'ADMIN') return;
    const newSupplier: Supplier = { ...supplierData, id: uuidv4(), balance: 0 };
    setSuppliers([...suppliers, newSupplier]);
  };

  const handleAddExpense = (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => {
    if (userRole !== 'ADMIN') return;
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
        setIsGuestMode(false);
        setUserRole('ADMIN'); // Reset to default
    });
  };

  // --- Role Switching Logic ---
  const toggleRole = () => {
    if (userRole === 'ADMIN') {
      // Admin wants to become Seller: Just switch
      setUserRole('SELLER');
      setView('POS'); // Default view for seller
    } else {
      // Seller wants to become Admin: Ask for PIN
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storeProfile.sellerPin) {
      setUserRole('ADMIN');
      setShowPinModal(false);
      setView('DASHBOARD');
    } else {
      setPinError(true);
    }
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
        return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} userRole={userRole} />;
      case 'POS':
        return <POS products={products} paymentMethods={paymentMethods} onCompleteSale={handleCompleteSale} storeProfile={storeProfile} />;
      case 'HISTORY':
        return <SalesHistory sales={sales} storeProfile={storeProfile} />;
      case 'INVENTORY':
        return (
          <Inventory 
            products={products} 
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct} 
            onDeleteProduct={handleDeleteProduct}
            lowStockThreshold={lowStockThreshold}
            onUpdateThreshold={setLowStockThreshold}
            isReadOnly={userRole === 'SELLER'}
          />
        );
      case 'SUPPLIERS':
        return userRole === 'ADMIN' ? <Suppliers suppliers={suppliers} expenses={expenses} paymentMethods={paymentMethods} onAddSupplier={handleAddSupplier} onAddExpense={handleAddExpense} /> : null;
      case 'FINANCE':
        return userRole === 'ADMIN' ? <Finance paymentMethods={paymentMethods} transfers={transfers} onAddMethod={handleAddMethod} onTransfer={handleTransfer} /> : null;
      case 'REPORTS':
        return userRole === 'ADMIN' ? <Reports sales={sales} paymentMethods={paymentMethods} /> : null;
      case 'SETTINGS':
        return userRole === 'ADMIN' ? <Settings storeProfile={storeProfile} onUpdateProfile={setStoreProfile} /> : null;
      default:
        return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} userRole={userRole} />;
    }
  };

  return (
    <>
      <Layout 
        currentView={view} 
        setView={setView} 
        userEmail={user?.email} 
        isGuest={isGuestMode && !user}
        onLogout={handleLogout}
        userRole={userRole}
        onToggleRole={toggleRole}
      >
        {renderContent()}
      </Layout>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-6 flex justify-center">
                <div className="bg-white/10 p-4 rounded-full">
                  <Lock className="text-white" size={32} />
                </div>
             </div>
             <div className="p-8">
               <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Modo Vendedor Activo</h3>
               <p className="text-center text-slate-500 mb-6 text-sm">Ingresa el PIN maestro para desbloquear el acceso de Administrador.</p>
               
               <form onSubmit={handlePinSubmit}>
                 <div className="flex justify-center mb-6">
                   <input 
                     autoFocus
                     type="password"
                     inputMode="numeric" 
                     maxLength={4}
                     value={pinInput}
                     onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                     className={`w-32 text-center text-3xl tracking-[1em] font-bold py-2 border-b-2 outline-none transition-colors ${pinError ? 'border-red-500 text-red-600' : 'border-slate-300 text-slate-800 focus:border-brand-600'}`}
                     placeholder="••••"
                   />
                 </div>
                 {pinError && <p className="text-center text-red-500 text-sm font-bold mb-4">PIN Incorrecto</p>}
                 
                 <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setShowPinModal(false)}
                     className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200"
                   >
                     Desbloquear
                   </button>
                 </div>
               </form>
             </div>
           </div>
        </div>
      )}
    </>
  );
};

export default App;