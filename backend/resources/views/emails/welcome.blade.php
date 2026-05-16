@extends('emails.layout')

@section('subject', '¡Bienvenido a Mercasto, ' . $user->name . '!')

@section('content')
    <h1>¡Bienvenido a Mercasto, {{ $user->name }}! 🎉</h1>

    <p>Nos alegra mucho que te hayas unido a la comunidad de compra y venta más grande de México. Tu cuenta está lista y puedes empezar a usar la plataforma ahora mismo.</p>

    <p>Esto es lo que puedes hacer en Mercasto:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top; width: 32px;">
                <span style="font-size: 20px;">📢</span>
            </td>
            <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #F1F5F9;">
                <strong style="color: #0F172A;">Publicar anuncios</strong><br>
                <span style="font-size: 14px; color: #64748B;">Vende lo que ya no necesitas en minutos.</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top;">
                <span style="font-size: 20px;">🔍</span>
            </td>
            <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #F1F5F9;">
                <strong style="color: #0F172A;">Buscar ofertas</strong><br>
                <span style="font-size: 14px; color: #64748B;">Encuentra artículos únicos cerca de ti.</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px 0; vertical-align: top;">
                <span style="font-size: 20px;">💬</span>
            </td>
            <td style="padding: 10px 0 10px 12px;">
                <strong style="color: #0F172A;">Mensajería segura</strong><br>
                <span style="font-size: 14px; color: #64748B;">Negocia directamente con compradores y vendedores.</span>
            </td>
        </tr>
    </table>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}" class="btn">Explorar Mercasto</a>
    </div>

    <p style="font-size: 13px; color: #94A3B8; text-align: center;">
        ¿Necesitas ayuda? Contáctanos en
        <a href="mailto:soporte@mercasto.com" style="color: #84CC16;">soporte@mercasto.com</a>
    </p>
@endsection
