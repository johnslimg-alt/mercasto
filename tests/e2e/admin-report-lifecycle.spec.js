import { expect, test } from '@playwright/test';

const adminUser = { id: 9901, name: 'Lifecycle Admin', email: 'lifecycle-admin@example.test', role: 'admin', is_verified: true };

async function installAdmin(page) {
  await page.addInitScript(({ user }) => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'report-lifecycle-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, { user: adminUser });
}

test('ordinary admin report moderation uses lifecycle PATCH and never DELETE', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installAdmin(page);

  let deleteCount = 0;
  const transitions = [];
  let listingReports = [{ id: 77, ad_id: 501, ad_title: 'QA listing', ad_status: 'active', reason: 'Fraude o estafa', comments: 'Review listing', reporter_name: 'QA Buyer', status: 'new' }];
  let userReports = [{ id: 88, reported_user_id: 601, reported_name: 'QA Seller', reason: 'Sospecha de fraude', comments: 'Review user', reporter_name: 'QA Buyer', status: 'in_review' }];

  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (method === 'DELETE' && (/\/admin\/reports\/\d+$/.test(path) || /\/admin\/user-reports\/\d+$/.test(path))) {
      deleteCount += 1;
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'destructive path forbidden in regression' }) });
    }
    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }
    if (path.endsWith('/admin/reports') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listingReports) });
    }
    if (path.endsWith('/admin/user-reports') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userReports) });
    }
    const listingMatch = path.match(/\/admin\/reports\/(\d+)\/transition$/);
    const userMatch = path.match(/\/admin\/user-reports\/(\d+)\/transition$/);
    if ((listingMatch || userMatch) && method === 'PATCH') {
      const kind = userMatch ? 'user' : 'listing';
      const id = Number((userMatch || listingMatch)[1]);
      const payload = request.postDataJSON();
      transitions.push({ kind, id, payload });
      if (kind === 'listing') listingReports = listingReports.map(report => report.id === id ? { ...report, status: payload.status, resolution_note: payload.resolution_note } : report);
      else userReports = userReports.map(report => report.id === id ? { ...report, status: payload.status, resolution_note: payload.resolution_note } : report);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ report: { id, status: payload.status } }) });
    }
    if (path.endsWith('/admin/analytics')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revenue_period: 0, promotion_revenue_period: 0, ctr: 0, total_clicks: 0, total_impressions: 0 }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('admin-tab-reports').click();

  await expect(page.getByTestId('report-lifecycle-listing-77-reference')).toHaveText('RPT-A-00000077');
  await expect(page.getByTestId('report-lifecycle-listing-77-status')).toHaveText('New');
  await page.getByTestId('report-lifecycle-listing-77-start').click();
  await expect(page.getByTestId('report-lifecycle-listing-77-status')).toHaveText('In review');
  expect(transitions[0]).toMatchObject({ kind: 'listing', id: 77, payload: { status: 'in_review' } });

  await page.getByTestId('admin-report-tab-users').click();
  await expect(page.getByTestId('report-lifecycle-user-88-reference')).toHaveText('RPT-U-00000088');
  await page.getByTestId('report-lifecycle-user-88-note').fill('Reviewed manually; no policy breach remains.');
  await page.getByTestId('report-lifecycle-user-88-resolve').click();
  await expect(page.getByTestId('report-lifecycle-user-88-status')).toHaveText('Resolved');
  expect(transitions.at(-1)).toMatchObject({ kind: 'user', id: 88, payload: { status: 'resolved', resolution_note: 'Reviewed manually; no policy breach remains.' } });
  expect(deleteCount).toBe(0);
});
