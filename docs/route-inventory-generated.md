# Mercasto Generated Route Inventory

Generated at: 2026-05-19T02:01:08Z
Commit: ceee343-dirty
Source: php artisan route:list --except-vendor -v

```text

  GET|HEAD  / .................................... generated::oWvJmb8Yz90BtUGY
            ⇂ web
  GET|HEAD  api/admin/ads/pending generated::Cratbz3QG459MDX4 › Api\AdController@pendingAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/analytics generated::3syIJzDqEO9uaR6t › Api\AdminAnalyticsController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/coupons generated::OL2CbOX3nrE48Ngg › Api\PaymentController@getCoupons
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/coupons generated::rxxBqw8RMHmUN8xE › Api\PaymentController@createCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/coupons/{id} generated::09heSqx2k4kX4R5e › Api\PaymentController@deleteCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc generated::AaxYa80S5Egw5Nfm › Api\ProfileController@getPendingKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/kyc/document/{id} generated::lSDhuf4HQtkBSR9m › Api\ProfileController@viewKycDocument
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/approve generated::R52fqSfG28eRtOAg › Api\ProfileController@approveKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/admin/kyc/{id}/reject generated::MigKcEI43GGvVWAh › Api\ProfileController@rejectKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/reports generated::K7PZCNqMjpmus4a1 › Api\AdController@getReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/reports/{id} generated::JZdRf0XZwAW6bftv › Api\AdController@deleteReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/admin/user-reports generated::nxBmvvrVcJCT2iRC › Api\ProfileController@getUserReports
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/admin/user-reports/{id} generated::7CC3obM0t45RTXSY › Api\ProfileController@deleteUserReport
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/ads ..... generated::IgdILJz7DK6R1s5h › Api\AdController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  POST      api/ads ..... generated::zi0gMCwkT3mCK9QG › Api\AdController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:ads
  POST      api/ads/bulk-action generated::rkDIFvzy9xZZRM6M › Api\AdController@bulkAction
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/ads/bulk-upload generated::ivDzcU6JuqQATR0n › Api\AdController@bulkUpload
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/ads/generate-description generated::BohbVYK3EM9xqimc › Api\AdController@generateDescription
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/{ad} generated::DsghgprSFPJgAPpY › Api\AdController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/ads/{id} . generated::CiDW8dfzQ0Yv5ivR › Api\AdController@show
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  DELETE    api/ads/{id} generated::XBPuFwHYo9aiKDbz › Api\AdController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/ads/{id}/activate generated::ojybT9mxzoFAwHaP › Api\AdController@activate
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/ads/{id}/click generated::vw6sqT8eBpmQYL39 › Api\AdController@recordClick
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  api/ads/{id}/edit generated::67K7clPNkyjnAHQu › Api\AdController@editForm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/ads/{id}/favorite generated::lgEgCOSRCnKZWjom › Api\AdController@toggleFavorite
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/ads/{id}/pause generated::K6pmGK0DP1d6lREG › Api\AdController@pause
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/ads/{id}/pdf generated::YJIkuuDz0xZyC3iT › Api\AdController@generatePdf
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/ads/{id}/promote/credits generated::yKucZobiWJLCbQxv › Api\AdController@promoteWithCredits
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/ads/{id}/report generated::ESrQjzv6DuiUY8Cd › Api\AdController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/ads/{id}/republish generated::iZ5oUYouCKdTRraY › Api\AdController@republish
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PATCH     api/ads/{id}/status generated::ACJYxKX1hyrtxyBX › Api\AdController@updateStatus
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/ads/{id}/view generated::WyKmdSdN0npBb2Yo › Api\AdController@recordView
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  POST      api/agents/advocate generated::3pYDfkqaihTl83HB › Api\AdController@askAdvocateAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo generated::Mxs5MxGialYTRNZ6 › Api\AdController@askCeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ui generated::gnXswh2XeZhKPGh7 › Api\AdController@askCeoUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ceo-ux generated::YDecdYyIHVBXriMN › Api\AdController@askCeoUxAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/lawyer generated::VVrU3lw2AHIgcQqu › Api\AdController@askLawyerAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/marketing generated::fAj7QXAFsPlyXV6J › Api\AdController@askMarketingAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/notary generated::YFMaiqq3YvMLGFA2 › Api\AdController@askNotaryAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/postgresql generated::wrs3HPUs6tUV47am › Api\AdController@askPostgresAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/react generated::qCHCYOQmmrdF7e7y › Api\AdController@generateReactComponent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/seo generated::6TXHIvRYfgZJNv5T › Api\AdController@askSeoAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/agents/ui generated::oiHnG5PQRDqThwf0 › Api\AdController@askUiAgent
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:2,1
  POST      api/auth/oauth/exchange generated::gEd2KKrA7w69VCdu › Api\AuthController@exchangeOAuthCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/request generated::DEetpKwghWGjJ7pQ › Api\AuthController@requestPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/auth/phone/verify generated::6rMY8Tf11F4uIT5n › Api\AuthController@verifyPhoneCode
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/auth/providers generated::s3Tg30X5GRBOJU77 › Api\AuthController@getProviders
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/auth/{provider}/callback generated::90BGzqQPmVis93il › Api\AuthController@handleProviderCallback
            ⇂ api
  GET|HEAD  api/auth/{provider}/redirect generated::bJvFDQtzIehV3iFA › Api\AuthController@redirectToProvider
            ⇂ api
  GET|HEAD  api/categories generated::ehO2UtZfaLwvbpRC › Api\CategoryController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/categories generated::EdZtv6qBYrsneLDe › Api\CategoryController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/categories/{id} generated::Sp8kdqT1hDA2Jm9j › Api\CategoryController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/chat generated::wMTMyLFFSzzkHhnX › Api\ChatController@sendMessage
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/chat/conversations generated::Kxs5IQBArYduD6j5 › Api\ChatController@getConversations
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/chat/{userId} generated::hyvhcj7GHGafHL4b › Api\ChatController@getMessages
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/contact .......................... generated::uAvh6d7qJjJnV1lr
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/send-verification generated::9LN2ozzgqRREhdOM › Api\EmailVerificationController@send
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,60
  POST      api/email/verify generated::HAtHBHkDIdtHM69D › Api\EmailVerificationController@verify
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  GET|HEAD  api/favorites generated::IPBwzukHIUZ6GdYw › Api\AdController@favorites
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/forgot-password generated::HXdPgQ1rBmdLOp1U › Api\AuthController@forgotPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/google-merchant.xml generated::dGDnuBG0nZzJV4tf › Api\AdController@googleMerchantFeed
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/login . generated::2PJ92XDRvadzpDGH › Api\AuthController@login
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/login/two-factor generated::oFcflOI7ZF2qLVGi › Api\AuthController@loginTwoFactor
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/logout generated::1oLmX5Mq984HSnJ0 › Api\AuthController@logout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications generated::3r0BlMu5OXkVT3NL › Api\NotificationController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/read-all generated::l4W5EqflJgNxscUp › Api\NotificationController@markAllRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/notifications/unread-count generated::ZAsDXwuQ6E065fi3 › Api\NotificationController@unreadCount
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/notifications/{id}/read generated::CPPnzbdjCjCja3fd › Api\NotificationController@markRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/payment/clip generated::WbGXZGkzTcw36dwb › Api\PaymentController@createClipCheckout
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:10,1
  POST      api/phone/send-otp generated::j6WLc7tuaprUQIpQ › Api\PhoneVerificationController@sendOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/phone/verify-otp generated::BX9ftfd8iWWEKg8H › Api\PhoneVerificationController@verifyOtp
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  GET|HEAD  api/referral generated::pI5NMTImXvi7VN1x › Api\ReferralController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/referral/apply generated::cRGOM4UpmLMn6OeX › Api\ReferralController@apply
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/register generated::6mL1DaLjLczG11Qo › Api\AuthController@register
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  POST      api/reset-password generated::gjL1IRCge1ypKzpu › Api\AuthController@resetPassword
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:auth
  GET|HEAD  api/search/suggestions generated::UbiJDy4WyMjZFzjU › Api\SearchController@suggestions
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:search
  GET|HEAD  api/sitemap.xml generated::lhP2xJny4LwCtiyX › Api\AdController@sitemap
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/states/counts .................... generated::GuYXWjQonIExKEdm
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  GET|HEAD  api/user generated::CmOqV27fqKYt0Qqv › Api\ProfileController@show
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user generated::AJ0kMjkp3ympJ0sv › Api\AccountDeletionController@delete
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/ads generated::Dq6k6FAUP6Srpney › Api\AdController@myAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/analytics generated::PLeEGJJ31wRfQXMf › Api\AdController@analytics
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/avatar generated::UeW6TtsjdOdQxgKR › Api\ProfileController@uploadAvatar
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/coupons/redeem generated::rRMaInkUYyg1iloo › Api\PaymentController@redeemCoupon
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/user/email/confirm generated::vKvmDMnZYdOSDZfX › Api\ProfileController@confirmEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/email/request generated::l2m4BhdH0ykUBkMJ › Api\ProfileController@requestEmailChange
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:3,1
  GET|HEAD  api/user/favorite-ads generated::bsuud7xTLi5CF79Y › Api\AdController@favoriteAds
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/kyc generated::TYICRLFyxVChEyC9 › Api\ProfileController@submitKyc
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/notifications generated::57DUhzyAIc1w5a5h › Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications generated::8z2kIIxu3lhQLWv5 › Api\ProfileController@updateNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/notifications/list generated::tLJRgB6123a4qik6 › Api\ProfileController@getNotifications
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/read-all generated::pEjE5tNQPvEbwkRd › Api\ProfileController@markAllNotificationsRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/notifications/{id} generated::eKFD7tRBxNiWwWfR › Api\ProfileController@deleteNotification
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/notifications/{id}/read generated::dPOwR76W194Cuy1Q › Api\ProfileController@markNotificationRead
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/password generated::et7KJjQiREvjo7BT › Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/password generated::tWFyQ6LCxZdIs1ZA › Api\ProfileController@changePassword
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/profile generated::tGUP2AFX4D7oFOZW › Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/profile generated::hVobFT1DSzr7f3ng › Api\ProfileController@getProfile
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  PUT       api/user/profile generated::ZEST7afP9vTrU4eg › Api\ProfileController@update
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/push-subscribe generated::tGXivm249qMau38Y › Api\ProfileController@pushSubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/push-unsubscribe generated::GeEmU1s99HfGxmPu › Api\ProfileController@pushUnsubscribe
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/user/subscriptions generated::gQFQ1jxbUZ0t9oml › Api\ProfileController@getSubscriptions
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/subscriptions/toggle generated::g49EBpgZutOsS92E › Api\ProfileController@toggleSubscription
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication generated::VD1s0UvX6Fn6uQpI › Api\TwoFactorAuthenticationController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/user/two-factor-authentication generated::VSL3iCX1rOBvqvxh › Api\TwoFactorAuthenticationController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/user/two-factor-authentication/confirm generated::mfYnIhqPrHUL0UF2 › Api\TwoFactorAuthenticationController@confirm
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users generated::XQnGrg3ustnzU9Mj › Api\ProfileController@index
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  DELETE    api/users/{id} generated::TMrPKV4FUHQRXSgG › Api\ProfileController@destroy
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  GET|HEAD  api/users/{id}/profile generated::7K0DKDuHOhQxreBe › Api\ProfileController@publicProfile
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/report generated::cBfkUuL1gyQqJoHm › Api\ProfileController@report
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  GET|HEAD  api/users/{id}/reviews generated::R3lhfnyJwVU22sZZ › Api\ReviewController@index
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:api
  POST      api/users/{id}/reviews generated::1ULGL9irpt05fwua › Api\ReviewController@store
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:5,1
  POST      api/users/{id}/role generated::tv7c9ah2dKZDYB4V › Api\ProfileController@changeRole
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/users/{id}/verify generated::cJp2BwPoUDDFR5gj › Api\ProfileController@verifyUser
            ⇂ api
            ⇂ Illuminate\Auth\Middleware\Authenticate:sanctum
  POST      api/webhooks/clip generated::7Fnb6t4GWT1Zd823 › Api\PaymentController@handleWebhook
            ⇂ api
            ⇂ Illuminate\Routing\Middleware\ThrottleRequests:60,1
  GET|HEAD  storage/{path} ..................................... storage.local
  PUT       storage/{path} .............................. storage.local.upload
  GET|HEAD  up ................................... generated::eurHqbB9WFQ9d7G9

                                                          Showing [119] routes

```
