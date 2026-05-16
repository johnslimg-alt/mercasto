@extends('emails.layout')

@section('subject', 'Verifica tu correo en Mercasto')

@section('content')
    <h1>Verifica tu dirección de correo</h1>

    <p>Hola <strong>{{ $userName }}</strong>, gracias por registrarte en Mercasto.</p>

    <p>Para completar tu registro y acceder a todas las funciones de la plataforma, haz clic en el botón de abajo para verificar tu correo electrónico.</p>

    <div class="btn-wrapper">
        <a href="{{ $verificationUrl }}" class="btn">Verificar correo</a>
    </div>

    <div class="info-box">
        ⏰ <strong>Este enlace expira en 60 minutos.</strong><br>
        Si no solicitaste esto, puedes ignorar este correo de forma segura.
    </div>

    <div class="fallback-url">
        <p style="margin: 0 0 6px 0;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <a href="{{ $verificationUrl }}">{{ $verificationUrl }}</a>
    </div>
@endsection
