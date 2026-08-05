<?php

namespace App\Mail;

use App\Models\User;
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
    ) {}

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
