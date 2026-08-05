<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Ad;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    private const MEXICO_STATES = [
        'aguascalientes', 'baja-california', 'baja-california-sur', 'campeche',
        'chiapas', 'chihuahua', 'ciudad-de-mexico', 'coahuila', 'colima',
        'durango', 'estado-de-mexico', 'guanajuato', 'guerrero', 'hidalgo',
        'jalisco', 'michoacan', 'morelos', 'nayarit', 'nuevo-leon', 'oaxaca',
        'puebla', 'queretaro', 'quintana-roo', 'san-luis-potosi', 'sinaloa',
        'sonora', 'tabasco', 'tamaulipas', 'tlaxcala', 'veracruz',
        'yucatan', 'zacatecas'
    ];

    public function index()
    {
        $content = Cache::remember('sitemap_main_v3', 3600, function () {
            return $this->generateMainSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function categories()
    {
        $content = Cache::remember('sitemap_categories_v4', 3600, function () {
            return $this->generateCategoriesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function states()
    {
        $content = Cache::remember('sitemap_states_v3', 3600, function () {
            return $this->generateStatesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function ads()
    {
        $content = Cache::remember('sitemap_ads_v3', 1800, function () {
            return $this->generateAdsSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function sitemapIndex()
    {
        $baseUrl = config('app.url');
        $now = now()->toW3cString();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        
        $sitemaps = [
            ['loc' => "{$baseUrl}/sitemap-main.xml", 'lastmod' => $now],
            ['loc' => "{$baseUrl}/sitemap-categories.xml", 'lastmod' => $now],
            ['loc' => "{$baseUrl}/sitemap-ads.xml", 'lastmod' => $now],
        ];

        foreach ($sitemaps as $sitemap) {
            $xml .= "  <sitemap>\n";
            $xml .= "    <loc>{$sitemap['loc']}</loc>\n";
            $xml .= "    <lastmod>{$sitemap['lastmod']}</lastmod>\n";
            $xml .= "  </sitemap>\n";
        }

        $xml .= "</sitemapindex>\n";

        return response($xml, 200)
            ->header('Content-Type', 'application/xml');
    }

    private function generateMainSitemap()
    {
        $baseUrl = config('app.url');
        $now = now()->toW3cString();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Главная страница
        $xml .= $this->urlEntry($baseUrl . '/', 'daily', '1.0', $now);

        // Основные вертикали
        $verticals = [
            'motor', 'inmuebles', 'servicios', 'empleos', 'electronica',
            'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'negocios',
            'boletos', 'tiendas', 'turismo', 'productos',
        ];
        foreach ($verticals as $vertical) {
            $xml .= $this->urlEntry("{$baseUrl}/{$vertical}", 'daily', '0.9', $now);
        }

        // Factual source pages and legal pages with canonical frontend routes.
        $legalPages = [
            'como-funciona' => ['monthly', '0.8'],
            'seguridad' => ['monthly', '0.8'],
            'ayuda/publicar-anuncio' => ['monthly', '0.8'],
            'ayuda/comprar-y-contactar' => ['monthly', '0.8'],
            'tarifas' => ['monthly', '0.8'],
            'sobre-mercasto' => ['monthly', '0.7'],
            'terminos' => ['monthly', '0.6'],
            'privacidad' => ['monthly', '0.6'],
            'cookies' => ['monthly', '0.5'],
            'contacto' => ['monthly', '0.5'],
            'ayuda' => ['monthly', '0.5'],
            'reembolsos' => ['monthly', '0.5'],
            'moderacion' => ['monthly', '0.5'],
        ];

        foreach ($legalPages as $page => [$freq, $priority]) {
            $xml .= $this->urlEntry("{$baseUrl}/{$page}", $freq, $priority, $now);
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function generateCategoriesSitemap()
    {
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        $categories = Category::all();
        
        $verticalRoutes = [
            'motor' => 'motor',
            'inmobiliaria' => 'inmuebles',
            'empleo' => 'empleos',
            'servicios' => 'servicios',
            'electronica' => 'electronica',
            'hogar' => 'hogar',
            'moda' => 'moda',
            'ocio' => 'ocio',
            'infantil' => 'infantil',
            'mascotas' => 'mascotas',
            'negocios' => 'negocios',
            'boletos' => 'boletos',
            'turismo' => 'turismo',
            'productos' => 'productos',
        ];

        $seenUrls = [];
        foreach ($categories as $category) {
            $route = $verticalRoutes[$category->slug] ?? null;
            if (!$route) {
                // Query-filter pages canonicalize to the generic catalog/home and must not
                // be advertised as standalone search landing pages.
                continue;
            }
            $url = "{$baseUrl}/{$route}";
            if (isset($seenUrls[$url])) {
                continue;
            }
            $seenUrls[$url] = true;
            $xml .= $this->urlEntry(
                $url,
                'daily',
                '0.8',
                ($category->updated_at ? $category->updated_at->toW3cString() : now()->toW3cString())
            );
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function generateStatesSitemap()
    {
        // State-filter URLs currently canonicalize to the homepage. Keep the legacy
        // endpoint valid but empty until dedicated state landing routes exist.
        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" .
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n" .
            "</urlset>\n";
    }

    private function generateAdsSitemap()
    {
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Последние 10000 активных объявлений
        $ads = Ad::whereIn('status', ['approved', 'active'])
            ->orderBy('updated_at', 'desc')
            ->limit(10000)
            ->get(['id', 'title', 'updated_at']);

        foreach ($ads as $ad) {
            $xml .= $this->urlEntry(
                "{$baseUrl}/ads/{$ad->id}",
                'daily',
                '0.7',
                $ad->updated_at->toW3cString()
            );
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function urlEntry($loc, $changefreq, $priority, $lastmod)
    {
        return "  <url>\n" .
               "    <loc>{$loc}</loc>\n" .
               "    <lastmod>{$lastmod}</lastmod>\n" .
               "    <changefreq>{$changefreq}</changefreq>\n" .
               "    <priority>{$priority}</priority>\n" .
               "  </url>\n";
    }
}
