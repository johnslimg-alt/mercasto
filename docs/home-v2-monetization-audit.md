# Home V2 — monetization audit (ТЗ §14)

Requirement: checkout price must be real, and **V2 must not keep its own copy of the
prices**. UI and `PaymentProductsSeeder` must agree.

Method: static analysis of the V2 surface, the pricing modal, the seeder and the payment
controller — tracing what the customer is actually charged, not what the UI displays.

## 1. V2 stores no prices — verified

`HomeScreenV2.jsx` contains no plan codes and no plan amounts. Every `price` in that file
belongs to *listing* price filtering (`min_price`, `max_price`, the quick price filters) or
to rendering a listing's own price. The V2 home only calls `setShowPricingModal(true)`.

## 2. The price list exists in three places, and they currently agree

| Source | Impulso | Negocio | Pro | Agencia |
| --- | --- | --- | --- | --- |
| `PaymentProductsSeeder.php` | 99.00 | 249.00 | 599.00 | 1499.00 |
| `PaymentController::PACKAGES_BY_CODE` | 99 | 249 | 599 | 1499 |
| `PricingModal.jsx` (`handleClipPayment(...)`) | 99 | 249 | 599 | 1499 |

Boosts agree too: `boost_1_day` 19, `boost_3_days` 49, `highlight_7_days` 79,
`featured_7_days` 149, `featured_30_days` 399 — in both the seeder and the controller map.
Credit packs are 100 / 200 / 300 / 500 in both.

So the ТЗ statement "UI and `PaymentProductsSeeder` agree" is confirmed independently.

## 3. Drift risk worth recording

`PaymentController` resolves prices from its own `PACKAGES_BY_CODE` constant and **does not
read the `payment_products` table** at all:

```
grep -nE "PaymentProduct::|->price" backend/app/Http/Controllers/Api/PaymentController.php  ->  no matches
```

Consequence: the seeder's rows are not authoritative for checkout. Changing a price in
`PaymentProductsSeeder` alone would change what the UI and the products table advertise
without changing what the customer is charged. Three copies of the same list will drift
eventually; the controller constant is the one that actually matters.

Recommendation: make the controller the single source of truth and have the seeder derive
from it — or vice versa — so a price can only be changed in one place. Until then, any price
change must be applied to all three.

## 4. Checkout price integrity — sound

The controller is server-authoritative, which is the important part:

```php
// PaymentController.php:89 — client value, immediately discarded
$amount = (float) $request->amount;
// :95-99 — overwritten with server-resolved values
$resolved = $this->resolvePurchasePricing($request, $user, $description);
['amount' => $amount, 'description' => $description, 'productCode' => $productCode] = $resolved;
```

`resolvePurchasePricing` derives the amount from `PACKAGES_BY_CODE` keyed by `product_code`,
rejects unknown codes with HTTP 400, and falls back to a hardcoded 50 only for the
ad-promotion path. The constant carries the comment *"Защита от подмены цен (Client-Side
Pricing Exploit)"*, and the code matches the intent.

The single place a client-supplied amount is honoured is `credits_custom`, which is inherently
variable, and it is bounded by validation:

```php
$request->validate(['amount' => 'required|numeric|min:50|max:5000']);
```

That path also carries IDOR protection (the ad must belong to the caller) and a
promotion-eligibility check before a payment row is created. No client-side price
manipulation was found on the fixed-price products.

## 5. Not covered here

Coupon handling, monthly/yearly logic, cancelled/failed/successful payment flows, renewal,
webhook idempotency and post-payment entitlement are outside what static reading can settle —
they need the payment test path. They remain open items for §14 and are listed in the cutover
plan's entry criteria.
