<?php
use Illuminate\Support\Facades\Broadcast;
Broadcast::channel('App.Models.User.{id}', function ($user, $id) { return (int) $user->id === (int) $id; });
// Chat interno: MessageSent transmite a chat.{receiverId} (App/Events/MessageSent.php)
Broadcast::channel('chat.{id}', function ($user, $id) { return (int) $user->id === (int) $id; });
