<?php

namespace App\Observers;

use App\Models\User;
use App\Services\MetaCapiService;
use App\Services\OpenAiAdsCapiService;
use App\Services\TikTokEventsApiService;
use App\Support\AnalyticsTrackingConsent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use function Illuminate\Support\defer;

class UserMetaRegistrationObserver
{
    public function created(User $user): void
    {
        $request = request();

        $registrationPaths = [
            'api/register',
            'api/auth/phone/verify',
            'api/auth/telegram/callback',
            'api/auth/*/callback',
        ];
        if (! collect($registrationPaths)->contains(fn (string $path) => $request->is($path))) {
            return;
        }

        $eventId = trim((string) $request->input('meta_event_id', ''));

        if ($eventId === '') {
            return;
        }

        if (! preg_match('/^[A-Za-z0-9._:-]{1,120}$/', $eventId)) {
            Log::warning('Registration conversion skipped: invalid event id', [
                'event_id_length' => strlen($eventId),
            ]);
            return;
        }

        $eventSourceUrl = $request->headers->get('referer');
        $registrationMethod = $this->registrationMethod($request);

        // The account preference is persisted later in the same registration
        // request (AuthController::recordRegistrationConsent), so every vendor send
        // is deferred until after commit and re-checks consent against the freshly
        // persisted user. Without consent nothing leaves the server.
        DB::afterCommit(function () use ($request, $user, $eventId, $eventSourceUrl, $registrationMethod): void {
            $userId = (int) $user->id;
            defer(function () use ($request, $userId, $eventId, $eventSourceUrl, $registrationMethod): void {
                $persistedUser = User::find($userId);

                if (AnalyticsTrackingConsent::allowsVendorEgress($request, $persistedUser)) {
                    app(MetaCapiService::class)->send(
                        'CompleteRegistration',
                        $request,
                        $persistedUser,
                        ['registration_method' => $registrationMethod],
                        $eventId,
                        $eventSourceUrl
                    );

                    app(TikTokEventsApiService::class)->send(
                        'CompleteRegistration',
                        $request,
                        $persistedUser,
                        [
                            'content_type' => 'product',
                            'content_ids' => ['mercasto_account'],
                            'contents' => [[
                                'content_id' => 'mercasto_account',
                                'content_type' => 'product',
                                'content_name' => 'Mercasto account registration',
                                'quantity' => 1,
                            ]],
                            'status' => 'completed',
                            'registration_method' => $registrationMethod,
                        ],
                        $eventId,
                        $eventSourceUrl
                    );
                }

                if (! AnalyticsTrackingConsent::allowsOpenAiEgress($request, $persistedUser)) {
                    return;
                }

                app(OpenAiAdsCapiService::class)->send(
                    'registration_completed',
                    $request,
                    $persistedUser,
                    ['type' => 'customer_action'],
                    $eventId,
                    $eventSourceUrl
                );
            })->always();
        });
    }
    private function registrationMethod($request): string
    {
        if ($request->is('api/auth/phone/verify')) {
            return 'phone';
        }
        if ($request->is('api/auth/telegram/callback')) {
            return 'telegram';
        }
        if ($request->is('api/auth/*/callback')) {
            return (string) $request->route('provider', 'oauth');
        }

        return (string) $request->input('registration_method', 'email');
    }
}
