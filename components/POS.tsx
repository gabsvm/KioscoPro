import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, CreditCard, Package, ArrowLeft, FileText, Split, Scale, Barcode } from 'lucide-react';
import { Product, PaymentMethod, CartItem, Sale, InvoiceData, StoreProfile, PaymentDetail } from '../types';
import InvoiceModal from './InvoiceModal';

interface POSProps {
  products: Product[];
  paymentMethods: PaymentMethod[];
  onCompleteSale: (items: CartItem[], payments: PaymentDetail[], invoiceData?: InvoiceData) => Sale | undefined;
  storeProfile: StoreProfile;
}

const POS: React.FC<POSProps> = ({ products, paymentMethods, onCompleteSale, storeProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCheckout, setShowCheckout] = useState(false);
  const [mobileView, setMobileView] = useState<'CATALOG' | 'CART'>('CATALOG');
  
  // Variable Price State (Fiambreria)
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Payment State
  const [selectedMethod, setSelectedMethod] = useState<string>(paymentMethods[0]?.id || '');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({}); // methodId -> amount string

  // Invoice State
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientCuit, setClientCuit] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState<'A' | 'B' | 'C'>('B');
  const [conditionIva, setConditionIva] = useState<InvoiceData['conditionIva']>('Consumidor Final');

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0), [cart]);

  // Initialize split amounts when opening checkout
  useEffect(() => {
    if (showCheckout && isSplitPayment) {
      // Don't auto-fill, user enters manually
    }
  }, [showCheckout, isSplitPayment]);

  const totalSplitEntered = useMemo(() => {
    return (Object.values(splitAmounts) as string[]).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  }, [splitAmounts]);

  const remainingTotal = Math.max(0, cartTotal - totalSplitEntered);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const lowerSearch = searchTerm.toLowerCase();
      // Search by Name OR Barcode
      const matchesSearch = p.name.toLowerCase().includes(lowerSearch) || 
                            (p.barcode && p.barcode.toLowerCase().includes(lowerSearch));
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    // If it's a variable price product (Fiambreria), ask for price first
    if (product.isVariablePrice) {
      setPendingProduct(product);
      setManualPriceInput('');
      setShowPriceModal(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    // Optional: Clear search after exact match add (common POS behavior), 
    // but here we keep it to allow adding multiples or leave up to user.
  };

  const confirmVariablePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(manualPriceInput);
    if (!pendingProduct || !price || price <= 0) return;

    // Create a unique entry for this weighted/variable item
    // We modify the ID so it doesn't merge with other items of the same product type but different weights
    const uniqueId = `${pendingProduct.id}-${Date.now()}`;

    const newItem: CartItem = {
      ...pendingProduct,
      id: uniqueId, // Override ID for cart uniqueness
      sellingPrice: price,
      quantity: 1
    };

    setCart(prev => [...prev, newItem]);
    setShowPriceModal(false);
    setPendingProduct(null);
    setManualPriceInput('');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Validate Split Payment
    let finalPayments: PaymentDetail[] = [];

    if (isSplitPayment) {
      if (totalSplitEntered < cartTotal - 0.01) { // small margin for float errors
        alert(`Falta cubrir $${remainingTotal.toFixed(2)} del total.`);
        return;
      }
      
      // Build payments array
      (Object.entries(splitAmounts) as [string, string][]).forEach(([methodId, amountStr]) => {
        const amount = parseFloat(amountStr);
        if (amount > 0) {
          const method = paymentMethods.find(m => m.id === methodId);
          if (method) {
            finalPayments.push({
              methodId,
              methodName: method.name,
              amount
            });
          }
        }
      });
      
      if (finalPayments.length === 0) {
         alert("Ingresa al menos un monto de pago.");
         return;
      }

    } else {
       // Single payment mode
       const method = paymentMethods.find(m => m.id === selectedMethod);
       if (!method) return;
       finalPayments.push({
         methodId: selectedMethod,
         methodName: method.name,
         amount: cartTotal
       });
    }

    let invoiceData: InvoiceData | undefined = undefined;

    if (showInvoiceForm) {
      invoiceData = {
        type: invoiceType,
        number: `0000${Math.floor(Math.random() * 10000)}`, // Simulation
        clientName,
        clientCuit,
        clientAddress,
        conditionIva,
        cae: `7${Math.floor(Math.random() * 10000000000000)}`, // Simulation
        caeVto: new Date(Date.now() + 864000000).toLocaleDateString('es-AR') // Simulation
      };
    }

    const sale = onCompleteSale(cart, finalPayments, invoiceData);
    if (sale) {
      setLastSale(sale); // This triggers the modal
    }

    // Reset
    setCart([]);
    setShowCheckout(false);
    setShowInvoiceForm(false);
    setMobileView('CATALOG');
    setClientName('Consumidor Final');
    setClientCuit('');
    setSplitAmounts({});
    setIsSplitPayment(false);
  };

  const handleSplitAmountChange = (methodId: string, val: string) => {
    setSplitAmounts(prev => ({ ...prev, [methodId]: val }));
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
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-auto"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Todas' : c}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 bg-slate-50 pb-24 md:pb-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-32 md:h-36 relative group"
              >
                {product.barcode && (
                   <div className="absolute top-2 right-2 opacity-50 text-[10px] bg-slate-100 px-1 rounded flex items-center">
                      <Barcode size={10} className="mr-0.5"/>
                   </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm md:text-base text-slate-800 line-clamp-2 leading-tight">{product.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <p className="text-[10px] md:text-xs text-slate-500">{product.category}</p>
                     {product.isVariablePrice && (
                       <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold flex items-center">
                         <Scale size={8} className="mr-0.5"/> Manual
                       </span>
                     )}
                  </div>
                </div>
                <div className="flex justify-between items-end mt-2">
                   <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     Stock: {product.stock}
                   </span>
                   <span className="font-bold text-base md:text-lg text-brand-600">
                     {product.isVariablePrice ? '$-.--' : `$${product.sellingPrice}`}
                   </span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-10">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>No se encontraron productos</p>
                <p className="text-xs mt-1">Prueba con otro nombre o código</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className={`w-full md:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${mobileView === 'CATALOG' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
            <button onClick={() => setMobileView('CATALOG')} className="md:hidden mr-2 p-1 rounded-full hover:bg-slate-200">
               <ArrowLeft size={20} className="text-slate-600"/>
            </button>
            <ShoppingCart size={20} className="text-slate-700" />
            <h3 className="font-bold text-slate-800">Ticket Actual</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                 <p>Ticket vacío</p>
                 <p className="text-xs">Selecciona productos para comenzar</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-medium text-slate-800 truncate">{item.name}</h4>
                    <div className="text-xs text-brand-600 font-bold">
                       {item.isVariablePrice ? (
                          <span className="flex items-center gap-1"><Scale size={10} /> ${item.sellingPrice.toFixed(2)}</span>
                       ) : (
                          `$${(item.sellingPrice * item.quantity).toFixed(2)}`
                       )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)} 
                      className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50"
                      disabled={!!item.isVariablePrice} // Disable qty change for variable items (usually 1 pack = 1 price)
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)} 
                      className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50"
                      disabled={!!item.isVariablePrice} // Disable qty change for variable items
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
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
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Cobrar
              </button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Payment Method Switcher */}
                <div className="flex p-1 bg-slate-200 rounded-lg">
                  <button 
                    onClick={() => setIsSplitPayment(false)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isSplitPayment ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Pago Simple
                  </button>
                  <button 
                    onClick={() => setIsSplitPayment(true)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${isSplitPayment ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Split size={12} /> Pago Mixto
                  </button>
                </div>

                {isSplitPayment ? (
                  // SPLIT PAYMENT UI
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Ingresar Montos</p>
                    {paymentMethods.map(method => (
                      <div key={method.id} className="flex items-center gap-2">
                         <span className="text-sm text-slate-600 w-28 truncate font-medium">{method.name}</span>
                         <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input 
                              type="number"
                              min="0"
                              placeholder="0"
                              value={splitAmounts[method.id] || ''}
                              onChange={(e) => handleSplitAmountChange(method.id, e.target.value)}
                              className="w-full pl-5 pr-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                            />
                         </div>
                      </div>
                    ))}
                    
                    <div className="mt-3 p-3 bg-slate-100 rounded-lg text-sm border border-slate-200">
                      <div className="flex justify-between mb-1">
                         <span>Ingresado:</span>
                         <span className="font-bold">${totalSplitEntered.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        {totalSplitEntered >= cartTotal ? (
                          <>
                            <span className="text-emerald-700 font-bold">Vuelto / Exceso:</span>
                            <span className="text-emerald-700 font-bold">${(totalSplitEntered - cartTotal).toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-600 font-bold">Falta:</span>
                            <span className="text-red-600 font-bold">${remainingTotal.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // SIMPLE PAYMENT UI
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map(method => (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                            selectedMethod === method.id 
                              ? 'bg-brand-100 border-brand-500 text-brand-700' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {method.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice Toggle */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50" onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                  <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                    <FileText size={16} /> Generar Factura
                  </div>
                  <div className={`w-8 h-5 rounded-full p-1 transition-colors ${showInvoiceForm ? 'bg-brand-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow-sm transition-transform ${showInvoiceForm ? 'translate-x-3' : ''}`}></div>
                  </div>
                </div>

                {/* Invoice Form */}
                {showInvoiceForm && (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 text-sm">
                     <div className="flex gap-2">
                       <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as any)} className="border p-1 rounded w-20">
                         <option value="B">Tipo B</option>
                         <option value="A">Tipo A</option>
                         <option value="C">Tipo C</option>
                       </select>
                       <input 
                         type="text" 
                         placeholder="CUIT Cliente" 
                         value={clientCuit}
                         onChange={e => setClientCuit(e.target.value)}
                         className="border p-1 rounded flex-1 outline-none focus:border-brand-500"
                       />
                     </div>
                     <input 
                       type="text" 
                       placeholder="Razón Social / Nombre" 
                       value={clientName}
                       onChange={e => setClientName(e.target.value)}
                       className="border p-1 rounded w-full outline-none focus:border-brand-500"
                     />
                     <select value={conditionIva} onChange={e => setConditionIva(e.target.value as any)} className="border p-1 rounded w-full">
                       <option value="Consumidor Final">Consumidor Final</option>
                       <option value="Resp. Inscripto">Resp. Inscripto</option>
                       <option value="Monotributista">Monotributista</option>
                     </select>
                  </div>
                )}

                
                <div className="flex gap-2 pt-2">
                   <button 
                     onClick={() => setShowCheckout(false)}
                     className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleCheckout}
                     className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                   >
                     <CheckCircle size={18} /> Confirmar
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button (Mobile Only) */}
        {mobileView === 'CATALOG' && (
          <button 
            onClick={() => setMobileView('CART')}
            className="md:hidden fixed bottom-20 right-4 bg-brand-600 text-white p-4 rounded-full shadow-xl flex items-center gap-2 z-40 transition-transform hover:scale-105 active:scale-95"
          >
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Invoice Modal */}
      {lastSale && lastSale.invoice && (
        <InvoiceModal sale={lastSale} storeProfile={storeProfile} onClose={() => setLastSale(null)} />
      )}

      {/* Variable Price Modal (Fiambreria) */}
      {showPriceModal && pendingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
             <h3 className="text-xl font-bold text-slate-800 mb-2">Ingresar Monto</h3>
             <p className="text-slate-500 mb-4 flex items-center gap-2">
                <Package size={16}/> {pendingProduct.name}
             </p>
             <form onSubmit={confirmVariablePrice}>
                <div className="relative mb-6">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                   <input 
                     autoFocus
                     type="number" 
                     step="0.01" 
                     min="0"
                     value={manualPriceInput}
                     onChange={e => setManualPriceInput(e.target.value)}
                     className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-slate-800 border-2 border-brand-200 rounded-xl focus:border-brand-500 focus:outline-none text-center"
                     placeholder="0.00"
                   />
                </div>
                <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setShowPriceModal(false)}
                     className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
                   >
                     Confirmar
                   </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </>
  );
};

export default POS;