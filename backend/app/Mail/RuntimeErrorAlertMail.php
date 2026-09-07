<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RuntimeErrorAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $friendlyId,
        public string $projectName,
        public string $errorType,
        public string $alertReason,
        public int $eventCount,
        public string $issueUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Mercasto runtime {$this->friendlyId}] {$this->errorType}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.runtime_error_alert',
        );
    }
}
