<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Mail\InviteMail;
use Illuminate\Support\Facades\Mail;

class AdminWaitlistController extends Controller
{
    private string $adminSecret;

    public function __construct()
    {
        $this->adminSecret = env('ADMIN_SECRET', 'mercasto-admin-2026');
    }

    private function authenticate(Request $request): bool
    {
        return $request->query('secret') === $this->adminSecret 
            || $request->header('X-Admin-Secret') === $this->adminSecret;
    }

    public function index(Request $request)
    {
        if (!$this->authenticate($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $waitlist = DB::table('waitlist_emails')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($item) {
                $item->referral_count = DB::table('waitlist_emails')
                    ->where('referred_by', $item->referral_code ?? '')
                    ->count();
                return $item;
            });

        $whitelist = DB::table('invite_whitelist')
            ->orderBy('created_at', 'desc')
            ->get();

        $users = DB::table('users')
            ->select('id', 'name', 'email', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        $stats = [
            'waitlist_count' => $waitlist->count(),
            'whitelist_count' => $whitelist->count(),
            'users_count' => DB::table('users')->count(),
            'ads_count' => DB::table('ads')->where('status', 'active')->count(),
            'referrals_count' => DB::table('waitlist_emails')->whereNotNull('referred_by')->count(),
        ];

        return response()->json([
            'stats' => $stats,
            'waitlist' => $waitlist,
            'whitelist' => $whitelist,
            'users' => $users,
        ]);
    }

    public function invite(Request $request)
    {
        if (!$this->authenticate($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->validate([
            'email' => 'required|email',
            'locale' => 'in:en,es,pt',
        ]);

        $email = strtolower(trim($request->email));
        $locale = $request->locale ?? 'es';

        $existing = DB::table('invite_whitelist')->where('email', $email)->first();
        if ($existing) {
            return response()->json([
                'error' => 'Email already whitelisted',
                'invite_code' => $existing->invite_code,
            ], 409);
        }

        $inviteCode = strtoupper(Str::random(10));
        
        DB::table('invite_whitelist')->insert([
            'email' => $email,
            'invite_code' => $inviteCode,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $waitlistEntry = DB::table('waitlist_emails')->where('email', $email)->first();
        $name = $waitlistEntry->name ?? 'Friend';

        try {
            app()->setLocale($locale);
            Mail::to($email)->send(new InviteMail(
                $name,
                "https://mercasto.com/?invite={$inviteCode}",
                14
            ));
            $emailSent = true;
        } catch (\Exception $e) {
            $emailSent = false;
        }

        return response()->json([
            'success' => true,
            'email' => $email,
            'invite_code' => $inviteCode,
            'invite_url' => "https://mercasto.com/?invite={$inviteCode}",
            'email_sent' => $emailSent,
        ]);
    }

    public function bulkInvite(Request $request)
    {
        if (!$this->authenticate($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->validate([
            'emails' => 'required|array|min:1|max:50',
            'emails.*' => 'email',
            'locale' => 'in:en,es,pt',
        ]);

        $results = [];
        foreach ($request->emails as $email) {
            $email = strtolower(trim($email));
            $existing = DB::table('invite_whitelist')->where('email', $email)->first();
            
            if ($existing) {
                $results[] = ['email' => $email, 'status' => 'already_whitelisted', 'code' => $existing->invite_code];
                continue;
            }

            $inviteCode = strtoupper(Str::random(10));
            DB::table('invite_whitelist')->insert([
                'email' => $email,
                'invite_code' => $inviteCode,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $results[] = ['email' => $email, 'status' => 'invited', 'code' => $inviteCode];
        }

        return response()->json(['results' => $results]);
    }

    public function remove(Request $request, $email)
    {
        if (!$this->authenticate($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $deleted = DB::table('invite_whitelist')->where('email', $email)->delete();
        return response()->json(['deleted' => $deleted > 0]);
    }

    public function web(Request $request)
    {
        if (!$this->authenticate($request)) {
            return response('Unauthorized', 401);
        }

        return view('admin.waitlist');
    }
}
