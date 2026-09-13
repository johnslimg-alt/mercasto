<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells a seller that the automatic review of one or more of their ads could not be completed.
 *
 * Deliberately NOT SellerCorrectionRequiredMail: that mail asks the seller to correct
 * something and to resubmit, which is wrong here. A `failed` ad carries no verdict to act on,
 * nothing the seller can edit re-queues it, and the failure cause is not reliably persisted —
 * so this mail states only what is known and asks for nothing.
 */
class SellerReviewIncompleteMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public int $adCount,
        public string $actionUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->adCount === 1
                ? 'No pudimos completar la revisión de tu anuncio — Mercasto'
                : 'No pudimos completar la revisión de tus anuncios — Mercasto',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.seller_review_incomplete');
    }
}
