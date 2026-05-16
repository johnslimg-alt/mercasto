@extends('emails.layout')

@section('subject', $newAds->count() . " nuevos anuncios para tu alerta '{$alert->name}'")

@section('content')
    <h1>{{ $newAds->count() }} nuevo{{ $newAds->count() !== 1 ? 's' : '' }} anuncio{{ $newAds->count() !== 1 ? 's' : '' }} para ti 🔔</h1>

    <p>
        Encontramos <strong>{{ $newAds->count() }} anuncio{{ $newAds->count() !== 1 ? 's' : '' }} nuevo{{ $newAds->count() !== 1 ? 's' : '' }}</strong>
        que coinciden con tu alerta <strong>"{{ $alert->name }}"</strong>:
    </p>

    @foreach($newAds as $ad)
        <div class="ad-card">
            @if($ad->image_url)
                <img src="{{ $ad->image_url }}" alt="{{ $ad->title }}"
                     style="width:100%; max-height:180px; object-fit:cover; display:block;">
            @endif
            <div class="ad-card-body">
                <p class="ad-title">{{ $ad->title }}</p>
                @if($ad->price)
                    <p class="ad-price">${{ number_format($ad->price, 0, '.', ',') }}</p>
                @endif
                @if($ad->location)
                    <p class="ad-location">📍 {{ $ad->location }}</p>
                @endif
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/anuncios/{{ $ad->id }}" class="ad-link">
                    Ver anuncio &rarr;
                </a>
            </div>
        </div>
    @endforeach

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/buscar?q={{ urlencode($alert->query ?? '') }}&alerta={{ $alert->id }}" class="btn">
            Ver todos los resultados
        </a>
    </div>

    <hr class="divider">

    <p style="font-size: 13px; color: #94A3B8; text-align: center;">
        Puedes
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/alertas" style="color: #84CC16;">administrar tus alertas</a>
        o desactivar esta notificación en cualquier momento.
    </p>
@endsection
