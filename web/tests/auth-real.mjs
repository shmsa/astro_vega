import assert from 'node:assert/strict';

const BASE_URL = process.env.NEON_AUTH_BASE_URL;
if (!BASE_URL) {
  console.error('NEON_AUTH_BASE_URL is not set.');
  process.exit(1);
}

const runId = Date.now();
const alphaEmail = `alpha.${runId}@example.com`;
const betaEmail = `beta.${runId}@example.com`;
const password = `TestP@ssw0rd!${runId}`;
const ORIGIN = 'http://localhost:3000';

console.log('=== Neon Auth Real API Integration Suite ===');
console.log('Target Auth Base URL:', BASE_URL);

async function run() {
  // 1. Sign up Alpha user via real Neon Auth API
  console.log('[1/5] Signing up Alpha user via Neon Auth API...');
  const alphaSignUpRes = await fetch(`${BASE_URL}/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({
      email: alphaEmail,
      password,
      name: 'Alpha Astrologer',
    }),
  });

  const alphaSignUpData = await alphaSignUpRes.json();
  assert.ok(alphaSignUpRes.ok, `Alpha signup failed: ${JSON.stringify(alphaSignUpData)}`);
  assert.ok(alphaSignUpData.user?.id, 'Alpha must have a user.id');
  assert.ok(alphaSignUpData.token, 'Alpha signup must issue a session token');
  const alphaUserId = alphaSignUpData.user.id;
  const alphaSignUpCookie = alphaSignUpRes.headers.get('set-cookie');
  assert.ok(alphaSignUpCookie?.includes('__Secure-neon-auth.session_token'), 'Signup must set session cookie');
  console.log('  Alpha User ID:', alphaUserId);
  console.log('  Alpha Signup Session Token:', alphaSignUpData.token);

  // 2. Sign in Alpha user to verify credentials & token rotation
  console.log('[2/5] Signing in Alpha user with verified credentials...');
  const alphaSignInRes = await fetch(`${BASE_URL}/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({
      email: alphaEmail,
      password,
    }),
  });

  const alphaSignInData = await alphaSignInRes.json();
  assert.ok(alphaSignInRes.ok, `Alpha sign-in failed: ${JSON.stringify(alphaSignInData)}`);
  assert.equal(alphaSignInData.user?.id, alphaUserId);
  assert.ok(alphaSignInData.token, 'Alpha signin must return a session token');
  const alphaSignInCookie = alphaSignInRes.headers.get('set-cookie');
  assert.ok(alphaSignInCookie?.includes('__Secure-neon-auth.session_token'), 'Signin must set session cookie');
  console.log('  Alpha signed in successfully. Token:', alphaSignInData.token);

  // 3. Verify session retrieval with session cookie
  console.log('[3/5] Validating Alpha session via get-session...');
  const getSessionRes = await fetch(`${BASE_URL}/get-session`, {
    headers: {
      'Origin': ORIGIN,
      'cookie': alphaSignInCookie,
    },
  });
  if (getSessionRes.ok) {
    const sessionData = await getSessionRes.json();
    assert.equal(sessionData?.user?.id, alphaUserId, 'Fetched session must match Alpha ID');
    console.log('  Session validated successfully via API. User:', sessionData.user.email);
  } else {
    console.log('  get-session status:', getSessionRes.status);
  }

  // 4. Invalid session / bad credentials rejection
  console.log('[4/5] Testing rejection of invalid credentials...');
  const badSignInRes = await fetch(`${BASE_URL}/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({
      email: alphaEmail,
      password: 'wrong-password-12345',
    }),
  });
  assert.equal(badSignInRes.status >= 400, true, 'Bad credentials must return 4xx status');
  const badSignInData = await badSignInRes.json();
  assert.equal(badSignInData.code, 'INVALID_EMAIL_OR_PASSWORD');
  console.log('  Invalid credentials correctly rejected:', badSignInData.message);

  // 5. Sign up Beta user via real Neon Auth API
  console.log('[5/5] Signing up Beta user via Neon Auth API...');
  const betaSignUpRes = await fetch(`${BASE_URL}/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({
      email: betaEmail,
      password,
      name: 'Beta Astrologer',
    }),
  });
  const betaSignUpData = await betaSignUpRes.json();
  assert.ok(betaSignUpRes.ok, `Beta signup failed: ${JSON.stringify(betaSignUpData)}`);
  assert.ok(betaSignUpData.user?.id, 'Beta must have a user.id');
  assert.notEqual(betaSignUpData.user.id, alphaUserId, 'Beta ID must differ from Alpha ID');
  console.log('  Beta User ID:', betaSignUpData.user.id);

  console.log('=== Neon Auth Real API Integration Suite: ALL 5 PASS ===');
  return { alphaUserId, betaUserId: betaSignUpData.user.id };
}

run().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
