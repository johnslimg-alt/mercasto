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
