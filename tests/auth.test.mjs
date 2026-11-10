import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

const now = Math.floor(Date.now() / 1000)
const makeToken = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
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
  })
  pinia = await server.ssrLoadModule('pinia')
  ;({ useAuthStore } = await server.ssrLoadModule('/src/stores/auth.ts'))
  utils = await server.ssrLoadModule('/src/utils/jwt.ts')
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

test('没有保存的登录态时保持未登录', () => {
  const auth = useAuthStore()
  assert.equal(auth.token, '')
  assert.equal(auth.isLoggedIn, false)
})

test('保留有效的已保存 token，过期 token 被清除', () => {
  storage.set('recipe_token', personalToken)
  assert.equal(useAuthStore().token, personalToken)
  pinia.setActivePinia(pinia.createPinia())
  storage.set('recipe_token', makeToken({ exp: now - 1 }))
  assert.equal(useAuthStore().token, '')
  assert.equal(storage.has('recipe_token'), false)
})

test('退出登录会清空本地状态并通知后端吊销 token', () => {
  const auth = useAuthStore()
  auth.logout()
  assert.equal(calls.length, 0)
  auth.setToken(personalToken)
  assert.equal(storage.get('recipe_token'), personalToken)
  auth.logout()
  assert.equal(auth.isLoggedIn, false)
  assert.equal(storage.has('recipe_token'), false)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][1].headers.Authorization, `Bearer ${personalToken}`)
})

test('损坏、过期或缺少 exp 的 token 视为已过期', () => {
  for (const token of ['', 'broken', makeToken({ sub: '7' }), makeToken({ exp: now - 1 })]) {
    assert.equal(utils.isTokenUnexpired(token), false)
  }
  assert.equal(utils.isTokenUnexpired(personalToken), true)
})
