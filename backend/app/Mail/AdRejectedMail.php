<?php

namespace App\Mail;

use App\Models\Ad;
use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Ad $ad,
        public ?string $reason = null,
    ) {
        // Spanish-only template: pin the mail locale so the shared layout footer renders in Spanish.
        $this->locale(MailLocale::FALLBACK);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Tu anuncio '{$this->ad->title}' necesita cambios",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.ad_rejected',
        );
    }
}
