<?php

namespace App\Mail;

use App\Models\Ad;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Ad $ad) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "¡Tu anuncio fue aprobado! '{$this->ad->title}'",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.ad_approved',
        );
    }
}
