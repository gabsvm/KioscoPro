
import React, { useState, useMemo } from 'react';
import { Sale, PaymentMethod } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '../utils';

interface ReportsProps {
  sales: Sale[];
  paymentMethods: PaymentMethod[];
}

const Reports: React.FC<ReportsProps> = ({ sales, paymentMethods }) => {
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 days
    end: new Date().toISOString().split('T')[0]
  });

  const filteredSales = useMemo(() => {
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime() + (86400000 - 1); // End of day
    return sales.filter(s => s.timestamp >= start && s.timestamp <= end);
  }, [sales, dateRange]);

  // Quick Filters Handlers
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({ start: today, end: today });
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    setDateRange({ 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    });
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange({ 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    });
  };

  // Aggregate Data for Charts - Supports Split Payments
  const salesByPaymentMethod = useMemo(() => {
    // Map to store total per method
    const totals = new Map<string, number>();

    filteredSales.forEach(sale => {
      if (sale.payments && sale.payments.length > 0) {
        // Handle split payments
        sale.payments.forEach(p => {
           const current = totals.get(p.methodId) || 0;
           totals.set(p.methodId, current + p.amount);
        });
      } else {
        // Fallback for legacy sales (single method)
        const current = totals.get(sale.paymentMethodId) || 0;
        totals.set(sale.paymentMethodId, current + sale.totalAmount);
      }
    });

    return paymentMethods.map(pm => ({
      name: pm.name,
      value: totals.get(pm.id) || 0
    })).filter(d => d.value > 0);

  }, [filteredSales, paymentMethods]);

  const topProducts = useMemo(() => {
    const productMap = new Map<string, {name: string, quantity: number, revenue: number}>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
        productMap.set(item.productId, {
          name: item.productName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Reportes de Venta</h2>
        
        {/* Filters Container */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Quick Buttons */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
             <button onClick={setToday} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
               Hoy
             </button>
             <button onClick={setLast7Days} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
               7 Días
             </button>
             <button onClick={setThisMonth} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
               Este Mes
             </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <Calendar size={18} className="text-slate-400 ml-2" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="text-sm border-none focus:ring-0 text-slate-600 bg-transparent flex-1 md:flex-none min-w-0"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="text-sm border-none focus:ring-0 text-slate-600 bg-transparent flex-1 md:flex-none min-w-0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Ventas por Método de Pago</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={salesByPaymentMethod}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {salesByPaymentMethod.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value: number) => formatCurrency(value)} />
                 <Legend />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Top 5 Productos Vendidos (Unidades)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Detalle de Ventas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">ID Venta</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Método(s)</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.slice().reverse().map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50">
                   <td className="px-6 py-3 font-mono text-xs text-slate-400">#{sale.id.slice(-6)}</td>
                   <td className="px-6 py-3 text-slate-600">{new Date(sale.timestamp).toLocaleString()}</td>
                   <td className="px-6 py-3">
                     {sale.payments && sale.payments.length > 1 ? (
                        <div className="flex flex-col gap-1">
                          {sale.payments.map((p, idx) => (
                             <span key={idx} className="bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold text-indigo-700 border border-indigo-100 w-fit">
                               {p.methodName}: {formatCurrency(p.amount)}
                             </span>
                          ))}
                        </div>
                     ) : (
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                          {sale.paymentMethodName}
                        </span>
                     )}
                   </td>
                   <td className="px-6 py-3 text-slate-600 max-w-xs truncate">
                     {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                   </td>
                   <td className="px-6 py-3 text-right font-bold text-slate-800">
                     {formatCurrency(sale.totalAmount)}
                   </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No hay ventas en este rango de fechas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
