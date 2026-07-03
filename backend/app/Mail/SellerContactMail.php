<?php

namespace App\Mail;

use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SellerContactMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $localeCode;

    public function __construct(
        public string $buyerName,
        public string $buyerEmail,
        public string $messageBody,
        public string $adTitle,
        public int $adId,
        ?string $locale = null,
    ) {
        $this->localeCode = MailLocale::normalize($locale);
        $this->locale($this->localeCode);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('emails.seller_contact.subject', [
                'buyer' => $this->buyerName,
                'ad' => $this->adTitle,
            ]),
            replyTo: [new \Illuminate\Mail\Mailables\Address($this->buyerEmail, $this->buyerName)],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.seller_contact',
        );
    }
}
