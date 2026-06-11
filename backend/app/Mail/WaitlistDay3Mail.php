<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Traits\LocaleHelper;

class WaitlistDay3Mail extends Mailable
{
    use Queueable, SerializesModels, LocaleHelper;

    public $userName;
    public $position;
    public $referralCode;

    public function __construct($userName, $position, $referralCode = null)
    {
        $this->userName = $userName;
        $this->position = $position;
        $this->referralCode = $referralCode;
    }

    public function build()
    {
        $this->setEmailLocale();

        return $this->markdown('emails.waitlist_day3')
                    ->subject(__('emails.waitlist_day3.subject'));
    }
}
