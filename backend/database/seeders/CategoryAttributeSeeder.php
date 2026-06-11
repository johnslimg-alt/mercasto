<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoryAttributeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $attributes = [
            // --- coches (Cars) ---
            [
                'category_slug' => 'coches',
                'key' => 'brand',
                'label' => [
                    'es' => 'Marca',
                    'en' => 'Brand'
                ],
                'type' => 'select',
                'options' => [
                    ['value' => 'toyota', 'label' => ['es' => 'Toyota', 'en' => 'Toyota']],
                    ['value' => 'nissan', 'label' => ['es' => 'Nissan', 'en' => 'Nissan']],
                    ['value' => 'ford', 'label' => ['es' => 'Ford', 'en' => 'Ford']],
                    ['value' => 'chevrolet', 'label' => ['es' => 'Chevrolet', 'en' => 'Chevrolet']],
                    ['value' => 'honda', 'label' => ['es' => 'Honda', 'en' => 'Honda']],
                    ['value' => 'volkswagen', 'label' => ['es' => 'Volkswagen', 'en' => 'Volkswagen']],
                    ['value' => 'bmw', 'label' => ['es' => 'BMW', 'en' => 'BMW']],
                    ['value' => 'mercedes', 'label' => ['es' => 'Mercedes-Benz', 'en' => 'Mercedes-Benz']]
                ],
                'required' => true,
                'sort_order' => 10
            ],
            [
                'category_slug' => 'coches',
                'key' => 'model',
                'label' => [
                    'es' => 'Modelo',
                    'en' => 'Model'
                ],
                'type' => 'text',
                'options' => null,
                'required' => true,
                'sort_order' => 20
            ],
            [
                'category_slug' => 'coches',
                'key' => 'year',
                'label' => [
                    'es' => 'Año',
                    'en' => 'Year'
                ],
                'type' => 'number',
                'options' => null,
                'required' => true,
                'sort_order' => 30
            ],
            [
                'category_slug' => 'coches',
                'key' => 'kms',
                'label' => [
                    'es' => 'Kilómetros',
                    'en' => 'Kilometers'
                ],
                'type' => 'number',
                'options' => null,
                'required' => true,
                'sort_order' => 40
            ],
            [
                'category_slug' => 'coches',
                'key' => 'fuel',
                'label' => [
                    'es' => 'Combustible',
                    'en' => 'Fuel'
                ],
                'type' => 'select',
                'options' => [
                    ['value' => 'gasolina', 'label' => ['es' => 'Gasolina', 'en' => 'Gasoline']],
                    ['value' => 'diesel', 'label' => ['es' => 'Diésel', 'en' => 'Diesel']],
                    ['value' => 'hibrido', 'label' => ['es' => 'Híbrido', 'en' => 'Hybrid']],
                    ['value' => 'electrico', 'label' => ['es' => 'Eléctrico', 'en' => 'Electric']]
                ],
                'required' => true,
                'sort_order' => 50
            ],

            // --- inmobiliaria (Real Estate) ---
            [
                'category_slug' => 'inmobiliaria',
                'key' => 'property_type',
                'label' => [
                    'es' => 'Tipo de propiedad',
                    'en' => 'Property Type'
                ],
                'type' => 'select',
                'options' => [
                    ['value' => 'casa', 'label' => ['es' => 'Casa', 'en' => 'House']],
                    ['value' => 'departamento', 'label' => ['es' => 'Departamento', 'en' => 'Apartment']],
                    ['value' => 'terreno', 'label' => ['es' => 'Terreno', 'en' => 'Land']],
                    ['value' => 'local', 'label' => ['es' => 'Local comercial', 'en' => 'Commercial Space']],
                    ['value' => 'oficina', 'label' => ['es' => 'Oficina', 'en' => 'Office']]
                ],
                'required' => true,
                'sort_order' => 10
            ],
            [
                'category_slug' => 'inmobiliaria',
                'key' => 'rooms',
                'label' => [
                    'es' => 'Habitaciones',
                    'en' => 'Bedrooms'
                ],
                'type' => 'number',
                'options' => null,
                'required' => false,
                'sort_order' => 20
            ],
            [
                'category_slug' => 'inmobiliaria',
                'key' => 'bathrooms',
                'label' => [
                    'es' => 'Baños',
                    'en' => 'Bathrooms'
                ],
                'type' => 'number',
                'options' => null,
                'required' => false,
                'sort_order' => 30
            ],
            [
                'category_slug' => 'inmobiliaria',
                'key' => 'area',
                'label' => [
                    'es' => 'Superficie (m²)',
                    'en' => 'Area (sqm)'
                ],
                'type' => 'number',
                'options' => null,
                'required' => true,
                'sort_order' => 40
            ],

            // --- empleo (Jobs) ---
            [
                'category_slug' => 'empleo',
                'key' => 'contract_type',
                'label' => [
                    'es' => 'Tipo de contrato',
                    'en' => 'Contract Type'
                ],
                'type' => 'select',
                'options' => [
                    ['value' => 'indefinido', 'label' => ['es' => 'Indefinido', 'en' => 'Permanent']],
                    ['value' => 'temporal', 'label' => ['es' => 'Temporal', 'en' => 'Temporary']],
                    ['value' => 'beca', 'label' => ['es' => 'Prácticas/Beca', 'en' => 'Internship']],
                    ['value' => 'autonomo', 'label' => ['es' => 'Autónomo/Freelance', 'en' => 'Freelance']]
                ],
                'required' => true,
                'sort_order' => 10
            ],
            [
                'category_slug' => 'empleo',
                'key' => 'working_hours',
                'label' => [
                    'es' => 'Jornada',
                    'en' => 'Working Hours'
                ],
                'type' => 'select',
                'options' => [
                    ['value' => 'completa', 'label' => ['es' => 'Completa', 'en' => 'Full-time']],
                    ['value' => 'parcial', 'label' => ['es' => 'Parcial', 'en' => 'Part-time']]
                ],
                'required' => true,
                'sort_order' => 20
            ],
            [
                'category_slug' => 'empleo',
                'key' => 'salary',
                'label' => [
                    'es' => 'Salario (anual)',
                    'en' => 'Salary (annual)'
                ],
                'type' => 'number',
                'options' => null,
                'required' => false,
                'sort_order' => 30
            ]
        ];

        $catalog = [
            'motor' => [
                ['marca', 'Marca', 'select', ['Nissan', 'Toyota', 'Honda', 'Volkswagen', 'Chevrolet', 'Ford', 'Otra']],
                ['modelo', 'Modelo', 'text', null],
                ['year', 'Año', 'number', null],
                ['km', 'Kilometraje', 'number', null],
                ['combustible', 'Combustible', 'select', ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico']],
            ],
            'servicios' => [
                ['tipo', 'Tipo de servicio', 'select', ['Hogar', 'Reparaciones', 'Limpieza', 'Clases', 'Eventos', 'Transporte', 'Belleza']],
                ['modalidad', 'Modalidad', 'select', ['A domicilio', 'En local', 'En línea']],
                ['experiencia_servicio', 'Experiencia', 'select', ['Nuevo proveedor', '1-3 años', '4-7 años', '+8 años']],
                ['tipo_cobro', 'Tipo de cobro', 'select', ['Por hora', 'Por visita', 'Por proyecto', 'Precio fijo']],
            ],
            'electronica' => [
                ['marca', 'Marca', 'select', ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Sony', 'LG', 'Dell', 'HP', 'Otra']],
                ['modelo', 'Modelo', 'text', null],
                ['almacenamiento', 'Almacenamiento', 'select', ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB']],
                ['ram', 'RAM', 'select', ['4 GB', '8 GB', '12 GB', '16 GB', '32 GB+']],
            ],
            'hogar' => [
                ['tipo', 'Tipo', 'select', ['Muebles', 'Electrodomésticos', 'Decoración', 'Herramientas', 'Jardín']],
                ['material', 'Material', 'select', ['Madera', 'Metal', 'Vidrio', 'Tela', 'Piel', 'Plástico']],
                ['medidas', 'Medidas', 'text', null],
                ['entrega', 'Entrega', 'select', ['A domicilio', 'Recoger', 'Envío disponible']],
            ],
            'moda' => [
                ['tipo', 'Tipo de prenda', 'select', ['Ropa mujer', 'Ropa hombre', 'Calzado', 'Bolsos', 'Accesorios']],
                ['talla', 'Talla', 'text', null],
                ['marca_moda', 'Marca', 'text', null],
                ['color_moda', 'Color', 'select', ['Negro', 'Blanco', 'Beige', 'Azul', 'Rojo', 'Verde', 'Multicolor']],
            ],
            'deportes' => [
                ['tipo_deporte', 'Deporte o actividad', 'select', ['Fútbol', 'Ciclismo', 'Gimnasio', 'Running', 'Camping', 'Pesca', 'Surf', 'Náutica']],
                ['marca', 'Marca', 'text', null],
                ['talla', 'Talla o medida', 'text', null],
            ],
            'infantil' => [
                ['tipo', 'Tipo', 'select', ['Juguetes', 'Ropa infantil', 'Escolar', 'Muebles', 'Seguridad']],
                ['edad', 'Edad recomendada', 'select', ['0-6 meses', '6-12 meses', '1-2 años', '3-5 años', '6-9 años', '10+ años']],
                ['marca', 'Marca', 'text', null],
            ],
            'mascotas' => [
                ['especie', 'Especie', 'select', ['Perro', 'Gato', 'Ave', 'Pez', 'Reptil', 'Roedor']],
                ['tamano', 'Tamaño', 'select', ['Pequeño', 'Mediano', 'Grande']],
                ['servicio_mascota', 'Tipo', 'select', ['Adopción', 'Accesorios', 'Alimento', 'Veterinario', 'Estética']],
            ],
            'negocios' => [
                ['tipo_negocio', 'Tipo de oportunidad', 'select', ['Traspaso', 'Franquicia', 'Maquinaria', 'Equipamiento', 'Insumos', 'Inversión']],
                ['sector', 'Sector', 'select', ['Alimentos', 'Retail', 'Servicios', 'Industria', 'Turismo', 'Tecnología']],
                ['antiguedad', 'Antigüedad', 'select', ['Nuevo', 'Menos de 1 año', '1-3 años', '4-10 años', '10+ años']],
            ],
            'formacion' => [
                ['tipo_formacion', 'Tipo', 'select', ['Libro', 'Curso', 'Clases', 'Idiomas', 'Certificación', 'Material escolar']],
                ['modalidad', 'Modalidad', 'select', ['Presencial', 'En línea', 'Híbrido', 'Material físico']],
                ['nivel', 'Nivel', 'select', ['Principiante', 'Intermedio', 'Avanzado', 'Profesional']],
                ['idioma', 'Idioma', 'text', null],
            ],
            'ocio' => [
                ['tipo', 'Categoría', 'select', ['Videojuegos', 'Coleccionismo', 'Fotografía', 'Instrumentos', 'Camping', 'Viajes']],
                ['formato', 'Formato', 'select', ['Digital', 'Físico']],
            ],
            'boletos' => [
                ['tipo', 'Tipo de evento', 'select', ['Conciertos', 'Deportes', 'Teatro', 'Festivales', 'Conferencias']],
                ['fecha_evento', 'Fecha del evento', 'text', null],
                ['formato', 'Formato', 'select', ['Digital', 'Físico', 'Transferible']],
                ['zona', 'Zona', 'text', null],
            ],
        ];

        foreach (['coches', 'inmobiliaria', 'empleo'] as $categorySlug) {
            $attributes[] = [
                'category_slug' => $categorySlug,
                'key' => 'subcategory',
                'label' => ['es' => 'Subcategoría', 'en' => 'Subcategory'],
                'type' => 'text',
                'options' => null,
                'required' => true,
                'sort_order' => 5,
            ];
        }

        foreach ($catalog as $categorySlug => $fields) {
            array_unshift($fields, ['subcategory', 'Subcategoría', 'text', null]);
            foreach ($fields as $index => [$key, $label, $type, $options]) {
                $attributes[] = [
                    'category_slug' => $categorySlug,
                    'key' => $key,
                    'label' => ['es' => $label, 'en' => $label],
                    'type' => $type,
                    'options' => $options,
                    'required' => $key === 'subcategory',
                    'sort_order' => ($index + 1) * 10,
                ];
            }
        }

        foreach ($attributes as $attr) {
            $categoryId = DB::table('categories')->where('slug', $attr['category_slug'])->value('id');

            if (!$categoryId) {
                continue;
            }

            $exists = DB::table('category_attributes')
                ->where('category_id', $categoryId)
                ->where('key', $attr['key'])
                ->exists();

            $data = [
                'category_id' => $categoryId,
                'key' => $attr['key'],
                'label' => json_encode($attr['label']),
                'type' => $attr['type'],
                'options' => $attr['options'] ? json_encode($attr['options']) : null,
                'required' => $attr['required'],
                'sort_order' => $attr['sort_order'],
                'updated_at' => now()
            ];

            if (!$exists) {
                $data['created_at'] = now();
                DB::table('category_attributes')->insert($data);
            } else {
                DB::table('category_attributes')
                    ->where('category_id', $categoryId)
                    ->where('key', $attr['key'])
                    ->update($data);
            }
        }
    }
}
