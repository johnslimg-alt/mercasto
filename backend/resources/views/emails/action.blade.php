@php
    $rawTitle = (string) ($title ?? '');
    $emailKey = $emailKey ?? null;
    if (!$emailKey && str_contains($rawTitle, 'Restablecer')) {
        $emailKey = 'password_reset';
    }
    if (!$emailKey && str_contains($rawTitle, 'Confirma')) {
        $emailKey = 'email_change';
    }

    $titleText = $emailKey ? __('emails.' . $emailKey . '.title') : $rawTitle;
    $bodyText = $emailKey ? __('emails.' . $emailKey . '.description') : ($body ?? '');
    $buttonText = $emailKey ? __('emails.' . $emailKey . '.button') : ($actionText ?? 'Open');
    $footerText = $emailKey ? __('emails.' . $emailKey . '.ignore') : ($footer ?? '');
    $emailLocale = app()->getLocale();
@endphp
<!DOCTYPE html>
<html lang="{{ $emailLocale }}" dir="{{ \App\Support\MailLocale::rtl($emailLocale) ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $titleText }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #0F172A; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #0F172A; padding: 30px; text-align: center; }
        .header h2 { color: #84CC16; margin: 0; font-size: 28px; letter-spacing: -1px; }
        .content { padding: 40px 30px; }
        h1 { font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #0F172A; }
        p { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
        .btn-wrapper { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background-color: #84CC16; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .btn:hover { background-color: #65A30D; }
        .fallback-link { margin-top: 30px; font-size: 13px; padding-top: 20px; border-top: 1px solid #F1F5F9; }
        .fallback-link a { color: #65A30D; word-break: break-all; }
        .footer { background-color: #F1F5F9; padding: 24px 30px; text-align: center; font-size: 13px; color: #94A3B8; line-height: 1.5; }
        .footer a { color: #65A30D; text-decoration: none; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Mercasto</h2>
        </div>
        <div class="content">
            <h1>{{ $titleText }}</h1>
            <p>{{ $bodyText }}</p>
            
            <div class="btn-wrapper">
                <a href="{{ $actionUrl }}" class="btn">{{ $buttonText }}</a>
            </div>
            
            <p>{{ $footerText }}</p>
            
            <div class="fallback-link">
                <p style="margin-bottom: 5px; color: #94A3B8;">{{ __('emails.common.button_not_working') }}</p>
                <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Mercasto · {{ __('emails.layout.made_in_mexico') }}<br>
            {{ __('emails.layout.footer_reason') }} <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}">Mercasto.com</a>.
        </div>
    </div>
</body>
</html>
