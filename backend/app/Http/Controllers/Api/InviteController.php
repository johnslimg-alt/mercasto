<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\InviteWhitelist;
use App\Models\WaitlistEmail;
use Illuminate\Support\Facades\Mail;

class InviteController extends Controller
{
    /**
     * Get all whitelisted emails (admin only)
     */
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $whitelist = InviteWhitelist::orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $whitelist,
        ]);
    }

    /**
     * Add email to whitelist and send invite
     */
    public function store(Request $request)
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'email' => 'required|email',
            'send_email' => 'boolean',
        ]);

        $email = strtolower(trim($validated['email']));

        $existing = InviteWhitelist::where('email', $email)->first();
        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Email already whitelisted',
                'invite_code' => $existing->invite_code,
            ], 409);
        }

        $whitelist = InviteWhitelist::create([
            'email' => $email,
            'status' => 'active',
        ]);

        // Update waitlist if exists
        WaitlistEmail::where('email', $email)->update([
            'invited_at' => now(),
        ]);

        // Send invite email if requested
        if ($validated['send_email'] ?? true) {
            // TODO: Send invite email with localization
            // Mail::to($email)->send(new InviteEmail($whitelist->invite_code, $request->user()->locale ?? 'en'));
        }

        return response()->json([
            'success' => true,
            'message' => 'Email added to whitelist',
            'data' => [
                'email' => $whitelist->email,
                'invite_code' => $whitelist->invite_code,
                'invite_url' => "https://mercasto.com/?invite={$whitelist->invite_code}",
            ],
        ], 201);
    }

    /**
     * Remove email from whitelist
     */
    public function destroy(Request $request, $email)
    {
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $whitelist = InviteWhitelist::where('email', strtolower(trim($email)))->first();
        
        if (!$whitelist) {
            return response()->json([
                'success' => false,
                'message' => 'Email not found in whitelist',
            ], 404);
        }

        $whitelist->delete();

        return response()->json([
            'success' => true,
            'message' => 'Email removed from whitelist',
        ]);
    }

    /**
     * Check if email is whitelisted
     */
    public function check(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($validated['email']));
        $whitelist = InviteWhitelist::where('email', $email)->where('status', 'active')->first();

        return response()->json([
            'success' => true,
            'is_whitelisted' => (bool) $whitelist,
            'invite_code' => $whitelist?->invite_code,
        ]);
    }
}
