<!DOCTYPE html>
@php($emailLocale = app()->getLocale())
<html lang="{{ $emailLocale }}" dir="{{ \App\Support\MailLocale::rtl($emailLocale) ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('subject', 'Mercasto')</title>
    <!-- Preheader (hidden preview text in inbox) -->
    <span style="display:none;font-size:0;max-height:0;mso-hide:all;overflow:hidden;">@yield('preheader', __('emails.layout.default_preheader'))</span>
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
        h2 { font-size: 18px; font-weight: 700; color: #0F172A; margin: 24px 0 12px 0; line-height: 1.4; }
        h3 { font-size: 16px; font-weight: 700; color: #0F172A; margin: 16px 0 8px 0; }
        p { font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 16px 0; }
        a { color: #84CC16; }
        ul, ol { color: #475569; font-size: 15px; line-height: 1.7; }
        ul li, ol li { margin: 6px 0; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn {
            display: inline-block; background-color: #84CC16; color: #0F172A !important;
            text-decoration: none; padding: 14px 36px; border-radius: 10px;
            font-weight: 700; font-size: 15px; letter-spacing: 0.1px;
        }
        .btn-secondary {
            display: inline-block; background-color: transparent; color: #84CC16 !important;
            text-decoration: none; padding: 12px 28px; border-radius: 10px;
            font-weight: 600; font-size: 14px; border: 2px solid #84CC16;
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
        .info-box-success { background: #ECFDF5; border-radius: 8px; padding: 14px 18px; font-size: 14px; color: #065F46; margin: 16px 0; }
        .info-box-warning { background: #FFFBEB; border-radius: 8px; padding: 14px 18px; font-size: 14px; color: #92400E; margin: 16px 0; }
        .position-badge {
            background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%);
            border: 2px solid #84CC16; border-radius: 12px;
            padding: 20px; text-align: center; margin: 20px 0;
        }
        .position-badge .position-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin: 0 0 4px 0; }
        .position-badge .position-number { font-size: 36px; font-weight: 800; color: #84CC16; margin: 0; line-height: 1; }
        .referral-box {
            background: #F8FAFC; border: 2px dashed #84CC16;
            border-radius: 10px; padding: 18px; text-align: center; margin: 16px 0;
        }
        .referral-box code {
            display: block; font-size: 22px; font-weight: 800; color: #0F172A;
            letter-spacing: 3px; font-family: 'Courier New', monospace; margin: 4px 0;
        }
        .feature-list { list-style: none; padding: 0; margin: 16px 0; }
        .feature-list li {
            padding: 12px 0; border-bottom: 1px solid #F1F5F9;
            font-size: 15px; color: #334155;
        }
        .feature-list li:last-child { border-bottom: none; }
        .social-links { text-align: center; margin: 16px 0; }
        .social-links a {
            display: inline-block; margin: 0 6px; color: #84CC16;
            text-decoration: none; font-size: 13px; font-weight: 600;
        }
        .footer {
            background-color: #F8FAFC; border-top: 1px solid #E2E8F0;
            padding: 24px 36px; text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.6;
        }
        .footer a { color: #84CC16; text-decoration: none; }
        @media only screen and (max-width: 480px) {
            .content { padding: 28px 20px; }
            .footer { padding: 20px; }
            h1 { font-size: 20px; }
            h2 { font-size: 17px; }
            .position-badge .position-number { font-size: 30px; }
            .btn { padding: 14px 24px; font-size: 14px; }
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
            <div class="social-links">
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}">@yield('footer_website_text', __('emails.layout.visit_site'))</a>
                &middot;
                <a href="mailto:soporte@mercasto.com">@yield('footer_support_text', __('emails.layout.support'))</a>
            </div>
            <p style="margin: 12px 0 6px 0;">
                &copy; {{ date('Y') }} Mercasto &middot; M&eacute;xico
            </p>
            <p style="margin: 0;">
                @yield('footer_reason', __('emails.layout.footer_reason'))
                <br>
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/configuracion?tab=notificaciones">
                    @yield('footer_unsubscribe_text', __('emails.layout.manage_preferences'))
                </a>
            </p>
        </div>
    </div>
</div>
</body>
</html>
