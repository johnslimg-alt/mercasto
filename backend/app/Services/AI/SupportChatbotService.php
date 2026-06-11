<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;

class SupportChatbotService
{
    private OllamaClient $ollama;

    public function __construct(OllamaClient $ollama)
    {
        $this->ollama = $ollama;
    }

    /**
     * Process user message and generate response
     */
    public function chat(string $message, string $sessionId, ?int $userId = null): array
    {
        // Get conversation history
        $history = $this->getConversationHistory($sessionId);
        
        // Add user message to history
        $history[] = [
            'role' => 'user',
            'content' => $message,
        ];

        // Check if it's a FAQ question
        $faqAnswer = $this->checkFAQ($message);
        if ($faqAnswer) {
            $history[] = [
                'role' => 'assistant',
                'content' => $faqAnswer,
            ];
            $this->saveConversationHistory($sessionId, $history);
            
            return [
                'success' => true,
                'response' => $faqAnswer,
                'source' => 'faq',
                'session_id' => $sessionId,
            ];
        }

        // Generate AI response
        $response = $this->generateAIResponse($history, $userId);

        if (!$response['success']) {
            return $this->fallbackResponse($message);
        }

        // Add assistant response to history
        $history[] = [
            'role' => 'assistant',
            'content' => $response['response'],
        ];

        // Save conversation history (keep last 10 messages)
        $history = array_slice($history, -10);
        $this->saveConversationHistory($sessionId, $history);

        return [
            'success' => true,
            'response' => $response['response'],
            'source' => 'ai',
            'session_id' => $sessionId,
            'generation_time_ms' => round($response['total_duration'] / 1000000),
        ];
    }

    /**
     * Check if message matches FAQ
     */
    private function checkFAQ(string $message): ?string
    {
        $message = strtolower($message);
        
        $faqs = [
            'cómo me registro' => 'Para registrarte en Mercasto:\n\n1. Haz clic en "Registrarse" en la esquina superior derecha\n2. Ingresa tu email y crea una contraseña\n3. Confirma tu email\n4. ¡Listo! Ya puedes publicar anuncios',
            
            'cómo publico un anuncio' => 'Para publicar un anuncio:\n\n1. Inicia sesión en tu cuenta\n2. Haz clic en "Publicar anuncio"\n3. Selecciona la categoría\n4. Agrega título, descripción, fotos y precio\n5. Haz clic en "Publicar"\n\n¡Tu anuncio estará visible en minutos!',
            
            'cuánto cuesta publicar' => 'Publicar anuncios en Mercasto es GRATIS. Puedes publicar hasta 10 anuncios activos sin costo.\n\nSi necesitas más, ofrecemos planes PRO desde $499 MXN/mes con beneficios adicionales.',
            
            'cómo contacto al vendedor' => 'Para contactar a un vendedor:\n\n1. Abre el anuncio que te interesa\n2. Haz clic en el botón "Contactar"\n3. Elige tu canal preferido:\n   - Mensaje en Mercasto (recomendado)\n   - WhatsApp\n   - Email\n   - Teléfono\n\n¡Es así de fácil!',
            
            'es seguro comprar' => 'Sí, Mercasto es seguro. Te recomendamos:\n\n✓ Usar el chat de Mercasto para comunicarte\n✓ Verificar la identidad del vendedor\n✓ Nunca pagues por adelantado sin ver el producto\n✓ Reúnete en lugares públicos\n✓ Revisa las reseñas del vendedor\n\nSi detectas algo sospechoso, repórtalo inmediatamente.',
            
            'cómo elimino mi anuncio' => 'Para eliminar un anuncio:\n\n1. Ve a "Mi cuenta" → "Mis anuncios"\n2. Busca el anuncio que quieres eliminar\n3. Haz clic en los 3 puntos (⋮)\n4. Selecciona "Eliminar"\n5. Confirma la eliminación\n\nEl anuncio desaparecerá inmediatamente.',
            
            'cómo edito mi anuncio' => 'Para editar un anuncio:\n\n1. Ve a "Mi cuenta" → "Mis anuncios"\n2. Busca el anuncio y haz clic en "Editar"\n3. Modifica lo que necesites\n4. Haz clic en "Guardar cambios"\n\nLos cambios se aplican inmediatamente.',
            
            'qué es mercasto pro' => 'Mercasto PRO es nuestro plan premium con beneficios exclusivos:\n\n⭐ Hasta 100 anuncios activos\n📊 Analíticas avanzadas\n🎯 Anuncios destacados\n🏷️ Badge "PRO" en tu perfil\n📞 Soporte prioritario\n\nPrecio: $499 MXN/mes',
            
            'cómo recupero mi contraseña' => 'Para recuperar tu contraseña:\n\n1. Haz clic en "Iniciar sesión"\n2. Selecciona "¿Olvidaste tu contraseña?"\n3. Ingresa tu email\n4. Recibirás un enlace para crear una nueva contraseña\n5. Sigue las instrucciones del email\n\nSi no recibes el email, revisa tu carpeta de spam.',
            
            'puedo vender mi empresa' => 'Sí, ofrecemos cuentas Business para empresas:\n\n🏢 Múltiples usuarios en tu equipo\n📦 Gestión masiva de anuncios\n📈 Analíticas empresariales\n💼 Facturación corporativa\n\nPlanes desde $499 MXN/mes. Contáctanos para más información.',
        ];

        foreach ($faqs as $keyword => $answer) {
            if (str_contains($message, $keyword)) {
                return $answer;
            }
        }

        return null;
    }

    /**
     * Generate AI response using Ollama
     */
    private function generateAIResponse(array $history, ?int $userId): array
    {
        $system = $this->buildSystemPrompt($userId);

        $result = $this->ollama->chat($history, [
            'temperature' => 0.7,
            'max_tokens' => 400,
        ]);

        if (!$result['success']) {
            return $result;
        }

        $response = $result['message']['content'] ?? '';
        
        // Clean response
        $response = $this->cleanResponse($response);

        return [
            'success' => true,
            'response' => $response,
            'total_duration' => $result['total_duration'],
        ];
    }

    /**
     * Build system prompt for chatbot
     */
    private function buildSystemPrompt(?int $userId): string
    {
        $prompt = "Eres MercastoBot, el asistente virtual de Mercasto, el marketplace líder en México.\n\n";
        
        $prompt .= "TU ROL:\n";
        $prompt .= "- Ayudar a usuarios con preguntas sobre la plataforma\n";
        $prompt .= "- Explicar cómo usar las funciones de Mercasto\n";
        $prompt .= "- Resolver problemas comunes\n";
        $prompt .= "- Ser amigable, profesional y conciso\n\n";
        
        $prompt .= "INFORMACIÓN DE MERCASTO:\n";
        $prompt .= "- Marketplace de compraventa en México\n";
        $prompt .= "- Categorías: Autos, Inmuebles, Electrónica, Hogar, Moda, Empleos, Servicios\n";
        $prompt .= "- Funciones: Publicación gratuita, chat en tiempo real, sistema de reseñas, recomendaciones AI\n";
        $prompt .= "- Planes: Free (10 anuncios), PRO ($499/mes, 100 anuncios), Enterprise ($1,999/mes, ilimitado)\n";
        $prompt .= "- Pagos: Aceptamos Clip para transacciones seguras\n";
        $prompt .= "- Soporte: 24/7 vía chat\n\n";
        
        $prompt .= "REGLAS:\n";
        $prompt .= "1. Responde en español mexicano\n";
        $prompt .= "2. Sé conciso (máximo 150 palabras)\n";
        $prompt .= "3. Usa formato claro con bullets y números\n";
        $prompt .= "4. Si no sabes algo, di 'No tengo esa información, pero puedo ayudarte a contactar con soporte humano'\n";
        $prompt .= "5. Nunca inventes información sobre precios o políticas\n";
        $prompt .= "6. Si detectas frustración, ofrece escalar a soporte humano\n";
        $prompt .= "7. No uses emojis excesivos (máximo 2-3 por mensaje)\n\n";
        
        $prompt .= "FUNCIONES ESPECIALES:\n";
        $prompt .= "- Sugerencias de precios con AI\n";
        $prompt .= "- Generación de descripciones automáticas\n";
        $prompt .= "- Reconocimiento de imágenes para categorización\n";
        $prompt .= "- Sistema de gamificación (XP, logros, rachas)\n";
        $prompt .= "- Búsquedas guardadas con notificaciones\n";
        $prompt .= "- App móvil (PWA instalable)\n\n";
        
        if ($userId) {
            $prompt .= "El usuario está autenticado (ID: {$userId}). Puedes referirte a su cuenta si es relevante.\n\n";
        }

        return $prompt;
    }

    /**
     * Clean AI response
     */
    private function cleanResponse(string $response): string
    {
        // Remove markdown if excessive
        $response = preg_replace('/\*\*(.+?)\*\*/', '$1', $response);
        
        // Limit length
        if (strlen($response) > 800) {
            $response = substr($response, 0, 797) . '...';
        }

        return trim($response);
    }

    /**
     * Get conversation history
     */
    private function getConversationHistory(string $sessionId): array
    {
        $cacheKey = "chatbot:history:{$sessionId}";
        return Cache::get($cacheKey, []);
    }

    /**
     * Save conversation history
     */
    private function saveConversationHistory(string $sessionId, array $history): void
    {
        $cacheKey = "chatbot:history:{$sessionId}";
        Cache::put($cacheKey, $history, 3600); // 1 hour
    }

    /**
     * Fallback response when AI fails
     */
    private function fallbackResponse(string $message): array
    {
        return [
            'success' => true,
            'response' => "Disculpa, estoy teniendo problemas técnicos. " .
                         "Por favor intenta de nuevo en unos momentos, " .
                         "o contacta a nuestro equipo de soporte en soporte@mercasto.com",
            'source' => 'fallback',
        ];
    }

    /**
     * Clear conversation history
     */
    public function clearHistory(string $sessionId): bool
    {
        $cacheKey = "chatbot:history:{$sessionId}";
        return Cache::forget($cacheKey);
    }
}
