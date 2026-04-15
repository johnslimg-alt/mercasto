<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContactController extends Controller
{
    /**
     * Record a click event for ad contacts (e.g., WhatsApp button)
     */
    public function recordClick(Request $request, $id)
    {
        $request->validate([
            'channel' => 'required|string|in:whatsapp,phone,email'
        ]);

        $ad = Ad::find($id);

        if (!$ad) {
            return response()->json(['message' => 'Anuncio no encontrado'], 404);
        }

        // Insert the click record into the analytics table
        DB::table('ad_clicks')->insert([
            'ad_id' => $ad->id,
            'user_id' => auth('sanctum')->id(), // Tracks the user if they are logged in, otherwise null
            'channel' => $request->input('channel'),
            'ip_address' => $request->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Click recorded successfully']);
    }
}