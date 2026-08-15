<?php

namespace App\Mail;

use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewMessageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $localeCode;

    public function __construct(
        public int $conversationId,
        ?string $locale = null,
    ) {
        $this->localeCode = MailLocale::normalize($locale);
        $this->locale($this->localeCode);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('emails.new_message.subject'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_message',
        );
    }
}
