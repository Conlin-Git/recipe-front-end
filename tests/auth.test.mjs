import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const now = Math.floor(Date.now() / 1000)
const makeToken = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
const reviewToken = makeToken({ sub: '42', scope: 'filing-review', iat: now, exp: now + 30 * 86400 })
const personalToken = makeToken({ sub: '7', exp: now + 86400 })
let server, pinia, useAuthStore, utils
let calls = []
const storage = new Map()
const originalStorage = globalThis.localStorage
const originalFetch = globalThis.fetch

before(async () => {
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  globalThis.fetch = async (...args) => { calls.push(args); return new Response(null, { status: 204 }) }
  server = await createServer({
    configFile: false,
    envDir: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    define: { 'import.meta.env.VITE_FILING_REVIEW_TOKEN': JSON.stringify(reviewToken) },
  })
  pinia = await server.ssrLoadModule('pinia')
  ;({ useAuthStore } = await server.ssrLoadModule('/src/stores/auth.ts'))
  utils = await server.ssrLoadModule('/src/utils/filingReview.ts')
})

beforeEach(() => {
  storage.clear()
  calls = []
  pinia.setActivePinia(pinia.createPinia())
})

after(async () => {
  await server?.close()
  if (originalStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = originalStorage
  globalThis.fetch = originalFetch
})

test('无个人登录态时自动进入审核态，凭证不落 localStorage', () => {
  const auth = useAuthStore()
  assert.equal(auth.token, reviewToken)
  assert.equal(auth.isLoggedIn, true)
  assert.equal(auth.isReviewSession, true)
  assert.equal(storage.has('recipe_token'), false)
})

test('优先保留有效个人账号，过期个人账号回退审核态', () => {
  storage.set('recipe_token', personalToken)
  const auth = useAuthStore()
  assert.equal(auth.token, personalToken)
  assert.equal(auth.isReviewSession, false)
  pinia.setActivePinia(pinia.createPinia())
  storage.set('recipe_token', makeToken({ exp: now - 1 }))
  assert.equal(useAuthStore().token, reviewToken)
})

test('审核态 401 清理不吊销共享凭证，个人退出仍调用后端吊销', () => {
  const auth = useAuthStore()
  auth.logout()
  assert.equal(auth.isLoggedIn, false)
  assert.equal(calls.length, 0)
  auth.setToken(personalToken)
  auth.logout()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][1].headers.Authorization, `Bearer ${personalToken}`)
})

test('个人态失效后可显式回退审核态', () => {
  const auth = useAuthStore()
  auth.setToken(personalToken)
  auth.logout()
  assert.equal(auth.useReviewSession(), true)
  assert.equal(auth.token, reviewToken)
  assert.equal(storage.has('recipe_token'), false)
})

test('空配置、损坏、过期、普通和超过30天的凭证不能用作内置审核态', () => {
  const invalid = [
    '', 'broken', personalToken,
    makeToken({ scope: 'filing-review', iat: now - 86400, exp: now - 1 }),
    makeToken({ scope: 'filing-review', iat: now, exp: now + 31 * 86400 }),
    makeToken({ scope: 'filing-review', exp: now + 86400 }),
  ]
  for (const token of invalid) assert.equal(utils.getFilingReviewToken(token), '')
  assert.equal(utils.getFilingReviewToken(reviewToken, (now + 30 * 86400) * 1000), '')
})
