<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('subject', 'Mercasto')</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F1F5F9; margin: 0; padding: 0; color: #0F172A;
            -webkit-text-size-adjust: 100%;
        }
        .wrapper { width: 100%; padding: 32px 16px; background-color: #F1F5F9; }
        .container {
            max-width: 600px; margin: 0 auto; background: #ffffff;
            border-radius: 16px; overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04);
        }
        .header { background-color: #0F172A; padding: 28px 32px; text-align: center; }
        .logo-badge {
            display: inline-block; width: 40px; height: 40px; background-color: #84CC16;
            border-radius: 10px; font-size: 22px; font-weight: 800; color: #0F172A;
            line-height: 40px; text-align: center; vertical-align: middle; margin-right: 8px;
        }
        .logo-name { font-size: 22px; font-weight: 700; color: #F8FAFC; vertical-align: middle; letter-spacing: -0.5px; }
        .content { padding: 40px 36px; }
        h1 { font-size: 22px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; line-height: 1.3; }
        p { font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 16px 0; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn {
            display: inline-block; background-color: #84CC16; color: #0F172A !important;
            text-decoration: none; padding: 14px 36px; border-radius: 10px;
            font-weight: 700; font-size: 15px; letter-spacing: 0.1px;
        }
        .divider { border: none; border-top: 1px solid #E2E8F0; margin: 24px 0; }
        .message-preview {
            background: #F8FAFC; border-left: 4px solid #84CC16;
            border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 16px 0;
            font-size: 14px; color: #334155; font-style: italic;
        }
        .ad-card { border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
        .ad-card-body { padding: 14px 16px; }
        .ad-title { font-weight: 600; color: #0F172A; font-size: 15px; margin: 0 0 4px 0; }
        .ad-price { color: #65A30D; font-weight: 700; font-size: 16px; margin: 0 0 4px 0; }
        .ad-location { color: #94A3B8; font-size: 13px; margin: 0; }
        .ad-link { display: inline-block; color: #84CC16; text-decoration: none; font-size: 13px; margin-top: 6px; font-weight: 600; }
        .stars { color: #F59E0B; font-size: 22px; letter-spacing: 3px; margin: 8px 0; }
        .fallback-url { font-size: 12px; color: #94A3B8; word-break: break-all; margin-top: 20px; padding-top: 20px; border-top: 1px solid #F1F5F9; }
        .fallback-url a { color: #84CC16; }
        .info-box { background: #F8FAFC; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #64748B; margin: 16px 0; }
        .footer {
            background-color: #F8FAFC; border-top: 1px solid #E2E8F0;
            padding: 24px 36px; text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.6;
        }
        .footer a { color: #84CC16; text-decoration: none; }
        @media only screen and (max-width: 480px) {
            .content { padding: 28px 20px; } .footer { padding: 20px; } h1 { font-size: 20px; }
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="container">
        <div class="header">
            <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}" style="text-decoration:none;">
                <span class="logo-badge">M</span>
                <span class="logo-name">Mercasto</span>
            </a>
        </div>
        <div class="content">
            @yield('content')
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Mercasto &middot; M&eacute;xico<br>
            Recibiste este correo porque tienes una cuenta en
            <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}">mercasto.com</a>.<br>
            <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/configuracion?tab=notificaciones">
                Gestionar preferencias de notificaciones
            </a>
        </div>
    </div>
</div>
</body>
</html>
