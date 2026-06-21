import { Clock, MessageSquare, ShieldCheck, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Clock,
    title: 'Publica en 60 segundos',
    description: 'Sube fotos, agrega precio y ubicación. Nuestra IA genera la descripción automáticamente.',
    color: 'green'
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'Recibe contactos',
    description: 'Compradores te contactan por WhatsApp, llamada o mensaje interno. Responde rápido para cerrar más ventas.',
    color: 'blue'
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Encuentros seguros',
    description: 'Perfiles verificados con KYC para tu tranquilidad. Reúnete en lugares públicos y verifica el producto.',
    color: 'purple'
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Vende rápido',
    description: 'Destaca tu anuncio con plan PRO para 3x más vistas. Cierra el trato hoy mismo.',
    color: 'orange'
  }
];

export default function HowToSection() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo vender en Mercasto',
    description: 'Guía paso a paso para publicar y vender productos en Mercasto México',
    totalTime: 'PT1M',
    step: STEPS.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
      url: `https://mercasto.com/#paso-${index + 1}`
    }))
  };

  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  };

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 py-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Cómo funciona Mercasto
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Vende en 4 simples pasos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                id={`paso-${index + 1}`}
                className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="absolute -top-3 -left-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {step.number}
                </div>
                
                <div className={`w-14 h-14 rounded-xl ${colorClasses[step.color]} flex items-center justify-center mb-4`}>
                  <Icon size={28} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a
            href="/publicar"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Publicar anuncio gratis
          </a>
        </div>
      </div>
    </section>
  );
}
