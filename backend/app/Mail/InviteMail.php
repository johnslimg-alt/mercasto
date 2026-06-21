<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Traits\LocaleHelper;

class InviteMail extends Mailable
{
    use Queueable, SerializesModels, LocaleHelper;

    public $userName;
    public $inviteUrl;
    public $expiryDays;

    public function __construct($userName, $inviteUrl, $expiryDays = 7)
    {
        $this->userName = $userName;
        $this->inviteUrl = $inviteUrl;
        $this->expiryDays = $expiryDays;
    }

    public function build()
    {
        // Set locale based on user/request
        $this->setEmailLocale();

        return $this->markdown('emails.invite')
                    ->subject(__('emails.invite.subject'));
    }
}
