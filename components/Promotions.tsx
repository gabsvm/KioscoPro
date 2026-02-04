
import React, { useState } from 'react';
import { Tag, Plus, Trash2, Search, X, Package, ArrowRight, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { Promotion, Product } from '../types';
import { formatCurrency } from '../utils';

interface PromotionsProps {
  promotions: Promotion[];
  products: Product[];
  onAddPromotion: (p: Omit<Promotion, 'id'>) => void;
  onDeletePromotion: (id: string) => void;
  onTogglePromotion: (id: string, isActive: boolean) => void;
}

const Promotions: React.FC<PromotionsProps> = ({ promotions, products, onAddPromotion, onDeletePromotion, onTogglePromotion }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [promoName, setPromoName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [triggerQty, setTriggerQty] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  
  // Product Selector Search
  const [productSearch, setProductSearch] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    onAddPromotion({
      name: promoName,
      productId: selectedProductId,
      triggerQuantity: parseInt(triggerQty),
      promotionalPrice: parseFloat(promoPrice),
      isActive: true
    });

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setPromoName('');
    setSelectedProductId('');
    setTriggerQty('');
    setPromoPrice('');
    setProductSearch('');
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Filter existing promotions by promo name OR product name
  const filteredPromotions = promotions.filter(p => {
    const product = products.find(prod => prod.id === p.productId);
    const term = (searchTerm || "").toLowerCase();
    return (p.name || "").toLowerCase().includes(term) || (product && (product.name || "").toLowerCase().includes(term));
  });

  // Filter products in the modal dropdown
  const filteredProductsForSelect = products.filter(p => 
    (p.name || "").toLowerCase().includes((productSearch || "").toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Tag className="text-indigo-600" /> Promociones
           </h2>
           <p className="text-slate-500 text-sm">Configura descuentos automáticos por cantidad.</p>
        </div>
        <button 
          onClick={() => { setShowModal(true); resetForm(); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
        >
          <Plus size={20} /> Nueva Promo
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {/* Header List */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar promoción o producto..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
             />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredPromotions.map(promo => {
             const product = products.find(p => p.id === promo.productId);
             return (
               <div key={promo.id} className={`border rounded-xl p-4 flex flex-col justify-between relative group transition-all ${promo.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                  
                  <div className="flex justify-between items-start mb-2">
                     <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Tag size={20} />
                     </div>
                     <button 
                       onClick={() => onDeletePromotion(promo.id)}
                       className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>

                  <div>
                     <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{promo.name}</h3>
                     <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Package size={14} /> {product ? product.name : 'Producto Eliminado'}
                     </p>
                  </div>

                  <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                     <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500">Normal</span>
                        <span className="font-medium line-through text-slate-400">{formatCurrency(product?.sellingPrice || 0)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-indigo-600 flex items-center gap-1">
                           Llevando {promo.triggerQuantity}+
                           <ArrowRight size={14} />
                        </span>
                        <span className="text-emerald-600 text-lg">{formatCurrency(promo.promotionalPrice)}</span>
                     </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                     <span className={`text-xs font-bold uppercase ${promo.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {promo.isActive ? 'Activa' : 'Pausada'}
                     </span>
                     <button onClick={() => onTogglePromotion(promo.id, !promo.isActive)} className="text-indigo-600 hover:text-indigo-800">
                        {promo.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-300" />}
                     </button>
                  </div>
               </div>
             );
           })}
           
           {filteredPromotions.length === 0 && (
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                <Tag size={48} className="mb-4 opacity-20" />
                <p>No hay promociones coincidentes.</p>
             </div>
           )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Nueva Promoción</h3>
                  <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               
               <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Promo</label>
                     <input 
                       autoFocus
                       required
                       placeholder="Ej. 3 Harinas x $1500"
                       value={promoName}
                       onChange={e => setPromoName(e.target.value)}
                       className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Producto</label>
                     <div className="mt-1 border rounded-lg overflow-hidden bg-white">
                        <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
                           <Search size={14} className="text-slate-400" />
                           <input 
                              type="text" 
                              placeholder="Filtrar productos..."
                              value={productSearch}
                              onChange={e => setProductSearch(e.target.value)}
                              className="bg-transparent outline-none text-sm w-full"
                           />
                        </div>
                        <select 
                          required
                          size={5}
                          value={selectedProductId}
                          onChange={e => setSelectedProductId(e.target.value)}
                          className="w-full px-2 py-2 outline-none bg-white text-sm"
                        >
                           {filteredProductsForSelect.length === 0 && <option disabled>No hay productos coincidentes</option>}
                           {filteredProductsForSelect.map(p => (
                              <option key={p.id} value={p.id} className="py-1">{p.name} (Actual: {formatCurrency(p.sellingPrice)})</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  
                  {selectedProduct && (
                     <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Llevando (Cant.)</label>
                           <input 
                             type="number"
                             min="2"
                             required
                             placeholder="Ej. 3"
                             value={triggerQty}
                             onChange={e => setTriggerQty(e.target.value)}
                             className="w-full mt-1 px-3 py-2 border rounded-lg outline-none font-bold text-center"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Nuevo Precio Unitario</label>
                           <input 
                             type="number"
                             min="0"
                             step="0.01"
                             required
                             placeholder={`< ${formatCurrency(selectedProduct.sellingPrice)}`}
                             value={promoPrice}
                             onChange={e => setPromoPrice(e.target.value)}
                             className="w-full mt-1 px-3 py-2 border border-emerald-300 rounded-lg outline-none font-bold text-emerald-600 text-center focus:ring-2 focus:ring-emerald-500"
                           />
                        </div>
                     </div>
                  )}
                  
                  {selectedProduct && triggerQty && promoPrice && (
                     <div className="flex items-start gap-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>
                           El cliente paga <b>{formatCurrency(parseFloat(promoPrice) * parseInt(triggerQty))}</b> en total por {triggerQty} unidades. 
                           (Ahorra {formatCurrency( (selectedProduct.sellingPrice - parseFloat(promoPrice)) * parseInt(triggerQty) )})
                        </span>
                     </div>
                  )}

                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                     <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg">Crear Promo</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Promotions;
