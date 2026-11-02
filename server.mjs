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
// Brujeria: los nombres de agente se envían desde el cliente al servicio de informes.
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
const normalizeText = (value) => String(value || '').trim().toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const catalogValue = (value, aliases, fallback) => aliases[normalizeText(value)] || fallback
const normalizeSupportPayload = (operation, payload) => {
  if (operation === 'pedido-crear') {
    return {
      ...payload,
      cliente_id: String(payload.cliente_id || '').trim(),
      items: Array.isArray(payload.items)
        ? payload.items.map((item) => ({
          ...item,
          sku: String(item.sku || '').trim().toUpperCase(),
          cantidad: Number(item.cantidad),
        }))
        : payload.items,
    }
  }
  if (operation === 'ticket-crear') {
    const type = catalogValue(payload.tipo, {
      reclamacion: 'Reclamacion',
      reclamo: 'Reclamacion',
      queja: 'Reclamacion',
      incidente: 'Incidencia',
      incidencia: 'Incidencia',
      soporte: 'Soporte',
      consulta: 'Consulta',
      servicio: 'Servicio',
    }, 'Soporte')
    const priority = catalogValue(payload.prioridad, {
      baja: 'Baja',
      normal: 'Media',
      media: 'Media',
      alta: 'Alta',
      critica: 'Critica',
      urgente: 'Critica',
    }, 'Media')
    return {
      ...payload,
      cliente_id: String(payload.cliente_id || '').trim().toUpperCase(),
      relacionado_id: payload.relacionado_id ? String(payload.relacionado_id).trim().toUpperCase() : null,
      tipo: type,
      categoria: String(payload.categoria || type).trim(),
      prioridad: priority,
      descripcion: String(payload.descripcion || '').trim(),
    }
  }
  return payload
}
const proxySupportOperation = async (request, response) => {
  const input = JSON.parse((await body(request)).toString() || '{}')
  const route = supportOperationRoutes[input.operation]
  if (!route || !input.payload || typeof input.payload !== 'object') return json(response, 400, { message: 'La operación de soporte no es válida.' })
  const normalizedPayload = normalizeSupportPayload(input.operation, input.payload)
  const upstream = await fetch(`${functionBase}/api/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-functions-key': functionKey },
    body: JSON.stringify(normalizedPayload),
  })
  const responseBuffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') || 'application/json'
  response.writeHead(upstream.status, { 'Content-Type': contentType })
  response.end(responseBuffer)
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

const proxyInvoiceList = async (request, response) => {
  if (!invoiceApiBase || !invoiceApiUsername || !invoiceApiPassword) {
    return json(response, 503, {
      message: 'El servicio de facturas no está configurado.',
    })
  }

  const loginResponse = await fetch(`${invoiceApiBase}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: invoiceApiUsername,
      password: invoiceApiPassword,
    }),
  })

  const loginBody = await loginResponse.json().catch(() => ({}))

  if (!loginResponse.ok || typeof loginBody.token !== 'string') {
    return json(response, 502, {
      message: 'No fue posible autenticar el servicio de facturas.',
    })
  }

  const localUrl = new URL(
    request.url || '/api/invoices',
    'http://localhost',
  )

  const upstreamUrl =
    `${invoiceApiBase}/api/invoices${localUrl.search}`

  const upstream = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${loginBody.token}`,
    },
  })

  response.writeHead(upstream.status, {
    'Content-Type':
      upstream.headers.get('content-type') || 'application/json',
  })

  response.end(
    Buffer.from(await upstream.arrayBuffer()),
  )
}

const fetchInvoiceSummary = async (from, to) => {
  if (!invoiceApiBase || !invoiceApiUsername || !invoiceApiPassword) return null
  const loginResponse = await fetch(`${invoiceApiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: invoiceApiUsername, password: invoiceApiPassword }),
  })
  const loginBody = await loginResponse.json().catch(() => ({}))
  if (!loginResponse.ok || typeof loginBody.token !== 'string') return null
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const upstream = await fetch(`${invoiceApiBase}/api/invoices/summary?${params.toString()}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${loginBody.token}` },
  })
  if (upstream.ok) return upstream.json().catch(() => null)

  const listResponse = await fetch(`${invoiceApiBase}/api/invoices?per_page=1000`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${loginBody.token}` },
  })
  if (!listResponse.ok) return null
  const listBody = await listResponse.json().catch(() => ({}))
  const rows = Array.isArray(listBody.data) ? listBody.data : []
  const today = new Date()
  const periodEnd = to || today.toISOString().slice(0, 10)
  const periodStart = from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const start = new Date(`${periodStart}T00:00:00Z`)
  const end = new Date(`${periodEnd}T23:59:59Z`)
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
  const previousEnd = new Date(start.getTime() - 86400000)
  const previousStart = new Date(previousEnd.getTime() - (days - 1) * 86400000)
  const aggregate = (rangeStart, rangeEnd) => {
    const selected = rows.filter((row) => {
      const issuedAt = new Date(`${String(row.issued_at || '').slice(0, 10)}T12:00:00Z`)
      return !Number.isNaN(issuedAt.getTime()) && issuedAt >= rangeStart && issuedAt <= rangeEnd
    })
    const group = (field, fallback) => Object.entries(selected.reduce((result, row) => {
      const key = row[field] || fallback
      result[key] = (result[key] || 0) + 1
      return result
    }, {})).map(([estado, total]) => ({ estado, total }))
    return {
      total_emitidas: selected.length,
      importe_facturado: selected.reduce((total, row) => total + Number(row.total || 0), 0),
      por_moneda: group('currency', 'SIN_MONEDA'),
      por_estado: group('processing_status', 'SIN_ESTADO'),
      por_pago: group('payment_status', 'SIN_ESTADO'),
    }
  }
  return {
    periodo: { fecha_inicio: periodStart, fecha_fin: periodEnd },
    facturas: aggregate(start, end),
    comparativo: aggregate(previousStart, previousEnd),
  }
}

const proxyCeo = async (request, response) => {
  const payload = JSON.parse((await body(request)).toString() || '{}')
  const invoiceSummary = await fetchInvoiceSummary(payload.fecha_inicio, payload.fecha_fin)
  const enrichedPayload = invoiceSummary
    ? {
      ...payload,
      contexto_operativo: {
        ...(payload.contexto_operativo || {}),
        facturas: invoiceSummary,
      },
      incluir: Array.from(new Set([...(payload.incluir || []), 'facturas'])),
    }
    : payload
  const upstream = await fetch(`${functionBase}/api/ceo/resumen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-functions-key': functionKey },
    body: JSON.stringify(enrichedPayload),
  })
  const upstreamBody = await upstream.json().catch(() => ({}))
  if (invoiceSummary && upstreamBody && typeof upstreamBody === 'object') {
    upstreamBody.datos = {
      ...(upstreamBody.datos || {}),
      facturas: invoiceSummary.facturas,
    }
    upstreamBody.comparativos = {
      ...(upstreamBody.comparativos || {}),
      facturas: invoiceSummary.comparativo,
    }
  }
  response.writeHead(upstream.status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(upstreamBody))
}

const proxyInvoiceDelete = async (request, response, invoiceId) => {
  if (!invoiceApiBase || !invoiceApiUsername || !invoiceApiPassword) {
    return json(response, 503, {
      message: 'El servicio de facturas no está configurado.',
    })
  }

  const loginResponse = await fetch(`${invoiceApiBase}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: invoiceApiUsername,
      password: invoiceApiPassword,
    }),
  })

  const loginBody = await loginResponse.json().catch(() => ({}))

  if (!loginResponse.ok || typeof loginBody.token !== 'string') {
    return json(response, 502, {
      message: 'No fue posible autenticar el servicio de facturas.',
    })
  }

  const upstream = await fetch(
    `${invoiceApiBase}/api/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${loginBody.token}`,
      },
    },
  )

  const responseBuffer = Buffer.from(await upstream.arrayBuffer())

  response.writeHead(upstream.status, {
    'Content-Type':
      upstream.headers.get('content-type') || 'application/json',
  })

  response.end(responseBuffer)
}

const proxyInvoiceReview = async (request, response, invoiceId) => {
  if (!invoiceApiBase || !invoiceApiUsername || !invoiceApiPassword) {
    return json(response, 503, { message: 'El servicio de facturas no está configurado.' })
  }

  const loginResponse = await fetch(`${invoiceApiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: invoiceApiUsername,
      password: invoiceApiPassword,
    }),
  })

  const loginBody = await loginResponse.json().catch(() => ({}))

  if (!loginResponse.ok || typeof loginBody.token !== 'string') {
    return json(response, 502, {
      message: 'No fue posible autenticar el servicio de facturas.',
    })
  }

  const payload = await body(request)

  const upstream = await fetch(
    `${invoiceApiBase}/api/invoices/${encodeURIComponent(invoiceId)}/review`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${loginBody.token}`,
      },
      body: payload,
    },
  )

  response.writeHead(upstream.status, {
    'Content-Type':
      upstream.headers.get('content-type') || 'application/json',
  })

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

      const requestUrl = new URL(
        request.url || '/',
        'http://localhost',
      )

      if (
        request.method === 'GET' &&
        requestUrl.pathname === '/api/invoices'
      ) {
        return await proxyInvoiceList(request, response)
      }

      const invoiceReviewMatch = request.url?.match(/^\/api\/invoices\/(\d+)\/review$/)
      if (request.method === 'PATCH' && invoiceReviewMatch) {
        return await proxyInvoiceReview(request, response, invoiceReviewMatch[1])
      }

      const invoiceDeleteMatch = request.url?.match(/^\/api\/invoices\/(\d+)$/)
      if (request.method === 'DELETE' && invoiceDeleteMatch) {
        return await proxyInvoiceDelete(request, response, invoiceDeleteMatch[1])
      }

      if (request.method === 'POST' && request.url === '/api/support/operation') return await proxySupportOperation(request, response)
      if (request.method === 'POST' && (request.url === '/api/ceo/resumen' || request.url === '/api/ceo/chat')) return await proxyCeo(request, response)
      const routes = { '/api/support/chat': 'chat', '/api/invoices/document': 'invoices/document' }
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
