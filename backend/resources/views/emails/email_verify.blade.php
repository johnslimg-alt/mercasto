@extends('emails.layout')

@section('subject', __('emails.email_verify.subject'))

@section('preheader', __('emails.email_verify.preheader'))

@section('content')
    <h1>{{ __('emails.email_verify.title') }}</h1>

    <p>{{ __('emails.common.greeting', ['name' => $userName]) }}</p>

    <p>{{ __('emails.email_verify.intro') }}</p>

    <p>{{ __('emails.email_verify.description') }}</p>

    <div class="btn-wrapper">
        <a href="{{ $verificationUrl }}" class="btn">{{ __('emails.email_verify.button') }}</a>
    </div>

    <div class="info-box">
        {{ __('emails.email_verify.ignore') }}
    </div>

    <div class="fallback-url">
        <p style="margin: 0 0 6px 0;">{{ __('emails.common.button_not_working') }}</p>
        <a href="{{ $verificationUrl }}">{{ $verificationUrl }}</a>
    </div>
@endsection
