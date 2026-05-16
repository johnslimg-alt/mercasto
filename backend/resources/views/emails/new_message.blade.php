@extends('emails.layout')

@section('subject', $senderName . " te envió un mensaje sobre '" . $adTitle . "'")

@section('content')
    <h1>Tienes un nuevo mensaje 💬</h1>

    <p>
        <strong>{{ $senderName }}</strong> te ha enviado un mensaje sobre el anuncio
        <strong>"{{ $adTitle }}"</strong>:
    </p>

    <div class="message-preview">
        {{ Str::limit($messageBody, 200) }}
    </div>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/mensajes/{{ $conversationId }}" class="btn">
            Ver mensaje
        </a>
    </div>

    <hr class="divider">

    <p style="font-size: 13px; color: #94A3B8;">
        Recibes este correo porque {{ $senderName }} inició una conversación contigo en Mercasto.
        Si no deseas recibir notificaciones de mensajes, puedes desactivarlas en tu
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/configuracion?tab=notificaciones" style="color: #84CC16;">configuración de notificaciones</a>.
    </p>
@endsection
