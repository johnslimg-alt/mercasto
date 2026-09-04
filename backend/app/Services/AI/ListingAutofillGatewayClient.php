<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ListingAutofillGatewayClient
{
    public function suggest(string $hintText, array $imagesBase64, array $taxonomy): array
    {
        $baseUrl = rtrim((string) config('listing_autofill.gateway_url', config('services.ai_moderation_gateway.url')), '/');
        $token = (string) config('services.ai_moderation_gateway.token', '');
        $this->assertPrivateGatewayUrl($baseUrl);
        if ($token === '') {
            throw new RuntimeException('Internal AI gateway credential is not configured.');
        }

        $timeout = max(1, min(30, (int) config('listing_autofill.timeout_seconds', 20)));
        $response = Http::acceptJson()
            ->asJson()
            ->withHeaders(['X-Mercasto-Internal-Token' => $token])
            ->connectTimeout(min(3, $timeout))
            ->timeout($timeout)
            ->post($baseUrl.'/v1/autofill/listing', [
                'hint_text' => $hintText,
                'images_base64' => array_values(array_slice($imagesBase64, 0, 2)),
                'taxonomy' => $taxonomy,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Private listing autofill gateway failed with status '.$response->status().'.');
        }

        $data = $response->json();
        if (! is_array($data)
            || ($data['runtime'] ?? null) !== 'private_local'
            || ($data['provider'] ?? null) !== 'ollama'
            || ($data['rollout_mode'] ?? null) !== 'suggestion_only'
            || ($data['authoritative'] ?? null) !== false
            || ! is_string($data['model'] ?? null)
            || trim((string) ($data['model'] ?? '')) === ''
            || ! is_string($data['gateway_version'] ?? null)
            || ! is_array($data['proposal'] ?? null)) {
            throw new RuntimeException('Private listing autofill gateway returned an invalid contract.');
        }

        return $data;
    }

    private function assertPrivateGatewayUrl(string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (app()->environment('testing') && str_ends_with($host, '.test')) {
            return;
        }

        if (! in_array($host, ['mercasto-ai-gateway', 'mercasto_ai_gateway'], true)) {
            throw new RuntimeException('Listing autofill gateway must use the private Mercasto runtime.');
        }
    }
}
