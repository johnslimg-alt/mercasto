<?php

namespace App\Mail;

use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewReviewMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Review $review) {}

    public function envelope(): Envelope
    {
        $reviewer = $this->review->reviewer?->name ?? 'Alguien';
        $rating   = $this->review->rating;

        return new Envelope(
            subject: "{$reviewer} te dejó una reseña ⭐{$rating}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_review',
        );
    }
}
