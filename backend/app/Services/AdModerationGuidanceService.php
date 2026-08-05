<?php

namespace App\Services;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use Illuminate\Support\Str;

class AdModerationGuidanceService
{
    private const ADMIN_ONLY_TERMS = [
        'desbloqueo',
        'unlock',
        'iptv',
        'copyright',
        'pyramid',
        'regulated',
    ];

    public function sellerCorrection(Ad $ad): ?array
    {
        if ($ad->status !== 'archived' || $ad->ai_moderation_status !== 'manual_review') {
            return null;
        }

        $decision = $this->latestManualReviewDecision($ad);
        $flags = $this->normalizedFlags($decision);
        $flagText = implode(' ', $flags);

        if ($flagText === '' || $this->containsAny($flagText, self::ADMIN_ONLY_TERMS)) {
            return null;
        }

        $issues = [];
        if ($this->containsAny($flagText, [
            'foto', 'photo', 'image', 'placeholder', 'stock',
        ])) {
            $issues['photos'] = 'Añade fotos reales y recientes del artículo o vehículo.';
        }

        if ($this->containsAny($flagText, [
            'condition', 'condicion', 'contrad', 'inconsist',
            'mileage', 'kilomet', 'metadata', 'attribute',
        ])) {
            $issues['details'] = 'Corrige la condición, el kilometraje y los datos que no coincidan con la descripción.';
        }

        if ($this->containsAny($flagText, [
            'precio', 'price',
        ])) {
            $issues['price'] = 'Revisa el precio y explica claramente cualquier diferencia frente al valor habitual.';
        }

        if ($this->containsAny($flagText, [
            'descripcion_insuficiente', 'categoria_incorrecta', 'servicio_ofrecido_como_bien',
        ])) {
            $issues['description'] = 'Amplía la descripción y selecciona la categoría correcta.';
        }

        if ($this->containsAny($flagText, [
            'advance_payment', 'anticipo',
        ])) {
            $issues['payment'] = 'Aclara el anticipo, reduce cualquier pago inicial excesivo y explica qué incluye antes de solicitar dinero.';
        }

        if ($issues === []) {
            return null;
        }

        return [
            'required' => true,
            'issue_codes' => array_keys($issues),
            'messages' => array_values($issues),
            'action_url' => '/anuncio/' . $ad->id . '/editar',
            'resubmits_after_edit' => true,
        ];
    }

    private function latestManualReviewDecision(Ad $ad): ?AdModerationDecision
    {
        if ($ad->relationLoaded('latestModerationDecision')) {
            $decision = $ad->getRelation('latestModerationDecision');
            return $decision instanceof AdModerationDecision ? $decision : null;
        }

        return $ad->moderationDecisions()
            ->where('source', 'ai')
            ->where('decision', 'manual_review')
            ->first();
    }

    private function normalizedFlags(?AdModerationDecision $decision): array
    {
        $result = $decision?->metadata['result'] ?? [];
        $flags = is_array($result['flags'] ?? null) ? $result['flags'] : [];

        return collect($flags)
            ->map(fn ($flag) => Str::lower(trim((string) $flag)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }
}
