<?php

namespace App\Mail;

use App\Models\User;
use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WeeklyDigestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Collection $ads,
    ) {
        // Spanish-only template: pin the mail locale so the shared layout footer renders in Spanish.
        $this->locale(MailLocale::FALLBACK);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🏷️ Anuncios de la semana para ti — Mercasto',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.weekly_digest',
        );
    }
}
