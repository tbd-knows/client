import { expect, test, type Page } from '@playwright/test';

const hash = 'a'.repeat(64);
const joinLink = `/join#token_hash=${hash}&type=invite`;
const userId = '11111111-1111-4111-8111-111111111111';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fake@example.test',
  email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
  app_metadata: {}, user_metadata: {} };

function verifiedSession(expiresIn = 3600) {
  return { access_token: 'fake-access-token', refresh_token: 'fake-refresh-token',
    token_type: 'bearer', expires_in: expiresIn, expires_at: Math.floor(Date.now() / 1000) + expiresIn, user };
}

async function mocks(page: Page) {
  const calls = { verify: 0, join: 0, other: [] as string[] };
  await page.route('https://**/*', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      } });
    }
    if (request.url().startsWith('https://auth.example.test/auth/v1/verify')) {
      calls.verify++;
      expect(new URL(page.url()).hash).toBe('');
      expect(request.headers()['referer']).toBeUndefined();
      return route.fulfill({ json: verifiedSession() });
    }
    if (request.url() === 'https://api.example.test/v1/join') {
      calls.join++;
      expect(request.headers()['authorization']).toBe('Bearer fake-access-token');
      expect(request.headers()['referer']).toBeUndefined();
      expect(request.postData()).toBeNull();
      return route.fulfill({ json: { id: userId, name: 'Fake', type: 'individual', phone: '+12125550100',
        email: 'fake@example.test', revision: 0, created_at: '2026-01-01T00:00:00Z' } });
    }
    calls.other.push(request.url());
    return route.abort();
  });
  return calls;
}

async function noStoredSession(page: Page) {
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })))
    .toEqual({ local: [], session: [], cookies: '' });
}

test('GET and page initialization scrub fragment without verifying or creating', async ({ page, request }) => {
  const calls = await mocks(page);
  const response = await request.get('/join');
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
  await page.goto(joinLink);
  await expect(page.getByRole('button', { name: 'Join TBD' })).toBeVisible();
  expect(page.url()).toBe('http://127.0.0.1:4173/join');
  await page.waitForTimeout(200);
  expect(calls).toEqual({ verify: 0, join: 0, other: [] });
  await noStoredSession(page);
});

for (const type of ['invite', 'email']) {
  test(`explicit ${type} click verifies and joins using the backend contract`, async ({ page }) => {
    const calls = await mocks(page);
    let payload: unknown;
    await page.route('**/auth/v1/verify', async route => {
      payload = route.request().postDataJSON();
      await route.fallback();
    });
    await page.goto(`/join#token_hash=${hash}&type=${type}`);
    await page.getByRole('button', { name: 'Join TBD' }).click();
    await expect(page.getByRole('status')).toHaveText("You're in TBD.");
    expect(payload).toMatchObject({ token_hash: hash, type });
    expect(calls).toEqual({ verify: 1, join: 1, other: [] });
    await expect(page.getByRole('button')).toBeHidden();
    await noStoredSession(page);
  });
}

for (const failure of ['server', 'network', 'invalid-success']) {
  test(`API ${failure} failure retains session and Retry never verifies consumed OTP again`, async ({ page }) => {
    const calls = await mocks(page);
    let attempts = 0;
    await page.route('https://api.example.test/v1/join', async route => {
      attempts++;
      if (attempts > 1) return route.fallback();
      if (failure === 'network') return route.abort('failed');
      return route.fulfill(failure === 'server' ? { status: 503, json: { detail: 'fake failure' } } : { status: 200, body: '<html>not a User</html>' });
    });
    await page.goto(joinLink);
    await page.getByRole('button', { name: 'Join TBD' }).click();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeEnabled();
    await expect(page.getByRole('status')).not.toContainText("You're in");
    await noStoredSession(page);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('status')).toHaveText("You're in TBD.");
    expect(calls.verify).toBe(1);
    expect(attempts).toBe(2);
    expect(calls.other).toEqual([]);
  });
}

test('double click while pending makes one verification and one join', async ({ page }) => {
  const calls = await mocks(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/auth/v1/verify', async route => { await pending; await route.fallback(); });
  await page.goto(joinLink);
  await page.getByRole('button', { name: 'Join TBD' }).click();
  await expect(page.getByRole('button')).toBeDisabled();
  await page.getByRole('button').evaluate(button => { button.dispatchEvent(new MouseEvent('click')); });
  release();
  await expect(page.getByRole('status')).toHaveText("You're in TBD.");
  expect(calls).toEqual({ verify: 1, join: 1, other: [] });
});

for (const fragment of ['', '#token_hash=bad&type=signup', '#token_hash=a&type=invite&type=email', '#type=invite', '#token_hash=%3Cscript%3E&type=invite']) {
  test(`missing/malformed/unsupported link ${fragment} makes no Auth/API call`, async ({ page }) => {
    const calls = await mocks(page);
    await page.goto(`/join${fragment}`);
    await expect(page.getByRole('status')).toContainText('resend');
    await expect(page.getByRole('button')).toBeHidden();
    expect(calls).toEqual({ verify: 0, join: 0, other: [] });
  });
}

test('expired/used token errors offer founder resend without exposing upstream detail', async ({ page }) => {
  const calls = await mocks(page);
  await page.route('**/auth/v1/verify', route => route.fulfill({ status: 403, json: { msg: 'private upstream detail', error_code: 'otp_expired' } }));
  await page.goto(joinLink);
  await page.getByRole('button').click();
  await expect(page.getByRole('status')).toContainText('expired or already been used');
  await expect(page.getByRole('status')).not.toContainText('private upstream detail');
  expect(calls.join).toBe(0);
  await noStoredSession(page);
});

test('reload after API failure loses session and needs resend', async ({ page }) => {
  const calls = await mocks(page);
  await page.route('https://api.example.test/v1/join', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(joinLink);
  await page.getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('status')).toContainText('resend');
  await expect(page.getByRole('button')).toBeHidden();
  expect(calls.verify).toBe(1);
  await noStoredSession(page);
});

for (const status of [401, 403, 409]) {
  test(`API ${status} never claims success and offers founder recovery`, async ({ page }) => {
    await mocks(page);
    await page.route('https://api.example.test/v1/join', route => route.fulfill({ status, json: { detail: 'private detail' } }));
    await page.goto(joinLink);
    await page.getByRole('button').click();
    await expect(page.getByRole('status')).toContainText('founder');
    await expect(page.getByRole('button')).toBeHidden();
    await noStoredSession(page);
  });
}

test('expired in-memory session asks for resend without refresh or another API call', async ({ page }) => {
  const calls = await mocks(page);
  await page.clock.install();
  await page.route('https://api.example.test/v1/join', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(joinLink);
  await page.getByRole('button').click();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeEnabled();
  await page.clock.fastForward(3601 * 1000);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('status')).toContainText('verification has expired');
  await expect(page.getByRole('button')).toBeHidden();
  expect(calls.verify).toBe(1);
  expect(calls.other).toEqual([]);
  await noStoredSession(page);
});

test('successful join clears retry capability and reload retains no session', async ({ page }) => {
  const calls = await mocks(page);
  await page.goto(joinLink);
  await page.getByRole('button').click();
  await expect(page.getByRole('status')).toHaveText("You're in TBD.");
  await page.reload();
  await expect(page.getByRole('status')).toContainText('resend');
  expect(calls).toEqual({ verify: 1, join: 1, other: [] });
  await noStoredSession(page);
});
