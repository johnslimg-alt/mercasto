<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LocalAiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class AiDescriptionController extends Controller
{
    private const LANGUAGE_NAMES = [
        'es' => 'Mexican Spanish',
        'en' => 'English',
        'pt' => 'Portuguese',
        'fr' => 'French',
        'zh' => 'Simplified Chinese',
        'ko' => 'Korean',
        'de' => 'German',
        'it' => 'Italian',
        'ar' => 'Arabic',
        'he' => 'Hebrew',
        'yi' => 'Yiddish',
        'ru' => 'Russian',
        'ja' => 'Japanese',
    ];

    public function __invoke(Request $request, LocalAiClient $ai): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|min:3|max:200',
            'category' => 'nullable|string|max:100',
            'condition' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0|max:999999999',
            'attributes' => 'nullable|array|max:30',
            'locale' => 'nullable|string|max:10',
        ]);

        $rateLimitKey = 'ai-desc:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            return response()->json([
                'error' => 'Límite de generaciones alcanzado. Inténtalo en ' . RateLimiter::availableIn($rateLimitKey) . ' segundos.',
            ], 429);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        $facts = $this->factsFromRequest($request);
        $locale = $this->resolveLocale($request);

        try {
            $description = $this->generateWithLocalAi($ai, $facts, $locale);

            return response()->json(['description' => $this->guardDescription($description, $request, $locale)]);
        } catch (Throwable $aiError) {
            Log::error('Local AI description failed', [
                'user_id' => $request->user()->id,
                'error' => $aiError->getMessage(),
            ]);
        }

        return response()->json(['error' => 'No se pudo generar la descripción. Inténtalo de nuevo.'], 500);
    }

    private function generateWithLocalAi(LocalAiClient $ai, string $facts, string $locale): string
    {
        $result = $ai->chatFlash(
            [
                [
                    'role' => 'system',
                    'content' => $this->systemPrompt($locale),
                ],
                [
                    'role' => 'user',
                    'content' => "Confirmed listing data:\n{$facts}\nWrite an attractive, honest and concise listing description. Maximum 100 words.",
                ],
            ],
            ['max_tokens' => 140, 'temperature' => 0, 'timeout' => 90, 'num_ctx' => 2048]
        );

        $description = trim((string) ($result['choices'][0]['message']['content'] ?? ''));
        if ($description === '') {
            throw new RuntimeException('Empty response from local AI.');
        }

        return $description;
    }

    private function factsFromRequest(Request $request): string
    {
        $facts = "Title: {$request->title}\n";
        if ($request->category) {
            $facts .= "Category: {$request->category}\n";
        }
        if ($request->condition) {
            $facts .= "Condition: {$request->condition}\n";
        }
        if ($request->location) {
            $facts .= "Location: {$request->location}\n";
        }
        if ($request->price) {
            $facts .= "Price: \${$request->price} MXN\n";
        }
        if (is_array($request->attributes)) {
            foreach ($request->attributes as $attrKey => $attrValue) {
                if (is_scalar($attrValue) && $attrValue !== '') {
                    $facts .= ucfirst((string) $attrKey) . ": {$attrValue}\n";
                }
            }
        }

        return $facts;
    }

    private function resolveLocale(Request $request): string
    {
        $requested = strtolower((string) $request->input('locale', ''));
        $requested = explode('-', str_replace('_', '-', $requested))[0] ?? '';
        if (isset(self::LANGUAGE_NAMES[$requested])) {
            return $requested;
        }

        $header = strtolower((string) $request->header('Accept-Language', ''));
        $header = explode(',', $header)[0] ?? '';
        $header = explode('-', str_replace('_', '-', $header))[0] ?? '';
        if (isset(self::LANGUAGE_NAMES[$header])) {
            return $header;
        }

        return 'es';
    }

    private function systemPrompt(string $locale): string
    {
        $language = self::LANGUAGE_NAMES[$locale] ?? self::LANGUAGE_NAMES['es'];

        return "You write marketplace listings for Mercasto.com. Respond only in {$language}. " .
            'Use ONLY facts explicitly confirmed by the user. Never invent color, battery condition, accessories, warranty, invoice, box, charger, scratches, damage, shipping, delivery, components, performance, condition details or benefits that are not present in the confirmed data. ' .
            'If details are missing, invite the buyer to ask. Return only the finished listing description, with no analysis or meta-commentary.';
    }

    private function guardDescription(string $description, Request $request, string $locale): string
    {
        $description = Str::of($description)->replace(['```', '"""'], '')->trim()->limit(1200, '')->toString();

        if ($description === '' || $this->containsUnsupportedAiClaims($description, $request)) {
            return $this->safeGeneratedDescription($request, $locale);
        }

        return $description;
    }

    private function containsUnsupportedAiClaims(string $description, Request $request): bool
    {
        $source = Str::lower(implode(' ', array_filter([
            $request->title,
            $request->category,
            $request->condition,
            $request->location,
            $request->price,
            is_array($request->attributes) ? json_encode($request->attributes, JSON_UNESCAPED_UNICODE) : null,
        ])));
        $text = Str::lower($description);

        foreach ([
            'batería', 'bateria', 'caja', 'cable', 'cargador', 'garantía', 'garantia',
            'factura', 'rayones', 'golpes', 'funda', 'mica', 'color', 'negro', 'blanco',
            'morado', 'azul', 'rojo', 'dorado', 'plata', 'gris', 'envío', 'envio',
            'entrega', 'original',
        ] as $term) {
            if (Str::contains($text, $term) && ! Str::contains($source, $term)) {
                return true;
            }
        }

        return false;
    }

    private function safeGeneratedDescription(Request $request, string $locale): string
    {
        $title = trim(strip_tags((string) $request->title));
        $condition = trim(strip_tags((string) ($request->condition ?? '')));
        $location = trim(strip_tags((string) ($request->location ?? '')));
        $price = $request->price ? '$' . number_format((float) $request->price, 0) . ' MXN' : '';

        $templates = [
            'es' => ["Vendo {$title} en Mercasto.", 'Condición: %s.', 'Precio: %s.', 'Disponible en %s.', 'Escríbeme para más información.'],
            'en' => ["Selling {$title} on Mercasto.", 'Condition: %s.', 'Price: %s.', 'Available in %s.', 'Message me for more information.'],
            'pt' => ["Vendo {$title} no Mercasto.", 'Condição: %s.', 'Preço: %s.', 'Disponível em %s.', 'Envie uma mensagem para mais informações.'],
            'fr' => ["Je vends {$title} sur Mercasto.", 'État : %s.', 'Prix : %s.', 'Disponible à %s.', "Écrivez-moi pour plus d’informations."],
            'de' => ["Ich verkaufe {$title} auf Mercasto.", 'Zustand: %s.', 'Preis: %s.', 'Verfügbar in %s.', 'Schreib mir für weitere Informationen.'],
            'it' => ["Vendo {$title} su Mercasto.", 'Condizione: %s.', 'Prezzo: %s.', 'Disponibile a %s.', 'Scrivimi per maggiori informazioni.'],
            'ru' => ["Продаю {$title} на Mercasto.", 'Состояние: %s.', 'Цена: %s.', 'Доступно в %s.', 'Напишите мне для дополнительной информации.'],
            'zh' => ["在 Mercasto 出售 {$title}。", '状况：%s。', '价格：%s。', '地点：%s。', '如需更多信息，请给我留言。'],
            'ja' => ["Mercastoで{$title}を販売しています。", '状態：%s。', '価格：%s。', '場所：%s。', '詳しくはメッセージでお問い合わせください。'],
            'ko' => ["Mercasto에서 {$title} 판매합니다.", '상태: %s.', '가격: %s.', '위치: %s.', '자세한 내용은 메시지로 문의해 주세요.'],
            'ar' => ["أبيع {$title} على Mercasto.", 'الحالة: %s.', 'السعر: %s.', 'متاح في %s.', 'راسلني لمزيد من المعلومات.'],
            'he' => ["מוכר/ת {$title} ב-Mercasto.", 'מצב: %s.', 'מחיר: %s.', 'זמין ב-%s.', 'אפשר לשלוח הודעה לפרטים נוספים.'],
            'yi' => ["איך פאַרקויף {$title} אויף Mercasto.", 'צושטאַנד: %s.', 'פּרייַז: %s.', 'בנימצא אין %s.', 'שרייב מיר פֿאַר מער אינפֿאָרמאַציע.'],
        ];

        $t = $templates[$locale] ?? $templates['es'];
        $parts = [$t[0]];
        if ($condition !== '') {
            $parts[] = sprintf($t[1], $condition);
        }
        if ($price !== '') {
            $parts[] = sprintf($t[2], $price);
        }
        if ($location !== '') {
            $parts[] = sprintf($t[3], $location);
        }
        $parts[] = $t[4];

        return implode(' ', $parts);
    }
}
