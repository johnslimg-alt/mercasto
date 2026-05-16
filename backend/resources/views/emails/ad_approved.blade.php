@extends('emails.layout')

@section('subject', "¡Tu anuncio fue aprobado! '{$ad->title}'")

@section('content')
    <h1>¡Tu anuncio fue aprobado! ✅</h1>

    <p>Buenas noticias, <strong>{{ $ad->user->name ?? 'vendedor' }}</strong>. Tu anuncio ha sido revisado y aprobado por nuestro equipo de moderación. Ya está visible para todos los compradores en Mercasto.</p>

    {{-- Ad card --}}
    <div class="ad-card">
        @if($ad->image_url)
            <img src="{{ $ad->image_url }}" alt="{{ $ad->title }}"
                 style="width:100%; max-height:220px; object-fit:cover; display:block;">
        @endif
        <div class="ad-card-body">
            <p class="ad-title">{{ $ad->title }}</p>
            @if($ad->price)
                <p class="ad-price">${{ number_format($ad->price, 0, '.', ',') }}</p>
            @endif
            @if($ad->location)
                <p class="ad-location">📍 {{ $ad->location }}</p>
            @endif
        </div>
    </div>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/anuncios/{{ $ad->id }}" class="btn">
            Ver tu anuncio
        </a>
    </div>

    <div class="info-box">
        💡 <strong>Consejo:</strong> Los anuncios con fotos claras y descripción detallada reciben hasta 3x más visitas.
        Puedes <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/mis-anuncios" style="color: #84CC16;">editar tu anuncio</a> en cualquier momento.
    </div>
@endsection
