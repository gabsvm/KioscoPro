
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
import Customers from './components/Customers';
import Promotions from './components/Promotions'; 
import Combos from './components/Combos';
import Auth from './components/Auth';
import { ViewState, Product, PaymentMethod, Sale, Transfer, CartItem, Supplier, Expense, InvoiceData, StoreProfile, UserRole, PaymentDetail, Customer, CashMovement, Promotion, Combo } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot, collection, writeBatch, updateDoc, increment } from 'firebase/firestore';
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
  
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const saved = window.localStorage.getItem('kiosco_user_role');
      return (saved === 'SELLER' || saved === 'ADMIN') ? saved : 'ADMIN';
    } catch (e) {
      return 'ADMIN';
    }
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]); 
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]); 
  const [combos, setCombos] = useState<Combo[]>([]);
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

  useEffect(() => {
    try {
      window.localStorage.setItem('kiosco_user_role', userRole);
    } catch (e) {
      console.error("Error saving role preference", e);
    }
  }, [userRole]);

  useEffect(() => {
    document.title = storeProfile.name || "KioscoPro Manager";
  }, [storeProfile.name]);

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
        onSnapshot(collection(db, 'users', userId, 'cashMovements'), (snap) => setCashMovements(snap.docs.map(d => d.data() as CashMovement))),
        onSnapshot(collection(db, 'users', userId, 'suppliers'), (snap) => setSuppliers(snap.docs.map(d => d.data() as Supplier))),
        onSnapshot(collection(db, 'users', userId, 'expenses'), (snap) => setExpenses(snap.docs.map(d => d.data() as Expense))),
        onSnapshot(collection(db, 'users', userId, 'customers'), (snap) => setCustomers(snap.docs.map(d => d.data() as Customer))),
        onSnapshot(collection(db, 'users', userId, 'promotions'), (snap) => setPromotions(snap.docs.map(d => d.data() as Promotion))),
        onSnapshot(collection(db, 'users', userId, 'combos'), (snap) => setCombos(snap.docs.map(d => d.data() as Combo))),
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
      setPromotions(load('promotions', [])); 
      setCombos(load('combos', []));
      setLowStockThreshold(load('lowStockThreshold', 5));
      setStoreProfile(load('storeProfile', initialStoreProfile));
    }
  }, [user, isGuestMode, authLoading]);

  // --- Persistence Helper for Guest Mode ---
  const saveLocal = (key: string, data: any) => {
    if (!user) {
      try {
        window.localStorage.setItem(key, JSON.stringify(sanitizeForFirestore(data)));
      } catch (e) {
        console.error("Error saving to local storage", e);
      }
    }
  };

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
    if (userRole !== 'ADMIN' && updatedProduct.costPrice !== products.find(p => p.id === updatedProduct.id)?.costPrice) return; 
    if (user) await setDoc(doc(db, 'users', user.uid, 'products', updatedProduct.id), sanitizeForFirestore(updatedProduct));
    else { const u = products.map(p => p.id === updatedProduct.id ? updatedProduct : p); setProducts(u); saveLocal('products', u); }
  };
  const handleBulkUpdateProducts = async (updatedProducts: Product[]) => {
    if (userRole !== 'ADMIN') return;
    if (user) {
      const batch = writeBatch(db);
      updatedProducts.forEach(p => {
        batch.set(doc(db, 'users', user.uid, 'products', p.id), sanitizeForFirestore(p), { merge: true });
      });
      await batch.commit();
    } else {
      const u = products.map(p => {
        const updated = updatedProducts.find(up => up.id === p.id);
        return updated ? updated : p;
      });
      setProducts(u); saveLocal('products', u);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'products', id));
    else { const u = products.filter(p => p.id !== id); setProducts(u); saveLocal('products', u); }
  };

  // --- PROMOTIONS ---
  const handleAddPromotion = async (newPromo: Omit<Promotion, 'id'>) => {
    if (userRole !== 'ADMIN') return;
    const promo = { ...newPromo, id: uuidv4() };
    if (user) await setDoc(doc(db, 'users', user.uid, 'promotions', promo.id), sanitizeForFirestore(promo));
    else { const u = [...promotions, promo]; setPromotions(u); saveLocal('promotions', u); }
  };

  const handleUpdatePromotion = async (updatedPromo: Promotion) => {
    if (userRole !== 'ADMIN') return;
    if (user) await setDoc(doc(db, 'users', user.uid, 'promotions', updatedPromo.id), sanitizeForFirestore(updatedPromo));
    else { const u = promotions.map(p => p.id === updatedPromo.id ? updatedPromo : p); setPromotions(u); saveLocal('promotions', u); }
  };

  const handleDeletePromotion = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'promotions', id));
    else { const u = promotions.filter(p => p.id !== id); setPromotions(u); saveLocal('promotions', u); }
  };

  const handleTogglePromotion = async (id: string, isActive: boolean) => {
    if (userRole !== 'ADMIN') return;
    if (user) await updateDoc(doc(db, 'users', user.uid, 'promotions', id), { isActive });
    else { const u = promotions.map(p => p.id === id ? { ...p, isActive } : p); setPromotions(u); saveLocal('promotions', u); }
  };

  // --- COMBOS ---
  const handleAddCombo = async (newCombo: Omit<Combo, 'id'>) => {
    if (userRole !== 'ADMIN') return;
    const combo = { ...newCombo, id: uuidv4() };
    if (user) await setDoc(doc(db, 'users', user.uid, 'combos', combo.id), sanitizeForFirestore(combo));
    else { const u = [...combos, combo]; setCombos(u); saveLocal('combos', u); }
  };

  const handleUpdateCombo = async (updatedCombo: Combo) => {
    if (userRole !== 'ADMIN') return;
    if (user) await setDoc(doc(db, 'users', user.uid, 'combos', updatedCombo.id), sanitizeForFirestore(updatedCombo));
    else { const u = combos.map(c => c.id === updatedCombo.id ? updatedCombo : c); setCombos(u); saveLocal('combos', u); }
  };

  const handleDeleteCombo = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'combos', id));
    else { const u = combos.filter(c => c.id !== id); setCombos(u); saveLocal('combos', u); }
  };

  const handleToggleCombo = async (id: string, isActive: boolean) => {
    if (userRole !== 'ADMIN') return;
    if (user) await updateDoc(doc(db, 'users', user.uid, 'combos', id), { isActive });
    else { const u = combos.map(c => c.id === id ? { ...c, isActive } : c); setCombos(u); saveLocal('combos', u); }
  };

  // --- SALES ---
  const handleCompleteSale = async (cartItems: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData, customerId?: string, isCredit?: boolean): Promise<Sale | undefined> => {
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    // Cost calculation is tricky for combos; we'll sum the cost of chosen components
    const totalCost = cartItems.reduce((acc, item) => {
       if (item.isCombo && item.selectedProductIds) {
          const componentsCost = item.selectedProductIds.reduce((sum, cid) => {
             const prod = products.find(p => p.id === cid);
             return sum + (prod ? prod.costPrice : 0);
          }, 0);
          return acc + (componentsCost * item.quantity);
       }
       return acc + ((item.costPrice || 0) * item.quantity);
    }, 0);

    const primaryPayment = payments.length > 0 ? payments.sort((a,b) => b.amount - a.amount)[0] : { methodId: 'CREDIT', methodName: 'Fiado', amount: totalAmount };

    const newSale: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: cartItems.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        unitCost: item.isCombo ? totalCost / item.quantity : (item.costPrice || 0),
        subtotal: item.sellingPrice * item.quantity,
        isPromo: !!item.appliedPromotionId,
        isCombo: !!item.isCombo,
        comboComponentIds: item.selectedProductIds
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
          if (item.isCombo && item.selectedProductIds) {
             // Deduct stock for each part of the combo
             item.selectedProductIds.forEach(cid => {
                const prodInDb = products.find(p => p.id === cid);
                if (prodInDb) {
                   // Using numeric math here as products state might be slightly stale but acceptable for stock
                   // For robust stock, we should use increment(-qty)
                   batch.set(doc(db, 'users', user.uid, 'products', cid), { stock: increment(-item.quantity) }, { merge: true });
                }
             });
          } else {
            const originalId = item.id.includes('-') && item.isVariablePrice ? item.id.split('-')[0] : item.id;
             batch.set(doc(db, 'users', user.uid, 'products', originalId), { stock: increment(-item.quantity) }, { merge: true });
          }
        });

        if (!isCredit) {
           payments.forEach(p => {
             batch.set(doc(db, 'users', user.uid, 'paymentMethods', p.methodId), { balance: increment(p.amount) }, { merge: true });
           });
        } else if (customerId) {
           batch.set(doc(db, 'users', user.uid, 'customers', customerId), { balance: increment(totalAmount), lastPurchaseDate: Date.now() }, { merge: true });
        }

        await batch.commit();
      } catch (e) { console.error("Error sale:", e); return undefined; }
    } else {
      const uSales = [...sales, newSale]; setSales(uSales); saveLocal('sales', uSales);
      
      const uProducts = products.map(p => {
        let deduction = 0;
        cartItems.forEach(item => {
           if (item.isCombo && item.selectedProductIds) {
              if (item.selectedProductIds.includes(p.id)) deduction += item.quantity;
           } else {
              if ((item.id.includes('-') ? item.id.split('-')[0] : item.id) === p.id) deduction += item.quantity;
           }
        });
        return deduction > 0 ? { ...p, stock: p.stock - deduction } : p;
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

  const handleAddCustomer = async (newCustomer: Omit<Customer, 'id' | 'lastPurchaseDate'>) => {
    const customer: Customer = { 
      ...newCustomer, 
      id: uuidv4(), 
      balance: newCustomer.balance || 0, 
      lastPurchaseDate: Date.now() 
    };
    
    if (user) await setDoc(doc(db, 'users', user.uid, 'customers', customer.id), sanitizeForFirestore(customer));
    else { const u = [...customers, customer]; setCustomers(u); saveLocal('customers', u); }
  };

  const handleCustomerPayment = async (customerId: string, amount: number, methodId: string) => {
    const customer = customers.find(c => c.id === customerId);
    const method = paymentMethods.find(m => m.id === methodId);
    if (!customer || !method) return;

    const paymentRecord: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: [], 
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
      // Use increment for atomic updates
      batch.set(doc(db, 'users', user.uid, 'customers', customerId), { balance: increment(-amount) }, { merge: true });
      batch.set(doc(db, 'users', user.uid, 'paymentMethods', methodId), { balance: increment(amount) }, { merge: true });
      await batch.commit();
    } else {
      const uSales = [...sales, paymentRecord]; setSales(uSales); saveLocal('sales', uSales);
      // Functional updates for safe local state
      setCustomers(prev => {
        const u = prev.map(c => c.id === customerId ? { ...c, balance: Math.max(0, c.balance - amount) } : c);
        saveLocal('customers', u);
        return u;
      });
      setPaymentMethods(prev => {
        const u = prev.map(m => m.id === methodId ? { ...m, balance: m.balance + amount } : m);
        saveLocal('paymentMethods', u);
        return u;
      });
    }
  };

  const handleAdjustCustomerDebt = async (customerId: string, amount: number, type: 'INCREASE' | 'DECREASE', note: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || amount <= 0) return;

    // Local calc for state update preview, but Firebase uses increment
    const newBalance = type === 'INCREASE' 
       ? customer.balance + amount 
       : Math.max(0, customer.balance - amount);

    const transactionRecord: Sale = {
      id: uuidv4(),
      timestamp: Date.now(),
      items: [{ 
         productId: 'ADJUSTMENT', 
         productName: note || (type === 'INCREASE' ? 'Ajuste: Deuda Agregada' : 'Ajuste: Descuento/Pago'), 
         quantity: 1, 
         unitPrice: amount, 
         unitCost: 0, 
         subtotal: amount 
      }],
      totalAmount: amount,
      totalProfit: 0,
      paymentMethodId: 'ADJUSTMENT', 
      paymentMethodName: type === 'INCREASE' ? 'Ajuste (Deuda)' : 'Ajuste (Corrección/Pago)',
      customerId: customerId,
      status: type === 'INCREASE' ? 'PENDING_PAYMENT' : 'COMPLETED'
    };

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'sales', transactionRecord.id), sanitizeForFirestore(transactionRecord));
      batch.set(doc(db, 'users', user.uid, 'customers', customerId), { 
          balance: increment(type === 'INCREASE' ? amount : -amount), 
          lastPurchaseDate: Date.now() 
      }, { merge: true });
      await batch.commit();
    } else {
      const uSales = [...sales, transactionRecord]; setSales(uSales); saveLocal('sales', uSales);
      setCustomers(prev => {
        const u = prev.map(c => c.id === customerId ? { ...c, balance: newBalance, lastPurchaseDate: Date.now() } : c);
        saveLocal('customers', u);
        return u;
      });
    }
  };

  const handleCashMovement = async (type: 'INCOME' | 'EXPENSE', amount: number, description: string, methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method) return;
    
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
      const change = type === 'INCOME' ? amount : -amount;
      batch.set(doc(db, 'users', user.uid, 'paymentMethods', methodId), { balance: increment(change) }, { merge: true });
      await batch.commit();
    } else {
      setCashMovements(prev => {
        const u = [...prev, movement];
        saveLocal('cashMovements', u);
        return u;
      });
      setPaymentMethods(prev => {
        const u = prev.map(m => {
          if (m.id === methodId) {
             return { ...m, balance: type === 'INCOME' ? m.balance + amount : m.balance - amount };
          }
          return m;
        });
        saveLocal('paymentMethods', u);
        return u;
      });
    }
  };

  const handleAddMethod = async (name: string, type: PaymentMethod['type'], isHiddenInSellerMode?: boolean) => {
    if (userRole !== 'ADMIN') return;
    const newMethod = { id: uuidv4(), name, type, balance: 0, isHiddenInSellerMode };
    if (user) await setDoc(doc(db, 'users', user.uid, 'paymentMethods', newMethod.id), sanitizeForFirestore(newMethod));
    else { const u = [...paymentMethods, newMethod]; setPaymentMethods(u); saveLocal('paymentMethods', u); }
  };
  const handleUpdateMethod = async (id: string, name: string, type: PaymentMethod['type'], isHiddenInSellerMode?: boolean) => {
    if (userRole !== 'ADMIN') return;
    if (user) await updateDoc(doc(db, 'users', user.uid, 'paymentMethods', id), { name, type, isHiddenInSellerMode });
    else { const u = paymentMethods.map(pm => pm.id === id ? { ...pm, name, type, isHiddenInSellerMode } : pm); setPaymentMethods(u); saveLocal('paymentMethods', u); }
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
      b.set(doc(db, 'users', user.uid, 'paymentMethods', fromId), { balance: increment(-amount) }, { merge: true });
      b.set(doc(db, 'users', user.uid, 'paymentMethods', toId), { balance: increment(amount) }, { merge: true });
      await b.commit();
    } else {
      setPaymentMethods(prev => {
        const um = prev.map(m => {
            if (m.id === fromId) return { ...m, balance: m.balance - amount };
            if (m.id === toId) return { ...m, balance: m.balance + amount };
            return m;
        });
        saveLocal('paymentMethods', um);
        return um;
      });
      setTransfers(prev => {
        const ut = [...prev, t];
        saveLocal('transfers', ut);
        return ut;
      });
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
      // Use increment to prevent race conditions when this function is called rapidly (e.g. Purchase then Pay)
      b.set(doc(db, 'users', user.uid, 'suppliers', supplierId), { 
        balance: increment(type === 'PURCHASE' ? amount : -amount) 
      }, { merge: true });
      
      if (type === 'PAYMENT' && paymentMethodId) {
         // Create CashMovement for ledger visibility
         const methodName = paymentMethods.find(pm => pm.id === paymentMethodId)?.name || 'Caja';
         const movement: CashMovement = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'EXPENSE',
            amount: amount,
            description: `Pago a Proveedor (${sup.name}): ${description}`,
            methodId: paymentMethodId,
            methodName: methodName,
            userId: user.uid
         };
         b.set(doc(db, 'users', user.uid, 'cashMovements', movement.id), sanitizeForFirestore(movement));

         // Also update payment method balance securely
         // FIX: Use Math.abs(amount) to ensure we always SUBTRACT from balance when paying
         b.set(doc(db, 'users', user.uid, 'paymentMethods', paymentMethodId), { 
            balance: increment(-Math.abs(amount)) 
         }, { merge: true });
      }
      await b.commit();
    } else {
      // Functional state updates to prevent race conditions in local state
      setExpenses(prev => {
        const ue = [...prev, e];
        saveLocal('expenses', ue);
        return ue;
      });
      
      setSuppliers(prev => {
        const us = prev.map(s => s.id === supplierId ? { ...s, balance: s.balance + (type === 'PURCHASE' ? amount : -amount) } : s);
        saveLocal('suppliers', us);
        return us;
      });

      if (type === 'PAYMENT' && paymentMethodId) {
        // Handle local CashMovement
        const methodName = paymentMethods.find(pm => pm.id === paymentMethodId)?.name || 'Caja';
        const movement: CashMovement = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'EXPENSE',
            amount: amount,
            description: `Pago a Proveedor (${sup.name}): ${description}`,
            methodId: paymentMethodId,
            methodName: methodName,
            userId: 'guest'
        };
        setCashMovements(prev => {
            const um = [...prev, movement];
            saveLocal('cashMovements', um);
            return um;
        });

        setPaymentMethods(prev => {
            // FIX: Use Math.abs(amount) to ensure we always SUBTRACT from balance when paying
            const um = prev.map(m => m.id === paymentMethodId ? { ...m, balance: m.balance - Math.abs(amount) } : m);
            saveLocal('paymentMethods', um);
            return um;
        });
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

  // Added handleMigrateData to resolve 'Cannot find name' error and allow syncing local data to Firestore
  const handleMigrateData = async () => {
    if (!user) return;
    try {
      const userId = user.uid;
      const batch = writeBatch(db);
      
      products.forEach(p => batch.set(doc(db, 'users', userId, 'products', p.id), sanitizeForFirestore(p)));
      sales.forEach(s => batch.set(doc(db, 'users', userId, 'sales', s.id), sanitizeForFirestore(s)));
      paymentMethods.forEach(pm => batch.set(doc(db, 'users', userId, 'paymentMethods', pm.id), sanitizeForFirestore(pm)));
      transfers.forEach(t => batch.set(doc(db, 'users', userId, 'transfers', t.id), sanitizeForFirestore(t)));
      cashMovements.forEach(m => batch.set(doc(db, 'users', userId, 'cashMovements', m.id), sanitizeForFirestore(m)));
      suppliers.forEach(sup => batch.set(doc(db, 'users', userId, 'suppliers', sup.id), sanitizeForFirestore(sup)));
      expenses.forEach(e => batch.set(doc(db, 'users', userId, 'expenses', e.id), sanitizeForFirestore(e)));
      customers.forEach(c => batch.set(doc(db, 'users', userId, 'customers', c.id), sanitizeForFirestore(c)));
      promotions.forEach(p => batch.set(doc(db, 'users', userId, 'promotions', p.id), sanitizeForFirestore(p)));
      combos.forEach(c => batch.set(doc(db, 'users', userId, 'combos', c.id), sanitizeForFirestore(c)));
      batch.set(doc(db, 'users', userId, 'settings', 'config'), sanitizeForFirestore({ lowStockThreshold, storeProfile }), { merge: true });

      await batch.commit();
      alert("¡Sincronización exitosa! Tus datos ahora están respaldados en la nube.");
    } catch (e) {
      console.error("Migration error:", e);
      alert("Error al sincronizar datos.");
    }
  };

  const handleGenerateAfipInvoice = async (sale: Sale) => {
    if (userRole !== 'ADMIN') {
      alert('Solo los administradores pueden generar facturas fiscales.');
      return;
    }

    try {
      if (!user) {
        alert('Debes iniciar sesión para generar una factura fiscal.');
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sale: sanitizeForFirestore(sale), profile: sanitizeForFirestore(storeProfile) }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Factura para la venta ${sale.id.slice(0, 8)} enviada a AFIP. ID: ${result.invoiceId}`);
        // Here you might want to update the sale status in Firestore
      } else {
        throw new Error(result.message || 'Error desconocido del servidor.');
      }
    } catch (error) {
      console.error('Error al generar factura AFIP:', error);
      alert(`No se pudo generar la factura AFIP: ${(error as Error).message}`);
    }
  };

  const handleLogout = () => signOut(auth).then(() => { 
    setIsGuestMode(false); 
  });

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
      case 'POS': return <POS products={products} paymentMethods={paymentMethods} customers={customers} promotions={promotions} combos={combos} onCompleteSale={handleCompleteSale} storeProfile={storeProfile} userRole={userRole} />;
      case 'CUSTOMERS': return <Customers customers={customers} sales={sales} paymentMethods={paymentMethods} onAddCustomer={handleAddCustomer} onCustomerPayment={handleCustomerPayment} onAdjustDebt={handleAdjustCustomerDebt} />;
      case 'PROMOTIONS': return userRole === 'ADMIN' ? <Promotions promotions={promotions} products={products} onAddPromotion={handleAddPromotion} onUpdatePromotion={handleUpdatePromotion} onDeletePromotion={handleDeletePromotion} onTogglePromotion={handleTogglePromotion} /> : null;
      case 'COMBOS': return userRole === 'ADMIN' ? <Combos combos={combos} products={products} onAddCombo={handleAddCombo} onUpdateCombo={handleUpdateCombo} onDeleteCombo={handleDeleteCombo} onToggleCombo={handleToggleCombo} /> : null;
      case 'HISTORY': return <SalesHistory sales={sales} storeProfile={storeProfile} onGenerateAfipInvoice={handleGenerateAfipInvoice} />;
      case 'INVENTORY': return <Inventory products={products} onAddProduct={handleAddProduct} onBulkAddProducts={handleBulkAddProducts} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} lowStockThreshold={lowStockThreshold} onUpdateThreshold={handleUpdateThreshold} isReadOnly={userRole === 'SELLER'} />;
      case 'SUPPLIERS': return userRole === 'ADMIN' ? <Suppliers suppliers={suppliers} expenses={expenses} paymentMethods={paymentMethods} onAddSupplier={handleAddSupplier} onAddExpense={handleAddExpense} products={products} onBulkUpdateProducts={handleBulkUpdateProducts} /> : null;
      case 'FINANCE': return userRole === 'ADMIN' ? <Finance sales={sales} paymentMethods={paymentMethods} transfers={transfers} cashMovements={cashMovements} onAddMethod={handleAddMethod} onUpdateMethod={handleUpdateMethod} onDeleteMethod={handleDeleteMethod} onTransfer={handleTransfer} onAddCashMovement={handleCashMovement} /> : null;
      case 'REPORTS': return userRole === 'ADMIN' ? <Reports sales={sales} paymentMethods={paymentMethods} /> : null;
      case 'SETTINGS': return userRole === 'ADMIN' ? <Settings storeProfile={storeProfile} onUpdateProfile={handleUpdateProfile} onMigrateData={user ? handleMigrateData : undefined} /> : null;
      default: return <Dashboard sales={sales} products={products} paymentMethods={paymentMethods} lowStockThreshold={lowStockThreshold} userRole={userRole} />;
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
        storeProfile={storeProfile} 
      >
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
