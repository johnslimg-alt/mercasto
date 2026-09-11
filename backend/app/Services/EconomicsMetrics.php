<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seller-side economics for the admin dashboard.
 *
 * Every ratio is computed over real seller listings only: seeded catalog filler
 * ads are excluded, because including them divides conversion metrics by
 * inventory nobody listed. Metrics that have no data source yet are returned as
 * null with a reason instead of a fabricated zero or a misleading number.
 */
class EconomicsMetrics
{
    private const PAID_STATUSES = ['paid', 'paid_review'];

    private const PROMOTION_PREFIXES = ['boost_', 'highlight_', 'featured_', 'top_category_', 'ad_renewal_'];

    /**
     * @return array<string, mixed>
     */
    public function forPeriod(Carbon $since): array
    {
        $usersTotal = (int) DB::table('users')->count();
        // Admins are operators, not supply or demand: counting them in the
        // denominator dilutes every activation and conversion rate.
        $addressableUsers = (int) DB::table('users')->where('role', '!=', 'admin')->count();
        $newUsers = (int) DB::table('users')
            ->where('role', '!=', 'admin')
            ->where('created_at', '>=', $since)
            ->count();

        $realListings = $this->realListingsQuery();
        $realListingsTotal = (clone $realListings)->count();
        $realListingsPeriod = (clone $realListings)->where('created_at', '>=', $since)->count();

        $sellersWithListing = (int) (clone $realListings)->distinct()->count('user_id');
        $sellersWithListingPeriod = (int) (clone $realListings)
            ->where('created_at', '>=', $since)
            ->distinct()
            ->count('user_id');

        $listingsWithContact = (int) (clone $realListings)->where('contact_clicks', '>', 0)->count();

        $payingUsers = (int) DB::table('payments')
            ->whereIn('status', self::PAID_STATUSES)
            ->distinct()
            ->count('user_id');

        $paidAmount = (float) DB::table('payments')
            ->whereIn('status', self::PAID_STATUSES)
            ->sum('amount');

        $promotionPayments = (int) $this->promotionPaymentsQuery()->count();
        $promotionRevenue = (float) $this->promotionPaymentsQuery()->sum('amount');

        $paidPeriod = (int) DB::table('payments')
            ->whereIn('status', self::PAID_STATUSES)
            ->where('created_at', '>=', $since)
            ->count();

        return [
            'period_since' => $since->toDateString(),
            'currency' => 'MXN',
            'inventory' => [
                'real_listings_total' => $realListingsTotal,
                'real_listings_period' => $realListingsPeriod,
                'sellers_with_listing_total' => $sellersWithListing,
                'sellers_with_listing_period' => $sellersWithListingPeriod,
                'users_total' => $usersTotal,
                'addressable_users' => $addressableUsers,
                'note' => 'Catalog filler ads are excluded from every ratio below, and admin accounts are excluded from the user denominators.',
            ],
            'funnel' => [
                'seller_activation_rate' => $this->ratio($sellersWithListing, $addressableUsers),
                'listing_publication_rate' => $this->ratio($realListingsPeriod, max($newUsers, 1)),
                'listing_to_first_contact_rate' => $this->ratio($listingsWithContact, $realListingsTotal),
                'free_to_paid_rate' => $this->ratio($payingUsers, max($sellersWithListing, 1)),
                'median_first_response_minutes' => $this->medianFirstResponseMinutes(),
            ],
            'revenue' => [
                'paid_payments_total' => (int) DB::table('payments')->whereIn('status', self::PAID_STATUSES)->count(),
                'paid_payments_period' => $paidPeriod,
                'paid_amount_total' => round($paidAmount, 2),
                'paying_users' => $payingUsers,
                'arppu' => $payingUsers > 0 ? round($paidAmount / $payingUsers, 2) : null,
            ],
            'promotion' => [
                'promotion_payments' => $promotionPayments,
                'promotion_revenue_total' => round($promotionRevenue, 2),
                'promotion_attach_rate' => $this->ratio($promotionPayments, max($realListingsTotal, 1)),
            ],
            'unavailable' => [
                'cac' => 'no ad spend is stored anywhere; there is no cost input',
                'roas' => 'no ad spend and no per-channel attribution are stored',
                'buyer_cac' => 'no ad spend is stored anywhere',
                'refund_rate' => 'Clip refunds are not persisted, so refunds are invisible',
                'retention' => 'no product-activity events are stored per user',
            ],
        ];
    }

    private function realListingsQuery()
    {
        return DB::table('ads')->where(function ($query) {
            $query->where('is_catalog_filler', false)->orWhereNull('is_catalog_filler');
        });
    }

    private function promotionPaymentsQuery()
    {
        return DB::table('payments')
            ->whereIn('status', self::PAID_STATUSES)
            ->where(function ($query) {
                foreach (self::PROMOTION_PREFIXES as $index => $prefix) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $query->{$method}('product_code', 'like', $prefix . '%');
                }
            });
    }

    private function ratio(int $numerator, int $denominator): ?float
    {
        if ($denominator <= 0) {
            return null;
        }

        return round($numerator / $denominator, 4);
    }

    /**
     * Median minutes between the first buyer message and the seller's first
     * reply, over conversations that received a reply. Returns null when no
     * conversation has been answered yet.
     */
    private function medianFirstResponseMinutes(int $limit = 500): ?float
    {
        $conversations = DB::table('conversations')
            ->orderByDesc('last_message_at')
            ->limit($limit)
            ->get(['id', 'buyer_id', 'seller_id']);

        if ($conversations->isEmpty()) {
            return null;
        }

        $messages = DB::table('messages')
            ->whereIn('conversation_id', $conversations->pluck('id')->all())
            ->orderBy('created_at')
            ->get(['conversation_id', 'sender_id', 'created_at'])
            ->groupBy('conversation_id');

        $durations = [];
        foreach ($conversations as $conversation) {
            $thread = $messages->get($conversation->id);
            if ($thread === null) {
                continue;
            }

            $firstBuyer = $thread->firstWhere('sender_id', $conversation->buyer_id);
            if ($firstBuyer === null) {
                continue;
            }

            $reply = $thread->first(function ($message) use ($conversation, $firstBuyer) {
                return (int) $message->sender_id === (int) $conversation->seller_id
                    && $message->created_at > $firstBuyer->created_at;
            });
            if ($reply === null) {
                continue;
            }

            $durations[] = Carbon::parse($firstBuyer->created_at)
                ->diffInMinutes(Carbon::parse($reply->created_at));
        }

        if ($durations === []) {
            return null;
        }

        sort($durations);
        $count = count($durations);
        $middle = intdiv($count, 2);

        return $count % 2 === 0
            ? round(($durations[$middle - 1] + $durations[$middle]) / 2, 1)
            : (float) $durations[$middle];
    }
}
