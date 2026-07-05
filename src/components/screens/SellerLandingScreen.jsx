import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageSquare, DollarSign, PlusCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { trackPageView } from '../../utils/analytics';

export default function SellerLandingScreen({ lang = 'es' }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Track page view for analytics
    trackPageView('/vendedores', 'Para Vendedores - Publica Gratis');
  }, []);

  const handleStart = () => {
    navigate('/post');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-white transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#84CC16]/10 dark:bg-[#84CC16]/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#84CC16]/10 text-[#84CC16] text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse border border-[#84CC16]/20">
          <Sparkles size={14} />
          <span>Clasificados 100% Gratis en México</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-300 bg-clip-text text-transparent">
          Vende más rápido y <br className="hidden md:inline" />
          <span className="text-[#84CC16] drop-shadow-sm">sin pagar comisiones</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed font-medium">
          Publica tus autos, casas, servicios o productos gratis. Los compradores te contactan directamente por WhatsApp o Telegram sin intermediarios.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
          <button
            onClick={handleStart}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[#84CC16] hover:bg-[#72B013] text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-[#84CC16]/20 transition-all duration-200 text-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle size={22} />
            <span>Publicar Anuncio Gratis</span>
            <ArrowRight size={18} className="ml-1" />
          </button>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Easy & Fast */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">Publicación Fácil</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Sube tus fotos y descripción en menos de 2 minutos. Diseñado para verse increíble tanto en móviles como en computadoras.
            </p>
          </div>

          {/* Card 2: No commissions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <DollarSign size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">0% Comisiones</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Toda la ganancia es tuya. Mercasto no interviene en tus cobros ni te descuenta porcentajes de tus ventas.
            </p>
          </div>

          {/* Card 3: Direct Contact */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start group">
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/50 flex items-center justify-center text-[#84CC16] mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare size={26} />
            </div>
            <h3 className="text-xl font-bold mb-3">Contacto Directo</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Olvídate de chats lentos en plataformas complejas. Los interesados te escriben directamente a tu WhatsApp personal.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900/50 border-y border-slate-200/60 dark:border-slate-800/60 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-12">¿Cómo funciona Mercasto?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                1
              </div>
              <h4 className="text-lg font-bold mb-2">Crea tu Cuenta</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Regístrate de forma segura con tu correo. Estarás listo para publicar de inmediato.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                2
              </div>
              <h4 className="text-lg font-bold mb-2">Sube tu Anuncio</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Añade el título, precio, fotos y detalles de tu producto, auto, servicio o inmueble.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold text-lg mb-4 shadow-md shadow-[#84CC16]/20">
                3
              </div>
              <h4 className="text-lg font-bold mb-2">Vende Directo</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Recibe los mensajes de compradores directamente en tu móvil y coordina la entrega.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-16 md:py-24 px-4 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-lime-500/10 flex items-center justify-center text-[#84CC16] shrink-0">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight">Tu seguridad es nuestra prioridad</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">
            En Mercasto validamos perfiles de forma continua para garantizar una comunidad de venta confiable. Recuerda siempre realizar transacciones en lugares públicos y seguros para tu tranquilidad.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#84CC16]/5 rounded-full blur-[100px] pointer-events-none" />
        
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight max-w-2xl mx-auto">
          ¿Listo para empezar a vender hoy mismo?
        </h2>
        <p className="text-slate-400 text-base md:text-lg mb-10 max-w-xl mx-auto">
          Miles de personas en todo México están buscando lo que tú ofreces. ¡Haz tu publicación totalmente gratis!
        </p>
        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 mx-auto bg-[#84CC16] hover:bg-[#72B013] text-white font-bold px-10 py-4.5 rounded-2xl shadow-xl shadow-[#84CC16]/10 transition-all duration-200 text-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle size={22} />
          <span>Empezar Ahora</span>
          <ArrowRight size={18} className="ml-1" />
        </button>
      </section>
    </div>
  );
}
