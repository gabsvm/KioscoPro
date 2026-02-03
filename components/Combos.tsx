
import React, { useState } from 'react';
import { Layers, Plus, Trash2, Search, X, Package, ArrowRight, ToggleLeft, ToggleRight, AlertCircle, PlusCircle, CheckSquare, Square, Pencil } from 'lucide-react';
import { Combo, Product, ComboPart } from '../types';
import { formatCurrency } from '../utils';

interface CombosProps {
  combos: Combo[];
  products: Product[];
  onAddCombo: (p: Omit<Combo, 'id'>) => void;
  onUpdateCombo: (p: Combo) => void;
  onDeleteCombo: (id: string) => void;
  onToggleCombo: (id: string, isActive: boolean) => void;
}

const Combos: React.FC<CombosProps> = ({ combos, products, onAddCombo, onUpdateCombo, onDeleteCombo, onToggleCombo }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [parts, setParts] = useState<ComboPart[]>([
    { name: 'Parte 1', eligibleProductIds: [], limit: 1 }
  ]);
  
  // Product Selection helper
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const handleSaveCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (parts.some(p => p.eligibleProductIds.length === 0)) {
       alert("Cada parte del combo debe tener al menos un producto elegido.");
       return;
    }
    if (parts.some(p => p.limit < 1)) {
        alert("La cantidad a elegir por parte debe ser al menos 1.");
        return;
    }

    if (editingComboId) {
      onUpdateCombo({
        id: editingComboId,
        name: comboName,
        price: parseFloat(comboPrice),
        parts: parts,
        isActive: combos.find(c => c.id === editingComboId)?.isActive ?? true
      });
    } else {
      onAddCombo({
        name: comboName,
        price: parseFloat(comboPrice),
        parts: parts,
        isActive: true
      });
    }

    setShowModal(false);
    resetForm();
  };

  const openEditModal = (combo: Combo) => {
    setEditingComboId(combo.id);
    setComboName(combo.name);
    setComboPrice(combo.price.toString());
    setParts(JSON.parse(JSON.stringify(combo.parts))); // Deep copy
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingComboId(null);
    setComboName('');
    setComboPrice('');
    setParts([{ name: 'Parte 1', eligibleProductIds: [], limit: 1 }]);
    setProductSearch('');
    setActivePartIndex(null);
  };

  const addPart = () => {
    setParts([...parts, { name: `Parte ${parts.length + 1}`, eligibleProductIds: [], limit: 1 }]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePartName = (index: number, name: string) => {
    const n = [...parts];
    n[index].name = name;
    setParts(n);
  };

  const updatePartLimit = (index: number, limit: number) => {
    const n = [...parts];
    n[index].limit = Math.max(1, limit);
    setParts(n);
  };

  const toggleProductInPart = (partIndex: number, productId: string) => {
     const n = [...parts];
     const currentIds = n[partIndex].eligibleProductIds;
     if (currentIds.includes(productId)) {
        n[partIndex].eligibleProductIds = currentIds.filter(id => id !== productId);
     } else {
        n[partIndex].eligibleProductIds = [...currentIds, productId];
     }
     setParts(n);
  };

  const filteredCombos = combos.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Layers className="text-indigo-600" /> Gestión de Combos
           </h2>
           <p className="text-slate-500 text-sm">Crea combos de varios productos con precio fijo.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
        >
          <Plus size={20} /> Nuevo Combo
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar combo..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredCombos.map(combo => (
             <div key={combo.id} className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${combo.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers size={20} /></div>
                   <div className="flex gap-1">
                      <button onClick={() => openEditModal(combo)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Pencil size={18} /></button>
                      <button onClick={() => onDeleteCombo(combo.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                   </div>
                </div>
                <div>
                   <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{combo.name}</h3>
                   <div className="space-y-1 mt-2">
                      {combo.parts.map((p, i) => (
                         <div key={i} className="text-xs text-slate-500 flex items-center gap-1">
                            <ArrowRight size={10} className="text-indigo-400" />
                            <span className="font-bold">{p.name} (x{p.limit || 1}):</span> {p.eligibleProductIds.length} opciones
                         </div>
                      ))}
                   </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                   <span className="text-2xl font-black text-indigo-600">{formatCurrency(combo.price)}</span>
                   <button onClick={() => onToggleCombo(combo.id, !combo.isActive)}>
                      {combo.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-300" />}
                   </button>
                </div>
             </div>
           ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-xl font-bold text-slate-800">{editingComboId ? 'Editar Combo' : 'Definir Nuevo Combo'}</h3>
                 <button onClick={() => setShowModal(false)}><X size={24} className="text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Combo</label>
                       <input value={comboName} onChange={e => setComboName(e.target.value)} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej. Empanada + Bebida" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Precio del Combo ($)</label>
                       <input type="number" value={comboPrice} onChange={e => setComboPrice(e.target.value)} className="w-full mt-1 px-4 py-2 border rounded-lg outline-none font-bold text-indigo-600 text-xl" placeholder="2000" />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <h4 className="font-bold text-slate-700">Partes del Combo</h4>
                       <button onClick={addPart} className="text-indigo-600 font-bold text-sm flex items-center gap-1"><PlusCircle size={16} /> Agregar Parte</button>
                    </div>

                    {parts.map((part, pIdx) => (
                       <div key={pIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 transition-all">
                          <div className="flex justify-between items-start gap-4">
                             <div className="flex-1 space-y-3">
                                <input 
                                   value={part.name} 
                                   onChange={e => updatePartName(pIdx, e.target.value)}
                                   className="w-full bg-white border p-2 rounded font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Nombre de la parte (Ej. Empanadas)"
                                />

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white px-2 py-1.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={(part.limit || 1) > 1}
                                            onChange={e => updatePartLimit(pIdx, e.target.checked ? 2 : 1)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                        />
                                        <span>Selección Múltiple (Más de 1)</span>
                                    </label>

                                    {(part.limit || 1) > 1 && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                            <span className="text-xs font-bold text-slate-500">Cantidad:</span>
                                            <input 
                                                type="number"
                                                min="2"
                                                value={part.limit}
                                                onChange={e => updatePartLimit(pIdx, parseInt(e.target.value))}
                                                className="w-16 p-1.5 border border-slate-300 rounded text-center font-bold text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            />
                                        </div>
                                    )}
                                </div>
                             </div>
                             <button onClick={() => removePart(pIdx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={20}/></button>
                          </div>
                          
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Productos Elegibles ({part.eligibleProductIds.length})</label>
                             <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                   placeholder="Buscar productos para incluir..." 
                                   className="w-full pl-8 pr-4 py-1.5 text-xs border rounded bg-white outline-none focus:border-indigo-300 transition-colors"
                                   onChange={e => {
                                      setProductSearch(e.target.value);
                                      setActivePartIndex(pIdx);
                                   }}
                                />
                             </div>
                             
                             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                                {products.filter(p => !productSearch || activePartIndex !== pIdx || p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                   <button 
                                      key={p.id}
                                      onClick={() => toggleProductInPart(pIdx, p.id)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${part.eligibleProductIds.includes(p.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                   >
                                      {p.name}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex gap-3">
                 <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                 <button onClick={handleSaveCombo} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700">Guardar Combo</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Combos;
