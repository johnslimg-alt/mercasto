@extends('emails.layout')

@section('subject', __('emails.waitlist_day7.subject'))

@section('preheader', __('emails.waitlist_day7.preheader', ['position' => $position]))

@section('content')
    <h1>{{ __('emails.waitlist_day7.greeting', ['name' => $userName]) }}</h1>

    <p>{{ __('emails.waitlist_day7.intro') }}</p>

    <div class="info-box-warning">
        <strong>⏰ {{ __('emails.waitlist_day7.urgency_title') }}</strong><br>
        {{ __('emails.waitlist_day7.urgency_desc') }}
    </div>

    <div class="position-badge">
        <p class="position-label">{{ __('emails.waitlist_day7.position_label') }}</p>
        <p class="position-number">#{{ $position }}</p>
        @if(isset($referralCount) && $referralCount > 0)
            <p style="font-size: 14px; color: #065F46; margin: 12px 0 0 0;">
                🎉 {{ __('emails.waitlist_day7.referrals_moved', ['count' => $referralCount]) }}
            </p>
        @endif
    </div>

    @if(isset($referralCode) && $referralCode)
        <hr class="divider">

        <h2>{{ __('emails.waitlist_day7.referral_title') }}</h2>
        <p>{{ __('emails.waitlist_day7.referral_desc') }}</p>

        <div class="referral-box">
            <code>{{ $referralCode }}</code>
            <p style="font-size: 13px; color: #64748B; margin: 8px 0 0 0;">
                <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist?ref={{ $referralCode }}" style="color: #84CC16; font-weight: 600;">
                    {{ __('emails.waitlist_day7.copy_link') }}
                </a>
            </p>
        </div>

        <p style="text-align: center; margin-top: 20px; font-weight: 600; color: #0F172A;">
            {{ __('emails.waitlist_day7.share_prompt') }}
        </p>

        <div style="text-align: center; margin: 20px 0;">
            <a href="https://twitter.com/intent/tweet?text={{ urlencode(__('emails.waitlist_day7.share_text') . ' https://mercasto.com/waitlist?ref=' . $referralCode) }}"
               style="display: inline-block; background: #1da1f2; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 5px; font-weight: 600; font-size: 14px;">
                🐦 {{ __('emails.waitlist_day7.share_twitter') }}
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u={{ urlencode('https://mercasto.com/waitlist?ref=' . $referralCode) }}"
               style="display: inline-block; background: #1877f2; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 5px; font-weight: 600; font-size: 14px;">
                📘 {{ __('emails.waitlist_day7.share_facebook') }}
            </a>
            <a href="https://wa.me/?text={{ urlencode(__('emails.waitlist_day7.share_text') . ' https://mercasto.com/waitlist?ref=' . $referralCode) }}"
               style="display: inline-block; background: #25d366; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 5px; font-weight: 600; font-size: 14px;">
                💬 {{ __('emails.waitlist_day7.share_whatsapp') }}
            </a>
        </div>
    @endif

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/waitlist" class="btn">
            {{ __('emails.waitlist_day7.check_position') }}
        </a>
    </div>

    <p style="margin-top: 24px; text-align: center; color: #64748B; font-size: 14px;">
        {{ __('emails.waitlist_day7.closing') }}
    </p>
@endsection
