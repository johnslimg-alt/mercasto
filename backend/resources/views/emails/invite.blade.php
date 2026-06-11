@extends('emails.layout')

@section('subject', __('emails.invite.subject'))

@section('preheader', __('emails.invite.preheader'))

@section('content')
    <h1>🎟️ {{ __('emails.invite.title') }}</h1>

    <p>{{ __('emails.common.greeting', ['name' => $userName ?? 'there']) }}</p>

    <p>{{ __('emails.invite.intro') }}</p>

    <p><strong>{{ __('emails.invite.highlight') }}</strong></p>

    <ul class="feature-list">
        <li><span class="emoji">✅</span> {{ __('emails.invite.benefit_1') }}</li>
        <li><span class="emoji">✅</span> {{ __('emails.invite.benefit_2') }}</li>
        <li><span class="emoji">✅</span> {{ __('emails.invite.benefit_3') }}</li>
    </ul>

    <div class="btn-wrapper">
        <a href="{{ $inviteUrl }}" class="btn">{{ __('emails.invite.button') }}</a>
    </div>

    <div class="info-box-warning">
        ⏰ {{ __('emails.invite.expires', ['days' => $expiryDays ?? 7]) }}
    </div>

    <div class="fallback-url">
        <p style="margin: 0 0 6px 0;">{{ __('emails.common.button_not_working') }}</p>
        <a href="{{ $inviteUrl }}">{{ $inviteUrl }}</a>
    </div>
@endsection
