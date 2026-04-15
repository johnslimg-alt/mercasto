<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TwoFactorAuthenticationController;

// Public routes
Route::get('/ads', [AdController::class, 'index']);
Route::get('/ads/{id}/pdf', [AdController::class, 'generatePdf']);
Route::get('/sitemap.xml', [AdController::class, 'sitemap']);
Route::get('/google-merchant.xml', [AdController::class, 'googleMerchantFeed']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/users/{id}/reviews', [ReviewController::class, 'index']);

// Тестовый маршрут для проверки Sentry
Route::get('/debug-sentry', function () {
    throw new Exception('Это тестовое исключение для Sentry!');
});

// Группа для защиты от перебора (Rate Limiting)
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/login/two-factor', [AuthController::class, 'loginTwoFactor']);
    Route::post('/auth/phone/request', [AuthController::class, 'requestPhoneCode']);
    Route::post('/auth/phone/verify', [AuthController::class, 'verifyPhoneCode']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// OAuth routes
Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

Route::post('/ads/{id}/click', [ContactController::class, 'recordClick']);
Route::post('/ads/{id}/report', [AdController::class, 'report']); // Пожаловаться на объявление
Route::post('/users/{id}/report', [ProfileController::class, 'report']); // Пожаловаться на пользователя
Route::post('/ads/{id}/view', [AdController::class, 'recordView']);

// Webhook routes (no auth middleware)
Route::post('/webhooks/clip', [PaymentController::class, 'handleWebhook']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/ads', [AdController::class, 'store']);
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
    Route::post('/user/password', [ProfileController::class, 'changePassword']); // Смена пароля
    Route::post('/user/email/request', [ProfileController::class, 'requestEmailChange']); // Запрос на смену email
    Route::post('/user/email/confirm', [ProfileController::class, 'confirmEmailChange']); // Подтверждение нового email
    Route::post('/user/notifications/create', [ProfileController::class, 'createNotification']); // Создать уведомление вручную
    Route::get('/user/notifications/list', [ProfileController::class, 'getNotifications']); // Получить уведомления
    Route::post('/user/notifications/{id}/read', [ProfileController::class, 'markNotificationRead']); // Прочитать уведомление
    Route::post('/user/notifications/read-all', [ProfileController::class, 'markAllNotificationsRead']); // Прочитать все уведомления
    Route::post('/user/notifications', [ProfileController::class, 'updateNotifications']); // Настройки уведомлений
    Route::delete('/user/notifications/{id}', [ProfileController::class, 'deleteNotification']); // Удалить уведомление
    Route::post('/users/{id}/reviews', [ReviewController::class, 'store']); // Оставить отзыв
    Route::post('/user/push-subscribe', [ProfileController::class, 'pushSubscribe']); // Подписка на Web Push
    Route::post('/user/push-unsubscribe', [ProfileController::class, 'pushUnsubscribe']); // Отписка от Web Push
    Route::delete('/user', [ProfileController::class, 'deleteAccount']); // User self-deletion
    Route::post('/users/{id}/verify', [ProfileController::class, 'verifyUser']);

    // 2FA Routes
    Route::post('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'store']);
    Route::post('/user/two-factor-authentication/confirm', [TwoFactorAuthenticationController::class, 'confirm']);
    Route::delete('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'destroy']);

    Route::post('/user/coupons/redeem', [PaymentController::class, 'redeemCoupon']); // Активация купона
    Route::get('/admin/coupons', [PaymentController::class, 'getCoupons']); // Список купонов (Админ)
    Route::post('/admin/coupons', [PaymentController::class, 'createCoupon']); // Создать купон (Админ)
    Route::delete('/admin/coupons/{id}', [PaymentController::class, 'deleteCoupon']); // Удалить купон (Админ)
    Route::get('/users', [ProfileController::class, 'index']); // Список пользователей (Админ)
    Route::get('/admin/ads/pending', [AdController::class, 'pendingAds']); // Объявления на модерации (Админ)
    Route::get('/admin/reports', [AdController::class, 'getReports']); // Список жалоб (Админ)
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
    Route::post('/payment/clip', [PaymentController::class, 'createClipCheckout']); // Генерация оплаты Clip

    // Subscription Routes
    Route::get('/user/subscriptions', [ProfileController::class, 'getSubscriptions']);
    Route::post('/user/subscriptions/toggle', [ProfileController::class, 'toggleSubscription']);
});
