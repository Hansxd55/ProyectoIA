import { useState } from 'react'
import type { FormEvent } from 'react'
import { consultarCEO, consultarCEOQuery, ejecutarOperacionSoporte, enviarFactura, enviarSoporte, iniciarSesion } from './api'

type Module = 'home' | 'facturas' | 'clientes' | 'ceo'

const modules: Array<{ id: Exclude<Module, 'home'>; title: string; description: string; action: string }> = [
  { id: 'facturas', title: 'Proceso de facturas', description: 'Carga una factura para validarla y extraer sus datos con IA.', action: 'Abrir facturas' },
  { id: 'clientes', title: 'Ayuda a Clientes', description: 'Consulta al asistente para resolver dudas sobre pedidos, facturas y tickets.', action: 'Abrir soporte' },
  { id: 'ceo', title: 'Informes CEO', description: 'Consulta indicadores ejecutivos de ventas, pedidos, facturas, inventario, tickets y clientes.', action: 'Abrir informes' },
]

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [module, setModule] = useState<Module>('home')
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (!authenticated) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={async (event) => {
          event.preventDefault()
          setLoginError('')
          try {
            await iniciarSesion(username, password)
            setAuthenticated(true)
          } catch (error) {
            setLoginError(error instanceof Error ? error.message : 'No fue posible iniciar sesión.')
          }
        }}>
          <img className="brand-logo auth-logo" src="/rio-claro-logo.png" alt="Río Claro" />
          <p className="eyebrow">CENTRO OPERATIVO</p>
          <h1>Bienvenido</h1>
          <p className="muted">Ingresa tus credenciales para acceder a las herramientas de negocio.</p>
          <label>Usuario<input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          <label>Contraseña<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          {loginError && <p className="error">{loginError}</p>}
          <button className="primary-button" type="submit">Entrar al centro operativo</button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => setModule('home')}><img className="brand-logo top-logo" src="/rio-claro-logo.png" alt="Río Claro" /></button>
        <button className="logout-button" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setAuthenticated(false); setModule('home') }}>Cerrar sesión</button>
      </header>
      {module === 'home' ? <Home onSelect={setModule} /> : (
        <section className="module-page">
          <button className="back-button" onClick={() => setModule('home')}>← Volver al inicio</button>
          {module === 'facturas' && <InvoiceModule />}
          {module === 'clientes' && <SupportModule />}
          {module === 'ceo' && <CeoModule />}
        </section>
      )}
    </main>
  )
}

function Home({ onSelect }: { onSelect: (module: Module) => void }) {
  return <section className="home">
    <p className="eyebrow">CENTRO OPERATIVO</p>
    <h1>¿Qué necesitas hacer hoy?</h1>
    <p className="lead">Selecciona una herramienta para comenzar.</p>
    <div className="module-grid">{modules.map((item, index) => <article className="module-card" key={item.id}>
      <span className="module-number">0{index + 1}</span><h2>{item.title}</h2><p>{item.description}</p>
      <button className="secondary-button" onClick={() => onSelect(item.id)}>{item.action} <span>→</span></button>
    </article>)}</div>
  </section>
}

function InvoiceModule() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  return <div className="content-card"><p className="eyebrow">PROCESO DE FACTURAS</p><h1>Procesa una factura</h1><p className="muted">Carga un PDF o imagen para enviarlo al servicio de análisis.</p>
    <label className="upload-box">Seleccionar archivo<input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><strong>{file?.name ?? 'PDF, PNG o JPG'}</strong></label>
    <button className="primary-button" disabled={!file} onClick={async () => { if (!file) return; setMessage('Procesando...'); try { const result = await enviarFactura(file); setMessage(result.message ?? 'Factura enviada correctamente.') } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible procesar la factura.') } }}>{message === 'Procesando...' ? 'Procesando...' : 'Enviar a procesar'}</button>
    {message && <p className={message === 'Procesando...' ? 'status-text' : message.includes('correctamente') ? 'success' : 'error'}>{message}</p>}
  </div>
}

function SupportModule() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([{ role: 'assistant', text: 'Hola, soy el asistente de Río Claro. ¿En qué puedo ayudarte?' }])
  const [flow, setFlow] = useState<SupportFlow>({ kind: 'idle' })
  const [sessionId, setSessionId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', text }])
    setBusy(true)
    try {
      const next = await handleSupportInput(text, flow, sessionId)
      setFlow(next.flow)
      if (next.sessionId) setSessionId(next.sessionId)
      if (next.reply) setMessages((current) => [...current, { role: 'assistant', text: next.reply }])
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'No fue posible completar la operación.' }])
    } finally { setBusy(false) }
  }
  return <div className="content-card"><div className="section-heading"><div><p className="eyebrow">AYUDA A CLIENTES</p><h1>Asistente de soporte</h1></div><button className="secondary-button new-chat-button" type="button" onClick={() => { setMessages([{ role: 'assistant', text: 'Nuevo chat iniciado. ¿En qué puedo ayudarte?' }]); setFlow({ kind: 'idle' }); setSessionId(undefined); setQuestion('') }}>Nuevo chat</button></div><div className="conversation-box">{messages.map((item, index) => <p className={item.role === 'user' ? 'chat-user' : 'chat-assistant'} key={`${item.role}-${index}`}>{cleanAssistantText(item.text)}</p>)}</div><form className="support-form" onSubmit={submit}><input required value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Consulta, crea un pedido o levanta un ticket..." /><button className="primary-button" disabled={busy}>{busy ? 'Procesando...' : 'Consultar'}</button></form></div>
}

type SupportFlow =
  | { kind: 'idle' }
  | { kind: 'order-customer'; intent: 'query' | 'create' }
  | { kind: 'new-customer'; customer: Record<string, unknown>; field: NewCustomerField }
  | { kind: 'order-item'; customer: Record<string, unknown> }
  | { kind: 'product-choice'; customer: Record<string, unknown>; quantity: number; products: Array<Record<string, unknown>> }
  | { kind: 'ticket-customer'; type: string }
  | { kind: 'ticket-type'; customerId: string }
  | { kind: 'ticket-description'; customerId: string; type: string }

type NewCustomerField = 'razon_social' | 'segmento' | 'nivel_servicio' | 'condiciones_pago' | 'correo' | 'sucursal_responsable'

async function handleSupportInput(text: string, flow: SupportFlow, sessionId?: string): Promise<{ flow: SupportFlow; reply: string; sessionId?: string }> {
  const normalized = text.toLocaleLowerCase('es-MX')
  if (flow.kind === 'idle') {
    if (/(crear|levantar|registrar).*(pedido)|pedido.*(crear|levantar)/i.test(normalized)) return { flow: { kind: 'order-customer', intent: 'create' }, reply: 'Para crear el pedido, indica el ClienteID existente o escribe **nuevo** para registrar al cliente.' }
    if (/(crear|levantar|registrar).*(ticket|incidencia|reporte)|ticket.*(crear|levantar)/i.test(normalized)) return { flow: { kind: 'ticket-customer', type: normalized.includes('incidencia') ? 'Soporte' : normalized.includes('reporte') ? 'Consulta' : 'Soporte' }, reply: 'Para levantar el ticket, indica el ClienteID. Después solicitaré el tipo, descripción, categoría y prioridad.' }
    if (/(revisar|consultar|estado|seguimiento|rastrear|d[oó]nde).*(pedido)|pedido.*(revisar|consultar|estado|seguimiento|rastrear)/i.test(normalized)) {
      const [customerId, orderId] = text.split('|').map((part) => part.trim())
      const naturalOrderId = text.match(/\bPED-[A-Z0-9-]+\b/i)?.[0]
      const naturalCustomerId = text.match(/\bCLI[-_ ]?[A-Z0-9-]+\b/i)?.[0]
      if (naturalCustomerId && naturalOrderId) {
        return { flow: { kind: 'idle' }, reply: formatOperation(await ejecutarOperacionSoporte('pedido-consultar', { cliente_id: naturalCustomerId, pedido_id: naturalOrderId })) }
      }
      if (customerId && orderId?.toUpperCase().startsWith('PED-')) {
        return { flow: { kind: 'idle' }, reply: formatOperation(await ejecutarOperacionSoporte('pedido-consultar', { cliente_id: customerId, pedido_id: orderId })) }
      }
      return { flow: { kind: 'order-customer', intent: 'query' }, reply: 'Para revisar el pedido, escribe ClienteID y después PedidoID. Puedes usar: CLI-0001 | PED-1001.' }
    }
    if (/^(pedido|pedidos)$/i.test(normalized)) return { flow: { kind: 'order-customer', intent: 'query' }, reply: '¿Quieres consultar un pedido existente o crear uno nuevo? Para consultar, escribe el ClienteID y el PedidoID; por ejemplo: CLI-0001 | PED-1001.' }
    if (/(revisar|consultar|estado|seguimiento).*(ticket)|ticket.*(revisar|consultar|estado|seguimiento)/i.test(normalized)) {
      return { flow: { kind: 'ticket-customer', type: 'consulta' }, reply: 'Para revisar el ticket, escribe: ClienteID | TicketID (por ejemplo, CLI-0001 | TIC-1001).' }
    }
    const orderId = text.match(/\bPED-[A-Z0-9-]+\b/i)?.[0]
    if (orderId) return { flow: { kind: 'order-customer', intent: 'query' }, reply: `Para consultar ${orderId}, indica también el ClienteID.` }
    const ticketId = text.match(/\bTIC-[A-Z0-9-]+\b/i)?.[0]
    if (ticketId) return { flow: { kind: 'ticket-customer', type: 'consulta' }, reply: `Para consultar ${ticketId}, indica también el ClienteID.` }
    if (normalized.includes('inventario') || normalized.includes('existencia')) {
      const sku = text.match(/\b[A-Z]{2,5}-\d{3,}\b/i)?.[0]
      return { flow, reply: formatOperation(await ejecutarOperacionSoporte('inventario-consultar', sku ? { sku } : { producto: text })) }
    }
    const result = await enviarSoporte(text, sessionId)
    return {
      flow,
      reply: result.response ?? result.message ?? 'No recibí una respuesta del asistente de soporte.',
      sessionId: result.session_id,
    }
  }
  if (flow.kind === 'order-customer') {
    if (flow.intent === 'create' && normalized === 'nuevo') return { flow: { kind: 'new-customer', customer: {}, field: 'razon_social' }, reply: 'Vamos a registrar al cliente. Escribe la razón social.' }
    const orderId = text.match(/\bPED-[A-Z0-9-]+\b/i)?.[0]
    if (orderId && flow.intent === 'query') {
      const customerId = text.match(/\bCLI[-_ ]?[A-Z0-9-]+\b/i)?.[0] ?? text.replace(orderId, '').replace(/[|,]/g, ' ').trim()
      if (customerId) return { flow: { kind: 'idle' }, reply: formatOperation(await ejecutarOperacionSoporte('pedido-consultar', { cliente_id: customerId, pedido_id: orderId })) }
      return { flow, reply: `Para consultar ${orderId}, indica también el ClienteID.` }
    }
    const [customerId, pedidoId] = text.split('|').map((part) => part.trim())
    if (flow.intent === 'query') {
      if (pedidoId?.toUpperCase().startsWith('PED-')) return { flow: { kind: 'idle' }, reply: formatOperation(await ejecutarOperacionSoporte('pedido-consultar', { cliente_id: customerId, pedido_id: pedidoId })) }
      if (/^(cli|cliente)[-_ ]?\w+$/i.test(text)) return { flow, reply: `Recibí el ClienteID ${text}. Ahora indica el PedidoID, por ejemplo PED-1001.` }
      return { flow, reply: 'No identifiqué el PedidoID. Escribe el ClienteID y PedidoID, por ejemplo: CLI-0001 | PED-1001.' }
    }
    return { flow: { kind: 'order-item', customer: { cliente_id: text } }, reply: 'Indica el nombre o SKU del producto y la cantidad con este formato: producto | cantidad.' }
  }
  if (flow.kind === 'new-customer') {
    const customer = { ...flow.customer, [flow.field]: text }
    const nextFields: Record<NewCustomerField, { field?: NewCustomerField; reply: string }> = {
      razon_social: { field: 'segmento', reply: 'Indica el segmento del cliente. Puedes escribir cualquier valor.' },
      segmento: { field: 'nivel_servicio', reply: 'Selecciona el nivel de servicio: Básico, Estándar o Premium.' },
      nivel_servicio: { field: 'condiciones_pago', reply: 'Selecciona las condiciones de pago: Contado, 15 días, 30 días o 60 días.' },
      condiciones_pago: { field: 'correo', reply: 'Indica el correo electrónico del cliente.' },
      correo: { field: 'sucursal_responsable', reply: 'Selecciona la sucursal responsable: CDMX o Queretaro.' },
      sucursal_responsable: { reply: 'Cliente listo. Ahora indica el producto o SKU y cantidad: producto | cantidad.' },
    }
    const next = nextFields[flow.field]
    if (!next.field) return { flow: { kind: 'order-item', customer: { nuevo_cliente: customer } }, reply: next.reply }
    return { flow: { kind: 'new-customer', customer, field: next.field }, reply: next.reply }
  }
  if (flow.kind === 'order-item') {
    const [productText, quantityText] = text.split('|').map((value) => value.trim())
    const quantity = Number(quantityText)
    if (!productText || !Number.isInteger(quantity) || quantity < 1) return { flow, reply: 'Formato inválido. Usa nombre o SKU | cantidad, por ejemplo Sanitizante de 10 litros | 20.' }
    let inventory = await ejecutarOperacionSoporte('inventario-consultar', /\b[A-Z]{2,5}-\d{3,}\b/i.test(productText) ? { sku: productText } : { producto: productText })
    let products = Array.isArray(inventory.productos) ? inventory.productos as Array<Record<string, unknown>> : []
    if (!products.length && !/\b[A-Z]{2,5}-\d{3,}\b/i.test(productText)) {
      const keyword = productText.split(/\s+/).find((word) => word.length >= 5)
      if (keyword && keyword.toLocaleLowerCase('es-MX') !== productText.toLocaleLowerCase('es-MX')) {
        inventory = await ejecutarOperacionSoporte('inventario-consultar', { producto: keyword })
        products = Array.isArray(inventory.productos) ? inventory.productos as Array<Record<string, unknown>> : []
      }
    }
    if (!products.length) return { flow, reply: 'No encontré ese producto en Azure SQL. Revisa el nombre o solicita una consulta de inventario.' }
    if (products.length > 1) return { flow: { kind: 'product-choice', customer: flow.customer, quantity, products }, reply: `Encontré varias coincidencias. Responde con el número del producto:\n${products.map((product, index) => `${index + 1}. ${product.Producto} (${product.SKU}) — disponible: ${product.Disponible}`).join('\n')}` }
    const result = await ejecutarOperacionSoporte('pedido-crear', { ...flow.customer, items: [{ sku: products[0].SKU, cantidad: quantity }], fecha_comprometida: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
    return { flow: { kind: 'idle' }, reply: formatOperation(result) }
  }
  if (flow.kind === 'product-choice') {
    const selected = flow.products[Number(text) - 1]
    if (!selected) return { flow, reply: `Selecciona un número del 1 al ${flow.products.length}.` }
    const result = await ejecutarOperacionSoporte('pedido-crear', { ...flow.customer, items: [{ sku: selected.SKU, cantidad: flow.quantity }], fecha_comprometida: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
    return { flow: { kind: 'idle' }, reply: formatOperation(result) }
  }
  if (flow.kind === 'ticket-customer') {
    const ticketId = text.match(/\bTIC-[A-Z0-9-]+\b/i)?.[0]
    if (ticketId) return { flow: { kind: 'idle' }, reply: 'Para consultar el ticket, escribe: ClienteID | TicketID.' }
    const [customerId, id] = text.split('|').map((part) => part.trim())
    if (id?.toUpperCase().startsWith('TIC-')) return { flow: { kind: 'idle' }, reply: formatOperation(await ejecutarOperacionSoporte('ticket-consultar', { cliente_id: customerId, ticket_id: id })) }
    const customer = await ejecutarOperacionSoporte('cliente-consultar', { cliente_id: text })
    if (!customer.found) return { flow, reply: 'No encontré ese ClienteID en Azure SQL. Verifica el identificador e inténtalo de nuevo.' }
    return { flow: { kind: 'ticket-type', customerId: text }, reply: 'Indica el tipo de ticket: Soporte, Incidencia, Reclamación o Consulta.' }
  }
  if (flow.kind === 'ticket-type') return { flow: { kind: 'ticket-description', customerId: flow.customerId, type: normalized.includes('incidencia') ? 'Soporte' : normalized.includes('reclam') ? 'Reclamacion' : normalized.includes('consulta') ? 'Consulta' : 'Soporte' }, reply: 'Describe el problema y agrega la prioridad al final: descripción | baja, media, alta o critica.' }
  const [description, priority = 'media'] = text.split('|').map((part) => part.trim())
  const result = await ejecutarOperacionSoporte('ticket-crear', { cliente_id: flow.customerId, tipo: flow.type, categoria: flow.type, prioridad: priority, descripcion: description })
  return { flow: { kind: 'idle' }, reply: formatOperation(result) }
}

function formatOperation(result: Record<string, unknown>) {
  if (result.success === false) throw new Error(typeof result.message === 'string' ? result.message : 'La operación no pudo completarse.')
  const entity = result.pedido ?? result.ticket ?? result.clientes ?? result.productos
  if (Array.isArray(entity)) return entity.length ? `Encontré ${entity.length} registro(s) en Azure SQL:\n\n${entity.map((item) => Object.entries(item as Record<string, unknown>).filter(([key]) => !['Synthetic', 'ClasificacionDato'].includes(key)).map(([key, value]) => `- ${key}: ${value ?? 'sin dato'}`).join('\n')).join('\n\n')}` : 'No encontré registros con esos datos.'
  if (entity && typeof entity === 'object') return `Operación completada correctamente.\n\n${Object.entries(entity as Record<string, unknown>).filter(([key]) => !['Synthetic', 'ClasificacionDato'].includes(key)).slice(0, 12).map(([key, value]) => `- ${key}: ${value ?? 'sin dato'}`).join('\n')}`
  return typeof result.message === 'string' ? result.message : 'Operación completada correctamente.'
}

function cleanAssistantText(text: string) {
  return text.replace(/【[^】]*】/g, '').replace(/cite[^]*/g, '').trim()
}

function CeoModule() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([])
  const [busy, setBusy] = useState(false)
  const [pendingDomain, setPendingDomain] = useState<string>()
  const load = async () => { setError(''); try { setReport(await consultarCEO()) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible consultar el informe.') } }
  const executiveText = report ? `Resumen ejecutivo del periodo ${String((report.periodo as Record<string, unknown> | undefined)?.fecha_inicio ?? '')} al ${String((report.periodo as Record<string, unknown> | undefined)?.fecha_fin ?? '')}.\n\n${summarizeReport(report)}` : ''
  const ask = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', text }])
    const domain = pendingDomain ?? detectCeoDomain(text)
    if (!domain) {
      setMessages((current) => [...current, { role: 'assistant', text: 'Puedo consultar ventas, pedidos, facturas, inventario, tickets o clientes. ¿Qué indicador necesitas revisar?' }])
      return
    }
    const range = parseDateRange(text)
    if (!range) {
      setPendingDomain(domain)
      setMessages((current) => [...current, { role: 'assistant', text: `Para revisar **${domain}** necesito un **rango de fechas**.\n\nSi quieres, dime algo como:\n- **hoy**\n- **esta semana**\n- **este mes**\n- **del 1 al 28 de octubre de 2026**\n\nCon eso te preparo un resumen ejecutivo.` }])
      return
    }
    setBusy(true)
    try {
      const result = await consultarCEOQuery(domain, range.start, range.end)
      setPendingDomain(undefined)
      setMessages((current) => [...current, { role: 'assistant', text: formatCeoAnswer(result, domain) }])
    } catch (reason) {
      setMessages((current) => [...current, { role: 'assistant', text: reason instanceof Error ? reason.message : 'No fue posible consultar el informe CEO.' }])
    } finally { setBusy(false) }
  }
  return <div className="content-card"><div className="section-heading"><div><p className="eyebrow">INFORMES CEO</p><h1>Panorama ejecutivo</h1></div><button className="primary-button" onClick={load} disabled={busy}>{busy ? 'Consultando...' : 'Actualizar informe'}</button></div>{error && <p className="error">{error}</p>}{report && <div className="executive-report">{executiveText}</div>} {!report && !error && <div className="empty-report"><p>Actualiza el informe para consultar ventas, pedidos, tickets, facturas e inventario.</p></div>}<div className="ceo-chat"><h2>Consulta al CEO</h2><div className="conversation-box">{messages.length ? messages.map((item, index) => <p className={item.role === 'user' ? 'chat-user' : 'chat-assistant'} key={`${item.role}-${index}`}>{item.text}</p>) : <p className="muted">Pregunta por ventas, pedidos, tickets, facturas o inventario.</p>}</div><form className="support-form" onSubmit={ask}><input required value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ej. ¿Qué sucursal vendió más?" /><button className="primary-button" disabled={busy}>Preguntar</button></form></div></div>
}

function summarizeReport(report: Record<string, unknown>) {
  const data = (report.datos ?? report.data) as Record<string, Record<string, unknown>> | undefined
  if (!data) return 'El informe está disponible, pero no contiene indicadores para mostrar.'
  const ventas = data.ventas?.ventas_mxn
  const pedidos = data.pedidos?.total
  const tickets = data.tickets?.abiertos_actuales ?? data.tickets?.abiertos
  const facturas = data.facturas?.total_emitidas ?? data.facturas?.total
  const inventario = data.inventario?.items_criticos ?? data.inventario?.registros_criticos
  return [`Ventas: ${typeof ventas === 'number' ? ventas.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'sin dato'}.`, `Pedidos: ${typeof pedidos === 'number' ? pedidos.toLocaleString('es-MX') : 'sin dato'}.`, `Tickets abiertos: ${typeof tickets === 'number' ? tickets.toLocaleString('es-MX') : 'sin dato'}.`, `Facturas: ${typeof facturas === 'number' ? facturas.toLocaleString('es-MX') : 'sin dato'}.`, `Inventario crítico: ${typeof inventario === 'number' ? inventario.toLocaleString('es-MX') : 'sin dato'}.`].join('\n')
}

function detectCeoDomain(text: string) {
  const normalized = text.toLocaleLowerCase('es-MX')
  return ['ventas', 'pedidos', 'facturas', 'inventario', 'tickets', 'clientes'].find((domain) => normalized.includes(domain))
}

function parseDateRange(text: string) {
  const normalized = text.toLocaleLowerCase('es-MX')
  if (normalized.includes('este mes') || normalized.includes('mes actual')) return { start: '2026-10-01', end: '2026-10-28' }
  if (normalized.includes('hoy')) return { start: '2026-10-28', end: '2026-10-28' }
  if (normalized.includes('esta semana')) return { start: '2026-10-22', end: '2026-10-28' }
  const match = normalized.match(/del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/)
  if (!match) return undefined
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const month = months.indexOf(match[3])
  if (month < 0) return undefined
  return { start: `${match[4]}-${String(month + 1).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`, end: `${match[4]}-${String(month + 1).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}` }
}

function formatCeoAnswer(report: Record<string, unknown>, domain: string) {
  const period = report.periodo as Record<string, string>
  const data = report.datos as Record<string, Record<string, unknown>>
  const item = data[domain]
  if (domain === 'pedidos' && item) {
    const statuses = item.por_estado as Array<Record<string, unknown>> ?? []
    const branches = item.por_sucursal as Array<Record<string, unknown>> ?? []
    const comparison = item.comparativo as Record<string, unknown> | undefined
    return `**Pedidos del ${period.fecha_inicio} al ${period.fecha_fin}**\n\n- **Total de pedidos:** ${item.total}\n- **Estados:**\n${statuses.map((status) => `  - **${status.estado}:** ${status.total}`).join('\n')}\n- **Por sucursal:**\n${branches.map((branch) => `  - **${branch.sucursal}:** ${branch.total}`).join('\n')}\n\n**Comparativo vs. periodo anterior**\n- **Periodo anterior:** ${comparison?.total_anterior ?? 'sin dato'} pedidos\n- **Variación:** **${comparison?.variacion_porcentual ?? 'sin dato'}%**\n\n**Lectura ejecutiva**\n- El volumen de pedidos del periodo es de **${item.total}**.\n- La mayor concentración está en **${branches[0]?.sucursal ?? 'sin dato'}**.\n- Conviene dar seguimiento a los pedidos con incidencia y pendientes.`
  }
  const analysis = report.analisis as Record<string, unknown> | undefined
  return `**Resumen de ${domain} del ${period.fecha_inicio} al ${period.fecha_fin}**\n\n${typeof analysis?.resumen_ejecutivo === 'string' ? analysis.resumen_ejecutivo : summarizeReport(report)}`
}

export default App
