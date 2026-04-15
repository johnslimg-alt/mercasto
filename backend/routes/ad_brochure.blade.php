<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Ficha de Propiedad - {{ $ad->title }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; font-size: 12px; line-height: 1.6; }
        .page-break { page-break-after: always; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 24px; color: #0D4A30; margin: 0; }
        .header p { font-size: 14px; color: #D02F35; margin: 0; }
        .main-image { width: 100%; height: 350px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        .details h2 { font-size: 20px; color: #0D4A30; border-bottom: 2px solid #84CC16; padding-bottom: 5px; margin-bottom: 10px; }
        .price { font-size: 28px; font-weight: bold; color: #D02F35; text-align: right; margin-bottom: 20px; }
        .description { margin-bottom: 20px; }
        .footer { position: fixed; bottom: -30px; left: 0; right: 0; text-align: center; font-size: 10px; color: #777; }
        .qr-section { text-align: center; margin-top: 30px; }
        .qr-section p { font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border: 1px solid #eee; }
        .label { font-weight: bold; color: #555; width: 30%; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mercasto Inmobiliaria</h1>
        <p>Ficha de Propiedad</p>
    </div>

    @php
        $images = is_string($ad->image_url) ? json_decode($ad->image_url, true) : $ad->image_url;
        $mainImage = is_array($images) && count($images) > 0 ? $images[0] : null;
    @endphp

    @if($mainImage)
        <img src="{{ public_path('storage/' . $mainImage) }}" class="main-image" alt="{{ $ad->title }}">
    @endif

    <div class="details">
        <h2>{{ $ad->title }}</h2>
        <div class="price">${{ number_format($ad->price, 2) }} MXN</div>
        
        <table>
            <tr><td class="label">Ubicación:</td><td>{{ $ad->location }}</td></tr>
            <tr><td class="label">Categoría:</td><td>Inmuebles</td></tr>
            <tr><td class="label">Vendedor:</td><td>{{ $ad->user->name }}</td></tr>
        </table>
    </div>

    <div class="description">
        <h2>Descripción</h2>
        <p>{{ $ad->description }}</p>
    </div>

    <div class="qr-section">
        <p>Escanea para ver el anuncio en línea y contactar al vendedor:</p>
        <img src="{{ $qrCodeUrl }}" alt="QR Code">
    </div>

    <div class="footer">
        Generado por Mercasto.com el {{ date('d/m/Y') }} | Anuncio ID: {{ $ad->id }}
    </div>
</body>
</html>