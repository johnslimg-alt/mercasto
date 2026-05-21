@extends('emails.layout')

@section('subject', '🏷️ Anuncios de la semana para ti — Mercasto')

@section('content')
<h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 8px 0;">
    Hola {{ $user->name }},
</h1>
<p style="font-size:15px;color:#475569;margin:0 0 28px 0;">
    Esta semana encontramos estas ofertas para ti:
</p>

{{-- Ad grid: 2-col on desktop, 1-col on mobile via table layout --}}
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    @foreach ($ads->chunk(2) as $row)
    <tr>
        @foreach ($row as $ad)
        <td width="50%" valign="top" style="padding: 0 6px 12px 6px;">
            {{-- Card wrapper --}}
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;background:#fff;">
                {{-- Ad image --}}
                <tr>
                    <td style="padding:0;">
                        @if($ad->image_url)
                            <img src="{{ $ad->image_url }}"
                                 alt="{{ $ad->title }}"
                                 width="100%"
                                 style="display:block;width:100%;height:140px;object-fit:cover;border-radius:10px 10px 0 0;">
                        @else
                            <table width="100%" cellpadding="0" cellspacing="0"
                                   style="background:#F1F5F9;border-radius:10px 10px 0 0;">
                                <tr>
                                    <td align="center" style="height:140px;vertical-align:middle;">
                                        <span style="font-size:36px;">🏷️</span>
                                    </td>
                                </tr>
                            </table>
                        @endif
                    </td>
                </tr>
                {{-- Card body --}}
                <tr>
                    <td style="padding:12px 14px;">
                        <p style="font-weight:600;color:#0F172A;font-size:14px;
                                   margin:0 0 4px 0;line-height:1.4;">
                            {{ Str::limit($ad->title, 45) }}
                        </p>
                        <p style="color:#65A30D;font-weight:700;font-size:15px;margin:0 0 4px 0;">
                            @if($ad->price)
                                ${{ number_format($ad->price, 0, '.', ',') }} MXN
                            @else
                                Precio a tratar
                            @endif
                        </p>
                        <p style="color:#94A3B8;font-size:12px;margin:0 0 10px 0;">
                            📍 {{ implode(', ', array_filter([$ad->location, $ad->state])) ?: 'México' }}
                        </p>
                        <a href="https://mercasto.com/anuncio/{{ $ad->id }}"
                           style="display:inline-block;background-color:#84CC16;color:#0F172A;
                                  text-decoration:none;padding:8px 16px;border-radius:7px;
                                  font-weight:700;font-size:12px;">
                            Ver anuncio →
                        </a>
                    </td>
                </tr>
            </table>
        </td>
        @endforeach
        @if($row->count() === 1)
        <td width="50%"></td>
        @endif
    </tr>
    @endforeach
</table>

<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">

<p style="font-size:13px;color:#94A3B8;text-align:center;margin:0;">
    Para dejar de recibir estos correos, actualiza tus preferencias en
    <a href="https://mercasto.com/configuracion?tab=notificaciones"
       style="color:#84CC16;text-decoration:none;font-weight:600;">tu perfil</a>.
</p>
@endsection
