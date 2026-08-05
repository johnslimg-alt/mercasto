@extends('emails.layout')

@section('subject', $adCount === 1
    ? 'Corrige tu anuncio para publicarlo'
    : 'Corrige tus anuncios para publicarlos')

@section('preheader', 'Revisa los datos indicados y vuelve a enviar tus anuncios a moderación.')

@section('content')
    <h1>{{ $adCount === 1 ? 'Tu anuncio necesita una corrección' : 'Tus anuncios necesitan correcciones' }}</h1>

    <p>Hola, <strong>{{ $user->name ?? 'vendedor' }}</strong>.</p>

    <p>
        @if($adCount === 1)
            Tienes <strong>1 anuncio oculto</strong> que puede volver a publicarse después de corregir su información.
        @else
            Tienes <strong>{{ $adCount }} anuncios ocultos</strong> que pueden volver a publicarse después de corregir su información.
        @endif
    </p>

    <div class="info-box">
        <strong>Qué debes revisar:</strong>
        <ul>
            @foreach(array_slice($messages, 0, 4) as $message)
                <li>{{ $message }}</li>
            @endforeach
        </ul>
    </div>

    <div class="btn-wrapper">
        <a href="{{ $actionUrl }}" class="btn">Corregir y volver a enviar</a>
    </div>

    <p>Al guardar cambios importantes, el anuncio se enviará automáticamente a una nueva moderación. No se publicará hasta que la revisión termine correctamente.</p>

    <p class="fallback-url">
        Si el botón no funciona, abre este enlace:<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </p>
@endsection

@section('footer_reason', 'Recibes este mensaje de servicio porque publicaste anuncios en Mercasto.')
