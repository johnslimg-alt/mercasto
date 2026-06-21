<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WaitlistEmail;
use App\Models\InviteWhitelist;
use App\Mail\AdminNewSubscriberMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class WaitlistController extends Controller
{
    public function subscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'name' => 'nullable|string|max:255',
            'source' => 'nullable|string|max:100',
            'referral_code' => 'nullable|string|exists:waitlist_emails,referral_code',
            'locale' => 'nullable|string|in:en,es,pt',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $existing = WaitlistEmail::where('email', $request->email)->first();
            
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'You are already on the waitlist!',
                    'position' => $existing->position,
                    'referral_code' => $existing->referral_code,
                    'already_subscribed' => true,
                ]);
            }

            $totalWaitlist = WaitlistEmail::count();
            $position = $totalWaitlist + 1;

            $waitlist = WaitlistEmail::create([
                'email' => strtolower(trim($request->email)),
                'name' => $request->name,
                'source' => $request->source ?? 'landing',
                'position' => $position,
                'referral_code' => strtoupper(substr(md5($request->email . time()), 0, 8)),
            ]);

            // Реферальная система
            $referrerEmail = null;
            if ($request->referral_code) {
                $referrer = WaitlistEmail::where('referral_code', $request->referral_code)->first();
                if ($referrer && $referrer->id !== $waitlist->id) {
                    $referrer->decrement('position', 5);
                    if ($referrer->position < 1) $referrer->position = 1;
                    $referrer->save();
                    $referrerEmail = $referrer->email;
                    
                    Log::info("Referral bonus applied", [
                        'referrer_email' => $referrer->email,
                        'new_position' => $referrer->position,
                        'referred_email' => $waitlist->email,
                    ]);
                }
            }

            // Уведомление админу
            try {
                $adminEmail = env('ADMIN_EMAIL', 'hello@mercasto.com');
                Mail::to($adminEmail)->queue(new AdminNewSubscriberMail(
                    $waitlist->email,
                    $waitlist->name,
                    $waitlist->position,
                    $waitlist->referral_code,
                    $waitlist->source,
                    WaitlistEmail::count(),
                    $referrerEmail
                ));
            } catch (\Exception $e) {
                Log::warning("Admin notification failed: " . $e->getMessage());
            }

            // Отправка welcome email подписчику
            try {
                $locale = $request->locale ?? 'es';
                app()->setLocale($locale);
                Mail::to($waitlist->email)->queue(new \App\Mail\WaitlistMail(
                    $waitlist->name ?? 'Friend',
                    $waitlist->position,
                    $waitlist->referral_code
                ));
            } catch (\Exception $e) {
                Log::warning("Welcome email failed: " . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Successfully joined the waitlist!',
                'position' => $waitlist->position,
                'referral_code' => $waitlist->referral_code,
                'referral_link' => "https://mercasto.com/waitlist?ref={$waitlist->referral_code}",
                'already_subscribed' => false,
            ], 201);

        } catch (\Exception $e) {
            Log::error("Waitlist subscription error", [
                'error' => $e->getMessage(),
                'email' => $request->email
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to join waitlist. Please try again.',
            ], 500);
        }
    }

    public function verifyInvite(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invite_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invite code is required',
                'errors' => $validator->errors()
            ], 422);
        }

        $invite = InviteWhitelist::where('invite_code', $request->invite_code)
            ->where('used', false)
            ->first();

        if (!$invite) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or already used invite code',
                'valid' => false,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Valid invite code',
            'valid' => true,
            'email' => $invite->email,
        ]);
    }

    public function checkStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Valid email is required',
                'errors' => $validator->errors()
            ], 422);
        }

        $waitlist = WaitlistEmail::where('email', strtolower($request->email))->first();
        $whitelist = InviteWhitelist::where('email', strtolower($request->email))
            ->where('used', false)
            ->first();

        if ($whitelist) {
            return response()->json([
                'success' => true,
                'status' => 'invited',
                'message' => 'You have been invited!',
                'invite_code' => $whitelist->invite_code,
            ]);
        }

        if ($waitlist) {
            return response()->json([
                'success' => true,
                'status' => 'waiting',
                'message' => 'You are on the waitlist',
                'position' => $waitlist->position,
                'referral_code' => $waitlist->referral_code,
                'referral_link' => "https://mercasto.com/waitlist?ref={$waitlist->referral_code}",
                'invited' => $waitlist->invited,
            ]);
        }

        return response()->json([
            'success' => true,
            'status' => 'not_found',
            'message' => 'Email not found in waitlist',
        ]);
    }

    public function stats(Request $request)
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'stats' => [
                'total_waiting' => WaitlistEmail::where('invited', false)->count(),
                'total_invited' => WaitlistEmail::where('invited', true)->count(),
                'invites_used' => InviteWhitelist::where('used', true)->count(),
                'invites_unused' => InviteWhitelist::where('used', false)->count(),
            ]
        ]);
    }


    /**
     * Public stats for social proof (no auth required)
     * Returns only total subscriber count for waitlist landing page
     */
    public function publicStats()
    {
        $totalSubscribers = WaitlistEmail::count();
        
        // Cache for 5 minutes to reduce DB load
        return response()->json([
            'success' => true,
            'total_subscribers' => $totalSubscribers,
        ])->header('Cache-Control', 'public, max-age=300');
    }

}
