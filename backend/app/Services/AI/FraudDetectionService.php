<?php

namespace App\Services\AI;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * AI-powered fraud detection system
 * Uses statistical analysis + rule-based scoring to identify suspicious listings
 */
class FraudDetectionService
{
    /**
     * Analyze an ad for fraud indicators
     * Returns fraud score 0-100 and list of flags
     */
    public function analyze(Ad $ad): array
    {
        $score = 0;
        $flags = [];

        // Rule 1: Price anomaly detection (z-score method)
        $priceResult = $this->checkPriceAnomaly($ad);
        $score += $priceResult['score'];
        if ($priceResult['flag']) $flags[] = $priceResult['flag'];

        // Rule 2: New account posting high-value items
        $accountResult = $this->checkAccountAge($ad);
        $score += $accountResult['score'];
        if ($accountResult['flag']) $flags[] = $accountResult['flag'];

        // Rule 3: Suspicious text patterns
        $textResult = $this->checkSuspiciousText($ad);
        $score += $textResult['score'];
        if ($textResult['flags']) $flags = array_merge($flags, $textResult['flags']);

        // Rule 4: Posting velocity (too many ads in short time)
        $velocityResult = $this->checkPostingVelocity($ad);
        $score += $velocityResult['score'];
        if ($velocityResult['flag']) $flags[] = $velocityResult['flag'];

        // Rule 5: Image analysis (duplicates, stock photos)
        $imageResult = $this->checkImages($ad);
        $score += $imageResult['score'];
        if ($imageResult['flags']) $flags = array_merge($flags, $imageResult['flags']);

        // Rule 6: Contact info in description (trying to go off-platform)
        $contactResult = $this->checkOffPlatformContact($ad);
        $score += $contactResult['score'];
        if ($contactResult['flag']) $flags[] = $contactResult['flag'];

        // Cap score at 100
        $score = min(100, max(0, $score));

        // Update the ad
        $ad->update([
            'fraud_score' => $score,
            'fraud_flags' => $flags,
            'last_fraud_check_at' => now(),
        ]);

        // Auto-flag high-risk ads
        if ($score >= 70 && $ad->status === 'active') {
            $ad->update(['status' => 'under_review']);
            Log::warning('Ad auto-flagged for review', [
                'ad_id' => $ad->id,
                'score' => $score,
                'flags' => $flags,
            ]);
        }

        return [
            'ad_id' => $ad->id,
            'fraud_score' => $score,
            'risk_level' => $this->getRiskLevel($score),
            'flags' => $flags,
            'recommendation' => $this->getRecommendation($score),
        ];
    }

    /**
     * Check if price is anomalous compared to similar listings
     */
    private function checkPriceAnomaly(Ad $ad): array
    {
        if (!$ad->price || $ad->price <= 0) {
            return ['score' => 0, 'flag' => null];
        }

        // Get similar listings in same category
        $stats = DB::table('ads')
            ->where('category', $ad->category)
            ->where('status', 'active')
            ->where('id', '!=', $ad->id)
            ->whereNotNull('price')
            ->where('price', '>', 0)
            ->selectRaw('AVG(price) as avg_price, STDDEV(price) as stddev_price, COUNT(*) as count')
            ->first();

        if (!$stats || $stats->count < 5 || !$stats->stddev_price) {
            return ['score' => 0, 'flag' => null];
        }

        // Z-score: how many standard deviations from mean
        $zScore = abs($ad->price - $stats->avg_price) / $stats->stddev_price;

        if ($zScore > 3) {
            $direction = $ad->price < $stats->avg_price ? 'too_low' : 'too_high';
            return [
                'score' => 25,
                'flag' => "price_anomaly_{$direction}: $" . number_format($ad->price) . " vs avg $" . number_format($stats->avg_price),
            ];
        }

        if ($zScore > 2) {
            return [
                'score' => 10,
                'flag' => 'price_unusual',
            ];
        }

        return ['score' => 0, 'flag' => null];
    }

    /**
     * Check account age vs listing value
     */
    private function checkAccountAge(Ad $ad): array
    {
        $user = $ad->user;
        if (!$user) return ['score' => 0, 'flag' => null];

        $accountAgeDays = Carbon::parse($user->created_at)->diffInDays(now());
        $priceValue = $ad->price ?? 0;

        // New account (< 7 days) posting expensive items
        if ($accountAgeDays < 7 && $priceValue > 50000) {
            return [
                'score' => 20,
                'flag' => 'new_account_high_value: account ' . $accountAgeDays . ' days old, item $' . number_format($priceValue),
            ];
        }

        // New account (< 3 days) posting multiple items
        if ($accountAgeDays < 3) {
            $recentAds = Ad::where('user_id', $user->id)
                ->where('created_at', '>', now()->subDays(3))
                ->count();
            
            if ($recentAds > 10) {
                return [
                    'score' => 20,
                    'flag' => 'new_account_bulk_posting: ' . $recentAds . ' ads in 3 days',
                ];
            }
        }

        return ['score' => 0, 'flag' => null];
    }

    /**
     * Check for suspicious text patterns
     */
    private function checkSuspiciousText(Ad $ad): array
    {
        $text = strtolower(($ad->title ?? '') . ' ' . ($ad->description ?? ''));
        $score = 0;
        $flags = [];

        // Suspicious keywords
        $suspicious = [
            'urgent' => 5, 'urgente' => 5,
            'oferta' => 3, 'liquidación' => 5,
            'réplica' => 15, 'replica' => 15,
            'copia' => 10, 'imitación' => 15,
            'solo hoy' => 5, 'only today' => 5,
            'western union' => 20, 'moneygram' => 20,
            'bitcoin' => 10, 'crypto' => 10,
            'anticipo' => 10, 'depósito' => 5,
        ];

        foreach ($suspicious as $keyword => $points) {
            if (strpos($text, $keyword) !== false) {
                $score += $points;
                $flags[] = "suspicious_keyword:{$keyword}";
            }
        }

        // Excessive caps
        if (preg_match('/[A-Z]{5,}/', $ad->title ?? '')) {
            $score += 5;
            $flags[] = 'excessive_caps';
        }

        // Excessive punctuation !!! ???
        if (preg_match('/[!?]{3,}/', $ad->title ?? '')) {
            $score += 3;
            $flags[] = 'excessive_punctuation';
        }

        return ['score' => min($score, 30), 'flags' => $flags];
    }

    /**
     * Check posting velocity
     */
    private function checkPostingVelocity(Ad $ad): array
    {
        $userId = $ad->user_id;
        
        $last24h = Ad::where('user_id', $userId)
            ->where('created_at', '>', now()->subHours(24))
            ->count();

        if ($last24h > 20) {
            return ['score' => 25, 'flag' => 'high_velocity: ' . $last24h . ' ads in 24h'];
        }

        if ($last24h > 10) {
            return ['score' => 10, 'flag' => 'elevated_velocity: ' . $last24h . ' ads in 24h'];
        }

        return ['score' => 0, 'flag' => null];
    }

    /**
     * Check images for duplicates or stock photos
     */
    private function checkImages(Ad $ad): array
    {
        $flags = [];
        $score = 0;

        // Check if ad has no image (suspicious for valuable items)
        if (empty($ad->image_url) && ($ad->price ?? 0) > 10000) {
            $score += 10;
            $flags[] = 'no_images_high_value';
        }

        // Check for duplicate image_url across different users (potential scam)
        if (!empty($ad->image_url)) {
            $imageUrl = is_array(json_decode($ad->image_url, true)) 
                ? json_decode($ad->image_url, true)[0] ?? $ad->image_url
                : $ad->image_url;
            
            $duplicates = DB::table('ads')
                ->where('image_url', 'LIKE', '%' . substr($imageUrl, -20) . '%')
                ->where('user_id', '!=', $ad->user_id)
                ->count();

            if ($duplicates > 0) {
                $score += 15;
                $flags[] = 'duplicate_image_across_users';
            }
        }

        return ['score' => min($score, 25), 'flags' => $flags];
    }

        // Check for duplicate images across different ads (potential scam)
        $adImages = DB::table('ad_images')->where('ad_id', $ad->id)->pluck('image_url')->toArray();
        
        foreach ($adImages as $imageUrl) {
            $duplicates = DB::table('ad_images')
                ->where('image_url', $imageUrl)
                ->whereHas('ad', fn($q) => $q->where('user_id', '!=', $ad->user_id))
                ->count();

            if ($duplicates > 0) {
                $score += 15;
                $flags[] = 'duplicate_image_across_users';
                break;
            }
        }

        return ['score' => min($score, 25), 'flags' => $flags];
    }

    /**
     * Check for off-platform contact attempts
     */
    private function checkOffPlatformContact(Ad $ad): array
    {
        $text = ($ad->description ?? '') . ' ' . ($ad->title ?? '');
        
        // Phone number patterns
        $phonePatterns = [
            '/\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/', // Mexican phone
            '/\b\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/', // International
        ];

        // Email patterns
        $emailPattern = '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/';

        $score = 0;
        $flag = null;

        foreach ($phonePatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                $score += 15;
                $flag = 'phone_in_description';
                break;
            }
        }

        if (preg_match($emailPattern, $text)) {
            $score += 10;
            $flag = ($flag ? $flag . ',' : '') . 'email_in_description';
        }

        return ['score' => $score, 'flag' => $flag];
    }

    /**
     * Batch analyze recent ads
     */
    public function batchAnalyze(int $limit = 100): array
    {
        $ads = Ad::where(function ($q) {
                $q->whereNull('last_fraud_check_at')
                  ->orWhere('last_fraud_check_at', '<', now()->subDays(7));
            })
            ->where('status', 'active')
            ->limit($limit)
            ->get();

        $results = [
            'analyzed' => 0,
            'flagged' => 0,
            'clean' => 0,
            'details' => [],
        ];

        foreach ($ads as $ad) {
            $result = $this->analyze($ad);
            $results['analyzed']++;
            
            if ($result['fraud_score'] >= 50) {
                $results['flagged']++;
            } else {
                $results['clean']++;
            }
            
            $results['details'][] = $result;
        }

        return $results;
    }

    private function getRiskLevel(int $score): string
    {
        if ($score >= 70) return 'high';
        if ($score >= 40) return 'medium';
        if ($score >= 20) return 'low';
        return 'none';
    }

    private function getRecommendation(int $score): string
    {
        if ($score >= 70) return 'Auto-flagged for manual review';
        if ($score >= 40) return 'Monitor closely, verify user identity';
        if ($score >= 20) return 'Minor concerns, normal processing';
        return 'Clean listing';
    }
}
