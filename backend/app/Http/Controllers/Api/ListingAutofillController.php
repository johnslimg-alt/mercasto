<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\ListingAutofillGatewayClient;
use App\Services\AI\ListingAutofillTaxonomy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class ListingAutofillController extends Controller
{
    public function __invoke(
        Request $request,
        ListingAutofillGatewayClient $gateway,
        ListingAutofillTaxonomy $taxonomy,
    ): JsonResponse {
        $validated = $request->validate([
            'hint_text' => 'nullable|string|max:2000',
            'images' => 'nullable|array|max:2',
            'images.*' => 'file|image|mimes:jpeg,jpg,png,webp|max:8192',
        ]);

        $hintText = trim((string) ($validated['hint_text'] ?? ''));
        $images = $request->file('images', []);
        $images = is_array($images) ? array_values($images) : [];
        if ($hintText === '' && $images === []) {
            throw ValidationException::withMessages([
                'hint_text' => ['Agrega una descripción corta o una foto para obtener sugerencias.'],
            ]);
        }

        if (! (bool) config('listing_autofill.enabled', false)) {
            return response()->json($this->unavailable('disabled'));
        }

        try {
            $schema = $taxonomy->schema();
            if (($schema['categories'] ?? []) === []) {
                return response()->json($this->unavailable('taxonomy_unavailable'));
            }

            $encodedImages = array_map(
                fn ($image): string => $this->reencodeImage($image->getRealPath()),
                array_slice($images, 0, (int) config('listing_autofill.max_images', 2)),
            );

            $result = $gateway->suggest($hintText, $encodedImages, $schema);
            $suggestions = $taxonomy->sanitize((array) $result['proposal'], $schema);

            return response()->json([
                'available' => true,
                'suggestions' => $suggestions,
                'runtime' => [
                    'provider' => 'ollama',
                    'execution' => 'private_local',
                    'model' => $result['model'],
                    'gateway_version' => $result['gateway_version'],
                ],
                'rollout_mode' => 'suggestion_only',
                'authoritative' => false,
                'seller_confirmation_required' => true,
                'warnings' => array_values(array_filter((array) ($result['warnings'] ?? []), 'is_string')),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Private listing autofill unavailable; manual publish remains available.', [
                'user_id' => $request->user()?->id,
                'exception' => $exception::class,
            ]);

            return response()->json($this->unavailable('ai_unavailable'));
        }
    }

    private function unavailable(string $reason): array
    {
        return [
            'available' => false,
            'suggestions' => null,
            'reason' => $reason,
            'rollout_mode' => 'suggestion_only',
            'authoritative' => false,
            'seller_confirmation_required' => true,
        ];
    }

    private function reencodeImage(string $path): string
    {
        $info = @getimagesize($path);
        if (! is_array($info) || empty($info[0]) || empty($info[1])) {
            throw new \RuntimeException('Invalid image dimensions.');
        }
        $width = (int) $info[0];
        $height = (int) $info[1];
        if ($width <= 0 || $height <= 0 || ($width * $height) > 30_000_000) {
            throw new \RuntimeException('Image dimensions exceed the autofill safety budget.');
        }

        $bytes = @file_get_contents($path);
        $source = is_string($bytes) ? @imagecreatefromstring($bytes) : false;
        if ($source === false) {
            throw new \RuntimeException('Image decoding failed.');
        }

        $maximum = 768;
        $scale = min(1.0, $maximum / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        if ($target === false) {
            imagedestroy($source);
            throw new \RuntimeException('Image buffer allocation failed.');
        }

        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
        ob_start();
        $encoded = imagejpeg($target, null, 78);
        $jpeg = ob_get_clean();
        imagedestroy($target);
        imagedestroy($source);

        if (! $encoded || ! is_string($jpeg) || $jpeg === '') {
            throw new \RuntimeException('Image re-encoding failed.');
        }

        return base64_encode($jpeg);
    }
}
