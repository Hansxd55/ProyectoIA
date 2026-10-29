import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT || 3000)
const functionBase = (process.env.AZURE_FUNCTION_BASE_URL || '').replace(/\/+$/, '')
const functionKey = process.env.AZURE_FUNCTION_KEY || ''
const username = process.env.APP_USERNAME || ''
const passwordHash = process.env.APP_PASSWORD_HASH || ''
const invoiceApiBase = (process.env.INVOICE_API_BASE_URL || '').replace(/\/+$/, '')
const invoiceApiUsername = process.env.INVOICE_API_USERNAME || ''
const invoiceApiPassword = process.env.INVOICE_API_PASSWORD || ''
const configurationReady = Boolean(functionBase && functionKey && username && passwordHash)
const json = (response, status, value, headers = {}) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); response.end(JSON.stringify(value)) }
const hash = (value) => createHash('sha256').update(value).digest('hex')
const sessionSecret = process.env.APP_SESSION_SECRET || passwordHash
const signSession = (payload) => createHmac('sha256', sessionSecret).update(payload).digest('hex')
const cookies = (request) => Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => { const [key, ...value] = part.trim().split('='); return [key, value.join('=')] }))
const authenticated = (request) => {
  const session = cookies(request).rc_session || ''
  const [expires, signature] = session.split('.')
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Date.now()) return false
  const expected = signSession(expires)
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
const body = async (request) => { const chunks = []; for await (const chunk of request) chunks.push(chunk); return Buffer.concat(chunks) }
const proxy = async (request, response, route) => {
  const payload = await body(request)
  const upstream = await fetch(`${functionBase}/api/${route}`, { method: 'POST', headers: { 'Content-Type': request.headers['content-type'] || 'application/json', Accept: 'application/json', 'x-functions-key': functionKey }, body: payload })
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' }); response.end(Buffer.from(await upstream.arrayBuffer()))
}
const supportOperationRoutes = {
  'cliente-consultar': 'clientes/consultar',
  'inventario-consultar': 'inventario/consultar',
  'pedido-consultar': 'pedidos/consultar',
  'pedido-crear': 'pedidos/crear',
  'ticket-consultar': 'tickets/consultar',
  'ticket-crear': 'tickets/crear',
}
const proxySupportOperation = async (request, response) => {
  const input = JSON.parse((await body(request)).toString() || '{}')
  const route = supportOperationRoutes[input.operation]
  if (!route || !input.payload || typeof input.payload !== 'object') return json(response, 400, { message: 'La operación de soporte no es válida.' })
  const upstream = await fetch(`${functionBase}/api/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-functions-key': functionKey },
    body: JSON.stringify(input.payload),
  })
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' })
  response.end(Buffer.from(await upstream.arrayBuffer()))
}
const proxyInvoice = async (request, response) => {
  if (!invoiceApiBase || !invoiceApiUsername || !invoiceApiPassword) return json(response, 503, { message: 'El servicio de facturas no está configurado.' })
  const loginResponse = await fetch(`${invoiceApiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: invoiceApiUsername, password: invoiceApiPassword }),
  })
  const loginBody = await loginResponse.json().catch(() => ({}))
  if (!loginResponse.ok || typeof loginBody.token !== 'string') return json(response, 502, { message: 'No fue posible autenticar el servicio de facturas.' })
  const payload = await body(request)
  const upstream = await fetch(`${invoiceApiBase}/api/invoices/document`, {
    method: 'POST',
    headers: {
      'Content-Type': request.headers['content-type'] || 'application/octet-stream',
      Accept: 'application/json',
      Authorization: `Bearer ${loginBody.token}`,
    },
    body: payload,
  })
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' })
  response.end(Buffer.from(await upstream.arrayBuffer()))
}
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
}
const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/health') return json(response, configurationReady && Boolean(invoiceApiBase && invoiceApiUsername && invoiceApiPassword) ? 200 : 503, { ok: configurationReady, invoice: Boolean(invoiceApiBase && invoiceApiUsername && invoiceApiPassword) })
    if (request.method === 'POST' && request.url === '/api/auth/login') {
      if (!configurationReady) return json(response, 503, { message: 'El servicio no está configurado.' })
      const input = JSON.parse((await body(request)).toString() || '{}')
      const candidate = Buffer.from(hash(input.password || ''))
      const expected = Buffer.from(passwordHash)
      const valid = candidate.length === expected.length && timingSafeEqual(candidate, expected)
      if (input.username !== username || !valid) return json(response, 401, { message: 'Usuario o contraseña incorrectos.' })
      const expires = Date.now() + 8 * 60 * 60 * 1000
      const session = `${expires}.${signSession(String(expires))}`
      return json(response, 200, { authenticated: true }, { 'Set-Cookie': `rc_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` })
    }
    if (request.method === 'POST' && request.url === '/api/auth/logout') return json(response, 200, { authenticated: false }, { 'Set-Cookie': 'rc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' })
    if (request.url?.startsWith('/api/')) {
      if (!authenticated(request)) return json(response, 401, { message: 'Sesión requerida.' })
      if (!configurationReady) return json(response, 503, { message: 'El servicio no está configurado.' })
      if (request.method === 'POST' && request.url === '/api/invoices/document') return await proxyInvoice(request, response)
      if (request.method === 'POST' && request.url === '/api/support/operation') return await proxySupportOperation(request, response)
      const routes = { '/api/ceo/resumen': 'ceo/resumen', '/api/ceo/chat': 'ceo/resumen', '/api/support/chat': 'chat', '/api/invoices/document': 'invoices/document' }
      if (request.method === 'POST' && routes[request.url]) return await proxy(request, response, routes[request.url])
      return json(response, 404, { message: 'Ruta no encontrada.' })
    }
    const requested = request.url === '/' ? '/index.html' : request.url
    const file = join(root, 'dist', requested)
    const safeFile = file.startsWith(join(root, 'dist')) && existsSync(file) ? file : join(root, 'dist', 'index.html')
    response.writeHead(200, { 'Content-Type': contentTypes[extname(safeFile)] || 'application/octet-stream' }); createReadStream(safeFile).pipe(response)
  } catch (error) { console.error(error); json(response, 502, { message: 'No fue posible completar la solicitud.' }) }
})
server.listen(port, '0.0.0.0', () => console.log(`Río Claro disponible en el puerto ${port}`))
