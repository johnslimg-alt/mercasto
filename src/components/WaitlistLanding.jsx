import { useToast } from './ui/Toast';
import { events } from '../utils/analytics';
import { useState, useEffect } from 'react';

export default function WaitlistLanding() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);

  // Fetch waitlist count for social proof
  useEffect(() => {
    fetch('/api/waitlist/public-stats')
      .then(res => res.json())
      .then(data => {
        if (data.total_subscribers) {
          setWaitlistCount(data.total_subscribers);
        }
      })
      .catch(() => {
        // Fallback to estimated count if API fails
        setWaitlistCount(Math.floor(Math.random() * 50) + 150);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          source: 'landing',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPosition(data.position);
        setReferralCode(data.referral_code);
        setWaitlistCount(prev => prev + 1);
        events.waitlistSignup(data.position, false);
      } else {
        setError(data.message || 'Error al unirse a la lista de espera');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const shareReferral = (platform) => {
    const referralLink = `${window.location.origin}/waitlist?ref=${referralCode}`;
    const message = `🚀 Únete a Mercasto - Los clasificados del futuro con AI. Estoy en la posición #${position}, ¡ayúdame a subir!\n\n${referralLink}`;
    
    let url = '';
    switch(platform) {
      case 'twitter':
        events.waitlistReferralShared('twitter');
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        break;
      case 'facebook':
        events.waitlistReferralShared('facebook');
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        break;
      case 'whatsapp':
        events.waitlistReferralShared('whatsapp');
        url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        break;
      case 'linkedin':
        events.waitlistReferralShared('linkedin');
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
        break;
      case 'copy':
        events.waitlistReferralShared('copy_link');
        navigator.clipboard.writeText(referralLink);
        toast.success('¡Link copiado al portapapeles!');
        return;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-10 h-10 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Estás en la lista!</h1>
          <p className="text-gray-600 mb-6">
            Gracias por tu interés en Mercasto. Te notificaremos cuando esté disponible.
          </p>
          
          <div className="bg-lime-50 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Tu posición en la lista:</p>
            <p className="text-5xl font-bold text-lime-600 mb-2">#{position}</p>
            <p className="text-xs text-gray-500">de {waitlistCount} personas</p>
          </div>

          {referralCode && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-3">🎯 Sube en la lista invitando amigos</p>
              <p className="text-2xl font-bold text-blue-600 mb-4">{referralCode}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <button
                  onClick={() => shareReferral('twitter')}
                  className="bg-sky-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-sky-600 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={() => shareReferral('facebook')}
                  className="bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
                <button
                  onClick={() => shareReferral('whatsapp')}
                  className="bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => shareReferral('linkedin')}
                  className="bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-800 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>LinkedIn</span>
                </button>
                <button
                  onClick={() => shareReferral('copy')}
                  className="bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copiar</span>
                </button>
              </div>

              <p className="text-xs text-gray-500">
                💡 Cada amigo que se une = sube 5 posiciones en la lista
              </p>
            </div>
          )}
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-lime-600 text-white py-3 rounded-lg font-semibold hover:bg-lime-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-lime-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Mercasto</span>
          </div>
          {waitlistCount > 0 && (
            <div className="hidden sm:flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-lime-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-lime-800">
                {waitlistCount} personas en la lista
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <div className="inline-block bg-lime-100 text-lime-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🚀 Próximamente
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Los clasificados del futuro
              <span className="text-lime-600"> está llegando</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Compra y vende con inteligencia artificial. Anuncios automáticos, 
              precios inteligentes, y una experiencia de usuario sin igual.
            </p>
            
            {/* Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-lime-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI-Powered</h3>
                  <p className="text-gray-600 text-sm">Genera descripciones automáticas y encuentra lo que buscas más rápido</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-lime-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Seguro y Confiable</h3>
                  <p className="text-gray-600 text-sm">Verificación de usuarios y sistema de protección al comprador</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-lime-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Comunidad Activa</h3>
                  <p className="text-gray-600 text-sm">Miles de compradores y vendedores en México</p>
                </div>
              </div>
            </div>

            {/* Social Proof */}
            {waitlistCount > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 border border-lime-200">
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(5, waitlistCount))].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {waitlistCount} personas ya se unieron
                    </p>
                    <p className="text-xs text-gray-500">Únete ahora y sé de los primeros</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Únete a la lista de espera</h2>
            <p className="text-gray-600 mb-6">Sé de los primeros en acceder cuando lancemos</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent transition"
                  placeholder="Tu nombre"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent transition"
                  placeholder="tu@email.com"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-lime-600 text-white py-4 rounded-lg font-semibold hover:bg-lime-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Unirme a la lista</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>100% Seguro</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Sin spam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2026 Mercasto. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
