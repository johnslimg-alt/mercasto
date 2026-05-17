<?php
namespace App\Events;
use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public $message;
    private int $receiverId;

    public function __construct(Message $message) {
        $this->message = $message->loadMissing('sender:id,name,avatar_url', 'conversation');
        $conversation = $this->message->conversation;
        $this->receiverId = $conversation
            ? (int) ($this->message->sender_id === $conversation->buyer_id ? $conversation->seller_id : $conversation->buyer_id)
            : (int) $this->message->receiver_id;
    }

    public function broadcastOn() { return new PrivateChannel('chat.' . $this->receiverId); }
    public function broadcastAs() { return 'message.sent'; }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'sender_id' => $this->message->sender_id,
                'receiver_id' => $this->receiverId,
                'content' => $this->message->content,
                'body' => $this->message->body,
                'type' => $this->message->type,
                'read_at' => $this->message->read_at,
                'created_at' => $this->message->created_at,
                'sender' => $this->message->sender,
            ],
        ];
    }
}
