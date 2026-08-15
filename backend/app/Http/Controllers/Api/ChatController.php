<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
use App\Events\NewNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Jobs\SendTelegramMessageNotification;

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

    public function getConversationMessages(Request $request, Conversation $conversation)
    {
        $userId = (int) $request->user()->id;
        $this->authorizeConversation($conversation, $userId);

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
                'is_read' => true,
            ]);

        DB::table('user_notifications')
            ->where('user_id', $userId)
            ->where('type', 'message')
            ->where('link', $this->conversationLink((int) $conversation->id))
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => now()]);

        $conversation->forceFill($conversation->buyer_id === $userId
            ? ['buyer_unread_count' => 0]
            : ['seller_unread_count' => 0]
        )->save();

        $messages = Message::with(['sender:id,name,avatar_url', 'conversation.ad:id,title,price,image_url'])
            ->where('conversation_id', $conversation->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn (Message $message) => $this->formatMessage($message, $userId));

        return response()->json([
            'conversation' => $this->formatConversation(
                $conversation->fresh(['ad:id,title,price,image_url', 'buyer:id,name,avatar_url', 'seller:id,name,avatar_url', 'latestMessage']),
                $userId,
            ),
            'messages' => $messages,
        ]);
    }

    public function sendMessage(Request $request) {
        $data = $request->validate([
            'receiver_id' => 'required|integer|exists:users,id',
            'content' => 'required|string|max:1000',
            'ad_id' => 'required|integer|exists:ads,id',
        ]);
        $userId = (int) $request->user()->id;
        $receiverId = (int) $data['receiver_id'];
        if ($userId === $receiverId) {
            return response()->json(['error' => 'Cannot send to self'], 422);
        }

        if ($this->usesConversationSchema()) {
            $adId = (int) $data['ad_id'];
            $ad = Ad::select('id', 'user_id', 'title')->findOrFail($adId);
            $sellerId = (int) $ad->user_id;

            if ($userId !== $sellerId && $receiverId !== $sellerId) {
                return response()->json([
                    'error' => 'El destinatario debe ser el vendedor del anuncio.',
                ], 422);
            }

            $buyerId = $userId === $sellerId ? $receiverId : $userId;
            if ($userId === $sellerId) {
                $existingConversation = Conversation::query()
                    ->where('ad_id', $adId)
                    ->where('buyer_id', $buyerId)
                    ->where('seller_id', $sellerId)
                    ->first();
                if ($existingConversation === null) {
                    return response()->json([
                        'error' => 'No existe una conversación para responder.',
                    ], 403);
                }
            }

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
                'receiver_id' => $receiverId,
                'ad_id' => $adId,
                'content' => $data['content'],
                'body' => $data['content'],
                'type' => 'text',
                'is_read' => false,
            ]);

            $unreadColumn = $receiverId === $conversation->buyer_id ? 'buyer_unread_count' : 'seller_unread_count';
            $conversation->increment($unreadColumn, 1, ['last_message_at' => $message->created_at]);
            $conversation->refresh();

            broadcast(new MessageSent($message->load('sender:id,name,avatar_url', 'conversation')))->toOthers();

            SendTelegramMessageNotification::dispatch(
                $receiverId,
                $userId,
                $request->user()->name,
                $data['content'],
                $ad->title
            );
            $this->notifyMessageRecipient(
                $receiverId,
                (int) $conversation->id,
                $adId,
                (string) $request->user()->name,
                (string) $ad->title,
                (string) $data['content'],
                $userId,
            );

            return response()->json($this->formatMessage($message->load('sender:id,name,avatar_url', 'conversation.ad:id,title,price,image_url'), $userId));
        }

        $message = Message::create(['sender_id' => $request->user()->id, 'receiver_id' => $request->receiver_id, 'content' => $data['content'], 'ad_id' => $data['ad_id']]);
        broadcast(new MessageSent($message))->toOthers();

        SendTelegramMessageNotification::dispatch(
            (int) $request->receiver_id,
            $request->user()->id,
            $request->user()->name,
            $data['content'],
            Ad::find($data['ad_id'])?->title
        );

        return response()->json($message->load('sender:id,name,avatar_url'));
    }

    private function notifyMessageRecipient(
        int $receiverId,
        int $conversationId,
        int $adId,
        string $senderName,
        string $adTitle,
        string $content,
        int $senderId,
    ): void {
        $link = $this->conversationLink($conversationId);
        $now = now();
        $payload = [
            'conversation_id' => $conversationId,
            'listing_id' => $adId,
            'ad_id' => $adId,
            'sender_id' => $senderId,
            'sender_name' => $senderName,
            'ad_title' => $adTitle,
        ];
        $notification = [
            'user_id' => $receiverId,
            'title' => $senderName,
            'message' => str($content)->limit(180)->toString(),
            'is_read' => false,
            'type' => 'message',
            'data' => json_encode($payload, JSON_THROW_ON_ERROR),
            'link' => $link,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $existingId = DB::table('user_notifications')
            ->where('user_id', $receiverId)
            ->where('type', 'message')
            ->where('link', $link)
            ->where('is_read', false)
            ->value('id');

        if ($existingId) {
            DB::table('user_notifications')->where('id', $existingId)->update($notification);
            $notification['id'] = (int) $existingId;
        } else {
            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);
        }

        $notification['data'] = $payload;
        $notification['replaces_unread'] = (bool) $existingId;
        $notification['created_at'] = $now->toISOString();
        $notification['updated_at'] = $now->toISOString();
        broadcast(new NewNotification($receiverId, $notification))->toOthers();
    }

    private function conversationLink(int $conversationId): string
    {
        return '/mensajes?conversation=' . $conversationId;
    }

    private function authorizeConversation(Conversation $conversation, int $userId): void
    {
        abort_unless(
            $conversation->buyer_id === $userId || $conversation->seller_id === $userId,
            403,
            'No autorizado.',
        );
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
