<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AdViewed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $adId;
    public string $adTitle;
    private int $ownerId;

    public function __construct(int $ownerId, int $adId, string $adTitle)
    {
        $this->ownerId  = $ownerId;
        $this->adId    = $adId;
        $this->adTitle = $adTitle;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->ownerId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'AdViewed';
    }

    public function broadcastWith(): array
    {
        return [
            'ad_id'    => $this->adId,
            'ad_title' => $this->adTitle,
        ];
    }
}
