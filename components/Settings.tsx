import React, { useState } from 'react';
import { Store, Save, Check, Lock, ShieldAlert, CloudUpload } from 'lucide-react';
import { StoreProfile } from '../types';

interface SettingsProps {
  storeProfile: StoreProfile;
  onUpdateProfile: (profile: StoreProfile) => void;
  onMigrateData?: () => void; // Optional function for data migration
}

const Settings: React.FC<SettingsProps> = ({ storeProfile, onUpdateProfile, onMigrateData }) => {
  const [formData, setFormData] = useState<StoreProfile>(storeProfile);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-slate-900 p-2 rounded-lg text-white">
          <Store size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración del Local</h2>
          <p className="text-slate-500">Administra datos fiscales y seguridad.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Data Migration Section - Visible if function provided */}
          {onMigrateData && (
             <div className="col-span-full bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex gap-3">
                   <CloudUpload className="text-indigo-600 shrink-0" size={24} />
                   <div>
                      <h4 className="font-bold text-indigo-900 text-sm">Sincronizar Datos Locales</h4>
                      <p className="text-xs text-indigo-700 mt-1 max-w-lg">
                        Si tenías datos guardados antes de iniciar sesión (como invitado), usa este botón para subirlos a tu cuenta en la nube. 
                        Útil si ves tu inventario vacío después de loguearte.
                      </p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={onMigrateData}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md shrink-0"
                >
                   Subir Datos
                </button>
             </div>
          )}
          
          <div className="col-span-full mt-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Seguridad y Empleados</h3>
          </div>

          <div className="col-span-full bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-3">
             <ShieldAlert className="text-orange-500 shrink-0" size={24} />
             <div>
                <h4 className="font-bold text-orange-800 text-sm">Modo Empleado (Vendedor)</h4>
                <p className="text-xs text-orange-700 mt-1">
                  Establece un PIN de 4 dígitos. Al activar el "Modo Empleado", la app restringirá el acceso a configuración, ganancias y edición de productos.
                  Para volver al modo Administrador, se solicitará este PIN.
                </p>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN Maestro (Para desbloquear Admin)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="sellerPin"
                maxLength={4}
                value={formData.sellerPin || ''}
                onChange={(e) => {
                   // Only allow numbers
                   if (/^\d*$/.test(e.target.value)) {
                     handleChange(e);
                   }
                }}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-lg tracking-widest"
                placeholder="0000"
              />
            </div>
          </div>

          <div className="col-span-full mt-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Datos Comerciales</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Fantasía</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ej. KIOSCO EL PASO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titular / Razón Social</label>
            <input 
              type="text" 
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ej. JUAN PEREZ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Comercial</label>
            <input 
              type="text" 
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad / Localidad</label>
            <input 
              type="text" 
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="col-span-full mt-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Datos Fiscales (AFIP)</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CUIT</label>
            <input 
              type="text" 
              name="cuit"
              value={formData.cuit}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="20-xxxxxxxx-x"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ingresos Brutos (IIBB)</label>
            <input 
              type="text" 
              name="iibb"
              value={formData.iibb}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inicio de Actividades</label>
            <input 
              type="text" 
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="dd/mm/aaaa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condición IVA</label>
            <select 
              name="ivaCondition"
              value={formData.ivaCondition}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="Monotributo">Monotributo</option>
              <option value="Responsable Inscripto">Responsable Inscripto</option>
              <option value="Exento">Exento</option>
            </select>
          </div>

        </div>

        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end border-t border-slate-200">
          <button 
            type="submit"
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${saved ? 'bg-emerald-500' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {saved ? <><Check size={20} /> Guardado</> : <><Save size={20} /> Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;