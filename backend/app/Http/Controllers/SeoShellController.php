<?php

namespace App\Http\Controllers;

use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SeoShellController extends Controller
{
    public function listings(): Response
    {
        $canonical = url('/listings');
        $description = 'Explora anuncios clasificados en todo México: autos, inmuebles, empleo, servicios, electrónica y más en Mercasto.';

        return $this->renderShell([
            'title' => 'Anuncios clasificados en México | Mercasto',
            'description' => $description,
            'canonical' => $canonical,
            'type' => 'website',
            'image' => url('/icon-512x512.png'),
            'robots' => 'index,follow,max-image-preview:large',
        ], [
            '@context' => 'https://schema.org',
            '@type' => 'CollectionPage',
            'name' => 'Anuncios clasificados en México',
            'description' => $description,
            'url' => $canonical,
            'inLanguage' => 'es-MX',
            'isPartOf' => [
                '@type' => 'WebSite',
                'name' => 'Mercasto',
                'url' => url('/'),
            ],
        ]);
    }

    public function vertical(Request $request): Response
    {
        $path = trim($request->path(), '/');
        $pages = config('vertical_seo.pages', []);
        $page = $pages[$path] ?? null;

        if (! is_array($page)) {
            abort(404);
        }

        $canonical = url('/' . $path);
        $organizationId = url('/#organization');
        $websiteId = url('/#website');

        return $this->renderShell([
            'title' => $page['title'],
            'description' => $page['description'],
            'canonical' => $canonical,
            'type' => 'website',
            'image' => url('/icon-512x512.png'),
            'robots' => 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
        ], [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'CollectionPage',
                    '@id' => $canonical . '#collection',
                    'url' => $canonical,
                    'name' => $page['title'],
                    'description' => $page['description'],
                    'inLanguage' => 'es-MX',
                    'isPartOf' => ['@id' => $websiteId],
                    'publisher' => ['@id' => $organizationId],
                ],
                [
                    '@type' => 'BreadcrumbList',
                    '@id' => $canonical . '#breadcrumb',
                    'itemListElement' => [
                        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Inicio', 'item' => url('/')],
                        ['@type' => 'ListItem', 'position' => 2, 'name' => $page['name'], 'item' => $canonical],
                    ],
                ],
                [
                    '@type' => 'Organization',
                    '@id' => $organizationId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'logo' => url('/icon-512x512.png'),
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => $websiteId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'inLanguage' => 'es-MX',
                    'publisher' => ['@id' => $organizationId],
                ],
            ],
        ]);
    }

    public function verticalAlias(Request $request): Response
    {
        $path = trim($request->path(), '/');
        $canonicalPath = config('vertical_seo.aliases.' . $path);
        $page = $canonicalPath ? config('vertical_seo.pages.' . $canonicalPath) : null;

        if (! is_string($canonicalPath) || ! is_array($page)) {
            abort(404);
        }

        $canonical = url('/' . $canonicalPath);

        return $this->renderShell([
            'title' => $page['title'],
            'description' => $page['description'],
            'canonical' => $canonical,
            'type' => 'website',
            'image' => url('/icon-512x512.png'),
            'robots' => 'noindex,follow,max-image-preview:large',
        ], [
            '@context' => 'https://schema.org',
            '@type' => 'WebPage',
            'name' => $page['title'],
            'description' => $page['description'],
            'url' => $canonical,
            'isPartOf' => [
                '@type' => 'WebSite',
                'name' => 'Mercasto',
                'url' => url('/'),
            ],
        ]);
    }

    public function publicPage(Request $request): Response
    {
        $path = trim($request->path(), '/');
        $pages = config('public_seo.pages', []);
        $page = $pages[$path] ?? null;

        if (! is_array($page)) {
            abort(404);
        }

        $canonical = url('/' . $path);
        $organizationId = url('/#organization');
        $websiteId = url('/#website');

        return $this->renderShell([
            'title' => $page['title'],
            'description' => $page['description'],
            'canonical' => $canonical,
            'type' => 'website',
            'image' => url('/icon-512x512.png'),
            'robots' => 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
        ], [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => $page['type'],
                    '@id' => $canonical . '#webpage',
                    'url' => $canonical,
                    'name' => $page['title'],
                    'description' => $page['description'],
                    'inLanguage' => 'es-MX',
                    'isPartOf' => ['@id' => $websiteId],
                    'publisher' => ['@id' => $organizationId],
                ],
                [
                    '@type' => 'BreadcrumbList',
                    '@id' => $canonical . '#breadcrumb',
                    'itemListElement' => [
                        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Inicio', 'item' => url('/')],
                        ['@type' => 'ListItem', 'position' => 2, 'name' => $page['name'], 'item' => $canonical],
                    ],
                ],
                [
                    '@type' => 'Organization',
                    '@id' => $organizationId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'logo' => url('/icon-512x512.png'),
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => $websiteId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'inLanguage' => 'es-MX',
                    'publisher' => ['@id' => $organizationId],
                ],
            ],
        ]);
    }

    public function source(Request $request): Response
    {
        $path = trim($request->path(), '/');
        $pages = config('seo_source_pages.pages', []);
        $page = $pages[$path] ?? null;

        if (! is_array($page)) {
            abort(404);
        }

        $canonical = url('/' . $path);
        $organizationId = url('/#organization');
        $websiteId = url('/#website');

        return $this->renderShell([
            'title' => $page['title'],
            'description' => $page['description'],
            'canonical' => $canonical,
            'type' => 'website',
            'image' => url('/icon-512x512.png'),
            'robots' => 'index,follow,max-image-preview:large',
        ], [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => $page['type'],
                    '@id' => $canonical . '#webpage',
                    'url' => $canonical,
                    'name' => $page['title'],
                    'description' => $page['description'],
                    'inLanguage' => 'es-MX',
                    'dateModified' => config('seo_source_pages.updated_at'),
                    'isPartOf' => ['@id' => $websiteId],
                    'publisher' => ['@id' => $organizationId],
                ],
                [
                    '@type' => 'BreadcrumbList',
                    '@id' => $canonical . '#breadcrumb',
                    'itemListElement' => [
                        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Inicio', 'item' => url('/')],
                        ['@type' => 'ListItem', 'position' => 2, 'name' => $page['name'], 'item' => $canonical],
                    ],
                ],
                [
                    '@type' => 'Organization',
                    '@id' => $organizationId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'logo' => url('/icon-512x512.png'),
                    'contactPoint' => [
                        '@type' => 'ContactPoint',
                        'contactType' => 'customer support',
                        'url' => url('/contacto'),
                        'availableLanguage' => ['es'],
                    ],
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => $websiteId,
                    'name' => 'Mercasto',
                    'url' => url('/'),
                    'inLanguage' => 'es-MX',
                    'publisher' => ['@id' => $organizationId],
                ],
            ],
        ]);
    }

    public function ad(int $id): Response
    {
        $ad = Ad::query()->where('status', 'active')->findOrFail($id);
        $title = Str::limit($this->localized($ad->title) ?: 'Anuncio en Mercasto', 80, '');
        $description = Str::limit(
            trim(strip_tags($this->localized($ad->description))) ?: 'Mira esta referencia en Mercasto, plataforma de clasificados para México.',
            180,
            '',
        );
        $canonical = url('/ads/' . $ad->id);
        $image = $this->resolveImage($ad);
        $isCatalogFiller = (bool) $ad->is_catalog_filler;
        $isCurrentlyAvailable = $ad->expires_at && $ad->expires_at->isFuture();
        $isIndexableListing = ! $isCatalogFiller && $isCurrentlyAvailable;

        if (! $isIndexableListing) {
            return $this->renderShell([
                'title' => $isCatalogFiller
                    ? $title . ' | Catálogo Mercasto'
                    : $title . ' | Anuncio no disponible',
                'description' => $description,
                'canonical' => $canonical,
                'type' => 'website',
                'image' => $image,
                'robots' => 'noindex,follow,max-image-preview:large',
            ], [
                '@context' => 'https://schema.org',
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'image' => $image,
                'url' => $canonical,
                'isPartOf' => [
                    '@type' => 'WebSite',
                    'name' => 'Mercasto',
                    'url' => url('/'),
                ],
            ]);
        }

        $price = number_format((float) $ad->price, 2, '.', '');

        return $this->renderShell([
            'title' => $title . ' | Mercasto',
            'description' => $description,
            'canonical' => $canonical,
            'type' => 'product',
            'image' => $image,
            'robots' => 'index,follow,max-image-preview:large',
        ], [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $title,
            'description' => $description,
            'image' => [$image],
            'url' => $canonical,
            'offers' => [
                '@type' => 'Offer',
                'url' => $canonical,
                'price' => $price,
                'priceCurrency' => 'MXN',
                'availability' => 'https://schema.org/InStock',
                'itemCondition' => $ad->condition === 'nuevo'
                    ? 'https://schema.org/NewCondition'
                    : 'https://schema.org/UsedCondition',
            ],
        ]);
    }

    private function renderShell(array $meta, array $schema): Response
    {
        $url = (string) config('app.frontend_shell_url', 'http://mercasto-frontend:8081/index.html');
        $frontend = Http::timeout(3)->accept('text/html')->get($url);

        if (! $frontend->successful() || ! str_contains($frontend->body(), '<div id="root"></div>')) {
            throw new RuntimeException('Frontend shell is unavailable.');
        }

        $html = $frontend->body();
        $html = $this->replaceFirst($html, '#<title>.*?</title>#si', '<title>' . e($meta['title']) . '</title>');
        $html = $this->replaceMeta($html, 'name', 'description', $meta['description']);
        $html = $this->replaceMeta($html, 'property', 'og:type', $meta['type']);
        $html = $this->replaceMeta($html, 'property', 'og:title', $meta['title']);
        $html = $this->replaceMeta($html, 'property', 'og:description', $meta['description']);
        $html = $this->replaceMeta($html, 'property', 'og:url', $meta['canonical']);
        $html = $this->replaceMeta($html, 'property', 'og:image', $meta['image']);
        $html = $this->replaceMeta($html, 'name', 'twitter:title', $meta['title']);
        $html = $this->replaceMeta($html, 'name', 'twitter:description', $meta['description']);
        $html = $this->replaceMeta($html, 'name', 'twitter:image', $meta['image']);
        $html = $this->replaceFirst(
            $html,
            '#<link\s+rel="canonical"\s+href="[^"]*"\s*/?>#i',
            '<link rel="canonical" href="' . e($meta['canonical']) . '" />',
        );

        $robots = '<meta name="robots" content="' . e($meta['robots']) . '" />';
        if (preg_match('#<meta\s+name="robots"\s+content="[^"]*"\s*/?>#i', $html)) {
            $html = $this->replaceFirst($html, '#<meta\s+name="robots"\s+content="[^"]*"\s*/?>#i', $robots);
        } else {
            $html = $this->replaceFirst($html, '#</head>#i', "  {$robots}\n</head>");
        }

        $json = json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        $html = $this->replaceFirst(
            $html,
            '#<script\s+type="application/ld\+json"(?:\s+id="schema-ld-json")?\s*>.*?</script>#si',
            '<script type="application/ld+json" id="schema-ld-json">' . $json . '</script>',
        );

        return response($html, 200)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=60, s-maxage=60');
    }

    private function replaceMeta(string $html, string $attribute, string $key, string $content): string
    {
        $pattern = '#<meta\s+' . preg_quote($attribute, '#') . '="' . preg_quote($key, '#') . '"\s+content="[^"]*"\s*/?>#i';
        $replacement = '<meta ' . $attribute . '="' . e($key) . '" content="' . e($content) . '" />';

        return $this->replaceFirst($html, $pattern, $replacement);
    }

    private function replaceFirst(string $html, string $pattern, string $replacement): string
    {
        $updated = preg_replace_callback($pattern, static fn () => $replacement, $html, 1, $count);
        if ($updated === null || $count !== 1) {
            throw new RuntimeException('Frontend shell metadata contract is missing.');
        }

        return $updated;
    }

    private function localized(mixed $value): string
    {
        if (is_array($value)) {
            return $this->pickLocale($value);
        }
        if (! is_string($value) || $value === '') {
            return $value === null ? '' : (string) $value;
        }
        $trimmed = trim($value);
        if (str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return $this->pickLocale($decoded);
            }
        }

        return $value;
    }

    private function pickLocale(array $values): string
    {
        foreach (['es', 'en'] as $key) {
            if (! empty($values[$key]) && is_string($values[$key])) {
                return $values[$key];
            }
        }
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                return $value;
            }
        }

        return '';
    }

    private function resolveImage(Ad $ad): string
    {
        $candidate = $this->firstImageCandidate($ad->image_url) ?? $this->firstImageCandidate($ad->image);
        if (! $candidate) {
            return url('/icon-512x512.png');
        }
        if (preg_match('#^https?://#i', $candidate)) {
            return $candidate;
        }
        $candidate = ltrim($candidate, '/');

        return str_starts_with($candidate, 'storage/') ? url('/' . $candidate) : url('/storage/' . $candidate);
    }

    private function firstImageCandidate(mixed $raw): ?string
    {
        if (is_array($raw)) {
            $first = $raw[0] ?? null;
            return is_string($first) && trim($first) !== '' ? trim($first) : null;
        }
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }
        $trimmed = trim($raw);
        if (str_starts_with($trimmed, '[')) {
            $decoded = json_decode($trimmed, true);
            return is_array($decoded) && isset($decoded[0]) && is_string($decoded[0]) ? trim($decoded[0]) : null;
        }

        return $trimmed;
    }
}
