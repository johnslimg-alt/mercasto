# Mercasto Generated Route Inventory

Generated at: 2026-08-06T17:10:59Z
Commit: 98843f40
Source: php artisan route:list --except-vendor -v

```text

  GET|HEAD  / .................................... generated::<auto>
            ⇂ web
  ANY       acerca-de generated::<auto> › Illuminate\Routing › RedirectController
            ⇂ web
  GET|HEAD  ads/{id} ..... generated::<auto> › SeoShellController@ad
            ⇂ web
  GET|HEAD  api/admin/ads/pending generated::<auto> › Api\AdController@pendingAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/analytics generated::<auto> › Api\AdminAnalyticsController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/banners generated::<auto> › Api\AdBannerController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/banners generated::<auto> › Api\AdBannerController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/banners/stats generated::<auto> › Api\AdBannerController@stats
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/banners/upload generated::<auto> › Api\AdBannerController@uploadImage
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/admin/banners/{id} generated::<auto> › Api\AdBannerController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/banners/{id} generated::<auto> › Api\AdBannerController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/business-verifications generated::<auto> › Api\BusinessProfileController@adminPendingVerifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/business-verifications/{userId}/csf generated::<auto> › Api\BusinessProfileController@adminDownloadCsf
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/business-verifications/{userId}/review generated::<auto> › Api\BusinessProfileController@adminReviewVerification
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/coupons generated::<auto> › Api\PaymentController@getCoupons
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/coupons generated::<auto> › Api\PaymentController@createCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/coupons/{id} generated::<auto> › Api\PaymentController@deleteCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc generated::<auto> › Api\ProfileController@getPendingKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc/document/{id} generated::<auto> › Api\ProfileController@viewKycDocument
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/approve generated::<auto> › Api\ProfileController@approveKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/reject generated::<auto> › Api\ProfileController@rejectKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/marketing/meta/campaigns generated::<auto> › Api\MarketingController@metaCampaigns
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  PATCH     api/admin/marketing/meta/campaigns/{campaignId}/budget generated::<auto> › Api\MarketingController@updateMetaCampaignBudget
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  PATCH     api/admin/marketing/meta/campaigns/{campaignId}/status generated::<auto> › Api\MarketingController@updateMetaCampaignStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/marketing/meta/status generated::<auto> › Api\MarketingController@metaStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/moderation/ads generated::<auto> › Api\AdminAdModerationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/moderation/ads/{ad} generated::<auto> › Api\AdminAdModerationController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/ads/{ad}/decision generated::<auto> › Api\AdminAdModerationController@decide
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/ads/{ad}/retry-ai generated::<auto> › Api\AdminAdModerationController@retry
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/process-pending generated::<auto> › Api\AdminAdModerationController@processPending
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/payments generated::<auto> › Api\PaymentController@getAdminPayments
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/placements generated::<auto> › Api\AdBannerController@placements
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/placements generated::<auto> › Api\AdBannerController@createPlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/admin/placements/{id} generated::<auto> › Api\AdBannerController@updatePlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/placements/{id} generated::<auto> › Api\AdBannerController@destroyPlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/reports generated::<auto> › Api\AdController@getReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/reports/{id} generated::<auto> › Api\AdController@deleteReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/seo-measurement generated::<auto> › Api\AdminSeoMeasurementController
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/user-reports generated::<auto> › Api\ProfileController@getUserReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/user-reports/{id} generated::<auto> › Api\ProfileController@deleteUserReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/ads generated::<auto> › Api\AdIndexController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  POST      api/ads ..... generated::<auto> › Api\AdController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ads
  POST      api/ads/bulk-action generated::<auto> › Api\AdController@bulkAction
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/ads/bulk-upload generated::<auto> › Api\AdController@bulkUpload
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:uploads
  GET|HEAD  api/ads/featured generated::<auto> › Api\AdIndexController@featured
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/generate-description generated::<auto> › Api\AiDescriptionController
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/impressions generated::<auto> › Api\AdController@recordImpressions
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/ads/promote/credits/bulk generated::<auto> › Api\AdController@promoteWithCreditsBulk
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{ad} generated::<auto> › Api\AdController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id} . generated::<auto> › Api\AdController@show
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  DELETE    api/ads/{id} generated::<auto> › Api\AdController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  PUT       api/ads/{id}/activate generated::<auto> › Api\AdController@activate
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/click generated::<auto> › Api\AdController@recordClick
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/ads/{id}/contact-seller generated::<auto> › Api\ContactController@contactSeller
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,60
  GET|HEAD  api/ads/{id}/edit generated::<auto> › Api\AdController@editForm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/{id}/favorite generated::<auto> › Api\AdController@toggleFavorite
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/ads/{id}/pause generated::<auto> › Api\AdController@pause
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id}/pdf generated::<auto> › Api\AdController@generatePdf
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  GET|HEAD  api/ads/{id}/price-history generated::<auto> › Api\AdController@priceHistory
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/{id}/promote/credits generated::<auto> › Api\AdController@promoteWithCredits
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  PUT       api/ads/{id}/renew generated::<auto> › Api\AdController@renew
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/report generated::<auto> › Api\AdController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/{id}/republish generated::<auto> › Api\AdController@republish
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id}/similar generated::<auto> › Api\AdController@similar
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  PATCH     api/ads/{id}/status generated::<auto> › Api\AdController@updateStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/view generated::<auto> › Api\AdController@recordView
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/agents/advocate generated::<auto> › Api\AdController@askAdvocateAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo generated::<auto> › Api\AdController@askCeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ui generated::<auto> › Api\AdController@askCeoUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ux generated::<auto> › Api\AdController@askCeoUxAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/lawyer generated::<auto> › Api\AdController@askLawyerAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/marketing generated::<auto> › Api\AdController@askMarketingAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/notary generated::<auto> › Api\AdController@askNotaryAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/postgresql generated::<auto> › Api\AdController@askPostgresAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/react generated::<auto> › Api\AdController@generateReactComponent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/seo generated::<auto> › Api\AdController@askSeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ui generated::<auto> › Api\AdController@askUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/auth/oauth/exchange generated::<auto> › Api\AuthController@exchangeOAuthCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/request generated::<auto> › Api\AuthController@requestPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/verify generated::<auto> › Api\AuthController@verifyPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/auth/providers generated::<auto> › Api\AuthController@getProviders
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/auth/telegram/callback generated::<auto> › Api\AuthController@handleTelegramWidget
            ⇂ api
  GET|HEAD  api/auth/{provider}/callback generated::<auto> › Api\AuthController@handleProviderCallback
            ⇂ api
            ⇂ web
  GET|HEAD  api/auth/{provider}/redirect generated::<auto> › Api\AuthController@redirectToProvider
            ⇂ api
            ⇂ web
  GET|HEAD  api/banners generated::<auto> › Api\AdBannerController@publicBanners
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/banners/{id}/click generated::<auto> › Api\AdBannerController@trackClick
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/categories generated::<auto> › Api\CategoryController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/categories generated::<auto> › Api\CategoryController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/categories/{id} generated::<auto> › Api\CategoryController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/category-attributes generated::<auto> › Api\CategoryAttributeController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/chat/conversations generated::<auto> › Api\ChatController@getConversations
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  api/chat/conversations/{conversation}/messages generated::<auto> › Api\ChatController@getConversationMessages
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/chat/messages generated::<auto> › Api\ChatController@sendMessage
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:20,1
  POST      api/contact .......................... generated::<auto>
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/send-verification generated::<auto> › Api\EmailVerificationController@send
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/verify generated::<auto> › Api\EmailVerificationController@verify
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  GET|HEAD  api/favorites generated::<auto> › Api\AdController@favorites
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/forgot-password generated::<auto> › Api\AuthController@forgotPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/gamification/activity generated::<auto> › Api\GamificationController@recordActivity
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/gamification/leaderboard generated::<auto> › Api\GamificationController@leaderboard
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/gamification/profile generated::<auto> › Api\GamificationController@profile
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/google-merchant.xml generated::<auto> › Api\AdController@googleMerchantFeed
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/img ............ generated::<auto> › ImageController
            ⇂ api
  POST      api/login . generated::<auto> › Api\AuthController@login
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/login/two-factor generated::<auto> › Api\AuthController@loginTwoFactor
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/logout generated::<auto> › Api\AuthController@logout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/meta/events/contact generated::<auto> › Api\MetaEventController@contact
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/meta/events/post-ad generated::<auto> › Api\MetaEventController@postAd
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/meta/events/wishlist generated::<auto> › Api\MetaEventController@addToWishlist
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications generated::<auto> › Api\NotificationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/read-all generated::<auto> › Api\NotificationController@markAllRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications/unread-count generated::<auto> › Api\NotificationController@unreadCount
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/{id}/read generated::<auto> › Api\NotificationController@markRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/payment/balance generated::<auto> › Api\PaymentController@payWithBalance
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/payment/clip generated::<auto> › Api\PaymentController@createClipCheckout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/payment/webhook generated::<auto> › Api\PaymentController@handleWebhook
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/phone/send-otp generated::<auto> › Api\PhoneVerificationController@sendOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/phone/verify-otp generated::<auto> › Api\PhoneVerificationController@verifyOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/push/subscribe generated::<auto> › Api\PushController@subscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/push/test generated::<auto> › Api\PushController@test
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/push/unsubscribe generated::<auto> › Api\PushController@unsubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/push/vapid-key generated::<auto> › Api\PushController@vapidPublicKey
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/recommendations generated::<auto> › Api\RecommendationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/recommendations/trending generated::<auto> › Api\RecommendationController@trending
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/referral generated::<auto> › Api\ReferralController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/referral/apply generated::<auto> › Api\ReferralController@apply
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/register generated::<auto> › Api\AuthController@register
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/reset-password generated::<auto> › Api\AuthController@resetPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/search/semantic generated::<auto> › Api\SearchController@semanticSearch
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/search/suggestions generated::<auto> › Api\SearchController@suggestions
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/seller/stats generated::<auto> › Api\SellerStatsController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/sitemap.xml generated::<auto> › Api\AdController@sitemap
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/states/counts .................... generated::<auto>
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/stores generated::<auto> › Api\BusinessProfileController@directory
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/user generated::<auto> › Api\ProfileController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user generated::<auto> › Api\AccountDeletionController@delete
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/ads generated::<auto> › Api\AdController@myAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/analytics generated::<auto> › Api\AdController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/avatar generated::<auto> › Api\ProfileController@uploadAvatar
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  GET|HEAD  api/user/business-profile generated::<auto> › Api\BusinessProfileController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/business-profile generated::<auto> › Api\BusinessProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/business-profile/banner generated::<auto> › Api\BusinessProfileController@uploadBanner
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/business-profile/csf generated::<auto> › Api\BusinessProfileController@uploadCsf
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:identity-uploads
  POST      api/user/business-profile/logo generated::<auto> › Api\BusinessProfileController@uploadLogo
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/coupons/redeem generated::<auto> › Api\PaymentController@redeemCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/user/email/confirm generated::<auto> › Api\ProfileController@confirmEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/email/request generated::<auto> › Api\ProfileController@requestEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,1
  GET|HEAD  api/user/favorite-ads generated::<auto> › Api\AdController@favoriteAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/kyc generated::<auto> › Api\ProfileController@submitKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:identity-uploads
  POST      api/user/mobile-push/register generated::<auto> › Api\MobilePushController@register
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/mobile-push/unregister generated::<auto> › Api\MobilePushController@unregister
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/notifications generated::<auto> › Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications generated::<auto> › Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/notifications/list generated::<auto> › Api\ProfileController@getNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/read-all generated::<auto> › Api\ProfileController@markAllNotificationsRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/notifications/{id} generated::<auto> › Api\ProfileController@deleteNotification
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/{id}/read generated::<auto> › Api\ProfileController@markNotificationRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/password generated::<auto> › Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/password generated::<auto> › Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/payments generated::<auto> › Api\PaymentController@getUserPayments
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/preferences generated::<auto> › Api\ProfileController@updatePreferences
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/profile generated::<auto> › Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  GET|HEAD  api/user/profile generated::<auto> › Api\ProfileController@getProfile
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/profile generated::<auto> › Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/push-subscribe generated::<auto> › Api\ProfileController@pushSubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/push-unsubscribe generated::<auto> › Api\ProfileController@pushUnsubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/saved-searches generated::<auto> › Api\SavedSearchController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/saved-searches generated::<auto> › Api\SavedSearchController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PATCH     api/user/saved-searches/{savedSearch} generated::<auto> › Api\SavedSearchController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/saved-searches/{savedSearch} generated::<auto> › Api\SavedSearchController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/saved-searches/{savedSearch}/reset generated::<auto> › Api\SavedSearchController@resetCount
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/search-alerts generated::<auto> › Api\SearchAlertController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/search-alerts generated::<auto> › Api\SearchAlertController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  PATCH     api/user/search-alerts/{searchAlert} generated::<auto> › Api\SearchAlertController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/search-alerts/{searchAlert} generated::<auto> › Api\SearchAlertController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/subscriptions generated::<auto> › Api\ProfileController@getSubscriptions
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/subscriptions/toggle generated::<auto> › Api\ProfileController@toggleSubscription
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication generated::<auto> › Api\TwoFactorAuthenticationController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/two-factor-authentication generated::<auto> › Api\TwoFactorAuthenticationController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication/confirm generated::<auto> › Api\TwoFactorAuthenticationController@confirm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users generated::<auto> › Api\ProfileController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/users/{id} generated::<auto> › Api\ProfileController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users/{id}/business-profile generated::<auto> › Api\BusinessProfileController@publicShow
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/users/{id}/profile generated::<auto> › Api\ProfileController@publicProfile
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/report generated::<auto> › Api\ProfileController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  GET|HEAD  api/users/{id}/reviews generated::<auto> › Api\ReviewController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/reviews generated::<auto> › Api\ReviewController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/users/{id}/role generated::<auto> › Api\ProfileController@changeRole
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/users/{id}/verify generated::<auto> › Api\ProfileController@verifyUser
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/webhooks/clip generated::<auto> › Api\PaymentController@handleWebhook
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/webhooks/clip/ad-renewal generated::<auto> › Api\AdRenewalWebhookController
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  ayuda/comprar-y-contactar generated::<auto> › SeoShellController@source
            ⇂ web
  GET|HEAD  ayuda/publicar-anuncio generated::<auto> › SeoShellController@source
            ⇂ web
  GET|HEAD  como-funciona generated::<auto> › SeoShellController@source
            ⇂ web
  ANY       help generated::<auto> › Illuminate\Routing › RedirectController
            ⇂ web
  GET|HEAD  listings generated::<auto> › SeoShellController@listings
            ⇂ web
  ANY       privacy generated::<auto> › Illuminate\Routing › RedirectController
            ⇂ web
  ANY       safety generated::<auto> › Illuminate\Routing › RedirectController
            ⇂ web
  GET|HEAD  seguridad generated::<auto> › SeoShellController@source
            ⇂ web
  GET|HEAD  share/ads/{id} ... generated::<auto> › ShareAdController
            ⇂ web
  GET|HEAD  sitemap-ads.xml generated::<auto> › Api\SitemapController@ads
            ⇂ web
  GET|HEAD  sitemap-categories.xml generated::<auto> › Api\SitemapController@categories
            ⇂ web
  GET|HEAD  sitemap-main.xml generated::<auto> › Api\SitemapController@index
            ⇂ web
  GET|HEAD  sitemap-states.xml generated::<auto> › Api\SitemapController@states
            ⇂ web
  GET|HEAD  sitemap.xml generated::<auto> › Api\SitemapController@sitemapIndex
            ⇂ web
  GET|HEAD  sobre-mercasto generated::<auto> › SeoShellController@source
            ⇂ web
  GET|HEAD  storage/{path} ..................................... storage.local
  PUT       storage/{path} .............................. storage.local.upload
  GET|HEAD  tarifas .. generated::<auto> › SeoShellController@source
            ⇂ web
  ANY       terms generated::<auto> › Illuminate\Routing › RedirectController
            ⇂ web
  GET|HEAD  up ................................... generated::<auto>

                                                          Showing [211] routes

```
