@extends('emails.layout')

@section('subject', __('emails.welcome.subject', ['name' => $user->name]))

@section('preheader', __('emails.welcome.preheader'))

@section('content')
    <h1>🎉 {{ __('emails.welcome.title', ['name' => $user->name]) }}</h1>

    <p>{{ __('emails.welcome.intro') }}</p>

    <p>{{ __('emails.welcome.description') }}</p>

    <h2>{{ __('emails.welcome.features_title') }}</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top; width: 32px;">
                <span style="font-size: 20px;">📢</span>
            </td>
            <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #F1F5F9;">
                <strong style="color: #0F172A;">{{ __('emails.welcome.feature_1_title') }}</strong><br>
                <span style="font-size: 14px; color: #64748B;">{{ __('emails.welcome.feature_1_desc') }}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top;">
                <span style="font-size: 20px;">🔍</span>
            </td>
            <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #F1F5F9;">
                <strong style="color: #0F172A;">{{ __('emails.welcome.feature_2_title') }}</strong><br>
                <span style="font-size: 14px; color: #64748B;">{{ __('emails.welcome.feature_2_desc') }}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; vertical-align: top;">
                <span style="font-size: 20px;">💬</span>
            </td>
            <td style="padding: 10px 0 10px 12px; border-bottom: 1px solid #F1F5F9;">
                <strong style="color: #0F172A;">{{ __('emails.welcome.feature_3_title') }}</strong><br>
                <span style="font-size: 14px; color: #64748B;">{{ __('emails.welcome.feature_3_desc') }}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px 0; vertical-align: top;">
                <span style="font-size: 20px;">🤖</span>
            </td>
            <td style="padding: 10px 0 10px 12px;">
                <strong style="color: #0F172A;">{{ __('emails.welcome.feature_4_title') }}</strong><br>
                <span style="font-size: 14px; color: #64748B;">{{ __('emails.welcome.feature_4_desc') }}</span>
            </td>
        </tr>
    </table>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}" class="btn">
            {{ __('emails.welcome.button') }}
        </a>
    </div>

    <div class="info-box">
        <strong>{{ __('emails.welcome.tip_title') }}</strong><br>
        {{ __('emails.welcome.tip_desc') }}
    </div>

    <p style="font-size: 13px; color: #94A3B8; text-align: center;">
        {{ __('emails.welcome.help') }}
        <a href="mailto:soporte@mercasto.com" style="color: #84CC16;">soporte@mercasto.com</a>
    </p>
@endsection
