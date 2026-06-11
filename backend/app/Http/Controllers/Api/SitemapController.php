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
        $content = Cache::remember('sitemap_main', 3600, function () {
            return $this->generateMainSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function categories()
    {
        $content = Cache::remember('sitemap_categories', 3600, function () {
            return $this->generateCategoriesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function states()
    {
        $content = Cache::remember('sitemap_states', 3600, function () {
            return $this->generateStatesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function ads()
    {
        $content = Cache::remember('sitemap_ads', 1800, function () {
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
            ['loc' => "{$baseUrl}/sitemap-states.xml", 'lastmod' => $now],
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
        $verticals = ['autos', 'inmuebles', 'servicios', 'empleos', 'electronica', 'muebles'];
        foreach ($verticals as $vertical) {
            $xml .= $this->urlEntry("{$baseUrl}/{$vertical}", 'daily', '0.9', $now);
        }

        // Страница магазинов
        $xml .= $this->urlEntry("{$baseUrl}/tiendas", 'weekly', '0.7', $now);

        // Юридические страницы
        $legalPages = [
            'terminos' => ['monthly', '0.6'],
            'privacidad' => ['monthly', '0.6'],
            'cookies' => ['monthly', '0.5'],
            'contacto' => ['monthly', '0.5'],
            'ayuda' => ['monthly', '0.5'],
            'safety' => ['monthly', '0.5'],
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
        
        foreach ($categories as $category) {
            $xml .= $this->urlEntry(
                "{$baseUrl}/categoria/{$category->slug}",
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
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach (self::MEXICO_STATES as $state) {
            $xml .= $this->urlEntry(
                "{$baseUrl}/estado/{$state}",
                'daily',
                '0.8',
                now()->toW3cString()
            );
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function generateAdsSitemap()
    {
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Последние 10000 активных объявлений
        $ads = Ad::where('status', 'approved')
            ->orderBy('updated_at', 'desc')
            ->limit(10000)
            ->get(['id', 'title', 'updated_at']);

        foreach ($ads as $ad) {
            $xml .= $this->urlEntry(
                "{$baseUrl}/ad/{$ad->id}",
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
