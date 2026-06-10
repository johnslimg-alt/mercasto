@extends('emails.layout')

@section('subject', $buyerName . " está interesado en tu anuncio '" . $adTitle . "'")

@section('content')
    <h1>Tienes una nueva consulta 📩</h1>

    <p>
        <strong>{{ $buyerName }}</strong> te ha escrito sobre tu anuncio
        <strong>"{{ $adTitle }}"</strong>:
    </p>

    <div class="message-preview">
        {{ Str::limit($messageBody, 1000) }}
    </div>

    <p>
        Puedes responder directamente a este correo para contactar a {{ $buyerName }}.
    </p>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/?ad={{ $adId }}" class="btn">
            Ver anuncio
        </a>
    </div>

    <hr class="divider">

    <p style="font-size: 13px; color: #94A3B8;">
        Recibes este correo porque un comprador usó el formulario de contacto de Mercasto.
        Tu dirección de correo no fue compartida con el comprador.
        Nunca compartas datos de pago por correo y desconfía de pagos anticipados.
    </p>
@endsection
