
import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Added 'X' to the lucide-react imports
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, CreditCard, Package, ArrowLeft, FileText, Split, Scale, Barcode, Star, PauseCircle, PlayCircle, User, Users, Tag, AlertCircle, Banknote, Layers, X, ChevronUp, Calculator, Loader2 } from 'lucide-react';
import { Product, PaymentMethod, CartItem, Sale, InvoiceData, StoreProfile, PaymentDetail, SuspendedSale, Customer, Promotion, Combo, UserRole } from '../types';
import InvoiceModal from './InvoiceModal';
import { formatCurrency } from '../utils';

interface POSProps {
  products: Product[];
  paymentMethods: PaymentMethod[];
  customers: Customer[];
  promotions: Promotion[]; 
  combos: Combo[]; // Added combos
  onCompleteSale: (items: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData, customerId?: string, isCredit?: boolean) => Promise<Sale | undefined> | Sale | undefined;
  storeProfile: StoreProfile;
  userRole?: UserRole;
}

const POS: React.FC<POSProps> = ({ products, paymentMethods, customers, promotions, combos, onCompleteSale, storeProfile, userRole = 'ADMIN' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCheckout, setShowCheckout] = useState(false);
  const [mobileView, setMobileView] = useState<'CATALOG' | 'CART'>('CATALOG');
  
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);

  // Variable Price State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Combo Selection State
  const [showComboModal, setShowComboModal] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<Combo | null>(null);
  // comboChoices now stores an array of strings (product IDs) for each part
  // Index i corresponds to parts[i]. The inner array contains selected IDs.
  const [comboChoices, setComboChoices] = useState<string[][]>([]);

  // Payment State
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [cashReceived, setCashReceived] = useState('');
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Processing State to prevent duplicates
  const [isProcessing, setIsProcessing] = useState(false);

  // Invoice State
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientCuit, setClientCuit] = useState('');
  const [invoiceType, setInvoiceType] = useState<'A' | 'B' | 'C'>('B');
  const [conditionIva, setConditionIva] = useState<InvoiceData['conditionIva']>('Consumidor Final');

  // Filter payment methods based on role and visibility
  const visiblePaymentMethods = useMemo(() => {
    if (userRole === 'ADMIN') return paymentMethods;
    return paymentMethods.filter(m => !m.isHiddenInSellerMode);
  }, [paymentMethods, userRole]);

  useEffect(() => {
    if (visiblePaymentMethods.length > 0 && !selectedMethod) {
      const cash = visiblePaymentMethods.find(m => m.type === 'CASH');
      setSelectedMethod(cash ? cash.id : visiblePaymentMethods[0].id);
    }
  }, [visiblePaymentMethods]);

  const getApplicablePromotion = useCallback((item: CartItem): Promotion | null => {
    if (item.isCombo) return null; // Combos don't have standard promos
    let cleanId = item.id;
    if (item.isVariablePrice) {
       const lastDash = item.id.lastIndexOf('-');
       if (lastDash > 0) {
          const suffix = item.id.substring(lastDash + 1);
          if (!isNaN(Number(suffix))) {
             cleanId = item.id.substring(0, lastDash);
          }
       }
    }
    const applicable = promotions.filter(p => p.isActive && p.productId === cleanId);
    if (applicable.length === 0) return null;
    const bestPromo = applicable
       .filter(p => item.quantity >= Number(p.triggerQuantity))
       .sort((a, b) => Number(b.triggerQuantity) - Number(a.triggerQuantity))[0];
    return bestPromo || null;
  }, [promotions]);

  const calculateItemTotal = useCallback((item: CartItem) => {
     if (item.isCombo) return item.sellingPrice * item.quantity;
     const promo = getApplicablePromotion(item);
     const price = promo ? Number(promo.promotionalPrice) : item.sellingPrice;
     return price * item.quantity;
  }, [getApplicablePromotion]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [cart, calculateItemTotal]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const isSelectedMethodCash = useMemo(() => {
     const m = visiblePaymentMethods.find(pm => pm.id === selectedMethod);
     return m?.type === 'CASH';
  }, [selectedMethod, visiblePaymentMethods]);

  const changeAmount = useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < cartTotal) return 0;
    return received - cartTotal;
  }, [cashReceived, cartTotal]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['COMBOS', 'FAVORITES', 'ALL', ...Array.from(cats)];
  }, [products]);

  const filteredItems = useMemo(() => {
    const lowerSearch = (searchTerm || "").toLowerCase();
    
    if (selectedCategory === 'COMBOS') {
       return combos.filter(c => c.isActive && (c.name || "").toLowerCase().includes(lowerSearch));
    }

    if (selectedCategory === 'FAVORITES' && !lowerSearch) {
       return products.filter(p => p.isFavorite);
    }

    return products.filter(p => {
      const matchesSearch = (p.name || "").toLowerCase().includes(lowerSearch) || 
                            (p.barcode && p.barcode.toLowerCase().includes(lowerSearch));
      const matchesCategory = selectedCategory === 'ALL' || 
                              p.category === selectedCategory ||
                              (selectedCategory === 'FAVORITES' && p.isFavorite);
      return matchesSearch && matchesCategory;
    });
  }, [products, combos, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.isVariablePrice) {
      setPendingProduct(product);
      setManualPriceInput('');
      setShowPriceModal(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && !item.isCombo);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const addComboToCart = (combo: Combo) => {
     setPendingCombo(combo);
     // Initialize choice arrays for each part
     setComboChoices(combo.parts.map(() => []));
     setShowComboModal(true);
  };

  const selectComboProduct = (partIndex: number, productId: string) => {
     if (!pendingCombo) return;
     const part = pendingCombo.parts[partIndex];
     const limit = part.limit || 1;
     
     setComboChoices(prev => {
        const newChoices = [...prev];
        const currentPartChoices = [...newChoices[partIndex]];
        
        // If we are just toggling a radio button (limit 1)
        if (limit === 1) {
           newChoices[partIndex] = [productId];
        } else {
           // Multi-select logic
           // Just add it, provided we haven't reached the limit
           if (currentPartChoices.length < limit) {
              currentPartChoices.push(productId);
              newChoices[partIndex] = currentPartChoices;
           }
        }
        return newChoices;
     });
  };

  const removeComboProduct = (partIndex: number, productId: string) => {
      setComboChoices(prev => {
         const newChoices = [...prev];
         const currentPartChoices = [...newChoices[partIndex]];
         const idxToRemove = currentPartChoices.indexOf(productId);
         if (idxToRemove !== -1) {
             currentPartChoices.splice(idxToRemove, 1);
             newChoices[partIndex] = currentPartChoices;
         }
         return newChoices;
      });
  };

  const confirmCombo = () => {
     if (!pendingCombo) return;
     
     // Check validity: Are all parts fully selected?
     const isValid = pendingCombo.parts.every((part, idx) => {
        const limit = part.limit || 1;
        return comboChoices[idx]?.length === limit;
     });

     if (!isValid) return;

     const comboItem: CartItem = {
        id: `combo-${pendingCombo.id}-${Date.now()}`,
        name: pendingCombo.name,
        sellingPrice: pendingCombo.price,
        quantity: 1,
        isCombo: true,
        // Flatten the selections into a single array of IDs
        selectedProductIds: comboChoices.flat()
     };
     setCart(prev => [...prev, comboItem]);
     setShowComboModal(false);
     setPendingCombo(null);
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
    if (isProcessing) return; // Prevent double clicks

    if (isCreditSale && !selectedCustomerId) {
       alert("Debes seleccionar un cliente para vender 'Fiado'.");
       return;
    }

    setIsProcessing(true); // Lock the button

    try {
      const finalCartItems = cart.map(item => {
        const promo = getApplicablePromotion(item);
        if (promo) {
          return {
            ...item,
            sellingPrice: Number(promo.promotionalPrice), 
            appliedPromotionId: promo.id
          };
        }
        return item;
      });

      const finalTotal = finalCartItems.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
      let finalPayments: PaymentDetail[] = [];

      if (isCreditSale) {
          finalPayments.push({ methodId: 'CREDIT_ACCOUNT', methodName: 'Cuenta Corriente', amount: finalTotal });
      } else if (isSplitPayment) {
        (Object.entries(splitAmounts) as [string, string][]).forEach(([methodId, amountStr]) => {
          const amount = parseFloat(amountStr);
          if (amount > 0) {
            const method = visiblePaymentMethods.find(m => m.id === methodId);
            if (method) finalPayments.push({ methodId, methodName: method.name, amount });
          }
        });
      } else {
        const method = visiblePaymentMethods.find(m => m.id === selectedMethod);
        if (!method) throw new Error("Método de pago no válido");
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

      setCart([]);
      setShowCheckout(false);
      setShowInvoiceForm(false);
      setMobileView('CATALOG');
      setIsCreditSale(false);
      setSelectedCustomerId('');
      setSplitAmounts({});
      setIsSplitPayment(false);
      setCashReceived(''); 
    } catch (error) {
      console.error("Error processing sale:", error);
      alert("Hubo un error al procesar la venta. Intente nuevamente.");
    } finally {
      setIsProcessing(false); // Lock the button
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] gap-4 md:gap-6 relative">
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
              {categories.map(c => <option key={c} value={c}>{c === 'FAVORITES' ? '⭐ Favoritos' : c === 'COMBOS' ? '🍱 Combos' : c === 'ALL' ? 'Todos' : c}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 bg-slate-50 pb-24 md:pb-4 custom-scrollbar relative">
            {filteredItems.map(item => {
               if ('parts' in item) {
                  return (
                    <div 
                      key={item.id}
                      onClick={() => addComboToCart(item as Combo)}
                      className="bg-indigo-600 p-3 md:p-4 rounded-xl border border-indigo-700 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-32 md:h-36 relative group"
                    >
                      <div className="absolute top-2 right-2 text-indigo-200"><Layers size={14} /></div>
                      <div className="mt-4">
                        <h4 className="font-bold text-sm md:text-base text-white line-clamp-2 leading-tight">{item.name}</h4>
                        <p className="text-[10px] text-indigo-200 mt-1 uppercase font-bold">Combo Especial</p>
                      </div>
                      <div className="text-right">
                         <span className="font-black text-base md:text-lg text-white">{formatCurrency(item.price)}</span>
                      </div>
                    </div>
                  );
               } else {
                 const product = item as Product;
                 const hasPromo = promotions.some(p => p.isActive && p.productId === product.id);
                 return (
                  <div 
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition-all active:scale-95 flex flex-col h-32 md:h-36 relative group ${product.isFavorite ? 'ring-1 ring-yellow-100' : ''}`}>

                    {/* Icons - Absolutely Positioned */}
                    {product.isFavorite && <div className="absolute top-2 left-2 text-yellow-400"><Star size={12} fill="currentColor"/></div>}
                    {hasPromo && <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1"><Tag size={10} /> PROMO</div>}
                    {product.barcode && <div className="absolute top-2 right-2 opacity-50 text-[10px] bg-slate-100 px-1 rounded flex items-center"><Barcode size={10} className="mr-0.5"/></div>}

                    {/* Flex container for content to ensure proper alignment */}
                    <div className="flex flex-col flex-1">
                        {/* Top Section (Name & Category) */}
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm md:text-base text-slate-800 line-clamp-2 leading-tight">{product.name}</h4>
                          <p className="text-[10px] md:text-xs text-slate-500 mt-1">{product.category}</p>
                        </div>

                        {/* Bottom Section (Stock & Price) - Pushed down with mt-auto */}
                        <div className="flex justify-between items-end mt-auto">
                           <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Stock: {product.stock}</span>
                           <span className="font-bold text-base md:text-lg text-brand-600">{product.isVariablePrice ? '$-.--' : formatCurrency(product.sellingPrice)}</span>
                        </div>
                    </div>
                  </div>
                 );
               }
            })}
          </div>
          
          {/* Mobile Floating Checkout Button (Only visible on mobile catalog view when items exist) */}
          {cart.length > 0 && mobileView === 'CATALOG' && (
             <div className="md:hidden absolute bottom-4 left-4 right-4 z-30 animate-in slide-in-from-bottom-2 fade-in">
                <button 
                  onClick={() => setMobileView('CART')}
                  className="w-full bg-brand-600 text-white p-4 rounded-xl shadow-xl flex justify-between items-center hover:bg-brand-700 transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                         {cartItemCount}
                      </div>
                      <div className="text-left flex flex-col leading-none">
                         <span className="font-bold text-sm">Ver Carrito</span>
                         <span className="text-[10px] text-brand-200">Ir a cobrar</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="font-black text-xl">{formatCurrency(cartTotal)}</span>
                      <ChevronUp size={20} className="text-brand-200" />
                   </div>
                </button>
             </div>
          )}
        </div>

        <div className={`w-full md:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${mobileView === 'CATALOG' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileView('CATALOG')} className="md:hidden mr-2 p-1 rounded-full hover:bg-slate-200"><ArrowLeft size={20}/></button>
              <ShoppingCart size={20} className="text-slate-700" />
              <h3 className="font-bold text-slate-800">Ticket Actual</h3>
            </div>
            <div className="flex gap-2">
              {suspendedSales.length > 0 && (
                <button onClick={() => setShowSuspendedModal(true)} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold animate-pulse">{suspendedSales.length} en espera</button>
              )}
              {cart.length > 0 && (
                <button onClick={handleSuspendSale} className="text-slate-400 hover:text-orange-500" title="Poner en espera"><PauseCircle size={20} /></button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.map(item => {
              const promo = getApplicablePromotion(item);
              const total = calculateItemTotal(item);
              return (
                <div key={item.id} className={`flex flex-col bg-white p-2 rounded-lg border transition-colors ${promo || item.isCombo ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-medium text-slate-800 truncate">{item.name}</h4>
                      <div className="text-xs text-brand-600 font-bold flex items-center gap-2 mt-0.5">
                        {item.isVariablePrice ? formatCurrency(item.sellingPrice) : formatCurrency(total)}
                      </div>
                      {item.isCombo && item.selectedProductIds && (
                         <div className="text-[10px] text-slate-400 mt-1 italic">
                           Incluye: {item.selectedProductIds.map(id => products.find(p => p.id === id)?.name).join(', ')}
                         </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 h-8">
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
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
            </div>
            {!showCheckout ? (
              <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-200">Cobrar</button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Method Toggles */}
                <div className="flex p-1 bg-slate-200 rounded-lg">
                  <button onClick={() => {setIsSplitPayment(false); setIsCreditSale(false)}} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isSplitPayment && !isCreditSale ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Simple</button>
                  <button onClick={() => {setIsSplitPayment(true); setIsCreditSale(false)}} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isSplitPayment ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}><Split size={12} /> Mixto</button>
                  <button onClick={() => {setIsCreditSale(true); setIsSplitPayment(false)}} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isCreditSale ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}><Users size={12} /> Fiado</button>
                </div>

                {isCreditSale ? (
                  /* Fiado Section */
                  <div className="space-y-3 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                     <label className="text-xs font-bold text-orange-800 uppercase block">Seleccionar Cliente</label>
                     <select 
                       value={selectedCustomerId}
                       onChange={e => setSelectedCustomerId(e.target.value)}
                       className="w-full p-2 bg-white border border-orange-200 rounded outline-none text-sm"
                     >
                       <option value="">Buscar cliente...</option>
                       {customers.map(c => (
                         <option key={c.id} value={c.id}>{c.name} (Deuda: {formatCurrency(c.balance)})</option>
                       ))}
                     </select>
                     {selectedCustomerId ? (
                        <div className="flex items-center gap-2 text-xs text-orange-700 bg-white p-2 rounded border border-orange-100">
                           <CheckCircle size={14} /> Se sumará a su cuenta corriente.
                        </div>
                     ) : (
                        <div className="text-xs text-orange-400 italic">Debes seleccionar un cliente.</div>
                     )}
                  </div>
                ) : !isSplitPayment ? (
                   /* Simple Payment Section */
                   <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {visiblePaymentMethods.filter(m => m.type !== 'CREDIT').map(method => (
                           <button key={method.id} onClick={() => { setSelectedMethod(method.id); setCashReceived(''); }} className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${selectedMethod === method.id ? 'bg-brand-100 border-brand-500 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{method.name}</button>
                        ))}
                      </div>

                      {/* Cash Calculator */}
                      {isSelectedMethodCash && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                           <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Banknote size={12} /> Abona con ($)</label>
                              <input 
                                type="number" 
                                min="0" 
                                placeholder={cartTotal.toString()}
                                value={cashReceived}
                                onChange={e => setCashReceived(e.target.value)}
                                className="w-full mt-1 p-2 text-lg font-bold border rounded outline-none focus:ring-2 focus:ring-brand-500"
                              />
                           </div>
                           <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                              <span className="text-xs font-bold text-slate-500">SU VUELTO:</span>
                              <span className={`text-xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                 {formatCurrency(Math.max(0, changeAmount))}
                              </span>
                           </div>
                        </div>
                      )}
                   </div>
                ) : (
                   /* Split Payment UI (Existing) */
                   <div className="space-y-2">
                      {visiblePaymentMethods.map(method => (
                         <div key={method.id} className="flex items-center gap-2">
                            <span className="text-xs font-medium w-24 truncate">{method.name}</span>
                            <input 
                              type="number" 
                              placeholder="0.00"
                              value={splitAmounts[method.id] || ''}
                              onChange={e => setSplitAmounts(prev => ({...prev, [method.id]: e.target.value}))}
                              className="flex-1 p-2 border rounded text-sm"
                            />
                         </div>
                      ))}
                   </div>
                )}
                
                <div className="flex gap-2 pt-2">
                   <button onClick={() => setShowCheckout(false)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold disabled:opacity-50">Volver</button>
                   <button 
                     onClick={handleCheckout} 
                     disabled={isProcessing}
                     className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isProcessing ? (
                        <>
                           <Loader2 size={18} className="animate-spin" /> Procesando...
                        </>
                     ) : (
                        <>
                           <CheckCircle size={18} /> Confirmar
                        </>
                     )}
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combo Selection Modal */}
      {showComboModal && pendingCombo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layers className="text-indigo-600" /> Configurar {pendingCombo.name}</h3>
                  <button onClick={() => setShowComboModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                  {pendingCombo.parts.map((part, idx) => {
                     const limit = part.limit || 1;
                     const currentSelections = comboChoices[idx] || [];
                     const currentCount = currentSelections.length;
                     const isComplete = currentCount === limit;

                     return (
                     <div key={idx} className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{part.name}</label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {currentCount} / {limit} seleccionados
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           {part.eligibleProductIds.map(pid => {
                              const prod = products.find(p => p.id === pid);
                              if (!prod) return null;
                              
                              // Count how many of THIS product are selected
                              const qtySelected = currentSelections.filter(id => id === pid).length;
                              
                              return (
                                 <button 
                                    key={pid}
                                    onClick={() => selectComboProduct(idx, pid)}
                                    disabled={currentCount >= limit && qtySelected === 0 && limit > 1} // Disable adding new ones if limit reached, unless it's single select toggle
                                    className={`relative p-3 rounded-lg border text-left text-sm font-medium transition-all flex flex-col justify-between min-h-[60px] 
                                        ${qtySelected > 0 ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}
                                        ${currentCount >= limit && qtySelected === 0 && limit > 1 ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                 >
                                    <div className="truncate w-full pr-6">{prod.name}</div>
                                    <div className="text-[10px] opacity-70">Stock: {prod.stock}</div>
                                    
                                    {/* Multi-select controls */}
                                    {limit > 1 && qtySelected > 0 && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center" onClick={e => e.stopPropagation()}>
                                            <div className="font-bold text-lg leading-none">{qtySelected}</div>
                                            <div 
                                                className="bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200 cursor-pointer"
                                                onClick={() => removeComboProduct(idx, pid)}
                                            >
                                                <Minus size={12} />
                                            </div>
                                        </div>
                                    )}
                                    {/* Single select indicator */}
                                    {limit === 1 && qtySelected > 0 && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600">
                                            <CheckCircle size={16} />
                                        </div>
                                    )}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  );
                  })}
               </div>

               <div className="mt-6 pt-4 border-t flex gap-3">
                  <button onClick={() => setShowComboModal(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl">Cancelar</button>
                  <button 
                     onClick={confirmCombo} 
                     disabled={comboChoices.some((choices, idx) => choices.length !== (pendingCombo.parts[idx].limit || 1))}
                     className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Agregar al Carrito
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Other Modals (Price, Suspended, etc) */}
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
    </>
  );
};

export default POS;
