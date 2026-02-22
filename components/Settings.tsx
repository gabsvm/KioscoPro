
import React, { useState } from 'react';
import { Store, Save, Check, Lock, ShieldAlert, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // Limit to 500KB for simplicity
        alert("La imagen es demasiado grande. Máximo 500KB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: undefined }));
    setSaved(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-slate-900 p-2 rounded-lg text-white">
          <Store size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración del Local</h2>
          <p className="text-slate-500">Administra datos fiscales, seguridad y personalización.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Data Migration Section - Visible if function provided */}
          {onMigrateData && (
             <div className="col-span-full bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex gap-3">
                   <Upload className="text-indigo-600 shrink-0" size={24} />
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
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personalización Visual</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Local</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ej. Kiosco El Paso"
            />
            <p className="text-xs text-slate-400 mt-1">Este nombre se mostrará en el encabezado de la app.</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Logo del Local</label>
             <div className="flex items-center gap-4">
                {formData.logoUrl ? (
                   <div className="relative group w-16 h-16 rounded-lg border border-slate-200 overflow-hidden">
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={handleRemoveLogo}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                         <Trash2 size={20} />
                      </button>
                   </div>
                ) : (
                   <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                      <ImageIcon size={24} />
                   </div>
                )}
                
                <div className="flex-1">
                   <input 
                     type="file" 
                     id="logo-upload" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={handleLogoUpload}
                   />
                   <label 
                     htmlFor="logo-upload"
                     className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                   >
                     <Upload size={16} /> {formData.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                   </label>
                   <p className="text-[10px] text-slate-400 mt-1">Recomendado: 150x150px. Máx 500KB.</p>
                </div>
             </div>
          </div>

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

          <div className="col-span-full mt-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Credenciales Fiscales (AFIP)</h3>
          </div>

          <div className="col-span-full bg-sky-50 border border-sky-100 rounded-lg p-4 flex gap-3">
             <ShieldAlert className="text-sky-500 shrink-0" size={24} />
             <div>
                <h4 className="font-bold text-sky-800 text-sm">Configuración para Facturación Electrónica</h4>
                <p className="text-xs text-sky-700 mt-1">
                  Ingresa tus credenciales de AFIP para poder emitir facturas fiscales. Estos datos se guardan de forma segura y son específicos para tu cuenta.
                  El CUIT aquí debe coincidir con el CUIT del titular.
                </p>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CUIT (del Certificado)</label>
            <input 
              type="text" 
              name="afipConfig.cuit"
              value={formData.afipConfig?.cuit || ''}
              onChange={(e) => setFormData(prev => ({...prev, afipConfig: {...prev.afipConfig, cuit: e.target.value}} as StoreProfile))}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="CUIT asociado al certificado digital"
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entorno AFIP</label>
            <select 
              name="afipConfig.environment"
              value={formData.afipConfig?.environment || 'testing'}
              onChange={(e) => setFormData(prev => ({...prev, afipConfig: {...prev.afipConfig, environment: e.target.value}} as StoreProfile))}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="testing">Pruebas (Homologación)</option>
              <option value="production">Producción (Real)</option>
            </select>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Certificado (.crt)</label>
            <textarea 
              name="afipConfig.cert"
              rows={5}
              value={formData.afipConfig?.cert || ''}
              onChange={(e) => setFormData(prev => ({...prev, afipConfig: {...prev.afipConfig, cert: e.target.value}} as StoreProfile))}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
              placeholder="Pega el contenido completo de tu archivo .crt aquí"
            />
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Clave Privada (.key)</label>
            <textarea 
              name="afipConfig.privateKey"
              rows={5}
              value={formData.afipConfig?.privateKey || ''}
              onChange={(e) => setFormData(prev => ({...prev, afipConfig: {...prev.afipConfig, privateKey: e.target.value}} as StoreProfile))}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
              placeholder="Pega el contenido completo de tu archivo .key aquí"
            />
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
