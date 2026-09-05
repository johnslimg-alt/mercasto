<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ListingAutofillGatewayClient
{
    public function suggest(string $shortText, array $imagesBase64, array $taxonomy, string $locale): array
    {
        if (! (bool) config('listing_autofill.enabled', true)) {
            throw new RuntimeException('Listing autofill is disabled.');
        }

        $baseUrl = rtrim((string) config('listing_autofill.url', config('services.ai_moderation_gateway.url')), '/');
        $token = (string) config('services.ai_moderation_gateway.token', '');
        $this->assertPrivateGatewayUrl($baseUrl);
        if ($token === '') {
            throw new RuntimeException('Internal AI gateway credential is not configured.');
        }

        $timeout = max(3, min(45, (int) config('listing_autofill.timeout_seconds', 22)));
        $response = Http::acceptJson()
            ->asJson()
            ->withHeaders(['X-Mercasto-Internal-Token' => $token])
            ->connectTimeout(min(3, $timeout))
            ->timeout($timeout)
            ->post($baseUrl.'/v1/autofill/listing', [
                'short_text' => mb_substr(trim($shortText), 0, 1200),
                'images_base64' => array_slice(array_values($imagesBase64), 0, 2),
                'taxonomy' => array_slice(array_values($taxonomy), 0, 40),
                'locale' => mb_substr(strtolower($locale ?: 'es'), 0, 10),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Private listing autofill gateway failed with status '.$response->status().'.');
        }

        $data = $response->json();
        if (! is_array($data)
            || ($data['runtime'] ?? null) !== 'private_local'
            || ($data['authoritative'] ?? null) !== false
            || ($data['requires_seller_confirmation'] ?? null) !== true
            || ! is_string($data['model'] ?? null)
            || trim((string) $data['model']) === '') {
            throw new RuntimeException('Private listing autofill returned an invalid contract.');
        }

        foreach (['category', 'subcategory_hint', 'title', 'description'] as $field) {
            if (! $this->validSuggestion($data[$field] ?? null)) {
                throw new RuntimeException('Private listing autofill returned an invalid field suggestion.');
            }
        }
        if (! is_array($data['attributes'] ?? null)) {
            throw new RuntimeException('Private listing autofill returned invalid attributes.');
        }
        foreach ($data['attributes'] as $key => $value) {
            if (! is_string($key) || ! preg_match('/^[a-zA-Z0-9_-]+$/', $key) || ! $this->validSuggestion($value)) {
                throw new RuntimeException('Private listing autofill returned an invalid attribute suggestion.');
            }
        }

        return $data;
    }

    private function validSuggestion(mixed $value): bool
    {
        return is_array($value)
            && array_key_exists('value', $value)
            && ($value['value'] === null || is_string($value['value']))
            && is_numeric($value['confidence'] ?? null)
            && (float) $value['confidence'] >= 0
            && (float) $value['confidence'] <= 1;
    }

    private function assertPrivateGatewayUrl(string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (app()->environment('testing') && str_ends_with($host, '.test')) {
            return;
        }
        if (! in_array($host, ['mercasto-ai-gateway', 'mercasto_ai_gateway'], true)) {
            throw new RuntimeException('Listing autofill must use the private Mercasto runtime.');
        }
    }
}
