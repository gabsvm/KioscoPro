import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Settings } from 'lucide-react';
import { Product } from '../types';

interface InventoryProps {
  products: Product[];
  lowStockThreshold: number;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateThreshold: (n: number) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, lowStockThreshold, onAddProduct, onUpdateProduct, onDeleteProduct, onUpdateThreshold }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCategory(product.category);
      setCostPrice(product.costPrice.toString());
      setSellingPrice(product.sellingPrice.toString());
      setStock(product.stock.toString());
    } else {
      setEditingProduct(null);
      setName('');
      setCategory('');
      setCostPrice('');
      setSellingPrice('');
      setStock('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name,
      category: category || 'General',
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      stock: parseInt(stock) || 0,
    };

    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...productData });
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        <div className="flex gap-2 w-full md:w-auto">
          {/* Settings Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
              title="Configurar Alertas"
            >
              <Settings size={20} className="text-slate-600" />
            </button>
            
            {showSettings && (
              <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-white p-4 rounded-lg shadow-xl border border-slate-200 w-64 z-20 animate-in fade-in zoom-in-95">
                <h4 className="font-bold text-sm text-slate-700 mb-2">Configuración de Alertas</h4>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-500">Avisar si stock es menor o igual a:</label>
                  <input 
                    type="number" 
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => onUpdateThreshold(parseInt(e.target.value) || 0)}
                    className="w-16 border rounded p-1 text-center font-bold text-slate-700 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => openModal()}
            className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1 max-w-full md:max-w-md">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por nombre o categoría..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
             />
           </div>
           
           {/* Legend for low stock */}
           <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 ml-auto">
             <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span> Stock Bajo ({'<='}{lowStockThreshold})
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Costo</th>
                <th className="px-6 py-4">Precio Venta</th>
                <th className="px-6 py-4">Margen</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const margin = product.sellingPrice > 0 
                  ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100 
                  : 0;
                
                const isLowStock = product.stock <= lowStockThreshold;

                return (
                  <tr key={product.id} className={`transition-colors ${isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                    <td className="px-6 py-4 text-slate-500"><span className="bg-white border border-slate-200 px-2 py-1 rounded text-xs">{product.category}</span></td>
                    <td className="px-6 py-4 text-slate-600">${product.costPrice}</td>
                    <td className="px-6 py-4 text-slate-800 font-bold">${product.sellingPrice}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${margin > 30 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`font-bold px-2 py-1 rounded ${isLowStock ? 'text-red-600 bg-red-100 border border-red-200' : 'text-slate-600'}`}>
                         {product.stock}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openModal(product)} className="text-brand-600 hover:text-brand-800 p-1 hover:bg-brand-50 rounded">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteProduct(product.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                     No hay productos registrados
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="Ej. Coca Cola 500ml"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
                  <input 
                    type="text" 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="Ej. Bebidas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Stock</label>
                  <input 
                    type="number" 
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Costo ($)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    min="0"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Venta ($)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    min="0"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit" 
                   className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 shadow-lg shadow-brand-200"
                 >
                   Guardar
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;