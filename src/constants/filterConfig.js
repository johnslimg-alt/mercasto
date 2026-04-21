export const filterConfig = {
  motor: [
    { id: 'brand', label: 'Marca', type: 'select', options: ['Chevrolet', 'Nissan', 'Volkswagen', 'Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Audi', 'Kia', 'Hyundai', 'Mazda', 'Jeep', 'Tesla', 'MG', 'BYD'] },
    { id: 'year', label: 'Año', type: 'select', options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015 o anterior'] },
    { id: 'body_type', label: 'Tipo de carrocería', type: 'checkbox', options: ['Sedán', 'Hatchback', 'SUV', 'Pickup', 'Miniván', 'Coupé'] },
    { id: 'transmission', label: 'Transmisión', type: 'checkbox', options: ['Manual', 'Automática', 'CVT', 'DCT'] },
    { id: 'fuel', label: 'Combustible', type: 'checkbox', options: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'] },
    { id: 'doors', label: 'Puertas', type: 'checkbox', options: ['2', '3', '4', '5'] },
    { id: 'mileage', label: 'Kilometraje', type: 'select', options: ['0 km (Nuevo)', 'Hasta 10,000 km', '10,000 - 30,000 km', '30,000 - 60,000 km', '60,000 - 100,000 km', 'Más de 100,000 km'] },
  ],
  inmobiliaria: [
    { id: 'type', label: 'Tipo de Propiedad', type: 'select', options: ['Casa', 'Departamento', 'Terreno', 'Local Comercial', 'Oficina', 'Bodega'] },
    { id: 'operation', label: 'Operación', type: 'checkbox', options: ['Venta', 'Renta', 'Traspaso'] },
    { id: 'bedrooms', label: 'Recámaras', type: 'checkbox', options: ['1', '2', '3', '4', '5+'] },
    { id: 'bathrooms', label: 'Baños', type: 'checkbox', options: ['1', '1.5', '2', '3', '4+'] },
    { id: 'parking', label: 'Estacionamiento', type: 'checkbox', options: ['1 auto', '2 autos', '3+ autos', 'No'] },
    { id: 'construction_area', label: 'Área construida (m²)', type: 'select', options: ['Hasta 50 m²', '50 - 100 m²', '100 - 150 m²', '150 - 200 m²', 'Más de 200 m²'] },
    { id: 'amenities', label: 'Amenidades', type: 'checkbox', options: ['Piscina', 'Gimnasio', 'Seguridad 24/7', 'Terraza', 'Elevador', 'Amueblado'] },
  ],
  empleo: [
    { id: 'industry', label: 'Sector', type: 'select', options: ['Tecnología e IT', 'Ventas y Marketing', 'Administración', 'Educación', 'Salud', 'Construcción', 'Hostelería', 'Transporte'] },
    { id: 'type', label: 'Tipo de empleo', type: 'checkbox', options: ['Tiempo completo', 'Medio tiempo', 'Remoto', 'Híbrido', 'Freelance'] },
    { id: 'experience', label: 'Experiencia', type: 'select', options: ['Sin experiencia', '1-2 años', '3-5 años', '+5 años'] },
    { id: 'education', label: 'Educación', type: 'select', options: ['Secundaria', 'Preparatoria', 'Licenciatura', 'Maestría'] },
  ],
  servicios: [
    { id: 'type', label: 'Tipo de Servicio', type: 'select', options: ['Hogar', 'Profesionales', 'Tecnología', 'Transporte', 'Clases', 'Eventos', 'Belleza'] },
    { id: 'home_service', label: 'A domicilio', type: 'checkbox', options: ['Sí', 'No'] },
  ],
  informatica: [
    { id: 'type', label: 'Tipo de equipo', type: 'select', options: ['Laptop', 'PC de Escritorio', 'Componentes', 'Impresoras', 'Redes', 'Monitores'] },
    { id: 'brand', label: 'Marca', type: 'select', options: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI'] },
    { id: 'ram', label: 'Memoria RAM', type: 'checkbox', options: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB'] },
    { id: 'storage', label: 'Almacenamiento', type: 'checkbox', options: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
    { id: 'processor', label: 'Procesador', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1/M2/M3'] },
    { id: 'gpu', label: 'Tarjeta Gráfica', type: 'checkbox', options: ['Integrada', 'NVIDIA GTX', 'NVIDIA RTX', 'AMD Radeon'] },
  ],
  telefonia: [
    { id: 'brand', label: 'Marca', type: 'select', options: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Google Pixel', 'Honor', 'Vivo'] },
    { id: 'storage', label: 'Almacenamiento', type: 'checkbox', options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'] },
    { id: 'ram', label: 'RAM', type: 'checkbox', options: ['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'] },
    { id: 'os', label: 'Sistema Operativo', type: 'checkbox', options: ['iOS', 'Android', 'HarmonyOS'] },
    { id: 'network', label: 'Red', type: 'checkbox', options: ['5G', '4G LTE'] },
  ],
  hogar: [
    { id: 'type', label: 'Categoría', type: 'select', options: ['Muebles', 'Electrodomésticos', 'Decoración', 'Herramientas', 'Seguridad'] },
    { id: 'material', label: 'Material', type: 'checkbox', options: ['Madera', 'Metal', 'Plástico', 'Vidrio', 'Tela', 'Piel'] },
  ],
  moda: [
    { id: 'gender', label: 'Género', type: 'checkbox', options: ['Hombre', 'Mujer', 'Unisex', 'Niños'] },
    { id: 'type', label: 'Tipo de prenda', type: 'select', options: ['Tops/Camisas', 'Pantalones/Jeans', 'Vestidos/Faldas', 'Zapatos/Tenis', 'Accesorios', 'Ropa interior'] },
    { id: 'size', label: 'Talla', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '24', '26', '28', '30', '32', '34'] },
    { id: 'brand', label: 'Marca', type: 'select', options: ['Zara', 'H&M', 'Nike', 'Adidas', 'Puma', 'Levi\'s', 'Shein'] },
  ],
  bebes: [
    { id: 'type', label: 'Tipo', type: 'select', options: ['Carriolas', 'Sillas de auto', 'Cunas/Camas', 'Alimentación', 'Ropa', 'Juguetes'] },
    { id: 'age', label: 'Edad recomendada', type: 'select', options: ['0-6 meses', '6-12 meses', '1-2 años', '2-3 años', '+3 años'] },
  ],
  mascotas: [
    { id: 'species', label: 'Especie', type: 'checkbox', options: ['Perro', 'Gato', 'Ave', 'Pez', 'Reptil'] },
    { id: 'age', label: 'Edad', type: 'select', options: ['Cachorro', 'Adulto joven', 'Adulto mayor'] },
    { id: 'size', label: 'Tamaño', type: 'select', options: ['Pequeño', 'Mediano', 'Grande'] },
  ],
  ocio: [
    { id: 'type', label: 'Categoría', type: 'select', options: ['Deportes', 'Videojuegos', 'Libros/Música', 'Coleccionismo', 'Fotografía', 'Instrumentos', 'Camping', 'Viajes'] },
    { id: 'console', label: 'Consola', type: 'checkbox', options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One', 'Nintendo Switch', 'PC'] },
  ],
  boletos: [
    { id: 'type', label: 'Tipo de evento', type: 'select', options: ['Conciertos', 'Deportes', 'Teatro/Cultura', 'Festivales', 'Cine'] },
    { id: 'format', label: 'Formato', type: 'checkbox', options: ['Digital', 'Físico'] },
  ]
};