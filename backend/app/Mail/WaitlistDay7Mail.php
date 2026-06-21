<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Traits\LocaleHelper;

class WaitlistDay7Mail extends Mailable
{
    use Queueable, SerializesModels, LocaleHelper;

    public $userName;
    public $position;
    public $referralCode;
    public $referralCount;

    public function __construct($userName, $position, $referralCode = null, $referralCount = 0)
    {
        $this->userName = $userName;
        $this->position = $position;
        $this->referralCode = $referralCode;
        $this->referralCount = $referralCount;
    }

    public function build()
    {
        $this->setEmailLocale();

        return $this->markdown('emails.waitlist_day7')
                    ->subject(__('emails.waitlist_day7.subject'));
    }
}
