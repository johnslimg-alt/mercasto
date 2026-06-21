<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminNewSubscriberMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public ?string $name,
        public int $position,
        public ?string $referralCode,
        public ?string $source,
        public int $totalWaitlist,
        public ?string $referrerEmail
    ) {}

    public function build()
    {
        return $this->subject("🆕 New Waitlist Subscriber #{$this->position} — {$this->email}")
            ->html($this->getHtmlContent());
    }

    private function getHtmlContent(): string
    {
        $referral = $this->referrerEmail ? "<p>🔗 <strong>Referred by:</strong> {$this->referrerEmail}</p>" : '';
        return <<<HTML
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #e2e8f0; padding: 30px; border-radius: 12px;">
            <h1 style="color: #06b6d4;">🆕 New Waitlist Subscriber</h1>
            <hr style="border: 1px solid #334155; margin: 20px 0;">
            
            <p><strong>👤 Name:</strong> {$this->name}</p>
            <p><strong>📧 Email:</strong> {$this->email}</p>
            <p><strong>🎯 Position:</strong> #{$this->position}</p>
            <p><strong>🔑 Referral Code:</strong> {$this->referralCode}</p>
            <p><strong>📍 Source:</strong> {$this->source}</p>
            <p><strong>📊 Total in Waitlist:</strong> {$this->totalWaitlist}</p>
            {$referral}
            
            <hr style="border: 1px solid #334155; margin: 20px 0;">
            
            <p style="text-align: center;">
                <a href="https://mercasto.com/admin/?secret=mercasto-admin-2026" style="background: #06b6d4; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Open Admin Panel →</a>
            </p>
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px;">
                Mercasto Waitlist Notifications
            </p>
        </div>
        HTML;
    }
}
