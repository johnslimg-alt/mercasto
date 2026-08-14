import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const modalNames = ['PricingModal', 'ProfileModal', 'CouponModal', 'QRModal', 'ReportModal', 'UserReportModal'];

test('rare application modals are lazy-loaded instead of bundled into App', () => {
  for (const name of modalNames) {
    assert.match(app, new RegExp(`const ${name} = React\\.lazy\\(\\(\\) => import\\('./components/modals/${name}'\\)\\)`), name);
    assert.ok(fs.existsSync(`src/components/modals/${name}.jsx`), `${name} file`);
  }
  for (const former of ['renderPricingModal', 'renderProfileModal', 'renderCouponModal', 'renderQRModal', 'renderReportModal', 'renderUserReportModal']) {
    assert.equal(app.includes(`const ${former}`), false, former);
    assert.equal(app.includes(`{${former}()}`), false, former);
  }
});

test('lazy modal imports are gated by open state so closed modals do not load', () => {
  assert.match(app, /\{showPricingModal && <React\.Suspense fallback=\{null\}><PricingModal/);
  assert.match(app, /\{showProfileModal && <React\.Suspense fallback=\{null\}><ProfileModal/);
  assert.match(app, /\{showCouponModal && <React\.Suspense fallback=\{null\}><CouponModal/);
  assert.match(app, /\{qrModalData && <React\.Suspense fallback=\{null\}><QRModal/);
  assert.match(app, /\{showReportModal && <React\.Suspense fallback=\{null\}><ReportModal/);
  assert.match(app, /\{showUserReportModal && <React\.Suspense fallback=\{null\}><UserReportModal/);
});

test('report, profile and payment mutation handlers remain in App with unchanged endpoints', () => {
  assert.match(app, /fetch\(`\$\{API_URL\}\/ads\/\$\{reportingAd\.id\}\/report`,[\s\S]*?method: 'POST',[\s\S]*?body: JSON\.stringify\(reportForm\)/);
  assert.match(app, /fetch\(`\$\{API_URL\}\/users\/\$\{viewedCompany\.id\}\/report`,[\s\S]*?method: 'POST',[\s\S]*?body: JSON\.stringify\(userReportForm\)/);
  assert.match(app, /fetch\(`\$\{API_URL\}\/user\/profile`,[\s\S]*?method: 'POST'/);
  assert.match(app, /fetch\(`\$\{API_URL\}\/payment\/clip`,[\s\S]*?method: 'POST'/);
});

test('each extracted modal retains its principal interaction surface', () => {
  const pricing = fs.readFileSync('src/components/modals/PricingModal.jsx', 'utf8');
  const profile = fs.readFileSync('src/components/modals/ProfileModal.jsx', 'utf8');
  const coupon = fs.readFileSync('src/components/modals/CouponModal.jsx', 'utf8');
  const report = fs.readFileSync('src/components/modals/ReportModal.jsx', 'utf8');
  const userReport = fs.readFileSync('src/components/modals/UserReportModal.jsx', 'utf8');
  const qr = fs.readFileSync('src/components/modals/QRModal.jsx', 'utf8');
  assert.match(pricing, /handlePromotionProductPayment/);
  assert.match(pricing, /handleCreditsPayment/);
  assert.match(profile, /handleProfileSubmit/);
  assert.match(coupon, /handleRedeemCoupon/);
  assert.match(report, /handleReportAd/);
  assert.match(userReport, /handleUserReportSubmit/);
  assert.match(qr, /encodeURIComponent\(qrModalData\)/);
});
