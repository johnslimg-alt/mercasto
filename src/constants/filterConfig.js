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

const homeFilters = [
  { id: 'tipo', label: 'Categoría', type: 'select', options: ['Muebles', 'Electrodomésticos', 'Decoración', 'Herramientas', 'Jardín', 'Iluminación', 'Cocina', 'Seguridad'] },
  { id: 'condicion', label: 'Condición', type: 'checkbox', options: ['Nuevo', 'Usado', 'Como nuevo', 'Restaurado'] },
  { id: 'material', label: 'Material', type: 'checkbox', options: ['Madera', 'Metal', 'Vidrio', 'Tela', 'Piel', 'Plástico', 'MDF'] },
  { id: 'entrega', label: 'Entrega', type: 'checkbox', options: ['Entrega a domicilio', 'Recoger en domicilio', 'Envío disponible', 'Instalación incluida'] },
  { id: 'medidas', label: 'Medidas', type: 'text', placeholder: 'Ej. 180x90 cm' },
  { id: 'ambiente', label: 'Ambiente', type: 'checkbox', options: ['Sala', 'Comedor', 'Recámara', 'Cocina', 'Baño', 'Terraza', 'Oficina'] },
];

const fashionFilters = [
  { id: 'tipo', label: 'Tipo de prenda', type: 'select', options: ['Ropa mujer', 'Ropa hombre', 'Calzado', 'Bolsos', 'Accesorios', 'Joyería', 'Relojes'] },
  { id: 'talla', label: 'Talla', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '24', '26', '28', '30', '32', '34'] },
  { id: 'marca_moda', label: 'Marca', type: 'text', placeholder: 'Ej. Zara, Nike, Levi’s' },
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

const sportsFilters = [
  { id: 'tipo_deporte', label: 'Deporte / actividad', type: 'select', options: ['Fútbol', 'Ciclismo', 'Gimnasio', 'Running', 'Camping', 'Pesca', 'Surf', 'Náutica', 'Otro'] },
  { id: 'marca', label: 'Marca', type: 'text', placeholder: 'Ej. Shimano, Nike, Garmin' },
  { id: 'talla', label: 'Talla / medida', type: 'text', placeholder: 'Ej. M, 27.5, 10 ft' },
  { id: 'condicion', label: 'Condición', type: 'select', options: ['Nuevo', 'Como nuevo', 'Usado', 'Restaurado'] },
  { id: 'disciplina', label: 'Disciplina', type: 'checkbox', options: ['Recreativo', 'Entrenamiento', 'Competencia', 'Profesional'] },
];

const kidsFilters = [
  { id: 'tipo', label: 'Tipo', type: 'select', options: ['Juguetes', 'Ropa infantil', 'Escolar', 'Muebles', 'Seguridad', 'Carriolas', 'Autoasientos'] },
  { id: 'edad', label: 'Edad recomendada', type: 'select', options: ['0-6 meses', '6-12 meses', '1-2 años', '3-5 años', '6-9 años', '10+ años'] },
  { id: 'condicion', label: 'Condición', type: 'select', options: ['Nuevo', 'Como nuevo', 'Usado'] },
  { id: 'marca', label: 'Marca', type: 'text', placeholder: 'Ej. Chicco, Lego, Fisher-Price' },
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
    { id: 'formato', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico'] },
  ],

  boletos: ticketFilters,
  'boletos/conciertos': ticketFilters,
  'boletos/deportes': ticketFilters,
  'boletos/teatro': ticketFilters,
};
