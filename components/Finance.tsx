import React, { useState } from 'react';
import { Wallet, ArrowRightLeft, Plus, History } from 'lucide-react';
import { PaymentMethod, Transfer } from '../types';

interface FinanceProps {
  paymentMethods: PaymentMethod[];
  transfers: Transfer[];
  onAddMethod: (name: string, type: PaymentMethod['type']) => void;
  onTransfer: (fromId: string, toId: string, amount: number, note: string) => void;
}

const Finance: React.FC<FinanceProps> = ({ paymentMethods, transfers, onAddMethod, onTransfer }) => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNewMethodModal, setShowNewMethodModal] = useState(false);

  // Transfer State
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // New Method State
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<PaymentMethod['type']>('CASH');

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

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMethod(newMethodName, newMethodType);
    setShowNewMethodModal(false);
    setNewMethodName('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Finanzas</h2>
          <p className="text-slate-500">Gestiona tus cajas y métodos de pago</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowNewMethodModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <Plus size={18} /> Nueva Caja
          </button>
          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <ArrowRightLeft size={18} /> Transferir Fondos
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map(method => (
          <div key={method.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet size={64} className="text-brand-600" />
            </div>
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{method.type}</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{method.name}</h3>
              <div className="mt-4 text-3xl font-bold text-brand-600">
                ${method.balance.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transfers */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History size={20} className="text-slate-500" />
          <h3 className="font-bold text-slate-800">Movimientos Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Origen</th>
                <th className="px-6 py-3">Destino</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.slice().reverse().map(t => {
                const fromName = paymentMethods.find(p => p.id === t.fromMethodId)?.name || 'Desconocido';
                const toName = paymentMethods.find(p => p.id === t.toMethodId)?.name || 'Desconocido';
                return (
                  <tr key={t.id}>
                    <td className="px-6 py-3 text-slate-600">{new Date(t.timestamp).toLocaleDateString()}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{fromName}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{toName}</td>
                    <td className="px-6 py-3 font-bold text-indigo-600">${t.amount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-500 italic">{t.note}</td>
                  </tr>
                );
              })}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Sin movimientos registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                       <option key={m.id} value={m.id}>{m.name} (${m.balance})</option>
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

      {/* New Method Modal */}
      {showNewMethodModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Nueva Caja / Método</h3>
             <form onSubmit={handleAddMethod} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
                  <input 
                    type="text"
                    required 
                    value={newMethodName}
                    onChange={e => setNewMethodName(e.target.value)}
                    placeholder="Ej. MercadoPago, Banco Nación"
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                 <select 
                    value={newMethodType}
                    onChange={e => setNewMethodType(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 >
                   <option value="CASH">Efectivo</option>
                   <option value="CARD">Tarjeta</option>
                   <option value="DIGITAL">Billetera Virtual</option>
                   <option value="OTHER">Otro</option>
                 </select>
               </div>
               <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewMethodModal(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Crear
                </button>
              </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;