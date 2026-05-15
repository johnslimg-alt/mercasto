<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AlertNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $title,
        public string $body,
        public string $actionUrl,
        public string $actionText = 'Ver en Mercasto',
        public string $footer = 'Gracias por usar Mercasto.'
    ) {}

    public function build(): self
    {
        return $this
            ->subject($this->title)
            ->view('emails.action', [
                'title' => $this->title,
                'body' => $this->body,
                'actionUrl' => $this->actionUrl,
                'actionText' => $this->actionText,
                'footer' => $this->footer,
            ]);
    }
}
