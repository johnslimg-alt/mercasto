import { Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

const BREADCRUMB_MAP = {
  '/': [{ name: 'Inicio', path: '/' }],
  '/autos': [{ name: 'Inicio', path: '/' }, { name: 'Autos', path: '/autos' }],
  '/inmuebles': [{ name: 'Inicio', path: '/' }, { name: 'Inmuebles', path: '/inmuebles' }],
  '/empleos': [{ name: 'Inicio', path: '/' }, { name: 'Empleos', path: '/empleos' }],
  '/servicios': [{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: '/servicios' }],
  '/tecnologia': [{ name: 'Inicio', path: '/' }, { name: 'Tecnología', path: '/tecnologia' }],
  '/hogar': [{ name: 'Inicio', path: '/' }, { name: 'Hogar', path: '/hogar' }],
  '/moda': [{ name: 'Inicio', path: '/' }, { name: 'Moda', path: '/moda' }],
  '/ocio': [{ name: 'Inicio', path: '/' }, { name: 'Ocio', path: '/ocio' }],
  '/tiendas': [{ name: 'Inicio', path: '/' }, { name: 'Tiendas', path: '/tiendas' }],
  '/precios': [{ name: 'Inicio', path: '/' }, { name: 'Precios', path: '/precios' }],
};

export default function Breadcrumbs({ customItems = null }) {
  const location = useLocation();
  
  const items = customItems || BREADCRUMB_MAP[location.pathname] || [
    { name: 'Inicio', path: '/' },
    { name: 'Página actual', path: location.pathname }
  ];

  // Generate JSON-LD for breadcrumbs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://mercasto.com${item.path}`
    }))
  };

  useEffect(() => {
    // Remove existing breadcrumb JSON-LD
    const existing = document.getElementById('breadcrumb-jsonld');
    if (existing) existing.remove();

    // Add new JSON-LD
    const script = document.createElement('script');
    script.id = 'breadcrumb-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('breadcrumb-jsonld');
      if (el) el.remove();
    };
  }, [location.pathname]);

  return (
    <nav aria-label="Breadcrumb" className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3">
      <ol className="flex items-center gap-2 text-sm max-w-7xl mx-auto">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
            {index === 0 ? (
              <Link to={item.path} className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <Home size={14} />
                <span>{item.name}</span>
              </Link>
            ) : index === items.length - 1 ? (
              <span className="text-gray-900 dark:text-white font-medium">{item.name}</span>
            ) : (
              <Link to={item.path} className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
