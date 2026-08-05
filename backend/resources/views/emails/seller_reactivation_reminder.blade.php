@extends('emails.layout')

@section('subject', $stage === 'follow_up'
    ? 'Recordatorio: reactiva tus anuncios aprobados'
    : 'Tus anuncios están listos para reactivarse')

@section('preheader', 'Confirma disponibilidad, precio, estado y ubicación para volver a publicar.')

@section('content')
    <h1>{{ $stage === 'follow_up' ? 'Tus anuncios siguen esperando confirmación' : 'Tus anuncios fueron aprobados' }} ✅</h1>

    <p>Hola, <strong>{{ $user->name ?? 'vendedor' }}</strong>.</p>

    <p>
        @if($readyCount === 1)
            Tienes <strong>1 anuncio aprobado</strong>, pero todavía no está visible para los compradores.
        @else
            Tienes <strong>{{ $readyCount }} anuncios aprobados</strong>, pero todavía no están visibles para los compradores.
        @endif
    </p>

    <div class="info-box-success">
        Revisa que cada anuncio siga disponible y que el precio, el estado y la ubicación sean correctos. Después pulsa <strong>Confirmar y reactivar</strong>.
    </div>

    <div class="btn-wrapper">
        <a href="{{ $actionUrl }}" class="btn">Confirmar y publicar</a>
    </div>

    <p>Al confirmar, el anuncio se publicará durante <strong>7 días</strong>. Después podrás renovarlo por <strong>$49 MXN</strong> durante otros 7 días.</p>

    <p class="fallback-url">
        Si el botón no funciona, abre este enlace:<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </p>
@endsection

@section('footer_reason', 'Recibes este mensaje de servicio porque publicaste anuncios en Mercasto.')
