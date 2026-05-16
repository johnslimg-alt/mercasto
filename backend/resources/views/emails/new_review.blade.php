@extends('emails.layout')

@section('subject', $review->reviewer->name . ' te dejó una reseña ⭐' . $review->rating)

@section('content')
    <h1>Nueva reseña en tu perfil ⭐</h1>

    <p>
        <strong>{{ $review->reviewer->name }}</strong> ha dejado una reseña en tu perfil de Mercasto.
    </p>

    <div style="background: #F8FAFC; border-radius: 12px; padding: 20px 24px; margin: 20px 0; text-align: center;">
        {{-- Star display --}}
        <div class="stars">
            @for($i = 1; $i <= 5; $i++)
                {{ $i <= $review->rating ? '★' : '☆' }}
            @endfor
        </div>
        <p style="font-size: 14px; color: #64748B; margin: 4px 0 0 0;">
            {{ $review->rating }} de 5 estrellas
        </p>

        @if($review->comment)
            <div class="message-preview" style="text-align: left; margin-top: 16px;">
                "{{ $review->comment }}"
            </div>
        @endif
    </div>

    <div class="btn-wrapper">
        <a href="{{ config('app.frontend_url', 'https://mercasto.com') }}/usuarios/{{ $review->seller_id }}" class="btn">
            Ver tu perfil
        </a>
    </div>

    <div class="info-box">
        💡 Responde siempre con profesionalismo. Las reseñas positivas aumentan la confianza de los compradores
        y pueden darte el distintivo de <strong>Top Vendedor</strong>.
    </div>
@endsection
