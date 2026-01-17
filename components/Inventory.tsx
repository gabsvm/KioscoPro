import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Settings, Lock, Scale, Upload, FileSpreadsheet, Barcode } from 'lucide-react';
import { Product } from '../types';

interface InventoryProps {
  products: Product[];
  lowStockThreshold: number;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onBulkAddProducts: (p: Omit<Product, 'id'>[]) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateThreshold: (n: number) => void;
  isReadOnly?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ products, lowStockThreshold, onAddProduct, onBulkAddProducts, onUpdateProduct, onDeleteProduct, onUpdateThreshold, isReadOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isVariablePrice, setIsVariablePrice] = useState(false);

  const openModal = (product?: Product) => {
    if (isReadOnly) return;
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCategory(product.category);
      setCostPrice(product.costPrice.toString());
      setSellingPrice(product.sellingPrice.toString());
      setStock(product.stock.toString());
      setBarcode(product.barcode || '');
      setIsVariablePrice(!!product.isVariablePrice);
    } else {
      setEditingProduct(null);
      setName('');
      setCategory('');
      setCostPrice('');
      setSellingPrice('');
      setStock('');
      setBarcode('');
      setIsVariablePrice(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const productData = {
      name,
      category: category || 'General',
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: isVariablePrice ? 0 : (parseFloat(sellingPrice) || 0),
      stock: parseInt(stock) || 0,
      barcode: barcode.trim() || undefined,
      isVariablePrice: isVariablePrice
    };

    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...productData });
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  // Helper to auto-set category when checking variable price
  const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsVariablePrice(checked);
    if (checked && (!category || category === 'General' || category === 'Kiosco')) {
      setCategory('Fiambrería');
    }
  };

  // --- Advanced CSV Parser ---
  const parseCSVRow = (row: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    // Clean quotes: "Value" -> Value
    return result.map(val => val.trim().replace(/^"|"$/g, '').trim());
  };

  const cleanCurrency = (val: string): number => {
    if (!val) return 0;
    // Remove dots (thousands separator in AR/EU) and replace comma with dot
    // Example: "1.500,00" -> "1500.00"
    // Example: "733,63" -> "733.63"
    const cleaned = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      const newProducts: Omit<Product, 'id'>[] = [];

      // Detect separator (CSV or TSV)
      const firstLine = lines[0];
      const separator = firstLine.includes('\t') ? '\t' : ',';

      // Parse Headers
      const headers = parseCSVRow(lines[0], separator).map(h => h.toUpperCase());
      
      // Determine Indexes based on specific file format or generic names
      const idxName = headers.indexOf('DESCRIPCION') !== -1 ? headers.indexOf('DESCRIPCION') : headers.findIndex(h => h.includes('NOMBRE') || h.includes('PRODUCTO'));
      const idxCategory = headers.indexOf('RUBRO') !== -1 ? headers.indexOf('RUBRO') : headers.findIndex(h => h.includes('CATEGORIA'));
      const idxCost = headers.indexOf('PRECIO COMPRA') !== -1 ? headers.indexOf('PRECIO COMPRA') : headers.findIndex(h => h.includes('COSTO'));
      const idxPrice = headers.indexOf('PRECIO VENTA') !== -1 ? headers.indexOf('PRECIO VENTA') : headers.findIndex(h => h.includes('PRECIO') || h.includes('VENTA'));
      const idxStock = headers.findIndex(h => h.includes('STOCK') || h.includes('CANTIDAD'));
      const idxBarcode = headers.indexOf('CODIGO BARRA') !== -1 ? headers.indexOf('CODIGO BARRA') : headers.findIndex(h => h.includes('CODIGO') || h.includes('BARRA') || h.includes('SKU'));
      const idxId = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : -1;

      // Start from line 1
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i], separator);
        
        // Safety check for empty rows
        if (row.length < 2) continue;

        const name = idxName !== -1 ? row[idxName] : (row[0] || 'Sin Nombre');
        // If RUBRO is empty, fallback to 'General'
        let category = (idxCategory !== -1 ? row[idxCategory] : 'General') || 'General';
        // Capitalize category
        category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

        const costPrice = idxCost !== -1 ? cleanCurrency(row[idxCost]) : 0;
        const sellingPrice = idxPrice !== -1 ? cleanCurrency(row[idxPrice]) : 0;
        const stock = idxStock !== -1 ? parseInt(row[idxStock]) || 0 : 0; // Default 0 if missing
        
        // Barcode logic: Try "CODIGO BARRA", if empty/space, try "ID", else undefined
        let barcode = undefined;
        if (idxBarcode !== -1 && row[idxBarcode]) {
           barcode = row[idxBarcode];
        } else if (idxId !== -1 && row[idxId]) {
           // Optionally use ID as barcode if barcode is missing
           // barcode = row[idxId]; 
        }

        if (name && name !== 'Sin Nombre') {
          newProducts.push({
            name,
            category,
            costPrice,
            sellingPrice,
            stock,
            barcode,
            isVariablePrice: false
          });
        }
      }

      if (newProducts.length > 0) {
        const previewMsg = `
          Se detectaron ${newProducts.length} productos.
          
          Ejemplo:
          Producto: ${newProducts[0].name}
          Rubro: ${newProducts[0].category}
          Costo: $${newProducts[0].costPrice}
          Venta: $${newProducts[0].sellingPrice}
          
          ¿Confirmar importación?
        `;
        
        if (confirm(previewMsg)) {
          onBulkAddProducts(newProducts);
          setIsImportModalOpen(false);
          alert('¡Importación exitosa!');
        }
      } else {
        alert('No se pudieron leer los productos. Verifica que el archivo tenga columnas de "DESCRIPCION" y "PRECIO VENTA".');
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        
        {isReadOnly ? (
             <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Lock size={16} /> Modo Lectura
             </div>
        ) : (
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
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                title="Importar Excel/CSV"
              >
                <Upload size={20} /> <span className="hidden sm:inline">Importar</span>
              </button>

              <button 
                onClick={() => openModal()}
                className="flex-1 md:flex-none bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Plus size={20} /> Nuevo Producto
              </button>
            </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1 max-w-full md:max-w-md">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Buscar por nombre, código o categoría..." 
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
                {!isReadOnly && <th className="px-6 py-4">Costo</th>}
                <th className="px-6 py-4">Precio Venta</th>
                {!isReadOnly && <th className="px-6 py-4">Margen</th>}
                <th className="px-6 py-4">Stock</th>
                {!isReadOnly && <th className="px-6 py-4 text-right">Acciones</th>}
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
                    <td className="px-6 py-4 text-slate-800">
                      <div className="font-medium">{product.name}</div>
                      {product.barcode && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                           <Barcode size={12} /> {product.barcode}
                        </div>
                      )}
                      {product.isVariablePrice && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 mt-1">
                          <Scale size={10} className="mr-1"/> Pesable
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500"><span className="bg-white border border-slate-200 px-2 py-1 rounded text-xs">{product.category}</span></td>
                    {!isReadOnly && <td className="px-6 py-4 text-slate-600">${product.costPrice}</td>}
                    <td className="px-6 py-4 text-slate-800 font-bold">
                      {product.isVariablePrice ? (
                        <span className="text-slate-400 italic font-normal">Manual</span>
                      ) : (
                        `$${product.sellingPrice}`
                      )}
                    </td>
                    {!isReadOnly && (
                        <td className="px-6 py-4">
                          {product.isVariablePrice ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${margin > 30 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {margin.toFixed(0)}%
                            </span>
                          )}
                        </td>
                    )}
                    <td className="px-6 py-4">
                       <span className={`font-bold px-2 py-1 rounded ${isLowStock ? 'text-red-600 bg-red-100 border border-red-200' : 'text-slate-600'}`}>
                         {product.stock}
                       </span>
                    </td>
                    {!isReadOnly && (
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openModal(product)} className="text-brand-600 hover:text-brand-800 p-1 hover:bg-brand-50 rounded">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => onDeleteProduct(product.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </td>
                    )}
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                 <tr>
                   <td colSpan={isReadOnly ? 5 : 7} className="px-6 py-10 text-center text-slate-400">
                     No hay productos registrados
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
             <button 
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
               <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <FileSpreadsheet className="text-green-600" size={32} />
               </div>
               <h3 className="text-xl font-bold text-slate-800">Importación Masiva</h3>
               <p className="text-slate-500 text-sm mt-2">
                 Carga tu archivo CSV o Excel exportado.
               </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-sm text-slate-700">
               <p className="font-bold mb-2">Columnas detectadas:</p>
               <ul className="list-disc pl-5 space-y-1 font-medium text-xs">
                 <li>DESCRIPCION (Nombre)</li>
                 <li>RUBRO (Categoría)</li>
                 <li>PRECIO COMPRA (Costo)</li>
                 <li>PRECIO VENTA (Venta)</li>
                 <li>CODIGO BARRA (Opcional)</li>
               </ul>
               <p className="mt-3 text-xs text-brand-600 italic border-t border-slate-200 pt-2">
                 * El sistema detecta automáticamente los montos con formato argentino (ej: 1.500,00).
               </p>
            </div>

            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
               <input 
                 type="file" 
                 accept=".csv, .txt, .tsv"
                 onChange={handleFileUpload}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <Upload className="mx-auto text-slate-400 group-hover:text-brand-500 transition-colors mb-2" size={32} />
               <p className="font-bold text-brand-600 group-hover:text-brand-700">Haz clic para buscar archivo</p>
               <p className="text-xs text-slate-400">Soporta .csv y .txt</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && !isReadOnly && (
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
                  placeholder="Ej. Jamón Cocido"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Código de Barras / SKU (Opcional)</label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                    placeholder="Escanear o escribir..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
                  <input 
                    type="text" 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="Ej. Fiambrería"
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

              {/* Variable Price Toggle */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center gap-3">
                 <input 
                   type="checkbox" 
                   id="variablePrice"
                   checked={isVariablePrice}
                   onChange={handleVariableChange}
                   className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300 cursor-pointer"
                 />
                 <label htmlFor="variablePrice" className="text-sm font-bold text-purple-900 cursor-pointer flex items-center gap-2 select-none">
                    <Scale size={18} />
                    Precio Variable (Fiambrería)
                 </label>
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
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {isVariablePrice ? 'Precio' : 'Venta ($)'}
                  </label>
                  <input 
                    type="number"
                    step="0.01" 
                    min="0"
                    value={sellingPrice}
                    disabled={isVariablePrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className={`w-full px-4 py-2 text-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none ${isVariablePrice ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300'}`}
                    placeholder={isVariablePrice ? "Manual" : "0.00"}
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