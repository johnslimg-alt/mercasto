<?php
 
namespace Database\Seeders;
 
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
 
class PaymentProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define all packages and promotional products
        $products = [
            [
                'code' => 'package_free',
                'name' => 'Plan Gratis',
                'price' => 0.00,
                'description' => 'Gratis: $0 / mes, 3 anuncios activos',
                'type' => 'subscription',
            ],
            [
                'code' => 'package_impulso',
                'name' => 'Plan Impulso',
                'price' => 99.00,
                'description' => 'Impulso: $99 / mes, 10 anuncios activos',
                'type' => 'subscription',
            ],
            [
                'code' => 'package_negocio',
                'name' => 'Plan Negocio',
                'price' => 249.00,
                'description' => 'Negocio: $249 / mes, 30 anuncios activos',
                'type' => 'subscription',
            ],
            [
                'code' => 'package_pro',
                'name' => 'Plan Pro',
                'price' => 599.00,
                'description' => 'Pro: $599 / mes, 100 anuncios activos',
                'type' => 'subscription',
            ],
            [
                'code' => 'package_agencia',
                'name' => 'Plan Agencia',
                'price' => 1499.00,
                'description' => 'Agencia: desde $1,499 / mes, 300–500 anuncios activos',
                'type' => 'subscription',
            ],
            [
                'code' => 'boost_1_day',
                'name' => 'Subir 24 horas',
                'price' => 19.00,
                'description' => 'Subir 24 horas: $19',
                'type' => 'boost',
            ],
            [
                'code' => 'boost_3_days',
                'name' => 'Subir 3 días',
                'price' => 49.00,
                'description' => 'Subir 3 días: $49',
                'type' => 'boost',
            ],
            [
                'code' => 'highlight_7_days',
                'name' => 'Resaltar 7 días',
                'price' => 79.00,
                'description' => 'Resaltar 7 días: $79',
                'type' => 'highlight',
            ],
            [
                'code' => 'featured_7_days',
                'name' => 'Destacado 7 días',
                'price' => 149.00,
                'description' => 'Destacado 7 días: $149',
                'type' => 'feature',
            ],
            [
                'code' => 'featured_30_days',
                'name' => 'Destacado 30 días',
                'price' => 399.00,
                'description' => 'Destacado 30 días: $399',
                'type' => 'feature',
            ],
            [
                'code' => 'top_category_7_days',
                'name' => 'Top categoría 7 días',
                'price' => 399.00,
                'description' => 'Top categoría 7 días: $399',
                'type' => 'top',
            ],
        ];

        // Perform idempotent updateOrCreate seed into the database if the table exists
        if (\Illuminate\Support\Facades\Schema::hasTable('payment_products')) {
            foreach ($products as $product) {
                DB::table('payment_products')->updateOrInsert(
                    ['code' => $product['code']],
                    [
                        'name' => $product['name'],
                        'price' => $product['price'],
                        'description' => $product['description'],
                        'type' => $product['type'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        } else {
            // Dynamically create payment_products table if needed so it is fully idempotent and robust
            \Illuminate\Support\Facades\Schema::create('payment_products', function ($table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->decimal('price', 10, 2);
                $table->text('description')->nullable();
                $table->string('type')->nullable();
                $table->timestamps();
            });

            foreach ($products as $product) {
                DB::table('payment_products')->updateOrInsert(
                    ['code' => $product['code']],
                    [
                        'name' => $product['name'],
                        'price' => $product['price'],
                        'description' => $product['description'],
                        'type' => $product['type'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
