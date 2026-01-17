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
import { ViewState, Product, PaymentMethod, Sale, Transfer, CartItem, Supplier, Expense, InvoiceData, StoreProfile, UserRole, PaymentDetail } from './types';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot, collection, writeBatch, updateDoc } from 'firebase/firestore';
import { Lock } from 'lucide-react';

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

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
      // --- MODE: CLOUD (Firestore) ---
      // Subscribe to all collections in real-time
      const userId = user.uid;
      
      const unsubs = [
        onSnapshot(collection(db, 'users', userId, 'products'), (snap) => {
          const data = snap.docs.map(d => d.data() as Product);
          setProducts(data);
        }, (error) => console.error("Error syncing products:", error)),
        
        onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => {
          setSales(snap.docs.map(d => d.data() as Sale));
        }, (error) => console.error("Error syncing sales:", error)),

        onSnapshot(collection(db, 'users', userId, 'paymentMethods'), (snap) => {
          const data = snap.docs.map(d => d.data() as PaymentMethod);
          if (data.length > 0) setPaymentMethods(data);
          else {
             // Init default methods in DB if empty - Check only once
             if (!snap.metadata.hasPendingWrites) {
                // We avoid auto-writing here to prevent loops, user can use "Migrate" or create manually
             }
          }
        }),
        onSnapshot(collection(db, 'users', userId, 'transfers'), (snap) => setTransfers(snap.docs.map(d => d.data() as Transfer))),
        onSnapshot(collection(db, 'users', userId, 'suppliers'), (snap) => setSuppliers(snap.docs.map(d => d.data() as Supplier))),
        onSnapshot(collection(db, 'users', userId, 'expenses'), (snap) => setExpenses(snap.docs.map(d => d.data() as Expense))),
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
      // --- MODE: LOCAL STORAGE (Guest) ---
      const load = <T,>(key: string, def: T): T => {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : def;
      };

      setProducts(load('products', initialProducts));
      setSales(load('sales', []));
      setPaymentMethods(load('paymentMethods', initialPaymentMethods));
      setTransfers(load('transfers', []));
      setSuppliers(load('suppliers', []));
      setExpenses(load('expenses', []));
      setLowStockThreshold(load('lowStockThreshold', 5));
      setStoreProfile(load('storeProfile', initialStoreProfile));
    }
  }, [user, isGuestMode, authLoading]);

  // --- Persistence Helper for Guest Mode ---
  const saveLocal = (key: string, data: any) => {
    if (!user) {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // --- Data Migration (Local -> Cloud) ---
  const handleMigrateData = async () => {
    if (!user) return;
    if (!confirm("Esto subirá tus datos locales (productos, ventas, configuración) a tu cuenta en la nube. ¿Deseas continuar?")) return;

    try {
      const loadLocal = (key: string) => {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
      };

      const localProducts = loadLocal('products');
      const localSales = loadLocal('sales');
      const localMethods = loadLocal('paymentMethods');
      const localSuppliers = loadLocal('suppliers');
      const localProfile = JSON.parse(window.localStorage.getItem('storeProfile') || 'null');

      const batchLimit = 450;
      let batch = writeBatch(db);
      let count = 0;
      const commitBatch = async () => {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      };

      // Products
      for (const p of localProducts) {
        batch.set(doc(db, 'users', user.uid, 'products', p.id), p);
        count++;
        if (count >= batchLimit) await commitBatch();
      }

      // Sales
      for (const s of localSales) {
        batch.set(doc(db, 'users', user.uid, 'sales', s.id), s);
        count++;
        if (count >= batchLimit) await commitBatch();
      }

      // Methods
      for (const m of localMethods) {
        batch.set(doc(db, 'users', user.uid, 'paymentMethods', m.id), m);
        count++;
        if (count >= batchLimit) await commitBatch();
      }

      // Suppliers
      for (const s of localSuppliers) {
        batch.set(doc(db, 'users', user.uid, 'suppliers', s.id), s);
        count++;
        if (count >= batchLimit) await commitBatch();
      }

      // Profile
      if (localProfile) {
        batch.set(doc(db, 'users', user.uid, 'settings', 'config'), { 
           storeProfile: localProfile,
           lowStockThreshold: 5 
        }, { merge: true });
        count++;
      }

      if (count > 0) await commitBatch();

      alert("¡Datos migrados exitosamente! Ahora están seguros en la nube.");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al migrar los datos. Revisa la consola.");
    }
  };

  // --- Actions (Hybrid: Cloud or Local) ---

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    if (userRole !== 'ADMIN') return;
    const product = { ...newProduct, id: uuidv4() };
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'products', product.id), product);
      } catch (e) {
        console.error("Error adding product", e);
        alert("Error al guardar en la nube.");
      }
    } else {
      const updated = [...products, product];
      setProducts(updated);
      saveLocal('products', updated);
    }
  };

  const handleBulkAddProducts = async (newProducts: Omit<Product, 'id'>[]) => {
    if (userRole !== 'ADMIN') return;
    
    if (user) {
      try {
        // Chunk the array into batches of 450 (Firestore limit is 500)
        const chunkSize = 450;
        for (let i = 0; i < newProducts.length; i += chunkSize) {
          const chunk = newProducts.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          
          chunk.forEach(p => {
             const id = uuidv4();
             // Sanitize undefined values
             const safeProduct = {
               ...p,
               id,
               barcode: p.barcode || null, // Convert undefined to null for Firestore
               isVariablePrice: !!p.isVariablePrice
             };
             const ref = doc(db, 'users', user.uid, 'products', id);
             batch.set(ref, safeProduct);
          });
          
          await batch.commit();
        }
      } catch (e) {
        console.error("Bulk add error:", e);
        alert("Error en la importación masiva. Revisa tu conexión.");
      }
    } else {
      const productsWithIds = newProducts.map(p => ({ ...p, id: uuidv4() }));
      const updated = [...products, ...productsWithIds];
      setProducts(updated);
      saveLocal('products', updated);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (userRole !== 'ADMIN') return;

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'products', updatedProduct.id), updatedProduct);
    } else {
      const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      setProducts(updated);
      saveLocal('products', updated);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'products', id));
      } else {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        saveLocal('products', updated);
      }
    }
  };

  const handleCompleteSale = async (cartItems: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData): Promise<Sale | undefined> => {
    // Calc totals
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    if (totalPaid < totalAmount - 0.01) {
      alert("El pago total es menor al monto de la venta.");
      return;
    }

    const totalCost = cartItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
    const primaryPayment = payments.sort((a,b) => b.amount - a.amount)[0];

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
      invoice: invoiceData
    };

    if (user) {
      try {
        // --- Firestore Transaction/Batch ---
        const batch = writeBatch(db);
        
        // 1. Create Sale
        const saleRef = doc(db, 'users', user.uid, 'sales', newSale.id);
        batch.set(saleRef, newSale);

        // 2. Update Stock
        cartItems.forEach(item => {
          const originalId = item.id.includes('-') && item.isVariablePrice ? item.id.split('-')[0] : item.id;
          const productInDb = products.find(p => p.id === originalId);
          if (productInDb) {
             const productRef = doc(db, 'users', user.uid, 'products', originalId);
             batch.update(productRef, { stock: productInDb.stock - item.quantity });
          }
        });

        // 3. Update Money (Balances)
        payments.forEach(p => {
           const method = paymentMethods.find(m => m.id === p.methodId);
           if (method) {
              const methodRef = doc(db, 'users', user.uid, 'paymentMethods', p.methodId);
              batch.update(methodRef, { balance: method.balance + p.amount });
           }
        });

        await batch.commit();
      } catch (e) {
        console.error("Error completing sale:", e);
        alert("Error al procesar la venta. Verifique conexión.");
        return undefined;
      }

    } else {
      // --- Local Storage ---
      const updatedSales = [...sales, newSale];
      setSales(updatedSales);
      saveLocal('sales', updatedSales);

      const updatedProducts = products.map(p => {
        const soldItem = cartItems.find(i => {
           const originalId = i.id.includes('-') && i.isVariablePrice ? i.id.split('-')[0] : i.id;
           return originalId === p.id;
        });
        if (soldItem) return { ...p, stock: p.stock - soldItem.quantity };
        return p;
      });
      setProducts(updatedProducts);
      saveLocal('products', updatedProducts);

      const updatedMethods = paymentMethods.map(pm => {
        const payment = payments.find(p => p.methodId === pm.id);
        if (payment) return { ...pm, balance: pm.balance + payment.amount };
        return pm;
      });
      setPaymentMethods(updatedMethods);
      saveLocal('paymentMethods', updatedMethods);
    }

    return newSale;
  };

  const handleAddMethod = async (name: string, type: PaymentMethod['type']) => {
    if (userRole !== 'ADMIN') return;
    const newMethod: PaymentMethod = { id: uuidv4(), name, type, balance: 0 };
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'paymentMethods', newMethod.id), newMethod);
    } else {
      const updated = [...paymentMethods, newMethod];
      setPaymentMethods(updated);
      saveLocal('paymentMethods', updated);
    }
  };

  const handleUpdateMethod = async (id: string, name: string, type: PaymentMethod['type']) => {
    if (userRole !== 'ADMIN') return;
    
    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'paymentMethods', id), { name, type });
    } else {
      const updated = paymentMethods.map(pm => pm.id === id ? { ...pm, name, type } : pm);
      setPaymentMethods(updated);
      saveLocal('paymentMethods', updated);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'paymentMethods', id));
    } else {
      const updated = paymentMethods.filter(pm => pm.id !== id);
      setPaymentMethods(updated);
      saveLocal('paymentMethods', updated);
    }
  };

  const handleTransfer = async (fromId: string, toId: string, amount: number, note: string) => {
    if (userRole !== 'ADMIN') return;
    const fromMethod = paymentMethods.find(m => m.id === fromId);
    const toMethod = paymentMethods.find(m => m.id === toId);

    if (!fromMethod || !toMethod) return;
    if (fromMethod.balance < amount) {
      alert("Fondos insuficientes en la caja de origen.");
      return;
    }

    const newTransfer: Transfer = {
      id: uuidv4(),
      timestamp: Date.now(),
      fromMethodId: fromId,
      toMethodId: toId,
      amount,
      note
    };

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'transfers', newTransfer.id), newTransfer);
      batch.update(doc(db, 'users', user.uid, 'paymentMethods', fromId), { balance: fromMethod.balance - amount });
      batch.update(doc(db, 'users', user.uid, 'paymentMethods', toId), { balance: toMethod.balance + amount });
      await batch.commit();
    } else {
      const updatedMethods = paymentMethods.map(m => {
        if (m.id === fromId) return { ...m, balance: m.balance - amount };
        if (m.id === toId) return { ...m, balance: m.balance + amount };
        return m;
      });
      setPaymentMethods(updatedMethods);
      saveLocal('paymentMethods', updatedMethods);

      const updatedTransfers = [...transfers, newTransfer];
      setTransfers(updatedTransfers);
      saveLocal('transfers', updatedTransfers);
    }
  };

  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
    if (userRole !== 'ADMIN') return;
    const newSupplier: Supplier = { ...supplierData, id: uuidv4(), balance: 0 };
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'suppliers', newSupplier.id), newSupplier);
    } else {
      const updated = [...suppliers, newSupplier];
      setSuppliers(updated);
      saveLocal('suppliers', updated);
    }
  };

  const handleAddExpense = async (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => {
    if (userRole !== 'ADMIN') return;
    const newExpense: Expense = {
      id: uuidv4(),
      supplierId,
      amount,
      date: Date.now(),
      description,
      type
    };

    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    if (user) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'expenses', newExpense.id), newExpense);
      
      const delta = type === 'PURCHASE' ? amount : -amount;
      batch.update(doc(db, 'users', user.uid, 'suppliers', supplierId), { balance: supplier.balance + delta });

      if (type === 'PAYMENT' && paymentMethodId) {
         const method = paymentMethods.find(m => m.id === paymentMethodId);
         if (method) {
            batch.update(doc(db, 'users', user.uid, 'paymentMethods', paymentMethodId), { balance: method.balance - amount });
         }
      }
      await batch.commit();

    } else {
      const updatedExpenses = [...expenses, newExpense];
      setExpenses(updatedExpenses);
      saveLocal('expenses', updatedExpenses);

      const updatedSuppliers = suppliers.map(s => {
        if (s.id === supplierId) {
          const delta = type === 'PURCHASE' ? amount : -amount;
          return { ...s, balance: s.balance + delta };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
      saveLocal('suppliers', updatedSuppliers);

      if (type === 'PAYMENT' && paymentMethodId) {
        const updatedMethods = paymentMethods.map(m => {
          if (m.id === paymentMethodId) {
            return { ...m, balance: m.balance - amount };
          }
          return m;
        });
        setPaymentMethods(updatedMethods);
        saveLocal('paymentMethods', updatedMethods);
      }
    }
  };

  // --- Settings & Profile Sync ---
  const handleUpdateProfile = async (profile: StoreProfile) => {
     if (user) {
       await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), { 
         lowStockThreshold, 
         storeProfile: profile 
       }, { merge: true });
     } else {
       setStoreProfile(profile);
       saveLocal('storeProfile', profile);
     }
  };

  const handleUpdateThreshold = async (val: number) => {
     if (user) {
       await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), { 
         lowStockThreshold: val, 
         storeProfile 
       }, { merge: true });
     } else {
       setLowStockThreshold(val);
       saveLocal('lowStockThreshold', val);
     }
  };


  const handleLogout = () => {
    signOut(auth).then(() => {
        setIsGuestMode(false);
        setUserRole('ADMIN');
        // Clear state to avoid flash of previous user data
        setProducts([]);
        setSales([]);
    });
  };

  const toggleRole = () => {
    if (userRole === 'ADMIN') {
      if (!storeProfile.sellerPin || storeProfile.sellerPin.trim().length < 4) {
        alert("⚠️ Configuración Incompleta\n\nDebes definir un PIN de seguridad de 4 dígitos en la sección 'Configuración' antes de activar el Modo Vendedor.");
        setView('SETTINGS');
        return;
      }
      setUserRole('SELLER');
      setView('POS'); 
    } else {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = pinInput === storeProfile.sellerPin || (!storeProfile.sellerPin && pinInput === '0000');
    if (isCorrect) {
      setUserRole('ADMIN');
      setShowPinModal(false);
      setView('DASHBOARD');
    } else {
      setPinError(true);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

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
            onBulkAddProducts={handleBulkAddProducts} 
            onUpdateProduct={handleUpdateProduct} 
            onDeleteProduct={handleDeleteProduct}
            lowStockThreshold={lowStockThreshold}
            onUpdateThreshold={handleUpdateThreshold}
            isReadOnly={userRole === 'SELLER'}
          />
        );
      case 'SUPPLIERS':
        return userRole === 'ADMIN' ? <Suppliers suppliers={suppliers} expenses={expenses} paymentMethods={paymentMethods} onAddSupplier={handleAddSupplier} onAddExpense={handleAddExpense} /> : null;
      case 'FINANCE':
        return userRole === 'ADMIN' ? (
          <Finance 
            paymentMethods={paymentMethods} 
            transfers={transfers} 
            onAddMethod={handleAddMethod} 
            onUpdateMethod={handleUpdateMethod}
            onDeleteMethod={handleDeleteMethod}
            onTransfer={handleTransfer} 
          />
        ) : null;
      case 'REPORTS':
        return userRole === 'ADMIN' ? <Reports sales={sales} paymentMethods={paymentMethods} /> : null;
      case 'SETTINGS':
        return userRole === 'ADMIN' ? (
          <Settings 
             storeProfile={storeProfile} 
             onUpdateProfile={handleUpdateProfile} 
             onMigrateData={user ? handleMigrateData : undefined}
          />
        ) : null;
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
               <p className="text-center text-slate-500 mb-6 text-sm">
                 {(!storeProfile.sellerPin) 
                   ? "⚠️ No hay PIN configurado. Ingresa '0000' para desbloquear." 
                   : "Ingresa el PIN maestro para desbloquear el acceso de Administrador."}
               </p>
               
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