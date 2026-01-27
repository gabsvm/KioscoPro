
import React, { useState } from 'react';
import { DollarSign, TrendingUp, Package, CreditCard, Sparkles, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { Sale, Product, PaymentMethod, UserRole } from '../types';
import { analyzeBusinessData } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  lowStockThreshold: number;
  userRole?: UserRole; // Optional for backward compatibility, defaults to ADMIN if missing logic
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products, paymentMethods, lowStockThreshold, userRole = 'ADMIN' }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Quick stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysSales = sales.filter(s => s.timestamp >= today.getTime());
  const dailyRevenue = todaysSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const dailyProfit = todaysSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalStockValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);

  // Low Stock Logic
  const lowStockProducts = products.filter(p => p.stock <= lowStockThreshold);

  // Prepare chart data (Last 7 days)
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      
      const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const daySales = sales.filter(s => {
        const sDate = new Date(s.timestamp);
        sDate.setHours(0,0,0,0);
        return sDate.getTime() === d.getTime();
      });
      
      data.push({
        name: dayLabel,
        ventas: daySales.reduce((acc, s) => acc + s.totalAmount, 0),
        ganancia: daySales.reduce((acc, s) => acc + s.totalProfit, 0),
      });
    }
    return data;
  };

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeBusinessData(sales, products, paymentMethods);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Ventas Hoy</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(dailyRevenue)}</h3>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{todaysSales.length} transacciones</p>
        </div>

        {/* Hidden for Seller */}
        {userRole === 'ADMIN' ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Ganancia Hoy</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(dailyProfit)}</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Margen prom: {dailyRevenue ? ((dailyProfit/dailyRevenue)*100).toFixed(1) : 0}%</p>
            </div>
        ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <Lock size={24} className="mx-auto mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-wider">Info Restringida</span>
                </div>
            </div>
        )}

        {/* Hidden for Seller */}
        {userRole === 'ADMIN' ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Valor Inventario</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalStockValue)}</h3>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Package size={20} />
                </div>
              </div>
               <p className="text-xs text-slate-400 mt-2">{products.length} productos registrados</p>
            </div>
        ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Productos</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-2">{products.length}</h3>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Package size={20} />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Total en catálogo</p>
            </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total en Cajas</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-2">
                {formatCurrency(paymentMethods.reduce((acc, m) => acc + m.balance, 0))}
              </h3>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{paymentMethods.length} métodos activos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Rendimiento Semanal</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getLast7DaysData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#f1f5f9'}}
                  />
                  <Bar dataKey="ventas" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Ventas" />
                  {userRole === 'ADMIN' && <Bar dataKey="ganancia" fill="#10b981" radius={[4, 4, 0, 0]} name="Ganancia" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col">
          {/* Low Stock Alert Widget */}
          <div className={`p-6 rounded-xl shadow-sm border relative overflow-hidden ${lowStockProducts.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h3 className={`text-lg font-bold ${lowStockProducts.length > 0 ? 'text-orange-800' : 'text-slate-800'}`}>Alertas de Stock</h3>
                 <p className="text-xs opacity-70">Umbral configurado: {lowStockThreshold} u.</p>
               </div>
               {lowStockProducts.length > 0 ? (
                 <AlertTriangle className="text-orange-500 animate-pulse" size={24} />
               ) : (
                 <CheckCircle className="text-emerald-500" size={24} />
               )}
             </div>

             {lowStockProducts.length > 0 ? (
               <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                 {lowStockProducts.map(p => (
                   <div key={p.id} className="flex justify-between items-center bg-white/60 p-2 rounded-lg text-sm">
                     <span className="font-medium text-slate-700 truncate">{p.name}</span>
                     <span className="font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">{p.stock} u.</span>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-slate-500 text-sm italic">
                 Todo en orden. No hay productos con stock bajo.
               </div>
             )}
          </div>

          {/* AI Assistant - Only for Admin */}
          {userRole === 'ADMIN' && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-xl shadow-lg relative overflow-hidden flex flex-col min-h-[400px]">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4 shrink-0">
                    <Sparkles className="text-yellow-300" size={24} />
                    <h3 className="text-xl font-bold">Kiosco AI Insights</h3>
                  </div>
                  
                  <div className="flex-1 bg-white/10 rounded-lg p-4 mb-4 overflow-y-auto custom-scrollbar">
                    {loadingAi ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : aiAnalysis ? (
                       <div className="prose prose-invert prose-sm">
                         <pre className="whitespace-pre-wrap font-sans text-sm">{aiAnalysis}</pre>
                       </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-indigo-100 opacity-80 text-center">
                        <Sparkles className="mb-2 opacity-50" size={32} />
                        <p className="italic">
                          Obtén consejos inteligentes para mejorar tu rentabilidad.
                        </p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleAiAnalysis}
                    disabled={loadingAi}
                    className="w-full shrink-0 bg-white text-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {loadingAi ? 'Analizando...' : 'Analizar Negocio'}
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
