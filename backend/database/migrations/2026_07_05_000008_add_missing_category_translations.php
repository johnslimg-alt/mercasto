<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Full name translations for every language the frontend actually supports
     * (SUPPORTED_LANGUAGES in src/App.jsx: es, en, pt, fr, zh, ko, de, it, ar, he,
     * yi, ru, ja). Before this migration, 8 of 15 categories only had es/en, and
     * none had he/yi at all — so Arabic showed a patchwork of translated and
     * Spanish-fallback category names, and Hebrew/Yiddish fell back to Spanish
     * entirely. This brings every category to full parity across all 13
     * supported languages, keeping the existing es/en/ar/... values already in
     * production and only filling in what was missing.
     */
    private const TRANSLATIONS = [
        'productos' => ['he' => 'מוצרים', 'yi' => 'סכוירע'],
        'turismo' => ['he' => 'תיירות', 'yi' => 'טוריזם'],
        'motor' => ['he' => 'כלי רכב', 'yi' => 'פארקערמיטלען'],
        'inmobiliaria' => ['he' => 'נדל"ן', 'yi' => 'אימאביליע'],
        'empleo' => ['he' => 'משרות', 'yi' => 'ארבעט'],
        'servicios' => ['he' => 'שירותים', 'yi' => 'סערוויסעס'],
        'negocios' => ['he' => 'עסקים', 'yi' => 'געשעפטן'],
        'ocio' => [
            'pt' => 'Lazer', 'fr' => 'Loisirs', 'de' => 'Freizeit', 'it' => 'Tempo libero',
            'ru' => 'Хобби и досуг', 'zh' => '休闲爱好', 'ja' => '趣味', 'ko' => '취미',
            'ar' => 'هوايات', 'he' => 'תחביבים', 'yi' => 'פארווייל',
        ],
        'boletos' => [
            'pt' => 'Ingressos', 'fr' => 'Billets', 'de' => 'Tickets', 'it' => 'Biglietti',
            'ru' => 'Билеты', 'zh' => '门票', 'ja' => 'チケット', 'ko' => '티켓',
            'ar' => 'تذاكر', 'he' => 'כרטיסים', 'yi' => 'טיקעטן',
        ],
        'moda' => [
            'pt' => 'Moda e Beleza', 'fr' => 'Mode et Beauté', 'de' => 'Mode & Schönheit', 'it' => 'Moda e Bellezza',
            'ru' => 'Мода и красота', 'zh' => '时尚美容', 'ja' => 'ファッション・美容', 'ko' => '패션·뷰티',
            'ar' => 'أزياء وجمال', 'he' => 'אופנה ויופי', 'yi' => 'מאָדע און שיינקייט',
        ],
        'hogar' => [
            'pt' => 'Casa e Jardim', 'fr' => 'Maison et Jardin', 'de' => 'Haus & Garten', 'it' => 'Casa e Giardino',
            'ru' => 'Дом и сад', 'zh' => '家居园艺', 'ja' => 'ホーム・ガーデン', 'ko' => '홈·가든',
            'ar' => 'المنزل والحديقة', 'he' => 'בית וגינה', 'yi' => 'הויז און גארטן',
        ],
        'electronica' => [
            'pt' => 'Eletrônicos', 'fr' => 'Électronique', 'de' => 'Elektronik', 'it' => 'Elettronica',
            'ru' => 'Электроника', 'zh' => '电子产品', 'ja' => '家電製品', 'ko' => '전자제품',
            'ar' => 'إلكترونيات', 'he' => 'אלקטרוניקה', 'yi' => 'עלעקטראָניק',
        ],
        'infantil' => [
            'pt' => 'Infantil', 'fr' => 'Enfants', 'de' => 'Kinder', 'it' => 'Bambini',
            'ru' => 'Детские товары', 'zh' => '儿童用品', 'ja' => '子供用品', 'ko' => '유아동',
            'ar' => 'أطفال', 'he' => 'ילדים', 'yi' => 'קינדער',
        ],
        'mascotas' => [
            'pt' => 'Animais de estimação', 'fr' => 'Animaux', 'de' => 'Haustiere', 'it' => 'Animali',
            'ru' => 'Питомцы', 'zh' => '宠物', 'ja' => 'ペット', 'ko' => '반려동물',
            'ar' => 'حيوانات أليفة', 'he' => 'חיות מחמד', 'yi' => 'היימישע חיות',
        ],
        'formacion' => [
            'pt' => 'Educação e Livros', 'fr' => 'Éducation et Livres', 'de' => 'Bildung & Bücher', 'it' => 'Istruzione e Libri',
            'ru' => 'Образование и книги', 'zh' => '教育图书', 'ja' => '教育・書籍', 'ko' => '교육·도서',
            'ar' => 'تعليم وكتب', 'he' => 'חינוך וספרים', 'yi' => 'בילדונג און ביכער',
        ],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (self::TRANSLATIONS as $slug => $additions) {
            $row = DB::table('categories')->where('slug', $slug)->first();

            if (! $row) {
                continue;
            }

            $name = json_decode($row->name, true) ?: [];
            $name = array_merge($name, $additions);

            DB::table('categories')
                ->where('slug', $slug)
                ->update(['name' => json_encode($name, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (self::TRANSLATIONS as $slug => $additions) {
            $row = DB::table('categories')->where('slug', $slug)->first();

            if (! $row) {
                continue;
            }

            $name = json_decode($row->name, true) ?: [];
            foreach (array_keys($additions) as $lang) {
                unset($name[$lang]);
            }

            DB::table('categories')
                ->where('slug', $slug)
                ->update(['name' => json_encode($name, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]);
        }
    }
};
