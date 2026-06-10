<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SellerContactMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $buyerName;
    public string $buyerEmail;
    public string $messageBody;
    public string $adTitle;
    public int    $adId;

    public function __construct(string $buyerName, string $buyerEmail, string $messageBody, string $adTitle, int $adId)
    {
        $this->buyerName   = $buyerName;
        $this->buyerEmail  = $buyerEmail;
        $this->messageBody = $messageBody;
        $this->adTitle     = $adTitle;
        $this->adId        = $adId;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->buyerName . " está interesado en tu anuncio '{$this->adTitle}'",
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
