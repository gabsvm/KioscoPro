
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
import Customers from './components/Customers'; // New v3.0
import Auth from './components/Auth';
import { ViewState, Product, PaymentMethod, Sale, Transfer, CartItem, Supplier, Expense, InvoiceData, StoreProfile, UserRole, PaymentDetail, Customer, CashMovement } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot, collection, writeBatch, updateDoc } from 'firebase/firestore';
import { Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (typeof obj === 'number' && isNaN(obj)) return 0;
  if (Array.isArray(obj)) return obj.map(v => sanitizeForFirestore(v));
  else if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) return obj.getTime();
    return Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      acc[key] = sanitizeForFirestore(value);
      return acc;
    }, {} as any);
  }
  return obj;
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

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]); // New v3.1
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]); // New v3.0
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(initialStoreProfile);

  // --- Auth & Data Loading ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuestMode(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Real-time Sync Logic ---
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const userId = user.uid;
      const unsubs = [
        onSnapshot(collection(db, 'users', userId, 'products'), (snap) => setProducts(snap.docs.map(d => d.data() as Product))),
        onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => setSales(snap.docs.map(d => d.data() as Sale))),
        onSnapshot(collection(db, 'users', userId, 'paymentMethods'), (snap) => {
          const data = snap.docs.map(d => d.data() as PaymentMethod);
          if (data.length > 0) setPaymentMethods(data);
        }),
        onSnapshot(collection(db, 'users', userId, 'transfers'), (snap) => setTransfers(snap.docs.map(d => d.data() as Transfer))),
        onSnapshot(collection(db, 'users', userId, 'cashMovements'), (snap) => setCashMovements(snap.docs.map(d => d.data() as CashMovement))), // Sync Movements
        onSnapshot(collection(db, 'users', userId, 'suppliers'), (snap) => setSuppliers(snap.docs.map(d => d.data() as Supplier))),
        onSnapshot(collection(db, 'users', userId, 'expenses'), (snap) => setExpenses(snap.docs.map(d => d.data() as Expense))),
        onSnapshot(collection(db, 'users', userId, 'customers'), (snap) => setCustomers(snap.docs.map(d => d.data() as Customer))), // New v3.0
        onSnapshot(doc(db, 'users', userId, 'settings', 'config'), (snap) => {
          if (snap.exists()) {
             const data = snap.data();
             setLowStockThreshold(data.lowStockThreshold ?? 5);
             if (data.storeProfile) setStoreProfile(data.storeProfile);
          }
        }),
      ];
      return () => unsubs.forEach(u => u());
    } else {
      const load = <T,>(key: string, def: T): T => {
        try {
          const item = window.localStorage.getItem(key);
          return item ? JSON.parse(item) : def;
        } catch (e) {
          console.error(`Error loading ${key}`, e);
          return def;
        }
      };
      setProducts(load('products', initialProducts));
      setSales(load('sales', []));
      setPaymentMethods(load('paymentMethods', initialPaymentMethods));
      setTransfers(load('transfers', []));
      setCashMovements(load('cashMovements', []));
      setSuppliers(load('suppliers', []));
      setExpenses(load('expenses', []));
      setCustomers(load('customers', []));
      setLowStockThreshold(load('lowStockThreshold', 5));
      setStoreProfile(load('storeProfile', initialStoreProfile));
    }
  }, [user, isGuestMode, authLoading]);

  // --- Persistence Helper for Guest Mode ---
  const saveLocal = (key: string, data: any) => {
    if (!user) {
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error("Error saving to local storage", e);
      }
    }
  };

  const handleMigrateData = async () => {
    if (!user) return;
    if (!confirm("Esto subirá tus datos locales (productos, ventas, clientes) a tu cuenta en la nube. ¿Deseas continuar?")) return;
    try {
      const loadLocal = (key: string) => {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
      };
      const localProducts = loadLocal('products');
      const localSales = loadLocal('sales');
      const localMethods = loadLocal('paymentMethods');
      const localSuppliers = loadLocal('suppliers');
      const localCustomers = loadLocal('customers'); // v3.0
      const localMovements = loadLocal('cashMovements'); // v3.1
      const localProfile = JSON.parse(window.localStorage.getItem('storeProfile') || 'null');

      const batchLimit = 250; 
      let batch = writeBatch(db);
      let count = 0;
      const commitBatch = async () => {
        if (count > 0) { await batch.commit(); batch = writeBatch(db); count = 0; }
      };
      const addToBatch = (ref: any, data: any) => {
        const cleanData = sanitizeForFirestore(data);
        batch.set(ref, cleanData);
        count++;
      };

      localProducts.forEach((p: any) => { addToBatch(doc(db, 'users', user.uid, 'products', p.id), p); });
      if (count >= batchLimit) await commitBatch();
      localSales.forEach((s: any) => { addToBatch(doc(db, 'users', user.uid, 'sales', s.id), s); });
      if (count >= batchLimit) await commitBatch();
      localMethods.forEach((m: any) => { addToBatch(doc(db, 'users', user.uid, 'paymentMethods', m.id), m); });
      if (count >= batchLimit) await commitBatch();
      localSuppliers.forEach((s: any) => { addToBatch(doc(db, 'users', user.uid, 'suppliers', s.id), s); });
      if (count >= batchLimit) await commitBatch();
      localCustomers.forEach((c: any) => { addToBatch(doc(db, 'users', user.uid, 'customers', c.id), c); }); // v3.0
      if (count >= batchLimit) await commitBatch();
      localMovements.forEach((m: any) => { addToBatch(doc(db, 'users', user.uid, 'cashMovements', m.id), m); }); // v3.1
      if (count >= batchLimit) await commitBatch();
      
      if (localProfile) {
        batch.set(doc(db, 'users', user.uid, 'settings', 'config'), sanitizeForFirestore({ storeProfile: localProfile, lowStockThreshold: 5 }), { merge: true });
        count++;
      }
      await commitBatch();
      alert("¡Datos migrados exitosamente!");
    } catch (error) {
      console.error("Migration Error:", error);
      alert("Hubo un error al migrar los datos.");
    }
  };

  // --- Products ---
  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    if (userRole !== 'ADMIN') return;
    const product = { ...newProduct, id: uuidv4() };
    if (user) await setDoc(doc(db, 'users', user.uid, 'products', product.id), sanitizeForFirestore(product));
    else { const u = [...products, product]; setProducts(u); saveLocal('products', u); }
  };
  const handleBulkAddProducts = async (newProducts: Omit<Product, 'id'>[]) => {
    if (userRole !== 'ADMIN') return;
    if (user) {
      const chunkSize = 400;
      for (let i = 0; i < newProducts.length; i += chunkSize) {
        const chunk = newProducts.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(p => batch.set(doc(db, 'users', user.uid, 'products', uuidv4()), sanitizeForFirestore({ ...p, id: uuidv4() })));
        await batch.commit();
      }
    } else {
      const u = [...products, ...newProducts.map(p => ({ ...p, id: uuidv4() }))];
      setProducts(u); saveLocal('products', u);
    }
  };
  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (userRole !== 'ADMIN' && updatedProduct.costPrice !== products.find(p => p.id === updatedProduct.id)?.costPrice) return; // Basic protection
    if (user) await setDoc(doc(db, 'users', user.uid, 'products', updatedProduct.id), sanitizeForFirestore(updatedProduct));
    else { const u = products.map(p => p.id === updatedProduct.id ? updatedProduct : p); setProducts(u); saveLocal('products', u); }
  };
  const handleDeleteProduct = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'products', id));
    else { const u = products.filter(p => p.id !== id); setProducts(u); saveLocal('products', u); }
  };

  // --- SALES v3.0 (with Credit/Fiado) ---
  const handleCompleteSale = async (cartItems: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData, customerId?: string, isCredit?: boolean): Promise<Sale | undefined> => {
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    const totalCost = cartItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
    const primaryPayment = payments.length > 0 ? payments.sort((a,b) => b.amount - a.amount)[0] : { methodId: 'CREDIT', methodName: 'Fiado', amount: totalAmount };

    const newSale: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: cartItems.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        unitCost: item.costPrice,
        subtotal: item.sellingPrice * item.quantity
      })),
      totalAmount,
      totalProfit: totalAmount - totalCost,
      paymentMethodId: primaryPayment.methodId,
      paymentMethodName: payments.length > 1 ? 'Mixto/Multiple' : primaryPayment.methodName,
      payments: payments,
      invoice: invoiceData,
      customerId,
      status: isCredit ? 'PENDING_PAYMENT' : 'COMPLETED'
    };

    if (user) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', user.uid, 'sales', newSale.id), sanitizeForFirestore(newSale));

        cartItems.forEach(item => {
          const originalId = item.id.includes('-') && item.isVariablePrice ? item.id.split('-')[0] : item.id;
          const productInDb = products.find(p => p.id === originalId);
          if (productInDb) {
             const currentStock = Number(productInDb.stock) || 0;
             batch.set(doc(db, 'users', user.uid, 'products', originalId), { stock: currentStock - item.quantity }, { merge: true });
          }
        });

        if (!isCredit) {
           payments.forEach(p => {
             const method = paymentMethods.find(m => m.id === p.methodId);
             if (method) batch.set(doc(db, 'users', user.uid, 'paymentMethods', p.methodId), { balance: (Number(method.balance)||0) + p.amount }, { merge: true });
           });
        } else if (customerId) {
           const customer = customers.find(c => c.id === customerId);
           if (customer) batch.set(doc(db, 'users', user.uid, 'customers', customerId), { balance: (Number(customer.balance)||0) + totalAmount, lastPurchaseDate: Date.now() }, { merge: true });
        }

        await batch.commit();
      } catch (e) { console.error("Error sale:", e); return undefined; }
    } else {
      const uSales = [...sales, newSale]; setSales(uSales); saveLocal('sales', uSales);
      
      const uProducts = products.map(p => {
        const sold = cartItems.find(i => (i.id.includes('-') ? i.id.split('-')[0] : i.id) === p.id);
        return sold ? { ...p, stock: p.stock - sold.quantity } : p;
      });
      setProducts(uProducts); saveLocal('products', uProducts);

      if (!isCredit) {
         const uMethods = paymentMethods.map(pm => {
            const pay = payments.find(p => p.methodId === pm.id);
            return pay ? { ...pm, balance: pm.balance + pay.amount } : pm;
         });
         setPaymentMethods(uMethods); saveLocal('paymentMethods', uMethods);
      } else if (customerId) {
         const uCustomers = customers.map(c => c.id === customerId ? { ...c, balance: c.balance + totalAmount, lastPurchaseDate: Date.now() } : c);
         setCustomers(uCustomers); saveLocal('customers', uCustomers);
      }
    }
    return newSale;
  };

  // --- CUSTOMERS v3.0 ---
  const handleAddCustomer = async (newCustomer: Omit<Customer, 'id' | 'balance' | 'lastPurchaseDate'>) => {
    const customer = { ...newCustomer, id: uuidv4(), balance: 0, lastPurchaseDate: Date.now() };
    if (user) await setDoc(doc(db, 'users', user.uid, 'customers', customer.id), sanitizeForFirestore(customer));
    else { const u = [...customers, customer]; setCustomers(u); saveLocal('customers', u); }
  };

  const handleCustomerPayment = async (customerId: string, amount: number, methodId: string) => {
    // This creates a special "Sale" record to track the payment and update balances
    const customer = customers.find(c => c.id === customerId);
    const method = paymentMethods.find(m => m.id === methodId);
    if (!customer || !method) return;

    const paymentRecord: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: [], // No products
      totalAmount: amount,
      totalProfit: 0,
      paymentMethodId: methodId,
      paymentMethodName: 'Abono de Deuda',
      payments: [{ methodId, methodName: method.name, amount }],
      customerId: customerId,
      status: 'COMPLETED'
    };

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'sales', paymentRecord.id), sanitizeForFirestore(paymentRecord));
      batch.set(doc(db, 'users', user.uid, 'customers', customerId), { balance: Math.max(0, customer.balance - amount) }, { merge: true });
      batch.set(doc(db, 'users', user.uid, 'paymentMethods', methodId), { balance: method.balance + amount }, { merge: true });
      await batch.commit();
    } else {
      const uSales = [...sales, paymentRecord]; setSales(uSales); saveLocal('sales', uSales);
      const uCustomers = customers.map(c => c.id === customerId ? { ...c, balance: Math.max(0, c.balance - amount) } : c); setCustomers(uCustomers); saveLocal('customers', uCustomers);
      const uMethods = paymentMethods.map(m => m.id === methodId ? { ...m, balance: m.balance + amount } : m); setPaymentMethods(uMethods); saveLocal('paymentMethods', uMethods);
    }
  };

  // --- CASH MOVEMENTS v3.1 ---
  const handleCashMovement = async (type: 'INCOME' | 'EXPENSE', amount: number, description: string, methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method) return;
    
    // Check balance for expense
    if (type === 'EXPENSE' && method.balance < amount) {
       alert("No hay suficiente saldo en esta caja para realizar el retiro.");
       return;
    }

    const movement: CashMovement = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      amount,
      description,
      methodId,
      methodName: method.name,
      userId: user?.uid || 'guest'
    };

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'cashMovements', movement.id), sanitizeForFirestore(movement));
      const newBalance = type === 'INCOME' ? method.balance + amount : method.balance - amount;
      batch.set(doc(db, 'users', user.uid, 'paymentMethods', methodId), { balance: newBalance }, { merge: true });
      await batch.commit();
    } else {
      const uMovements = [...cashMovements, movement]; setCashMovements(uMovements); saveLocal('cashMovements', uMovements);
      const uMethods = paymentMethods.map(m => {
        if (m.id === methodId) {
           return { ...m, balance: type === 'INCOME' ? m.balance + amount : m.balance - amount };
        }
        return m;
      });
      setPaymentMethods(uMethods); saveLocal('paymentMethods', uMethods);
    }
  };

  // --- Other Actions ---
  const handleAddMethod = async (name: string, type: PaymentMethod['type']) => {
    if (userRole !== 'ADMIN') return;
    const newMethod = { id: uuidv4(), name, type, balance: 0 };
    if (user) await setDoc(doc(db, 'users', user.uid, 'paymentMethods', newMethod.id), sanitizeForFirestore(newMethod));
    else { const u = [...paymentMethods, newMethod]; setPaymentMethods(u); saveLocal('paymentMethods', u); }
  };
  const handleUpdateMethod = async (id: string, name: string, type: PaymentMethod['type']) => {
    if (userRole !== 'ADMIN') return;
    if (user) await updateDoc(doc(db, 'users', user.uid, 'paymentMethods', id), { name, type });
    else { const u = paymentMethods.map(pm => pm.id === id ? { ...pm, name, type } : pm); setPaymentMethods(u); saveLocal('paymentMethods', u); }
  };
  const handleDeleteMethod = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'paymentMethods', id));
    else { const u = paymentMethods.filter(pm => pm.id !== id); setPaymentMethods(u); saveLocal('paymentMethods', u); }
  };
  const handleTransfer = async (fromId: string, toId: string, amount: number, note: string) => {
    if (userRole !== 'ADMIN') return;
    const from = paymentMethods.find(m => m.id === fromId);
    const to = paymentMethods.find(m => m.id === toId);
    if (!from || !to || from.balance < amount) return;
    const t = { id: uuidv4(), timestamp: Date.now(), fromMethodId: fromId, toMethodId: toId, amount, note };
    if (user) {
      const b = writeBatch(db);
      b.set(doc(db, 'users', user.uid, 'transfers', t.id), sanitizeForFirestore(t));
      b.set(doc(db, 'users', user.uid, 'paymentMethods', fromId), { balance: from.balance - amount }, { merge: true });
      b.set(doc(db, 'users', user.uid, 'paymentMethods', toId), { balance: to.balance + amount }, { merge: true });
      await b.commit();
    } else {
      const um = paymentMethods.map(m => {
        if (m.id === fromId) return { ...m, balance: m.balance - amount };
        if (m.id === toId) return { ...m, balance: m.balance + amount };
        return m;
      });
      setPaymentMethods(um); saveLocal('paymentMethods', um);
      const ut = [...transfers, t]; setTransfers(ut); saveLocal('transfers', ut);
    }
  };
  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
    if (userRole !== 'ADMIN') return;
    const s = { ...supplierData, id: uuidv4(), balance: 0 };
    if (user) await setDoc(doc(db, 'users', user.uid, 'suppliers', s.id), sanitizeForFirestore(s));
    else { const u = [...suppliers, s]; setSuppliers(u); saveLocal('suppliers', u); }
  };
  const handleAddExpense = async (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => {
    if (userRole !== 'ADMIN') return;
    const e = { id: uuidv4(), supplierId, amount, date: Date.now(), description, type };
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;
    if (user) {
      const b = writeBatch(db);
      b.set(doc(db, 'users', user.uid, 'expenses', e.id), sanitizeForFirestore(e));
      b.set(doc(db, 'users', user.uid, 'suppliers', supplierId), { balance: sup.balance + (type === 'PURCHASE' ? amount : -amount) }, { merge: true });
      if (type === 'PAYMENT' && paymentMethodId) {
         const m = paymentMethods.find(m => m.id === paymentMethodId);
         if (m) b.set(doc(db, 'users', user.uid, 'paymentMethods', paymentMethodId), { balance: m.balance - amount }, { merge: true });
      }
      await b.commit();
    } else {
      const ue = [...expenses, e]; setExpenses(ue); saveLocal('expenses', ue);
      const us = suppliers.map(s => s.id === supplierId ? { ...s, balance: s.balance + (type === 'PURCHASE' ? amount : -amount) } : s); setSuppliers(us); saveLocal('suppliers', us);
      if (type === 'PAYMENT' && paymentMethodId) {
        const um = paymentMethods.map(m => m.id === paymentMethodId ? { ...m, balance: m.balance - amount } : m); setPaymentMethods(um); saveLocal('paymentMethods', um);
      }
    }
  };
  const handleUpdateProfile = async (profile: StoreProfile) => {
     if (user) await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), sanitizeForFirestore({ lowStockThreshold, storeProfile: profile }), { merge: true });
     else { setStoreProfile(profile); saveLocal('storeProfile', profile); }
  };
  const handleUpdateThreshold = async (val: number) => {
     if (user) await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), sanitizeForFirestore({ lowStockThreshold: val, storeProfile }), { merge: true });
     else { setLowStockThreshold(val); saveLocal('lowStockThreshold', val); }
  };
  const handleLogout = () => signOut(auth).then(() => { setIsGuestMode(false); setUserRole('ADMIN'); });

  const toggleRole = () => {
    if (userRole === 'ADMIN') {
      if (!storeProfile.sellerPin || storeProfile.sellerPin.trim().length < 4) { alert("Configura un PIN de 4 dígitos antes."); setView('SETTINGS'); return; }
      setUserRole('SELLER'); setView('POS'); 
    } else { setShowPinModal(true); setPinInput(''); setPinError(false); }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storeProfile.sellerPin || (!storeProfile.sellerPin && pinInput === '0000')) {
      setUserRole('ADMIN'); setShowPinModal(false); setView('DASHBOARD');
    } else setPinError(true);
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;
  if (!user && !isGuestMode) return <Auth onGuestLogin={() => setIsGuestMode(true)} />;

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD': return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} userRole={userRole} />;
      case 'POS': return <POS products={products} paymentMethods={paymentMethods} customers={customers} onCompleteSale={handleCompleteSale} storeProfile={storeProfile} />;
      case 'CUSTOMERS': return <Customers customers={customers} sales={sales} paymentMethods={paymentMethods} onAddCustomer={handleAddCustomer} onCustomerPayment={handleCustomerPayment} />;
      case 'HISTORY': return <SalesHistory sales={sales} storeProfile={storeProfile} />;
      case 'INVENTORY': return <Inventory products={products} onAddProduct={handleAddProduct} onBulkAddProducts={handleBulkAddProducts} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} lowStockThreshold={lowStockThreshold} onUpdateThreshold={handleUpdateThreshold} isReadOnly={userRole === 'SELLER'} />;
      case 'SUPPLIERS': return userRole === 'ADMIN' ? <Suppliers suppliers={suppliers} expenses={expenses} paymentMethods={paymentMethods} onAddSupplier={handleAddSupplier} onAddExpense={handleAddExpense} /> : null;
      case 'FINANCE': return userRole === 'ADMIN' ? <Finance paymentMethods={paymentMethods} transfers={transfers} cashMovements={cashMovements} onAddMethod={handleAddMethod} onUpdateMethod={handleUpdateMethod} onDeleteMethod={handleDeleteMethod} onTransfer={handleTransfer} onAddCashMovement={handleCashMovement} /> : null;
      case 'REPORTS': return userRole === 'ADMIN' ? <Reports sales={sales} paymentMethods={paymentMethods} /> : null;
      case 'SETTINGS': return userRole === 'ADMIN' ? <Settings storeProfile={storeProfile} onUpdateProfile={handleUpdateProfile} onMigrateData={user ? handleMigrateData : undefined} /> : null;
      default: return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} userRole={userRole} />;
    }
  };

  return (
    <>
      <Layout currentView={view} setView={setView} userEmail={user?.email} isGuest={isGuestMode && !user} onLogout={handleLogout} userRole={userRole} onToggleRole={toggleRole}>
        {renderContent()}
      </Layout>
      {showPinModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
             <div className="mb-6"><Lock className="mx-auto text-slate-800" size={32} /></div>
             <h3 className="text-xl font-bold text-slate-800 mb-6">Modo Vendedor Activo</h3>
             <form onSubmit={handlePinSubmit}>
               <input autoFocus type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={(e) => { setPinInput(e.target.value); setPinError(false); }} className={`w-32 text-center text-3xl tracking-[1em] font-bold py-2 border-b-2 outline-none mb-6 ${pinError ? 'border-red-500 text-red-600' : 'border-slate-300'}`} placeholder="••••" />
               <div className="flex gap-3"><button type="button" onClick={() => setShowPinModal(false)} className="flex-1 py-3 text-slate-500 font-bold rounded-xl bg-slate-100">Cancelar</button><button type="submit" className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg">Desbloquear</button></div>
             </form>
           </div>
        </div>
      )}
    </>
  );
};

export default App;
