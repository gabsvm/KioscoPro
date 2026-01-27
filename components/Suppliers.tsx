
import React, { useState, useMemo } from 'react';
import { Truck, Plus, DollarSign, FileText, ChevronRight, Phone, Mail, ShoppingCart, Trash2, Search, ArrowRight } from 'lucide-react';
import { Supplier, Expense, PaymentMethod, Product } from '../types';
import { formatCurrency, smartRound } from '../utils';

interface SuppliersProps {
  suppliers: Supplier[];
  expenses: Expense[];
  paymentMethods: PaymentMethod[];
  products: Product[]; // Receive products for the picker
  onAddSupplier: (s: Omit<Supplier, 'id' | 'balance'>) => void;
  onAddExpense: (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => void;
  onBulkUpdateProducts: (products: Product[]) => void; // New prop to update inventory
}

interface InvoiceItem {
  product: Product;
  newCost: number;
  margin: number;
  newPrice: number;
  quantity: number;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, expenses, paymentMethods, products, onAddSupplier, onAddExpense, onBulkUpdateProducts }) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // New Supplier State
  const [newSupName, setNewSupName] = useState('');
  const [newSupCuit, setNewSupCuit] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');

  // Transaction State
  const [transType, setTransType] = useState<'PURCHASE' | 'PAYMENT'>('PURCHASE');
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transMethod, setTransMethod] = useState('');

  // Invoice Load State
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);

  const selectedSupplier = useMemo(() => 
    suppliers.find(s => s.id === selectedSupplierId), 
  [suppliers, selectedSupplierId]);

  const supplierExpenses = useMemo(() => 
    expenses.filter(e => e.supplierId === selectedSupplierId).sort((a,b) => b.date - a.date),
  [expenses, selectedSupplierId]);

  // Invoice Logic
  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const addToInvoice = (product: Product) => {
    // Check if already in invoice
    if (invoiceItems.find(i => i.product.id === product.id)) {
      alert("El producto ya está en la lista.");
      return;
    }
    // Default margin calculation based on current cost/price if valid, else 30%
    let defaultMargin = 30;
    if (product.costPrice > 0 && product.sellingPrice > product.costPrice) {
       defaultMargin = ((product.sellingPrice - product.costPrice) / product.costPrice) * 100;
       defaultMargin = Math.round(defaultMargin);
    }

    setInvoiceItems(prev => [...prev, {
      product,
      newCost: product.costPrice,
      margin: defaultMargin,
      newPrice: product.sellingPrice,
      quantity: 0
    }]);
    setProductSearch('');
    setShowProductResults(false);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: number) => {
    setInvoiceItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      
      if (field === 'newCost' || field === 'margin') {
         item[field] = value;
         // Recalculate price with smart rounding
         const rawPrice = item.newCost * (1 + (item.margin / 100));
         item.newPrice = smartRound(rawPrice);
      } else if (field === 'newPrice') {
         item.newPrice = value;
         // Recalculate margin (reverse)
         if (item.newCost > 0) {
            item.margin = ((value - item.newCost) / item.newCost) * 100;
         }
      } else {
         (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return newItems;
    });
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const invoiceTotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.newCost * item.quantity), 0);
  }, [invoiceItems]);

  const handleFinalizeInvoice = () => {
    if (!selectedSupplierId || invoiceItems.length === 0) return;
    
    // 1. Prepare products to update
    const productsToUpdate: Product[] = invoiceItems.map(item => ({
      ...item.product,
      costPrice: item.newCost,
      sellingPrice: item.newPrice,
      stock: item.product.stock + item.quantity
    }));

    // 2. Call bulk update
    onBulkUpdateProducts(productsToUpdate);

    // 3. Register Expense (Purchase)
    if (invoiceTotal > 0) {
       onAddExpense(selectedSupplierId, invoiceTotal, `Factura ${new Date().toLocaleDateString()}`, 'PURCHASE', undefined);
    }

    // 4. Reset
    setShowInvoiceModal(false);
    setInvoiceItems([]);
    alert("Factura cargada y stock actualizado correctamente.");
  };

  // --- Handlers ---

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSupplier({
      name: newSupName,
      cuit: newSupCuit,
      phone: newSupPhone,
      email: newSupEmail
    });
    setShowAddModal(false);
    setNewSupName(''); setNewSupCuit(''); setNewSupPhone(''); setNewSupEmail('');
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    const amount = parseFloat(transAmount);
    if (!amount) return;

    onAddExpense(selectedSupplierId, amount, transDesc, transType, transType === 'PAYMENT' ? transMethod : undefined);
    setShowTransactionModal(false);
    setTransAmount('');
    setTransDesc('');
    setTransMethod('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Suppliers List */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${selectedSupplierId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Truck size={20} /> Proveedores
          </h3>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {suppliers.map(sup => (
            <div 
              key={sup.id}
              onClick={() => setSelectedSupplierId(sup.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                selectedSupplierId === sup.id 
                  ? 'bg-brand-50 border-brand-500 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-slate-300'
              }`}
            >
              <div>
                <h4 className="font-bold text-slate-800">{sup.name}</h4>
                <p className="text-xs text-slate-500">CUIT: {sup.cuit}</p>
              </div>
              <div className="text-right">
                <span className={`font-bold block ${sup.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                   {formatCurrency(sup.balance)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Saldo</span>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
             <div className="text-center text-slate-400 py-10">
               <p>No hay proveedores registrados</p>
             </div>
          )}
        </div>
      </div>

      {/* Supplier Details & Ledger */}
      <div className={`flex-[2] bg-white rounded-xl shadow-sm border border-slate-200 flex-col ${selectedSupplierId ? 'flex' : 'hidden lg:flex'}`}>
        {!selectedSupplier ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <Truck size={64} className="mb-4 opacity-20" />
            <p>Selecciona un proveedor para ver detalles</p>
          </div>
        ) : (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
               <div>
                  <button onClick={() => setSelectedSupplierId(null)} className="lg:hidden text-slate-500 mb-2 flex items-center gap-1">
                    <ChevronRight className="rotate-180" size={16} /> Volver
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedSupplier.name}</h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><FileText size={14}/> {selectedSupplier.cuit}</span>
                    {selectedSupplier.phone && <span className="flex items-center gap-1"><Phone size={14}/> {selectedSupplier.phone}</span>}
                    {selectedSupplier.email && <span className="flex items-center gap-1"><Mail size={14}/> {selectedSupplier.email}</span>}
                  </div>
               </div>
               <div className="text-right">
                 <p className="text-sm text-slate-500 mb-1">Deuda Actual</p>
                 <p className={`text-3xl font-bold ${selectedSupplier.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                   {formatCurrency(selectedSupplier.balance)}
                 </p>
               </div>
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-100">
               <button 
                 onClick={() => { setTransType('PURCHASE'); setShowTransactionModal(true); }}
                 className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
               >
                 <Plus size={18} /> Gasto Manual
               </button>
               <button 
                 onClick={() => setShowInvoiceModal(true)}
                 className="flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 shadow-md"
               >
                 <ShoppingCart size={18} /> Cargar Factura
               </button>
               <button 
                 onClick={() => { setTransType('PAYMENT'); setShowTransactionModal(true); }}
                 className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 shadow-md col-span-2 md:col-span-1"
               >
                 <DollarSign size={18} /> Registrar Pago
               </button>
            </div>

            {/* Ledger Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 font-medium border-b border-slate-200">
                   <tr>
                     <th className="pb-3 pl-2">Fecha</th>
                     <th className="pb-3">Descripción</th>
                     <th className="pb-3">Tipo</th>
                     <th className="pb-3 text-right pr-2">Monto</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className="py-3 pl-2 text-slate-600">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-800 font-medium">{expense.description}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${expense.type === 'PURCHASE' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {expense.type === 'PURCHASE' ? 'COMPRA' : 'PAGO'}
                        </span>
                      </td>
                      <td className={`py-3 text-right pr-2 font-mono font-bold ${expense.type === 'PURCHASE' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {expense.type === 'PAYMENT' && '-'}{formatCurrency(expense.amount)}
                      </td>
                    </tr>
                  ))}
                  {supplierExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">Sin movimientos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Nuevo Proveedor</h3>
             <form onSubmit={handleAddSupplier} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-600 mb-1">Nombre / Razón Social</label>
                   <input required type="text" value={newSupName} onChange={e => setNewSupName(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-600 mb-1">CUIT</label>
                   <input required type="text" value={newSupCuit} onChange={e => setNewSupCuit(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                    <input type="text" value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={newSupEmail} onChange={e => setNewSupEmail(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border rounded-lg text-slate-700">Cancelar</button>
                   <button type="submit" className="flex-1 py-2 bg-brand-600 text-white rounded-lg font-bold">Guardar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Invoice Load Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
              
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">Cargar Factura de {selectedSupplier?.name}</h3>
                    <p className="text-xs text-slate-500">Los costos y stock se actualizarán automáticamente.</p>
                 </div>
                 <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={24} className="rotate-45" /></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                 {/* Searcher */}
                 <div className="p-4 bg-white border-b border-slate-100 z-20 relative">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         type="text" 
                         placeholder="Buscar producto para agregar..."
                         value={productSearch}
                         onChange={e => { setProductSearch(e.target.value); setShowProductResults(true); }}
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                         autoFocus
                       />
                       {showProductResults && productSearch && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
                             {filteredProducts.map(p => (
                               <div 
                                 key={p.id} 
                                 onClick={() => addToInvoice(p)}
                                 className="p-3 hover:bg-brand-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                               >
                                  <span className="font-medium text-slate-700">{p.name}</span>
                                  <span className="text-xs text-slate-500">Stock: {p.stock}</span>
                               </div>
                             ))}
                             {filteredProducts.length === 0 && <div className="p-4 text-center text-slate-400">No encontrado</div>}
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Table */}
                 <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <table className="w-full text-left text-sm bg-white rounded-lg shadow-sm overflow-hidden">
                       <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                             <th className="px-4 py-3">Producto</th>
                             <th className="px-4 py-3 w-32">Costo Unit.</th>
                             <th className="px-4 py-3 w-24">% Gan.</th>
                             <th className="px-4 py-3 w-32">Precio Venta</th>
                             <th className="px-4 py-3 w-24">Cant.</th>
                             <th className="px-4 py-3 w-32 text-right">Subtotal</th>
                             <th className="px-2 py-3 w-10"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {invoiceItems.map((item, idx) => (
                             <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-800">{item.product.name}</td>
                                <td className="px-4 py-2">
                                   <input 
                                     type="number" min="0" step="0.01"
                                     value={item.newCost}
                                     onChange={e => updateInvoiceItem(idx, 'newCost', parseFloat(e.target.value) || 0)}
                                     className="w-full border rounded p-1 text-center"
                                   />
                                </td>
                                <td className="px-4 py-2">
                                   <input 
                                     type="number" min="0"
                                     value={item.margin}
                                     onChange={e => updateInvoiceItem(idx, 'margin', parseFloat(e.target.value) || 0)}
                                     className="w-full border rounded p-1 text-center bg-indigo-50 text-indigo-700 font-bold"
                                   />
                                </td>
                                <td className="px-4 py-2">
                                   <div className="flex items-center gap-1">
                                      <input 
                                        type="number" min="0"
                                        value={item.newPrice}
                                        onChange={e => updateInvoiceItem(idx, 'newPrice', parseFloat(e.target.value) || 0)}
                                        className="w-full border rounded p-1 text-center font-bold text-emerald-600"
                                      />
                                   </div>
                                   <div className="text-[10px] text-slate-400 text-center mt-0.5">Redondeado</div>
                                </td>
                                <td className="px-4 py-2">
                                   <input 
                                     type="number" min="1"
                                     value={item.quantity}
                                     onChange={e => updateInvoiceItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                     className="w-full border rounded p-1 text-center bg-orange-50 font-bold"
                                   />
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-slate-700">
                                   {formatCurrency(item.newCost * item.quantity)}
                                </td>
                                <td className="px-2 py-2 text-center">
                                   <button onClick={() => removeInvoiceItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </td>
                             </tr>
                          ))}
                          {invoiceItems.length === 0 && (
                             <tr><td colSpan={7} className="p-8 text-center text-slate-400">Agrega productos para comenzar la carga.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                 <div className="text-lg">
                    Total Factura: <span className="font-bold text-slate-900 text-2xl">{formatCurrency(invoiceTotal)}</span>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                    <button 
                      onClick={handleFinalizeInvoice}
                      disabled={invoiceItems.length === 0}
                      className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                       Confirmar Facturación <ArrowRight size={20} />
                    </button>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
           <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-800 mb-6">
                {transType === 'PURCHASE' ? 'Registrar Gasto / Compra' : 'Registrar Pago'}
              </h3>
              <form onSubmit={handleTransaction} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Monto ($)</label>
                    <input required type="number" step="0.01" min="0" value={transAmount} onChange={e => setTransAmount(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
                    <input required type="text" value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder={transType === 'PURCHASE' ? "Ej. Reposición Bebidas" : "Ej. Pago parcial Factura A"} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"/>
                 </div>
                 {transType === 'PAYMENT' && (
                   <div>
                     <label className="block text-sm font-medium text-slate-600 mb-1">Pagar desde Caja</label>
                     <select required value={transMethod} onChange={e => setTransMethod(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-900 border rounded-lg outline-none">
                       <option value="">Seleccionar Caja</option>
                       {paymentMethods.map(pm => (
                         <option key={pm.id} value={pm.id}>{pm.name} ({formatCurrency(pm.balance)})</option>
                       ))}
                     </select>
                   </div>
                 )}
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 py-2 border rounded-lg text-slate-700">Cancelar</button>
                    <button type="submit" className={`flex-1 py-2 text-white rounded-lg font-bold ${transType === 'PURCHASE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                      Confirmar
                    </button>
                 </div>
              </form>
           </div>
         </div>
      )}
    </div>
  );
};

export default Suppliers;
