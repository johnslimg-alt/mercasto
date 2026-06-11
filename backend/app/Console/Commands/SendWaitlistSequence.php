<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\WaitlistDay3Mail;
use App\Mail\WaitlistDay7Mail;
use Carbon\Carbon;

class SendWaitlistSequence extends Command
{
    protected $signature = 'waitlist:send-sequence {--day=3 : Day of sequence (3 or 7)} {--limit=100 : Max emails to send}';
    protected $description = 'Send scheduled waitlist emails (Day 3 or Day 7)';

    public function handle()
    {
        $day = (int) $this->option('day');
        $limit = (int) $this->option('limit');
        
        if (!in_array($day, [3, 7])) {
            $this->error('Day must be 3 or 7');
            return 1;
        }

        $this->info("Sending Day {$day} emails to waitlist subscribers...");

        // Get subscribers who joined X days ago
        $targetDate = Carbon::now()->subDays($day)->startOfDay();
        $endDate = Carbon::now()->subDays($day)->endOfDay();

        $subscribers = DB::table('waitlist_emails')
            ->whereBetween('created_at', [$targetDate, $endDate])
            ->where('email_sent', false) // Prevent duplicates
            ->limit($limit)
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($subscribers as $subscriber) {
            try {
                // Count referrals
                $referralCount = DB::table('waitlist_emails')
                    ->where('referred_by', $subscriber->referral_code)
                    ->count();

                if ($day === 3) {
                    Mail::to($subscriber->email)->send(new WaitlistDay3Mail(
                        $subscriber->name ?? 'User',
                        $subscriber->position,
                        $subscriber->referral_code
                    ));
                } else {
                    Mail::to($subscriber->email)->send(new WaitlistDay7Mail(
                        $subscriber->name ?? 'User',
                        $subscriber->position,
                        $subscriber->referral_code,
                        $referralCount
                    ));
                }

                // Mark as sent
                DB::table('waitlist_emails')
                    ->where('id', $subscriber->id)
                    ->update([
                        'email_sent' => true,
                        'email_sent_at' => Carbon::now()
                    ]);

                $sent++;
                $this->info("✓ Sent Day {$day} email to {$subscriber->email}");
                
                // Rate limiting
                sleep(1);
            } catch (\Exception $e) {
                $failed++;
                $this->error("✗ Failed to send to {$subscriber->email}: {$e->getMessage()}");
            }
        }

        $this->info("\nSummary:");
        $this->info("  Sent: {$sent}");
        $this->info("  Failed: {$failed}");
        $this->info("  Total processed: " . count($subscribers));

        return 0;
    }
}
