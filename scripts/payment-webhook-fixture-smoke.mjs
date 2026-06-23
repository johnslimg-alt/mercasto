#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const FIXTURE_SECRET = "fixture_webhook_secret_not_real";
const CONTROLLER_PATH = "backend/app/Http/Controllers/Api/PaymentController.php";

function sign(rawBody) {
  return crypto
    .createHmac("sha256", FIXTURE_SECRET)
    .update(rawBody)
    .digest("hex");
}

function receivedHash(signatureHeader) {
  return signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!secret) return false;
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const received = receivedHash(signatureHeader);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  );
}

function handleWebhookFixture({ rawBody, signatureHeader, secret, payments }) {
  if (!secret) return { statusCode: 503, status: "misconfigured", sideEffects: 0 };
  if (!verifySignature(rawBody, signatureHeader, secret)) {
    return { statusCode: 401, status: "invalid_signature", sideEffects: 0 };
  }

  const payload = JSON.parse(rawBody);
  const checkoutId = payload.reference;
  let sideEffects = 0;

  if (checkoutId && payload.status === "paid") {
    const payment = payments.get(checkoutId);
    if (payment && payment.status !== "paid") {
      payment.status = "paid";
      payment.webhookPayload = payload;
      payment.promotions += payment.adId ? 1 : 0;
      payment.notifications += payment.userId ? 1 : 0;
      sideEffects = 1;
    }
  }

  return { statusCode: 200, status: "received", sideEffects };
}

function assertControllerStillMatchesFixture() {
  const controller = fs.readFileSync(CONTROLLER_PATH, "utf8");
  const requiredMarkers = [
    "function handleWebhook",
    "CLIP_WEBHOOK_SECRET",
    "X-Clip-Signature",
    "hash_equals",
    "where('clip_checkout_id'",
    "where('status', '!=', 'paid')",
    "'status' => 'paid'",
    "DB::table('ad_promotions')->insert",
    "broadcast(new NewNotification",
  ];

  for (const marker of requiredMarkers) {
    assert(controller.includes(marker), `Missing controller marker: ${marker}`);
  }
}

function run() {
  assertControllerStillMatchesFixture();

  const payments = new Map([
    [
      "clip_fixture_paid",
      {
        status: "pending",
        userId: 42,
        adId: 99,
        promotions: 0,
        notifications: 0,
      },
    ],
    [
      "clip_fixture_failed",
      {
        status: "pending",
        userId: 42,
        adId: null,
        promotions: 0,
        notifications: 0,
      },
    ],
  ]);

  const paidBody = JSON.stringify({
    event: "payment.succeeded",
    reference: "clip_fixture_paid",
    status: "paid",
    amount: 50,
    currency: "MXN",
  });
  const paidSignature = `sha256=${sign(paidBody)}`;

  const firstPaid = handleWebhookFixture({
    rawBody: paidBody,
    signatureHeader: paidSignature,
    secret: FIXTURE_SECRET,
    payments,
  });
  assert.equal(firstPaid.statusCode, 200);
  assert.equal(firstPaid.status, "received");
  assert.equal(firstPaid.sideEffects, 1);
  assert.equal(payments.get("clip_fixture_paid").status, "paid");
  assert.equal(payments.get("clip_fixture_paid").promotions, 1);
  assert.equal(payments.get("clip_fixture_paid").notifications, 1);

  const duplicatePaid = handleWebhookFixture({
    rawBody: paidBody,
    signatureHeader: paidSignature,
    secret: FIXTURE_SECRET,
    payments,
  });
  assert.equal(duplicatePaid.statusCode, 200);
  assert.equal(duplicatePaid.sideEffects, 0);
  assert.equal(payments.get("clip_fixture_paid").promotions, 1);
  assert.equal(payments.get("clip_fixture_paid").notifications, 1);

  const invalidSignature = handleWebhookFixture({
    rawBody: paidBody,
    signatureHeader: "sha256=invalid_fixture_signature",
    secret: FIXTURE_SECRET,
    payments,
  });
  assert.equal(invalidSignature.statusCode, 401);
  assert.equal(invalidSignature.status, "invalid_signature");

  const missingSecret = handleWebhookFixture({
    rawBody: paidBody,
    signatureHeader: paidSignature,
    secret: "",
    payments,
  });
  assert.equal(missingSecret.statusCode, 503);
  assert.equal(missingSecret.status, "misconfigured");

  const failedBody = JSON.stringify({
    event: "payment.failed",
    reference: "clip_fixture_failed",
    status: "failed",
    amount: 50,
    currency: "MXN",
  });
  const failedPayment = handleWebhookFixture({
    rawBody: failedBody,
    signatureHeader: `sha256=${sign(failedBody)}`,
    secret: FIXTURE_SECRET,
    payments,
  });
  assert.equal(failedPayment.statusCode, 200);
  assert.equal(failedPayment.sideEffects, 0);
  assert.equal(payments.get("clip_fixture_failed").status, "pending");

  const report = [
    "== Clip payment webhook fixture smoke ==",
    "signed paid webhook: accepted and applied once",
    "duplicate paid webhook: accepted with zero extra side effects",
    "invalid signature: rejected",
    "missing secret: rejected as misconfigured",
    "failed payment: accepted without paid-state mutation",
    "secret safety: fixture secret not printed",
    "payment webhook fixture smoke OK",
  ].join("\n");

  assert(!report.includes(FIXTURE_SECRET), "Fixture secret leaked into output");
  console.log(report);
}

run();
