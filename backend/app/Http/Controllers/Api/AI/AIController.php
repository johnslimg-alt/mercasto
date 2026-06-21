<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\PricingService;
use App\Services\AI\DescriptionGeneratorService;
use App\Services\AI\SupportChatbotService;
use App\Services\AI\ImageRecognitionService;
use App\Services\AI\OllamaClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;

class AIController extends Controller
{
    private PricingService $pricingService;
    private DescriptionGeneratorService $descriptionService;
    private SupportChatbotService $chatbotService;
    private ImageRecognitionService $imageService;
    private OllamaClient $ollama;

    public function __construct(
        PricingService $pricingService,
        DescriptionGeneratorService $descriptionService,
        SupportChatbotService $chatbotService,
        ImageRecognitionService $imageService,
        OllamaClient $ollama
    ) {
        $this->pricingService = $pricingService;
        $this->descriptionService = $descriptionService;
        $this->chatbotService = $chatbotService;
        $this->imageService = $imageService;
        $this->ollama = $ollama;
    }

    /**
     * Get AI-powered pricing suggestion
     */
    public function suggestPrice(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'subcategory' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'condition' => 'required|in:new,like_new,used,refurbished,for_parts',
            'attributes' => 'nullable|array',
        ]);

        // Rate limiting: 10 requests per minute per user
        $key = 'ai-pricing:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many requests. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $result = $this->pricingService->suggestPrice($validated);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('AI pricing error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate price suggestion',
            ], 500);
        }
    }

    /**
     * Generate AI description for listing
     */
    public function generateDescription(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'subcategory' => 'nullable|string|max:100',
            'condition' => 'required|in:new,like_new,used,refurbished,for_parts',
            'price' => 'required|numeric|min:0',
            'attributes' => 'nullable|array',
            'key_features' => 'nullable|array',
            'variants' => 'nullable|integer|min:1|max:3',
        ]);

        // Rate limiting: 5 requests per minute per user
        $key = 'ai-description:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many requests. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $variants = $validated['variants'] ?? 1;
            
            if ($variants > 1) {
                $result = $this->descriptionService->generateVariants($validated, $variants);
            } else {
                $result = $this->descriptionService->generate($validated);
            }

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('AI description error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate description',
            ], 500);
        }
    }

    /**
     * Improve existing description
     */
    public function improveDescription(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|min:10|max:2000',
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
        ]);

        // Rate limiting
        $key = 'ai-improve:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many requests. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $result = $this->descriptionService->improve(
                $validated['description'],
                $validated
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('AI improve error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to improve description',
            ], 500);
        }
    }

    /**
     * Chat with AI support bot
     */
    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
            'session_id' => 'required|string|max:100',
        ]);

        // Rate limiting: 20 messages per minute per session
        $key = 'ai-chat:' . $validated['session_id'];
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many messages. Please slow down.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $userId = $request->user()?->id;
            $result = $this->chatbotService->chat(
                $validated['message'],
                $validated['session_id'],
                $userId
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('AI chat error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Chat service unavailable',
            ], 500);
        }
    }

    /**
     * Clear chat history
     */
    public function clearChatHistory(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string|max:100',
        ]);

        $this->chatbotService->clearHistory($validated['session_id']);

        return response()->json([
            'success' => true,
            'message' => 'Chat history cleared',
        ]);
    }

    /**
     * Analyze image for category suggestion
     */
    public function analyzeImage(Request $request)
    {
        $validated = $request->validate([
            'image_path' => 'required|string',
            'title' => 'nullable|string|max:255',
        ]);

        // Rate limiting: 10 requests per minute
        $key = 'ai-image:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'success' => false,
                'error' => 'Too many requests. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $result = $this->imageService->analyze(
                $validated['image_path'],
                $validated['title'] ?? null
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('AI image error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to analyze image',
            ], 500);
        }
    }

    /**
     * Check AI service status
     */
    public function status()
    {
        $available = $this->ollama->isAvailable();
        $models = $available ? $this->ollama->getModels() : [];

        return response()->json([
            'success' => true,
            'ai_available' => $available,
            'models' => $models,
            'features' => [
                'pricing_suggestions' => $available,
                'description_generation' => $available,
                'support_chatbot' => $available,
                'image_recognition' => true, // Always available (fallback)
            ],
        ]);
    }
}
