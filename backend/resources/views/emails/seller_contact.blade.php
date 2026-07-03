@extends('emails.layout')

@section('subject', __('emails.seller_contact.subject', ['buyer' => $buyerName, 'ad' => $adTitle]))

@section('preheader', __('emails.seller_contact.preheader', ['buyer' => $buyerName]))

@section('content')
    <h1>{{ __('emails.seller_contact.title') }}</h1>

    <p>
        {!! __('emails.seller_contact.intro_html', [
            'buyer' => e($buyerName),
            'ad' => e($adTitle),
        ]) !!}
    </p>

    <div class="message-preview">
        {{ Str::limit($messageBody, 1000) }}
    </div>

    <p>{{ __('emails.seller_contact.reply_hint', ['buyer' => $buyerName]) }}</p>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/?ad={{ $adId }}" class="btn">
            {{ __('emails.seller_contact.button') }}
        </a>
    </div>

    <hr class="divider">

    <p style="font-size: 13px; color: #94A3B8;">
        {{ __('emails.seller_contact.privacy') }}
        {{ __('emails.seller_contact.safety') }}
    </p>
@endsection
