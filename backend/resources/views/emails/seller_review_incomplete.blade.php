@extends('emails.layout')

@section('subject', $adCount === 1
    ? 'No pudimos completar la revisión de tu anuncio'
    : 'No pudimos completar la revisión de tus anuncios')

@section('preheader', 'Un problema técnico impidió completar la revisión automática. Tus anuncios siguen sin publicarse.')

@section('content')
    <h1>{{ $adCount === 1 ? 'No pudimos completar la revisión de tu anuncio' : 'No pudimos completar la revisión de tus anuncios' }}</h1>

    <p>Hola, <strong>{{ $user->name ?? 'vendedor' }}</strong>.</p>

    <p>
        @if($adCount === 1)
            La revisión automática de <strong>1 de tus anuncios</strong> no pudo completarse por un problema técnico de nuestro lado.
        @else
            La revisión automática de <strong>{{ $adCount }} de tus anuncios</strong> no pudo completarse por un problema técnico de nuestro lado.
        @endif
        No es un error tuyo y no hay nada que debas corregir.
    </p>

    <div class="info-box">
        <strong>Qué significa esto:</strong>
        <ul>
            <li>El anuncio sigue sin publicarse.</li>
            <li>No necesitas editar ni volver a enviar nada por ahora.</li>
            <li>Si requerimos algún cambio de tu parte, te avisaremos por este medio.</li>
        </ul>
    </div>

    <div class="btn-wrapper">
        <a href="{{ $actionUrl }}" class="btn">Ver mis anuncios</a>
    </div>

    <p class="fallback-url">
        Si el botón no funciona, abre este enlace:<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </p>
@endsection

@section('footer_reason', 'Recibes este mensaje de servicio porque publicaste anuncios en Mercasto.')
