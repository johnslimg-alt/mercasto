<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ChatController extends Controller {
    public function getConversations(Request $request) {
        $userId = $request->user()->id;
        if ($this->usesConversationSchema()) {
            $conversations = Conversation::with([
                    'ad:id,title,price,image_url',
                    'buyer:id,name,avatar_url',
                    'seller:id,name,avatar_url',
                    'latestMessage:id,conversation_id,sender_id,body,read_at,created_at',
                ])
                ->where('buyer_id', $userId)
                ->orWhere('seller_id', $userId)
                ->orderByDesc('last_message_at')
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (Conversation $conversation) => $this->formatConversation($conversation, $userId));

            return response()->json($conversations);
        }

        $conversations = DB::select("
            SELECT u.id as user_id, u.name, u.avatar_url, m.content as last_message, m.created_at, m.is_read, m.sender_id
            FROM users u
            JOIN (
                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id, MAX(id) as max_id
                FROM messages WHERE sender_id = ? OR receiver_id = ? GROUP BY other_user_id
            ) latest ON u.id = latest.other_user_id
            JOIN messages m ON latest.max_id = m.id
            ORDER BY m.created_at DESC
        ", [$userId, $userId, $userId]);
        return response()->json($conversations);
    }

    public function getMessages(Request $request, $otherUserId) {
        $userId = $request->user()->id;
        if ($this->usesConversationSchema()) {
            $conversations = Conversation::with('ad:id,title,price,image_url')
                ->where(function ($query) use ($userId, $otherUserId) {
                    $query->where('buyer_id', $userId)->where('seller_id', $otherUserId);
                })
                ->orWhere(function ($query) use ($userId, $otherUserId) {
                    $query->where('buyer_id', $otherUserId)->where('seller_id', $userId);
                })
                ->get();

            $conversationIds = $conversations->pluck('id');
            if ($conversationIds->isEmpty()) {
                return response()->json([]);
            }

            Message::whereIn('conversation_id', $conversationIds)
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            foreach ($conversations as $conversation) {
                $conversation->forceFill($conversation->buyer_id === $userId
                    ? ['buyer_unread_count' => 0]
                    : ['seller_unread_count' => 0]
                )->save();
            }

            $messages = Message::with(['sender:id,name,avatar_url', 'conversation.ad:id,title,price,image_url'])
                ->whereIn('conversation_id', $conversationIds)
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(fn (Message $message) => $this->formatMessage($message, $userId));

            return response()->json($messages);
        }

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

        if ($this->usesConversationSchema()) {
            $userId = $request->user()->id;
            $receiverId = (int) $request->receiver_id;
            $adId = $request->filled('ad_id') ? (int) $request->ad_id : null;
            $ad = $adId ? Ad::select('id', 'user_id')->find($adId) : null;

            $sellerId = $ad?->user_id ?: $receiverId;
            $buyerId = $userId === $sellerId ? $receiverId : $userId;

            $conversation = Conversation::firstOrCreate(
                [
                    'buyer_id' => $buyerId,
                    'seller_id' => $sellerId,
                    'ad_id' => $adId,
                ],
                [
                    'status' => 'active',
                    'last_message_at' => now(),
                ]
            );

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $userId,
                'body' => $request->content,
                'type' => 'text',
            ]);

            $unreadColumn = $receiverId === $conversation->buyer_id ? 'buyer_unread_count' : 'seller_unread_count';
            $conversation->increment($unreadColumn, 1, ['last_message_at' => $message->created_at]);
            $conversation->refresh();

            broadcast(new MessageSent($message->load('sender:id,name,avatar_url', 'conversation')))->toOthers();

            return response()->json($this->formatMessage($message->load('sender:id,name,avatar_url', 'conversation.ad:id,title,price,image_url'), $userId));
        }

        $message = Message::create(['sender_id' => $request->user()->id, 'receiver_id' => $request->receiver_id, 'content' => $request->content, 'ad_id' => $request->ad_id]);
        broadcast(new MessageSent($message))->toOthers();
        return response()->json($message->load('sender:id,name,avatar_url'));
    }

    private function usesConversationSchema(): bool
    {
        return Schema::hasTable('conversations')
            && Schema::hasColumn('messages', 'conversation_id')
            && Schema::hasColumn('messages', 'body');
    }

    private function formatConversation(Conversation $conversation, int $userId): array
    {
        $otherUser = $conversation->buyer_id === $userId ? $conversation->seller : $conversation->buyer;
        $unreadCount = $conversation->buyer_id === $userId
            ? $conversation->buyer_unread_count
            : $conversation->seller_unread_count;

        return [
            'conversation_id' => $conversation->id,
            'user_id' => $otherUser?->id,
            'name' => $otherUser?->name,
            'avatar_url' => $otherUser?->avatar_url,
            'ad_id' => $conversation->ad_id,
            'ad' => $conversation->ad,
            'last_message' => $conversation->latestMessage?->body,
            'created_at' => optional($conversation->latestMessage)->created_at ?? $conversation->updated_at,
            'is_read' => $unreadCount === 0,
            'unread_count' => $unreadCount,
            'sender_id' => $conversation->latestMessage?->sender_id,
            'status' => $conversation->status,
        ];
    }

    private function formatMessage(Message $message, int $currentUserId): array
    {
        $conversation = $message->conversation;
        $receiverId = null;
        if ($conversation) {
            $receiverId = $message->sender_id === $conversation->buyer_id
                ? $conversation->seller_id
                : $conversation->buyer_id;
        }

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'receiver_id' => $receiverId,
            'ad_id' => $conversation?->ad_id,
            'content' => $message->body,
            'body' => $message->body,
            'type' => $message->type,
            'offer_amount' => $message->offer_amount,
            'is_read' => $message->sender_id === $currentUserId || $message->read_at !== null,
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'updated_at' => $message->updated_at,
            'sender' => $message->sender,
            'ad' => $conversation?->ad,
        ];
    }
}
