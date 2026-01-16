import React, { useState, useMemo } from 'react';
import { Truck, Plus, DollarSign, FileText, ChevronRight, Phone, Mail } from 'lucide-react';
import { Supplier, Expense, PaymentMethod } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SuppliersProps {
  suppliers: Supplier[];
  expenses: Expense[];
  paymentMethods: PaymentMethod[];
  onAddSupplier: (s: Omit<Supplier, 'id' | 'balance'>) => void;
  onAddExpense: (supplierId: string, amount: number, description: string, type: 'PURCHASE' | 'PAYMENT', paymentMethodId?: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, expenses, paymentMethods, onAddSupplier, onAddExpense }) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
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

  const selectedSupplier = useMemo(() => 
    suppliers.find(s => s.id === selectedSupplierId), 
  [suppliers, selectedSupplierId]);

  const supplierExpenses = useMemo(() => 
    expenses.filter(e => e.supplierId === selectedSupplierId).sort((a,b) => b.date - a.date),
  [expenses, selectedSupplierId]);

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
                   ${sup.balance.toFixed(2)}
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
                   ${selectedSupplier.balance.toFixed(2)}
                 </p>
               </div>
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-100">
               <button 
                 onClick={() => { setTransType('PURCHASE'); setShowTransactionModal(true); }}
                 className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
               >
                 <Plus size={18} /> Registrar Compra (Gasto)
               </button>
               <button 
                 onClick={() => { setTransType('PAYMENT'); setShowTransactionModal(true); }}
                 className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
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
                        {expense.type === 'PAYMENT' && '-'}${expense.amount.toFixed(2)}
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
                         <option key={pm.id} value={pm.id}>{pm.name} (${pm.balance.toFixed(2)})</option>
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