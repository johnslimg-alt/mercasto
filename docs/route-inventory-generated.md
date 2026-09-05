# Mercasto Generated Route Inventory

Generated at: 2026-09-05T19:41:25Z
Commit: f00893cd
Source: php artisan route:list --except-vendor -v

```text

  GET|HEAD  / .............................................. routes/web.php:41
            ⇂ web
  ANY       acerca-de .................. Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  ads/{id} ................................... SeoShellController@ad
            ⇂ web
  GET|HEAD  api/admin/ads/pending ................ Api\AdController@pendingAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/analytics ....... Api\AdminAnalyticsController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/banners ................... Api\AdBannerController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/banners ................... Api\AdBannerController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/banners/stats ............. Api\AdBannerController@stats
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/banners/upload ...... Api\AdBannerController@uploadImage
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/admin/banners/{id} ............. Api\AdBannerController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/banners/{id} ............ Api\AdBannerController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/business-verifications Api\BusinessProfileController@adminPendingVerifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/business-verifications/{userId}/csf Api\BusinessProfileController@adminDownloadCsf
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/business-verifications/{userId}/review Api\BusinessProfileController@adminReviewVerification
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/coupons ............... Api\PaymentController@getCoupons
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/coupons ............. Api\PaymentController@createCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/coupons/{id} ........ Api\PaymentController@deleteCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc ................ Api\ProfileController@getPendingKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc/document/{id} Api\ProfileController@viewKycDocument
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/approve ...... Api\ProfileController@approveKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/reject ........ Api\ProfileController@rejectKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/marketing/meta/campaigns Api\MarketingController@metaCampaigns
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  PATCH     api/admin/marketing/meta/campaigns/{campaignId}/budget Api\MarketingController@updateMetaCampaignBudget
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  PATCH     api/admin/marketing/meta/campaigns/{campaignId}/status Api\MarketingController@updateMetaCampaignStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/marketing/meta/status Api\MarketingController@metaStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/moderation/ads ... Api\AdminAdModerationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/moderation/ads/{ad} Api\AdminAdModerationController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/ads/{ad}/decision Api\AdminAdModerationController@decide
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/ads/{ad}/retry-ai Api\AdminAdModerationController@retry
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/admin/moderation/process-pending Api\AdminAdModerationController@processPending
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/admin/payments ........ Api\PaymentController@getAdminPayments
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/placements ........... Api\AdBannerController@placements
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/placements ...... Api\AdBannerController@createPlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/admin/placements/{id} . Api\AdBannerController@updatePlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/placements/{id} Api\AdBannerController@destroyPlacement
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/reports .................... Api\AdController@getReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/reports/{id} ............. Api\AdController@deleteReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PATCH     api/admin/reports/{id}/transition Api\ReportModerationController@transitionListingReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/seo-measurement ...... Api\AdminSeoMeasurementController
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/user-reports ...... Api\ProfileController@getUserReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/user-reports/{id} Api\ProfileController@deleteUserReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PATCH     api/admin/user-reports/{id}/transition Api\ReportModerationController@transitionUserReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/ads .............................. Api\AdIndexController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  POST      api/ads ................................... Api\AdController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ads
  POST      api/ads/bulk-action .................. Api\AdController@bulkAction
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/ads/bulk-upload .................. Api\AdController@bulkUpload
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:uploads
  GET|HEAD  api/ads/featured .................. Api\AdIndexController@featured
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/generate-description ......... Api\AiDescriptionController
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/impressions ........... Api\AdController@recordImpressions
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/ads/promote/credits/bulk Api\AdController@promoteWithCreditsBulk
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{ad} ............................. Api\AdController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id} ............................... Api\AdController@show
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  DELETE    api/ads/{id} ............................ Api\AdController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  PUT       api/ads/{id}/activate .................. Api\AdController@activate
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/click .................. Api\AdController@recordClick
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/ads/{id}/contact-seller .. Api\ContactController@contactSeller
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,60
  GET|HEAD  api/ads/{id}/edit ...................... Api\AdController@editForm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/{id}/favorite ............ Api\AdController@toggleFavorite
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/ads/{id}/pause ........................ Api\AdController@pause
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id}/pdf .................... Api\AdController@generatePdf
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  GET|HEAD  api/ads/{id}/price-history ......... Api\AdController@priceHistory
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/ads/{id}/promote/credits . Api\AdController@promoteWithCredits
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  PUT       api/ads/{id}/renew ........................ Api\AdController@renew
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/report ...................... Api\AdController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/{id}/republish ................ Api\AdController@republish
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  GET|HEAD  api/ads/{id}/similar .................... Api\AdController@similar
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  PATCH     api/ads/{id}/status ................ Api\AdController@updateStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ad-mutations
  POST      api/ads/{id}/view .................... Api\AdController@recordView
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/agents/advocate ............ Api\AdController@askAdvocateAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo ...................... Api\AdController@askCeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ui ................. Api\AdController@askCeoUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ux ................. Api\AdController@askCeoUxAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/lawyer ................ Api\AdController@askLawyerAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/marketing .......... Api\AdController@askMarketingAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/notary ................ Api\AdController@askNotaryAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/postgresql .......... Api\AdController@askPostgresAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/react ......... Api\AdController@generateReactComponent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/seo ...................... Api\AdController@askSeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ui ........................ Api\AdController@askUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/auth/oauth/exchange ..... Api\AuthController@exchangeOAuthCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/request ....... Api\AuthController@requestPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/verify ......... Api\AuthController@verifyPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/auth/providers ............... Api\AuthController@getProviders
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/auth/telegram/callback Api\AuthController@handleTelegramWidget
            ⇂ api
  GET|HEAD  api/auth/{provider}/callback Api\AuthController@handleProviderCallback
            ⇂ api
            ⇂ web
  GET|HEAD  api/auth/{provider}/redirect Api\AuthController@redirectToProvider
            ⇂ api
            ⇂ web
  GET|HEAD  api/banners ................. Api\AdBannerController@publicBanners
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/banners/{id}/click ......... Api\AdBannerController@trackClick
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|POST|HEAD api/broadcasting/auth Illuminate\Broadcasting\BroadcastController@authenticate
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/categories ...................... Api\CategoryController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/categories ...................... Api\CategoryController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/categories/{id} ................ Api\CategoryController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/category-attributes .... Api\CategoryAttributeController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/chat/conversations ....... Api\ChatController@getConversations
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  api/chat/conversations/{conversation}/messages Api\ChatController@getConversationMessages
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/chat/messages ................. Api\ChatController@sendMessage
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:20,1
  POST      api/contact ................................ routes/support.php:13
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/send-verification . Api\EmailVerificationController@send
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/verify .......... Api\EmailVerificationController@verify
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  GET|HEAD  api/favorites ......................... Api\AdController@favorites
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/forgot-password ............ Api\AuthController@forgotPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/gamification/activity Api\GamificationController@recordActivity
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/gamification/leaderboard Api\GamificationController@leaderboard
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/gamification/profile ...... Api\GamificationController@profile
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/google-merchant.xml ...... Api\AdController@googleMerchantFeed
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/img .......................................... ImageController
            ⇂ api
  POST      api/login ............................... Api\AuthController@login
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/login/two-factor ........... Api\AuthController@loginTwoFactor
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/logout ............................. Api\AuthController@logout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/meta/events/contact .......... Api\MetaEventController@contact
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/meta/events/post-ad ........... Api\MetaEventController@postAd
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/meta/events/wishlist ... Api\MetaEventController@addToWishlist
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications ............... Api\NotificationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/read-all Api\NotificationController@markAllRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications/unread-count Api\NotificationController@unreadCount
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/{id}/read .. Api\NotificationController@markRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/payment/balance ......... Api\PaymentController@payWithBalance
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/payment/clip ........ Api\PaymentController@createClipCheckout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/payment/webhook .......... Api\PaymentController@handleWebhook
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/phone/send-otp ....... Api\PhoneVerificationController@sendOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/phone/verify-otp ... Api\PhoneVerificationController@verifyOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/push/subscribe .................. Api\PushController@subscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/push/test ............................ Api\PushController@test
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/push/unsubscribe .............. Api\PushController@unsubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/push/vapid-key ............. Api\PushController@vapidPublicKey
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/recommendations ........... Api\RecommendationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/recommendations/trending Api\RecommendationController@trending
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/referral ........................ Api\ReferralController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/referral/apply .................. Api\ReferralController@apply
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/register ......................... Api\AuthController@register
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/reset-password .............. Api\AuthController@resetPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/search/semantic .......... Api\SearchController@semanticSearch
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/search/suggestions .......... Api\SearchController@suggestions
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/seller/stats ................. Api\SellerStatsController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/sitemap.xml ......................... Api\AdController@sitemap
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/states/counts .............................. routes/api.php:55
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/stores ............... Api\BusinessProfileController@directory
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/user .............................. Api\ProfileController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user .................... Api\AccountDeletionController@delete
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/ads .............................. Api\AdController@myAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/analytics .................... Api\AdController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/avatar ............... Api\ProfileController@uploadAvatar
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  GET|HEAD  api/user/business-profile ..... Api\BusinessProfileController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/business-profile ... Api\BusinessProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/business-profile/banner Api\BusinessProfileController@uploadBanner
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/business-profile/csf Api\BusinessProfileController@uploadCsf
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:identity-uploads
  POST      api/user/business-profile/logo Api\BusinessProfileController@uploadLogo
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/coupons/redeem ....... Api\PaymentController@redeemCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/user/email/confirm .. Api\ProfileController@confirmEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/email/request .. Api\ProfileController@requestEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,1
  GET|HEAD  api/user/favorite-ads ............... Api\AdController@favoriteAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/kyc ..................... Api\ProfileController@submitKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:identity-uploads
  POST      api/user/mobile-push/register .. Api\MobilePushController@register
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/mobile-push/unregister Api\MobilePushController@unregister
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/notifications . Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications . Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/notifications/list Api\ProfileController@getNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/read-all Api\ProfileController@markAllNotificationsRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/notifications/{id} Api\ProfileController@deleteNotification
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/{id}/read Api\ProfileController@markNotificationRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/password ........... Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/password ........... Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/payments .......... Api\PaymentController@getUserPayments
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/preferences ..... Api\ProfileController@updatePreferences
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/profile .................... Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  GET|HEAD  api/user/profile ................ Api\ProfileController@getProfile
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/profile .................... Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:profile-uploads
  POST      api/user/push-subscribe ...... Api\ProfileController@pushSubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/push-unsubscribe .. Api\ProfileController@pushUnsubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/saved-searches .......... Api\SavedSearchController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/saved-searches .......... Api\SavedSearchController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PATCH     api/user/saved-searches/{savedSearch} Api\SavedSearchController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/saved-searches/{savedSearch} Api\SavedSearchController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/saved-searches/{savedSearch}/reset Api\SavedSearchController@resetCount
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/search-alerts ........... Api\SearchAlertController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/search-alerts ........... Api\SearchAlertController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  PATCH     api/user/search-alerts/{searchAlert} Api\SearchAlertController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/search-alerts/{searchAlert} Api\SearchAlertController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/subscriptions .... Api\ProfileController@getSubscriptions
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/subscriptions/toggle Api\ProfileController@toggleSubscription
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication Api\TwoFactorAuthenticationController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/two-factor-authentication Api\TwoFactorAuthenticationController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication/confirm Api\TwoFactorAuthenticationController@confirm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users ............................ Api\ProfileController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/users/{id} ..................... Api\ProfileController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users/{id}/business-profile Api\BusinessProfileController@publicShow
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/users/{id}/profile ....... Api\ProfileController@publicProfile
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/report ............... Api\ProfileController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  GET|HEAD  api/users/{id}/reviews ................ Api\ReviewController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/reviews ................ Api\ReviewController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/users/{id}/role ............. Api\ProfileController@changeRole
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/users/{id}/verify ........... Api\ProfileController@verifyUser
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/webhooks/clip ............ Api\PaymentController@handleWebhook
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/webhooks/clip/ad-renewal ...... Api\AdRenewalWebhookController
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  articulos_camping ............... SeoShellController@verticalAlias
            ⇂ web
  GET|HEAD  atracciones_exp ................. SeoShellController@verticalAlias
            ⇂ web
  ANY       autos ...................... Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  ayuda .............................. SeoShellController@publicPage
            ⇂ web
  GET|HEAD  ayuda/comprar-y-contactar .............. SeoShellController@source
            ⇂ web
  GET|HEAD  ayuda/publicar-anuncio ................. SeoShellController@source
            ⇂ web
  GET|HEAD  boletos .............................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  boletos_turismo ................. SeoShellController@verticalAlias
            ⇂ web
  GET|POST|HEAD broadcasting/auth Illuminate\Broadcasting\BroadcastController@authenticate
            ⇂ web
  GET|HEAD  como-funciona .......................... SeoShellController@source
            ⇂ web
  GET|HEAD  contacto ........................... SeoShellController@publicPage
            ⇂ web
  GET|HEAD  cookies ............................ SeoShellController@publicPage
            ⇂ web
  GET|HEAD  electronica .......................... SeoShellController@vertical
            ⇂ web
  GET|HEAD  empleos .............................. SeoShellController@vertical
            ⇂ web
  GET|POST|HEAD graphql ... graphql › Nuwave\Lighthouse\Http\GraphQLController
            ⇂ Nuwave\Lighthouse\Http\Middleware\AcceptJson
            ⇂ Nuwave\Lighthouse\Http\Middleware\AttemptAuthentication
  GET|HEAD  guias_servicios ................. SeoShellController@verticalAlias
            ⇂ web
  ANY       help ....................... Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  hogar ................................ SeoShellController@vertical
            ⇂ web
  GET|HEAD  horizon/api/batches horizon.jobs-batches.index › Laravel\Horizon\Http\Controllers\BatchesController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  POST      horizon/api/batches/retry/{id} horizon.jobs-batches.retry › Laravel\Horizon\Http\Controllers\BatchesController@retry
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/batches/{id} horizon.jobs-batches.show › Laravel\Horizon\Http\Controllers\BatchesController@show
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/completed horizon.completed-jobs.index › Laravel\Horizon\Http\Controllers\CompletedJobsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/failed horizon.failed-jobs.index › Laravel\Horizon\Http\Controllers\FailedJobsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/failed/{id} horizon.failed-jobs.show › Laravel\Horizon\Http\Controllers\FailedJobsController@show
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/pending horizon.pending-jobs.index › Laravel\Horizon\Http\Controllers\PendingJobsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  POST      horizon/api/jobs/retry/{id} horizon.retry-jobs.show › Laravel\Horizon\Http\Controllers\RetryController@store
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/silenced horizon.silenced-jobs.index › Laravel\Horizon\Http\Controllers\SilencedJobsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/jobs/{id} horizon.jobs.show › Laravel\Horizon\Http\Controllers\JobsController@show
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/masters horizon.masters.index › Laravel\Horizon\Http\Controllers\MasterSupervisorController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/metrics/jobs horizon.jobs-metrics.index › Laravel\Horizon\Http\Controllers\JobMetricsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/metrics/jobs/{id} horizon.jobs-metrics.show › Laravel\Horizon\Http\Controllers\JobMetricsController@show
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/metrics/queues horizon.queues-metrics.index › Laravel\Horizon\Http\Controllers\QueueMetricsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/metrics/queues/{id} horizon.queues-metrics.show › Laravel\Horizon\Http\Controllers\QueueMetricsController@show
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/monitoring horizon.monitoring.index › Laravel\Horizon\Http\Controllers\MonitoringController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  POST      horizon/api/monitoring horizon.monitoring.store › Laravel\Horizon\Http\Controllers\MonitoringController@store
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/monitoring/{tag} horizon.monitoring-tag.paginate › Laravel\Horizon\Http\Controllers\MonitoringController@paginate
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  DELETE    horizon/api/monitoring/{tag} horizon.monitoring-tag.destroy › Laravel\Horizon\Http\Controllers\MonitoringController@destroy
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/stats horizon.stats.index › Laravel\Horizon\Http\Controllers\DashboardStatsController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/api/workload horizon.workload.index › Laravel\Horizon\Http\Controllers\WorkloadController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  horizon/{view?} horizon.index › Laravel\Horizon\Http\Controllers\HomeController@index
            ⇂ horizon
            ⇂ Laravel\Horizon\Http\Middleware\Authenticate
  GET|HEAD  hospedaje ....................... SeoShellController@verticalAlias
            ⇂ web
  GET|HEAD  infantil ............................. SeoShellController@vertical
            ⇂ web
  ANY       informatica ................ Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  inmuebles ............................ SeoShellController@vertical
            ⇂ web
  GET|HEAD  listings ............................. SeoShellController@listings
            ⇂ web
  GET|HEAD  mascotas ............................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  moda ................................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  motor ................................ SeoShellController@vertical
            ⇂ web
  GET|HEAD  negocios ............................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  ocio ................................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  privacidad ......................... SeoShellController@publicPage
            ⇂ web
  ANY       privacy .................... Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  productos ............................ SeoShellController@vertical
            ⇂ web
  GET|HEAD  renta_vehiculos ................. SeoShellController@verticalAlias
            ⇂ web
  POST      resend/webhook resend.webhook › Resend\Laravel\Http\Controllers\WebhookController@handleWebhook
  GET|HEAD  retiros_bienestar ............... SeoShellController@verticalAlias
            ⇂ web
  ANY       safety ..................... Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  sanctum/csrf-cookie sanctum.csrf-cookie › Laravel\Sanctum\Http\Controllers\CsrfCookieController@show
            ⇂ web
  GET|HEAD  seguridad .............................. SeoShellController@source
            ⇂ web
  GET|HEAD  servicios ............................ SeoShellController@vertical
            ⇂ web
  GET|HEAD  share/ads/{id} ................................. ShareAdController
            ⇂ web
  GET|HEAD  sitemap-ads.xml ........................ Api\SitemapController@ads
            ⇂ web
  GET|HEAD  sitemap-categories.xml .......... Api\SitemapController@categories
            ⇂ web
  GET|HEAD  sitemap-main.xml ..................... Api\SitemapController@index
            ⇂ web
  GET|HEAD  sitemap-states.xml .................. Api\SitemapController@states
            ⇂ web
  GET|HEAD  sitemap.xml ................... Api\SitemapController@sitemapIndex
            ⇂ web
  GET|HEAD  sobre-mercasto ......................... SeoShellController@source
            ⇂ web
  GET|HEAD  souvenirs ....................... SeoShellController@verticalAlias
            ⇂ web
  GET|HEAD  storage/{path} storage.local › var/www/mercasto/backend/vendor/laravel/framework/src/Illuminate/Filesystem/FilesystemServiceProvider.php:111
  PUT       storage/{path} storage.local.upload › var/www/mercasto/backend/vendor/laravel/framework/src/Illuminate/Filesystem/FilesystemServiceProvider.php:119
  GET|HEAD  tarifas ................................ SeoShellController@source
            ⇂ web
  GET|HEAD  tecnologia ...................... SeoShellController@verticalAlias
            ⇂ web
  ANY       telefonia .................. Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  telefonos ....................... SeoShellController@verticalAlias
            ⇂ web
  GET|HEAD  terminos ........................... SeoShellController@publicPage
            ⇂ web
  ANY       terms ...................... Illuminate\Routing\RedirectController
            ⇂ web
  GET|HEAD  tiendas ............................ SeoShellController@publicPage
            ⇂ web
  GET|HEAD  tours ........................... SeoShellController@verticalAlias
            ⇂ web
  GET|HEAD  turismo .............................. SeoShellController@vertical
            ⇂ web
  GET|HEAD  up var/www/mercasto/backend/vendor/laravel/framework/src/Illuminate/Foundation/Configuration/ApplicationBuilder.php:224

                                                          Showing [274] routes

```
