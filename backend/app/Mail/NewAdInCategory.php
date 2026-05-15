<?php

namespace App\Mail;

use App\Models\Ad;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewAdInCategory extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Ad $ad) {}

    public function build(): self
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'https://mercasto.com'), '/');
        $adUrl = "{$frontendUrl}/?ad={$this->ad->id}";

        return $this
            ->subject('Nuevo anuncio en Mercasto: ' . $this->ad->title)
            ->view('emails.action', [
                'title' => 'Nuevo anuncio en tu categoría',
                'body' => 'Hay un nuevo anuncio que coincide con tus suscripciones: "' . $this->ad->title . '".',
                'actionUrl' => $adUrl,
                'actionText' => 'Ver anuncio',
                'footer' => 'Puedes cambiar tus alertas desde tu perfil de Mercasto.',
            ]);
    }
}
