import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: '¿Cómo publicar un anuncio en Mercasto?',
    answer: 'Publicar es gratis y toma 60 segundos. Haz clic en "Publicar anuncio", sube fotos, agrega precio y ubicación. Nuestra IA genera la descripción automáticamente. Puedes publicar hasta 3 anuncios gratis o elegir un plan PRO para anuncios ilimitados.'
  },
  {
    question: '¿Mercasto cobra comisión por ventas?',
    answer: 'No cobramos comisión por ventas entre particulares. Solo pagas si eliges un plan PRO para destacar tus anuncios o si eres una agencia/inmobiliaria con plan Enterprise. Las transacciones se hacen directamente entre comprador y vendedor.'
  },
  {
    question: '¿Cómo verifican a los vendedores?',
    answer: 'Usamos verificación KYC (Know Your Customer) con identificación oficial. Los vendedores verificados tienen una insignia azul. También verificamos teléfonos y correos electrónicos. Los anuncios pasan por moderación antes de publicarse.'
  },
  {
    question: '¿Es seguro comprar en Mercasto?',
    answer: 'Sí, tomamos la seguridad muy en serio. Recomendamos reunirse en lugares públicos, verificar la insignia de vendedor verificado, nunca pagar por adelantado y revisar las calificaciones. Ofrecemos sistema de reportes para anuncios sospechosos.'
  },
  {
    question: '¿En qué ciudades de México opera Mercasto?',
    answer: 'Mercasto opera en los 32 estados de México y más de 200 ciudades, incluyendo CDMX, Guadalajara, Monterrey, Puebla, Tijuana, Cancún, Mérida, Querétaro y muchas más. Puedes filtrar anuncios por estado y ciudad.'
  },
  {
    question: '¿Cómo funciona el sistema de calificaciones?',
    answer: 'Después de cada transacción, compradores y vendedores pueden calificarse mutuamente con estrellas (1-5) y dejar comentarios. Las calificaciones son públicas y ayudan a otros usuarios a tomar decisiones informadas.'
  },
  {
    question: '¿Puedo vender autos, inmuebles y servicios?',
    answer: 'Sí, Mercasto es una plataforma de clasificados generalista. Puedes publicar autos, motos, inmuebles (casas, departamentos, terrenos), servicios profesionales, electrónica, moda, y mucho más. Cada categoría tiene filtros específicos para facilitar la búsqueda.'
  },
  {
    question: '¿Cómo contacto al vendedor?',
    answer: 'Cada anuncio tiene botones de contacto directo: WhatsApp, llamada telefónica o mensaje interno. También puedes usar nuestro chat integrado. Los vendedores verificados responden más rápido.'
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };

  return (
    <section className="bg-white dark:bg-slate-900 py-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <HelpCircle size={16} />
            Preguntas Frecuentes
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ¿Tienes dudas? Te ayudamos
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Respuestas a las preguntas más comunes sobre Mercasto
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all hover:border-green-300 dark:hover:border-green-700"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="font-semibold text-gray-900 dark:text-white pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  size={20}
                  className={`text-gray-500 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            ¿No encontraste lo que buscabas?
          </p>
          <a
            href="/soporte"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </section>
  );
}
