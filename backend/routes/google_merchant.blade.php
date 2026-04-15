<?= '<?xml version="1.0" encoding="UTF-8"?>' ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
    <title>Mercasto - Feed de Productos</title>
    <link>{{ env('FRONTEND_URL') }}</link>
    <description>Listado de productos de Mercasto para Google Merchant Center.</description>
    @foreach($ads as $ad)
    <item>
        <g:id>{{ $ad->id }}</g:id>
        <g:title><![CDATA[{{ $ad->title }}]]></g:title>
        <g:description><![CDATA[{{ Str::limit(strip_tags($ad->description), 5000) }}]]></g:description>
        <g:link>{{ env('FRONTEND_URL') }}/?ad={{ $ad->id }}</g:link>
        @php
            $images = is_string($ad->image_url) ? json_decode($ad->image_url, true) : [];
            $mainImage = is_array($images) && count($images) > 0 ? $images[0] : null;
        @endphp
        @if($mainImage)
        <g:image_link>{{ asset('storage/' . $mainImage) }}</g:image_link>
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