import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, Home, PlusCircle, User, Users, Settings, Shield, 
  MapPin, ChevronRight, ChevronLeft, Heart, SlidersHorizontal,
  CheckCircle, XCircle, BarChart3, LogOut, Globe, Sparkles, Loader2, Play, Video, Phone, AlertTriangle, Activity,
  Car, Briefcase, Wrench, Monitor, Smartphone, Sofa, Shirt, Baby, PawPrint, Bike, Ticket, Pencil, Moon, Sun, BadgeCheck,
  Star, Zap, Building2, Crown, Store, TrendingUp, UploadCloud, Cpu, ShieldCheck, Camera, Trash2, Download, PieChart as PieChartIcon, QrCode, Share2, Bell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import echo from './echo';

// --- ЛОГОТИП И ИКОНКИ ---
const MercastoLogo = ({ className = "h-11" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 100 100" className="h-full w-auto drop-shadow-sm">
      <path d="M20 70 Q 5 60 0 45 Q 10 70 25 80 Z" fill="#2A7B4C" />
      <path d="M80 70 Q 95 60 100 45 Q 90 70 75 80 Z" fill="#2A7B4C" />
      <path d="M50 95 C 50 95 20 60 20 35 A 30 30 0 0 1 50 5 Z" fill="#0D4A30" />
      <path d="M50 95 C 50 95 80 60 80 35 A 30 30 0 0 0 50 5 Z" fill="#D02F35" />
      <circle cx="50" cy="35" r="14" fill="#FFFFFF" />
      <circle cx="50" cy="35" r="6" fill="#E8833A" /> 
      <ellipse cx="50" cy="18" rx="45" ry="6" fill="#0D4A30" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M30 15 C 30 0 70 0 70 15 Z" fill="#D02F35" />
      <path d="M35 10 C 35 0 65 0 65 10 Z" fill="#E8833A" /> 
      <path d="M30 85 Q 10 85 5 70 Q 20 90 40 95 Z" fill="#1B5A36" />
      <path d="M70 85 Q 90 85 95 70 Q 80 90 60 95 Z" fill="#1B5A36" />
      <rect x="25" y="96" width="50" height="2" rx="1" fill="#0D4A30" />
    </svg>
    <div className="flex flex-col justify-center">
      <span className="font-sans text-xl md:text-2xl font-black text-[#0D4A30] leading-none tracking-tight">Mercasto</span>
      <span className="text-[6px] md:text-[7px] font-bold text-[#0D4A30] uppercase tracking-wider leading-none mt-1">Tablón de anuncios</span>
      <span className="text-[8px] md:text-[9px] font-black text-[#D02F35] tracking-wide leading-none mt-0.5">México</span>
    </div>
  </div>
);

// --- КАРТА ИКОНОК ---
const IconMap = { Car, Home, Briefcase, Wrench, Monitor, Smartphone, Sofa, Shirt, Baby, PawPrint, Bike, Ticket, Star };

// --- ДАННЫЕ И ПЕРЕВОДЫ ---
const mexicoLocations = {
  'Aguascalientes': ['Aguascalientes', 'Jesús María', 'Calvillo'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Playas de Rosarito', 'Tecate'],
  'Baja California Sur': ['La Paz', 'Los Cabos', 'San José del Cabo', 'Loreto'],
  'Campeche': ['Campeche', 'Ciudad del Carmen', 'Champotón'],
  'Chiapas': ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal de las Casas', 'Comitán'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Hidalgo del Parral'],
  'Ciudad de México': ['Álvaro Obregón', 'Coyoacán', 'Cuauhtémoc', 'Miguel Hidalgo', 'Tlalpan', 'Benito Juárez'],
  'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras'],
  'Colima': ['Colima', 'Manzanillo', 'Tecomán'],
  'Durango': ['Durango', 'Gómez Palacio', 'Lerdo'],
  'Estado de México': ['Toluca', 'Ecatepec', 'Nezahualcóyotl', 'Naucalpan', 'Tlalnepantla'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato'],
  'Guerrero': ['Acapulco', 'Chilpancingo', 'Iguala', 'Zihuatanejo'],
  'Hidalgo': ['Pachuca', 'Tulancingo', 'Tula'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tlajomulco', 'Puerto Vallarta'],
  'Michoacán': ['Morelia', 'Uruapan', 'Zamora', 'Lázaro Cárdenas'],
  'Morelos': ['Cuernavaca', 'Jiutepec', 'Cuautla'],
  'Nayarit': ['Tepic', 'Bahía de Banderas', 'Nuevo Vallarta'],
  'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'Guadalupe', 'Apodaca', 'San Nicolás'],
  'Oaxaca': ['Oaxaca', 'Salina Cruz', 'Puerto Escondido', 'Huatulco'],
  'Puebla': ['Puebla', 'Tehuacán', 'Atlixco', 'Cholula'],
  'Querétaro': ['Querétaro', 'San Juan del Río', 'Corregidora'],
  'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Tulum', 'Chetumal', 'Cozumel'],
  'San Luis Potosí': ['San Luis Potosí', 'Ciudad Valles', 'Matehuala'],
  'Sinaloa': ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'Guaymas'],
  'Tabasco': ['Villahermosa', 'Cárdenas', 'Comalcalco'],
  'Tamaulipas': ['Tampico', 'Reynosa', 'Matamoros', 'Ciudad Victoria', 'Nuevo Laredo'],
  'Tlaxcala': ['Tlaxcala', 'Apizaco', 'Huamantla'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Poza Rica', 'Boca del Río'],
  'Yucatán': ['Mérida', 'Valladolid', 'Progreso'],
  'Zacatecas': ['Zacatecas', 'Fresnillo', 'Guadalupe']
};

const subcategoriesMap = {
  'motor': ['Autos Compactos', 'Camionetas y SUV', 'Motos', 'Autopartes'],
  'inmobiliaria': ['Casas en Venta', 'Departamentos en Renta', 'Terrenos', 'Locales Comerciales'],
  'empleo': ['Tecnología', 'Ventas', 'Atención al Cliente', 'Administración'],
  'servicios': ['Reparaciones y Hogar', 'Clases y Cursos', 'Belleza y Salud', 'Eventos'],
  'informatica': ['Laptops', 'Componentes', 'Accesorios', 'Tablets'],
  'telefonia': ['Smartphones', 'Fundas y Micas', 'Wearables', 'Cargadores'],
  'hogar': ['Muebles', 'Electrodomésticos', 'Decoración', 'Jardín'],
  'moda': ['Hombre', 'Mujer', 'Relojes', 'Accesorios'],
  'bebes': ['Paseo', 'Habitación', 'Ropa', 'Juguetes'],
  'mascotas': ['Perros', 'Gatos', 'Aves y Peces', 'Higiene'],
  'ocio': ['Deportes', 'Música', 'Libros', 'Juegos'],
  'boletos': ['Conciertos', 'Deportes', 'Teatro y Cultura', 'Viajes']
};

const mockAds = [
  { id: 1, title: 'MacBook Pro M2 2023 512GB', price: 25000, currency: 'MXN', location: 'Polanco, CDMX', category: 'informatica', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400&h=300', description: 'Computadora en perfecto estado, batería al 100%. Entrego con caja y accesorios originales.', type: 'particular', promoted: false },
  { id: 2, title: 'Hermoso Departamento con vista al mar', price: 280000, currency: 'MXN', location: 'Puerto Vallarta, Jalisco', category: 'inmobiliaria', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400&h=300', description: 'Totalmente amueblado. Amenidades incluyen piscina, gimnasio y seguridad 24/7.', type: 'pro', promoted: 'destacado' },
  { id: 3, title: 'Honda Civic 2020 EX - Único dueño', price: 320000, currency: 'MXN', location: 'Monterrey, Nuevo León', category: 'motor', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400&h=300', description: 'Todos los mantenimientos en agencia. Listo para carretera.', type: 'particular', promoted: 'urgente' },
];

const translations = {
  es: {
    home: 'Inicio', search: 'Buscar', post: 'Publicar', profile: 'Perfil', categories: 'Categorías', recent_ads: 'Nuevos Anuncios',
    search_placeholder: 'Buscar en mercasto.com', all_mexico: 'Todo México',
    post_title: 'Pon tu anuncio', 
    ad_title: 'Título del anuncio', ad_desc: 'Descripción detallada', ad_price: 'Precio', publish_btn: 'Publicar Ahora',
    destacado: 'Destacado', urgente: 'Urgente', free_ad: 'Gratis',
    motor: 'Motor', inmobiliaria: 'Inmuebles', empleo: 'Empleo', servicios: 'Servicios', informatica: 'Informática', telefonia: 'Telefonía', hogar: 'Hogar', moda: 'Moda', bebes: 'Bebés', mascotas: 'Mascotas', ocio: 'Ocio', boletos: 'Boletos',
    dashboard: 'Panel de Usuario', my_ads: 'Mis Anuncios', logout: 'Cerrar sesión', admin_panel: 'Panel de Admin',
    upgrade_pro: 'Conviértete en PRO', upgrade_pro_desc: 'Vende más rápido con herramientas para profesionales.', settings: 'Ajustes', favorites: 'Favoritos',
    tariffs: 'Tarifas', pricing_title: 'Planes de Tarifas', tab_individuals: 'Para Particulares', tab_businesses: 'Para Negocios',
    plan_free: 'Gratuito', plan_plus: 'Pack Plus', plan_pro_basic: 'PRO Estándar', plan_pro_max: 'PRO Ilimitado',
    buy_plan: 'Contratar', current_plan: 'Plan Actual', particular: 'Particular', company_profile: 'Perfil de Empresa', mass_upload: 'Subida masiva (XML/CSV)',
    settings: 'Ajustes', favorites: 'Favoritos', delete_ad: 'Eliminar', confirm_delete: '¿Estás seguro de que deseas eliminar este anuncio?',
    views: 'vistas', leads: 'contactos', active_ads: 'Activos', total_views: 'Vistas', promote: 'Promocionar',
    login: "Iniciar Sesión", register: "Crear Cuenta", email: "Correo", password: "Contraseña", name: "Nombre",
    forgot_password: '¿Olvidaste tu contraseña?', send_link: 'Enviar Enlace', reset_password: 'Restablecer Contraseña', new_password: 'Nueva Contraseña',
    noAds: "NO HAY RESULTADOS", search_results: "RESULTADOS DE BÚSQUEDA",
    heroTitle: "COMPRA Y VENDE EN TODO MÉXICO",
    heroDesc: "Únete a Mercasto. Publica tu anuncio gratis en segundos de forma fácil y segura.",
    heroTag: "MERCADO LÍDER", heroAction: "PON TU ANUNCIO",
    card1: "COMPRA SEGURA", card2: "VENDE RÁPIDO", card3: "SOPORTE 24/7",
    cardDesc1: "Moderación activa y protección contra fraudes.",
    cardDesc2: "Miles de compradores visitan Mercasto buscando ofertas.",
    cardDesc3: "Estamos aquí para ayudarte en cada paso de tu venta.",
    back_to_list: 'Volver al listado', back: 'Volver',
    category_stats: 'Estadísticas de Categorías', personal_info: 'Información Personal', 
    update_photo: 'Actualiza tu foto de perfil...', edit_profile: 'Editar Perfil', security: 'Seguridad', 
    update_password: 'Actualiza tu contraseña...', curr_password: 'Contraseña actual', new_password: 'Nueva contraseña', 
    conf_password: 'Confirmar nueva contraseña', update_pass_btn: 'Actualizar Contraseña', email_settings: 'Correo Electrónico', 
    update_email: 'Actualiza la dirección...', new_email: 'Nuevo correo electrónico', req_change: 'Solicitar Cambio', 
    notifications: 'Notificaciones', choose_alerts: 'Elige qué tipo de alertas quieres...', email_alerts: 'Alertas por correo', 
    push_alerts: 'Notificaciones Push', marketing_alerts: 'Promociones y boletín', save_prefs: 'Guardar Preferencias', 
    interface: 'Interfaz', customize_app: 'Personaliza la apariencia...', autoplay: 'Autoplay en carrusel', danger_zone: 'Zona de Peligro',
    del_warning: 'Una vez que elimines tu cuenta perderás todo...', del_account: 'Eliminar Cuenta', export_json: 'Exportar JSON', 
    cover_photo: 'Foto de Portada', upload_cover: 'Subir portada', comp_name: 'Nombre de la Empresa', comp_desc: 'Descripción del Negocio',
    website: 'Sitio Web', phone: 'Teléfono de Contacto', address: 'Dirección Comercial', save_changes: 'Guardar Cambios',
    cat_tab: 'Categorías', users_tab: 'Usuarios', mod_tab: 'Moderación', coupons_tab: 'Cupones', reports_tab: 'Reportes', 
    add_cat: 'Añadir Nueva Categoría', edit_cat: 'Editar Categoría', slug: 'Slug (identificador único)', icon: 'Icono', 
    name_es: 'Nombre en Español', name_en: 'Nombre en Inglés', sort_order: 'Orden', save_cat: 'Guardar Categoría', cancel: 'Cancelar', 
    existing_cats: 'Categorías Existentes', pending_ads: 'Anuncios Pendientes', no_pending: 'No hay anuncios para moderar', 
    approve: 'Aprobar', reject: 'Rechazar', coupon_gen: 'Generador de Cupones', code: 'Código', credits: 'Créditos', 
    max_uses: 'Usos Máx.', create: 'Crear', no_coupons: 'No hay cupones activos', report_center: 'Centro de Reportes', 
    reported_ad: 'Anuncio', reason: 'Motivo', comments: 'Comentarios', reported_by: 'Reportado por', action: 'Acción', 
    no_reports: 'No hay reportes', reported_user: 'Usuario Reportado', user_mgmt: 'Gestión de Usuarios', search_users: 'Buscar nombre o email...',
    role: 'Rol', hidden_ip: 'IP oculta', no_users: 'No se encontraron usuarios', ad_photos: 'Fotos del anuncio', 
    drag_photos: 'Arrastra tus fotos aquí o', browse: 'explora', max_photos: 'Máximo 10 fotos', category: 'Categoría', 
    select: 'Seleccionar...', condition: 'Estado', new: 'Nuevo', used: 'Usado', location: 'Ubicación', loc_placeholder: 'Escribe tu ciudad...', 
    video_opt: 'Video (Opcional)', report_ad: 'Reportar este anuncio', verified_seller: 'Vendedor Verificado', id_confirmed: 'Identidad confirmada',
    show_qr: 'Mostrar QR de Contacto', similar_ads: 'Anuncios similares', client_reviews: 'Reseñas de clientes', leave_review: 'Deja tu opinión', 
    publish_review: 'Publicar reseña', no_reviews: 'Este vendedor aún no tiene reseñas', scan_qr: 'Escanear QR', report_seller: 'Reportar a este vendedor', 
    verified_id: 'Identidad verificada', high_rep: 'Alta reputación', product_desc: 'Descripción del producto', no_desc: 'El vendedor no ha proporcionado una descripción.',
    download_pdf: 'Descargar Ficha PDF', contacts_qr: 'Contactos (QR)', conversion: 'Conversión'
  },
  en: {
    home: 'Home', search: 'Search', post: 'Post Ad', profile: 'Profile', categories: 'Categories', recent_ads: 'Recent Ads',
    search_placeholder: 'Search on mercasto.com', all_mexico: 'All Mexico',
    post_title: 'Post your ad', 
    ad_title: 'Ad Title', ad_desc: 'Detailed Description', ad_price: 'Price', publish_btn: 'Publish Now',
    destacado: 'Featured', urgente: 'Urgent', free_ad: 'Free',
    motor: 'Motors', inmobiliaria: 'Real Estate', empleo: 'Jobs', servicios: 'Services', informatica: 'Computers', telefonia: 'Phones', hogar: 'Home', moda: 'Fashion', bebes: 'Babies', mascotas: 'Pets', ocio: 'Hobbies', boletos: 'Tickets',
    dashboard: 'Dashboard', my_ads: 'My Ads', logout: 'Logout', admin_panel: 'Admin Panel',
    upgrade_pro: 'Upgrade to PRO', upgrade_pro_desc: 'Sell faster with professional tools.', settings: 'Settings', favorites: 'Favorites',
    tariffs: 'Pricing', pricing_title: 'Pricing Plans', tab_individuals: 'For Individuals', tab_businesses: 'For Businesses',
    plan_free: 'Free', plan_plus: 'Plus Pack', plan_pro_basic: 'PRO Standard', plan_pro_max: 'PRO Unlimited',
    buy_plan: 'Subscribe', current_plan: 'Current Plan', particular: 'Individual', company_profile: 'Company Profile', mass_upload: 'Mass Upload (XML/CSV)',
    settings: 'Settings', favorites: 'Favorites', delete_ad: 'Delete', confirm_delete: 'Are you sure you want to delete this ad?',
    views: 'views', leads: 'leads', active_ads: 'Active', total_views: 'Views', promote: 'Promote',
    login: "Login", register: "Register", email: "Email", password: "Password", name: "Name",
    forgot_password: 'Forgot Password?', send_link: 'Send Link', reset_password: 'Reset Password', new_password: 'New Password',
    noAds: "NO RESULTS FOUND", search_results: "SEARCH RESULTS",
    heroTitle: "BUY AND SELL ACROSS MEXICO",
    heroDesc: "Join Mercasto. Post your ad for free in seconds easily and securely.",
    heroTag: "LEADING MARKET", heroAction: "POST AN AD",
    card1: "SECURE BUYING", card2: "FAST SELLING", card3: "24/7 SUPPORT",
    cardDesc1: "Active moderation and fraud protection.",
    cardDesc2: "Thousands of buyers visit Mercasto daily.",
    cardDesc3: "We are here to help you every step of the way.",
    back_to_list: 'Back to list', back: 'Back', category_stats: 'Category Statistics', personal_info: 'Personal Information', 
    update_photo: 'Update your profile photo...', edit_profile: 'Edit Profile', security: 'Security', update_password: 'Update your password...', 
    curr_password: 'Current password', new_password: 'New password', conf_password: 'Confirm new password', update_pass_btn: 'Update Password', 
    email_settings: 'Email Settings', update_email: 'Update your email...', new_email: 'New email address', req_change: 'Request Change', 
    notifications: 'Notifications', choose_alerts: 'Choose what alerts to receive...', email_alerts: 'Email alerts', push_alerts: 'Push notifications', 
    marketing_alerts: 'Promotions and newsletter', save_prefs: 'Save Preferences', interface: 'Interface', customize_app: 'Customize appearance...', 
    autoplay: 'Carousel autoplay', danger_zone: 'Danger Zone', del_warning: 'Once you delete your account...', del_account: 'Delete Account', 
    export_json: 'Export JSON', cover_photo: 'Cover Photo', upload_cover: 'Upload cover', comp_name: 'Company Name', comp_desc: 'Business Description', 
    website: 'Website', phone: 'Contact Phone', address: 'Business Address', save_changes: 'Save Changes', cat_tab: 'Categories', 
    users_tab: 'Users', mod_tab: 'Moderation', coupons_tab: 'Coupons', reports_tab: 'Reports', add_cat: 'Add New Category', 
    edit_cat: 'Edit Category', slug: 'Slug (unique identifier)', icon: 'Icon', name_es: 'Spanish Name', name_en: 'English Name', 
    sort_order: 'Order', save_cat: 'Save Category', cancel: 'Cancel', existing_cats: 'Existing Categories', pending_ads: 'Pending Ads', 
    no_pending: 'No ads to moderate', approve: 'Approve', reject: 'Reject', coupon_gen: 'Coupon Generator', code: 'Code', 
    credits: 'Credits', max_uses: 'Max Uses', create: 'Create', no_coupons: 'No active coupons', report_center: 'Report Center', 
    reported_ad: 'Ad', reason: 'Reason', comments: 'Comments', reported_by: 'Reported by', action: 'Action', no_reports: 'No reports', 
    reported_user: 'Reported User', user_mgmt: 'User Management', search_users: 'Search name or email...', role: 'Role', hidden_ip: 'Hidden IP', 
    no_users: 'No users found', ad_photos: 'Ad Photos', drag_photos: 'Drag your photos here or', browse: 'browse', max_photos: 'Max 10 photos', 
    category: 'Category', select: 'Select...', condition: 'Condition', new: 'New', used: 'Used', location: 'Location', 
    loc_placeholder: 'Type your city...', video_opt: 'Video (Optional)', report_ad: 'Report this ad', verified_seller: 'Verified Seller', 
    id_confirmed: 'Identity confirmed', show_qr: 'Show Contact QR', similar_ads: 'Similar ads', client_reviews: 'Customer reviews', 
    leave_review: 'Leave your review', publish_review: 'Publish review', no_reviews: 'This seller has no reviews yet', scan_qr: 'Scan QR', 
    report_seller: 'Report this seller', verified_id: 'Verified identity', high_rep: 'High reputation', product_desc: 'Product Description', 
    no_desc: 'The seller did not provide a description.', download_pdf: 'Download PDF Brochure', contacts_qr: 'Contacts (QR)', conversion: 'Conversion'
  },
  pt: {
    home: 'Início', search: 'Pesquisar', post: 'Publicar Anúncio', profile: 'Perfil', categories: 'Categorias', recent_ads: 'Anúncios Recentes',
    search_placeholder: 'Pesquisar no mercasto.com', all_mexico: 'Todo o México',
    post_title: 'Publique seu anúncio', 
    ad_title: 'Título do anúncio', ad_desc: 'Descrição detalhada', ad_price: 'Preço', publish_btn: 'Publicar Agora',
    destacado: 'Destaque', urgente: 'Urgente', free_ad: 'Grátis',
    motor: 'Motores', inmobiliaria: 'Imóveis', empleo: 'Emprego', servicios: 'Serviços', informatica: 'Informática', telefonia: 'Celulares', hogar: 'Casa', moda: 'Moda', bebes: 'Bebês', mascotas: 'Pets', ocio: 'Lazer', boletos: 'Ingressos',
    dashboard: 'Painel', my_ads: 'Meus Anúncios', logout: 'Sair', admin_panel: 'Painel Admin',
    upgrade_pro: 'Seja PRO', upgrade_pro_desc: 'Venda mais rápido com ferramentas profissionais.', settings: 'Configurações', favorites: 'Favoritos',
    tariffs: 'Tarifas', pricing_title: 'Planos de Preços', tab_individuals: 'Para Pessoas', tab_businesses: 'Para Empresas',
    plan_free: 'Grátis', plan_plus: 'Pacote Plus', plan_pro_basic: 'PRO Padrão', plan_pro_max: 'PRO Ilimitado',
    buy_plan: 'Assinar', current_plan: 'Plano Atual', particular: 'Particular', company_profile: 'Perfil da Empresa', mass_upload: 'Upload em Massa (XML/CSV)',
    settings: 'Configurações', favorites: 'Favoritos', delete_ad: 'Excluir', confirm_delete: 'Tem certeza de que deseja excluir este anúncio?',
    views: 'visualizações', leads: 'contatos', active_ads: 'Ativos', total_views: 'Visualizações', promote: 'Promover',
    login: "Entrar", register: "Criar Conta", email: "E-mail", password: "Senha", name: "Nome",
    forgot_password: 'Esqueceu a senha?', send_link: 'Enviar Link', reset_password: 'Redefinir Senha', new_password: 'Nova Senha',
    noAds: "NENHUM RESULTADO ENCONTRADO", search_results: "RESULTADOS DA PESQUISA",
    heroTitle: "COMPRE E VENDA EM TODO O MÉXICO",
    heroDesc: "Junte-se ao Mercasto. Publique seu anúncio grátis em segundos, de forma fácil e segura.",
    heroTag: "MERCADO LÍDER", heroAction: "PUBLIQUE UM ANÚNCIO",
    card1: "COMPRA SEGURA", card2: "VENDA RÁPIDO", card3: "SUPORTE 24/7",
    cardDesc1: "Moderação ativa e proteção contra fraudes.",
    cardDesc2: "Milhares de compradores visitam o Mercasto diariamente.",
    cardDesc3: "Estamos aqui para ajudar em cada etapa.",
    back_to_list: 'Voltar à lista', back: 'Voltar', category_stats: 'Estatísticas de Categoria', personal_info: 'Informação Pessoal', 
    update_photo: 'Atualize sua foto de perfil...', edit_profile: 'Editar Perfil', security: 'Segurança', update_password: 'Atualize sua senha...', 
    curr_password: 'Senha atual', new_password: 'Nova senha', conf_password: 'Confirmar nova senha', update_pass_btn: 'Atualizar Senha', 
    email_settings: 'Configurações de E-mail', update_email: 'Atualize seu e-mail...', new_email: 'Novo e-mail', req_change: 'Solicitar Mudança', 
    notifications: 'Notificações', choose_alerts: 'Escolha quais alertas receber...', email_alerts: 'Alertas por e-mail', push_alerts: 'Notificações Push', 
    marketing_alerts: 'Promoções e newsletter', save_prefs: 'Salvar Preferências', interface: 'Interface', customize_app: 'Personalizar aparência...', 
    autoplay: 'Autoplay do carrossel', danger_zone: 'Zona de Perigo', del_warning: 'Depois de excluir sua conta...', del_account: 'Excluir Conta', 
    export_json: 'Exportar JSON', cover_photo: 'Foto de Capa', upload_cover: 'Enviar capa', comp_name: 'Nome da Empresa', comp_desc: 'Descrição do Negócio', 
    website: 'Site', phone: 'Telefone de Contato', address: 'Endereço Comercial', save_changes: 'Salvar Alterações', cat_tab: 'Categorias', 
    users_tab: 'Usuários', mod_tab: 'Moderação', coupons_tab: 'Cupons', reports_tab: 'Denúncias', add_cat: 'Adicionar Categoria', 
    edit_cat: 'Editar Categoria', slug: 'Slug (identificador)', icon: 'Ícone', name_es: 'Nome em Espanhol', name_en: 'Nome em Inglês', 
    sort_order: 'Ordem', save_cat: 'Salvar Categoria', cancel: 'Cancelar', existing_cats: 'Categorias Existentes', pending_ads: 'Anúncios Pendentes', 
    no_pending: 'Sem anúncios para moderar', approve: 'Aprovar', reject: 'Rejeitar', coupon_gen: 'Gerador de Cupons', code: 'Código', 
    credits: 'Créditos', max_uses: 'Usos Máx.', create: 'Criar', no_coupons: 'Nenhum cupom ativo', report_center: 'Central de Denúncias', 
    reported_ad: 'Anúncio', reason: 'Motivo', comments: 'Comentários', reported_by: 'Denunciado por', action: 'Ação', no_reports: 'Nenhuma denúncia', 
    reported_user: 'Usuário Denunciado', user_mgmt: 'Gestão de Usuários', search_users: 'Buscar nome ou e-mail...', role: 'Cargo', hidden_ip: 'IP Oculto', 
    no_users: 'Nenhum usuário encontrado', ad_photos: 'Fotos do anúncio', drag_photos: 'Arraste suas fotos ou', browse: 'procurar', max_photos: 'Máx 10 fotos', 
    category: 'Categoria', select: 'Selecionar...', condition: 'Condição', new: 'Novo', used: 'Usado', location: 'Localização', 
    loc_placeholder: 'Digite sua cidade...', video_opt: 'Vídeo (Opcional)', report_ad: 'Denunciar este anúncio', verified_seller: 'Vendedor Verificado', 
    id_confirmed: 'Identidade confirmada', show_qr: 'Mostrar QR de Contato', similar_ads: 'Anúncios similares', client_reviews: 'Avaliações de clientes', 
    leave_review: 'Deixe sua opinião', publish_review: 'Publicar avaliação', no_reviews: 'Este vendedor não tem avaliações', scan_qr: 'Escanear QR', 
    report_seller: 'Denunciar vendedor', verified_id: 'Identidade verificada', high_rep: 'Alta reputação', product_desc: 'Descrição do produto', 
    no_desc: 'O vendedor não forneceu uma descrição.', download_pdf: 'Baixar Folheto PDF', contacts_qr: 'Contatos (QR)', conversion: 'Conversão'
  }
};

const spotlightRealEstate = [
  { type: 'BUY', color: 'bg-slate-900', price: '$3,250,000', specs: '3 bed • 2 bath • 145m² Condo Marina', location: 'PV • 1d ago', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { type: 'RENT', color: 'bg-[#84CC16]', price: '$28,000/mo', specs: '2 bed • 2 bath • 98m² Versalles', location: 'GDL • 5h ago', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600', badge: { label: 'Top seller', color: 'bg-blue-100 text-blue-700' } },
  { type: 'BUY', color: 'bg-slate-900', price: '$1,850,000', specs: 'Casa 3 rec • 180m² • Jardín', location: 'Tlaquepaque • 2d ago', img: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600' },
  { type: 'RENT', color: 'bg-[#84CC16]', price: '$18,500/mo', specs: 'Loft 1 bed • Zona Romántica', location: 'PV • 3h ago', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600', badge: { label: 'Urgent', color: 'bg-red-500 text-white' } },
  { type: 'BUY', color: 'bg-slate-900', price: '$4,900,000', specs: 'Penthouse 4 bed • Vista mar', location: 'Marina • 6h ago', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { type: 'RENT', color: 'bg-[#84CC16]', price: '$12,000/mo', specs: 'Studio amueblado • Providencia', location: 'GDL • 1d ago', img: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=600' }
];

const jobsBoard = [
  { role: 'Senior React Developer', company: 'Mercasto', salary: '$65k – $85k', loc: 'Remote', logo: 'bg-lime-50 border', initial: 'MD' },
  { role: 'Restaurant Manager', company: 'La Palapa', salary: '$25,000', loc: 'Puerto Vallarta', logo: 'bg-amber-100 text-amber-700', initial: 'LP' },
  { role: 'Real Estate Agent', company: 'Century 21', salary: '$20k + Commission', loc: 'Guadalajara', logo: 'bg-blue-100 text-blue-700', initial: 'C21' },
  { role: 'English Teacher', company: 'Harmon Hall', salary: '$18,000', loc: 'Zapopan', logo: 'bg-emerald-100 text-emerald-700', initial: 'HH' },
  { role: 'Delivery Driver', company: 'DiDi', salary: '$15k – $22k', loc: 'Puerto Vallarta', logo: 'bg-purple-100 text-purple-700', initial: 'Di' },
  { role: 'Graphic Designer (Freelance)', company: 'Freelance', salary: '$30,000', loc: 'Remote', logo: 'bg-slate-200', initial: '🎨' },
  { role: 'Barista', company: 'Starbucks', salary: '$12,500', loc: 'Guadalajara', logo: 'bg-green-100 text-green-700', initial: 'SB' },
  { role: 'Plumber - Full Time', company: 'Servicios Pro', salary: '$22,000', loc: 'Zapopan', logo: 'bg-orange-100', initial: '🔧' }
];

const servicesMarketplace = [
  { title: 'House Cleaning Pro', stars: '4.9 (342)', price: '$450', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100', desc: 'Deep cleaning, apartments & houses. Same-day available in PV.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { title: 'AC Repair 24/7', stars: '4.8 (189)', price: '$650', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=100', desc: 'Installation, maintenance, emergency repair. 1yr warranty.', badge: { label: 'Top', color: 'bg-blue-100 text-blue-700' } },
  { title: 'Personal Trainer', stars: '5.0 (97)', price: '$300/hr', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100', desc: 'Home or gym sessions. Weight loss & strength programs.' },
  { title: 'Event Photographer', stars: '4.7 (156)', price: '$2,500', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=100', desc: 'Weddings, corporate, real estate. Drone included.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { title: 'Plumber Expert', stars: '4.9 (423)', price: '$400', img: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=100', desc: 'Leaks, installations, 24h emergency service Vallarta.' },
  { title: 'Web Design Studio', stars: '5.0 (64)', price: '$8,900', img: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=100', desc: 'Landing pages, e-commerce, SEO. 7-day delivery.', badge: { label: 'Top', color: 'bg-blue-100 text-blue-700' } },
  { title: 'Dog Walker & Sitting', stars: '4.9 (201)', price: '$150', img: 'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=100', desc: 'Daily walks, pet sitting, vet visits. Insured.' },
  { title: 'Electrician Certified', stars: '4.8 (178)', price: '$500', img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=100', desc: 'Wiring, panels, smart home installation. Licensed.', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } }
];

const automotiveDeals = [
  { price: '$235,000', title: 'Nissan Versa 2021 Advance', specs: '45,000 km • Auto • GDL', img: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { price: '$289,000', title: 'VW Jetta 2019 Comfortline', specs: '62,300 km • Auto • PV', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600', badge: { label: 'Top seller', color: 'bg-blue-100 text-blue-700' } },
  { price: '$345,000', title: 'Toyota Corolla 2020 Hybrid', specs: '38,100 km • Hybrid • GDL', img: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=600', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } },
  { price: '$285,000', title: 'Honda Civic 2019 Touring', specs: '71,200 km • Auto • Zapopan', img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600' },
  { price: '$195,000', title: 'Chevrolet Aveo 2022 LT', specs: '29,500 km • Manual • PV', img: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600', badge: { label: 'New', color: 'bg-[#84CC16] text-white' } },
  { price: '$420,000', title: 'Mazda CX-5 2021 i Sport', specs: '41,000 km • SUV • GDL', img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600', badge: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700' } }
];

const recentlyViewed = [
  { name: 'iPhone 15 Pro', price: '$18,999', img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=200' },
  { name: '2BR Marina', price: '$32k/mo', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200' },
  { name: 'Yamaha MT-07', price: '$145k', img: 'https://images.unsplash.com/photo-1558981282-6f5f7d5a2b8f?w=200' },
  { name: 'MacBook Air M2', price: '$24,500', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200' },
  { name: 'Condo 3 bed', price: '$3.25M', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200' },
  { name: 'Nike Air Max', price: '$1,850', img: 'https://images.unsplash.com/photo-1542291026-797186bcca9e?w=200' }
];

const API_URL = 'https://mercasto.com/api'; 

// --- ФУНКЦИЯ ДЛЯ ПУТЕЙ КАРТИНОК ---
const getImageUrl = (url, fallbackUrl) => {
  const defaultImg = fallbackUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop';
  if (!url) return defaultImg;
  let cleanUrl = url;
  if (typeof url === 'string' && url.startsWith('[')) {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed) && parsed.length > 0) cleanUrl = parsed[0];
    } catch(e) {}
  }
  if (Array.isArray(cleanUrl) && cleanUrl.length > 0) {
    cleanUrl = cleanUrl[0];
  }
  if (typeof cleanUrl !== 'string') return defaultImg;
  if (cleanUrl.startsWith('http')) return cleanUrl;
  cleanUrl = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
  return `https://mercasto.com/storage/${cleanUrl}`;
};

// --- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ МАССИВА КАРТИНОК ---
const getImageUrls = (url, fallbackUrl) => {
  const defaultImg = fallbackUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop';
  if (!url) return [defaultImg];
  let urls = [];
  if (typeof url === 'string' && url.startsWith('[')) {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed)) urls = parsed;
    } catch(e) {}
  } else if (Array.isArray(url)) {
    urls = url;
  }
  if (urls.length === 0) urls = typeof url === 'string' ? [url] : [defaultImg];
  
  return urls.map(u => {
    if (typeof u !== 'string') return defaultImg;
    if (u.startsWith('http')) return u;
    const cleanUrl = u.startsWith('/') ? u.slice(1) : u;
    return `https://mercasto.com/storage/${cleanUrl}`;
  });
};

// --- КАСТОМНЫЙ ТУЛТИП ДЛЯ ГРАФИКОВ ---
const ChartTooltip = ({ active, payload, label, unit, isDarkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`text-center px-3 py-2 rounded-xl shadow-xl border relative ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-900 border-slate-700 text-white'}`}>
        <div className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-300'}`}>{label}</div>
        <div className="text-[12px] font-bold">{payload[0].value} {payload[0].value === 1 ? unit.replace(/s$/, '') : unit}</div>
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent ${isDarkMode ? 'border-t-slate-800' : 'border-t-slate-900'}`}></div>
      </div>
    );
  }
  return null;
};

// --- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ОТНОСИТЕЛЬНОГО ПУТИ ---
const getRelativePath = (fullUrl) => {
  try {
    const url = new URL(fullUrl);
    // remove /storage/ prefix
    return url.pathname.substring('/storage/'.length);
  } catch (e) {
    return fullUrl; // if it's already a path or invalid url
  }
};

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ WEB PUSH ---
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// --- YOUTUBE URL ПАРСЕР ---
const getYouTubeVideoId = (url) => {
    if (!url) return null;// This logic is no longer needed if we switch to direct uploads.
    // However, I will leave it for backward compatibility or future use.
    const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(youtubeRegex);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- КОМПОНЕНТ СЛАЙДЕРА ---
const ImageSlider = ({ images, isPro, autoplay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  const next = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetInterval();
  };

  const resetInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (autoplay && images.length > 1) {
      intervalRef.current = setInterval(() => setCurrentIndex(prev => (prev + 1) % images.length), 4000);
    }
  };

  const prev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    resetInterval();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, images.length]);

  return (
    <div className="w-full h-full relative group bg-slate-100" onMouseEnter={() => clearInterval(intervalRef.current)} onMouseLeave={resetInterval}>
      <img src={images[currentIndex]} alt={`Slide ${currentIndex}`} className="w-full h-full object-cover transition-all duration-300" loading="eager" />
      
      {isPro && <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 z-10"><Building2 className="w-4 h-4" /> Vendedor PRO</div>}

      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur hover:bg-white text-slate-700 p-2 rounded-full shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur hover:bg-white text-slate-700 p-2 rounded-full shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-slate-900/40 px-3 py-2 rounded-full backdrop-blur-md">
            {images.map((_, idx) => (
              <div key={idx} className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-[#84CC16]' : 'w-2 bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- КОМПОНЕНТ СЛАЙДЕРА С ПОДДЕРЖКОЙ ВИДЕО ---
const MediaSlider = ({ media, isPro, autoplay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  const currentItem = media[currentIndex] || { type: 'image', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop' };

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Don't autoplay if the current item is a video
    if (autoplay && media.length > 1 && currentItem.type !== 'video') {
      intervalRef.current = setInterval(goToNext, 4000);
    }
  };

  const goToNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const goToPrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoplay, media, currentIndex]);

  return (
    <div className="w-full h-full relative group bg-slate-100" onMouseEnter={() => clearInterval(intervalRef.current)} onMouseLeave={resetInterval}>
      {currentItem.type === 'video' ? (
        currentItem.processing ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="font-semibold">Procesando video...</p>
            <p className="text-sm text-slate-300">El video estará disponible en breve.</p>
          </div>
        ) : (
          <video src={currentItem.url} controls className="w-full h-full object-contain bg-black" />
        )
      ) : (
        <img src={currentItem.url} alt={`Slide ${currentIndex}`} className="w-full h-full object-cover transition-all duration-300" loading="eager" />
      )}
      {isPro && <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm text-white text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 z-10"><Building2 className="w-4 h-4" /> Vendedor PRO</div>}
      {media.length > 1 && (
        <>
          <button onClick={goToPrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur hover:bg-white text-slate-700 p-2 rounded-full shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={goToNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur hover:bg-white text-slate-700 p-2 rounded-full shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10"><ChevronRight className="w-6 h-6" /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-slate-900/40 px-3 py-2 rounded-full backdrop-blur-md">
            {media.map((item, idx) => (<div key={idx} onClick={() => setCurrentIndex(idx)} className={`h-2 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${idx === currentIndex ? 'w-6 bg-[#84CC16]' : 'w-2 bg-white/70'}`}>{item.type === 'video' && <Video className="w-3 h-3 text-white/80 absolute" />}</div>))}
          </div>
        </>
      )}
    </div>
  );
};

// --- РЕКЛАМНЫЙ БАННЕР ---
const AdSenseBanner = () => (
  <div className="w-full col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-5 2xl:col-span-6 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-[12px] font-bold uppercase tracking-widest border border-slate-200 h-[120px] shadow-inner my-2">
    Espacio Publicitario
  </div>
);

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'es');
  const t = translations[lang] || translations['es'];

  const [serverAds, setServerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [activeCat, setActiveCat] = useState(''); // Фильтр по категории
  const [viewedAd, setViewedAd] = useState(null); 
  const [viewedCompany, setViewedCompany] = useState(null);
  const [companyAds, setCompanyAds] = useState([]);
  const [loadingCompanyAds, setLoadingCompanyAds] = useState(false);
  const [companyReviews, setCompanyReviews] = useState([]);
  const [companyRatingStats, setCompanyRatingStats] = useState({ average: 0, total: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null); 
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');

  const [accountType, setAccountType] = useState('particular');
  const [userRole, setUserRole] = useState('admin');
  
  const [form, setForm] = useState({ title: '', price: '', description: '', location: '', category: '', condition: 'nuevo' });
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [images, setImages] = useState([]); // { source: 'new' | 'existing', file?: File, url?: string, preview: string }
  const [videoFile, setVideoFile] = useState(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [priceTab, setPriceTab] = useState(accountType); 
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [dashboardPage, setDashboardPage] = useState(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', avatarFile: null, avatarPreview: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sliderAutoplay, setSliderAutoplay] = useState(() => localStorage.getItem('sliderAutoplay') !== 'false');
  const [notificationsForm, setNotificationsForm] = useState({ email_alerts: true, push_notifications: true, marketing: false });
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userAds, setUserAds] = useState([]);
  const [favoriteAds, setFavoriteAds] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [adminCatForm, setAdminCatForm] = useState({ slug: '', name_es: '', name_en: '', icon: 'Star', sort_order: 100 });
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('my_ads');
  const [adminTab, setAdminTab] = useState('categories');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [adminPendingAds, setAdminPendingAds] = useState([]);
  const [loadingPendingAds, setLoadingPendingAds] = useState(false);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', credits: 100, max_uses: 10 });
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingAd, setReportingAd] = useState(null);
  const [reportForm, setReportForm] = useState({ reason: '', comments: '' });
  const [adminReports, setAdminReports] = useState([]);
  const [adminUserReports, setAdminUserReports] = useState([]);
  const [adminReportTab, setAdminReportTab] = useState('ads');
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [userReportForm, setUserReportForm] = useState({ reason: '', comments: '' });
  const [authPhone, setAuthPhone] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState(null); // { lat, lng, name }
  const [searchLocationInput, setSearchLocationInput] = useState('');
  const locationInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Вставьте сюда публичный VAPID ключ из вашего .env
  const PUBLIC_VAPID_KEY = 'BAhZDxk3BjI_OCkHCOEyihsxsuCfcDtMilUZjMfecw-Lt4JvHNfYkmZIU_llDiaF3L0uOtXsgU60IZksmtpTrIs';
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const lastAdElementRef = useCallback(node => {
    if (loadingAds || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Загружаем следующую страницу, когда триггер-элемент становится видимым
        loadAds(currentPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingAds, loadingMore, hasMore, currentPage]);
  
  // --- СОСТОЯНИЕ ТЕМНОЙ ТЕМЫ ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [qrModalData, setQrModalData] = useState(null);
  const fileInputRef = useRef(null);
  const [adStatusFilter, setAdStatusFilter] = useState('active');
  const [companyForm, setCompanyForm] = useState({
    name: user?.name || 'AutoMotors México S.A.',
    description: 'Somos una agencia de autos seminuevos certificados con más de 10 años de experiencia en el mercado...',
    website: 'https://automotors.mx',
    phone: user?.phone_number || '+52 322 123 4567',
    address: 'Av. Francisco Medina Ascencio 1234, Puerto Vallarta',
    coverPreview: ''
  });

  const handleExportCompanyData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (res.ok) {
        const userData = await res.json();
        const exportData = {
          company_info: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone_number || companyForm.phone,
            role: userData.role,
            verified: userData.is_verified,
            registered_at: userData.created_at
          },
          profile_settings: companyForm,
          ads: userAds.map(ad => ({
            id: ad.id, title: ad.title, category: ad.category, price: ad.price,
            status: ad.status, views: ad.views || 0, whatsapp_clicks: ad.whatsapp_clicks || 0
          }))
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `mercasto_company_${userData.id}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } else alert('Error al obtener datos del backend');
    } catch (err) { console.error("Export error", err); alert('Error de conexión'); }
  };

  // --- ПЕРЕХВАТ OAuth ТОКЕНА ИЗ URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const rToken = params.get('reset_token');
    const rEmail = params.get('email');
    const eToken = params.get('email_token');
    const paymentStatus = params.get('payment');

    // Обработка возврата с платежного шлюза
    if (paymentStatus === 'success') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch(`${API_URL}/user/notifications/create`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Pago completado', message: '¡Gracias por tu compra! Tu servicio ha sido activado.' })
        }).then(() => loadNotifications());
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'error') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        alert('El pago no se pudo completar o fue cancelado.');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (eToken) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch(`${API_URL}/user/email/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ token: eToken })
        })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert(data.message || 'Correo actualizado con éxito.');
          } else alert(data.message || 'Error al confirmar el correo.');
        })
        .catch(err => console.error(err))
        .finally(() => window.history.replaceState({}, document.title, window.location.pathname));
      } else {
        alert('Debes iniciar sesión primero para confirmar tu correo.');
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuthModal(true);
      }
    } else if (rToken && rEmail) {
      setResetToken(rToken);
      setResetEmail(rEmail);
      setAuthMode('reset_password');
      setShowAuthModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token) {
      localStorage.setItem('auth_token', token);
      window.history.replaceState({}, document.title, window.location.pathname); // Очищаем URL
      
      fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(userData => {
          setUser(userData);
          setUserRole(userData.role || 'individual');
          localStorage.setItem('user', JSON.stringify(userData));
        }).catch(err => console.error(err));
    } else if (error) {
      alert('Error de autenticación con Google');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { setPriceTab(accountType); }, [accountType, showPricingModal]);

  useEffect(() => { setDashboardPage(1); }, [dashboardTab, adStatusFilter]);

  // --- СОХРАНЕНИЕ НАСТРОЕК СЛАЙДЕРА ---
  useEffect(() => {
    localStorage.setItem('sliderAutoplay', sliderAutoplay);
  }, [sliderAutoplay]);

  // --- ПРИМЕНЕНИЕ ТЕМНОЙ ТЕМЫ ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- ДИНАМИЧЕСКОЕ SEO & GOOGLE TAG MANAGER ---
  useEffect(() => {
    let title = "Mercasto | Compra, Vende y Renta en Todo México";
    let desc = "Únete a Mercasto, el mercado local de crecimiento más rápido en México. Compra autos, renta departamentos, busca empleo y ofrece servicios cerca de ti.";
    
    if (viewedAd) {
      title = `${viewedAd.title} - ${viewedAd.location?.split(',')[0]} | Mercasto`;
      desc = viewedAd.description ? viewedAd.description.substring(0, 160) : desc;
    } else if (viewedCompany) {
      title = `${viewedCompany.name} - Tienda en Mercasto`;
    } else if (activeCat) {
      const catName = categoriesData.find(c => c.slug === activeCat)?.name[lang] || activeCat;
      title = `${catName} en México | Anuncios Clasificados Mercasto`;
    }

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtual_page_view',
        page_title: title,
        page_path: `/${currentTab}${activeCat ? `?cat=${activeCat}` : ''}${viewedAd ? `?ad=${viewedAd.id}` : ''}`
      });
    }
  }, [currentTab, activeCat, viewedAd, viewedCompany, categoriesData, lang]);

  // --- WEBSOCKETS LISTENER ---
  useEffect(() => {
    if (user?.id && echo) {
        const channel = echo.private(`App.Models.User.${user.id}`);
        
        channel.listen('.NewNotification', (e) => {
            console.log('Real-time event received:', e);
            // The actual notification data is inside e.notification
            setNotifications(prev => [e.notification, ...prev]);
        });

        return () => {
            channel.stopListening('.NewNotification');
        };
    }
}, [user]);

  // --- WEB PUSH API SUBSCRIPTION LOGIC ---
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/push-subscribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (error) { console.error('Push subscribe error:', error); }
  };

  const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        const token = localStorage.getItem('auth_token');
        await fetch(`${API_URL}/user/push-unsubscribe`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      }
    } catch (error) { console.error('Push unsubscribe error:', error); }
  };

  // --- GOOGLE PLACES AUTOCOMPLETE ---
  useEffect(() => {
    if (window.google && locationInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
            types: ['(cities)'],
            componentRestrictions: { country: 'mx' }
        });
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                setSearchLocation({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                });
                setSearchLocationInput(place.formatted_address);
            }
        });
    }
  }, [locationInputRef.current]); // Re-run if the ref becomes available

  useEffect(() => {
    if (user && user.notification_preferences) {
      try {
        const prefs = typeof user.notification_preferences === 'string' ? JSON.parse(user.notification_preferences) : user.notification_preferences;
        setNotificationsForm({
          email_alerts: prefs.email_alerts ?? true,
          push_notifications: prefs.push_notifications ?? true,
          marketing: prefs.marketing ?? false,
        });
      } catch (e) {}
    }
    
    // Автоматически обновляем подписку, если пользователь уже разрешил уведомления
    if (user && Notification.permission === 'granted') {
       subscribeToPush();
    }
    
  }, [user]);

  const loadUserAds = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUserAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching user ads", err); }
  }, [user]);

  const loadFavoriteAds = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/favorite-ads`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFavoriteAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching favorite ads", err); }
  }, [user]);

  useEffect(() => {
    loadUserAds();
    loadFavoriteAds();
  }, [loadUserAds, loadFavoriteAds]);

  // --- ЗАГРУЗКА УВЕДОМЛЕНИЙ ---
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/notifications/list`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching notifications", err); }
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkNotificationRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/${id}/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/read-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/user/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (currentTab === 'profile' && accountType === 'pro' && user) {
      fetch(`${API_URL}/user/analytics?days=${analyticsDays}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAnalyticsData(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => console.error("Error fetching analytics", err));
    }
  }, [currentTab, accountType, user, analyticsDays]);

  useEffect(() => {
    setIsMapUpdating(true);
    const timer = setTimeout(() => {
      setDebouncedLocation(form.location);
      setIsMapUpdating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [form.location]);

  const loadAds = useCallback(async (page = 1) => {
    if (page > 1) {
      setLoadingMore(true);
    } else {
      setLoadingAds(true);
    }
    const params = new URLSearchParams();
    params.append('page', page);
    // Если задано местоположение для поиска по радиусу, используем его
    if (searchLocation && searchLocation.lat) {
        params.append('lat', searchLocation.lat);
        params.append('lng', searchLocation.lng);
        params.append('radius', radius);
    }
    // Добавляем другие фильтры, если они есть
    if (searchQuery) params.append('search', searchQuery);
    if (activeCat) params.append('category', activeCat);
    if (selectedState && !searchLocation) params.append('location', selectedState);

    try {
      const res = await fetch(`${API_URL}/ads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.data || []);
        setServerAds(prev => page === 1 ? items : [...prev, ...items]);
        setCurrentPage(data.current_page || 1);
        setHasMore(data.last_page ? data.current_page < data.last_page : false);
      }
    } catch (err) { console.error("Error fetching ads", err); } 
    finally { setLoadingAds(false); setLoadingMore(false); }
  }, [searchQuery, activeCat, selectedState, searchLocation, radius]); // Зависимости для пересоздания функции

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(data);
      }
    } catch (err) { console.error("Error fetching favorites", err); }
  }, [user]);

  useEffect(() => {
    setServerAds([]); // Сбрасываем объявления при смене фильтров
    loadAds(1);
  }, [searchQuery, activeCat, selectedState, searchLocation, radius]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ПОЛЬЗОВАТЕЛИ ---
  const loadAdminUsers = useCallback(async () => {
    setLoadingAdminUsers(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        // Фикс белого экрана: Laravel возвращает { data: [...] } при пагинации
        setAdminUsers(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (err) { console.error("Error fetching users", err); } 
    finally { setLoadingAdminUsers(false); }
  }, []);

  const handleAdminVerifyUser = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/verify`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: data.is_verified } : u));
      }
    } catch (err) { console.error("Error verifying user", err); }
  };

  const handleAdminDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUsers(prev => prev.filter(u => u.id !== id));
      else alert('Error al eliminar usuario');
    } catch (err) { console.error("Error deleting user", err); }
  };

  const handleAdminChangeRole = async (id, newRole) => {
    if (!window.confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${id}/role`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
      else alert('Error al cambiar rol');
    } catch (err) { console.error("Error changing role", err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: МОДЕРАЦИЯ ---
  const loadPendingAds = useCallback(async () => {
    setLoadingPendingAds(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/ads/pending`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminPendingAds(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching pending ads", err); }
    finally { setLoadingPendingAds(false); }
  }, []);

  const handleModerateAd = async (id, status) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAdminPendingAds(prev => prev.filter(ad => ad.id !== id));
        if (status === 'active') loadAds(1); // Refresh the public feed after approval
      }
    } catch (err) { console.error("Error moderating ad", err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: ЖАЛОБЫ (REPORTS) ---
  const loadAdminReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminReports(Array.isArray(data) ? data : (data.data || []));
      }
      const res2 = await fetch(`${API_URL}/admin/user-reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res2.ok) {
        const data2 = await res2.json();
        setAdminUserReports(Array.isArray(data2) ? data2 : (data2.data || []));
      }
    } catch (err) { console.error("Error fetching reports", err); }
    finally { setLoadingReports(false); }
  }, []);

  const handleDeleteReport = async (id) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDeleteUserReport = async (id) => {
    if (!window.confirm('¿Eliminar este reporte de usuario?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/user-reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAdminUserReports(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КУПОНЫ ---
  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminCoupons(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error fetching coupons", err); }
    finally { setLoadingCoupons(false); }
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(couponForm)
      });
      if (res.ok) {
        setCouponForm({ code: '', credits: 100, max_uses: 10 });
        loadCoupons();
        alert('Cupón creado exitosamente');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Error al crear cupón');
      }
    } catch (err) { console.error(err); alert('Error de conexión'); }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('¿Eliminar cupón?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setAdminCoupons(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleFavorite = async (e, id) => {
    e.stopPropagation();
    if (!user) { setShowAuthModal(true); return; }
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}/favorite`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'added') setFavoriteIds(prev => [...prev, id]);
        else setFavoriteIds(prev => prev.filter(fId => fId !== id));
        loadFavorites();
      }
    } catch (err) { console.error("Error toggling favorite", err); }
  };

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategoriesData(Array.isArray(data) ? data : (data.data || [])))
      .catch(err => console.error("Error fetching categories", err));
  }, []);

  // --- ПАНЕЛЬ АДМИНИСТРАТОРА: КАТЕГОРИИ ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const method = editingCatId ? 'PUT' : 'POST';
      const url = editingCatId ? `${API_URL}/categories/${editingCatId}` : `${API_URL}/categories`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCatForm)
      });
      
      if (res.ok) {
        const catRes = await fetch(`${API_URL}/categories`);
        setCategoriesData(await catRes.json());
        cancelCatEdit();
        alert('Categoría guardada exitosamente');
      } else alert('Error al guardar la categoría');
    } catch (err) { console.error(err); alert('Error de conexión'); }
    finally { setAdminLoading(false); }
  };

  const handleEditCategory = (cat) => {
    setEditingCatId(cat.id || cat.slug);
    setAdminCatForm({ slug: cat.slug, name_es: cat.name?.es || '', name_en: cat.name?.en || '', icon: cat.icon || 'Star', sort_order: cat.sort_order || 100 });
  };

  const cancelCatEdit = () => {
    setEditingCatId(null);
    setAdminCatForm({ slug: '', name_es: '', name_en: '', icon: 'Star', sort_order: 100 });
  };

  // Only use real server ads. mockAds are only used as fallback when no real ads are loaded yet.
  const allAds = useMemo(() => serverAds.length > 0 ? serverAds : mockAds, [serverAds]);

  // --- ЛОГИКА АВТОРИЗАЦИИ (API) ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      let endpoint = '';
      if (authMode === 'register') endpoint = '/register';
      else if (authMode === 'login') endpoint = '/login';
      else if (authMode === 'forgot_password') endpoint = '/forgot-password';
      else if (authMode === 'reset_password') {
        endpoint = '/reset-password';
        data.token = resetToken;
        data.email = resetEmail;
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();

      if (res.ok) {
        if (authMode === 'forgot_password' || authMode === 'reset_password') {
          alert(result.message);
          setAuthMode('login');
        } else if (result.two_factor) {
          // Backend requires 2FA — capture the email and redirect to 2FA input
          setTwoFactorEmail(data.email || '');
          setRequiresTwoFactor(true);
        } else {
          if (!result.user) {
            alert('Error de servidor: respuesta inesperada.');
            return;
          }
          setUser(result.user);
          setUserRole(result.user.role || 'individual');
          localStorage.setItem('user', JSON.stringify(result.user));
          if (result.access_token) localStorage.setItem('auth_token', result.access_token);
          setShowAuthModal(false);
        }
      } else {
        alert(result.message || result.error || "Credenciales incorrectas");
      }
    } catch (err) { 
      console.error("Auth error", err); 
      alert("Error de conexión");
    } finally { 
      setAuthLoading(false); 
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.email = twoFactorEmail;

    try {
      const res = await fetch(`${API_URL}/login/two-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) localStorage.setItem('auth_token', result.access_token);
        setShowAuthModal(false);
        setRequiresTwoFactor(false);
      } else {
        alert(result.message || 'Código 2FA inválido.');
      }
    } catch (err) { alert('Error de conexión.'); }
    finally { setAuthLoading(false); }
  };

  const handlePhoneRequestSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    const phone = formData.get('phone_number');
    setAuthPhone(phone);
    try {
      const res = await fetch(`${API_URL}/auth/phone/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message || 'SMS enviado');
        setAuthMode('phone_verify');
      } else alert(result.message || 'Error al enviar SMS');
    } catch (err) { alert('Error de conexión'); }
    finally { setAuthLoading(false); }
  };

  const handlePhoneVerifySubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.target);
    try {
      const res = await fetch(`${API_URL}/auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: authPhone, code: formData.get('code') })
      });
      const result = await res.json();
      if (res.ok) {
        setUser(result.user); setUserRole(result.user.role || 'individual');
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) localStorage.setItem('auth_token', result.access_token);
        setShowAuthModal(false);
      } else alert(result.message || 'Código SMS inválido');
    } catch (err) { alert('Error de conexión'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    // Clear local state first for immediate UX response
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setFavoriteIds([]);
    setUserAds([]);
    setFavoriteAds([]);
    setCurrentTab('home');
    // Revoke token on backend (fire-and-forget, don't block UI)
    if (token) {
      fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Logout revoke error:', err));
    }
  };

  // --- ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ---
  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      avatarFile: null,
      avatarPreview: user.avatar_url ? getImageUrl(user.avatar_url) : ''
    });
    setShowProfileModal(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const formData = new FormData();
    formData.append('name', profileForm.name);
    if (profileForm.avatarFile) formData.append('avatar', profileForm.avatarFile);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileModal(false);
      } else alert('Error al actualizar el perfil');
    } catch (err) { console.error("Profile update error", err); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Contraseña actualizada exitosamente.');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        alert(`Error: ${data.message || 'No se pudo actualizar la contraseña.'}`);
      }
    } catch (err) { console.error("Password update error", err); alert('Error de conexión'); }
    finally { setPasswordLoading(false); }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/email/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Se ha enviado un enlace de confirmación a tu nuevo correo.');
        setEmailForm({ new_email: '', password: '' });
      } else {
        alert(`Error: ${data.message || 'No se pudo procesar la solicitud.'}`);
      }
    } catch (err) { console.error("Email update error", err); alert('Error de conexión'); }
    finally { setEmailLoading(false); }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setNotificationsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/notifications`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationsForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (notificationsForm.push_notifications) {
           subscribeToPush();
        } else {
           unsubscribeFromPush();
        }
        alert('Preferencias de notificación guardadas.');
      } else alert('Error al guardar preferencias.');
    } catch (err) { console.error("Notifications update error", err); alert('Error de conexión'); }
    finally { setNotificationsLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción eliminará todos tus anuncios permanentemente y no se puede deshacer.')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Cuenta eliminada exitosamente.');
        handleLogout();
      } else {
        alert('Error al eliminar la cuenta.');
      }
    } catch (err) { console.error("Account deletion error", err); }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImageObjects = files.map(file => ({
      source: 'new',
      file: file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImageObjects].slice(0, 10));
  };

  const removeImage = (idxToRemove) => {
    const imageToRemove = images[idxToRemove];
    // Если это новое изображение, освобождаем URL-объект для предотвращения утечек памяти
    if (imageToRemove.source === 'new') {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    setImages(prev => prev.filter((_, i) => i !== idxToRemove));
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) { 
      setShowAuthModal(true); 
      return; 
    }
    
    setPostLoading(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('price', form.price);
    formData.append('description', form.description);
    formData.append('location', form.location || 'México');
    formData.append('category', form.category || 'general');
    if (user && user.id) formData.append('user_id', user.id);

    // Обработка изображений для создания и обновления
    images.forEach(img => {
      if (img.source === 'new' && img.file) {
        formData.append('images[]', img.file);
      } else if (img.source === 'existing' && img.url) {
        // Отправляем обратно относительный путь для существующих изображений
        formData.append('existing_images[]', getRelativePath(img.url));
      }
    });

    // Добавляем видеофайл, если он выбран
    if (videoFile) {
      formData.append('video_file', videoFile);
    }

    try {
      const token = localStorage.getItem('auth_token');
      const isUpdating = !!editingAd;
      const endpoint = isUpdating ? `${API_URL}/ads/${editingAd.id}` : `${API_URL}/ads`;
      
      // Для обновлений Laravel может имитировать PUT/PATCH с полем _method, но мы определили маршрут POST.
      // Поэтому мы просто отправляем POST на эндпоинт обновления.

      const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData 
      });

      if (res.ok) {
        // Сбрасываем состояние формы
        setForm({ title: '', price: '', description: '', location: '', category: '', condition: 'nuevo' });
        setImages([]);
        setVideoFile(null);
        setEditingAd(null);
        setCurrentTab('home');
        loadAds(1); // Reload after create/update
        loadUserAds(); // Обновляем список моих объявлений
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message || 'Ошибка при сохранении объявления.'}`);
      }
    } catch (err) { console.error("Post error"); } 
    finally { setPostLoading(false); }
  };

  // --- УДАЛЕНИЕ ОБЪЯВЛЕНИЯ ---
  const handleDeleteAd = async (id) => {
    if (!window.confirm(t.confirm_delete)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        loadAds(1); // Reload after delete
        loadUserAds(); // Обновляем список моих объявлений
      } else {
        alert("Error al eliminar el anuncio.");
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // --- РЕДАКТИРОВАНИЕ ОБЪЯВЛЕНИЯ ---
  const handleEditAd = (ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      price: ad.price,
      description: ad.description || '',
      location: ad.location || '',
      category: ad.category || '',
      condition: ad.condition || 'usado',
    });
    setImages(getImageUrls(ad.image_url, ad.image).map(url => ({
      source: 'existing',
      url: url,
      preview: url
    })));
    setVideoFile(null); // Сбрасываем видеофайл при редактировании
    setCurrentTab('post');
  };

  // --- АНАЛИТИКА КЛИКОВ WHATSAPP ---
  const handleWhatsAppClick = (ad) => {
    fetch(`${API_URL}/ads/${ad.id}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ channel: 'whatsapp' })
    }).catch(err => console.log("Analytics error", err));
      
      // GTM Event push para conversiones
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'whatsapp_click',
          ad_id: ad.id,
          ad_title: ad.title,
          ad_category: ad.category
        });
      }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${viewedCompany.id}/reviews`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        setReviewForm({ rating: 5, comment: '' });
        handleViewCompany(viewedCompany); // Перезагружаем профиль продавца для обновления отзывов
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message}`);
      }
    } catch (err) { console.error("Review error", err); alert('Error de conexión'); } 
    finally { setSubmittingReview(false); }
  };

  // --- МАССОВАЯ ЗАГРУЗКА (CSV/XML) ---
  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBulk(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Subida masiva completada');
        window.location.reload(); // Recargar para mostrar los nuevos anuncios en el dashboard
      } else {
        alert(`Error: ${data.message || 'No se pudo procesar el archivo.'}`);
      }
    } catch (err) {
      console.error("Bulk upload error", err);
      alert('Error de conexión al subir el archivo.');
    } finally {
      setIsUploadingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- ПЕРЕКЛЮЧЕНИЕ СТАТУСА ОБЪЯВЛЕНИЯ (АКТИВНО/НЕАКТИВНО) ---
  const handleToggleAdStatus = async (ad) => {
    if (ad.status === 'pending' || ad.status === 'rejected') {
      alert('Este anuncio está en revisión o fue rechazado y no puede ser activado manualmente.');
      return;
    }
    const newStatus = ad.status === 'inactive' ? 'active' : 'inactive';
    // Оптимистичное обновление UI
    setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/ads/${ad.id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) { console.error("Error updating status", err); }
  };

  // --- ПОЖАЛОВАТЬСЯ НА ОБЪЯВЛЕНИЕ ---
  const handleReportAd = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/ads/${reportingAd.id}/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(reportForm)
      });
      const data = await res.json();
      alert(data.message || 'Reporte enviado.');
      setShowReportModal(false);
      setReportForm({ reason: '', comments: '' });
      setReportingAd(null);
    } catch (err) { console.error("Report error", err); alert('Error de conexión'); }
  };

  // --- ПОЖАЛОВАТЬСЯ НА ПОЛЬЗОВАТЕЛЯ ---
  const handleUserReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/users/${viewedCompany.id}/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(userReportForm)
      });
      const data = await res.json();
      alert(data.message || 'Reporte de usuario enviado.');
      setShowUserReportModal(false);
      setUserReportForm({ reason: '', comments: '' });
    } catch (err) { console.error("Report error", err); alert('Error de conexión'); }
  };

  // --- ПОДЕЛИТЬСЯ ОБЪЯВЛЕНИЕМ ---
  const handleShareAd = (ad) => {
    if (navigator.share) {
      navigator.share({ title: ad.title, text: `Mira este anuncio en Mercasto: ${ad.title}`, url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

  // --- ОПЛАТА ЧЕРЕЗ CLIP MEXICO ---
  const handleClipPayment = async (amount, description, adId = null) => {
    if (!user) { setShowAuthModal(true); return; }
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/payment/clip`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, ad_id: adId })
      });
      const data = await res.json();
      if (res.ok && data.payment_url) {
        window.location.href = data.payment_url;
      } else alert('Error al generar pago con Clip');
    } catch (err) { console.error("Clip payment error", err); alert('Error de conexión'); }
  };
  
  // --- ПРОДВИЖЕНИЕ ОБЪЯВЛЕНИЯ (Выбор: Кредиты или Карта) ---
  const handlePromoteAd = async (ad) => {
    const balance = parseFloat(user?.balance || 0);
    if (balance >= 50) {
      if (window.confirm(`¿Deseas usar 50 créditos de tu saldo para promocionar este anuncio? (Saldo actual: ${balance} Créditos)`)) {
        try {
          const token = localStorage.getItem('auth_token');
          const res = await fetch(`${API_URL}/ads/${ad.id}/promote/credits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (res.ok) {
            alert('¡Anuncio promocionado con éxito!');
            const updatedUser = { ...user, balance: data.balance };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, promoted: 'destacado' } : a));
            setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, promoted: 'destacado' } : a));
          } else alert(data.message || 'Error al promocionar');
        } catch (e) { console.error(e); alert('Error de conexión'); }
      }
    } else {
      handleClipPayment(50, `Promoción de anuncio: ${ad.title}`, ad.id);
    }
  };

  // --- АКТИВАЦИЯ КУПОНА ---
  const handleRedeemCoupon = async () => {
    const code = window.prompt("Introduce tu código de cupón promocional:");
    if (!code || !code.trim()) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/user/coupons/redeem`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok && data.balance !== undefined) {
        const updatedUser = { ...user, balance: data.balance };
        setUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (e) { console.error(e); alert('Error al canjear cupón'); }
  };

  // --- ПРОСМОТР ОБЪЯВЛЕНИЯ И АНАЛИТИКА ---
  const handleViewAd = (ad) => {
    window.history.pushState({ popup: 'ad' }, '', `#ad-${ad.id}`);
    setViewedAd(ad);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
    fetch(`${API_URL}/ads/${ad.id}/view`, { method: 'POST' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success) {
          setServerAds(prev => prev.map(a => a.id === ad.id ? { ...a, views: data.views } : a));
          if (user) {
            setUserAds(prev => prev.map(a => a.id === ad.id ? { ...a, views: data.views } : a));
          }
        }
      })
      .catch(err => console.error("Error recording view", err));
  };

  // --- ПРОСМОТР ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const handleViewCompany = (seller) => {
    if (!seller) return;
    window.history.pushState({ popup: 'company' }, '', `#company-${seller.id}`);
    setViewedCompany(seller);
    window.scrollTo(0, 0); // Исправляет проблему "белого экрана" из-за скролла
    setLoadingCompanyAds(true);
    Promise.all([
      fetch(`${API_URL}/ads?user_id=${seller.id}`).then(res => res.ok ? res.json() : { data: [] }),
      fetch(`${API_URL}/users/${seller.id}/reviews`).then(res => res.ok ? res.json() : { reviews: [], average: 0, total: 0 })
    ]).then(([adsData, reviewsData]) => {
        setCompanyAds(adsData.data || (Array.isArray(adsData) ? adsData : []));
        setCompanyReviews(reviewsData.reviews || []);
        setCompanyRatingStats({ average: reviewsData.average || 0, total: reviewsData.total || 0 });
    }).catch(err => console.error(err)).finally(() => setLoadingCompanyAds(false));
  };

  // --- РЕНДЕР КАРТОЧКИ ---
  const renderAdCard = (ad) => {
    const isDestacado = ad.promoted === 'destacado' || ad.is_featured;
    const isUrgente = ad.promoted === 'urgente';
    const isPro = ad.type === 'pro';
    const isFav = favoriteIds.includes(ad.id);
    const safeImage = getImageUrl(ad.image_url, ad.image);

    return (
      <article key={ad.id} onClick={() => handleViewAd(ad)} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer group flex flex-col h-full shrink-0">
        <div className="relative">
          <img src={safeImage} loading="lazy" className="w-full h-[160px] md:h-[180px] object-cover group-hover:scale-105 transition-transform duration-500" alt={ad.title}/>
          <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="heart absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white z-10">
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
          </button>
          {isDestacado && <span className="badge absolute top-2.5 left-2.5 bg-blue-600 text-white z-10">Top seller</span>}
          {!isDestacado && isUrgente && <span className="badge absolute top-2.5 left-2.5 bg-amber-500 text-white z-10">Urgent</span>}
          {!isDestacado && !isUrgente && isPro && <span className="badge absolute top-2.5 left-2.5 bg-[#84CC16] text-white z-10">PRO</span>}
        </div>
        <div className="p-3.5 flex flex-col flex-1 relative bg-white z-10">
          <div className="text-[20px] font-bold leading-none">${Number(ad.price).toLocaleString()} <span className="text-[11px] font-medium text-slate-500">MXN</span></div>
          <h3 className="text-[14px] font-medium mt-1.5 line-clamp-1">{ad.title}</h3>
          <div className="flex items-center justify-between mt-auto pt-2 text-[12px] text-slate-500">
            <span className="truncate pr-2">{ad.location?.split(',')[0] || 'México'}</span>
          </div>
          {ad.type !== 'pro' && (
            <button className="w-full mt-3 btn-md bg-[#0F172A] text-white hover:bg-black" onClick={(e) => { e.stopPropagation(); handleViewAd(ad); }}>Contact</button>
          )}
        </div>
      </article>
    );
  };

  // --- РЕНДЕР СТРАНИЦЫ ТОВАРА ---
  const renderAdDetailScreen = () => {
    if (!viewedAd) return null;
    const ad = viewedAd;
    
    const imageItems = getImageUrls(ad.image_url, ad.image).map(url => ({ type: 'image', url, id: url }));
    const mediaItems = [...imageItems];

    if (ad.video_url) {
        mediaItems.unshift({
            type: 'video',
            id: 'video-item',
            url: getImageUrl(ad.video_url),
            processing: ad.video_processing_status === 'pending',
        });
    }

    const isPro = ad.type === 'pro';
    const relatedAds = allAds.filter(a => a.category === ad.category && a.id !== ad.id).slice(0, 4);

    return (
      <div className="bg-[var(--paper)] min-h-screen pb-24 md:pb-12 w-full">
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-40 border-b border-slate-200 px-4 py-3 flex items-center shadow-sm h-[60px]">
           <button onClick={() => { if(window.location.hash) window.history.back(); else { setViewedAd(null); window.history.replaceState({}, '', '/'); } }} className="btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent">
             <ChevronLeft className="w-4 h-4" /> {t.back_to_list}
           </button>
        </div>

        <div className="max-w-[1000px] mx-auto md:py-8 pt-4 px-4">
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row rounded-3xl">
             <div className="w-full md:w-1/2 h-72 md:h-[500px] lg:h-[600px] bg-slate-50 relative overflow-hidden">
                <MediaSlider media={mediaItems} isPro={isPro} autoplay={sliderAutoplay} />
             </div>

             <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-slate-900 font-bold text-[32px] md:text-[38px] tracking-tight leading-none">${Number(ad.price).toLocaleString()} <span className="text-[14px] text-slate-500 font-medium tracking-normal align-top">MXN</span></p>
                    <div className="flex items-center gap-2">
                      {ad.category === 'inmobiliaria' && (
                        <a href={`${API_URL}/ads/${ad.id}/pdf`} target="_blank" className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group" title={t.download_pdf}>
                          <Download className="w-5 h-5 text-slate-400 group-hover:text-slate-700" />
                        </a>
                      )}
                      <button onClick={() => handleShareAd(ad)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group">
                        <Share2 className="w-5 h-5 text-slate-400 group-hover:text-slate-700" />
                      </button>
                      <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 group">
                        <Heart className={`w-5 h-5 ${favoriteIds.includes(ad.id) ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                      </button>
                    </div>
                  </div>
                  <h1 className="text-[20px] md:text-[24px] font-semibold text-slate-900 leading-tight mb-5">{ad.title}</h1>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-100 pb-6">
                     <span className="flex items-center text-[12px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                         <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400"/> {ad.location || 'México'}
                     </span>
                     {ad.category && (
                       <span className="flex items-center text-[12px] font-semibold text-[#65A30D] bg-[#84CC16]/10 px-2.5 py-1.5 rounded-lg">
                           {categoriesData.find(c => c.slug === ad.category)?.name?.[lang] || ad.category}
                       </span>
                     )}
                  </div>

                  <div className="mb-8">
                     <h3 className="text-[15px] font-bold text-slate-900 mb-3">{t.product_desc}</h3>
                     <p className="text-[14px] text-slate-600 whitespace-pre-line leading-relaxed">{ad.description || t.no_desc}</p>
                  </div>

                  <div className="mb-8">
                     <h3 className="text-[15px] font-bold text-slate-900 mb-3">{t.location}</h3>
                     <div className="w-full h-48 md:h-64 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                         <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(ad.location || 'Mexico')}&t=&z=14&ie=UTF8&iwloc=&output=embed`} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)' }}></iframe>
                     </div>
                  </div>

                  <button onClick={() => { setReportingAd(ad); setShowReportModal(true); }} className="text-[12px] text-slate-400 hover:text-red-500 mb-6 flex items-center gap-1.5 underline underline-offset-4 font-medium transition-colors w-fit">
                    <Shield size={14} /> {t.report_ad}
                  </button>

                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 mb-8 md:mb-0 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleViewCompany(ad.user)}>
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                         {ad.user?.avatar_url ? (
                           <img src={getImageUrl(ad.user.avatar_url)} className="w-full h-full rounded-xl object-cover" alt="Seller Avatar" />
                         ) : (
                           ad.user?.name ? ad.user.name[0].toUpperCase() : <User size={24}/>
                         )}
                       </div>
                       <div>
                         <p className="font-semibold text-slate-900 text-[15px] flex items-center gap-1.5">{ad.user?.name || t.verified_seller} {ad.user?.role === 'business' && <span className="badge bg-slate-900 text-white leading-none px-1.5 py-0.5">PRO</span>}</p>
                         <p className="text-[12px] font-medium text-slate-500 flex items-center mt-0.5"><CheckCircle className="w-3.5 h-3.5 text-[#84CC16] mr-1"/> {t.id_confirmed}</p>
                       </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div className="fixed md:static bottom-0 left-0 w-full bg-white md:bg-transparent p-4 md:p-0 border-t md:border-none border-slate-200 z-50 mt-auto pt-6">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { handleWhatsAppClick(ad); const phone = ad.user?.phone_number ? ad.user.phone_number.replace(/\D/g, '') : '521234567890'; window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Hola, me interesa tu anuncio: ' + ad.title)}`, '_blank'); }}
                        className="btn-lg flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center gap-2 shadow-md"
                      >
                         <Phone className="w-5 h-5" /> WhatsApp
                      </button>
                      <button 
                        onClick={() => { const phone = ad.user?.phone_number ? ad.user.phone_number.replace(/\D/g, '') : '521234567890'; window.open(`https://t.me/+${phone}`, '_blank'); }}
                        className="btn-lg flex-1 bg-[#229ED9] hover:bg-[#1C88BA] text-white flex items-center justify-center gap-2 shadow-md"
                      >
                         <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.535.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.35-.11l-6.4 4.02-2.76-.89c-.6-.188-.614-.6.126-.89L17.2 7.15c.523-.188.983.118.694 1.07z"/></svg> Telegram
                      </button>
                    </div>
                </div>
             </div>
          </div>

          {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
          {relatedAds.length > 0 && (
            <div className="mt-12 mb-8 pt-8 border-t border-slate-200">
              <h3 className="text-[20px] font-bold text-slate-900 mb-6">{t.similar_ads}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedAds.map(relAd => renderAdCard(relAd))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ПУБЛИЧНОГО ПРОФИЛЯ ПРОДАВЦА (STOREFRONT) ---
  const renderStorefrontScreen = () => {
    if (!viewedCompany) return null;

    return (
      <div className="bg-[var(--paper)] min-h-screen pb-24 md:pb-12 w-full">
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-40 border-b border-slate-200 px-4 py-3 flex items-center shadow-sm h-[60px]">
           <button onClick={() => { if(window.location.hash) window.history.back(); else { setViewedCompany(null); } }} className="btn-sm flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent">
             <ChevronLeft className="w-4 h-4" /> {t.back}
           </button>
        </div>

        <div className="max-w-[1000px] mx-auto md:py-8 pt-4 px-4">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-8">
            <div className="h-32 md:h-48 bg-slate-200 relative">
               <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=400&fit=crop" className="w-full h-full object-cover opacity-90 mix-blend-multiply" alt="Cover" />
            </div>
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center relative">
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-3xl shadow-lg border-4 border-white -mt-14 md:-mt-16 z-10 relative shrink-0">
                 {viewedCompany.avatar_url ? <img src={getImageUrl(viewedCompany.avatar_url)} className="w-full h-full rounded-xl object-cover"/> : (viewedCompany.name ? viewedCompany.name[0].toUpperCase() : <User size={32}/>)}
               </div>
               <div className="flex-1 pt-2 md:pt-0">
                 <h1 className="text-[24px] font-bold text-slate-900 flex items-center gap-2">
                   {viewedCompany.name || 'Vendedor'} 
                   {viewedCompany.is_verified && <CheckCircle className="w-5 h-5 text-[#84CC16]" />}
                   {viewedCompany.role === 'business' && <span className="badge bg-slate-900 text-white ml-1">PRO</span>}
                 </h1>
                 <p className="text-[14px] text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> México</p>
                 <div className="flex items-center gap-1 mt-2">
                   <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                   <span className="font-bold text-slate-900 text-[14px]">{companyRatingStats.average}</span>
                   <span className="text-slate-500 text-[13px]">({companyRatingStats.total} reseñas)</span>
                 </div>
                 
                 {/* СИСТЕМА БЕЙДЖЕЙ (Achievements) */}
                 <div className="flex flex-wrap gap-2 mt-4">
                   {viewedCompany.is_verified && (
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-700 text-[12px] font-semibold">
                       <CheckCircle className="w-3.5 h-3.5"/> {t.verified_id}
                     </div>
                   )}
                   {companyAds.length >= 10 && (
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-blue-50 border-blue-100 text-blue-700 text-[12px] font-semibold">
                       <TrendingUp className="w-3.5 h-3.5"/> +10 {t.active_ads}
                     </div>
                   )}
                   {companyRatingStats.average >= 4.5 && companyRatingStats.total >= 5 && (
                     <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-100 text-amber-700 text-[12px] font-semibold">
                       <Star className="w-3.5 h-3.5 fill-amber-500"/> {t.high_rep}
                     </div>
                   )}
                 </div>
                 <button onClick={() => setShowUserReportModal(true)} className="mt-4 text-[12px] text-slate-400 hover:text-red-500 flex items-center gap-1.5 underline underline-offset-4 font-medium transition-colors w-fit">
                   <AlertTriangle size={14} /> {t.report_seller}
                 </button>
               </div>
               <div className="w-full md:w-auto">
                 <button 
                   onClick={() => setQrModalData(viewedCompany.phone_number ? `https://wa.me/${viewedCompany.phone_number.replace(/\D/g, '')}` : 'tel:+521234567890')}
                   className="btn-md w-full border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <QrCode className="w-4 h-4" /> {t.scan_qr}
                 </button>
               </div>
            </div>
          </div>

          <h3 className="text-[18px] font-bold text-slate-900 mb-5">{t.active_ads} ({companyAds.length})</h3>
          {loadingCompanyAds ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin" /></div>
          ) : companyAds.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px] bg-white rounded-3xl border border-slate-200">{t.noAds}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {companyAds.map(ad => renderAdCard(ad))}
            </div>
          )}

          {/* REVIEWS SECTION */}
          <div className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400"/> {t.client_reviews} ({companyRatingStats.total})
            </h3>
            
            {user && user.id !== viewedCompany.id && (
              <form onSubmit={handleReviewSubmit} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-[14px] font-semibold text-slate-800 mb-3">{t.leave_review}</h4>
                <div className="flex items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button type="button" key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} className="focus:outline-none">
                      <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} placeholder="¿Cómo fue tu experiencia con este vendedor?" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[14px] mb-3 min-h-[80px]"></textarea>
                <button type="submit" disabled={submittingReview} className="btn-sm bg-[#0F172A] text-white hover:bg-black flex items-center gap-2">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin"/> : t.publish_review}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {companyReviews.length === 0 ? (
                <p className="text-slate-500 text-[13px]">{t.no_reviews}</p>
              ) : (
                companyReviews.map((rev, idx) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          {rev.reviewer_avatar ? <img src={getImageUrl(rev.reviewer_avatar)} className="w-full h-full object-cover"/> : <User className="w-5 h-5 m-1.5 text-slate-400"/>}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-900">{rev.reviewer_name}</p>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    {rev.comment && <p className="text-[13px] text-slate-600 mt-2">{rev.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ С QR-КОДОМ ---
  const renderQRModal = () => {
    if (!qrModalData) return null;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalData)}`;
    
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQrModalData(null)}>
        <div className="bg-white rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95 flex flex-col items-center max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <button onClick={() => setQrModalData(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <div className="w-12 h-12 bg-lime-100 text-[#65A30D] rounded-2xl flex items-center justify-center mb-4"><QrCode size={28}/></div>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Escanea para contactar</h2>
          <p className="text-[13px] text-slate-500 mb-6 text-center">Abre la cámara de tu celular y escanea este código para enviar un mensaje al vendedor.</p>
          <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl shadow-sm mb-6">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
          </div>
          <button onClick={() => setQrModalData(null)} className="btn-md w-full bg-slate-100 text-slate-700 hover:bg-slate-200">Cerrar</button>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ (REPORT) ---
  const renderReportModal = () => {
    if (!showReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
        <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Anuncio</h2>
          <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a entender el problema con este anuncio.</p>
          <form onSubmit={handleReportAd} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
              <select required value={reportForm.reason} onChange={e => setReportForm({...reportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
                <option value="">Selecciona un motivo...</option>
                <option value="Fraude o estafa">Fraude o estafa</option>
                <option value="Contenido inapropiado">Contenido inapropiado</option>
                <option value="Artículo falso o falsificado">Artículo falso o falsificado</option>
                <option value="Ya se vendió">Ya se vendió</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Comentarios adicionales</label>
              <textarea value={reportForm.comments} onChange={e => setReportForm({...reportForm, comments: e.target.value})} placeholder="Proporciona más detalles..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ЖАЛОБЫ НА ПОЛЬЗОВАТЕЛЯ ---
  const renderUserReportModal = () => {
    if (!showUserReportModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUserReportModal(false)}>
        <div className="bg-white rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 w-full max-w-md" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowUserReportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Reportar Vendedor</h2>
          <p className="text-[13px] text-slate-500 mb-6">Ayúdanos a mantener una comunidad segura.</p>
          <form onSubmit={handleUserReportSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Motivo</label>
              <select required value={userReportForm.reason} onChange={e => setUserReportForm({...userReportForm, reason: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white">
                <option value="">Selecciona un motivo...</option>
                <option value="Comportamiento abusivo">Comportamiento abusivo o insultos</option>
                <option value="Sospecha de fraude">Sospecha de fraude</option>
                <option value="Vende productos ilegales">Vende productos prohibidos</option>
                <option value="Suplantación de identidad">Suplantación de identidad</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Detalles adicionales</label>
              <textarea value={userReportForm.comments} onChange={e => setUserReportForm({...userReportForm, comments: e.target.value})} placeholder="Explica la situación..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] min-h-[80px] bg-white"></textarea>
            </div>
            <button type="submit" className="btn-md w-full bg-[#0F172A] text-white hover:bg-black mt-2 shadow-sm">Enviar Reporte</button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ЦЕНОВОЙ МОДЕЛИ ---
  const renderPricingModal = () => {
    if (!showPricingModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-sm">
        <div className="bg-slate-50 w-full max-w-5xl md:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0">
          <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="p-5 flex justify-between items-center">
              <h3 className="font-bold text-[22px] text-slate-900 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500"/> {t.pricing_title}</h3>
              <button onClick={() => setShowPricingModal(false)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors"><XCircle size={26}/></button>
            </div>
            <div className="flex px-5 gap-6 border-t border-slate-100">
              <button onClick={() => setPriceTab('particular')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'particular' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_individuals}</button>
              <button onClick={() => setPriceTab('pro')} className={`py-4 font-semibold text-[14px] border-b-2 transition-colors ${priceTab === 'pro' ? 'border-[#84CC16] text-[#65A30D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.tab_businesses}</button>
            </div>
          </div>
          <div className="p-4 md:p-6 overflow-y-auto">
            {priceTab === 'particular' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col shadow-sm">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_free}</h4>
                  <p className="text-4xl font-black text-slate-900 mb-4">$0</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 3 {t.free_ad} / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Contacto por QR</li>
                  </ul>
                  <button className="btn-lg w-full border border-slate-300 text-slate-700 hover:bg-slate-50">{t.current_plan}</button>
                </div>
                <div className="bg-[#84CC16] rounded-3xl p-6 md:p-8 border border-[#84CC16] flex flex-col shadow-lg">
                  <h4 className="font-bold text-lime-100 uppercase tracking-wider text-[12px] mb-2">{t.plan_plus}</h4>
                  <p className="text-4xl font-black text-white mb-4">$99 <span className="text-[14px] font-medium text-lime-100">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 10 anuncios / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> 2 Subidas a TOP gratis</li>
                    <li className="flex items-center gap-2 text-[14px] text-white"><CheckCircle className="w-4 h-4 text-white"/> Más visibilidad</li>
                  </ul>
                  <button onClick={() => handleClipPayment(99, 'Suscripción Paquete Plus')} className="btn-lg w-full bg-white text-[#65A30D] hover:bg-slate-50 shadow-sm">{t.buy_plan}</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#84CC16]/50 flex flex-col relative shadow-sm">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_basic}</h4>
                  <p className="text-4xl font-black text-slate-900 mb-4">$500 <span className="text-[14px] font-medium text-slate-500">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 50 anuncios / mes</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Insignia "PRO"</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Página de Empresa</li>
                    <li className="flex items-center gap-2 text-[14px] text-slate-700"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Estadísticas avanzadas</li>
                  </ul>
                  <button onClick={() => handleClipPayment(500, 'Suscripción PRO Estándar')} className="btn-lg w-full border-2 border-[#84CC16] text-[#65A30D] hover:bg-[#84CC16]/5">{t.buy_plan}</button>
                </div>
                <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 flex flex-col relative shadow-xl transform md:-translate-y-2 ring-2 ring-[#84CC16]">
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#84CC16] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">POPULAR</div>
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[12px] mb-2">{t.plan_pro_max}</h4>
                  <p className="text-4xl font-black text-white mb-4">$1,500 <span className="text-[14px] font-medium text-slate-400">/mes</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Anuncios Ilimitados</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Subida masiva (XML/CSV)</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> 10 Destacados incluidos</li>
                    <li className="flex items-center gap-2 text-[14px] text-white/90"><CheckCircle className="w-4 h-4 text-[#84CC16]"/> Soporte dedicado</li>
                  </ul>
                  <button onClick={() => handleClipPayment(1500, 'Suscripción PRO Ilimitado')} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] shadow-md">{t.buy_plan}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ДАШБОРДА ПОЛЬЗОВАТЕЛЯ ---
  const renderUserDashboard = () => {
    const activeAds = userAds.filter(ad => ad.status === 'active' || ad.status === 'pending');
    const inactiveAds = userAds.filter(ad => ad.status === 'inactive' || ad.status === 'rejected');
    const displayedAds = dashboardTab === 'my_ads' ? (adStatusFilter === 'active' ? activeAds : inactiveAds) : favoriteAds;
    const totalContactClicks = userAds.reduce((sum, ad) => sum + (ad.whatsapp_clicks || 0), 0);
    const totalViews = userAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const conversionRate = (() => {
      if (totalViews === 0) return "0.0";
      return ((totalContactClicks / totalViews) * 100).toFixed(1);
    })();
    
    const categoryStats = (() => {
      const stats = {};
      userAds.forEach(ad => {
        const cat = ad.category || 'general';
        stats[cat] = (stats[cat] || 0) + 1;
      });
      return Object.entries(stats).map(([slug, count]) => {
        const catObj = categoriesData.find(c => c.slug === slug);
        const name = catObj ? (catObj.name?.[lang] || catObj.name?.['es'] || catObj.name) : slug;
        return { name, value: count };
      }).sort((a, b) => b.value - a.value);
    })();
    
    const itemsPerPage = 5;
    const totalPages = Math.ceil(displayedAds.length / itemsPerPage);
    const safeDashboardPage = Math.min(dashboardPage, Math.max(1, totalPages));
    const paginatedAds = displayedAds.slice((safeDashboardPage - 1) * itemsPerPage, safeDashboardPage * itemsPerPage);

    return (
      <div className="bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">
        <div className="p-4 md:p-8 w-full max-w-[1200px] mx-auto">
          <div className="flex justify-end mb-4">
             <div className="bg-slate-200 p-1 rounded-xl flex items-center w-fit">
                <button onClick={() => setAccountType('particular')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${accountType === 'particular' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.particular}</button>
                <button onClick={() => setAccountType('pro')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${accountType === 'pro' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>PRO</button>
             </div>
          </div>

          <h1 className="hidden md:block text-[24px] font-bold text-slate-900 mb-6">{t.dashboard}</h1>
          
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-6 shadow-sm">
            <div onClick={openProfileModal} className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-white ${accountType === 'pro' ? 'bg-slate-900' : 'bg-slate-100'} overflow-hidden relative group cursor-pointer shadow-inner`}>
              {user?.avatar_url ? (
                <img src={getImageUrl(user.avatar_url)} className="w-full h-full object-cover" alt="User Avatar" />
              ) : (accountType === 'pro' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8 text-slate-400" />)}
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                 <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                {accountType === 'pro' ? 'AutoMotors México S.A.' : (user?.name || 'Invitado')}
                {accountType === 'pro' && <span className="badge bg-slate-900 text-white">PRO</span>}
                {userRole === 'admin' && <span className="badge bg-red-500 text-white">ADMIN</span>}
              </h2>
              <p className="text-[14px] text-slate-500 mt-1">{accountType === 'pro' ? 'contacto@automotors.mx' : (user?.email || 'N/A')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 md:ml-auto items-center">
              <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-[14px] shadow-sm relative group">
                  <Zap size={18} className="text-amber-500 fill-amber-500"/>
                  {parseFloat(user?.balance || 0).toFixed(0)} Créditos
                  <button onClick={() => handleClipPayment(100, '100 Créditos Mercasto')} className="ml-1 bg-amber-500 text-white w-6 h-6 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm" title="Comprar créditos">+</button>
                  <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                    <button onClick={handleRedeemCoupon} className="bg-white border border-slate-200 text-slate-700 text-[12px] px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap hover:bg-slate-50 flex items-center gap-1.5"><Ticket size={14}/> Canjear cupón</button>
                  </div>
              </div>
              {userRole === 'admin' && (
                <button onClick={() => setCurrentTab('admin')} className="btn-md bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 shadow-sm">
                   <Shield className="w-4 h-4"/> {t.admin_panel}
                </button>
              )}
              {accountType === 'particular' && (
                <button onClick={() => setShowPricingModal(true)} className="btn-md bg-amber-400 hover:bg-amber-500 text-amber-900 flex items-center justify-center gap-2 shadow-sm">
                   <Crown className="w-4 h-4"/> {t.upgrade_pro}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full">
            <div className="md:w-1/3 lg:w-1/4 flex flex-col gap-4">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div onClick={() => setDashboardTab('my_ads')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'my_ads' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <CheckCircle className={`w-5 h-5 ${dashboardTab === 'my_ads' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.my_ads}
                </div>
                {accountType === 'particular' && (
                  <div onClick={() => setDashboardTab('favorites')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'favorites' ? 'text-red-600 bg-red-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <Heart className={`w-5 h-5 ${dashboardTab === 'favorites' ? 'text-red-500 fill-red-500' : 'text-slate-400'}`}/> {t.favorites}
                  </div>
                )}
                {accountType === 'pro' && (
                  <>
                    <div onClick={() => setDashboardTab('company')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'company' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <Store className={`w-5 h-5 ${dashboardTab === 'company' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.company_profile}
                    </div>
                    <div onClick={() => fileInputRef.current?.click()} className="p-4 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors text-slate-700 text-[14px] font-medium relative">
                      {isUploadingBulk ? <Loader2 className="w-5 h-5 text-purple-500 animate-spin"/> : <UploadCloud className="w-5 h-5 text-purple-500"/>} 
                      {isUploadingBulk ? 'Subiendo...' : t.mass_upload}
                      <input type="file" accept=".csv,.xml" className="hidden" ref={fileInputRef} onChange={handleBulkUpload} />
                    </div>
                  </>
                )}
                <div onClick={() => setDashboardTab('settings')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'settings' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Settings className={`w-5 h-5 ${dashboardTab === 'settings' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.settings}
                </div>
                {userRole === 'admin' && (
                  <div onClick={() => setCurrentTab('admin')} className="p-4 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-red-600 text-[14px] font-semibold border-t border-slate-100">
                    <Shield className="w-5 h-5 text-red-500"/> {t.admin_panel}
                  </div>
                )}
              </div>
              
              <button onClick={handleLogout} className="w-full bg-white border border-slate-200 text-red-600 font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                <LogOut className="w-5 h-5" /> {t.logout}
              </button>
            </div>

            <div className="md:w-2/3 lg:w-3/4 flex flex-col gap-6">
              {accountType === 'pro' && dashboardTab !== 'company' && dashboardTab !== 'settings' && (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.active_ads}</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900">{activeAds.length}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.total_views}</p>
                    <p className="text-2xl md:text-3xl font-black text-[#84CC16]">{totalViews}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.contacts_qr}</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900">{totalContactClicks}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.conversion}</p>
                    <p className="text-2xl md:text-3xl font-black text-blue-500">{conversionRate}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-[18px] font-bold text-slate-900">Rendimiento</h3>
                    <select 
                      value={analyticsDays} 
                      onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#84CC16]/30 cursor-pointer w-full sm:w-auto"
                    >
                      <option value={7}>Últimos 7 días</option>
                      <option value={14}>Últimos 14 días</option>
                      <option value={30}>Últimos 30 días</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 mt-4">
                    {/* Vistas Chart */}
                    <div className="w-full">
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Vistas</h4>
                      <div className="h-56 w-full">
                        {analyticsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />
                              <Tooltip content={<ChartTooltip unit="vistas" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                              <Area type="monotone" dataKey="views" stroke={isDarkMode ? "#F8FAFC" : "#0F172A"} strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" activeDot={{ r: 6, fill: isDarkMode ? "#F8FAFC" : "#0F172A", stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
                        )}
                      </div>
                    </div>

                    {/* Contact Clicks Chart */}
                    <div className="w-full">
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><QrCode className="w-4 h-4"/> Contactos (QR)</h4>
                      <div className="h-56 w-full">
                        {analyticsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#84CC16" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#84CC16" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />
                              <Tooltip content={<ChartTooltip unit="clicks" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                              <Area type="monotone" dataKey="clicks" stroke="#84CC16" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" activeDot={{ r: 6, fill: '#84CC16', stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
                        )}
                      </div>
                    </div>

                    {/* Categories Pie Chart */}
                    <div className="w-full">
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><PieChartIcon className="w-4 h-4"/> Categorías</h4>
                      <div className="h-56 w-full">
                        {categoryStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                              >
                                {categoryStats.map((entry, index) => {
                                  const COLORS = ['#84CC16', isDarkMode ? '#F8FAFC' : '#0F172A', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'];
                                  return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                })}
                              </Pie>
                              <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`text-center px-3 py-2 rounded-xl shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-900 border-slate-700 text-white'}`}>
                                      <div className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-300'}`}>{payload[0].name}</div>
                                      <div className="text-[12px] font-bold">{payload[0].value} {payload[0].value === 1 ? 'anuncio' : 'anuncios'}</div>
                                    </div>
                                  );
                                }
                                return null;
                              }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}

              {dashboardTab === 'settings' ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 p-6 md:p-8">
                  <h2 className="text-[18px] font-bold text-slate-900 mb-6">{t.settings}</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.personal_info}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.update_photo}</p>
                      <button onClick={openProfileModal} className="btn-md border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"><User className="w-4 h-4" /> {t.edit_profile}</button>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.security}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.update_password}</p>
                      <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
                         <input type="password" placeholder={t.curr_password} value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                         <input type="password" required placeholder={t.new_password} minLength={8} value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                         <input type="password" required placeholder={t.conf_password} minLength={8} value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                         <button type="submit" disabled={passwordLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                           {passwordLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.update_pass_btn}
                         </button>
                      </form>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.email_settings}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.update_email}</p>
                      <form onSubmit={handleEmailSubmit} className="space-y-3 max-w-sm">
                        <input type="email" required placeholder={t.new_email} value={emailForm.new_email} onChange={e => setEmailForm({...emailForm, new_email: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                        <input type="password" required placeholder={t.curr_password} value={emailForm.password} onChange={e => setEmailForm({...emailForm, password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                        <button type="submit" disabled={emailLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                          {emailLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.req_change}
                        </button>
                      </form>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.notifications}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.choose_alerts}</p>
                      <form onSubmit={handleNotificationsSubmit} className="space-y-4 max-w-sm">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={notificationsForm.email_alerts} onChange={e => setNotificationsForm({...notificationsForm, email_alerts: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />
                          <span className="text-[14px] text-slate-700">{t.email_alerts}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={notificationsForm.push_notifications} onChange={e => setNotificationsForm({...notificationsForm, push_notifications: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />
                          <span className="text-[14px] text-slate-700">{t.push_alerts}</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={notificationsForm.marketing} onChange={e => setNotificationsForm({...notificationsForm, marketing: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />
                          <span className="text-[14px] text-slate-700">{t.marketing_alerts}</span>
                        </label>
                        <button type="submit" disabled={notificationsLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2 mt-2">
                          {notificationsLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.save_prefs}
                        </button>
                      </form>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.interface}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.customize_app}</p>
                      <div className="space-y-4 max-w-sm">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={sliderAutoplay} onChange={e => setSliderAutoplay(e.target.checked)} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />
                          <span className="text-[14px] text-slate-700">{t.autoplay}</span>
                        </label>
                      </div>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-red-600 mb-2">{t.danger_zone}</h3>
                      <p className="text-[13px] text-slate-600 mb-4">{t.del_warning}</p>
                      <button onClick={handleDeleteAccount} className="btn-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center gap-2"><Trash2 className="w-4 h-4" /> {t.del_account}</button>
                    </div>
                  </div>
                </div>
              ) : dashboardTab === 'company' ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[18px] font-bold text-slate-900">{t.company_profile}</h2>
                    <button onClick={handleExportCompanyData} type="button" className="btn-sm border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                      <Download className="w-4 h-4" /> {t.export_json}
                    </button>
                  </div>
                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Perfil de empresa actualizado exitosamente.'); }}>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.cover_photo}</label>
                      <label className="w-full h-32 md:h-48 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group relative overflow-hidden">
                        {companyForm.coverPreview && <img src={companyForm.coverPreview} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" alt="Cover" />}
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform mb-2 relative z-10">
                          <Camera className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-600 relative z-10">{t.upload_cover}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setCompanyForm({...companyForm, coverPreview: URL.createObjectURL(e.target.files[0])});
                          }
                        }} />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.comp_name}</label>
                        <input type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.comp_desc}</label>
                        <textarea rows="4" value={companyForm.description} onChange={e => setCompanyForm({...companyForm, description: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"></textarea>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.website}</label>
                        <input type="url" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.phone}</label>
                        <input type="tel" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.address}</label>
                        <input type="text" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button type="submit" className="btn-md bg-[#0F172A] text-white hover:bg-black shadow-sm">
                        {t.save_changes}
                      </button>
                    </div>
                  </form>
                </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-[18px] font-bold text-slate-900">
                    {dashboardTab === 'my_ads' ? t.my_ads : t.favorites} 
                    <span className="text-slate-500 font-medium ml-2 text-[15px]">
                      ({dashboardTab === 'my_ads' ? (adStatusFilter === 'active' ? activeAds.length : inactiveAds.length) : favoriteAds.length})
                    </span>
                  </h2>
                  <button onClick={() => setCurrentTab('post')} className="text-[13px] font-semibold text-[#65A30D] hover:text-[#84CC16] flex items-center gap-1"><PlusCircle className="w-4 h-4"/> {t.post}</button>
                </div>
                
                {dashboardTab === 'my_ads' && (
                  <div className="flex gap-6 px-5 pt-4 border-b border-slate-100 bg-white">
                    <button onClick={() => setAdStatusFilter('active')} className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${adStatusFilter === 'active' ? 'border-[#84CC16] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Activos ({activeAds.length})</button>
                    <button onClick={() => setAdStatusFilter('inactive')} className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${adStatusFilter === 'inactive' ? 'border-[#84CC16] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Inactivos ({inactiveAds.length})</button>
                  </div>
                )}

                {displayedAds.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">
                    {t.noAds}
                  </div>
                ) : (
                  <>
                    {paginatedAds.map((ad) => (
                      <div key={ad.id} className={`p-5 border-b border-slate-100 last:border-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-slate-50 transition-colors ${ad.status === 'inactive' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                      <div className="flex gap-4 flex-1 w-full">
                        <img src={getImageUrl(ad.image_url, ad.image)} loading="lazy" className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200" alt="" />
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{ad.title}</h4>
                            {ad.status === 'inactive' && <span className="badge bg-slate-200 text-slate-600">Inactivo</span>}
                            {ad.status === 'pending' && <span className="badge bg-amber-100 text-amber-700">En revisión</span>}
                            {ad.status === 'rejected' && <span className="badge bg-red-100 text-red-700">Rechazado</span>}
                          </div>
                          <p className="text-[#65A30D] text-[16px] font-bold mt-1">${Number(ad.price).toLocaleString()}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-[12px] text-slate-500 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5"/> {ad.views || 0} {t.views}</p>
                            {accountType === 'pro' && <p className="text-[12px] text-slate-500 flex items-center gap-1"><QrCode className="w-3.5 h-3.5"/> {ad.whatsapp_clicks || 0} {t.leads}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
                        {ad.user_id === user?.id ? (
                          <>
                          <button onClick={() => handleEditAd(ad)} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                          <button onClick={() => handleToggleAdStatus(ad)} disabled={ad.status === 'pending' || ad.status === 'rejected'} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-2 disabled:opacity-50" title={ad.status === 'inactive' ? 'Activar' : 'Pausar'}>
                          <Zap className="w-4 h-4" />
                        </button>
                          <button onClick={() => handlePromoteAd(ad)} className="btn-sm flex-1 sm:flex-none bg-[#0F172A] hover:bg-black text-white flex items-center justify-center gap-2 shadow-sm">
                          <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">{t.promote}</span>
                        </button>
                          <button onClick={() => handleDeleteAd(ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-2" title={t.delete_ad}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                          </>
                        ) : (
                            <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-2">
                             <Heart className="w-4 h-4 fill-red-500" /> Quitar
                          </button>
                        )}
                      </div>
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                        <span className="text-[13px] text-slate-500 font-medium">
                          Mostrando {(safeDashboardPage - 1) * itemsPerPage + 1} a {Math.min(safeDashboardPage * itemsPerPage, displayedAds.length)} de {displayedAds.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setDashboardPage(Math.max(1, safeDashboardPage - 1))}
                            disabled={safeDashboardPage === 1}
                            className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all"
                          >
                            Anterior
                          </button>
                          <button 
                            onClick={() => setDashboardPage(Math.min(totalPages, safeDashboardPage + 1))}
                            disabled={safeDashboardPage === totalPages}
                            className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {accountType === 'particular' && (
                <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg ring-1 ring-[#0F172A]">
                  <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left">
                    <h3 className="text-[20px] md:text-[22px] font-bold mb-2 text-white">{t.upgrade_pro}</h3>
                    <p className="text-[14px] text-white/80">{t.upgrade_pro_desc}</p>
                  </div>
                  <button onClick={() => setShowPricingModal(true)} className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white whitespace-nowrap w-full md:w-auto text-center shadow-md">
                    {t.tariffs}
                  </button>
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ---
  const renderHomeScreen = () => {
    if (activeCat || searchQuery || selectedState) {
      return (
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 min-h-screen">
          <h2 className="text-[22px] font-bold tracking-tight mb-6">{t.search_results}</h2>
          {loadingAds ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#84CC16]" size={40}/></div>
          ) : serverAds.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <Search size={48} className="text-slate-300 mb-4" />
              <span className="text-slate-400 font-bold uppercase tracking-widest">{t.noAds}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {serverAds.map((ad, index) => (
                  <React.Fragment key={ad.id}>
                    {renderAdCard(ad)}
                    {/* Показываем рекламный баннер после каждого 7-го объявления */}
                    {(index + 1) % 7 === 0 && <AdSenseBanner key={`ad-banner-${ad.id}`} />}
                  </React.Fragment>
                ))}
              </div>
              <div ref={lastAdElementRef} />
              {loadingMore && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>}
              {!loadingMore && !hasMore && serverAds.length > 0 && <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs py-10 mt-6">Has llegado al final</div>}
            </>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* 1. HERO STATS */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate-700">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span><strong className="text-[#0F172A] font-semibold">1,847,392</strong> active listings</span>
              <span className="text-slate-300 hidden sm:block">•</span>
              <span><strong className="text-[#0F172A] font-semibold">247,103</strong> users online</span>
              <span className="text-slate-300 hidden sm:block">•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" />Puerto Vallarta</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentTab('post')} className="btn-sm bg-slate-900 text-white hover:bg-black">Sell fast</button>
              <button onClick={() => setActiveCat('empleo')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50">Find a job</button>
              <button onClick={() => setActiveCat('inmobiliaria')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">Rent apartment</button>
              <button onClick={() => setActiveCat('servicios')} className="btn-sm bg-white border border-slate-300 hover:bg-slate-50 hidden sm:inline-flex">Hire service</button>
            </div>
          </div>
        </div>

        <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
          <div className="grid grid-cols-12 gap-6">
            
            {/* 2. FEATURED CATEGORIES */}
            <section className="col-span-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22px] font-bold tracking-tight">Browse by category</h2>
                <div className="flex items-center gap-3">
                  <button className="text-[13px] font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Sort by: Popular</button>
                  <a className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer" onClick={() => setActiveCat('')}>View all categories →</a>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {categoriesData.slice(0, 16).map(cat => {
                  const Icon = IconMap[cat.icon] || Star;
                  return (
                    <div key={cat.slug} onClick={() => setActiveCat(cat.slug)} className="card bg-white border border-slate-200 rounded-2xl p-4 group cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#84CC16]/10 flex items-center justify-center text-[#65A30D]">
                          <Icon size={20} />
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">{Math.floor(Math.random() * 100) + 10}k</span>
                      </div>
              <h3 className="font-semibold mt-3 text-[14px] line-clamp-1">{cat.name?.[lang] || cat.name?.['es'] || cat.name}</h3>
                      <span className="text-[12px] text-[#65A30D] font-medium group-hover:underline">View all →</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. TRENDING NOW */}
            <section className="col-span-12 mt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[22px] font-bold tracking-tight">Trending now</h2>
                  <span className="badge bg-red-500 text-white hidden sm:block">LIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:block">Save search</button>
                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Filter</button>
                  <a className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1">See all 1.8M →</a>
                </div>
              </div>
              <div className="relative -mx-4 lg:mx-0 px-4 lg:px-0">
                <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
                  {(serverAds.length > 0 ? serverAds : mockAds).slice(0, 12).map(ad => (
                    <div key={ad.id} className="snap-start shrink-0 w-[260px]">
                      {renderAdCard(ad)}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. DEALS OF THE DAY */}
            <section className="col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-3xl p-[1px] group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#84CC16] to-[#65A30D] opacity-90 group-hover:opacity-100 transition"></div>
                  <div className="relative bg-gradient-to-br from-[#84CC16] to-[#65A30D] rounded-[23px] p-6 text-white h-[190px] flex flex-col">
                    <span className="text-[11px] uppercase tracking-wider bg-white/20 w-fit px-2.5 py-1 rounded-full font-semibold">Deal of the day</span>
                    <h3 className="text-[26px] font-bold mt-3 leading-tight">Up to 40% OFF</h3>
                    <p className="text-white/90 text-[14px]">Electronics & Phones</p>
                    <div className="mt-auto flex items-center justify-between">
                      <button className="btn-md bg-white text-[#0F172A] hover:bg-slate-100">Shop now →</button>
                      <span className="text-[12px] font-medium bg-black/20 px-2 py-1 rounded-lg">Ends in 8h</span>
                    </div>
                  </div>
                </div>
                <div className="card bg-white border border-slate-200 rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#84CC16]/10 rounded-full blur-2xl"></div>
                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">Furniture</span>
                  <h3 className="text-[22px] font-bold mt-2">Living Room Sets</h3>
                  <p className="text-slate-600 text-[14px]">From $4,999 MXN</p>
                  <button className="btn-md border border-slate-300 mt-auto w-fit hover:bg-slate-50" onClick={() => setActiveCat('hogar')}>See deals →</button>
                </div>
                <div className="card bg-slate-900 text-white rounded-3xl p-6 h-[190px] flex flex-col relative overflow-hidden">
                  <span className="text-[11px] uppercase tracking-wider text-[#84CC16] font-semibold">Automotive</span>
                  <h3 className="text-[22px] font-bold mt-2">Certified Cars</h3>
                  <p className="text-white/70 text-[14px]">0% commission this week</p>
                  <button className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white mt-auto w-fit" onClick={() => setActiveCat('motor')}>Browse 124k →</button>
                </div>
                <div className="card bg-white border-2 border-[#84CC16]/30 rounded-3xl p-6 h-[190px] flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-[#65A30D] font-semibold">For sellers</span>
                  <h3 className="text-[22px] font-bold mt-2">Boost your ad</h3>
                  <p className="text-slate-600 text-[14px]">3x more views, top placement</p>
                  <button className="btn-md bg-[#0F172A] text-white hover:bg-black mt-auto w-fit" onClick={() => setCurrentTab('post')}>Promote now →</button>
                </div>
              </div>
            </section>

            {/* 5. REAL ESTATE SPOTLIGHT */}
            <section className="col-span-12 mt-2">
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-[22px] font-bold tracking-tight">Real Estate spotlight</h2>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2">
                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('renta'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Rent</button>
                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('venta'); }} className="btn-sm bg-slate-900 text-white">Buy</button>
                    <button onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('comercial'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Commercial</button>
                  </div>
                  <a onClick={() => setActiveCat('inmobiliaria')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">View 89,445 properties →</a>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 xl:col-span-8">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spotlightRealEstate.map((item, idx) => (
                      <article key={idx} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery(item.specs); }}>
                        <div className="relative">
                          <img src={item.img} loading="lazy" className="w-full h-[160px] object-cover" alt=""/>
                          <span className={`badge absolute left-2 top-2 ${item.color} text-white`}>{item.type}</span>
                        </div>
                        <div className="p-3.5">
                          <div className="font-bold text-[18px]">{item.price}</div>
                          <div className="text-[13px] text-slate-600 line-clamp-1">{item.specs}</div>
                          <div className="flex items-center gap-2 mt-2 text-[11px]">
                            {item.badge && <span className={`badge ${item.badge.color}`}>{item.badge.label}</span>}
                            <span className="text-slate-500">{item.location}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="col-span-12 xl:col-span-4">
                  <div className="bg-white border border-slate-200 rounded-2xl h-full min-h-[360px] overflow-hidden relative">
                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedState || 'Puerto Vallarta')}&t=&z=13&ie=UTF8&iwloc=&output=embed`} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)', position: 'absolute', top: 0, left: 0 }} className="opacity-40 pointer-events-none"></iframe>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-0 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Map preview</h3>
                        <button onClick={() => setActiveCat('inmobiliaria')} className="btn-sm bg-white border border-slate-300 shadow-sm hover:bg-slate-50">Open map</button>
                      </div>
                      <div className="relative mt-6">
                        <div className="absolute left-[20%] top-[40%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 animate-pulse cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('3.2M'); }}>$3.2M</div></div>
                        <div className="absolute left-[55%] top-[25%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('1.8M'); }}>$1.8M</div></div>
                        <div className="absolute left-[70%] top-[60%]"><div className="w-8 h-8 rounded-full bg-[#84CC16] text-white flex items-center justify-center text-[11px] font-bold shadow-lg ring-4 ring-[#84CC16]/30 cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('4.9M'); }}>$4.9M</div></div>
                        <div className="absolute left-[35%] top-[70%]"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shadow-lg cursor-pointer" onClick={() => { setActiveCat('inmobiliaria'); setSearchQuery('28k'); }}>$28k</div></div>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center justify-between text-[12px]"><span className="font-medium">247 properties in Puerto Vallarta</span><span onClick={() => setSelectedState('Puerto Vallarta')} className="text-[#65A30D] font-semibold cursor-pointer hover:underline">Filter →</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. JOBS BOARD */}
            <section className="col-span-12">
              <div className="flex items-end justify-between mb-4 mt-2">
                <h2 className="text-[22px] font-bold tracking-tight">Jobs board</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setActiveCat('empleo'); setSearchQuery('Remote'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Remote only</button>
                  <button onClick={() => { setActiveCat('empleo'); setSearchQuery('Full Time'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Full-time</button>
                  <a onClick={() => setActiveCat('empleo')} className="text-[13px] font-semibold text-[#65A30D] hover:underline ml-1 cursor-pointer">View all 42,118 →</a>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                      <tr><th className="text-left font-semibold px-4 py-3">Role</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Company</th><th className="text-left font-semibold px-4 py-3">Salary MXN</th><th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Location</th><th className="text-right font-semibold px-4 py-3">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobsBoard.map((job, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setActiveCat('empleo'); setSearchQuery(job.role); }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${job.logo}`}>
                                {job.initial === 'MD' ? <div className="p-1"><MercastoLogo className="w-full h-full" /></div> : job.initial}
                              </div>
                              <div>
                                <div className="font-medium">{job.role}</div>
                                <div className="text-[12px] text-slate-500 md:hidden">{job.company} • {job.loc}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">{job.company}</td>
                          <td className="px-4 py-3 font-medium">{job.salary}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {job.loc === 'Remote' ? <span className="badge bg-slate-900 text-white">Remote</span> : job.loc}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className={`btn-sm text-white ${idx === 0 ? 'bg-[#84CC16] hover:bg-[#65A30D]' : 'bg-slate-900 hover:bg-black'}`}>Apply</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 border-t border-slate-200 text-[13px]">
                  <span className="text-slate-600">Showing 8 of 1,243 new jobs today</span>
                  <div className="flex items-center gap-2">
                    <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-100">Upload CV</button>
                    <button className="btn-sm bg-[#0F172A] text-white hover:bg-black">Create job alert</button>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. SERVICES MARKETPLACE */}
            <section className="col-span-12">
              <div className="flex items-end justify-between mb-4 mt-2">
                <h2 className="text-[22px] font-bold tracking-tight">Services marketplace</h2>
                <a onClick={() => setActiveCat('servicios')} className="text-[13px] font-semibold text-[#65A30D] hover:underline cursor-pointer">Browse all services →</a>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {servicesMarketplace.map((srv, idx) => (
                  <div key={idx} className="card bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer" onClick={() => { setActiveCat('servicios'); setSearchQuery(srv.title); }}>
                    <div className="flex items-start gap-3">
                      <img src={srv.img} loading="lazy" className="w-12 h-12 rounded-xl object-cover" alt=""/>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[15px] leading-tight">{srv.title}</h3>
                        <div className="flex items-center gap-1 mt-1"><div className="flex text-amber-400 text-[13px]">★★★★★</div><span className="text-[12px] text-slate-600">{srv.stars}</span></div>
                      </div>
                      {srv.badge && <span className={`badge ${srv.badge.color}`}>{srv.badge.label}</span>}
                    </div>
                    <p className="text-[13px] text-slate-600 mt-3 line-clamp-2">{srv.desc}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[13px]"><span className="text-slate-500">From</span> <strong>{srv.price}</strong></span>
                      <button className="btn-sm bg-[#84CC16] text-white hover:bg-[#65A30D]">Book now</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 8. AUTOMOTIVE */}
            <section className="col-span-12">
              <div className="flex items-end justify-between mb-4 mt-2">
                <h2 className="text-[22px] font-bold tracking-tight">Automotive</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setActiveCat('motor'); setSearchQuery(''); }} className="btn-sm bg-slate-900 text-white">All</button>
                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Nissan'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Nissan</button>
                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('VW'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">VW</button>
                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Toyota'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Toyota</button>
                  <button onClick={() => { setActiveCat('motor'); setSearchQuery('Honda'); }} className="btn-sm border border-slate-300 bg-white hover:bg-slate-50 hidden sm:inline-flex">Honda</button>
                  <span className="w-px h-5 bg-slate-300 mx-1 hidden sm:block"></span>
                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Year</button>
                  <button className="btn-sm border border-slate-300 bg-white hover:bg-slate-50">Price</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {automotiveDeals.map((car, idx) => (
                  <article key={idx} className="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setActiveCat('motor'); setSearchQuery(car.title); }}>
                    <img src={car.img} loading="lazy" className="w-full h-140px] object-cover" alt=""/>
                    <div className="p-3">
                      <div className="font-bold">{car.price}</div>
                      <div className="text-[13px] font-medium line-clamp-1">{car.title}</div>
                      <div className="text-[12px] text-slate-500 mt-1">{car.specs}</div>
                      <div className="mt-2 flex gap-1 min-h-[20px]">
                        {car.badge && <span className={`badge ${car.badge.color}`}>{car.badge.label}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 9. RECENTLY VIEWED */}
            <section className="col-span-12">
              <div className="flex items-center justify-between mb-3 mt-2">
                <h2 className="text-[18px] font-bold">Recently viewed</h2>
                <button className="text-[12px] text-slate-500 hover:text-slate-700">Clear history</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {recentlyViewed.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 flex gap-2.5 items-center hover:shadow-sm cursor-pointer" onClick={() => setSearchQuery(item.name)}>
                    <img src={item.img} loading="lazy" className="w-14 h-14 rounded-lg object-cover" alt=""/>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium line-clamp-1">{item.name}</div>
                      <div className="text-[13px] font-bold">{item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 10. FOR BUSINESS */}
            <section className="col-span-12 mt-4">
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 card">
                  <div className="w-10 h-10 rounded-xl bg-[#84CC16]/15 flex items-center justify-center mb-3"><Zap className="w-5 h-5 text-[#65A30D]" /></div>
                  <h3 className="text-[18px] font-bold">Mercasto Starter</h3>
                  <p className="text-[14px] text-slate-600 mt-1">Perfect for individuals selling occasionally</p>
                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700">
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Up to 5 active listings</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Basic stats</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Contacto vía QR</li>
                  </ul>
                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#0F172A] text-white hover:bg-black">Elegir plan</button>
                </div>
                <div className="bg-slate-900 text-white rounded-3xl p-6 card relative overflow-hidden ring-2 ring-[#84CC16]">
                  <span className="absolute top-4 right-4 badge bg-[#84CC16] text-white">POPULAR</span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3"><ShieldCheck className="w-5 h-5 text-white" /></div>
                  <h3 className="text-[18px] font-bold">Mercasto Pro</h3>
                  <p className="text-[14px] text-white/70 mt-1">For power sellers and small businesses</p>
                  <ul className="mt-4 space-y-2 text-[13px] text-white/90">
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Unlimited listings</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Boost credits monthly</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Advanced analytics & API</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Verified badge</li>
                  </ul>
                  <button onClick={() => setShowPricingModal(true)} className="btn-md w-full mt-5 bg-[#84CC16] text-white hover:bg-[#65A30D]">See pricing</button>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 card">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><Building2 className="w-5 h-5 text-slate-700" /></div>
                  <h3 className="text-[18px] font-bold">Enterprise</h3>
                  <p className="text-[14px] text-slate-600 mt-1">Dealerships, real estate, recruitment</p>
                  <ul className="mt-4 space-y-2 text-[13px] text-slate-700">
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Bulk import & CRM sync</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> Dedicated account manager</li>
                    <li className="flex gap-2"><span className="text-[#84CC16]">✓</span> White-label storefront</li>
                  </ul>
                  <button className="btn-md w-full mt-5 border border-slate-300 hover:bg-slate-50">Contact sales</button>
                </div>
              </div>
            </section>

            {/* 11. HOW IT WORKS */}
            <section className="col-span-12 mt-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8">
                <h2 className="text-[22px] font-bold tracking-tight text-center">How Mercasto works</h2>
                <div className="grid md:grid-cols-4 gap-6 mt-8 relative">
                  <div className="absolute top-[22px] left-[12%] right-[12%] h-px bg-slate-200 hidden md:block"></div>
                  <div className="text-center relative">
                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">01</div>
                    <h4 className="font-semibold mt-3">Post in 60 seconds</h4>
                    <p className="text-[13px] text-slate-600 mt-1">Photos, price, location. AI helps write title.</p>
                  </div>
                  <div className="text-center relative">
                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">02</div>
                    <h4 className="font-semibold mt-3">Get qualified leads</h4>
            <p className="text-[13px] text-slate-600 mt-1">Recibe contactos directos por teléfono o QR.</p>
                  </div>
                  <div className="text-center relative">
                    <div className="w-11 h-11 mx-auto rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold shadow-lg">03</div>
                    <h4 className="font-semibold mt-3">Meet safely</h4>
                    <p className="text-[13px] text-slate-600 mt-1">Verified profiles & safe meetup spots.</p>
                  </div>
                  <div className="text-center relative">
                    <div className="w-11 h-11 mx-auto rounded-full bg-[#84CC16] text-white flex items-center justify-center font-bold shadow-lg">04</div>
                    <h4 className="font-semibold mt-3">Sell faster</h4>
                    <p className="text-[13px] text-slate-600 mt-1">Boost, promote, and close deals.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 12. SAFETY CENTER */}
            <section className="col-span-12 mt-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><Shield className="w-5 h-5 text-red-600" /></div>
                  <h4 className="font-semibold mt-3">Avoid scams</h4>
          <p className="text-[13px] text-slate-600 mt-1">Never pay in advance. Verify profiles and check badges.</p>
                  <button className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">Learn more</button>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>
                  <h4 className="font-semibold mt-3">Safe payments</h4>
                  <p className="text-[13px] text-slate-600 mt-1">Meet in public, count cash, get receipt. For high-value, use escrow.</p>
                  <button className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">Learn more</button>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 card">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
                  <h4 className="font-semibold mt-3">Verified sellers</h4>
                  <p className="text-[13px] text-slate-600 mt-1">Look for ID verified, phone confirmed, and top seller badges.</p>
                  <button className="btn-sm border border-slate-300 mt-3 hover:bg-slate-50">Learn more</button>
                </div>
              </div>
            </section>

            {/* 13. POPULAR SEARCHES */}
            <section className="col-span-12">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[17px]">Popular searches</h3>
                  <span className="text-[12px] text-slate-500">Updated hourly</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['iphone 15', 'samsung s24', 'departamento renta puerto vallarta', 'casa venta guadalajara', 'honda civic', 'toyota corolla', 'trabajo remoto', 'recepcionista', 'nintendo switch', 'ps5', 'macbook', 'trabajo medio tiempo', 'bicicleta', 'escritorio', 'sala', 'refrigerador', 'lavadora', 'golden retriever', 'gatitos', 'terreno', 'local comercial', 'moto italika', 'yamaha', 'abogado', 'contador', 'plomero', 'electricista', 'clases ingles', 'uber carro', 'airbnb amueblado'].map(term => (
                    <a key={term} onClick={() => setSearchQuery(term)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] cursor-pointer">{term}</a>
                  ))}
                </div>
              </div>
            </section>

            {/* 14. CITIES */}
            <section className="col-span-12">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[17px]">Explore by city</h3>
                <a onClick={() => setSelectedState('')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer">View all Mexico →</a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {[
                  { name: 'Ciudad de México', count: '284,392' },
                  { name: 'Guadalajara', count: '198,445' },
                  { name: 'Monterrey', count: '156,221' },
                  { name: 'Puebla', count: '89,334' },
                  { name: 'Tijuana', count: '76,551' },
                  { name: 'Puerto Vallarta', count: '47,882', highlight: true },
                  { name: 'Cancún', count: '58,992' },
                  { name: 'Mérida', count: '52,110' },
                  { name: 'Querétaro', count: '71,884' },
                  { name: 'León', count: '64,223' },
                  { name: 'Playa del Carmen', count: '39,445' },
                  { name: 'Tulum', count: '28,331' },
                  { name: 'Zapopan', count: '61,223' },
                  { name: 'Tlaquepaque', count: '34,556' },
                  { name: 'Culiacán', count: '41,882' },
                  { name: 'Hermosillo', count: '38,991' },
                  { name: 'Chihuahua', count: '44,221' },
                  { name: 'Aguascalientes', count: '36,774' },
                  { name: 'San Luis Potosí', count: '42,119' },
                  { name: 'Cabo San Lucas', count: '31,882' }
                ].map(city => (
                  <a key={city.name} onClick={() => setSelectedState(city.name)} className={`bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm flex justify-between items-center cursor-pointer ${city.highlight ? 'ring-2 ring-[#84CC16]/40' : ''}`}>
                    <span className={`text-[14px] ${city.highlight ? 'font-medium' : ''}`}>{city.name}</span>
                    <span className={`text-[12px] ${city.highlight ? 'text-[#65A30D] font-semibold' : 'text-slate-500'}`}>{city.count}</span>
                  </a>
                ))}
              </div>
            </section>

            {/* 15. APP DOWNLOAD */}
            <section className="col-span-12 mt-4">
              <div className="bg-[#0F172A] text-white rounded-[28px] overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-0 items-center">
                  <div className="p-8 lg:p-12">
                    <span className="badge bg-[#84CC16] text-white">NEW APP</span>
                    <h3 className="text-[28px] lg:text-[34px] font-bold leading-tight mt-3">Mercasto on your phone. Buy & sell faster.</h3>
                    <p className="text-white/70 mt-3 text-[15px] max-w-[480px]">Get instant alerts, gestiona todo desde tu móvil, scan to post, and meet safely with in-app verification.</p>
                    <ul className="mt-5 space-y-2 text-[14px] text-white/90">
                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> Push alerts for saved searches</li>
                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> Camera auto-fill for listings</li>
                      <li className="flex gap-2.5"><span className="text-[#84CC16]">✓</span> Contacto seguro con código QR</li>
                    </ul>
                    <div className="flex items-center gap-3 mt-6">
                      <a className="h-12"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" className="h-12" alt="App Store"/></a>
                      <a className="h-12"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" className="h-12" alt="Google Play"/></a>
                    </div>
                    <div className="flex items-center gap-4 mt-5 text-[12px] text-white/60">
                      <span>4.8 ★ 124k reviews</span>
                      <span>•</span>
                      <span>Free • No ads in Pro</span>
                    </div>
                  </div>
                  <div className="relative h-[340px] lg:h-full min-h-[380px] bg-gradient-to-br from-[#84CC16]/20 to-transparent">
                    <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800" className="absolute bottom-0 right-6 lg:right-12 w-[260px] lg:w-[320px] drop-shadow-2xl rounded-[32px] border-[8px] border-black/80" alt="Phone mockup"/>
                    <div className="absolute top-10 right-[40%] hidden lg:block bg-white text-slate-900 rounded-2xl p-3 shadow-xl w-[200px]">
                      <div className="text-[11px] text-slate-500">Nuevo lead de WhatsApp</div>
                      <div className="text-[13px] font-medium mt-1">¡Alguien está interesado en tu iPhone!</div>
                      <div className="text-[11px] text-[#65A30D] mt-1 font-semibold">Ver estadísticas →</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 16. NEWSLETTER */}
            <section className="col-span-12">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div>
                  <h4 className="font-bold text-[18px]">Get the best deals in Puerto Vallarta</h4>
                  <p className="text-[13px] text-slate-600">Weekly digest of trending listings, price drops, and new jobs. Unsubscribe anytime.</p>
                </div>
                <form className="flex w-full md:w-auto gap-2" onSubmit={e => e.preventDefault()}>
                  <input type="email" required placeholder="Your email" className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>
                  <button type="submit" className="btn-md bg-[#84CC16] text-white hover:bg-[#65A30D] whitespace-nowrap">Subscribe</button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  };

  // --- РЕНДЕР РОСКОШНОЙ ФОРМЫ (POST SCREEN) ---
  const renderPostScreen = () => {
    const mapQuery = debouncedLocation ? encodeURIComponent(debouncedLocation) : "Mexico";
    const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    return (
      <div className="bg-[var(--paper)] min-h-screen w-full flex items-start justify-center py-6 md:py-10 px-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2 cursor-pointer" onClick={() => editingAd && setEditingAd(null)}>
              <PlusCircle className="text-[#84CC16]" size={26} /> {editingAd ? 'Editar anuncio' : t.post_title}
          </h2>
          
          <form onSubmit={handlePostSubmit} className="space-y-6">
              {/* IMAGE UPLOAD */}
              <div>
                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">Fotos del anuncio</label>
                 {images.length > 0 ? (
                    <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                       {images.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                             <img src={img.preview} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                             <button type="button" onClick={(e) => { e.preventDefault(); removeImage(idx); }} className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur rounded-full p-1 text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-colors">
                               <Trash2 size={14}/>
                             </button>
                          </div>
                       ))}
                       {images.length < 10 && (
                          <label className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer bg-slate-50">
                             <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                             <PlusCircle className="text-slate-400" size={24} />
                          </label>
                       )}
                    </div>
                 ) : (
                    <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#84CC16]/5 hover:border-[#84CC16]/50 transition-all cursor-pointer group relative overflow-hidden h-40 md:h-48 bg-slate-50">
                       <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                       <div className="w-14 h-14 bg-white group-hover:bg-[#84CC16]/10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm">
                          <Camera className="text-slate-400 group-hover:text-[#65A30D]" size={28} />
                       </div>
                       <p className="text-[14px] font-medium text-slate-700 mb-1">Arrastra tus fotos aquí o <span className="text-[#65A30D]">explora</span></p>
                       <p className="text-[12px] text-slate-500">Máximo 10 fotos (JPG, PNG)</p>
                    </label>
                 )}
              </div>

              {/* TITLE */}
              <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_title}</label>
                  <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="Ej: Honda Civic 2018" />
              </div>

              {/* CATEGORY & CONDITION & PRICE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Categoría</label>
                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                          <option value="">Seleccionar...</option>
                          {categoriesData.map(c => <option key={c.slug} value={c.slug}>{c.name[lang] || c.name['es']}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">Estado</label>
                      <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                          <option value="nuevo">Nuevo</option>
                          <option value="usado">Usado</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_price}</label>
                      <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400 text-[14px]">$</span>
                          <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required className="w-full px-3.5 py-2.5 pl-7 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="0.00" />
                      </div>
                  </div>
              </div>

              {/* LOCATION & MAP */}
              <div>
                 <label className="block text-[13px] font-semibold text-slate-700 mb-2">Ubicación</label>
                 <div className="relative mb-3">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} required className="w-full px-3.5 py-2.5 pl-10 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" placeholder="Escribe tu ciudad, colonia o código postal" />
                 </div>
                 <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                     <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={mapUrl} style={{ border: 0, filter: 'grayscale(0.1) contrast(1.05)' }} className={`transition-opacity duration-300 ${isMapUpdating ? 'opacity-40' : 'opacity-100'}`}></iframe>
                     {isMapUpdating && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50"><Loader2 className="w-8 h-8 text-[#84CC16] animate-spin"/></div>}
                 </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.ad_desc}</label>
                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all min-h-[140px]" placeholder={t.ad_desc}></textarea>
              </div>

              {/* VIDEO URL */}
              <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">Video (Opcional, MP4, max 50MB)</label>
                  {videoFile ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-xl border border-slate-200">
                      <Video className="text-slate-500" />
                      <span className="text-sm text-slate-700 truncate flex-1">{videoFile.name}</span>
                      <button type="button" onClick={() => setVideoFile(null)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  ) : (
                    <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => setVideoFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#84CC16]/10 file:text-[#65A30D] hover:file:bg-[#84CC16]/20" />
                  )}
              </div>

              <div className="pt-2">
                <button type="submit" disabled={postLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                    {postLoading ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={18}/> {editingAd ? 'Guardar cambios' : t.publish_btn}</>}
                </button>
              </div>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОДАЛКИ ПРОФИЛЯ ---
  const renderProfileModal = () => {
    if (!showProfileModal) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
          <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
          <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Editar Perfil</h2>
          
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 mb-3 overflow-hidden relative group border border-slate-200">
                {profileForm.avatarPreview ? (
                  <img src={profileForm.avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={40} /></div>
                )}
                <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-colors">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setProfileForm({ ...profileForm, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
                  }}/>
                </label>
              </div>
              <span className="text-[12px] font-medium text-slate-500">Cambiar Foto</span>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">Nombre</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
            </div>

            <button type="submit" disabled={profileLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex justify-center mt-2">
              {profileLoading ? <Loader2 className="animate-spin" size={20}/> : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- РЕНДЕР ПАНЕЛИ АДМИНИСТРАТОРА ---
  const renderAdminScreen = () => {
    if (userRole !== 'admin') return <div className="p-10 text-center font-bold text-red-500">Acceso denegado</div>;

    const filteredAdminUsers = adminUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(adminUserSearch.toLowerCase())) ||
      (u.id && u.id.toString() === adminUserSearch.trim())
    );

    return (
      <div className="bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="hidden md:flex text-2xl font-bold items-center gap-3 text-slate-900 tracking-tight"><Shield className="text-red-500" size={32}/> {t.admin_panel}</h2>
            <div className="bg-slate-200 p-1 rounded-xl flex items-center w-fit">
               <button onClick={() => setAdminTab('categories')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'categories' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.cat_tab}</button>
               <button onClick={() => {setAdminTab('users'); loadAdminUsers();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.users_tab}</button>
               <button onClick={() => {setAdminTab('moderation'); loadPendingAds();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'moderation' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.mod_tab}</button>
               <button onClick={() => {setAdminTab('coupons'); loadCoupons();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'coupons' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.coupons_tab}</button>
               <button onClick={() => {setAdminTab('reports'); loadAdminReports();}} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${adminTab === 'reports' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.reports_tab}</button>
               <a href="/horizon" target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all text-slate-500 hover:text-purple-600 flex items-center gap-1.5"><Activity size={14}/> Horizon</a>
            </div>
          </div>

          {adminTab === 'categories' ? (
            <>
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8">
            <h3 className="text-[18px] font-bold mb-6 text-slate-900 flex items-center gap-2">
              {editingCatId ? <Pencil className="text-[#84CC16]" size={20}/> : <PlusCircle className="text-[#84CC16]" size={20}/>} 
              {editingCatId ? t.edit_cat : t.add_cat}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.slug}</label>
                  <input value={adminCatForm.slug} onChange={e=>setAdminCatForm({...adminCatForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} required placeholder="ej. deportes-extremos" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.icon}</label>
                  <select value={adminCatForm.icon} onChange={e=>setAdminCatForm({...adminCatForm, icon: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] bg-white cursor-pointer transition-all">
                    {Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.name_es}</label>
                  <input value={adminCatForm.name_es} onChange={e=>setAdminCatForm({...adminCatForm, name_es: e.target.value})} required placeholder="Deportes Extremos" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.name_en}</label>
                  <input value={adminCatForm.name_en} onChange={e=>setAdminCatForm({...adminCatForm, name_en: e.target.value})} required placeholder="Extreme Sports" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.sort_order}</label>
                  <input type="number" value={adminCatForm.sort_order} onChange={e=>setAdminCatForm({...adminCatForm, sort_order: parseInt(e.target.value) || 0})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 mt-2">
                <button type="submit" disabled={adminLoading} className="btn-md w-full md:w-auto bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">
                  {adminLoading ? <Loader2 className="animate-spin" size={18}/> : (editingCatId ? <><Pencil size={16}/> {t.save_changes}</> : <><PlusCircle size={16}/> {t.save_cat}</>)}
                </button>
                {editingCatId && (
                  <button type="button" onClick={cancelCatEdit} className="btn-md w-full md:w-auto border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2">
                    {t.cancel}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-[18px] font-bold mb-6 text-slate-900">{t.existing_cats} ({categoriesData.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoriesData.map(cat => {
                const Icon = IconMap[cat.icon] || Star;
                return (
                  <div key={cat.slug} className="border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100"><Icon size={20} className="text-[#65A30D]"/></div>
                      <div>
                        <p className="font-semibold text-[14px] text-slate-900 leading-tight">{cat.name?.[lang] || cat.name?.['es'] || cat.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">{cat.slug}</p>
                      </div>
                    </div>
                    <button onClick={() => handleEditCategory(cat)} className="p-2 text-slate-400 hover:text-[#84CC16] hover:bg-[#84CC16]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                       <Pencil size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          </>
          ) : adminTab === 'moderation' ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2"><ShieldCheck className="text-[#84CC16]" size={20}/> {t.pending_ads} ({adminPendingAds.length})</h3>
              {loadingPendingAds ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>
              ) : adminPendingAds.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">{t.no_pending}</div>
              ) : (
                 <div className="space-y-4">
                    {adminPendingAds.map(ad => (
                       <div key={ad.id} className="p-4 border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          {ad.image_url ? (
                             <img src={getImageUrls(ad.image_url, ad.image)[0]} className="w-20 h-20 rounded-xl object-cover border border-slate-200" alt="Preview" />
                          ) : (
                             <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200"><Camera className="text-slate-400"/></div>
                          )}
                          <div className="flex-1">
                             <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{ad.title}</h4>
                             <p className="text-[14px] font-bold text-[#65A30D] mt-1">${Number(ad.price).toLocaleString()}</p>
                             <p className="text-[12px] text-slate-500 mt-1">Por: {ad.user?.name} ({ad.user?.email})</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                             <button onClick={() => handleModerateAd(ad.id, 'active')} className="btn-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"><CheckCircle size={16}/> {t.approve}</button>
                             <button onClick={() => handleModerateAd(ad.id, 'rejected')} className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"><XCircle size={16}/> {t.reject}</button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
            </div>
          ) : adminTab === 'coupons' ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h3 className="text-[18px] font-bold text-slate-900 mb-6 flex items-center gap-2"><Ticket className="text-[#84CC16]" size={20}/> {t.coupon_gen}</h3>
              <form onSubmit={handleCreateCoupon} className="flex flex-col sm:flex-row items-end gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-full sm:flex-1">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.code}</label>
                  <input type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} required className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px] uppercase" />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.credits}</label>
                  <input type="number" value={couponForm.credits} onChange={e => setCouponForm({...couponForm, credits: Number(e.target.value)})} required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px]" />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.max_uses}</label>
                  <input type="number" value={couponForm.max_uses} onChange={e => setCouponForm({...couponForm, max_uses: Number(e.target.value)})} required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 text-[13px]" />
                </div>
                <button type="submit" className="btn-sm bg-[#0F172A] text-white hover:bg-black h-[38px] w-full sm:w-auto">{t.create}</button>
              </form>

              {loadingCoupons ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-slate-400"/></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {adminCoupons.map(c => (
                    <div key={c.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center relative overflow-hidden bg-white">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#84CC16]"></div>
                      <div>
                        <div className="font-black text-slate-900 tracking-wider text-[15px]">{c.code}</div>
                        <div className="text-[12px] text-slate-500 mt-1"><span className="font-bold text-[#65A30D]">{c.credits} cr.</span> • Usado: {c.used_count}/{c.max_uses}</div>
                      </div>
                      <button onClick={() => handleDeleteCoupon(c.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {adminCoupons.length === 0 && <p className="text-slate-400 text-[13px] col-span-full">{t.no_coupons}</p>}
                </div>
              )}
            </div>
          ) : adminTab === 'reports' ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><Shield className="text-[#84CC16]" size={20}/> {t.report_center}</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                  <button onClick={() => setAdminReportTab('ads')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'ads' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Anuncios</button>
                  <button onClick={() => setAdminReportTab('users')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-colors ${adminReportTab === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Usuarios</button>
                </div>
              </div>
              {loadingReports ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-slate-400"/></div> : (
                <div className="overflow-x-auto">
                  {adminReportTab === 'ads' ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                        <th className="p-3">{t.reported_ad}</th>
                        <th className="p-3">{t.reason}</th>
                        <th className="p-3 hidden md:table-cell">{t.comments}</th>
                        <th className="p-3 hidden sm:table-cell">{t.reported_by}</th>
                        <th className="p-3 text-right">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                          <td className="p-3 font-medium text-slate-900">
                            ID: {r.ad_id} - <span className="line-clamp-1 cursor-pointer hover:text-[#65A30D] transition-colors" onClick={() => { const ad = allAds.find(a => a.id === r.ad_id); if(ad) handleViewAd(ad); }}>{r.ad_title}</span>
                            <span className={`badge mt-1 ${r.ad_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.ad_status}</span>
                          </td>
                          <td className="p-3 font-semibold text-red-600">{r.reason}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate hidden md:table-cell" title={r.comments}>{r.comments || '-'}</td>
                          <td className="p-3 text-slate-500 hidden sm:table-cell">{r.reporter_name ? `${r.reporter_name}` : 'Anónimo'}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteReport(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Descartar reporte"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {adminReports.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">{t.no_reports}</td></tr>}
                    </tbody>
                  </table>
                  ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                        <th className="p-3">{t.reported_user}</th>
                        <th className="p-3">{t.reason}</th>
                        <th className="p-3 hidden md:table-cell">{t.comments}</th>
                        <th className="p-3 hidden sm:table-cell">{t.reported_by}</th>
                        <th className="p-3 text-right">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUserReports.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                          <td className="p-3 font-medium text-slate-900">ID: {r.reported_user_id} - <span className="text-[#65A30D]">{r.reported_name}</span></td>
                          <td className="p-3 font-semibold text-red-600">{r.reason}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate hidden md:table-cell" title={r.comments}>{r.comments || '-'}</td>
                          <td className="p-3 text-slate-500 hidden sm:table-cell">{r.reporter_name ? `${r.reporter_name}` : 'Anónimo'}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteUserReport(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Descartar reporte"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {adminUserReports.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">{t.no_reports}</td></tr>}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2"><Users className="text-[#84CC16]" size={20}/> {t.user_mgmt}</h3>
                <div className="flex items-center gap-2 w-full md:w-auto">
                   <input value={adminUserSearch} onChange={e=>setAdminUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadAdminUsers()} placeholder={t.search_users} className="w-full md:w-64 px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />
                   <button onClick={loadAdminUsers} className="bg-slate-900 hover:bg-black text-white p-2 border border-slate-900 rounded-xl transition-colors"><Search size={18}/></button>
                </div>
              </div>
              
              {loadingAdminUsers ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#84CC16]" size={32}/></div>
              ) : (
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-500">
                         <th className="p-3">{t.users_tab}</th>
                         <th className="p-3">Email / IP</th>
                         <th className="p-3">{t.role}</th>
                         <th className="p-3 text-right">{t.action}</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredAdminUsers.map(u => (
                         <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-3">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                                  {u.avatar_url ? <img src={getImageUrl(u.avatar_url)} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-slate-400"/></div>}
                               </div>
                               <div>
                                 <p className="font-semibold text-[14px] text-slate-900 flex items-center gap-1">{u.name}</p>
                                 <p className="text-[11px] font-medium text-slate-500">ID: {u.id}</p>
                               </div>
                             </div>
                           </td>
                           <td className="p-3">
                             <p className="font-medium text-[14px] text-slate-900">{u.email}</p>
                             <p className="text-[11px] text-slate-500">{u.ip_address || t.hidden_ip}</p>
                           </td>
                           <td className="p-3">
                             <select 
                               value={u.role} 
                               onChange={(e) => handleAdminChangeRole(u.id, e.target.value)}
                               className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest outline-none cursor-pointer ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'business' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
                             >
                               <option value="individual">Individual</option>
                               <option value="business">Business (PRO)</option>
                               <option value="admin">Admin</option>
                             </select>
                           </td>
                           <td className="p-3 text-right flex items-center justify-end gap-2">
                             <button onClick={() => handleAdminVerifyUser(u.id)} className={`p-2 rounded-lg transition-colors ${u.is_verified ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-blue-500'}`} title="Verificar">
                               <BadgeCheck size={18}/>
                             </button>
                             <button onClick={() => handleAdminDeleteUser(u.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar">
                               <Trash2 size={18}/>
                             </button>
                           </td>
                         </tr>
                       ))}
                       {filteredAdminUsers.length === 0 && (
                         <tr>
                           <td colSpan="4" className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">{t.no_users}</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- РЕНДЕР МОБИЛЬНОГО ТАБ-БАРА ---
  const renderTabBar = () => (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-40 h-[84px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
      <button onClick={() => setCurrentTab('home')} className={`flex flex-col items-center p-1 ${currentTab === 'home' ? 'text-[#12B981]' : 'text-gray-400'}`}>
        <Home className="w-6 h-6 mb-1" />
      </button>
      <button onClick={() => setCurrentTab('search')} className={`flex flex-col items-center p-1 ${currentTab === 'search' ? 'text-[#12B981]' : 'text-gray-400'}`}>
        <Search className="w-6 h-6 mb-1" />
      </button>
      <button onClick={() => setCurrentTab('post')} className="flex flex-col items-center p-1 -mt-8"><div className="flex flex-col items-center justify-center bg-[#12B981] text-white p-3.5 rounded-full shadow-lg border-4 border-[#f5f5f5]"><PlusCircle className="w-7 h-7" /></div></button>
      <button onClick={() => { user ? setShowNotifications(!showNotifications) : setShowAuthModal(true); }} className={`flex flex-col items-center p-1 relative ${currentTab === 'notifications' ? 'text-[#12B981]' : 'text-gray-400'}`}><Bell className="w-6 h-6 mb-1" />{notifications.filter(n => !n.is_read).length > 0 && <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
      <button onClick={() => { user ? setCurrentTab('profile') : setShowAuthModal(true) }} className={`flex flex-col items-center p-1 ${currentTab === 'profile' ? 'text-[#12B981]' : 'text-gray-400'}`}>
        <User className="w-6 h-6 mb-1" />
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[var(--paper)] font-sans text-[var(--ink)] selection:bg-[#84CC16]/20">
      
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-3 h-[68px]">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); setActiveCat(''); setSearchQuery(''); }} className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
              <MercastoLogo />
            </a>
            <div className="hidden lg:flex flex-1 items-center">
              <div className="flex w-full max-w-[820px] items-center bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-[#84CC16]/30 focus-within:border-[#84CC16]">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); }} placeholder="Buscar autos, celulares, empleos..." className="w-full px-3 py-2.5 bg-transparent outline-none text-[14px]" />
                <div className="h-7 w-px bg-slate-200"></div>
                <MapPin className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input ref={locationInputRef} value={searchLocationInput} onChange={(e) => { setSearchLocationInput(e.target.value); if(e.target.value === '') setSearchLocation(null); }} placeholder="Ubicación" className="w-full max-w-[200px] px-2 py-2.5 bg-transparent outline-none text-[14px]" />
                <div className="h-7 w-px bg-slate-200"></div>
                <select value={radius} onChange={e => setRadius(Number(e.target.value))} className="bg-transparent px-3 py-2.5 text-[13px] outline-none text-slate-700 w-fit cursor-pointer">
                  <option value={5}>+5 km</option>
                  <option value={10}>+10 km</option>
                  <option value={25}>+25 km</option>
                  <option value={50}>+50 km</option>
                  <option value={100}>+100 km</option>
                </select>
                <button onClick={loadAds} className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white m-1 ml-2 flex items-center gap-1.5">
                  <Search size={16}/>
                  Buscar
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200/50 text-slate-500 hover:text-slate-900 transition-colors mr-1">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="hidden md:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/50">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent text-[12px] font-bold outline-none cursor-pointer uppercase appearance-none pr-1">
                  {Object.keys(translations).map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <button onClick={() => { user ? setShowNotifications(!showNotifications) : setShowAuthModal(true); }} className="relative p-2.5 hover:bg-slate-100 rounded-xl text-slate-700">
                  <Bell className="w-[22px] h-[22px]" />
                  {notifications.filter(n => !n.is_read).length > 0 && <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifications && user && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-900 flex justify-between items-center">
                      <span>Notificaciones</span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <button onClick={handleMarkAllNotificationsRead} className="text-[11px] text-[#65A30D] hover:underline font-medium font-sans">Marcar todas leídas</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-6 text-center text-slate-500 text-[13px]">No tienes notificaciones</div> :
                        notifications.map(n => (
                          <div key={n.id} onClick={() => handleMarkNotificationRead(n.id)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors relative group ${!n.is_read ? 'bg-[#84CC16]/5' : ''}`}>
                            <h4 className={`text-[13px] pr-6 ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                            <p className="text-[12px] text-slate-600 mt-1">{n.message}</p>
                            <span className="text-[10px] text-slate-400 block mt-2">{new Date(n.created_at).toLocaleString()}</span>
                            <button onClick={(e) => handleDeleteNotification(e, n.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => { user ? setCurrentTab('profile') : setShowAuthModal(true); setDashboardTab('favorites'); }} className="relative p-2.5 hover:bg-slate-100 rounded-xl">
                <Heart className="w-[22px] h-[22px] text-slate-700" />
                {favoriteIds.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#84CC16] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white">{favoriteIds.length}</span>}
              </button>
              <button onClick={() => { user ? setCurrentTab('profile') : setShowAuthModal(true); setViewedAd(null); setViewedCompany(null); }} className="flex items-center gap-2 pl-1 pr-2.5 py-1 hover:bg-slate-100 rounded-xl">
                {user?.avatar_url ? (
                  <img src={getImageUrl(user.avatar_url)} className="w-8 h-8 rounded-lg object-cover" alt=""/>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500"><User size={18} /></div>
                )}
                <span className="text-[13px] font-medium hidden lg:block">{user?.name || 'Invitado'}</span>
              </button>
              <button onClick={() => { setCurrentTab('post'); setViewedAd(null); setViewedCompany(null); }} className="btn-lg bg-[#84CC16] hover:bg-[#65A30D] text-white shadow-md shadow-[#84CC16]/20 ml-1 hidden sm:inline-flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> Post ad
              </button>
            </div>
          </div>
          {/* Mobile Search */}
          <div className="lg:hidden pb-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#84CC16]/30">
              <Search className="w-4 h-4 text-slate-500" />
              <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); }} placeholder="Search Mercasto" className="bg-transparent w-full text-sm outline-none"/>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
            <nav className="flex items-center gap-5 overflow-x-auto scrollbar-hide text-[13.5px] font-medium text-slate-600">
              <a onClick={() => setActiveCat('')} className={`whitespace-nowrap py-3 cursor-pointer ${activeCat === '' ? 'border-b-2 border-[#84CC16] text-[#0F172A] font-semibold' : 'hover:text-[#0F172A]'}`}>All</a>
              {categoriesData.map(c => (
                <a key={c.slug} onClick={() => setActiveCat(c.slug)} className={`whitespace-nowrap py-3 cursor-pointer ${activeCat === c.slug ? 'border-b-2 border-[#84CC16] text-[#0F172A] font-semibold' : 'hover:text-[#0F172A]'}`}>{c.name[lang] || c.name['es']}</a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full">
        {viewedAd ? (
          renderAdDetailScreen()
        ) : viewedCompany ? (
          renderStorefrontScreen()
        ) : (
          <>
            {currentTab === 'home' && renderHomeScreen()}
            {currentTab === 'post' && renderPostScreen()}
            {currentTab === 'profile' && renderUserDashboard()}
            {currentTab === 'admin' && renderAdminScreen()}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-10 bg-[#0F172A] text-slate-300">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3 h-8 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { setCurrentTab('home'); setViewedAd(null); setActiveCat(''); setSearchQuery(''); }}>
                <MercastoLogo className="grayscale brightness-200 h-8" />
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">Mexico's fastest local marketplace. Buy, sell, rent, and find jobs — safely.</p>
            </div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">Buyers</h5><ul className="space-y-2 text-[13px]"><li><a className="hover:text-white cursor-pointer">How to buy</a></li><li><a className="hover:text-white cursor-pointer">Safety tips</a></li><li><a className="hover:text-white cursor-pointer">Favorites</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">Sellers</h5><ul className="space-y-2 text-[13px]"><li><a className="hover:text-white cursor-pointer" onClick={() => setCurrentTab('post')}>Post ad</a></li><li><a className="hover:text-white cursor-pointer" onClick={() => setShowPricingModal(true)}>Pricing</a></li><li><a className="hover:text-white cursor-pointer">Promote listing</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">Business</h5><ul className="space-y-2 text-[13px]"><li><a className="hover:text-white cursor-pointer" onClick={() => setShowPricingModal(true)}>Mercasto Pro</a></li><li><a className="hover:text-white cursor-pointer">API</a></li><li><a className="hover:text-white cursor-pointer">Partners</a></li></ul></div>
            <div><h5 className="font-semibold text-white mb-3 text-[14px]">Help</h5><ul className="space-y-2 text-[13px]"><li><a className="hover:text-white cursor-pointer">Help Center</a></li><li><a className="hover:text-white cursor-pointer">Safety Center</a></li><li><a className="hover:text-white cursor-pointer">Terms & Privacy</a></li></ul></div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[12px] text-slate-400">
              <span>© 2026 Mercasto México S.A. de C.V.</span>
            </div>
          </div>
        </div>
      </footer>

      {!viewedAd && renderTabBar()}
      {renderPricingModal()}
      {renderProfileModal()}
      {renderQRModal()}
      {renderReportModal()}
      {renderUserReportModal()}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !authLoading && setShowAuthModal(false)}>
          {requiresTwoFactor ? (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Verificación de dos pasos</h2>
              <p className="text-center text-slate-500 text-sm -mt-4 mb-6">Ingresa el código de tu app de autenticación.</p>
              <form onSubmit={handleTwoFactorSubmit} className="space-y-3.5">
                <input name="code" required autoFocus placeholder="Código de 6 dígitos" maxLength="6" className="w-full text-center tracking-[0.5em] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>
                <div className="pt-2">
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center">
                    {authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Verificar e Iniciar Sesión'}
                  </button>
                </div>
              </form>
            </div>
          ) : authMode === 'phone_request' || authMode === 'phone_verify' ? (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
              <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">Acceso con Teléfono</h2>
              
              {authMode === 'phone_request' ? (
                <form onSubmit={handlePhoneRequestSubmit} className="space-y-3.5">
                  <input name="phone_number" required type="tel" placeholder="Número de teléfono" className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Recibir SMS'}</button>
                </form>
              ) : (
                <form onSubmit={handlePhoneVerifySubmit} className="space-y-3.5">
                  <p className="text-center text-slate-500 text-[13px] -mt-2 mb-4">Código enviado al <br/><strong>{authPhone}</strong></p>
                  <input name="code" required autoFocus placeholder="Código de 6 dígitos" maxLength="6" className="w-full text-center tracking-[0.5em] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"/>
                  <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center mt-2">{authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Verificar y Entrar'}</button>
                </form>
              )}
              <div className="mt-6 text-center">
                 <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">Volver a iniciar sesión</button>
              </div>
            </div>
          ) : (
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 relative shadow-2xl animate-in fade-in zoom-in-95">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24}/></button>
                <h2 className="text-[22px] font-bold tracking-tight mb-6 text-center text-slate-900">
                  {authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.forgot_password : t.reset_password}
                </h2>
                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authMode === 'register' && <input name="name" required placeholder={t.name} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {authMode !== 'reset_password' && <input name="email" type="email" required placeholder={t.email} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {(authMode === 'login' || authMode === 'register') && <input name="password" type="password" required placeholder={t.password} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    {authMode === 'reset_password' && <input name="password" type="password" required placeholder={t.new_password} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all placeholder:text-slate-400"/>}
                    <div className="pt-2">
                      <button type="submit" disabled={authLoading} className="btn-lg w-full bg-[#84CC16] text-white hover:bg-[#65A30D] flex items-center justify-center">
                          {authLoading ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? t.login : authMode === 'register' ? t.register : authMode === 'forgot_password' ? t.send_link : t.reset_password)}
                      </button>
                    </div>
                </form>
                
                {(authMode === 'login' || authMode === 'register') && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                      <div className="relative flex justify-center text-[12px]"><span className="bg-white px-2 text-slate-400 font-medium">O</span></div>
                    </div>

                    <div className="space-y-2.5">
                      <button type="button" onClick={() => window.location.href = `${API_URL}/auth/google/redirect`} className="btn-md w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Google
                      </button>
                      <button type="button" onClick={() => setAuthMode('phone_request')} className="btn-md w-full bg-[#10B981] text-white hover:bg-[#059669] flex items-center justify-center gap-3">
                          <Phone className="w-4 h-4" />
                          Teléfono (SMS)
                      </button>
                      <button type="button" onClick={() => window.location.href = `${API_URL}/auth/apple/redirect`} className="btn-md w-full bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-3">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M16.365 21.435c-1.47 1.043-2.52 1.488-4.225 1.488-1.545 0-2.925-.536-4.39-1.503-3.64-2.42-6.58-8.24-4.88-13.16 1.18-3.41 3.98-5.32 6.84-5.32 1.54 0 2.92.54 4.15 1.25 1.05.61 1.67.92 2.29.92.57 0 1.25-.32 2.38-.97 1.44-.82 3.12-1.12 4.7-.62 2.66.86 4.49 2.97 5.48 5.76-4.5 1.83-5.34 7.63-2.02 10.37-1.07 2.95-3.21 5.34-5.59 7.04-1.28.92-2.3 1.34-3.67 1.34-1.29 0-2.35-.45-3.8-1.39zm-3.08-20.17c-.55-2.05 1.27-4.13 3.3-4.26.65 2.15-1.39 4.34-3.3 4.26z"/>
                          </svg>
                          Apple
                      </button>
                      <button type="button" onClick={() => window.location.href = `${API_URL}/auth/telegram/redirect`} className="btn-md w-full bg-[#229ED9] text-white hover:bg-[#1c88ba] flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.535.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.35-.11l-6.4 4.02-2.76-.89c-.6-.188-.614-.6.126-.89L17.2 7.15c.523-.188.983.118.694 1.07z"/>
                          </svg>
                          Telegram
                      </button>
                    </div>
                  </>
                )}

                <div className="mt-6 text-center flex flex-col gap-2.5">
                    {(authMode === 'login' || authMode === 'register') && (
                        <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            {authMode === 'login' ? "¿No tienes cuenta? Únete" : "Ya tengo cuenta"}
                        </button>
                    )}
                    {authMode === 'login' && (
                        <button type="button" onClick={() => setAuthMode('forgot_password')} className="text-[12px] font-medium text-slate-400 hover:text-[#84CC16] transition-colors">
                            ¿Olvidaste tu contraseña?
                        </button>
                    )}
                    {(authMode === 'forgot_password' || authMode === 'reset_password' || authMode === 'phone_request' || authMode === 'phone_verify') && (
                        <button type="button" onClick={() => setAuthMode('login')} className="text-[13px] font-medium text-slate-500 hover:text-[#84CC16] transition-colors underline underline-offset-4">
                            Volver a iniciar sesión
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      )}

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
        :root{--lime:#84CC16;--lime2:#65A30D;--ink:#0F172A;--paper:#F8FAFC}
        html{scroll-behavior:smooth}
        body{font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--paper);color:var(--ink); -webkit-font-smoothing: antialiased;}
        h1, h2, h3, h4, h5, p, span, button, input, select, label, textarea { font-family: 'Inter', sans-serif !important; }
        * { outline: none !important; font-style: normal !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .btn-sm{padding:.375rem .75rem;font-size:.8125rem;line-height:1.1rem;border-radius:.5rem;font-weight:500;transition:.15s}
        .btn-md{padding:.55rem 1rem;font-size:.875rem;line-height:1.25rem;border-radius:.6rem;font-weight:500;transition:.15s}
        .btn-lg{padding:.8rem 1.4rem;font-size:.95rem;line-height:1.25rem;border-radius:.75rem;font-weight:600;transition:.15s}
        .card{transition:all .2s ease}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 25px -10px rgba(15,23,42,.15)}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
        .line-clamp-1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
        .line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;letter-spacing:.02em}
        
        /* ГЛОБАЛЬНЫЕ ПРАВИЛА ТЕМНОЙ ТЕМЫ */
        html.dark { --paper: #0F172A; --ink: #F8FAFC; }
        html.dark .bg-white { background-color: #1E293B !important; }
        html.dark .bg-slate-50, html.dark .bg-slate-100 { background-color: #0F172A !important; }
        html.dark .border-slate-100, html.dark .border-slate-200, html.dark .border-slate-300 { border-color: #334155 !important; }
        html.dark .text-slate-900, html.dark .text-slate-800, html.dark .text-slate-700 { color: #F8FAFC !important; }
        html.dark .text-slate-600, html.dark .text-slate-500, html.dark .text-slate-400 { color: #94A3B8 !important; }
        html.dark .bg-white\\/90 { background-color: rgba(30, 41, 59, 0.9) !important; }
        html.dark input, html.dark textarea, html.dark select { background-color: #0F172A !important; color: #F8FAFC !important; }
      `}} />
    </div>
  );
}
