
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, CreditCard, Package, ArrowLeft, FileText, Split, Scale, Barcode, Star, PauseCircle, PlayCircle, User, Users, Tag, AlertCircle } from 'lucide-react';
import { Product, PaymentMethod, CartItem, Sale, InvoiceData, StoreProfile, PaymentDetail, SuspendedSale, Customer, Promotion } from '../types';
import InvoiceModal from './InvoiceModal';

interface POSProps {
  products: Product[];
  paymentMethods: PaymentMethod[];
  customers: Customer[];
  promotions: Promotion[]; // Recibe las promos
  onCompleteSale: (items: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData, customerId?: string, isCredit?: boolean) => Promise<Sale | undefined> | Sale | undefined;
  storeProfile: StoreProfile;
}

const POS: React.FC<POSProps> = ({ products, paymentMethods, customers, promotions, onCompleteSale, storeProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCheckout, setShowCheckout] = useState(false);
  const [mobileView, setMobileView] = useState<'CATALOG' | 'CART'>('CATALOG');
  
  // Suspended Sales
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);

  // Variable Price State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Payment State
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  
  // Credit / Customer State (Fiado)
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Invoice State
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientCuit, setClientCuit] = useState('');
  const [invoiceType, setInvoiceType] = useState<'A' | 'B' | 'C'>('B');
  const [conditionIva, setConditionIva] = useState<InvoiceData['conditionIva']>('Consumidor Final');

  // Init default method (Cash)
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      const cash = paymentMethods.find(m => m.type === 'CASH');
      setSelectedMethod(cash ? cash.id : paymentMethods[0].id);
    }
  }, [paymentMethods]);

  // --- Logic for Promotions (Robust) ---
  const getApplicablePromotion = useCallback((item: CartItem): Promotion | null => {
    // 1. Identify Product ID correctly
    let cleanId = item.id;

    // Only attempt to strip suffix if it's a variable price item (which gets unique IDs in cart like ID-TIMESTAMP)
    // Standard products with UUIDs (containing dashes) should NOT be split.
    if (item.isVariablePrice) {
       const lastDash = item.id.lastIndexOf('-');
       if (lastDash > 0) {
          const suffix = item.id.substring(lastDash + 1);
          // If the suffix is a timestamp (numeric), we assume it's a cart-generated instance ID
          if (!isNaN(Number(suffix))) {
             cleanId = item.id.substring(0, lastDash);
          }
       }
    }
    
    // Filter applicable active promotions for this product
    const applicable = promotions.filter(p => p.isActive && p.productId === cleanId);
    
    if (applicable.length === 0) return null;

    // 2. Find best tier (Highest trigger quantity that is satisfied)
    // Force Number() conversion to avoid string comparison issues
    const bestPromo = applicable
       .filter(p => item.quantity >= Number(p.triggerQuantity))
       .sort((a, b) => Number(b.triggerQuantity) - Number(a.triggerQuantity))[0];
    
    return bestPromo || null;
  }, [promotions]);

  const calculateItemTotal = useCallback((item: CartItem) => {
     const promo = getApplicablePromotion(item);
     const price = promo ? Number(promo.promotionalPrice) : item.sellingPrice;
     return price * item.quantity;
  }, [getApplicablePromotion]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart, calculateItemTotal]);

  const totalSplitEntered = useMemo(() => {
    return (Object.values(splitAmounts) as string[]).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [splitAmounts]);

  const remainingTotal = Math.max(0, cartTotal - totalSplitEntered);

  // Categories with Favorites
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['FAVORITES', 'ALL', ...Array.from(cats)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    
    // Logic for Favorites View (no search term)
    if (selectedCategory === 'FAVORITES' && !lowerSearch) {
       return products.filter(p => p.isFavorite);
    }

    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(lowerSearch) || 
                            (p.barcode && p.barcode.toLowerCase().includes(lowerSearch));
      
      const matchesCategory = selectedCategory === 'ALL' || 
                              p.category === selectedCategory ||
                              (selectedCategory === 'FAVORITES' && p.isFavorite);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // --- Handlers ---

  const addToCart = (product: Product) => {
    if (product.isVariablePrice) {
      setPendingProduct(product);
      setManualPriceInput('');
      setShowPriceModal(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const confirmVariablePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(manualPriceInput);
    if (!pendingProduct || !price || price <= 0) return;
    const uniqueId = `${pendingProduct.id}-${Date.now()}`;
    setCart(prev => [...prev, { ...pendingProduct, id: uniqueId, sellingPrice: price, quantity: 1 }]);
    setShowPriceModal(false);
    setPendingProduct(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const handleSuspendSale = () => {
     if (cart.length === 0) return;
     const newSuspended: SuspendedSale = {
       id: Date.now().toString(),
       timestamp: Date.now(),
       items: [...cart],
       note: `Ticket ${new Date().toLocaleTimeString()}`
     };
     setSuspendedSales(prev => [newSuspended, ...prev]);
     setCart([]);
     setMobileView('CATALOG');
  };

  const handleResumeSale = (suspended: SuspendedSale) => {
    setCart(suspended.items);
    setSuspendedSales(prev => prev.filter(s => s.id !== suspended.id));
    setShowSuspendedModal(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Credit Sale Validation
    if (isCreditSale) {
       if (!selectedCustomerId) {
          alert("Debes seleccionar un cliente para vender 'Fiado'.");
          return;
       }
    }

    // Prepare Items with Final Prices (applying promos)
    const finalCartItems = cart.map(item => {
      const promo = getApplicablePromotion(item);
      if (promo) {
        return {
          ...item,
          sellingPrice: Number(promo.promotionalPrice), // Update price to promo price
          appliedPromotionId: promo.id
        };
      }
      return item;
    });

    const finalTotal = finalCartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);

    // Payment Validation
    let finalPayments: PaymentDetail[] = [];

    if (isCreditSale) {
        finalPayments.push({
           methodId: 'CREDIT_ACCOUNT',
           methodName: 'Cuenta Corriente',
           amount: finalTotal
        });
    } else if (isSplitPayment) {
      if (totalSplitEntered < finalTotal - 0.01) {
        alert(`Falta cubrir $${Math.max(0, finalTotal - totalSplitEntered).toFixed(2)} del total.`);
        return;
      }
      (Object.entries(splitAmounts) as [string, string][]).forEach(([methodId, amountStr]) => {
        const amount = parseFloat(amountStr);
        if (amount > 0) {
          const method = paymentMethods.find(m => m.id === methodId);
          if (method) finalPayments.push({ methodId, methodName: method.name, amount });
        }
      });
    } else {
       const method = paymentMethods.find(m => m.id === selectedMethod);
       if (!method) return;
       finalPayments.push({ methodId: selectedMethod, methodName: method.name, amount: finalTotal });
    }

    let invoiceData: InvoiceData | undefined = undefined;
    if (showInvoiceForm) {
      invoiceData = {
        type: invoiceType,
        number: `0000${Math.floor(Math.random() * 10000)}`,
        clientName, clientCuit, clientAddress: '', conditionIva
      };
    }

    const sale = await onCompleteSale(finalCartItems, finalPayments, invoiceData, selectedCustomerId, isCreditSale);
    if (sale) setLastSale(sale);

    // Reset
    setCart([]);
    setShowCheckout(false);
    setShowInvoiceForm(false);
    setMobileView('CATALOG');
    setIsCreditSale(false);
    setSelectedCustomerId('');
    setSplitAmounts({});
    setIsSplitPayment(false);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] gap-4 md:gap-6 relative">
        {/* Product Selection Area */}
        <div className={`flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${mobileView === 'CART' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-auto font-medium text-slate-700"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'FAVORITES' ? '⭐ Favoritos' : c === 'ALL' ? 'Todos' : c}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 bg-slate-50 pb-24 md:pb-4 custom-scrollbar">
            {filteredProducts.map(product => {
               // Check if product has active promo to show badge
               const hasPromo = promotions.some(p => p.isActive && p.productId === product.id);
               return (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-32 md:h-36 relative group ${product.isFavorite ? 'ring-1 ring-yellow-100' : ''}`}
                >
                  {product.isFavorite && (
                     <div className="absolute top-2 left-2 text-yellow-400"><Star size={12} fill="currentColor"/></div>
                  )}
                  {hasPromo && (
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Tag size={10} /> PROMO
                     </div>
                  )}
                  {product.barcode && (
                     <div className="absolute top-2 right-2 opacity-50 text-[10px] bg-slate-100 px-1 rounded flex items-center"><Barcode size={10} className="mr-0.5"/></div>
                  )}
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm md:text-base text-slate-800 line-clamp-2 leading-tight">{product.name}</h4>
                    <p className="text-[10px] md:text-xs text-slate-500 mt-1">{product.category}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                     <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Stock: {product.stock}</span>
                     <span className="font-bold text-base md:text-lg text-brand-600">{product.isVariablePrice ? '$-.--' : `$${product.sellingPrice}`}</span>
                  </div>
                </div>
               );
            })}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className={`w-full md:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${mobileView === 'CATALOG' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileView('CATALOG')} className="md:hidden mr-2 p-1 rounded-full hover:bg-slate-200"><ArrowLeft size={20}/></button>
              <ShoppingCart size={20} className="text-slate-700" />
              <h3 className="font-bold text-slate-800">Ticket Actual</h3>
            </div>
            
            {/* Suspended Sales Button */}
            <div className="flex gap-2">
              {suspendedSales.length > 0 && (
                <button 
                  onClick={() => setShowSuspendedModal(true)}
                  className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold animate-pulse"
                >
                  {suspendedSales.length} en espera
                </button>
              )}
              {cart.length > 0 && (
                <button onClick={handleSuspendSale} className="text-slate-400 hover:text-orange-500" title="Poner en espera">
                   <PauseCircle size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.map(item => {
              const promo = getApplicablePromotion(item);
              const total = calculateItemTotal(item);
              
              return (
                <div key={item.id} className={`flex flex-col bg-white p-2 rounded-lg border transition-colors ${promo ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-medium text-slate-800 truncate">{item.name}</h4>
                      
                      <div className="text-xs text-brand-600 font-bold flex items-center gap-2 mt-0.5">
                         {item.isVariablePrice ? (
                            `$${item.sellingPrice.toFixed(2)}`
                         ) : promo ? (
                            <div className="flex flex-col items-start leading-none gap-1">
                               <div>
                                  <span className="line-through text-slate-400 decoration-slate-400 mr-2">${(item.sellingPrice * item.quantity).toFixed(2)}</span>
                                  <span className="text-emerald-600 font-extrabold text-sm">${total.toFixed(2)}</span>
                               </div>
                            </div>
                         ) : (
                            `$${total.toFixed(2)}`
                         )}
                      </div>
                      
                      {promo && (
                         <div className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-1 rounded mt-1 flex justify-between items-center font-bold">
                            <span className="flex items-center gap-1"><Tag size={10} /> {promo.name}</span>
                            <span>${promo.promotionalPrice}/u</span>
                         </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1 h-8">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded" disabled={!!item.isVariablePrice}><Minus size={14} /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded" disabled={!!item.isVariablePrice}><Plus size={14} /></button>
                    </div>
                    <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-600 font-medium">Total</span>
              <span className="text-2xl font-bold text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>

            {!showCheckout ? (
              <button 
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-200"
              >
                Cobrar
              </button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Method Toggles */}
                <div className="flex p-1 bg-slate-200 rounded-lg">
                  <button onClick={() => { setIsSplitPayment(false); setIsCreditSale(false); }} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isSplitPayment && !isCreditSale ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Simple</button>
                  <button onClick={() => { setIsSplitPayment(true); setIsCreditSale(false); }} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${isSplitPayment ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><Split size={12} /> Mixto</button>
                  <button onClick={() => { setIsCreditSale(true); setIsSplitPayment(false); }} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${isCreditSale ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}><User size={12} /> Fiado</button>
                </div>

                {isCreditSale ? (
                  // FIADO UI
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                     <p className="text-xs font-bold text-orange-800 uppercase mb-2">Seleccionar Cliente</p>
                     <select 
                       value={selectedCustomerId}
                       onChange={(e) => setSelectedCustomerId(e.target.value)}
                       className="w-full p-2 rounded border border-orange-200 text-sm outline-none"
                     >
                       <option value="">-- Buscar Cliente --</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name} (Deuda: ${c.balance})</option>)}
                     </select>
                     <p className="text-[10px] text-orange-600 mt-2 italic">La venta quedará registrada como "Pendiente de Pago" en la cuenta del cliente.</p>
                  </div>
                ) : isSplitPayment ? (
                  // SPLIT UI
                  <div className="space-y-2">
                    {paymentMethods.filter(m => m.type !== 'CREDIT').map(method => (
                      <div key={method.id} className="flex items-center gap-2">
                         <span className="text-sm text-slate-600 w-24 truncate font-medium">{method.name}</span>
                         <input 
                           type="number" min="0" placeholder="0"
                           value={splitAmounts[method.id] || ''}
                           onChange={(e) => setSplitAmounts(prev => ({ ...prev, [method.id]: e.target.value }))}
                           className="flex-1 py-1.5 px-2 border border-slate-300 rounded text-sm"
                         />
                      </div>
                    ))}
                    <div className="text-right text-sm font-bold text-slate-500">Falta: ${remainingTotal.toFixed(2)}</div>
                  </div>
                ) : (
                  // SIMPLE UI
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.filter(m => m.type !== 'CREDIT').map(method => (
                      <button key={method.id} onClick={() => setSelectedMethod(method.id)} className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${selectedMethod === method.id ? 'bg-brand-100 border-brand-500 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{method.name}</button>
                    ))}
                  </div>
                )}

                {/* Invoice Toggle */}
                {!isCreditSale && (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 cursor-pointer" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                    <div className="flex items-center gap-2 text-slate-700 font-medium text-sm"><FileText size={16} /> Factura Electrónica</div>
                    <div className={`w-8 h-5 rounded-full p-1 transition-colors ${showInvoiceForm ? 'bg-brand-600' : 'bg-slate-300'}`}><div className={`bg-white w-3 h-3 rounded-full shadow-sm transition-transform ${showInvoiceForm ? 'translate-x-3' : ''}`}></div></div>
                  </div>
                )}

                {showInvoiceForm && (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 text-sm">
                     <div className="flex gap-2">
                       <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as any)} className="border p-1 rounded w-20"><option value="B">Tipo B</option><option value="A">Tipo A</option></select>
                       <input type="text" placeholder="CUIT" value={clientCuit} onChange={e => setClientCuit(e.target.value)} className="border p-1 rounded flex-1"/>
                     </div>
                     <input type="text" placeholder="Nombre" value={clientName} onChange={e => setClientName(e.target.value)} className="border p-1 rounded w-full"/>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                   <button onClick={() => setShowCheckout(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold">Volver</button>
                   <button onClick={handleCheckout} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"><CheckCircle size={18} /> Confirmar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile FAB */}
        {mobileView === 'CATALOG' && (
          <button onClick={() => setMobileView('CART')} className="md:hidden fixed bottom-20 right-4 bg-brand-600 text-white p-4 rounded-full shadow-xl flex items-center gap-2 z-40">
            <ShoppingCart size={24} />
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">{cart.reduce((a,b) => a + b.quantity, 0)}</span>}
          </button>
        )}
      </div>

      {/* Modals */}
      {lastSale && lastSale.invoice && <InvoiceModal sale={lastSale} storeProfile={storeProfile} onClose={() => setLastSale(null)} />}
      
      {showPriceModal && pendingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
             <h3 className="text-xl font-bold text-slate-800 mb-2">Ingresar Monto</h3>
             <p className="text-slate-500 mb-4 flex items-center gap-2"><Package size={16}/> {pendingProduct.name}</p>
             <form onSubmit={confirmVariablePrice}>
                <div className="relative mb-6">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                   <input autoFocus type="number" step="0.01" min="0" value={manualPriceInput} onChange={e => setManualPriceInput(e.target.value)} className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-slate-800 border-2 border-brand-200 rounded-xl focus:border-brand-500 outline-none text-center" placeholder="0.00"/>
                </div>
                <div className="flex gap-3">
                   <button type="button" onClick={() => setShowPriceModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                   <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg">Confirmar</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Suspended Sales Modal */}
      {showSuspendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><PauseCircle className="text-orange-500" /> Ventas en Espera</h3>
                 <button onClick={() => setShowSuspendedModal(false)}><ArrowLeft size={20} /></button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                 {suspendedSales.map(s => (
                    <div key={s.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                       <div>
                          <p className="font-bold text-slate-700 text-sm">{s.note}</p>
                          <p className="text-xs text-slate-500">{new Date(s.timestamp).toLocaleTimeString()} - {s.items.length} items</p>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => setSuspendedSales(prev => prev.filter(x => x.id !== s.id))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                          <button onClick={() => handleResumeSale(s)} className="p-2 bg-brand-600 text-white rounded hover:bg-brand-700"><PlayCircle size={18} /></button>
                       </div>
                    </div>
                 ))}
                 {suspendedSales.length === 0 && <p className="text-center text-slate-400 py-4">No hay ventas suspendidas.</p>}
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default POS;
