<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SellerCorrectionRequiredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public int $adCount,
        public array $messages,
        public string $actionUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->adCount === 1
                ? 'Corrige tu anuncio para publicarlo — Mercasto'
                : 'Corrige tus anuncios para publicarlos — Mercasto',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.seller_correction_required');
    }
}
