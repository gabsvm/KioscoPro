
import React, { useState, useMemo } from 'react';
import { Sale, InvoiceData, StoreProfile } from '../types';
import { Search, Printer, FileText, ChevronDown } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import { formatCurrency } from '../utils';

interface SalesHistoryProps {
  sales: Sale[];
  storeProfile: StoreProfile;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, storeProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Filter sales based on search
  const filteredSales = useMemo(() => {
    return sales
      .sort((a, b) => b.timestamp - a.timestamp) // Newest first
      .filter(sale => {
        const searchLower = (searchTerm || "").toLowerCase();
        const idMatch = (sale.id || "").toLowerCase().includes(searchLower);
        const clientMatch = (sale.invoice?.clientName || "").toLowerCase().includes(searchLower);
        const methodMatch = (sale.paymentMethodName || "").toLowerCase().includes(searchLower);
        const amountMatch = (sale.totalAmount || 0).toString().includes(searchLower);
        
        return idMatch || clientMatch || methodMatch || amountMatch;
      });
  }, [sales, searchTerm]);

  // Handle viewing invoice (generate dummy if missing)
  const handleViewInvoice = (sale: Sale) => {
    if (sale.invoice) {
      setSelectedSale(sale);
    } else {
      // Construct a "Ticket X" on the fly for internal sales that didn't generate an invoice
      const dummyInvoice: InvoiceData = {
        type: 'X',
        number: sale.id.slice(-8), // Use part of ID as number
        clientName: 'Consumidor Final',
        clientCuit: '0',
        clientAddress: 'Mostrador',
        conditionIva: 'Consumidor Final',
        cae: 'INTERNO',
        caeVto: '-'
      };
      
      setSelectedSale({ ...sale, invoice: dummyInvoice });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por ID, Cliente, Monto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">ID Venta</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Pago</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{new Date(sale.timestamp).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{new Date(sale.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {sale.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">
                      {sale.invoice ? sale.invoice.clientName : 'Consumidor Final'}
                    </div>
                    {sale.invoice && (
                      <div className="text-xs text-slate-400">
                        {sale.invoice.type === 'X' ? 'Ticket Interno' : `Factura ${sale.invoice.type}`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex flex-col">
                       <span className="font-medium">{sale.items.length} productos</span>
                       <span className="text-xs text-slate-400 truncate max-w-[150px]">
                         {sale.items.map(i => i.productName).join(', ')}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {sale.payments && sale.payments.length > 1 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-700">Mixto:</span>
                          {sale.payments.map((p, i) => (
                             <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200 whitespace-nowrap">
                               {p.methodName}: {formatCurrency(p.amount)}
                             </span>
                          ))}
                        </div>
                    ) : (
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">
                           {sale.paymentMethodName}
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 text-base">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleViewInvoice(sale)}
                      className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Ver Factura"
                    >
                      {sale.invoice && sale.invoice.type !== 'X' ? <FileText size={20} /> : <Printer size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                     <div className="flex flex-col items-center justify-center">
                        <Search size={32} className="mb-2 opacity-20" />
                        <p>No se encontraron ventas</p>
                     </div>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedSale && (
        <InvoiceModal sale={selectedSale} storeProfile={storeProfile} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
};

export default SalesHistory;
