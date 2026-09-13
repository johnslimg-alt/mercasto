<?php

namespace App\Mail;

use App\Models\User;
use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SellerReactivationReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public int $readyCount,
        public string $stage,
        public string $actionUrl,
    ) {
        // Spanish-only template: pin the mail locale so the shared layout footer renders in Spanish.
        $this->locale(MailLocale::FALLBACK);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->stage === 'follow_up'
                ? 'Recordatorio: reactiva tus anuncios aprobados — Mercasto'
                : 'Tus anuncios están listos para reactivarse — Mercasto',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.seller_reactivation_reminder',
        );
    }
}
