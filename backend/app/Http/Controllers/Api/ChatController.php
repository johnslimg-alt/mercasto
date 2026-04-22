<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller {
    public function getConversations(Request $request) {
        $userId = $request->user()->id;
        $conversations = DB::select("
            SELECT u.id as user_id, u.name, u.avatar_url, m.content as last_message, m.created_at, m.is_read, m.sender_id
            FROM users u
            JOIN (
                SELECT IF(sender_id = ?, receiver_id, sender_id) as other_user_id, MAX(id) as max_id
                FROM messages WHERE sender_id = ? OR receiver_id = ? GROUP BY other_user_id
            ) latest ON u.id = latest.other_user_id
            JOIN messages m ON latest.max_id = m.id
            ORDER BY m.created_at DESC
        ", [$userId, $userId, $userId]);
        return response()->json($conversations);
    }

    public function getMessages(Request $request, $otherUserId) {
        $userId = $request->user()->id;
        Message::where('sender_id', $otherUserId)->where('receiver_id', $userId)->where('is_read', false)->update(['is_read' => true]);
        $messages = Message::with('ad:id,title,price,image_url')
            ->where(function($q) use ($userId, $otherUserId) { $q->where('sender_id', $userId)->where('receiver_id', $otherUserId); })
            ->orWhere(function($q) use ($userId, $otherUserId) { $q->where('sender_id', $otherUserId)->where('receiver_id', $userId); })
            ->orderBy('created_at', 'asc')->get();
        return response()->json($messages);
    }

    public function sendMessage(Request $request) {
        $request->validate(['receiver_id' => 'required|exists:users,id', 'content' => 'required|string|max:1000', 'ad_id' => 'nullable|exists:ads,id']);
        if ($request->user()->id == $request->receiver_id) return response()->json(['error' => 'Cannot send to self'], 400);
        $message = Message::create(['sender_id' => $request->user()->id, 'receiver_id' => $request->receiver_id, 'content' => $request->content, 'ad_id' => $request->ad_id]);
        broadcast(new MessageSent($message))->toOthers();
        return response()->json($message->load('sender:id,name,avatar_url'));
    }
}
