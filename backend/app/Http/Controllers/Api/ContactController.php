<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\SellerContactMail;
use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    /**
     * Contact the seller of an ad without exposing the seller's email address.
     * The message is relayed server-side; the buyer never sees the seller email
     * and the seller can reply via the reply-to header.
     */
    public function contactSeller(Request $request, int $id)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'email'   => 'required|email|max:190',
            'message' => 'required|string|min:10|max:2000',
            // Honeypot: must stay empty.
            'website' => 'nullable|string|max:0',
        ]);

        $ad = Ad::with('user:id,name,email,notification_preferences')
            ->where('status', 'active')
            ->find($id);

        if (!$ad || !$ad->user || !filter_var($ad->user->email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['message' => 'Anuncio no disponible.'], 404);
        }

        // Cuentas creadas por teléfono/social tienen emails placeholder (.local) no entregables.
        if (str_ends_with(strtolower($ad->user->email), '.local')) {
            return response()->json([
                'message' => 'Este vendedor no recibe mensajes por correo. Usa otro canal de contacto.',
            ], 422);
        }

        // Respetar la preferencia de notificación del vendedor (email_ad_reply, por defecto activada).
        $prefs = $ad->user->notification_preferences ?? [];
        if (is_string($prefs)) {
            $prefs = json_decode($prefs, true) ?: [];
        }
        if (($prefs['email_ad_reply'] ?? true) === false) {
            return response()->json([
                'message' => 'Este vendedor no recibe mensajes por correo. Usa otro canal de contacto.',
            ], 422);
        }

        try {
            Mail::to($ad->user->email)->queue(new SellerContactMail(
                strip_tags($data['name']),
                $data['email'],
                strip_tags($data['message']),
                (string) $ad->title,
                (int) $ad->id,
            ));
        } catch (\Throwable $e) {
            Log::error('contact-seller mail failed', [
                'ad_id' => $ad->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.',
            ], 503);
        }

        Log::info('contact-seller message relayed', [
            'ad_id'            => $ad->id,
            'buyer_email_hash' => hash('sha256', strtolower($data['email'])),
            'message_length'   => mb_strlen($data['message']),
        ]);

        return response()->json([
            'ok'      => true,
            'message' => 'Mensaje enviado al vendedor.',
        ]);
    }
}
