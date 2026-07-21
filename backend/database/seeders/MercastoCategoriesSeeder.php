<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MercastoCategoriesSeeder extends Seeder
{
    public function run()
    {
        // Nota: coches, telefonos, deportes, bebes, informatica y coleccionismo NO
        // se siembran aquí a propósito — fueron consolidadas en motor/electronica/
        // ocio/infantil por 2026_06_11_000003_consolidate_categories.php y
        // 2026_07_04_000001_consolidate_coches_into_motor.php. Sembrarlas de nuevo
        // resucitaría categorías "muertas" en cada instalación nueva.
        $categories = [
            ['slug' => 'motor', 'name' => json_encode([
                'es' => 'Motor', 'en' => 'Vehicles', 'pt' => 'Veículos', 'fr' => 'Véhicules', 'de' => 'Fahrzeuge',
                'it' => 'Veicoli', 'ru' => 'Авто', 'zh' => '汽车', 'ja' => '車', 'ko' => '자동차',
                'ar' => 'سيارات', 'he' => 'כלי רכב', 'yi' => 'פארקערמיטלען',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Activity', 'sort_order' => 20],
            ['slug' => 'inmobiliaria', 'name' => json_encode([
                'es' => 'Inmuebles', 'en' => 'Real estate', 'pt' => 'Imóveis', 'fr' => 'Immobilier', 'de' => 'Immobilien',
                'it' => 'Immobili', 'ru' => 'Недвижимость', 'zh' => '房地产', 'ja' => '不動産', 'ko' => '부동산',
                'ar' => 'عقارات', 'he' => 'נדל"ן', 'yi' => 'אימאביליע',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Home', 'sort_order' => 30],
            ['slug' => 'empleo', 'name' => json_encode([
                'es' => 'Empleos', 'en' => 'Jobs', 'pt' => 'Empregos', 'fr' => 'Emplois', 'de' => 'Jobs',
                'it' => 'Lavoro', 'ru' => 'Работа', 'zh' => '工作', 'ja' => '求人', 'ko' => '일자리',
                'ar' => 'وظائف', 'he' => 'משרות', 'yi' => 'ארבעט',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Briefcase', 'sort_order' => 40],
            ['slug' => 'servicios', 'name' => json_encode([
                'es' => 'Servicios', 'en' => 'Services', 'pt' => 'Serviços', 'fr' => 'Services', 'de' => 'Dienstleistungen',
                'it' => 'Servizi', 'ru' => 'Услуги', 'zh' => '服务', 'ja' => 'サービス', 'ko' => '서비스',
                'ar' => 'خدمات', 'he' => 'שירותים', 'yi' => 'סערוויסעס',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Wrench', 'sort_order' => 50],
            ['slug' => 'moda', 'name' => json_encode([
                'es' => 'Moda y Belleza', 'en' => 'Fashion', 'pt' => 'Moda e Beleza', 'fr' => 'Mode et Beauté', 'de' => 'Mode & Schönheit',
                'it' => 'Moda e Bellezza', 'ru' => 'Мода и красота', 'zh' => '时尚美容', 'ja' => 'ファッション・美容', 'ko' => '패션·뷰티',
                'ar' => 'أزياء وجمال', 'he' => 'אופנה ויופי', 'yi' => 'מאָדע און שיינקייט',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Shirt', 'sort_order' => 60],
            ['slug' => 'hogar', 'name' => json_encode([
                'es' => 'Hogar y Jardín', 'en' => 'Home & Garden', 'pt' => 'Casa e Jardim', 'fr' => 'Maison et Jardin', 'de' => 'Haus & Garten',
                'it' => 'Casa e Giardino', 'ru' => 'Дом и сад', 'zh' => '家居园艺', 'ja' => 'ホーム・ガーデン', 'ko' => '홈·가든',
                'ar' => 'المنزل والحديقة', 'he' => 'בית וגינה', 'yi' => 'הויז און גארטן',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Sofa', 'sort_order' => 70],
            ['slug' => 'electronica', 'name' => json_encode([
                'es' => 'Electrónica', 'en' => 'Electronics', 'pt' => 'Eletrônicos', 'fr' => 'Électronique', 'de' => 'Elektronik',
                'it' => 'Elettronica', 'ru' => 'Электроника', 'zh' => '电子产品', 'ja' => '家電製品', 'ko' => '전자제품',
                'ar' => 'إلكترونيات', 'he' => 'אלקטרוניקה', 'yi' => 'עלעקטראָניק',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Monitor', 'sort_order' => 80],
            ['slug' => 'infantil', 'name' => json_encode([
                'es' => 'Infantil', 'en' => 'Kids', 'pt' => 'Infantil', 'fr' => 'Enfants', 'de' => 'Kinder',
                'it' => 'Bambini', 'ru' => 'Детские товары', 'zh' => '儿童用品', 'ja' => '子供用品', 'ko' => '유아동',
                'ar' => 'أطفال', 'he' => 'ילדים', 'yi' => 'קינדער',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Baby', 'sort_order' => 110],
            ['slug' => 'mascotas', 'name' => json_encode([
                'es' => 'Mascotas', 'en' => 'Pets', 'pt' => 'Animais de estimação', 'fr' => 'Animaux', 'de' => 'Haustiere',
                'it' => 'Animali', 'ru' => 'Питомцы', 'zh' => '宠物', 'ja' => 'ペット', 'ko' => '반려동물',
                'ar' => 'حيوانات أليفة', 'he' => 'חיות מחמד', 'yi' => 'היימישע חיות',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'PawPrint', 'sort_order' => 130],
            ['slug' => 'negocios', 'name' => json_encode([
                'es' => 'Negocios', 'en' => 'Businesses', 'pt' => 'Negócios', 'fr' => 'Entreprises', 'de' => 'Unternehmen',
                'it' => 'Attività', 'ru' => 'Бизнес', 'zh' => '商业', 'ja' => 'ビジネス', 'ko' => '비즈니스',
                'ar' => 'أعمال', 'he' => 'עסקים', 'yi' => 'געשעפטן',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Store', 'sort_order' => 140],
            ['slug' => 'formacion', 'name' => json_encode([
                'es' => 'Formación y Libros', 'en' => 'Education', 'pt' => 'Educação e Livros', 'fr' => 'Éducation et Livres', 'de' => 'Bildung & Bücher',
                'it' => 'Istruzione e Libri', 'ru' => 'Образование и книги', 'zh' => '教育图书', 'ja' => '教育・書籍', 'ko' => '교육·도서',
                'ar' => 'تعليم وكتب', 'he' => 'חינוך וספרים', 'yi' => 'בילדונג און ביכער',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Ticket', 'sort_order' => 150],
            // ocio y boletos ya se crean en 2026_04_14_000001_create_categories_table.php
            // (solo es/en); este upsert les añade el resto de los 13 idiomas soportados.
            ['slug' => 'ocio', 'name' => json_encode([
                'es' => 'Ocio', 'en' => 'Hobbies', 'pt' => 'Lazer', 'fr' => 'Loisirs', 'de' => 'Freizeit',
                'it' => 'Tempo libero', 'ru' => 'Хобби и досуг', 'zh' => '休闲爱好', 'ja' => '趣味', 'ko' => '취미',
                'ar' => 'هوايات', 'he' => 'תחביבים', 'yi' => 'פארווייל',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Bike', 'sort_order' => 11],
            ['slug' => 'boletos', 'name' => json_encode([
                'es' => 'Boletos', 'en' => 'Tickets', 'pt' => 'Ingressos', 'fr' => 'Billets', 'de' => 'Tickets',
                'it' => 'Biglietti', 'ru' => 'Билеты', 'zh' => '门票', 'ja' => 'チケット', 'ko' => '티켓',
                'ar' => 'تذاكر', 'he' => 'כרטיסים', 'yi' => 'טיקעטן',
            ], JSON_UNESCAPED_UNICODE), 'icon' => 'Ticket', 'sort_order' => 12],
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