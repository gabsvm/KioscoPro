import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Wallet, BarChart3, Store, Truck, LogOut, UserCircle, Settings, ChevronDown, RefreshCw, X, User, History } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  userEmail?: string | null;
  isGuest?: boolean;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, userEmail, isGuest, onLogout }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoutConfirmType, setLogoutConfirmType] = useState<'LOGOUT' | 'SWITCH' | null>(null);

  const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
    { id: 'POS', label: 'Vender', icon: <ShoppingCart size={20} /> },
    { id: 'HISTORY', label: 'Historial', icon: <History size={20} /> },
    { id: 'INVENTORY', label: 'Productos', icon: <Package size={20} /> },
    { id: 'SUPPLIERS', label: 'Proveedores', icon: <Truck size={20} /> },
    { id: 'FINANCE', label: 'Cajas', icon: <Wallet size={20} /> },
    { id: 'REPORTS', label: 'Reportes', icon: <BarChart3 size={20} /> },
  ];

  const handleLogoutAction = (type: 'LOGOUT' | 'SWITCH') => {
    setIsUserMenuOpen(false);
    setLogoutConfirmType(type);
  };

  const confirmAction = () => {
    onLogout();
    setLogoutConfirmType(null);
  };

  const handleSettingsClick = () => {
    setView('SETTINGS');
    setIsUserMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-brand-500 p-2 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.5)]">
            <Store className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">KioscoPro</h1>
            <span className="text-xs text-slate-400 font-medium">Versión 2.0</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           {isGuest && (
             <div className="mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700">
               <p className="text-xs text-slate-300 mb-2">Estás en modo invitado.</p>
               <button 
                 onClick={() => handleLogoutAction('SWITCH')} 
                 className="w-full bg-brand-600 text-xs py-2 rounded font-bold hover:bg-brand-500 transition-colors"
               >
                 Crear Cuenta
               </button>
             </div>
           )}
          <div className="text-xs text-slate-500 text-center">
             &copy; 2025 KioscoPro AR
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-2">
             {/* Mobile Logo Only */}
             <div className="md:hidden bg-brand-500 p-1.5 rounded-lg">
                <Store className="text-white" size={18} />
             </div>
             <h2 className="text-xl font-bold text-slate-800">
               {currentView === 'SETTINGS' ? 'Configuración' : navItems.find((i) => i.id === currentView)?.label}
             </h2>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isUserMenuOpen ? 'bg-slate-100 ring-2 ring-slate-200' : 'hover:bg-slate-50'}`}
            >
              {isGuest ? (
                 <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200">
                   <UserCircle size={18} />
                   <span className="text-xs font-bold hidden sm:inline">Invitado</span>
                 </div>
              ) : (
                 <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-700 leading-tight">{userEmail?.split('@')[0]}</span>
                      <span className="text-[10px] text-slate-400">Administrador</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold border-2 border-brand-100 shadow-sm">
                      {userEmail ? userEmail[0].toUpperCase() : 'U'}
                    </div>
                 </div>
              )}
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cuenta Actual</p>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isGuest ? 'bg-orange-100 text-orange-600' : 'bg-brand-100 text-brand-600'}`}>
                        {isGuest ? <UserCircle size={20} /> : <User size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate">{isGuest ? 'Invitado Temporal' : userEmail}</p>
                        <p className="text-xs text-slate-500">{isGuest ? 'Datos no sincronizados' : 'Sesión activa'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button 
                      onClick={handleSettingsClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors text-sm font-medium"
                    >
                      <Settings size={18} />
                      Configuración de App
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button 
                      onClick={() => handleLogoutAction('SWITCH')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-sm font-medium"
                    >
                      <RefreshCw size={18} />
                      Cambiar Cuenta
                    </button>
                    <button 
                      onClick={() => handleLogoutAction('LOGOUT')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <LogOut size={18} />
                      Cerrar Sesión
                    </button>
                  </div>
                  
                  {isGuest && (
                    <div className="p-3 bg-indigo-50 border-t border-indigo-100 text-xs text-indigo-800">
                      <p>⚠️ Al salir como invitado, asegúrate de haber creado una cuenta para no perder tus datos.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 relative scroll-smooth bg-slate-50/50">
           {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar">
           {navItems.map(item => (
             <button 
               key={item.id}
               onClick={() => setView(item.id)}
               className={`flex flex-col items-center justify-center min-w-[70px] h-full space-y-1 active:bg-slate-50 ${
                 currentView === item.id ? 'text-brand-600' : 'text-slate-400'
               }`}
             >
               {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
               <span className="text-[10px] font-medium">{item.label}</span>
             </button>
           ))}
        </nav>
      </main>

      {/* Confirmation Modal */}
      {logoutConfirmType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${logoutConfirmType === 'LOGOUT' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {logoutConfirmType === 'LOGOUT' ? <LogOut size={32} /> : <RefreshCw size={32} />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {logoutConfirmType === 'LOGOUT' ? '¿Cerrar Sesión?' : '¿Cambiar de Cuenta?'}
              </h3>
              <p className="text-slate-500 mb-6 text-sm">
                {isGuest 
                  ? "Estás usando una cuenta de invitado. Si sales ahora, asegúrate de que no necesitas guardar estos datos permanentemente en una cuenta nueva." 
                  : `¿Estás seguro que deseas ${logoutConfirmType === 'LOGOUT' ? 'salir del sistema' : 'cambiar a otra cuenta'}? Tendrás que volver a ingresar tus credenciales.`}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setLogoutConfirmType(null)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAction}
                  className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-colors ${logoutConfirmType === 'LOGOUT' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;