import React, { useState } from 'react';
import { Store, Mail, Lock, Loader2, AlertCircle, UserRound } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthProps {
  onGuestLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onGuestLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Ocurrió un error. Intenta nuevamente.";
      if (err.code === 'auth/invalid-credential') msg = "Credenciales incorrectas.";
      if (err.code === 'auth/email-already-in-use') msg = "El email ya está registrado.";
      if (err.code === 'auth/weak-password') msg = "La contraseña es muy débil (mínimo 6 caracteres).";
      if (err.code === 'auth/invalid-email') msg = "El email no es válido.";
      if (err.message.includes('api-key')) msg = "Error de Configuración: Falta la API Key en firebase.ts";
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-auto min-h-[500px]">
        
        {/* Left Side - Hero */}
        <div className="hidden md:flex w-1/2 bg-brand-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')] bg-cover opacity-10"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Store className="text-white" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-white">KioscoPro <span className="text-sm font-normal opacity-70 bg-white/20 px-2 py-0.5 rounded-full">v2.0</span></h1>
             </div>
             <p className="text-brand-100 text-lg leading-relaxed">
               Gestiona tu negocio de forma inteligente. Control de stock, ventas, caja y facturación electrónica simplificada.
             </p>
          </div>
          <div className="relative z-10 text-brand-100 text-sm">
            &copy; 2025 KioscoPro System
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <Store className="text-brand-600" size={32} />
            <h1 className="text-2xl font-bold text-slate-800">KioscoPro</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-slate-500 mb-8">
            {isLogin ? 'Ingresa tus credenciales para acceder.' : 'Comienza a gestionar tu negocio hoy mismo.'}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-200"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {isLogin ? 'Ingresar' : 'Registrarse'}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-4 text-xs text-slate-400 uppercase font-bold">O continúa como</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          <button 
            onClick={onGuestLogin}
            className="w-full bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <UserRound size={18} />
            Entrar como Invitado
          </button>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </span>
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="ml-1 text-brand-600 font-bold hover:underline"
            >
              {isLogin ? 'Regístrate gratis' : 'Inicia Sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;