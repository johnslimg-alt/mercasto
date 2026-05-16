<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerifyMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $verificationUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verifica tu correo en Mercasto',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email_verify',
        );
    }
}
