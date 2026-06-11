import React from 'react';
import { useNavigate } from 'react-router-dom';
import VerticalHero from '../../verticals/VerticalHero';
import VerticalAdGrid from '../../verticals/VerticalAdGrid';
import MapV3 from '../../common/MapV3';
import { subcategoriesMap } from '../../../constants/mockData';
import {
  BadgeCheck, ShieldCheck, Star, Zap, MessageCircle, BarChart3,
  Tv, Headphones, Laptop, Camera, Gamepad2, Printer, Tablet,
  Shirt, ShoppingBag, Watch, Gem, Scissors as ScissorsIcon,
  Sofa, Lamp, Utensils, Paintbrush, Wrench,
  Cpu, HardDrive, Server, Wifi,
  Smartphone, PhoneCall, TabletSmartphone, RadioTower, Phone,
  PawPrint, Syringe, Bone, Bird,
  Building2, Briefcase, TrendingUp, DollarSign, Globe,
  Tag,
  Bike, Dumbbell, Footprints, Mountain, Fish, Waves,
  BookOpen, Music, Ticket, Gamepad, Activity, Film, FileText
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Icons to cycle through for subcategory tiles when no specific icon is mapped
const FALLBACK_ICONS = [Tag, Star, Zap, ShoppingBag, Globe, TrendingUp];

// Per-category icon maps: subcategory name → Lucide icon
const SUBCAT_ICONS = {
  electronica: {
    'Laptops': Laptop, 'Tablets': Tablet, 'TV y video': Tv, 'Audio': Headphones,
    'Cámaras': Camera, 'Teléfonos y Celulares': Smartphone, 'Drones': Zap, 'Accesorios': Tag,
  },
  moda: {
    'Ropa mujer': Shirt, 'Ropa hombre': ShoppingBag, 'Calzado': Tag, 'Bolsos': ShoppingBag,
    'Accesorios': Gem, 'Joyería': Gem, 'Cosmética': Star,
  },
  hogar: {
    'Muebles': Sofa, 'Decoración': Paintbrush, 'Electrodomésticos': Tv,
    'Cocina': Utensils, 'Jardín': Globe, 'Herramientas': Wrench, 'Organización': Tag, 'Coleccionismo': Star,
  },
  tecnologia: {
    'PCs': Cpu, 'Componentes': HardDrive, 'Monitores': Tv, 'Impresoras': Printer, 'Redes': Wifi,
    // informatica aliases
    'Laptops': Laptop, 'Servidores': Server,
  },
  telefonos: {
    'Smartphones': Smartphone, 'Fundas y Carcasas': Phone, 'Smartwatches': Watch,
    'Cargadores y Cables': Zap, 'Repuestos': Wrench,
  },
  mascotas: {
    'Perros': PawPrint, 'Gatos': PawPrint, 'Aves': Bird, 'Peces': Tag,
    'Accesorios': Bone, 'Alimento': Tag, 'Veterinaria': Syringe,
  },
  infantil: {
    'Juguetes': Star, 'Ropa infantil': Shirt, 'Carriolas': Tag, 'Cunas': Tag,
    'Ropa bebé': Shirt, 'Autoasientos': Tag, 'Cuidado bebé': Tag,
    'Escolar': Tag, 'Muebles infantiles': Sofa, 'Seguridad': ShieldCheck,
  },
  negocios: {
    'Traspasos': Building2, 'Franquicias': Building2, 'Equipamiento': Wrench,
    'Maquinaria': Cpu, 'Industria': Server, 'Inversión': TrendingUp,
  },
  ocio: {
    'Bicicletas': Bike, 'Gym': Dumbbell, 'Running': Footprints, 'Camping': Mountain,
    'Pesca': Fish, 'Surf': Waves, 'Kayak': Waves, 'Arte': Paintbrush,
    'Antigüedades': Star, 'Cómics': BookOpen, 'Monedas y Billetes': DollarSign,
    'Música y Vinilos': Music, 'Instrumentos musicales': Music,
    'Entradas': Ticket, 'Juegos': Gamepad,
  },
  boletos: {
    'Conciertos': Ticket, 'Deportes': Dumbbell, 'Teatro y Cultura': Activity,
    'Festivales': Ticket, 'Cine': Film, 'Conferencias': FileText,
  },
};

const CATEGORY_CONFIG = {
  electronica: {
    title: 'Electrónica',
    subtitle: 'Los mejores productos electrónicos al mejor precio en México',
    description: 'Encuentra televisores, audífonos, consolas de videojuegos y más. Compra electrónica nueva y usada de vendedores verificados en todo México.',
    seoTitle: 'Electrónica en México — Compra y Venta | Mercasto',
    seoDesc: 'Compra y vende electrónica en México. TV, audífonos, consolas, cámaras y más. Vendedores verificados con reseñas en Mercasto.',
    color: 'blue',
    slug: 'electronica',
    trust: [
      { Icon: BadgeCheck, title: 'Vendedores verificados', body: 'Revisamos cada vendedor para garantizarte una compra segura y sin sorpresas.' },
      { Icon: ShieldCheck, title: 'Compra protegida', body: 'Lee reseñas de compradores anteriores antes de cerrar cualquier trato.' },
      { Icon: Star, title: 'Mejores precios', body: 'Compara precios de cientos de vendedores y encuentra la mejor oferta.' },
    ],
    cta: '¿Tienes electrónica para vender?',
    ctaDesc: 'Publica tu anuncio gratis y llega a miles de compradores en México.',
    ctaBtn: 'Vender electrónica →',
  },
  moda: {
    title: 'Moda',
    subtitle: 'Ropa, calzado y accesorios para hombre, mujer y niños en México',
    description: 'Encuentra prendas de diseñador, ropa de segunda mano, calzado y accesorios. Compra y vende moda en México con Mercasto.',
    seoTitle: 'Moda en México — Ropa, Calzado y Accesorios | Mercasto',
    seoDesc: 'Compra y vende ropa, calzado y accesorios en México. Moda nueva y usada para hombre, mujer y niños en Mercasto.',
    color: 'purple',
    slug: 'moda',
    trust: [
      { Icon: BadgeCheck, title: 'Tallas verificadas', body: 'Los vendedores incluyen medidas exactas para que siempre te quede bien.' },
      { Icon: ShieldCheck, title: 'Con reseñas reales', body: 'Lee opiniones de compradores anteriores antes de comprar cualquier prenda.' },
      { Icon: Star, title: 'Moda a tu precio', body: 'Desde marcas premium hasta ropa de segunda mano en excelente estado.' },
    ],
    cta: '¿Tienes ropa o accesorios para vender?',
    ctaDesc: 'Publica tu anuncio gratis y vende tu ropa a compradores en toda México.',
    ctaBtn: 'Vender moda →',
  },
  hogar: {
    title: 'Hogar',
    subtitle: 'Muebles, decoración y artículos para el hogar en México',
    description: 'Encuentra muebles, electrodomésticos, decoración y todo lo que necesitas para tu casa. Compra y vende artículos del hogar en Mercasto.',
    seoTitle: 'Artículos para el Hogar en México — Muebles y Decoración | Mercasto',
    seoDesc: 'Compra y vende muebles, decoración y electrodomésticos en México. Todo para tu hogar en Mercasto.',
    color: 'green',
    slug: 'hogar',
    trust: [
      { Icon: BadgeCheck, title: 'Vendedores de confianza', body: 'Cada vendedor está verificado para que compres muebles y artículos con seguridad.' },
      { Icon: ShieldCheck, title: 'Con fotos reales', body: 'Todos los anuncios incluyen fotografías del artículo real, sin imágenes de stock.' },
      { Icon: Star, title: 'Precios accesibles', body: 'Muebles nuevos y usados en excelente estado a precios que se adaptan a tu presupuesto.' },
    ],
    cta: '¿Tienes artículos del hogar para vender?',
    ctaDesc: 'Publica tu anuncio gratis y llega a compradores en tu ciudad.',
    ctaBtn: 'Vender artículos →',
  },
  tecnologia: {
    title: 'Tecnología',
    subtitle: 'Computadoras, servidores, componentes y gadgets en México',
    description: 'Encuentra laptops, componentes de PC, servidores, gadgets y todo lo relacionado con tecnología. Compra y vende tech en Mercasto.',
    seoTitle: 'Tecnología en México — Computadoras y Componentes | Mercasto',
    seoDesc: 'Compra y vende tecnología en México. Laptops, PCs, servidores, componentes y gadgets en Mercasto.',
    color: 'blue',
    slug: 'informatica',
    trust: [
      { Icon: BadgeCheck, title: 'Especificaciones verificadas', body: 'Los vendedores deben indicar especificaciones técnicas precisas en cada anuncio.' },
      { Icon: ShieldCheck, title: 'Con reseñas reales', body: 'Lee la experiencia de otros compradores antes de adquirir cualquier equipo.' },
      { Icon: Star, title: 'Tecnología al mejor precio', body: 'Compara equipos nuevos y reacondicionados de decenas de vendedores.' },
    ],
    cta: '¿Tienes equipo de tecnología para vender?',
    ctaDesc: 'Publica tu anuncio gratis y conecta con compradores tech en México.',
    ctaBtn: 'Vender tecnología →',
  },
  telefonos: {
    title: 'Teléfonos',
    subtitle: 'Smartphones, accesorios y planes de telefonía en México',
    description: 'Encuentra los últimos smartphones, teléfonos usados, accesorios y planes de telefonía. Compra y vende teléfonos en Mercasto.',
    seoTitle: 'Teléfonos en México — Smartphones y Accesorios | Mercasto',
    seoDesc: 'Compra y vende smartphones y teléfonos en México. Nuevos, usados y reacondicionados con garantía en Mercasto.',
    color: 'blue',
    slug: 'telefonos',
    trust: [
      { Icon: BadgeCheck, title: 'IMEI verificado', body: 'Pedimos a los vendedores verificar el IMEI para confirmar que el equipo no está reportado.' },
      { Icon: ShieldCheck, title: 'Con reseñas reales', body: 'Lee la experiencia de compradores anteriores antes de adquirir cualquier dispositivo.' },
      { Icon: Star, title: 'Mejores precios', body: 'Smartphones nuevos, usados y reacondicionados a precios competitivos.' },
    ],
    cta: '¿Tienes un teléfono para vender?',
    ctaDesc: 'Publica tu anuncio gratis y vende tu smartphone a compradores en México.',
    ctaBtn: 'Vender teléfono →',
  },
  mascotas: {
    title: 'Mascotas',
    subtitle: 'Adopciones, accesorios y servicios para mascotas en México',
    description: 'Encuentra mascotas en adopción, alimentos, accesorios y servicios veterinarios. Todo lo que tu mascota necesita en Mercasto.',
    seoTitle: 'Mascotas en México — Adopción, Accesorios y Veterinarios | Mercasto',
    seoDesc: 'Adopta mascotas y encuentra accesorios, alimento y veterinarios en México. Todo para tu mascota en Mercasto.',
    color: 'green',
    slug: 'mascotas',
    trust: [
      { Icon: BadgeCheck, title: 'Criadores verificados', body: 'Revisamos la identidad de criadores y establecimientos antes de publicar sus anuncios.' },
      { Icon: ShieldCheck, title: 'Adopción responsable', body: 'Promovemos la adopción responsable con información completa sobre cada mascota.' },
      { Icon: Star, title: 'Comunidad pet-friendly', body: 'Miles de amantes de las mascotas comparten consejos, productos y servicios en Mercasto.' },
    ],
    cta: '¿Ofreces servicios para mascotas?',
    ctaDesc: 'Publica tus servicios veterinarios, peluquería o productos y llega a dueños de mascotas en tu ciudad.',
    ctaBtn: 'Publicar anuncio →',
  },

  infantil: {
    title: 'Infantil y Bebés',
    subtitle: 'Juguetes, ropa, carriolas, cunas y todo para niños y bebés en México',
    description: 'Encuentra juguetes, ropa infantil, carriolas, cunas y artículos para bebés. Compra y vende productos para niños en Mercasto.',
    seoTitle: 'Infantil y Bebés en México — Juguetes, Carriolas y Ropa | Mercasto',
    seoDesc: 'Compra y vende artículos para niños y bebés en México. Juguetes, carriolas, cunas, ropa infantil y más en Mercasto.',
    color: 'green',
    slug: 'infantil',
    trust: [
      { Icon: BadgeCheck, title: 'Seguridad garantizada', body: 'Todos los artículos para bebés cumplen con estándares de seguridad verificados.' },
      { Icon: ShieldCheck, title: 'Vendedores de confianza', body: 'Compradores y vendedores verificados para que compres con total tranquilidad.' },
      { Icon: Star, title: 'Productos en buen estado', body: 'Encuentra artículos de calidad para niños a precios mucho más accesibles.' },
    ],
    cta: '¿Tienes artículos infantiles o de bebé para vender?',
    ctaDesc: 'Publica tu anuncio gratis y encuentra a quien lo necesite en tu ciudad.',
    ctaBtn: 'Vender artículo →',
  },
  negocios: {
    title: 'Negocios',
    subtitle: 'Compra y venta de negocios, franquicias e inversiones en México',
    description: 'Encuentra negocios en venta, franquicias, oportunidades de inversión y servicios empresariales. Tu próximo negocio está en Mercasto.',
    seoTitle: 'Negocios en Venta en México — Franquicias e Inversiones | Mercasto',
    seoDesc: 'Compra y vende negocios en México. Franquicias, empresas en venta y oportunidades de inversión en Mercasto.',
    color: 'purple',
    slug: 'negocios',
    trust: [
      { Icon: BadgeCheck, title: 'Empresas verificadas', body: 'Verificamos la legitimidad de cada negocio antes de publicarlo en la plataforma.' },
      { Icon: BarChart3, title: 'Con información financiera', body: 'Accede a datos de ingresos y operación para tomar decisiones informadas.' },
      { Icon: MessageCircle, title: 'Negociación directa', body: 'Comunícate directamente con el vendedor sin intermediarios ni comisiones ocultas.' },
    ],
    cta: '¿Tienes un negocio para vender?',
    ctaDesc: 'Publica tu negocio gratis y conecta con inversores y compradores serios en México.',
    ctaBtn: 'Publicar negocio →',
  },
  ocio: {
    title: 'Ocio y Deportes',
    subtitle: 'Bicicletas, pasatiempos, arte, música y coleccionables en México',
    description: 'Encuentra bicicletas, instrumentos musicales, antigüedades, cómics, libros y todo lo necesario para tu tiempo libre. Compra y vende en Mercasto.',
    seoTitle: 'Ocio, Deportes y Coleccionismo en México | Mercasto',
    seoDesc: 'Compra y vende artículos deportivos, instrumentos musicales, libros, cómics y pasatiempos en México con Mercasto.',
    color: 'purple',
    slug: 'ocio',
    trust: [
      { Icon: BadgeCheck, title: 'Calidad verificada', body: 'Los vendedores detallan el estado de cada artículo para evitar sorpresas.' },
      { Icon: ShieldCheck, title: 'Trato seguro', body: 'Revisa el artículo en persona en puntos de encuentro sugeridos antes de pagar.' },
      { Icon: Star, title: 'Colecciones exclusivas', body: 'Encuentra antigüedades, vinilos y figuras difíciles de conseguir en otros lados.' },
    ],
    cta: '¿Tienes artículos de deporte u ocio para vender?',
    ctaDesc: 'Publica tu anuncio gratis y vende tus instrumentos, bicicletas o cómics de inmediato.',
    ctaBtn: 'Vender artículos →',
  },
  boletos: {
    title: 'Boletos',
    subtitle: 'Conciertos, deportes, teatro, festivales y eventos en México',
    description: 'Encuentra entradas para tus eventos favoritos. Compra y vende boletos para conciertos, partidos de fútbol, obras de teatro y más.',
    seoTitle: 'Compra y Venta de Boletos en México — Conciertos y Eventos | Mercasto',
    seoDesc: 'Compra y vende boletos y entradas en México. Conciertos, festivales, eventos deportivos y obras de teatro en Mercasto.',
    color: 'blue',
    slug: 'boletos',
    trust: [
      { Icon: BadgeCheck, title: 'Entradas originales', body: 'Recomendamos verificar los códigos y sellos de seguridad antes de adquirir cualquier boleto.' },
      { Icon: ShieldCheck, title: 'Trato seguro', body: 'Realiza el intercambio en un lugar público o utiliza métodos de transferencia oficial.' },
      { Icon: Star, title: 'Eventos agotados', body: 'Encuentra boletos de reventa para espectáculos agotados a precios competitivos.' },
    ],
    cta: '¿Tienes boletos que no vas a usar?',
    ctaDesc: 'Publícalos gratis en Mercasto y recupera tu dinero de forma segura.',
    ctaBtn: 'Vender boletos →',
  },
};

const COLOR_CLASSES = {
  blue: {
    viewBtn: 'bg-blue-600 hover:bg-blue-700',
    iconBase: 'bg-blue-50 border-blue-100 text-blue-600',
    iconHover: 'group-hover:bg-blue-600 group-hover:text-white',
    trustIcon: 'bg-blue-50 border-blue-100 text-blue-600',
    trust: 'bg-blue-50',
    viewAll: 'text-blue-600',
    hover: 'hover:border-blue-400',
    cta: 'from-blue-600 to-blue-400',
    ctaBtn: 'text-blue-600',
  },
  green: {
    viewBtn: 'bg-emerald-600 hover:bg-emerald-700',
    iconBase: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    iconHover: 'group-hover:bg-emerald-600 group-hover:text-white',
    trustIcon: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    trust: 'bg-emerald-50',
    viewAll: 'text-emerald-600',
    hover: 'hover:border-emerald-400',
    cta: 'from-emerald-600 to-emerald-400',
    ctaBtn: 'text-emerald-600',
  },
  purple: {
    viewBtn: 'bg-purple-600 hover:bg-purple-700',
    iconBase: 'bg-purple-50 border-purple-100 text-purple-600',
    iconHover: 'group-hover:bg-purple-600 group-hover:text-white',
    trustIcon: 'bg-purple-50 border-purple-100 text-purple-600',
    trust: 'bg-purple-50',
    viewAll: 'text-purple-600',
    hover: 'hover:border-purple-400',
    cta: 'from-purple-600 to-purple-400',
    ctaBtn: 'text-purple-600',
  },
};

export default function CategoryLanding({ category, lang = 'es' }) {
  const navigate = useNavigate();
  const cfg = CATEGORY_CONFIG[category];
  const c = COLOR_CLASSES[cfg?.color] || COLOR_CLASSES.blue;

  // Resolve subcategories from the shared constants map (same source as the rest of the app)
  const subcats = subcategoriesMap[cfg?.slug] || subcategoriesMap[category] || [];
  const iconMap = SUBCAT_ICONS[category] || {};

  React.useEffect(() => {
    if (!cfg) return;
    document.title = cfg.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', cfg.seoDesc);
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
    ogTitle.setAttribute('content', cfg.seoTitle);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
    ogDesc.setAttribute('content', cfg.seoDesc);
  }, [cfg]);

  if (!cfg) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Categoría no encontrada.</div>;
  }

  const categoryParam = cfg.slug;

  const handleSearch = (q, location = {}) => {
    const params = new URLSearchParams({ category: categoryParam });
    if (q) params.set('search', q);
    if (location.state) params.set('state', location.state);
    if (location.city) params.set('location', location.city);
    if (location.radius) params.set('radius_km', location.radius);
    navigate(`/?${params.toString()}`);
  };

  // Build subsections for VerticalHero from the subcategoriesMap
  const heroSubsections = subcats.map((name, idx) => ({
    name,
    query: name,
    Icon: iconMap[name] || FALLBACK_ICONS[idx % FALLBACK_ICONS.length],
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <VerticalHero
        title={cfg.title}
        subtitle={cfg.subtitle}
        searchPlaceholder={`Buscar en ${cfg.title.toLowerCase()}…`}
        color={cfg.color}
        mapQuery={`${cfg.title} en México`}
        onSearch={handleSearch}
        subsections={heroSubsections}
        onSubsectionSelect={(item) => navigate(`/?category=${categoryParam}&search=${encodeURIComponent(item.query)}`)}
        labels={{ viewList: 'Ver lista', viewAll: 'Ver todo', search: 'Buscar', allMexico: 'Todo México', allCity: 'Toda la ciudad', city: 'Ciudad' }}
      />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">

        {/* H1 + description */}
        <section>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">{cfg.title} en México</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-base leading-relaxed">{cfg.description}</p>
        </section>

        {/* Map */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{cfg.title} en el mapa</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Encuentra anuncios cerca de ti.</p>
            </div>
            <button onClick={() => navigate(`/?category=${categoryParam}`)}
              className={`hidden rounded-full px-4 py-2 text-sm font-bold text-white sm:inline-flex ${c.viewBtn}`}>
              Ver lista
            </button>
          </div>
          <MapV3 category={categoryParam} title={`${cfg.title} en México`} className="h-[260px] md:h-[420px]" />
        </section>

        {/* Subcategory grid — sourced from subcategoriesMap (same as the rest of the app) */}
        {subcats.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">¿Qué estás buscando?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {subcats.map((name, idx) => {
                const Icon = iconMap[name] || FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
                return (
                  <button key={name}
                    onClick={() => navigate(`/?category=${categoryParam}&search=${encodeURIComponent(name)}`)}
                    className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 ${c.hover} hover:shadow-md transition-all group text-center`}>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${c.iconBase} ${c.iconHover} transition-colors`}>
                      <Icon size={23} strokeWidth={2.2} />
                    </span>
                    <span className="text-[14px] font-semibold text-slate-700 group-hover:text-slate-900">{name}</span>
                  </button>
                );
              })}
              {/* "Ver todo" tile */}
              <button
                onClick={() => navigate(`/?category=${categoryParam}`)}
                className={`bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 ${c.hover} hover:shadow-md transition-all group text-center`}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${c.iconBase} ${c.iconHover} transition-colors`}>
                  <Globe size={23} strokeWidth={2.2} />
                </span>
                <span className="text-[14px] font-semibold text-slate-500 group-hover:text-slate-900">Ver todo</span>
              </button>
            </div>
          </section>
        )}

        {/* Featured ads */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{cfg.title} destacados</h2>
            <a onClick={() => navigate(`/?category=${categoryParam}`)}
              className={`text-[13px] font-semibold cursor-pointer hover:underline ${c.viewAll}`}>
              Ver todos →
            </a>
          </div>
          <VerticalAdGrid
            apiUrl={`${API_URL}/ads?category=${categoryParam}&per_page=6`}
            viewAllUrl={`/?category=${categoryParam}`}
            viewAllLabel={`Ver todos en ${cfg.title} →`}
            cols={3}
          />
        </section>

        {/* Trust */}
        <section className={`${c.trust} rounded-3xl p-8`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">¿Por qué Mercasto?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cfg.trust.map(item => {
              const Icon = item.Icon;
              return (
                <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border ${c.trustIcon}`}>
                    <Icon size={23} strokeWidth={2.2} />
                  </div>
                  <h3 className="font-bold text-[15px] text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className={`bg-gradient-to-r ${c.cta} rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white`}>
          <div>
            <h2 className="text-2xl font-bold mb-2">{cfg.cta}</h2>
            <p className="text-white/80">{cfg.ctaDesc}</p>
          </div>
          <button onClick={() => navigate('/post')}
            className={`shrink-0 px-8 py-3 bg-white ${c.ctaBtn} font-bold rounded-xl hover:bg-white/90 transition-colors text-[15px]`}>
            {cfg.ctaBtn}
          </button>
        </section>

      </div>
    </div>
  );
}
