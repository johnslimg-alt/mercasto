const autoBrands = [
  // Norteamérica
  'Chevrolet', 'Ford', 'RAM', 'Dodge', 'Jeep', 'Chrysler', 'GMC', 'Cadillac', 'Buick', 'Lincoln', 'Tesla',
  // Japón / Corea
  'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Isuzu', 'Kia', 'Hyundai', 'Genesis',
  // Alemania
  'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'MINI', 'Smart',
  // Europa (otros)
  'SEAT', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Alfa Romeo', 'Volvo', 'Land Rover', 'Jaguar',
  // China
  'BYD', 'MG', 'Chirey', 'JAC', 'GWM (Haval)', 'Changan', 'Omoda/Jaecoo', 'DFSK', 'Foton',
  // Camiones y autobuses comerciales
  'Scania', 'International', 'Freightliner', 'MAN', 'Iveco', 'Dina', 'Hino',
  // Motocicletas
  'Yamaha', 'Kawasaki', 'Harley-Davidson', 'Ducati', 'Triumph', 'KTM', 'Royal Enfield',
  'Vespa/Piaggio', 'Italika', 'Vento', 'Bajaj', 'Benelli', 'Husqvarna',
  // Movilidad eléctrica y micromovilidad
  'Segway-Ninebot', 'InMotion', 'KingSong', 'Zacua', 'Kandi',
  // Karts de golf
  'Club Car', 'E-Z-GO', 'Garia',
  // Embarcaciones (lanchas, yates, motos de agua)
  'Sea-Doo', 'Bayliner', 'Sea Ray', 'Bertram', 'Azimut', 'Beneteau', 'Boston Whaler', 'Chaparral', 'Four Winns',
  'Otra'
];

// Modelos reales más comunes por marca en el mercado mexicano.
// Se usa para el select dependiente Marca -> Modelo al publicar; marcas sin
// entrada aquí (o "Otra") caen a un campo de texto libre.
export const autoModelsByBrand = {
  'Chevrolet': ['Aveo', 'Onix', 'Silverado', 'Equinox', 'Tracker', 'Captiva', 'Cavalier', 'Suburban', 'Spark', 'Blazer', 'Colorado'],
  'Nissan': ['Versa', 'Sentra', 'Altima', 'March', 'Frontier', 'Kicks', 'X-Trail', 'Pathfinder', 'Tsuru', 'NP300', 'V-Drive'],
  'Volkswagen': ['Jetta', 'Golf', 'Tiguan', 'Vento', 'Polo', 'Taos', 'Virtus', 'Taigun', 'Nivus', 'Beetle'],
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Tacoma', 'Yaris', 'Prius', 'Hilux', 'Sienna', 'Land Cruiser', 'Corolla Cross', 'Highlander'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Fit', 'HR-V', 'City', 'Pilot', 'Odyssey', 'BR-V'],
  'Ford': ['Mustang', 'Lobo', 'Explorer', 'Ranger', 'Focus', 'Escape', 'Bronco', 'F-150', 'Edge', 'Territory', 'Maverick'],
  'BMW': ['Serie 3', 'Serie 1', 'X3', 'X5', 'Serie 5', 'X1', 'X6', 'Serie 4', 'X2'],
  'Mercedes-Benz': ['Clase C', 'Clase A', 'GLC', 'GLE', 'Clase E', 'GLA', 'CLA', 'GLB'],
  'Audi': ['A3', 'A4', 'Q3', 'Q5', 'A1', 'A6', 'Q7', 'Q2'],
  'Kia': ['Rio', 'Forte', 'Sportage', 'Seltos', 'Soul', 'Sorento', 'Picanto', 'K3'],
  'Hyundai': ['Accent', 'Elantra', 'Tucson', 'Creta', 'Santa Fe', 'Grand i10', 'Venue', 'Kona'],
  'Mazda': ['Mazda 3', 'Mazda 2', 'CX-30', 'CX-5', 'CX-3', 'Mazda 6', 'MX-5', 'CX-50'],
  'Jeep': ['Grand Cherokee', 'Wrangler', 'Compass', 'Renegade', 'Cherokee', 'Gladiator'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
  'MG': ['MG5', 'HS', 'ZS', 'RX5', 'GT', 'One'],
  'BYD': ['Dolphin', 'Yuan Plus', 'Song Plus', 'Han', 'Tang', 'Seal'],
  'SEAT': ['Ibiza', 'León', 'Ateca', 'Arona', 'Tarraco'],
  'Renault': ['Kwid', 'Kangoo', 'Duster', 'Logan', 'Stepway', 'Oroch', 'Captur'],
  'Peugeot': ['208', '2008', '3008', '308', 'Partner', '408'],
  'Mitsubishi': ['L200', 'Outlander', 'ASX', 'Mirage', 'Eclipse Cross', 'Xpander'],
  'Suzuki': ['Swift', 'Vitara', 'Ciaz', 'S-Cross', 'Jimny'],
  'RAM': ['700', '1500', '2500', 'ProMaster'],
  'Dodge': ['Attitude', 'Journey', 'Durango', 'Ram (versión anterior)'],
  'Chirey': ['Tiggo 2', 'Tiggo 7', 'Tiggo 8', 'Arrizo 5'],
  'Chrysler': ['300', 'Pacifica', 'Voyager'],
  'GMC': ['Sierra', 'Terrain', 'Yukon', 'Acadia', 'Canyon'],
  'Cadillac': ['Escalade', 'XT4', 'XT5', 'XT6', 'CT5'],
  'Buick': ['Encore', 'Envision', 'Enclave'],
  'Lincoln': ['Nautilus', 'Aviator', 'Corsair', 'Navigator'],
  'Subaru': ['Forester', 'Outback', 'Impreza', 'XV', 'Crosstrek'],
  'Lexus': ['NX', 'RX', 'ES', 'UX', 'GX'],
  'Acura': ['ILX', 'RDX', 'MDX', 'TLX'],
  'Infiniti': ['Q50', 'QX50', 'QX60'],
  'Isuzu': ['D-Max', 'MU-X', 'NPR'],
  'Genesis': ['G70', 'G80', 'GV70', 'GV80'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'MINI': ['Cooper', 'Countryman', 'Clubman'],
  'Smart': ['Fortwo', 'Forfour'],
  'Citroën': ['C3', 'C4', 'Berlingo', 'C3 Aircross'],
  'Fiat': ['500', 'Mobi', 'Argo', 'Pulse', 'Strada'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale'],
  'Volvo': ['XC40', 'XC60', 'XC90', 'S60'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'Defender', 'Evoque'],
  'Jaguar': ['F-Pace', 'XE', 'XF', 'E-Pace'],
  'JAC': ['Sei4', 'JS4', 'S3'],
  'GWM (Haval)': ['H6', 'Jolion', 'H9', 'Poer'],
  'Changan': ['CS35 Plus', 'CS55', 'Alsvin'],
  'Omoda/Jaecoo': ['Omoda 5', 'Jaecoo 5', 'Jaecoo 7'],
  'DFSK': ['Glory 580', 'Glory 500', 'K01'],
  'Foton': ['Toano', 'View', 'Tunland'],
  'Scania': ['R-Series', 'P-Series', 'G-Series'],
  'International': ['DuraStar', 'ProStar', 'IC Bus'],
  'Freightliner': ['Cascadia', 'M2', 'Coronado'],
  'MAN': ['TGX', 'TGS', 'Lion\'s Coach'],
  'Iveco': ['Daily', 'Eurocargo', 'Stralis'],
  'Dina': ['Linner', 'Avante', 'Ciela'],
  'Hino': ['300', '500', '700'],
  'Yamaha': ['FZ', 'MT-03', 'R3', 'YBR', 'XTZ 250', 'Bws', 'Crux', 'Ténéré'],
  'Kawasaki': ['Ninja 300', 'Ninja 400', 'Z400', 'Versys', 'KLR 650', 'Vulcan'],
  'Harley-Davidson': ['Sportster', 'Iron 883', 'Street Bob', 'Fat Boy', 'Road King'],
  'Ducati': ['Monster', 'Panigale', 'Scrambler', 'Multistrada'],
  'Triumph': ['Bonneville', 'Street Triple', 'Tiger', 'Speed Twin'],
  'KTM': ['Duke 200', 'Duke 390', 'RC 390', 'Adventure 390'],
  'Royal Enfield': ['Classic 350', 'Meteor 350', 'Himalayan', 'Bullet'],
  'Vespa/Piaggio': ['Primavera', 'Sprint', 'GTS', 'Liberty'],
  'Italika': ['FT 150', 'DT 150', 'AT 110', 'Cuatrimoto CS 125'],
  'Vento': ['Phantom R4', 'Crossmax', 'Nitrox'],
  'Bajaj': ['Pulsar', 'Dominar', 'Discover'],
  'Benelli': ['TNT', 'Leoncino', '502C'],
  'Husqvarna': ['Svartpilen', 'Vitpilen', 'FE 350'],
  'Segway-Ninebot': ['Ninebot Max', 'Ninebot E22', 'Ninebot KickScooter'],
  'InMotion': ['V11', 'V10', 'V8'],
  'KingSong': ['S18', 'S22', '16X'],
  'Zacua': ['MX2', 'MX3'],
  'Kandi': ['K23', 'K27'],
  'Club Car': ['Tempo', 'Onward', 'Precedent'],
  'E-Z-GO': ['RXV', 'TXT', 'Express'],
  'Garia': ['Golf Car', 'Utility'],
};

const fashionBrands = [
  // Ropa / moda rápida
  'Zara', 'H&M', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Mango', 'Massimo Dutti', 'Old Navy', 'Forever 21', 'Shein', 'C&A', 'Suburbia',
  // Denim / casual
  'Levi\'s', 'Wrangler', 'Lee', 'Tommy Hilfiger', 'Calvin Klein', 'Guess', 'Ralph Lauren', 'Carhartt',
  // Deportivo / calzado
  'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Skechers', 'Vans', 'Converse', 'Fila', 'Crocs',
  // Calzado formal / marcas mexicanas
  'Cklass', 'Andrea', 'Flexi',
  // Bolsos y accesorios
  'Michael Kors', 'Coach', 'Kate Spade', 'Louis Vuitton', 'Gucci', 'Prada',
  // Relojes
  'Casio', 'Fossil', 'Citizen', 'Seiko', 'Swatch', 'Invicta', 'Rolex',
  // Joyería
  'Pandora', 'Swarovski', 'Tous',
  'Otra'
];

// Modelos/líneas reales más conocidas por marca, solo para marcas de calzado
// y relojería donde el "modelo" es un producto identificable (ej. Nike Air Force 1,
// Casio G-Shock). Marcas de ropa, bolsos o joyería no tienen catálogo de modelos
// y usan el campo de texto libre.
export const fashionModelsByBrand = {
  'Nike': ['Air Force 1', 'Air Max 90', 'Air Max 97', 'Dunk Low', 'Jordan 1', 'Cortez', 'Blazer'],
  'Adidas': ['Superstar', 'Stan Smith', 'Samba', 'Gazelle', 'Ultraboost', 'Campus'],
  'Puma': ['Suede Classic', 'RS-X', 'Cali'],
  'Under Armour': ['Charged Assert', 'HOVR Phantom', 'Curry'],
  'Reebok': ['Classic Leather', 'Club C 85', 'Nano'],
  'New Balance': ['550', '990', '574', '327'],
  'Skechers': ['D\'Lites', 'Go Walk', 'Max Cushioning'],
  'Vans': ['Old Skool', 'Sk8-Hi', 'Authentic', 'Era'],
  'Converse': ['Chuck Taylor All Star', 'Chuck 70', 'One Star'],
  'Fila': ['Disruptor', 'Ray'],
  'Crocs': ['Classic Clog', 'Bayaband', 'Literide'],
  'Casio': ['G-Shock', 'Casio Vintage', 'Edifice', 'Baby-G', 'Pro Trek'],
  'Fossil': ['Grant', 'Neutra', 'Gen 6 Smartwatch', 'Machine'],
  'Citizen': ['Eco-Drive', 'Promaster'],
  'Seiko': ['Seiko 5', 'Prospex', 'Presage'],
  'Swatch': ['Originals', 'Bioceramic'],
  'Invicta': ['Pro Diver', 'Bolt', 'Specialty'],
  'Rolex': ['Submariner', 'Datejust', 'GMT-Master II', 'Daytona'],
};

const electronicsBrands = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Google Pixel', 'Honor',
  'Vivo', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI',
  // Drones
  'DJI', 'Autel', 'Hubsan', 'Parrot',
  'Otra'
];

const autoFilters = [
  { id: 'marca', label: 'Marca', type: 'select', options: autoBrands },
  { id: 'modelo', label: 'Modelo', type: 'text', placeholder: 'Ej. Versa, Civic, Tacoma' },
  { id: 'year', label: 'Año', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'km', label: 'Kilometraje', type: 'range', minPlaceholder: 'Mín.', maxPlaceholder: 'Máx.' },
  { id: 'carroceria', label: 'Carrocería', type: 'checkbox', options: ['Sedán', 'Hatchback', 'SUV', 'Pickup', 'Van', 'Coupé', 'Convertible'] },
  { id: 'transmision', label: 'Transmisión', type: 'checkbox', options: ['Manual', 'Automática', 'CVT'] },
  { id: 'combustible', label: 'Combustible', type: 'checkbox', options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'Gas'] },
  { id: 'traccion', label: 'Tracción', type: 'checkbox', options: ['FWD', 'RWD', 'AWD', '4x4'] },
  { id: 'color', label: 'Color', type: 'select', options: ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Café', 'Oro', 'Naranja', 'Morado', 'Otro'] },
  { id: 'motor', label: 'Motor (Cilindrada/Litros)', type: 'select', options: ['1.0L - 1.6L', '1.8L - 2.0L', '2.2L - 2.5L', '3.0L - 3.5L', '4.0L - 4.8L', '5.0L+'] },
  { id: 'puertas', label: 'Cantidad de puertas', type: 'checkbox', options: ['2 puertas', '3 puertas', '4 puertas', '5 puertas'] },
  { id: 'vendedor', label: 'Vendedor', type: 'checkbox', options: ['Particular', 'Agencia', 'Verificado'] },
  { id: 'documentacion', label: 'Documentación', type: 'checkbox', options: ['Factura original', 'Tenencias pagadas', 'Verificación vigente', 'Sin adeudos', 'Único dueño', 'Acepta revisión mecánica'] },
  { id: 'seguridad_auto', label: 'Seguridad y equipamiento', type: 'checkbox', options: ['ABS', 'Bolsas de aire', 'Cámara reversa', 'Sensores', 'GPS', 'Bluetooth', 'Quemacocos', 'Piel'] },
  { id: 'financiamiento', label: 'Compra segura', type: 'checkbox', options: ['Acepta financiamiento', 'Acepta crédito', 'Trato en agencia', 'Cita en punto seguro', 'Garantía mecánica'] },
  { id: 'estatus_legal', label: 'Estatus legal', type: 'checkbox', options: ['REPUVE limpio', 'Placas vigentes', 'Sin reporte de robo', 'Importado legalizado', 'Factura de aseguradora'] },
  { id: 'uso', label: 'Uso', type: 'checkbox', options: ['Familiar', 'Trabajo', 'Uber/Didi', 'Carga', 'Taxi', 'Flotilla'] },
];

const propertyFilters = [
  { id: 'tipo', label: 'Tipo de inmueble', type: 'select', options: ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina', 'Bodega'] },
  { id: 'operacion', label: 'Operación', type: 'checkbox', options: ['Venta', 'Renta', 'Traspaso'] },
  { id: 'm2', label: 'Superficie (m²)', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'habitaciones', label: 'Habitaciones', type: 'range', minPlaceholder: 'Mín.', maxPlaceholder: 'Máx.' },
  { id: 'banos', label: 'Baños', type: 'range', minPlaceholder: 'Mín.', maxPlaceholder: 'Máx.' },
  { id: 'estacionamientos', label: 'Estacionamientos', type: 'range', minPlaceholder: 'Mín.', maxPlaceholder: 'Máx.' },
  { id: 'amenidades', label: 'Amenidades', type: 'checkbox', options: ['Seguridad', 'Alberca', 'Gimnasio', 'Elevador', 'Pet friendly', 'Amueblado', 'Jardín'] },
  { id: 'antiguedad', label: 'Antigüedad', type: 'select', options: ['Nueva', '0-5 años', '6-10 años', '11-20 años', '+20 años'] },
  { id: 'credito', label: 'Pago / crédito', type: 'checkbox', options: ['INFONAVIT', 'FOVISSSTE', 'Crédito bancario', 'Recursos propios', 'Acepta mascotas', 'Mantenimiento incluido'] },
  { id: 'seguridad_inmueble', label: 'Seguridad', type: 'checkbox', options: ['Caseta', 'Cámaras', 'Acceso controlado', 'Condominio cerrado', 'Portero', 'Alarma'] },
  { id: 'servicios_incluidos', label: 'Servicios incluidos', type: 'checkbox', options: ['Agua', 'Luz', 'Internet', 'Gas', 'Mantenimiento', 'Limpieza', 'Amueblado'] },
  { id: 'entorno', label: 'Entorno', type: 'checkbox', options: ['Cerca de metro', 'Cerca de escuela', 'Cerca de hospital', 'Zona turística', 'Zona corporativa', 'Fraccionamiento'] },
  { id: 'publicador', label: 'Publicado por', type: 'checkbox', options: ['Dueño directo', 'Inmobiliaria', 'Asesor certificado', 'Desarrollador'] },
  { id: 'documentos_inmueble', label: 'Documentos', type: 'checkbox', options: ['Escrituras', 'Predial al corriente', 'Uso de suelo', 'Contrato listo', 'Sin gravamen'] },
];

const jobFilters = [
  { id: 'salario', label: 'Salario mensual (MXN)', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'tipo_empleo', label: 'Tipo de empleo', type: 'checkbox', options: ['Tiempo completo', 'Medio tiempo', 'Freelance', 'Temporal', 'Prácticas'] },
  { id: 'modalidad', label: 'Modalidad', type: 'checkbox', options: ['Presencial', 'Remoto', 'Híbrido'] },
  { id: 'experiencia', label: 'Experiencia', type: 'select', options: ['Sin experiencia', '1-2 años', '3-5 años', '+5 años'] },
  { id: 'turno', label: 'Turno', type: 'checkbox', options: ['Matutino', 'Vespertino', 'Nocturno', 'Mixto'] },
  { id: 'contrato', label: 'Contrato', type: 'checkbox', options: ['Indefinido', 'Por proyecto', 'Temporal', 'Comisiones'] },
  { id: 'beneficios', label: 'Beneficios', type: 'checkbox', options: ['Seguro', 'Prestaciones', 'Bonos', 'Vales', 'Capacitación'] },
  { id: 'educacion', label: 'Escolaridad', type: 'select', options: ['Primaria', 'Secundaria', 'Preparatoria', 'Técnico', 'Licenciatura', 'Maestría'] },
  { id: 'idiomas', label: 'Idiomas', type: 'checkbox', options: ['Inglés', 'Francés', 'Portugués', 'Alemán', 'Maya / lengua indígena'] },
  { id: 'area', label: 'Área', type: 'checkbox', options: ['Ventas', 'Administración', 'Tecnología', 'Operaciones', 'Hotelería', 'Salud', 'Educación', 'Construcción'] },
  { id: 'pago', label: 'Pago', type: 'checkbox', options: ['Semanal', 'Quincenal', 'Mensual', 'Por comisión', 'Propinas', 'Bonos por meta'] },
  { id: 'requisitos', label: 'Requisitos', type: 'checkbox', options: ['Licencia vigente', 'Auto propio', 'Disponibilidad inmediata', 'Sin experiencia', 'Inglés', 'Referencias'] },
];

const electronicsFilters = [
  { id: 'marca', label: 'Marca', type: 'select', options: electronicsBrands },
  { id: 'modelo', label: 'Modelo', type: 'text', placeholder: 'Ej. iPhone 14, ThinkPad, Galaxy S' },
  { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Usado', 'Reacondicionado'] },
  { id: 'almacenamiento', label: 'Almacenamiento', type: 'checkbox', options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
  { id: 'garantia', label: 'Garantía', type: 'checkbox', options: ['Con garantía', 'Factura', 'Caja original', 'Liberado'] },
  { id: 'ram', label: 'RAM', type: 'checkbox', options: ['4 GB', '6 GB', '8 GB', '12 GB', '16 GB', '32 GB+'] },
  { id: 'pantalla', label: 'Pantalla', type: 'checkbox', options: ['Hasta 6"', '6" - 7"', '13"', '14"', '15"', '16"+', '4K', 'OLED'] },
  { id: 'estado_bateria', label: 'Batería / estado', type: 'checkbox', options: ['80%+', '90%+', 'Sin detalles', 'Reacondicionado certificado', 'Incluye cargador'] },
  { id: 'sistema', label: 'Sistema', type: 'checkbox', options: ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'ChromeOS'] },
  { id: 'estado_fisico', label: 'Estado físico', type: 'checkbox', options: ['Sin golpes', 'Pantalla intacta', 'Detalles estéticos', 'Reparado', 'Sellado'] },
  { id: 'incluye', label: 'Incluye', type: 'checkbox', options: ['Caja', 'Cargador', 'Factura', 'Accesorios', 'Funda', 'Mica'] },
];

const serviceFilters = [
  { id: 'tipo', label: 'Tipo de servicio', type: 'select', options: ['Hogar', 'Profesionales', 'Tecnología', 'Transporte', 'Clases', 'Eventos', 'Belleza', 'Construcción', 'Mantenimiento', 'Mascotas', 'Salud'] },
  { id: 'modalidad', label: 'Modalidad', type: 'checkbox', options: ['A domicilio', 'En local', 'En línea', 'Urgente'] },
  { id: 'disponibilidad', label: 'Disponibilidad', type: 'checkbox', options: ['Hoy', 'Esta semana', '24/7', 'Fines de semana', 'Horario nocturno'] },
  { id: 'confianza', label: 'Confianza', type: 'checkbox', options: ['Verificado', 'Con reseñas', 'Factura', 'Garantía', 'Contrato', 'Seguro de responsabilidad'] },
  { id: 'precio_servicio', label: 'Precio desde (MXN)', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'experiencia_servicio', label: 'Experiencia', type: 'select', options: ['Nuevo proveedor', '1-3 años', '4-7 años', '+8 años'] },
  { id: 'cobertura', label: 'Cobertura', type: 'checkbox', options: ['Mi colonia', 'Toda la ciudad', 'Todo el estado', 'Todo México', 'Emergencias'] },
  { id: 'tipo_cobro', label: 'Cobro', type: 'checkbox', options: ['Por hora', 'Por visita', 'Por proyecto', 'Precio fijo', 'Cotización gratis'] },
  { id: 'facturacion', label: 'Formalidad', type: 'checkbox', options: ['Factura', 'Contrato', 'Garantía por escrito', 'Seguro', 'Equipo propio'] },
];

const homeBrands = [
  // Muebles
  'IKEA',
  // Electrodomésticos
  'Whirlpool', 'Mabe', 'LG', 'Samsung', 'GE', 'Frigidaire', 'Winia', 'Hisense', 'Midea', 'Daewoo', 'Acros', 'Koblenz', 'Oster', 'Black+Decker', 'Hamilton Beach', 'Philips', 'Panasonic', 'Rowenta',
  // Cocina / menaje
  'Vasconia', 'Tramontina', 'Cinsa', 'T-fal',
  // Herramientas
  'Truper', 'Pretul', 'Urrea', 'Bosch', 'DeWalt', 'Makita', 'Milwaukee', 'Stanley', 'Total',
  // Jardín
  'Husqvarna', 'Stihl', 'Toro', 'Craftsman',
  // Iluminación
  'Sylvania',
  // Seguridad
  'Steren', 'Hikvision', 'TP-Link', 'Yale', 'Kwikset', 'Ring', 'Dahua',
  'Otra'
];

const homeFilters = [
  { id: 'tipo', label: 'Categoría', type: 'select', options: ['Muebles', 'Electrodomésticos', 'Decoración', 'Herramientas', 'Jardín', 'Iluminación', 'Cocina', 'Seguridad'] },
  { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Usado', 'Como nuevo', 'Restaurado'] },
  { id: 'marca_hogar', label: 'Marca', type: 'select', options: homeBrands },
  { id: 'material', label: 'Material', type: 'checkbox', options: ['Madera', 'Metal', 'Vidrio', 'Tela', 'Piel', 'Plástico', 'MDF'] },
  { id: 'entrega', label: 'Entrega', type: 'checkbox', options: ['Entrega a domicilio', 'Recoger en domicilio', 'Envío disponible', 'Instalación incluida'] },
  { id: 'medidas', label: 'Medidas', type: 'text', placeholder: 'Ej. 180x90 cm' },
  { id: 'ambiente', label: 'Ambiente', type: 'checkbox', options: ['Sala', 'Comedor', 'Recámara', 'Cocina', 'Baño', 'Terraza', 'Oficina'] },
];

const fashionFilters = [
  { id: 'tipo', label: 'Tipo de prenda', type: 'select', options: ['Ropa mujer', 'Ropa hombre', 'Calzado', 'Bolsos', 'Accesorios', 'Joyería', 'Relojes'] },
  { id: 'talla', label: 'Talla', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '24', '26', '28', '30', '32', '34'] },
  { id: 'marca_moda', label: 'Marca', type: 'select', options: fashionBrands },
  { id: 'modelo_moda', label: 'Modelo / línea', type: 'text', placeholder: 'Ej. Air Force 1, G-Shock, Superstar' },
  { id: 'genero', label: 'Género', type: 'checkbox', options: ['Mujer', 'Hombre', 'Unisex', 'Niñas', 'Niños'] },
  { id: 'estado_moda', label: 'Estado', type: 'checkbox', options: ['Nuevo con etiqueta', 'Nuevo sin etiqueta', 'Usado excelente', 'Vintage', 'Original verificado'] },
  { id: 'color_moda', label: 'Color', type: 'select', options: ['Negro', 'Blanco', 'Beige', 'Azul', 'Rojo', 'Verde', 'Rosa', 'Multicolor'] },
];

const petFilters = [
  { id: 'especie', label: 'Especie', type: 'checkbox', options: ['Perro', 'Gato', 'Ave', 'Pez', 'Reptil', 'Roedor'] },
  { id: 'tamano', label: 'Tamaño', type: 'select', options: ['Pequeño', 'Mediano', 'Grande'] },
  { id: 'servicio_mascota', label: 'Tipo', type: 'checkbox', options: ['Adopción', 'Accesorios', 'Alimento', 'Veterinario', 'Estética', 'Entrenamiento'] },
  { id: 'vacunas', label: 'Salud', type: 'checkbox', options: ['Vacunado', 'Esterilizado', 'Cartilla', 'Desparasitado'] },
];

const ticketFilters = [
  { id: 'tipo', label: 'Tipo de evento', type: 'select', options: ['Conciertos', 'Deportes', 'Teatro/Cultura', 'Festivales', 'Cine', 'Conferencias'] },
  { id: 'fecha_evento', label: 'Fecha', type: 'checkbox', options: ['Hoy', 'Esta semana', 'Este mes', 'Próximo mes'] },
  { id: 'formato', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico', 'Transferible'] },
  { id: 'zona', label: 'Zona', type: 'text', placeholder: 'Ej. General, VIP, Preferente' },
];

const sportsBrands = [
  // Fútbol
  'Nike', 'Adidas', 'Puma', 'Under Armour', 'Umbro', 'Charly', 'Kappa',
  // Ciclismo — bicicletas y componentes/accesorios
  'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott', 'Merida', 'Bianchi', 'GT', 'Raleigh', 'Schwinn', 'Mercurio', 'Benotto', 'Turbo',
  'Shimano', 'Giro',
  // Gimnasio
  'TRX', 'Everlast', 'Reebok',
  // Running
  'Asics', 'Brooks', 'Saucony', 'New Balance', 'Hoka',
  // Camping
  'Coleman', 'The North Face', 'Columbia', 'Eureka', 'Ozark Trail',
  // Pesca
  'Daiwa', 'Rapala', 'Pflueger',
  // Surf
  'Quiksilver', 'Billabong', 'Rip Curl', 'O\'Neill',
  // Náutica — botes inflables, kayaks y motores fuera de borda (embarcaciones
  // completas/yates van en Vehículos)
  'Zodiac', 'Bestway', 'Sevylor', 'Mercury', 'Evinrude', 'Suzuki Marine',
  // Electrónica deportiva
  'Garmin', 'Fitbit',
  'Otra'
];

const kidsBrands = [
  // Juguetes
  'Lego', 'Fisher-Price', 'Mattel', 'Hasbro', 'Hot Wheels', 'Barbie', 'Nerf', 'VTech', 'Playskool',
  // Ropa infantil
  'Carter\'s', 'OshKosh B\'gosh', 'Gerber',
  // Escolar
  'Norma', 'Scribe', 'BIC', 'Pelikan',
  // Seguridad / carriolas / autoasientos
  'Chicco', 'Graco', 'Britax', 'Evenflo', 'Peg Pérego', 'Bugaboo', 'Cybex', 'Safety 1st',
  'Otra'
];

const ocioBrands = [
  // Videojuegos
  'Sony', 'Microsoft', 'Nintendo', 'Sega',
  // Fotografía
  'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'Polaroid', 'Panasonic',
  // Instrumentos musicales
  'Yamaha', 'Fender', 'Gibson', 'Casio', 'Roland', 'Ibanez', 'Pearl',
  // Coleccionismo
  'Funko', 'Lego',
  // Camping
  'Coleman', 'The North Face',
  'Otra'
];

const sportsFilters = [
  { id: 'tipo_deporte', label: 'Deporte / actividad', type: 'select', options: ['Fútbol', 'Ciclismo', 'Gimnasio', 'Running', 'Camping', 'Pesca', 'Surf', 'Náutica', 'Otro'] },
  { id: 'marca', label: 'Marca', type: 'select', options: sportsBrands },
  { id: 'talla', label: 'Talla / medida', type: 'text', placeholder: 'Ej. M, 27.5, 10 ft' },
  { id: 'condicion', label: 'Condición', type: 'select', options: ['Nuevo', 'Como nuevo', 'Usado', 'Restaurado'] },
  { id: 'disciplina', label: 'Disciplina', type: 'checkbox', options: ['Recreativo', 'Entrenamiento', 'Competencia', 'Profesional'] },
];

const kidsFilters = [
  { id: 'tipo', label: 'Tipo', type: 'select', options: ['Juguetes', 'Ropa infantil', 'Escolar', 'Muebles', 'Seguridad', 'Carriolas', 'Autoasientos'] },
  { id: 'edad', label: 'Edad recomendada', type: 'select', options: ['0-6 meses', '6-12 meses', '1-2 años', '3-5 años', '6-9 años', '10+ años'] },
  { id: 'condicion', label: 'Condición', type: 'select', options: ['Nuevo', 'Como nuevo', 'Usado'] },
  { id: 'marca', label: 'Marca', type: 'select', options: kidsBrands },
  { id: 'seguridad', label: 'Seguridad', type: 'checkbox', options: ['Certificado', 'Sin piezas pequeñas', 'Funda lavable', 'Manual incluido'] },
];

const businessFilters = [
  { id: 'tipo_negocio', label: 'Tipo de oportunidad', type: 'select', options: ['Traspaso', 'Franquicia', 'Maquinaria', 'Equipamiento', 'Insumos', 'Sociedad', 'Inversión'] },
  { id: 'sector', label: 'Sector', type: 'select', options: ['Alimentos', 'Retail', 'Servicios', 'Industria', 'Turismo', 'Tecnología', 'Construcción'] },
  { id: 'ingresos', label: 'Ingresos mensuales', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'antiguedad', label: 'Antigüedad del negocio', type: 'select', options: ['Nuevo', 'Menos de 1 año', '1-3 años', '4-10 años', '10+ años'] },
  { id: 'incluye_negocio', label: 'Incluye', type: 'checkbox', options: ['Inventario', 'Local', 'Equipo', 'Marca', 'Permisos', 'Personal capacitado'] },
];

const educationFilters = [
  { id: 'tipo_formacion', label: 'Tipo', type: 'select', options: ['Libro', 'Curso', 'Clases', 'Idiomas', 'Universidad', 'Certificación', 'Material escolar'] },
  { id: 'modalidad', label: 'Modalidad', type: 'select', options: ['Presencial', 'En línea', 'Híbrido', 'Material físico'] },
  { id: 'nivel', label: 'Nivel', type: 'select', options: ['Principiante', 'Intermedio', 'Avanzado', 'Profesional'] },
  { id: 'idioma', label: 'Idioma', type: 'select', options: ['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués', 'Otro'] },
  { id: 'certificado', label: 'Certificación', type: 'checkbox', options: ['Constancia', 'Certificado oficial', 'Validez SEP', 'Sin certificado'] },
];

const hospedajeFilters = [
  { id: 'tipo_alojamiento', label: 'Tipo de alojamiento', type: 'select', options: ['Hotel', 'Casa de huéspedes', 'Hostal', 'Villas y Cabañas', 'Departamento', 'Glamping/Camping'] },
  { id: 'duracion_renta', label: 'Esquema de renta', type: 'checkbox', options: ['Por noche', 'Por semana', 'Por mes', 'Fin de semana'] },
  { id: 'habitaciones', label: 'Habitaciones/Dormitorios', type: 'select', options: ['1 habitación', '2 habitaciones', '3 habitaciones', '4+ habitaciones'] },
  { id: 'amenidades_hospedaje', label: 'Servicios y Amenidades', type: 'checkbox', options: ['Alberca / Piscina', 'Wi-Fi gratis', 'Aire acondicionado', 'Estacionamiento', 'Pet friendly', 'Desayuno incluido', 'Todo incluido', 'Cocina equipada'] },
  { id: 'cercania_playa', label: 'Cercanía a la playa', type: 'checkbox', options: ['Primera línea de playa', 'A menos de 500m', 'A menos de 1km', 'Zona céntrica', 'Zona ecoturística'] },
  { id: 'estrellas', label: 'Categoría (Estrellas)', type: 'checkbox', options: ['1 estrella', '2 estrellas', '3 estrellas', '4 estrellas', '5 estrellas', 'Boutique / Sin estrellas'] },
];

const toursFilters = [
  { id: 'tipo_tour', label: 'Tipo de viaje', type: 'select', options: ['Excursión de 1 día', 'Aventura y Naturaleza', 'Tour Cultural/Histórico', 'Excursión de Playa/Acuático', 'Ecoturismo / Senderismo'] },
  { id: 'duracion_viaje', label: 'Duración', type: 'checkbox', options: ['Unas horas', '1 día completo', '2-3 días', '1 semana', 'Más de 1 semana'] },
  { id: 'dificultad', label: 'Dificultad física', type: 'checkbox', options: ['Fácil (Apto para todos)', 'Moderada', 'Difícil / Extrema'] },
  { id: 'incluye_tour', label: 'Servicios incluidos', type: 'checkbox', options: ['Transporte incluido', 'Guía bilingüe', 'Comida incluida', 'Entradas y equipo'] },
  { id: 'tamano_grupo', label: 'Tamaño del grupo', type: 'checkbox', options: ['Privado (Individual)', 'Grupo pequeño (<10)', 'Grupo grande (>10)'] },
];

const rentaAutosFilters = [
  { id: 'tipo_auto', label: 'Tipo de vehículo', type: 'select', options: ['Sedán', 'Hatchback', 'SUV (Camioneta)', 'Pickup', 'Van / Minivan', 'Convertible', 'Deportivo'] },
  { id: 'transmision', label: 'Transmisión', type: 'checkbox', options: ['Automática', 'Manual'] },
  { id: 'combustible', label: 'Combustible', type: 'checkbox', options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'] },
  { id: 'capacidad_pasajeros', label: 'Pasajeros', type: 'checkbox', options: ['2 personas', '4 personas', '5 personas', '7 personas', '8+ personas'] },
  { id: 'servicios_incluidos', label: 'Incluido en la renta', type: 'checkbox', options: ['Seguro de cobertura amplia', 'Kilometraje ilimitado', 'Segundo conductor gratis', 'Entrega en aeropuerto', 'Silla de bebé'] },
  { id: 'requisitos', label: 'Requisitos', type: 'checkbox', options: ['Edad mínima 21 años', 'Edad mínima 25 años', 'Tarjeta de crédito', 'Depósito en garantía'] }
];

const rentaMotosFilters = [
  { id: 'tipo_moto', label: 'Tipo de moto', type: 'select', options: ['Scooter', 'Motoneta urbana', 'Motos de trabajo', 'Chopper / Cruiser', 'Deportiva', 'Enduro / Cross / Off-road'] },
  { id: 'cilindrada', label: 'Cilindrada', type: 'select', options: ['Menos de 125cc', '125cc - 250cc', '250cc - 600cc', 'Más de 600cc'] },
  { id: 'transmision', label: 'Transmisión', type: 'checkbox', options: ['Automática', 'Semiautomática', 'Manual'] },
  { id: 'equipo_incluido', label: 'Equipo incluido', type: 'checkbox', options: ['Casco extra', 'Soporte para celular', 'Candado / Cadena de seguridad', 'Seguro básico'] },
  { id: 'licencia_requerida', label: 'Requisitos de licencia', type: 'checkbox', options: ['Licencia de moto obligatoria', 'No requiere licencia'] }
];

const rentaBicisFilters = [
  { id: 'tipo_bici', label: 'Tipo de bicicleta', type: 'select', options: ['De ruta (Carreras)', 'De montaña (MTB)', 'Urbana / Paseo', 'Eléctrica (E-bike)', 'Infantil'] },
  { id: 'accesorios_incluidos', label: 'Accesorios incluidos', type: 'checkbox', options: ['Casco', 'Luces delantera/trasera', 'Candado de seguridad', 'Portabultos / Canastilla', 'Kit de herramientas'] },
  { id: 'talla_cuadro', label: 'Talla del cuadro', type: 'checkbox', options: ['Talla S', 'Talla M', 'Talla L', 'Talla XL'] }
];

const rentaYatesFilters = [
  { id: 'tipo_embarcacion', label: 'Tipo de embarcación', type: 'select', options: ['Yate de lujo', 'Lancha rápida', 'Catamarán', 'Velero', 'Pontón'] },
  { id: 'eslora', label: 'Eslora (Largo del barco)', type: 'select', options: ['Menos de 30 pies', '30 - 45 pies', '45 - 60 pies', 'Más de 60 pies (Megayate)'] },
  { id: 'capacidad_personas', label: 'Capacidad de personas', type: 'checkbox', options: ['Hasta 6 personas', '6 - 12 personas', '12 - 20 personas', 'Más de 20 personas'] },
  { id: 'tripulacion', label: 'Tripulación', type: 'checkbox', options: ['Incluye Capitán y marinero', 'Renta sin tripulación (Bareboat)', 'Servicio de chef a bordo'] },
  { id: 'servicios_bordo', label: 'Uso y comodidades', type: 'checkbox', options: ['Aire acondicionado', 'Cocina / Parrilla', 'Equipo de sonido Bluetooth', 'Aguas y refrescos incluidos', 'Equipo de snorkel'] }
];

const rentaAcuaticoFilters = [
  { id: 'potencia_jetski', label: 'Potencia / Tipo', type: 'select', options: ['Recreativo estándar', 'Alto rendimiento (High Performance)', 'Modo familiar'] },
  { id: 'pasajeros_jetski', label: 'Capacidad', type: 'checkbox', options: ['1 persona', '2 personas', '3 personas'] },
  { id: 'duracion_minima', label: 'Duración mínima', type: 'checkbox', options: ['30 minutos', '1 hora', 'Medio día', 'Día completo'] },
  { id: 'seguridad_jetski', label: 'Seguridad', type: 'checkbox', options: ['Chalecos salvavidas incluidos', 'Instructor / Guía incluido', 'Seguro de accidentes'] }
];

const rentaEquipamientoFilters = [
  { id: 'tipo_equipo', label: 'Tipo de equipo', type: 'select', options: ['Tabla de Surf', 'Tabla de Paddle / SUP', 'Kayak individual', 'Kayak doble', 'Equipo de Windsurf', 'Equipo de Snorkel'] },
  { id: 'accesorios_surf', label: 'Accesorios incluidos', type: 'checkbox', options: ['Remos', 'Chaleco salvavidas', 'Leash / Correa de seguridad', 'Neopreno / Traje de agua'] }
];

const rentaQuadsFilters = [
  { id: 'tipo_quad', label: 'Tipo de vehículo off-road', type: 'select', options: ['ATV / Cuatrimoto', 'UTV / Buggy (Side-by-Side)', 'Dirt Bike / Moto de cross'] },
  { id: 'capacidad_quad', label: 'Pasajeros', type: 'checkbox', options: ['1 persona', '2 personas', '4 personas'] },
  { id: 'cilindrada_quad', label: 'Cilindrada', type: 'select', options: ['150cc - 300cc', '300cc - 570cc', '800cc - 1000cc'] },
  { id: 'proteccion_quad', label: 'Equipo de protección', type: 'checkbox', options: ['Casco incluido', 'Goggles / Lentes de protección', 'Guantes y coderas'] }
];

const rentaCampersFilters = [
  { id: 'tipo_casa_rodante', label: 'Tipo de casa rodante', type: 'select', options: ['Autocaravana Clase A/B/C', 'Camper Van (Furgoneta)', 'Remolque / Caravana / Trailer'] },
  { id: 'capacidad_dormir', label: 'Спальных мест / Plazas', type: 'checkbox', options: ['2 personas', '3 - 4 personas', '5 - 6 personas', '6+ personas'] },
  { id: 'equipamiento_camper', label: 'Equipamiento', type: 'checkbox', options: ['Cocina con estufa', 'Refrigerador', 'Baño con ducha', 'Aire acondicionado', 'Paneles solares', 'Toldo exterior'] }
];

const rentalVehiclesFilters = [
  { id: 'tipo_vehiculo', label: 'Tipo de transporte', type: 'select', options: ['Auto / Camioneta', 'Yate / Lancha', 'Кемперы / RVs', 'Motos y Quads', 'Bicicletas / Patines'] },
  { id: 'esquema_renta', label: 'Esquema de renta', type: 'checkbox', options: ['Por hora', 'Por día / Por jornada', 'Semanal', 'Mensual'] },
  { id: 'capacidad_pasajeros', label: 'Capacidad de pasajeros', type: 'select', options: ['1-2 personas', '3-5 personas', '6-10 personas', 'Más de 10 personas'] },
  { id: 'tripulacion', label: 'Tripulación / Chofer', type: 'checkbox', options: ['Sin chofer / Bareboat', 'Con chofer / Capitán', 'Servicio todo incluido'] },
  { id: 'combustible_renta', label: 'Combustible / Transmisión', type: 'checkbox', options: ['Automático', 'Manual', 'Gasolina', 'Eléctrico / Híbrido', 'Diésel'] },
];

const travelGearFilters = [
  { id: 'categoria_articulo', label: 'Categoría de artículo', type: 'select', options: ['Casas de campaña y Sacos', 'Mochilas y Maletas', 'Ropa de senderismo', 'Utensilios de cocina y Estufas', 'Linternas y GPS', 'Artículos de playa / Picnic'] },
  { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Como nuevo', 'Usado', 'Restaurado'] },
  { id: 'publico', label: 'Público objetivo', type: 'checkbox', options: ['Hombre', 'Mujer', 'Unisex', 'Niños'] },
];

const souvenirsFilters = [
  { id: 'tipo_souvenir', label: 'Tipo de recuerdo', type: 'select', options: ['Artesanías locales', 'Ropa y Textiles típicos', 'Tequila / Mezcal / Alimentos', 'Joyería y Accesorios', 'Imanes y Recuerdos pequeños'] },
  { id: 'material_souvenir', label: 'Material principal', type: 'checkbox', options: ['Cerámica / Barro', 'Madera tallada', 'Plata / Oro', 'Lana / Algodón', 'Vidrio soplado'] },
];

const guiasFilters = [
  { id: 'tipo_servicio', label: 'Servicio brindado', type: 'select', options: ['Guía turístico / Certificado', 'Traductor / Intérprete', 'Fotógrafo de viajes', 'Chofer privado / Transfer'] },
  { id: 'idiomas_servicio', label: 'Idiomas dominados', type: 'checkbox', options: ['Español', 'Inglés', 'Ruso', 'Francés', 'Alemán', 'Portugués', 'Italiano'] },
  { id: 'transporte_guias', label: 'Movilidad', type: 'checkbox', options: ['Cuenta con transporte propio', 'El cliente provee transporte', 'Tours a pie'] },
];

const atraccionesFilters = [
  { id: 'tipo_actividad', label: 'Tipo de actividad', type: 'select', options: ['Parques temáticos / Acuáticos', 'Buceo / Surf / Snorkel', 'Tours de aventura (tirolesa, etc)', 'Catas / Clases de cocina', 'Zoológicos / Acuarios'] },
  { id: 'ideal_para', label: 'Ideal para', type: 'checkbox', options: ['Familias con niños', 'Parejas', 'Grupos / Despedidas', 'Viajeros solitarios', 'Aventureros / Extremo'] },
];

const retirosFilters = [
  { id: 'enfoque_retiro', label: 'Enfoque del retiro', type: 'select', options: ['Yoga y Meditación', 'Detox y Masajes (Spa)', 'Espiritual / Temazcal', 'Fitness y Deporte', 'Retiros de salud holística'] },
  { id: 'formato_retiro', label: 'Alojamiento', type: 'checkbox', options: ['Hospedaje completo incluido', 'Solo Day Pass (Pase de un día)', 'Alimentos saludables incluidos'] },
];

export const filterConfig = {
  coches: autoFilters,
  motor: autoFilters,
  'coches-y-motor': autoFilters,
  'coches-y-motor/coches': autoFilters,
  'coches-y-motor/motos': autoFilters,
  'coches-y-motor/refacciones': autoFilters,
  'motor/autos': autoFilters,
  'motor/motos': autoFilters,
  'motor/camionetas': autoFilters,
  'motor/camiones': autoFilters,
  'motor/refacciones': autoFilters,
  'motor/autopartes': autoFilters,

  inmobiliaria: propertyFilters,
  inmuebles: propertyFilters,
  'inmuebles/casas-en-venta': propertyFilters,
  'inmuebles/casas-en-renta': propertyFilters,
  'inmuebles/departamentos': propertyFilters,
  'inmuebles/terrenos': propertyFilters,
  'inmuebles/locales-comerciales': propertyFilters,
  'inmuebles/oficinas': propertyFilters,
  'inmuebles/bodegas': propertyFilters,
  'inmuebles/renta-vacacional': propertyFilters,

  empleo: jobFilters,
  empleos: jobFilters,
  'empleos/ventas': jobFilters,
  'empleos/chofer': jobFilters,
  'empleos/construccion': jobFilters,
  'empleos/administracion': jobFilters,
  'empleos/atencion-al-cliente': jobFilters,
  'empleos/tecnologia': jobFilters,
  'empleos/hoteleria': jobFilters,
  'empleos/medio-tiempo': jobFilters,

  electronica: electronicsFilters,
  electrónica: electronicsFilters,
  informatica: electronicsFilters,
  telefonia: electronicsFilters,
  telefonos: electronicsFilters,
  'moviles-y-telefonia': electronicsFilters,
  'electronica/laptops': electronicsFilters,
  'electronica/tablets': electronicsFilters,
  'electronica/tv-y-video': electronicsFilters,
  'electronica/audio': electronicsFilters,
  'electronica/camaras': electronicsFilters,
  'electronica/drones': electronicsFilters,
  'electronica/accesorios': electronicsFilters,
  'moviles-y-telefonia/iphone': electronicsFilters,
  'moviles-y-telefonia/android': electronicsFilters,
  'moviles-y-telefonia/smartwatch': electronicsFilters,
  'moviles-y-telefonia/accesorios': electronicsFilters,
  'moviles-y-telefonia/tablets': electronicsFilters,
  'moviles-y-telefonia/repuestos': electronicsFilters,

  servicios: serviceFilters,
  'servicios/hogar': serviceFilters,
  'servicios/reparaciones': serviceFilters,
  'servicios/limpieza': serviceFilters,
  'servicios/clases': serviceFilters,
  'servicios/eventos': serviceFilters,
  'servicios/transporte': serviceFilters,
  'servicios/mascotas': serviceFilters,

  hogar: homeFilters,
  'hogar/muebles': homeFilters,
  'hogar/electrodomesticos': homeFilters,
  'hogar/herramientas': homeFilters,

  moda: fashionFilters,
  'moda/ropa': fashionFilters,
  'moda/calzado': fashionFilters,
  'moda/accesorios': fashionFilters,

  bebes: [
    { id: 'tipo', label: 'Tipo', type: 'select', options: ['Carriolas', 'Autoasientos', 'Cunas', 'Ropa bebé', 'Juguetes bebé'] },
    { id: 'edad', label: 'Edad recomendada', type: 'select', options: ['0-6 meses', '6-12 meses', '1-2 años', '2-3 años', '+3 años'] },
  ],

  mascotas: petFilters,
  'mascotas/perros': petFilters,
  'mascotas/gatos': petFilters,
  'mascotas/accesorios': petFilters,

  deportes: sportsFilters,
  'deportes/bicicletas': sportsFilters,
  'deportes/gimnasio': sportsFilters,
  'deportes/camping': sportsFilters,
  'deportes/nautica': sportsFilters,

  infantil: kidsFilters,
  'infantil/juguetes': kidsFilters,
  'infantil/ropa': kidsFilters,
  'infantil/escolar': kidsFilters,
  'infantil/seguridad': kidsFilters,

  negocios: businessFilters,
  'negocios/traspasos': businessFilters,
  'negocios/franquicias': businessFilters,
  'negocios/maquinaria': businessFilters,
  'negocios/equipamiento': businessFilters,

  formacion: educationFilters,
  'formacion/libros': educationFilters,
  'formacion/cursos': educationFilters,
  'formacion/idiomas': educationFilters,
  'formacion/certificaciones': educationFilters,

  ocio: [
    { id: 'tipo', label: 'Categoría', type: 'select', options: ['Deportes', 'Videojuegos', 'Libros/Música', 'Coleccionismo', 'Fotografía', 'Instrumentos', 'Camping', 'Viajes'] },
    { id: 'marca_ocio', label: 'Marca', type: 'select', options: ocioBrands },
    { id: 'formato', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico'] },
  ],

  boletos: ticketFilters,
  'boletos/conciertos': ticketFilters,
  'boletos/deportes': ticketFilters,
  'boletos/teatro': ticketFilters,

  turismo: hospedajeFilters,
  hospedaje: hospedajeFilters,
  'turismo/hospedaje': hospedajeFilters,
  tours: toursFilters,
  'turismo/tours': toursFilters,
  boletos_turismo: ticketFilters,
  'turismo/boletos_turismo': ticketFilters,
  articulos_camping: travelGearFilters,
  'turismo/articulos_camping': travelGearFilters,
  souvenirs: souvenirsFilters,
  'turismo/souvenirs': souvenirsFilters,
  renta_vehiculos: rentalVehiclesFilters,
  'turismo/renta_vehiculos': rentalVehiclesFilters,
  'renta_vehiculos/renta_autos': rentaAutosFilters,
  'renta_vehiculos/renta_motos': rentaMotosFilters,
  'renta_vehiculos/renta_bicis': rentaBicisFilters,
  'renta_vehiculos/renta_yates': rentaYatesFilters,
  'renta_vehiculos/renta_acuatico': rentaAcuaticoFilters,
  'renta_vehiculos/renta_equipamiento': rentaEquipamientoFilters,
  'renta_vehiculos/renta_quads': rentaQuadsFilters,
  'renta_vehiculos/renta_campers': rentaCampersFilters,
  guias_servicios: guiasFilters,
  'turismo/guias_servicios': guiasFilters,
  atracciones_exp: atraccionesFilters,
  'turismo/atracciones_exp': atraccionesFilters,
  retiros_bienestar: retirosFilters,
  'turismo/retiros_bienestar': retirosFilters,
};
