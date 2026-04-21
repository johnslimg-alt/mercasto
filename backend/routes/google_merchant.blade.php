<?= '<?xml version="1.0" encoding="UTF-8"?>' ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
    <title>Mercasto - Feed de Productos</title>
    <link>{{ config('app.frontend_url', 'https://mercasto.com') }}</link>
    <description>Listado de productos de Mercasto para Google Merchant Center.</description>
    @foreach($ads as $ad)
    <item>
        <g:id>{{ $ad->id }}</g:id>
        <g:title><![CDATA[{{ str_replace(']]>', ']]]]><![CDATA[>', \Illuminate\Support\Str::limit($ad->title, 150)) }}]]></g:title>
        <g:description><![CDATA[{{ str_replace(']]>', ']]]]><![CDATA[>', \Illuminate\Support\Str::limit(strip_tags($ad->description), 5000)) }}]]></g:description>
        <g:link>{{ config('app.frontend_url', 'https://mercasto.com') }}/?ad={{ $ad->id }}</g:link>
        @php
            $images = is_string($ad->image_url) ? json_decode($ad->image_url, true) : [];
            $mainImage = is_array($images) && count($images) > 0 ? $images[0] : null;
        @endphp
        @if($mainImage)
        @php
            // Защита от битых ссылок при использовании AWS S3 / Cloudflare R2
            $imageUrl = str_starts_with($mainImage, 'http') 
                ? $mainImage 
                : \Illuminate\Support\Facades\Storage::disk('public')->url($mainImage);
        @endphp
        <g:image_link><![CDATA[{{ $imageUrl }}]]></g:image_link>
        @endif
        <g:availability>in stock</g:availability>
        <g:price>{{ number_format($ad->price, 2, '.', '') }} MXN</g:price>
        <g:condition>{{ $ad->condition === 'nuevo' ? 'new' : 'used' }}</g:condition>
        <g:brand><![CDATA[{{ $ad->user->name ?? 'Mercasto' }}]]></g:brand>
        <g:identifier_exists>no</g:identifier_exists>
    </item>
    @endforeach
</channel>
</rss>