@extends('emails.layout')

@section('subject', __('emails.password_reset.subject'))

@section('preheader', __('emails.password_reset.preheader'))

@section('content')
    <h1>🔐 {{ __('emails.password_reset.title') }}</h1>

    <p>{{ __('emails.common.greeting', ['name' => $userName]) }}</p>

    <p>{{ __('emails.password_reset.intro') }}</p>

    <div class="btn-wrapper">
        <a href="{{ $resetUrl }}" class="btn">{{ __('emails.password_reset.button') }}</a>
    </div>

    <div class="info-box-warning">
        ⏰ {{ __('emails.password_reset.expires', ['minutes' => $expiryMinutes ?? 60]) }}
    </div>

    <div class="info-box">
        {{ __('emails.password_reset.ignore') }}
    </div>

    <div class="fallback-url">
        <p style="margin: 0 0 6px 0;">{{ __('emails.common.button_not_working') }}</p>
        <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
    </div>
@endsection
