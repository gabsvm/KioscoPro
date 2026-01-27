
import React, { useState, useMemo } from 'react';
import { Customer, Sale, PaymentMethod } from '../types';
import { Users, Plus, Search, Phone, CreditCard, ChevronRight, FileText, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils';

interface CustomersProps {
  customers: Customer[];
  sales: Sale[];
  paymentMethods: PaymentMethod[];
  onAddCustomer: (c: Omit<Customer, 'id' | 'lastPurchaseDate'>) => void;
  onCustomerPayment: (customerId: string, amount: number, methodId: string) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, sales, paymentMethods, onAddCustomer, onCustomerPayment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  // New Customer Form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDni, setNewDni] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.dni && c.dni.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter(s => s.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp);
  }, [sales, selectedCustomer]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({
      name: newName,
      phone: newPhone,
      dni: newDni,
      notes: '',
      balance: parseFloat(initialBalance) || 0
    });
    setShowAddModal(false);
    setNewName(''); setNewPhone(''); setNewDni(''); setInitialBalance('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(payAmount);
    if (amount <= 0 || !payMethod) return;

    onCustomerPayment(selectedCustomer.id, amount, payMethod);
    setShowPayModal(false);
    setPayAmount('');
    setPayMethod('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Customer List */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} /> Clientes / Fiados
            </h3>
            <button 
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-md shadow-brand-200"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text"
               placeholder="Buscar cliente..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {filteredCustomers.map(c => (
            <div 
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                selectedCustomer?.id === c.id 
                  ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-200' 
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <h4 className="font-bold text-slate-800">{c.name}</h4>
                {c.phone && <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10}/> {c.phone}</div>}
              </div>
              <div className="text-right">
                <span className={`font-bold block ${c.balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                   {formatCurrency(c.balance)}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Deuda</span>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && (
             <div className="text-center text-slate-400 py-10">
               <p>No hay clientes</p>
               <button onClick={() => setShowAddModal(true)} className="text-brand-600 text-sm font-bold mt-2 hover:underline">Crear uno nuevo</button>
             </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className={`flex-[2] bg-white rounded-xl shadow-sm border border-slate-200 flex-col overflow-hidden ${selectedCustomer ? 'flex' : 'hidden lg:flex'}`}>
         {selectedCustomer ? (
           <>
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <button onClick={() => setSelectedCustomer(null)} className="lg:hidden text-slate-500 mb-2 flex items-center gap-1 text-sm font-medium">
                    <ChevronRight className="rotate-180" size={16} /> Volver a lista
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {selectedCustomer.name}
                  </h2>
                  <div className="flex gap-4 mt-1 text-sm text-slate-500">
                     {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                     {selectedCustomer.dni && <span>DNI: {selectedCustomer.dni}</span>}
                  </div>
               </div>
               
               <div className="flex items-center gap-4 w-full md:w-auto bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-right flex-1">
                    <p className="text-xs text-slate-500 font-bold uppercase">Deuda Actual</p>
                    <p className={`text-2xl font-bold ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(selectedCustomer.balance)}
                    </p>
                  </div>
                  {selectedCustomer.balance > 0 && (
                    <button 
                      onClick={() => setShowPayModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-lg shadow-lg shadow-emerald-200 transition-transform active:scale-95"
                      title="Registrar Pago"
                    >
                      <CreditCard size={24} />
                    </button>
                  )}
               </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
               <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">Historial de Movimientos</h4>
               <div className="space-y-3">
                 {customerHistory.map(sale => (
                   <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            {sale.status === 'PENDING_PAYMENT' ? (
                               <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200">
                                 <Clock size={10} /> Fiado / Pendiente
                               </span>
                            ) : (
                               <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                                 <CheckCircle size={10} /> Pagado / Completado
                               </span>
                            )}
                            <span className="text-xs text-slate-400">{new Date(sale.timestamp).toLocaleString()}</span>
                         </div>
                         <p className="text-sm text-slate-600 font-medium">
                            {sale.items.length} productos: <span className="text-slate-500 font-normal">{sale.items.map(i => i.productName).join(', ')}</span>
                         </p>
                         {sale.paymentMethodName === 'Abono de Deuda' && (
                            <p className="text-emerald-600 text-sm font-bold italic mt-1">Pago a cuenta</p>
                         )}
                      </div>
                      <div className="font-bold text-lg whitespace-nowrap">
                        {sale.paymentMethodName === 'Abono de Deuda' ? (
                           <span className="text-emerald-600">-{formatCurrency(sale.totalAmount)}</span>
                        ) : (
                           <span className="text-slate-800">{formatCurrency(sale.totalAmount)}</span>
                        )}
                      </div>
                   </div>
                 ))}
                 {customerHistory.length === 0 && (
                   <div className="text-center text-slate-400 py-10 italic">
                     Sin historial de compras
                   </div>
                 )}
               </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <Users size={64} className="mb-4 opacity-20" />
              <p>Selecciona un cliente para ver su cuenta corriente</p>
           </div>
         )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
           <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Nuevo Cliente</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                 <input 
                   required
                   autoFocus
                   placeholder="Nombre Completo"
                   value={newName}
                   onChange={e => setNewName(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 />
                 <input 
                   placeholder="Teléfono (Opcional)"
                   value={newPhone}
                   onChange={e => setNewPhone(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 />
                 <input 
                   placeholder="DNI (Opcional)"
                   value={newDni}
                   onChange={e => setNewDni(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 />
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Saldo Inicial / Deuda Previa</label>
                   <input 
                     type="number"
                     step="0.01"
                     placeholder="0.00"
                     value={initialBalance}
                     onChange={e => setInitialBalance(e.target.value)}
                     className="w-full px-4 py-2 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                   />
                   <p className="text-[10px] text-slate-400 mt-1">Usa esto para cargar deudores existentes.</p>
                 </div>

                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-lg shadow-brand-200">Guardar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
           <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Registrar Pago</h3>
              <p className="text-sm text-slate-500 mb-4">Abonar deuda de {selectedCustomer?.name}</p>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-4 text-center">
                 <span className="text-xs text-red-600 uppercase font-bold">Total adeudado</span>
                 <div className="text-2xl font-bold text-red-700">{formatCurrency(selectedCustomer?.balance || 0)}</div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Monto a abonar</label>
                    <input 
                      required
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0"
                      max={selectedCustomer?.balance}
                      placeholder="0.00"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      className="w-full px-4 py-3 text-xl font-bold text-slate-800 bg-white border-2 border-slate-200 rounded-xl focus:border-brand-500 outline-none"
                    />
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Método de Pago</label>
                    <select 
                      required
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none"
                    >
                       <option value="">Seleccionar...</option>
                       {paymentMethods.filter(pm => pm.type !== 'CREDIT').map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                       ))}
                    </select>
                 </div>

                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600">Confirmar Pago</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
