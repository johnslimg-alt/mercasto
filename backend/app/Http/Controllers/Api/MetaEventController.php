<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MetaCapiService;
use Illuminate\Http\Request;

class MetaEventController extends Controller
{
    public function postAd(Request $request, MetaCapiService $meta)
    {
        return $this->sendClassifiedEvent($request, $meta, 'PostAd');
    }

    public function contact(Request $request, MetaCapiService $meta)
    {
        return $this->sendClassifiedEvent($request, $meta, 'Contact');
    }

    public function addToWishlist(Request $request, MetaCapiService $meta)
    {
        return $this->sendClassifiedEvent($request, $meta, 'AddToWishlist');
    }

    public function register(Request $request, MetaCapiService $meta)
    {
        $validated = $request->validate([
            'event_id' => ['required', 'string', 'max:120'],
            'url' => ['nullable', 'url'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        // This endpoint fires right after signup, before the client necessarily has
        // an authenticated session wired up, so we can't rely on $request->user().
        // The frontend passes the newly created user's id instead; we look it up
        // ourselves rather than trusting any client-supplied PII directly.
        $user = isset($validated['user_id']) ? User::find($validated['user_id']) : null;

        $result = $meta->send(
            'CompleteRegistration',
            $request,
            $user,
            [],
            $validated['event_id'],
            $validated['url'] ?? null
        );

        return response()->json([
            'ok' => (bool) ($result['ok'] ?? false),
            'event_id' => $validated['event_id'],
            'skipped' => (bool) ($result['skipped'] ?? false),
        ]);
    }

    private function sendClassifiedEvent(Request $request, MetaCapiService $meta, string $eventName)
    {
        $validated = $request->validate([
            'event_id' => ['required', 'string', 'max:120'],
            'listing_id' => ['required'],
            'category' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'method' => ['nullable', 'string', 'max:40'],
            'url' => ['nullable', 'url'],
        ]);

        $customData = array_filter([
            'content_type' => 'classified_ad',
            'listing_id' => (string) $validated['listing_id'],
            'category' => $validated['category'] ?? null,
            'city' => $validated['city'] ?? null,
            'contact_method' => $validated['method'] ?? null,
            'currency' => 'MXN',
            'value' => 0,
        ], fn ($value) => $value !== null && $value !== '');

        $result = $meta->send(
            $eventName,
            $request,
            $request->user(),
            $customData,
            $validated['event_id'],
            $validated['url'] ?? null
        );

        return response()->json([
            'ok' => (bool) ($result['ok'] ?? false),
            'event_id' => $validated['event_id'],
            'skipped' => (bool) ($result['skipped'] ?? false),
        ]);
    }
}
