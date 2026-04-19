<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MercastoCategoriesSeeder extends Seeder
{
    public function run()
    {
        $categories = [
            ['slug' => 'coches', 'name' => json_encode(['es' => 'Coches', 'en' => 'Cars']), 'icon' => 'Car', 'sort_order' => 10],
            ['slug' => 'motor', 'name' => json_encode(['es' => 'Motor', 'en' => 'Motorcycles']), 'icon' => 'Activity', 'sort_order' => 20],
            ['slug' => 'inmobiliaria', 'name' => json_encode(['es' => 'Inmobiliaria', 'en' => 'Real Estate']), 'icon' => 'Home', 'sort_order' => 30],
            ['slug' => 'empleo', 'name' => json_encode(['es' => 'Empleo', 'en' => 'Jobs']), 'icon' => 'Briefcase', 'sort_order' => 40],
            ['slug' => 'servicios', 'name' => json_encode(['es' => 'Servicios', 'en' => 'Services']), 'icon' => 'Wrench', 'sort_order' => 50],
            ['slug' => 'moda', 'name' => json_encode(['es' => 'Moda y Belleza', 'en' => 'Fashion']), 'icon' => 'Shirt', 'sort_order' => 60],
            ['slug' => 'hogar', 'name' => json_encode(['es' => 'Hogar y Jardín', 'en' => 'Home & Garden']), 'icon' => 'Sofa', 'sort_order' => 70],
            ['slug' => 'electronica', 'name' => json_encode(['es' => 'Electrónica', 'en' => 'Electronics']), 'icon' => 'Monitor', 'sort_order' => 80],
            ['slug' => 'telefonos', 'name' => json_encode(['es' => 'Teléfonos', 'en' => 'Phones']), 'icon' => 'Smartphone', 'sort_order' => 90],
            ['slug' => 'deportes', 'name' => json_encode(['es' => 'Deportes y Náutica', 'en' => 'Sports']), 'icon' => 'Bike', 'sort_order' => 100],
            ['slug' => 'infantil', 'name' => json_encode(['es' => 'Infantil', 'en' => 'Kids']), 'icon' => 'Baby', 'sort_order' => 110],
            ['slug' => 'bebes', 'name' => json_encode(['es' => 'Bebés', 'en' => 'Babies']), 'icon' => 'Baby', 'sort_order' => 120],
            ['slug' => 'mascotas', 'name' => json_encode(['es' => 'Mascotas', 'en' => 'Pets']), 'icon' => 'PawPrint', 'sort_order' => 130],
            ['slug' => 'negocios', 'name' => json_encode(['es' => 'Negocios', 'en' => 'Business']), 'icon' => 'Store', 'sort_order' => 140],
            ['slug' => 'formacion', 'name' => json_encode(['es' => 'Formación y Libros', 'en' => 'Education']), 'icon' => 'Ticket', 'sort_order' => 150],
            ['slug' => 'informatica', 'name' => json_encode(['es' => 'Informática', 'en' => 'Computing']), 'icon' => 'Cpu', 'sort_order' => 160],
            ['slug' => 'coleccionismo', 'name' => json_encode(['es' => 'Coleccionismo', 'en' => 'Collectibles']), 'icon' => 'Star', 'sort_order' => 170],
        ];

        foreach ($categories as $cat) {
            $exists = DB::table('categories')->where('slug', $cat['slug'])->exists();
            
            if (!$exists) {
                $cat['created_at'] = now();
                $cat['updated_at'] = now();
                DB::table('categories')->insert($cat);
            } else {
                $cat['updated_at'] = now();
                DB::table('categories')->where('slug', $cat['slug'])->update($cat);
            }
        }
    }
}