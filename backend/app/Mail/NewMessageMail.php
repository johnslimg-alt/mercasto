<?php

namespace App\Mail;

use App\Models\Conversation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewMessageMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $senderName;
    public string $adTitle;
    public string $messageBody;
    public int    $conversationId;

    public function __construct(
        array $messageData,
        Conversation $conversation,
    ) {
        $this->senderName     = $messageData['sender_name'];
        $this->messageBody    = $messageData['body'];
        $this->adTitle        = $conversation->ad->title ?? 'anuncio';
        $this->conversationId = $conversation->id;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->senderName . " te envió un mensaje sobre '{$this->adTitle}'",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_message',
        );
    }
}
