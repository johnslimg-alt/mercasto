@extends('emails.layout')

@section('subject', __('emails.waitlist.subject'))

@section('preheader', __('emails.waitlist.preheader', ['position' => $position]))

@section('content')
    <h1>{{ __('emails.waitlist.title') }}</h1>

    <p>{{ __('emails.common.greeting', ['name' => $userName ?? 'there']) }}</p>

    <p>{{ __('emails.waitlist.intro') }}</p>

    <div class="position-badge">
        <p class="position-label">{{ __('emails.waitlist.your_position') }}</p>
        <p class="position-number">#{{ $position }}</p>
    </div>

    <h2>{{ __('emails.waitlist.next_steps') }}</h2>

    <ul class="feature-list">
        <li><span class="emoji">1️⃣</span> {{ __('emails.waitlist.step_1') }}</li>
        <li><span class="emoji">2️⃣</span> {{ __('emails.waitlist.step_2') }}</li>
        <li><span class="emoji">3️⃣</span> {{ __('emails.waitlist.step_3') }}</li>
    </ul>

    @if(isset($referralCode))
        <hr class="divider">

        <h2>{{ __('emails.waitlist.referral') }}</h2>
        <p>{{ __('emails.waitlist.referral_help') }}</p>

        <div class="referral-box">
            <code>{{ $referralCode }}</code>
            <p style="font-size: 13px; color: #64748B; margin: 8px 0 0 0;">
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist?ref={{ $referralCode }}" style="color: #84CC16; font-weight: 600;">
                    {{ __('emails.waitlist.share_link') }}
                </a>
            </p>
        </div>

        <div class="info-box-success">
            <strong>{{ __('emails.waitlist.bonus') }}</strong><br>
            {{ __('emails.waitlist.bonus_desc') }}
        </div>
    @endif

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist" class="btn">
            {{ __('emails.waitlist.check_status') }}
        </a>
    </div>
@endsection
