<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiModerationGatewayClient
{
    public function moderateListing(
        string $title,
        string $description,
        array $structuredContext,
        array $imagesBase64,
        int $sourceImageCount,
        array $policySignals,
        int $maxTimeoutSeconds = 150,
    ): array {
        $baseUrl = rtrim((string) config('services.ai_moderation_gateway.url', 'http://mercasto-ai-gateway:8080'), '/');
        $token = (string) config('services.ai_moderation_gateway.token', '');
        $this->assertPrivateGatewayUrl($baseUrl);
        if ($token === '') {
            throw new RuntimeException('Internal AI gateway credential is not configured.');
        }

        $sourceDescriptionChars = mb_strlen($description);
        $descriptionForGateway = mb_substr($description, 0, 12000);
        $contextForGateway = $this->normalizeStructuredContext($structuredContext);
        $configuredTimeout = max(5, min(180, (int) config('services.ai_moderation_gateway.timeout', 150)));
        $timeoutSeconds = max(5, min($configuredTimeout, $maxTimeoutSeconds));
        $imagesForGateway = array_values(array_slice(array_filter($imagesBase64, 'is_string'), 0, 2));
        $signals = array_values(array_slice(array_unique(array_filter($policySignals, 'is_string')), 0, 200));
        if ($signals === []) {
            throw new RuntimeException('Canonical moderation policy signals are not configured.');
        }

        $response = Http::acceptJson()->asJson()
            ->withHeaders(['X-Mercasto-Internal-Token' => $token])
            ->connectTimeout(min(10, $timeoutSeconds))
            ->timeout($timeoutSeconds)
            ->post($baseUrl.'/v1/moderation/listing', [
                'title' => mb_substr($title, 0, 255),
                'description' => $descriptionForGateway,
                'source_description_chars' => $sourceDescriptionChars,
                'structured_context' => $contextForGateway,
                'images_base64' => $imagesForGateway,
                'source_image_count' => max($sourceImageCount, count($imagesForGateway)),
                'policy_signals' => $signals,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Private AI moderation gateway failed with status '.$response->status().'.');
        }

        $data = $response->json();
        if (! is_array($data)
            || ($data['provider'] ?? null) !== 'ollama'
            || ($data['runtime'] ?? null) !== 'private_local'
            || ($data['authoritative'] ?? null) !== false
            || ($data['rollout_mode'] ?? null) !== 'shadow_assist'
            || ! in_array($data['decision'] ?? null, ['approved', 'manual_review', 'rejected'], true)
            || ! is_string($data['model'] ?? null)
            || trim((string) ($data['model'] ?? '')) === ''
            || ! is_string($data['gateway_version'] ?? null)
            || ! is_numeric($data['confidence'] ?? null)
            || ! is_array($data['flags'] ?? null)) {
            throw new RuntimeException('Private AI moderation gateway returned an invalid contract.');
        }

        return $data;
    }

    private function normalizeStructuredContext(array $context): array
    {
        $attributes = $context['attributes'] ?? [];
        $attributesJson = json_encode($attributes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (! is_string($attributesJson)) {
            $attributesJson = '{}';
        } elseif (mb_strlen($attributesJson) > 4000) {
            $attributesJson = json_encode([
                'truncated' => true,
                'preview' => mb_substr($attributesJson, 0, 3500),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{"truncated":true}';
        }

        $bounds = [
            'category' => 120,
            'subcategory' => 120,
            'price' => 64,
            'location' => 255,
            'state' => 120,
            'city' => 120,
            'condition' => 80,
        ];
        $normalized = [];
        foreach ($bounds as $key => $limit) {
            $normalized[$key] = mb_substr((string) ($context[$key] ?? ''), 0, $limit);
        }
        $normalized['attributes_json'] = $attributesJson;

        return $normalized;
    }

    private function assertPrivateGatewayUrl(string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $allowed = ['mercasto-ai-gateway', 'mercasto_ai_gateway'];
        if (app()->environment('testing') && str_ends_with($host, '.test')) {
            return;
        }
        if ($host === '' || ! in_array($host, $allowed, true)) {
            throw new RuntimeException('AI moderation gateway must use the private Mercasto runtime.');
        }
    }
}
