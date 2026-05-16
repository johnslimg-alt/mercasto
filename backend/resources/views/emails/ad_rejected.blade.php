@extends('emails.layout')

@section('subject', "Tu anuncio '{$ad->title}' necesita cambios")

@section('content')
    <h1>Tu anuncio necesita algunos cambios</h1>

    <p>Hola <strong>{{ $ad->user->name ?? 'vendedor' }}</strong>, hemos revisado tu anuncio
    <strong>"{{ $ad->title }}"</strong> y por el momento no puede publicarse.</p>

    @if($reason)
        <div style="background:#FEF2F2; border-left: 4px solid #EF4444; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 16px 0;">
            <strong style="color: #991B1B;">Motivo:</strong>
            <p style="color: #7F1D1D; margin: 6px 0 0 0; font-size: 14px;">{{ $reason }}</p>
        </div>
    @endif

    <p><strong>¿Cómo corregirlo?</strong> Aquí algunos consejos:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
        <tr>
            <td style="padding: 8px 0; vertical-align: top; width: 24px; font-size: 14px;">✔</td>
            <td style="padding: 8px 0 8px 10px; font-size: 14px; color: #475569;">Usa un título claro y descriptivo (ej: "iPhone 14 Pro 256GB negro")</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; font-size: 14px;">✔</td>
            <td style="padding: 8px 0 8px 10px; font-size: 14px; color: #475569;">Incluye fotos reales del artículo en buena iluminación</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; font-size: 14px;">✔</td>
            <td style="padding: 8px 0 8px 10px; font-size: 14px; color: #475569;">El precio debe ser razonable y en pesos mexicanos</td>
        </tr>
        <tr>
            <td style="padding: 8px 0; vertical-align: top; font-size: 14px;">✔</td>
            <td style="padding: 8px 0 8px 10px; font-size: 14px; color: #475569;">Asegúrate de que el artículo cumpla con nuestras
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/terminos" style="color: #84CC16;">políticas de uso</a></td>
        </tr>
    </table>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/mis-anuncios/{{ $ad->id }}/editar" class="btn">
            Editar anuncio
        </a>
    </div>

    <p style="font-size: 13px; color: #94A3B8; text-align: center;">
        ¿Crees que es un error? Escríbenos a
        <a href="mailto:soporte@mercasto.com" style="color: #84CC16;">soporte@mercasto.com</a>
    </p>
@endsection
