<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTracking extends Model
{
    use HasFactory;

    protected $fillable = [
        'email_type',
        'recipient_email',
        'recipient_id',
        'event',
        'tracking_id',
        'link_url',
        'ip_address',
        'user_agent',
        'language',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Generate unique tracking ID
     */
    public static function generateTrackingId(): string
    {
        return 'em_' . bin2hex(random_bytes(16));
    }

    /**
     * Record email sent
     */
    public static function recordSent(string $emailType, string $email, ?int $userId = null, ?string $language = null): string
    {
        $trackingId = self::generateTrackingId();
        
        self::create([
            'email_type' => $emailType,
            'recipient_email' => $email,
            'recipient_id' => $userId,
            'event' => 'sent',
            'tracking_id' => $trackingId,
            'language' => $language,
        ]);

        return $trackingId;
    }

    /**
     * Record email opened (via tracking pixel)
     */
    public static function recordOpen(string $trackingId, ?string $ip = null, ?string $userAgent = null): void
    {
        $email = self::where('tracking_id', $trackingId)->first();
        
        if ($email) {
            self::create([
                'email_type' => $email->email_type,
                'recipient_email' => $email->recipient_email,
                'recipient_id' => $email->recipient_id,
                'event' => 'opened',
                'tracking_id' => $trackingId,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'language' => $email->language,
            ]);
        }
    }

    /**
     * Record link click
     */
    public static function recordClick(string $trackingId, string $url, ?string $ip = null, ?string $userAgent = null): void
    {
        $email = self::where('tracking_id', $trackingId)->first();
        
        if ($email) {
            self::create([
                'email_type' => $email->email_type,
                'recipient_email' => $email->recipient_email,
                'recipient_id' => $email->recipient_id,
                'event' => 'clicked',
                'tracking_id' => $trackingId,
                'link_url' => $url,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'language' => $email->language,
            ]);
        }
    }

    /**
     * Get email analytics
     */
    public static function getAnalytics(?string $emailType = null, ?int $days = 30): array
    {
        $query = self::where('created_at', '>=', now()->subDays($days));
        
        if ($emailType) {
            $query->where('email_type', $emailType);
        }

        $events = $query->selectRaw('event, COUNT(*) as count')
            ->groupBy('event')
            ->pluck('count', 'event');

        $byType = self::where('created_at', '>=', now()->subDays($days))
            ->selectRaw('email_type, event, COUNT(*) as count')
            ->groupBy('email_type', 'event')
            ->get()
            ->groupBy('email_type');

        return [
            'total' => $events->sum(),
            'events' => $events,
            'by_type' => $byType,
            'open_rate' => $events->has('sent') && $events->has('opened') 
                ? round(($events['opened'] / $events['sent']) * 100, 2) . '%'
                : '0%',
            'click_rate' => $events->has('sent') && $events->has('clicked')
                ? round(($events['clicked'] / $events['sent']) * 100, 2) . '%'
                : '0%',
        ];
    }
}
