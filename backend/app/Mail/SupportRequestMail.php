<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportRequestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $reference,
        public string $requesterName,
        public string $requesterEmail,
        public string $requestSubject,
        public string $messageBody,
        public string $queueName,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->reference}] {$this->requestSubject}",
            replyTo: [new Address($this->requesterEmail, $this->requesterName)],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.support_request',
        );
    }
}
