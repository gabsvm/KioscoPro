
import React, { useState, useMemo } from 'react';
import { Wallet, ArrowRightLeft, Plus, History, Pencil, Trash2, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, ClipboardList, X, Calendar, ArrowRight, EyeOff } from 'lucide-react';
import { PaymentMethod, Transfer, CashMovement, Sale } from '../types';
import { formatCurrency } from '../utils';

interface FinanceProps {
  paymentMethods: PaymentMethod[];
  transfers: Transfer[];
  cashMovements?: CashMovement[];
  sales?: Sale[]; // Add sales to construct full history
  onAddMethod: (name: string, type: PaymentMethod['type'], isHidden?: boolean) => void;
  onUpdateMethod: (id: string, name: string, type: PaymentMethod['type'], isHidden?: boolean) => void;
  onDeleteMethod: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number, note: string) => void;
  onAddCashMovement?: (type: 'INCOME' | 'EXPENSE', amount: number, description: string, methodId: string) => void;
}

// Internal type for unified history
type TransactionHistoryItem = {
  id: string;
  timestamp: number;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  source: 'SALE' | 'TRANSFER' | 'MANUAL';
};

const Finance: React.FC<FinanceProps> = ({ 
  paymentMethods, 
  transfers, 
  cashMovements = [], 
  sales = [],
  onAddMethod, 
  onUpdateMethod, 
  onDeleteMethod, 
  onTransfer,
  onAddCashMovement 
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  
  // History Modal State
  const [historyMethodId, setHistoryMethodId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'WEEK' | 'TWO_WEEKS' | 'MONTH'>('WEEK');

  // Transfer State
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Movement State
  const [movType, setMovType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movMethodId, setMovMethodId] = useState('');

  // Method Modal State (Create/Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [methodName, setMethodName] = useState('');
  const [methodType, setMethodType] = useState<PaymentMethod['type']>('CASH');
  const [isHiddenInSellerMode, setIsHiddenInSellerMode] = useState(false);

  // --- Logic for Box History ---
  const selectedHistoryMethod = paymentMethods.find(m => m.id === historyMethodId);

  const getFilteredHistory = useMemo(() => {
    if (!historyMethodId) return [];

    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'WEEK') startDate.setDate(now.getDate() - 7);
    if (dateFilter === 'TWO_WEEKS') startDate.setDate(now.getDate() - 14);
    if (dateFilter === 'MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const startTime = startDate.getTime();
    const history: TransactionHistoryItem[] = [];

    // 1. Sales (Income)
    sales.forEach(sale => {
      if (sale.timestamp < startTime) return;
      
      // Check for split payments
      if (sale.payments && sale.payments.length > 0) {
         const payment = sale.payments.find(p => p.methodId === historyMethodId);
         if (payment) {
            history.push({
               id: `sale-${sale.id}`,
               timestamp: sale.timestamp,
               type: 'IN',
               amount: payment.amount,
               description: `Venta #${sale.id.slice(-4)} (Mixto)`,
               source: 'SALE'
            });
         }
      } 
      // Single payment
      else if (sale.paymentMethodId === historyMethodId) {
         history.push({
            id: `sale-${sale.id}`,
            timestamp: sale.timestamp,
            type: 'IN',
            amount: sale.totalAmount,
            description: sale.paymentMethodName === 'Abono de Deuda' ? `Pago Cliente (${sale.items[0]?.productName || 'Abono'})` : `Venta #${sale.id.slice(-4)}`,
            source: 'SALE'
         });
      }
    });

    // 2. Transfers (In/Out)
    transfers.forEach(t => {
       if (t.timestamp < startTime) return;
       if (t.fromMethodId === historyMethodId) {
          history.push({
             id: `tr-out-${t.id}`,
             timestamp: t.timestamp,
             type: 'OUT',
             amount: t.amount,
             description: `Transferencia a ${paymentMethods.find(m => m.id === t.toMethodId)?.name || '...'}`,
             source: 'TRANSFER'
          });
       }
       if (t.toMethodId === historyMethodId) {
          history.push({
             id: `tr-in-${t.id}`,
             timestamp: t.timestamp,
             type: 'IN',
             amount: t.amount,
             description: `Transferencia desde ${paymentMethods.find(m => m.id === t.fromMethodId)?.name || '...'}`,
             source: 'TRANSFER'
          });
       }
    });

    // 3. Manual Movements (In/Out)
    cashMovements.forEach(m => {
       if (m.timestamp < startTime || m.methodId !== historyMethodId) return;
       history.push({
          id: `mov-${m.id}`,
          timestamp: m.timestamp,
          type: m.type === 'INCOME' ? 'IN' : 'OUT',
          amount: m.amount,
          description: m.description,
          source: 'MANUAL'
       });
    });

    return history.sort((a,b) => b.timestamp - a.timestamp);
  }, [historyMethodId, dateFilter, sales, transfers, cashMovements, paymentMethods]);

  const historyTotals = useMemo(() => {
     return getFilteredHistory.reduce((acc, curr) => {
        if (curr.type === 'IN') acc.in += curr.amount;
        else acc.out += curr.amount;
        return acc;
     }, { in: 0, out: 0 });
  }, [getFilteredHistory]);

  const openCreateModal = () => {
    setEditingId(null);
    setMethodName('');
    setMethodType('CASH');
    setIsHiddenInSellerMode(false);
    setShowMethodModal(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingId(method.id);
    setMethodName(method.name);
    setMethodType(method.type);
    setIsHiddenInSellerMode(!!method.isHiddenInSellerMode);
    setShowMethodModal(true);
  };

  const handleMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateMethod(editingId, methodName, methodType, isHiddenInSellerMode);
    } else {
      onAddMethod(methodName, methodType, isHiddenInSellerMode);
    }
    setShowMethodModal(false);
    setMethodName('');
    setEditingId(null);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromId === toId) {
      alert("La caja de origen y destino deben ser diferentes");
      return;
    }
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    onTransfer(fromId, toId, val, note);
    setShowTransferModal(false);
    setAmount('');
    setNote('');
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movAmount);
    if (!val || val <= 0 || !movMethodId || !onAddCashMovement) return;

    onAddCashMovement(movType, val, movDesc, movMethodId);
    setShowMovementModal(false);
    setMovAmount('');
    setMovDesc('');
  };

  const confirmDelete = () => {
    if (methodToDelete) {
      onDeleteMethod(methodToDelete.id);
      setMethodToDelete(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Finanzas</h2>
          <p className="text-slate-500">Gestiona tus cajas, movimientos y cierres</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={openCreateModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Plus size={18} /> Nueva Caja
          </button>
          
          {onAddCashMovement && (
            <button 
              onClick={() => setShowMovementModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 shadow-md"
            >
              <ClipboardList size={18} /> Registrar Movimiento
            </button>
          )}

          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <ArrowRightLeft size={18} /> Transferir
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map(method => (
          <div key={method.id} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow ${method.isHiddenInSellerMode ? 'ring-2 ring-slate-100 ring-offset-2' : ''}`}>
            
            {/* Action Buttons */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
               <button 
                 onClick={() => setHistoryMethodId(method.id)}
                 className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-slate-500"
                 title="Ver Historial"
               >
                 <History size={16} />
               </button>
               <button 
                 onClick={() => openEditModal(method)}
                 className="p-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-500"
                 title="Editar"
               >
                 <Pencil size={16} />
               </button>
               <button 
                 onClick={() => setMethodToDelete(method)}
                 className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-slate-500"
                 title="Eliminar"
               >
                 <Trash2 size={16} />
               </button>
            </div>

            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity z-10">
              <Wallet size={64} className="text-brand-600" />
            </div>
            
            <div className="relative z-10 cursor-pointer" onClick={() => setHistoryMethodId(method.id)}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{method.type}</span>
                {method.isHiddenInSellerMode && (
                  <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                    <EyeOff size={10} /> OCULTA
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mt-1 pr-16 truncate">{method.name}</h3>
              <div className="mt-4 text-3xl font-bold text-brand-600">
                {formatCurrency(method.balance)}
              </div>
              <div className="mt-2 text-xs text-brand-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 Ver Historial <ArrowRight size={12} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Movements Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-96">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <ClipboardList size={20} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">Movimientos de Caja</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-2">Fecha</th>
                            <th className="px-4 py-2">Desc.</th>
                            <th className="px-4 py-2">Caja</th>
                            <th className="px-4 py-2 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {cashMovements.slice().reverse().map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                    {new Date(m.timestamp).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-700">
                                    <div className="truncate max-w-[120px]" title={m.description}>{m.description}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">{m.methodName}</td>
                                <td className={`px-4 py-3 text-right font-bold ${m.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {m.type === 'INCOME' ? '+' : '-'}{formatCurrency(m.amount).replace('$','')}
                                </td>
                            </tr>
                        ))}
                        {cashMovements.length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-slate-400">Sin movimientos</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Recent Transfers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-96">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <History size={20} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">Historial Transferencias</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-2">Fecha</th>
                            <th className="px-4 py-2">Origen &rarr; Destino</th>
                            <th className="px-4 py-2 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transfers.slice().reverse().map(t => {
                            const fromName = paymentMethods.find(p => p.id === t.fromMethodId)?.name || '...';
                            const toName = paymentMethods.find(p => p.id === t.toMethodId)?.name || '...';
                            return (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(t.timestamp).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-slate-700 text-xs">
                                        <span className="font-bold">{fromName}</span> &rarr; {toName}
                                        {t.note && <div className="text-[10px] text-slate-400 italic mt-0.5">{t.note}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatCurrency(t.amount)}</td>
                                </tr>
                            );
                        })}
                        {transfers.length === 0 && (
                            <tr><td colSpan={3} className="p-6 text-center text-slate-400">Sin transferencias</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Manual Movement Modal */}
      {showMovementModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Registrar Movimiento</h3>
                  <form onSubmit={handleMovementSubmit} className="space-y-4">
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button
                              type="button"
                              onClick={() => setMovType('EXPENSE')}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all ${movType === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              <TrendingDown size={16} /> Egreso / Gasto
                          </button>
                          <button
                              type="button"
                              onClick={() => setMovType('INCOME')}
                              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold text-sm transition-all ${movType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              <TrendingUp size={16} /> Ingreso / Inyección
                          </button>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Monto ($)</label>
                          <input
                              type="number"
                              step="0.01"
                              required
                              min="0"
                              value={movAmount}
                              onChange={e => setMovAmount(e.target.value)}
                              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Caja Afectada</label>
                          <select
                              required
                              value={movMethodId}
                              onChange={e => setMovMethodId(e.target.value)}
                              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                          >
                              <option value="">Seleccionar...</option>
                              {paymentMethods.map(m => (
                                  <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.balance)})</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
                          <input
                              type="text"
                              required
                              placeholder={movType === 'EXPENSE' ? "Ej. Compra lavandina" : "Ej. Aporte capital inicial"}
                              value={movDesc}
                              onChange={e => setMovDesc(e.target.value)}
                              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button
                              type="button"
                              onClick={() => setShowMovementModal(false)}
                              className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                          >
                              Cancelar
                          </button>
                          <button
                              type="submit"
                              className={`flex-1 py-2 text-white rounded-lg hover:opacity-90 font-medium ${movType === 'INCOME' ? 'bg-emerald-600' : 'bg-red-600'}`}
                          >
                              Confirmar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Transferir Dinero</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-600 mb-1">Desde</label>
                   <select 
                     required
                     value={fromId}
                     onChange={e => setFromId(e.target.value)}
                     className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   >
                     <option value="">Seleccionar</option>
                     {paymentMethods.map(m => (
                       <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.balance)})</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-600 mb-1">Para</label>
                   <select 
                     required
                     value={toId}
                     onChange={e => setToId(e.target.value)}
                     className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   >
                     <option value="">Seleccionar</option>
                     {paymentMethods.map(m => (
                       <option key={m.id} value={m.id}>{m.name}</option>
                     ))}
                   </select>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nota (Opcional)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Method Modal (Create / Edit) */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
             <h3 className="text-xl font-bold text-slate-800 mb-6">{editingId ? 'Editar Caja' : 'Nueva Caja / Método'}</h3>
             <form onSubmit={handleMethodSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
                  <input 
                    type="text"
                    required 
                    value={methodName}
                    onChange={e => setMethodName(e.target.value)}
                    placeholder="Ej. MercadoPago, Banco Nación"
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                 <select 
                    value={methodType}
                    onChange={e => setMethodType(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 >
                   <option value="CASH">Efectivo</option>
                   <option value="CARD">Tarjeta</option>
                   <option value="DIGITAL">Billetera Virtual</option>
                   <option value="OTHER">Otro</option>
                 </select>
               </div>
               
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                 <input 
                   type="checkbox" 
                   id="hideMethod" 
                   checked={isHiddenInSellerMode} 
                   onChange={e => setIsHiddenInSellerMode(e.target.checked)}
                   className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                 />
                 <label htmlFor="hideMethod" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2 select-none">
                   <EyeOff size={18} className="text-slate-500" /> Ocultar en modo vendedor
                 </label>
               </div>

               <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMethodModal(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear'}
                </button>
              </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {methodToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${methodToDelete.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                {methodToDelete.balance > 0 ? <AlertTriangle size={32} /> : <Trash2 size={32} />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                ¿Eliminar {methodToDelete.name}?
              </h3>
              
              {methodToDelete.balance > 0 ? (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-sm font-bold text-red-800">¡Advertencia! Esta caja tiene saldo.</p>
                      <p className="text-xs text-red-700 mt-1">Saldo actual: <span className="font-bold">{formatCurrency(methodToDelete.balance)}</span></p>
                      <p className="text-xs text-red-600 mt-1">Si la eliminas, este dinero desaparecerá de los registros financieros.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 mb-6 text-sm">
                  Esta acción no se puede deshacer.
                </p>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setMethodToDelete(null)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyMethodId && selectedHistoryMethod && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
               {/* Modal Header */}
               <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                  <div>
                     <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History size={20} className="text-indigo-600"/> Historial: {selectedHistoryMethod.name}
                     </h3>
                     <p className="text-xs text-slate-500">Saldo actual: <span className="font-bold text-slate-700">{formatCurrency(selectedHistoryMethod.balance)}</span></p>
                  </div>
                  <button onClick={() => setHistoryMethodId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
               </div>

               {/* Date Filters */}
               <div className="p-4 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0">
                  <button 
                     onClick={() => setDateFilter('WEEK')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${dateFilter === 'WEEK' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                     Últimos 7 días
                  </button>
                  <button 
                     onClick={() => setDateFilter('TWO_WEEKS')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${dateFilter === 'TWO_WEEKS' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                     Últimos 14 días
                  </button>
                  <button 
                     onClick={() => setDateFilter('MONTH')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${dateFilter === 'MONTH' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >
                     Este Mes
                  </button>
               </div>

               {/* Summary Cards */}
               <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                  <div className="bg-white p-2 rounded-lg border border-emerald-100 text-center shadow-sm">
                     <span className="text-[10px] uppercase font-bold text-emerald-600">Ingresos</span>
                     <div className="text-sm md:text-base font-bold text-emerald-700">+{formatCurrency(historyTotals.in)}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-red-100 text-center shadow-sm">
                     <span className="text-[10px] uppercase font-bold text-red-600">Egresos</span>
                     <div className="text-sm md:text-base font-bold text-red-700">-{formatCurrency(historyTotals.out)}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100 text-center shadow-sm">
                     <span className="text-[10px] uppercase font-bold text-indigo-600">Balance Periodo</span>
                     <div className="text-sm md:text-base font-bold text-indigo-700">
                        {formatCurrency(historyTotals.in - historyTotals.out)}
                     </div>
                  </div>
               </div>

               {/* Transaction List */}
               <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                        <tr>
                           <th className="px-4 py-3 font-medium">Fecha</th>
                           <th className="px-4 py-3 font-medium">Detalle</th>
                           <th className="px-4 py-3 font-medium text-right">Monto</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {getFilteredHistory.map((item) => (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                 <div className="font-medium text-slate-700">{new Date(item.timestamp).toLocaleDateString()}</div>
                                 <div>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                       item.source === 'SALE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                       item.source === 'TRANSFER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                       'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                       {item.source === 'SALE' ? 'VENTA' : item.source === 'TRANSFER' ? 'TRANSF' : 'MANUAL'}
                                    </span>
                                    <span className="font-medium text-slate-700 truncate max-w-[150px] md:max-w-xs">{item.description}</span>
                                 </div>
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${item.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                                 {item.type === 'IN' ? '+' : '-'}{formatCurrency(item.amount).replace('$','')}
                              </td>
                           </tr>
                        ))}
                        {getFilteredHistory.length === 0 && (
                           <tr>
                              <td colSpan={3} className="py-12 text-center text-slate-400">
                                 <Calendar size={32} className="mx-auto mb-2 opacity-20"/>
                                 No hay movimientos en este periodo.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Finance;
