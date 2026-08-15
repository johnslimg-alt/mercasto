@extends('emails.layout')

@section('subject', __('emails.new_message.subject'))
@section('preheader', __('emails.new_message.preheader'))

@section('content')
    <h1>{{ __('emails.new_message.title') }}</h1>

    <p>{{ __('emails.new_message.description') }}</p>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/mensajes?conversation={{ $conversationId }}" class="btn">
            {{ __('emails.new_message.button') }}
        </a>
    </div>

    <hr class="divider">

    <p style="font-size: 13px; color: #94A3B8;">
        {{ __('emails.new_message.privacy') }}
    </p>
@endsection
