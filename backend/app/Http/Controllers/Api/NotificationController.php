<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * Returns paginated notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        $notifications = DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        // Decode JSON data field for each notification
        $notifications->getCollection()->transform(function ($n) {
            $n->data = $n->data ? json_decode($n->data, true) : null;
            return $n;
        });

        return response()->json($notifications);
    }

    /**
     * POST /api/notifications/{id}/read
     * Marks a single notification as read.
     */
    public function markRead(Request $request, $id)
    {
        DB::table('user_notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/notifications/read-all
     * Marks all unread notifications as read.
     */
    public function markAllRead(Request $request)
    {
        DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * GET /api/notifications/unread-count
     * Returns the count of unread notifications.
     */
    public function unreadCount(Request $request)
    {
        $count = DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }
}
