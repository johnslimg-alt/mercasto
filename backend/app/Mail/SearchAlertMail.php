<?php

namespace App\Mail;

use App\Models\SearchAlert;
use App\Support\MailLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SearchAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public SearchAlert $alert,
        public Collection $newAds,
    ) {
        // Spanish-only template: pin the mail locale so the shared layout footer renders in Spanish.
        $this->locale(MailLocale::FALLBACK);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->newAds->count() . " nuevos anuncios para tu alerta '{$this->alert->name}'",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.search_alert',
        );
    }
}
