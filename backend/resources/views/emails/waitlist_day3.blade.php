@extends('emails.layout')

@section('subject', __('emails.waitlist_day3.subject'))

@section('preheader', __('emails.waitlist_day3.preheader', ['position' => $position]))

@section('content')
    <h1>{{ __('emails.waitlist_day3.greeting', ['name' => $userName]) }}</h1>

    <p>{{ __('emails.waitlist_day3.intro') }}</p>

    <div class="position-badge">
        <p class="position-label">{{ __('emails.waitlist_day3.position_label') }}</p>
        <p class="position-number">#{{ $position }}</p>
    </div>

    <h2>{{ __('emails.waitlist_day3.features_title') }}</h2>

    <ul class="feature-list">
        <li><span class="emoji">✨</span> <strong>{{ __('emails.waitlist_day3.feature_1') }}</strong></li>
        <li><span class="emoji">🌍</span> <strong>{{ __('emails.waitlist_day3.feature_2') }}</strong></li>
        <li><span class="emoji">🗺️</span> <strong>{{ __('emails.waitlist_day3.feature_3') }}</strong></li>
        <li><span class="emoji">🤖</span> <strong>{{ __('emails.waitlist_day3.feature_4') }}</strong></li>
    </ul>

    @if(isset($referralCode) && $referralCode)
        <hr class="divider">

        <h2>{{ __('emails.waitlist_day3.referral_title') }}</h2>
        <p>{{ __('emails.waitlist_day3.referral_desc') }}</p>

        <div class="referral-box">
            <code>{{ $referralCode }}</code>
            <p style="font-size: 13px; color: #64748B; margin: 8px 0 0 0;">
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist?ref={{ $referralCode }}" style="color: #84CC16; font-weight: 600;">
                    {{ __('emails.waitlist_day3.share_link') }}
                </a>
            </p>
        </div>

        <div class="info-box-success">
            <strong>{{ __('emails.waitlist_day3.bonus') }}</strong><br>
            {{ __('emails.waitlist_day3.bonus_desc') }}
        </div>
    @endif

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist" class="btn">
            {{ __('emails.waitlist_day3.check_position') }}
        </a>
    </div>

    <p style="margin-top: 24px; text-align: center; color: #64748B; font-size: 14px;">
        {{ __('emails.waitlist_day3.closing') }}
    </p>
@endsection
