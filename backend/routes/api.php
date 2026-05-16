<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\AccountDeletionController;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TwoFactorAuthenticationController;

// Public routes
Route::get('/ads', [AdController::class, 'index']);
Route::get('/ads/{id}', [AdController::class, 'show']); // Добавлен маршрут для прямых ссылок (SEO/Deep Links)

// Защита от CPU DDoS: генерация PDF очень ресурсоемкая, ставим лимит 10 в минуту
Route::middleware('throttle:10,1')->group(function () {
    Route::get('/ads/{id}/pdf', [AdController::class, 'generatePdf']);
});
Route::get('/sitemap.xml', [AdController::class, 'sitemap']);
Route::get('/google-merchant.xml', [AdController::class, 'googleMerchantFeed']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/users/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/users/{id}/profile', [ProfileController::class, 'publicProfile']); // Публичный профиль продавца (Storefront)

// Регистрация маршрутов для WebSockets (Reverb / Echo) с авторизацией Sanctum
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Debug route — only available in non-production environments (Защищено от исчерпания квот)
if (app()->environment('local', 'staging')) {
    Route::get('/debug-sentry', function (Request $request) {
        if ($request->user() && $request->user()->role === 'admin') {
            throw new Exception('Это тестовое исключение para Sentry!');
        }
        abort(403);
    })->middleware('auth:sanctum');
}

// Группа для защиты от перебора (Rate Limiting)
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/login/two-factor', [AuthController::class, 'loginTwoFactor']);
    Route::post('/auth/oauth/exchange', [AuthController::class, 'exchangeOAuthCode']);
    Route::post('/auth/phone/request', [AuthController::class, 'requestPhoneCode']);
    Route::post('/auth/phone/verify', [AuthController::class, 'verifyPhoneCode']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Returns which OAuth providers are actually configured (credentials present in env)
// IMPORTANT: must be defined BEFORE the {provider} wildcard routes
Route::get('/auth/providers', [AuthController::class, 'getProviders']);

// OAuth wildcard routes (must come AFTER static /auth/providers)
Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

// Защита метрик и просмотров от ботов и накруток (максимум 60 запросов в минуту с 1 IP)
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/ads/{id}/click', [AdController::class, 'recordClick']);
    Route::post('/ads/{id}/view', [AdController::class, 'recordView']);
});

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/ads/{id}/report', [AdController::class, 'report']); // Пожаловаться на объявление
    Route::post('/users/{id}/report', [ProfileController::class, 'report']); // Пожаловаться на пользователя
});

// Webhook routes (Защита от Crypto CPU DoS: ограничиваем попытки брутфорса HMAC-подписей)
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/webhooks/clip', [PaymentController::class, 'handleWebhook']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/chat/conversations', [\App\Http\Controllers\Api\ChatController::class, 'getConversations']);
    Route::get('/chat/{userId}', [\App\Http\Controllers\Api\ChatController::class, 'getMessages']);
    Route::post('/chat', [\App\Http\Controllers\Api\ChatController::class, 'sendMessage']);
    Route::post('/ads', [AdController::class, 'store']);
    // Защита ИИ от спама и истощения лимитов API (максимум 5 генераций в минуту на пользователя)
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/ads/generate-description', [AdController::class, 'generateDescription']); // Gemini AI
    });
    Route::post('/categories', [CategoryController::class, 'store']); // Создание категории (только для админов)
    Route::put('/categories/{id}', [CategoryController::class, 'update']); // Редактирование категории
    Route::post('/ads/bulk-upload', [AdController::class, 'bulkUpload']); // Массовая загрузка CSV
    Route::post('/ads/{ad}', [AdController::class, 'update']); // Для обработки FormData с изображениями
    Route::patch('/ads/{id}/status', [AdController::class, 'updateStatus']); // Изменение статуса (пауза/активация)
    Route::post('/ads/{id}/promote/credits', [AdController::class, 'promoteWithCredits']); // Продвижение за кредиты
    Route::delete('/ads/{id}', [AdController::class, 'destroy']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [ProfileController::class, 'show']);
    Route::post('/user/profile', [ProfileController::class, 'update']);
    Route::get('/user/profile', [ProfileController::class, 'getProfile']); // Получить профиль
    Route::put('/user/profile', [ProfileController::class, 'update']); // Обновить профиль (PUT)
    Route::post('/user/avatar', [ProfileController::class, 'uploadAvatar']); // Загрузить аватар
    Route::put('/user/password', [ProfileController::class, 'changePassword']); // Смена пароля (PUT)
    Route::put('/user/notifications', [ProfileController::class, 'updateNotifications']); // Настройки уведомлений (PUT)
    Route::post('/user/password', [ProfileController::class, 'changePassword']); // Смена пароля
    
    // Защита домена от блокировки спам-фильтрами (AWS SES/Mailgun): лимит на отправку писем
    Route::middleware('throttle:3,1')->group(function () {
        Route::post('/user/email/request', [ProfileController::class, 'requestEmailChange']); // Запрос на смену email
    });
    Route::post('/user/email/confirm', [ProfileController::class, 'confirmEmailChange']); // Подтверждение нового email
    Route::get('/user/notifications/list', [ProfileController::class, 'getNotifications']); // Получить уведомления
    Route::post('/user/notifications/{id}/read', [ProfileController::class, 'markNotificationRead']); // Прочитать уведомление
    Route::post('/user/notifications/read-all', [ProfileController::class, 'markAllNotificationsRead']); // Прочитать все уведомления
    Route::post('/user/notifications', [ProfileController::class, 'updateNotifications']); // Настройки уведомлений
    Route::delete('/user/notifications/{id}', [ProfileController::class, 'deleteNotification']); // Удалить уведомление
    Route::post('/user/push-subscribe', [ProfileController::class, 'pushSubscribe']); // Подписка на Web Push
    Route::post('/user/push-unsubscribe', [ProfileController::class, 'pushUnsubscribe']); // Отписка от Web Push
    Route::delete('/user', [AccountDeletionController::class, 'delete']); // User self-deletion with financial/audit retention
    Route::post('/users/{id}/verify', [ProfileController::class, 'verifyUser']);
    Route::post('/user/kyc', [ProfileController::class, 'submitKyc']); // Загрузка документов KYC

    // 2FA Routes
    Route::post('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'store']);
    Route::post('/user/two-factor-authentication/confirm', [TwoFactorAuthenticationController::class, 'confirm']);
    Route::delete('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'destroy']);

    // Защита от спама и брутфорса (максимум 5 запросов в минуту)
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/user/coupons/redeem', [PaymentController::class, 'redeemCoupon']); // Защита подбора купонов
        Route::post('/users/{id}/reviews', [ReviewController::class, 'store']); // Защита от спама отзывами
    });

    Route::get('/admin/coupons', [PaymentController::class, 'getCoupons']); // Список купонов (Админ)
    Route::post('/admin/coupons', [PaymentController::class, 'createCoupon']); // Создать купон (Админ)
    Route::delete('/admin/coupons/{id}', [PaymentController::class, 'deleteCoupon']); // Удалить купон (Админ)
    Route::get('/users', [ProfileController::class, 'index']); // Список пользователей (Админ)
    Route::get('/admin/ads/pending', [AdController::class, 'pendingAds']); // Объявления на модерации (Админ)
    Route::get('/admin/reports', [AdController::class, 'getReports']); // Список жалоб (Админ)
    Route::get('/admin/kyc', [ProfileController::class, 'getPendingKyc']); // Заявки на верификацию (Админ)
    Route::post('/admin/kyc/{id}/approve', [ProfileController::class, 'approveKyc']); // Одобрить KYC
    Route::post('/admin/kyc/{id}/reject', [ProfileController::class, 'rejectKyc']); // Отклонить KYC
    Route::get('/admin/kyc/document/{id}', [ProfileController::class, 'viewKycDocument']); // Безопасный просмотр паспорта
    Route::delete('/admin/reports/{id}', [AdController::class, 'deleteReport']); // Удалить жалобу (Админ)
    Route::get('/admin/user-reports', [ProfileController::class, 'getUserReports']); // Жалобы на пользователей
    Route::delete('/admin/user-reports/{id}', [ProfileController::class, 'deleteUserReport']); // Удалить жалобу на пользователя
    Route::post('/users/{id}/role', [ProfileController::class, 'changeRole']); // Изменение роли (Админ)
    Route::delete('/users/{id}', [ProfileController::class, 'destroy']); // Удаление пользователя (Админ)
    Route::get('/favorites', [AdController::class, 'favorites']);
    Route::post('/ads/{id}/favorite', [AdController::class, 'toggleFavorite']);
    Route::get('/user/ads', [AdController::class, 'myAds']);
    Route::get('/user/favorite-ads', [AdController::class, 'favoriteAds']);
    Route::get('/user/analytics', [AdController::class, 'analytics']);
    
    // Защита от блокировки аккаунта Clip (Third-Party Cascade DoS): ограничиваем генерацию ссылок
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/payment/clip', [PaymentController::class, 'createClipCheckout']); // Генерация оплаты Clip
    });

    // Subscription Routes
    Route::get('/user/subscriptions', [ProfileController::class, 'getSubscriptions']);
    Route::post('/user/subscriptions/toggle', [ProfileController::class, 'toggleSubscription']);

    // Автономные ИИ-Агенты (PostgreSQL & React)
    // Отдельный лимит защищает AI/infra ресурсы от authenticated abuse и runaway clients.
    Route::middleware('throttle:2,1')->group(function () {
        Route::post('/agents/postgresql', [AdController::class, 'askPostgresAgent']); // AI Database Agent
        Route::post('/agents/react', [AdController::class, 'generateReactComponent']); // AI UI Builder Agent
        Route::post('/agents/ceo', [AdController::class, 'askCeoAgent']); // AI CEO Agent
        Route::post('/agents/lawyer', [AdController::class, 'askLawyerAgent']); // AI Lawyer Agent
        Route::post('/agents/notary', [AdController::class, 'askNotaryAgent']); // AI Notary Agent
        Route::post('/agents/advocate', [AdController::class, 'askAdvocateAgent']); // AI Advocate Agent
        Route::post('/agents/marketing', [AdController::class, 'askMarketingAgent']); // AI Marketing Agent
        Route::post('/agents/seo', [AdController::class, 'askSeoAgent']); // AI SEO Agent
        Route::post('/agents/ceo-ui', [AdController::class, 'askCeoUiAgent']); // AI CEO UI Agent
        Route::post('/agents/ceo-ux', [AdController::class, 'askCeoUxAgent']); // AI CEO UX Agent
        Route::post('/agents/ui', [AdController::class, 'askUiAgent']); // AI UI Agent
    });
});
