<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class BusinessProfileController extends Controller
{
    private function imageManager(): ImageManager
    {
        return ImageManager::withDriver(Driver::class);
    }

    public function show(Request $request)
    {
        return response()->json($this->businessProfilePayload($request->user(), includePrivate: true));
    }

    public function publicShow(int $id)
    {
        $payload = Cache::remember("public_business_profile_{$id}", 600, function () use ($id) {
            $user = User::findOrFail($id);

            return $this->businessProfilePayload($user, includePrivate: false);
        });

        return response()->json($payload);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_profile_enabled' => ['sometimes', 'boolean'],
            'business_name' => ['nullable', 'string', 'max:120'],
            'business_rfc' => ['nullable', 'string', 'regex:/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i'],
            'business_website' => ['nullable', 'url', 'max:255'],
            'business_phone' => ['nullable', 'string', 'max:20'],
            'business_whatsapp' => ['nullable', 'string', 'max:20'],
            'business_address' => ['nullable', 'string', 'max:255'],
            'business_description' => ['nullable', 'string', 'max:1200'],
            'business_hours' => ['nullable', 'array'],
            'business_hours.*.day' => ['required_with:business_hours', 'string', 'max:20'],
            'business_hours.*.open' => ['nullable', 'date_format:H:i'],
            'business_hours.*.close' => ['nullable', 'date_format:H:i'],
            'business_hours.*.closed' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('business_rfc', $data)) {
            $nextRfc = $data['business_rfc'] ? strtoupper(trim($data['business_rfc'])) : null;
            if ($nextRfc !== $user->business_rfc) {
                $user->business_rfc_verified_at = null;
                $user->business_rfc_status = 'pending';
                $user->business_rfc_ai_notes = null;
                $user->business_rfc_checked_at = null;
            }
            $data['business_rfc'] = $nextRfc;
        }

        if (($data['business_profile_enabled'] ?? false) && empty($data['business_name']) && empty($user->business_name)) {
            return response()->json([
                'message' => 'El nombre comercial es obligatorio para activar el perfil de negocio.',
                'errors' => ['business_name' => ['El nombre comercial es obligatorio para activar el perfil de negocio.']],
            ], 422);
        }

        $user->fill($data);
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json($this->businessProfilePayload($user->fresh(), includePrivate: true));
    }

    public function uploadLogo(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        if ($user->business_logo_url && ! str_starts_with($user->business_logo_url, 'http')) {
            Storage::disk('public')->delete($user->business_logo_url);
        }

        $path = 'business-logos/' . Str::uuid() . '.webp';
        $img = $this->imageManager()
            ->decode($request->file('logo'))
            ->contain(512, 512)
            ->encodeUsingFileExtension('webp', quality: 88);

        Storage::disk('public')->put($path, (string) $img);

        $user->business_logo_url = $path;
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json([
            'business_logo_url' => $user->business_logo_url,
            'message' => 'Logo actualizado correctamente',
        ]);
    }

    public function uploadBanner(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'banner' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        if ($user->business_banner_url && ! str_starts_with($user->business_banner_url, 'http')) {
            Storage::disk('public')->delete($user->business_banner_url);
        }

        $path = 'business-banners/' . Str::uuid() . '.webp';
        $img = $this->imageManager()
            ->decode($request->file('banner'))
            ->cover(1200, 400)
            ->encodeUsingFileExtension('webp', quality: 90);

        Storage::disk('public')->put($path, (string) $img);

        $user->business_banner_url = $path;
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json([
            'business_banner_url' => $user->business_banner_url,
            'message' => 'Banner de portada actualizado correctamente',
        ]);
    }

    private function businessProfilePayload(User $user, bool $includePrivate): array
    {
        $isBusiness = $user->role === 'business' || (bool) $user->business_profile_enabled;

        $payload = [
            'user_id' => $user->id,
            'enabled' => (bool) $user->business_profile_enabled,
            'is_business' => $isBusiness,
            'business_name' => $user->business_name,
            'business_logo_url' => $user->business_logo_url,
            'business_banner_url' => $user->business_banner_url,
            'business_website' => $user->business_website ?: $user->website,
            'business_phone' => $includePrivate ? $user->business_phone : null,
            'business_whatsapp' => $isBusiness ? ($user->business_whatsapp ?: $user->whatsapp) : null,
            'business_hours' => $user->business_hours ?: [],
            'business_address' => $user->business_address,
            'business_description' => $user->business_description,
            'business_rfc_verified' => (bool) $user->business_rfc_verified_at,
        ];

        if ($includePrivate) {
            $payload['business_rfc'] = $user->business_rfc;
            $payload['business_rfc_verified_at'] = $user->business_rfc_verified_at?->toISOString();
            $payload['business_csf_url'] = $user->business_csf_url;
            $payload['business_rfc_status'] = $user->business_rfc_status ?: 'pending';
            $payload['business_rfc_ai_notes'] = $user->business_rfc_ai_notes;
            $payload['business_rfc_checked_at'] = $user->business_rfc_checked_at?->toISOString();
        }

        return $payload;
    }

    /**
     * Sube la Constancia de Situación Fiscal (CSF) del SAT y la coteja con el RFC
     * capturado usando IA. No existe una API pública del SAT para validar RFC+CSF
     * en tiempo real, así que este chequeo es un pre-filtro: solo aprueba
     * automáticamente cuando la IA está segura de una coincidencia exacta;
     * cualquier duda queda pendiente de revisión manual por un administrador.
     */
    public function uploadCsf(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'csf' => ['required', 'file', 'mimes:pdf', 'max:5120'],
        ]);

        if (empty($user->business_rfc)) {
            return response()->json(['message' => 'Captura tu RFC antes de subir la Constancia de Situación Fiscal.'], 400);
        }

        $geminiKey = config('services.gemini.api_key');
        if (empty($geminiKey)) {
            \Illuminate\Support\Facades\Log::error('Gemini API key not configured — CSF verification rejected');
            return response()->json(['message' => 'La verificación automática no está disponible temporalmente. Inténtalo más tarde.'], 503);
        }

        if ($user->business_csf_url && ! str_starts_with($user->business_csf_url, 'http')) {
            Storage::disk('local')->delete($user->business_csf_url);
        }

        $path = 'business-csf/' . $user->id . '/' . \Illuminate\Support\Str::uuid() . '.pdf';
        Storage::disk('local')->put($path, file_get_contents($request->file('csf')->getRealPath()));

        try {
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseFile($request->file('csf')->getRealPath());
            $text = trim($pdf->getText());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('CSF PDF parse failed', ['error' => $e->getMessage()]);
            $text = '';
        }

        if (mb_strlen($text) < 40) {
            $user->business_csf_url = $path;
            $user->business_rfc_status = 'ai_flagged';
            $user->business_rfc_ai_notes = 'No se pudo leer el contenido del PDF (posible escaneo de imagen). Revisión manual requerida.';
            $user->business_rfc_checked_at = now();
            $user->save();

            return response()->json([
                'success' => true,
                'status' => 'ai_flagged',
                'notes' => $user->business_rfc_ai_notes,
            ]);
        }

        $aiResult = $this->crossCheckCsfWithAi($text, $user->business_rfc, $user->business_name ?: $user->name, $geminiKey);

        $user->business_csf_url = $path;
        $user->business_rfc_ai_notes = $aiResult['notes'];
        $user->business_rfc_checked_at = now();

        if ($aiResult['verdict'] === 'match') {
            $user->business_rfc_status = 'ai_verified';
            $user->business_rfc_verified_at = now();
        } elseif ($aiResult['verdict'] === 'mismatch') {
            $user->business_rfc_status = 'rejected';
        } else {
            $user->business_rfc_status = 'ai_flagged';
        }

        $user->save();
        $this->clearProfileCaches($user->id);

        return response()->json([
            'success' => true,
            'status' => $user->business_rfc_status,
            'notes' => $user->business_rfc_ai_notes,
            'sat_verify_url' => 'https://www.sat.gob.mx/aplicacion/operacion/17419/verifica-tu-rfc',
        ]);
    }

    /**
     * Pide a Gemini que compare el texto extraído de la CSF contra el RFC y
     * nombre capturados. Devuelve ['verdict' => match|mismatch|uncertain, 'notes' => string].
     */
    private function crossCheckCsfWithAi(string $csfText, string $rfc, string $businessName, string $geminiKey): array
    {
        $prompt = "Eres un verificador de documentos fiscales mexicanos (SAT). "
            . "Se te da el texto extraído de una Constancia de Situación Fiscal (CSF) y los datos que un usuario capturó en un formulario. "
            . "Responde EXCLUSIVAMENTE con un JSON de la forma {\"verdict\": \"match\"|\"mismatch\"|\"uncertain\", \"notes\": \"...\"}. "
            . "\"match\" solo si el RFC del documento coincide EXACTAMENTE con el capturado y el documento aparenta ser una CSF real y vigente. "
            . "\"mismatch\" si el RFC no coincide o el nombre/razón social es claramente distinto. "
            . "\"uncertain\" si el texto es ambiguo, incompleto, o no puedes confirmar con seguridad.\n\n"
            . "RFC capturado: {$rfc}\n"
            . "Nombre/razón social capturado: {$businessName}\n\n"
            . "Texto extraído de la CSF:\n" . mb_substr($csfText, 0, 6000);

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(20)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}",
                [
                    'contents' => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => ['temperature' => 0, 'responseMimeType' => 'application/json'],
                ]
            );

            if (! $response->successful()) {
                \Illuminate\Support\Facades\Log::error('Gemini CSF check failed', ['status' => $response->status()]);
                return ['verdict' => 'uncertain', 'notes' => 'No se pudo completar la verificación automática. Pendiente de revisión manual.'];
            }

            $raw = $response->json('candidates.0.content.parts.0.text', '');
            $decoded = json_decode(trim($raw), true);

            if (! is_array($decoded) || ! in_array($decoded['verdict'] ?? null, ['match', 'mismatch', 'uncertain'], true)) {
                return ['verdict' => 'uncertain', 'notes' => 'Respuesta de IA no interpretable. Pendiente de revisión manual.'];
            }

            return [
                'verdict' => $decoded['verdict'],
                'notes' => (string) ($decoded['notes'] ?? ''),
            ];
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Gemini CSF check exception', ['error' => $e->getMessage()]);
            return ['verdict' => 'uncertain', 'notes' => 'Error al contactar el servicio de verificación. Pendiente de revisión manual.'];
        }
    }

    public function directory(Request $request)
    {
        $query = User::where(function($q) {
            $q->where('business_profile_enabled', true)
              ->orWhere('role', 'business');
        });

        // Filter by state/city if provided
        if ($request->filled('state')) {
            $query->where('business_address', 'like', '%' . $request->state . '%');
        }
        if ($request->filled('city')) {
            $query->where('business_address', 'like', '%' . $request->city . '%');
        }

        // Filter by search query (name or description)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('business_name', 'like', "%{$search}%")
                  ->orWhere('business_description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $category = $request->category;
            $query->where('business_description', 'like', "%{$category}%");
        }

        $stores = $query->select([
            'id', 'name', 'avatar_url', 'role', 'is_verified', 'created_at',
            'business_name', 'business_logo_url', 'business_banner_url',
            'business_website', 'business_address',
            'business_description', 'business_rfc_verified_at'
        ])->latest()->paginate(24);

        // Map rating average and total ads count per store to display on the directory
        $stores->getCollection()->transform(function($store) {
            $reviewStats = DB::table('reviews')
                ->where('seller_id', $store->id)
                ->selectRaw('COUNT(*) as count, AVG(rating) as avg')
                ->first();

            $store->rating_count = (int) ($reviewStats->count ?? 0);
            $store->rating_avg = round((float) ($reviewStats->avg ?? 0), 1);
            $store->active_ads_count = DB::table('ads')
                ->where('user_id', $store->id)
                ->where('status', 'active')
                ->count();

            return $store;
        });

        return response()->json($stores);
    }

    /**
     * Lista de registros de empresa que quedaron marcados por la IA como
     * "ai_flagged" o "rejected" y requieren revisión manual de un administrador.
     */
    public function adminPendingVerifications(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $users = User::whereIn('business_rfc_status', ['ai_flagged', 'rejected'])
            ->whereNotNull('business_csf_url')
            ->orderByDesc('business_rfc_checked_at')
            ->get(['id', 'name', 'email', 'business_name', 'business_rfc', 'business_rfc_status', 'business_rfc_ai_notes', 'business_rfc_checked_at', 'business_csf_url']);

        return response()->json($users);
    }

    public function adminDownloadCsf(Request $request, int $userId)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $user = User::findOrFail($userId);
        if (! $user->business_csf_url || ! Storage::disk('local')->exists($user->business_csf_url)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        return Storage::disk('local')->download($user->business_csf_url, "CSF-{$user->business_rfc}.pdf");
    }

    public function adminReviewVerification(Request $request, int $userId)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $data = $request->validate([
            'decision' => ['required', 'string', 'in:approve,reject'],
        ]);

        $user = User::findOrFail($userId);

        if ($data['decision'] === 'approve') {
            $user->business_rfc_status = 'admin_verified';
            $user->business_rfc_verified_at = now();
        } else {
            $user->business_rfc_status = 'rejected';
            $user->business_rfc_verified_at = null;
        }

        $user->save();
        $this->clearProfileCaches($user->id);

        return response()->json(['success' => true, 'status' => $user->business_rfc_status]);
    }

    private function clearProfileCaches(int $userId): void
    {
        Cache::forget("public_profile_{$userId}");
        Cache::forget("public_business_profile_{$userId}");
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
    }
}
