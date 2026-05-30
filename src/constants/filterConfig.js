const autoBrands = [
  'Chevrolet', 'Nissan', 'Volkswagen', 'Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz',
  'Audi', 'Kia', 'Hyundai', 'Mazda', 'Jeep', 'Tesla', 'MG', 'BYD', 'Otra'
];

const electronicsBrands = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Google Pixel', 'Honor',
  'Vivo', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Otra'
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
  { id: 'vendedor', label: 'Vendedor', type: 'checkbox', options: ['Particular', 'Agencia', 'Verificado'] },
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
];

const jobFilters = [
  { id: 'salario', label: 'Salario mensual (MXN)', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  { id: 'tipo_empleo', label: 'Tipo de empleo', type: 'checkbox', options: ['Tiempo completo', 'Medio tiempo', 'Freelance', 'Temporal', 'Prácticas'] },
  { id: 'modalidad', label: 'Modalidad', type: 'checkbox', options: ['Presencial', 'Remoto', 'Híbrido'] },
  { id: 'experiencia', label: 'Experiencia', type: 'select', options: ['Sin experiencia', '1-2 años', '3-5 años', '+5 años'] },
  { id: 'turno', label: 'Turno', type: 'checkbox', options: ['Matutino', 'Vespertino', 'Nocturno', 'Mixto'] },
  { id: 'contrato', label: 'Contrato', type: 'checkbox', options: ['Indefinido', 'Por proyecto', 'Temporal', 'Comisiones'] },
  { id: 'beneficios', label: 'Beneficios', type: 'checkbox', options: ['Seguro', 'Prestaciones', 'Bonos', 'Vales', 'Capacitación'] },
];

const electronicsFilters = [
  { id: 'marca', label: 'Marca', type: 'select', options: electronicsBrands },
  { id: 'modelo', label: 'Modelo', type: 'text', placeholder: 'Ej. iPhone 14, ThinkPad, Galaxy S' },
  { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Usado', 'Reacondicionado'] },
  { id: 'almacenamiento', label: 'Almacenamiento', type: 'checkbox', options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
  { id: 'garantia', label: 'Garantía', type: 'checkbox', options: ['Con garantía', 'Factura', 'Caja original', 'Liberado'] },
  { id: 'ram', label: 'RAM', type: 'checkbox', options: ['4 GB', '6 GB', '8 GB', '12 GB', '16 GB', '32 GB+'] },
];

export const filterConfig = {
  coches: autoFilters,
  motor: autoFilters,
  'coches-y-motor': autoFilters,
  'coches-y-motor/coches': autoFilters,
  'coches-y-motor/motos': autoFilters,
  'coches-y-motor/refacciones': autoFilters,

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

  servicios: [
    { id: 'tipo', label: 'Tipo de servicio', type: 'select', options: ['Hogar', 'Profesionales', 'Tecnología', 'Transporte', 'Clases', 'Eventos', 'Belleza', 'Construcción', 'Mantenimiento'] },
    { id: 'modalidad', label: 'Modalidad', type: 'checkbox', options: ['A domicilio', 'En local', 'En línea'] },
    { id: 'disponibilidad', label: 'Disponibilidad', type: 'checkbox', options: ['Hoy', 'Esta semana', '24/7', 'Fines de semana'] },
    { id: 'confianza', label: 'Confianza', type: 'checkbox', options: ['Verificado', 'Con reseñas', 'Factura', 'Garantía'] },
    { id: 'precio_servicio', label: 'Precio desde (MXN)', type: 'range', minPlaceholder: 'Desde', maxPlaceholder: 'Hasta' },
  ],

  hogar: [
    { id: 'tipo', label: 'Categoría', type: 'select', options: ['Muebles', 'Electrodomésticos', 'Decoración', 'Herramientas', 'Seguridad'] },
    { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Usado'] },
  ],

  moda: [
    { id: 'tipo', label: 'Tipo de prenda', type: 'select', options: ['Ropa mujer', 'Ropa hombre', 'Calzado', 'Bolsos', 'Accesorios', 'Joyería'] },
    { id: 'talla', label: 'Talla', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '24', '26', '28', '30', '32', '34'] },
  ],

  bebes: [
    { id: 'tipo', label: 'Tipo', type: 'select', options: ['Carriolas', 'Autoasientos', 'Cunas', 'Ropa bebé', 'Juguetes bebé'] },
    { id: 'edad', label: 'Edad recomendada', type: 'select', options: ['0-6 meses', '6-12 meses', '1-2 años', '2-3 años', '+3 años'] },
  ],

  mascotas: [
    { id: 'especie', label: 'Especie', type: 'checkbox', options: ['Perro', 'Gato', 'Ave', 'Pez', 'Reptil'] },
    { id: 'tamano', label: 'Tamaño', type: 'select', options: ['Pequeño', 'Mediano', 'Grande'] },
  ],

  ocio: [
    { id: 'tipo', label: 'Categoría', type: 'select', options: ['Deportes', 'Videojuegos', 'Libros/Música', 'Coleccionismo', 'Fotografía', 'Instrumentos', 'Camping', 'Viajes'] },
    { id: 'formato', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico'] },
  ],

  boletos: [
    { id: 'tipo', label: 'Tipo de evento', type: 'select', options: ['Conciertos', 'Deportes', 'Teatro/Cultura', 'Festivales', 'Cine'] },
    { id: 'formato', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico'] },
  ],
};
