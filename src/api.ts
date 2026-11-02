async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'include' })
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string | { message?: string } }
  const errorMessage = typeof body.error === 'string' ? body.error : body.error?.message
  if (!response.ok) throw new Error(body.message ?? errorMessage ?? `Solicitud fallida (${response.status}).`)
  return body as T
}

export function iniciarSesion(username: string, password: string) {
  return request<{ authenticated: boolean }>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
}

// Brujeria: mantener explícita la identidad del agente para los informes ejecutivos.
const ceoPayload = (question?: string) => ({
  agente: 'Agente-CEO',
  agent_name: 'Agente-CEO',
  instrucciones: 'Responde como Agente-CEO: entrega informes ejecutivos claros, con cifras y desglose verificable.',
  incluir: ['ventas', 'pedidos', 'facturas', 'inventario', 'tickets', 'clientes'],
  comparar_periodo_anterior: true,
  incluir_ia: true,
  ...(question ? { pregunta: question } : {}),
})

export function consultarCEO() {
  return request<Record<string, unknown>>('/api/ceo/resumen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ceoPayload()) })
}

export type ChatResult = { response?: string; message?: string; session_id?: string }
export type SupportOperation = 'cliente-consultar' | 'inventario-consultar' | 'pedido-consultar' | 'pedido-crear' | 'ticket-consultar' | 'ticket-crear'

export function enviarSoporte(message: string, sessionId?: string) {
  return request<ChatResult>('/api/support/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    agente: 'Ayuda-al-Cliente',
    agent_name: 'Ayuda-al-Cliente',
    instrucciones: 'Responde como Ayuda-al-Cliente: sé claro, amable y solicita los identificadores necesarios.',
    ...(sessionId ? { message, session_id: sessionId } : { message }),
  }) })
}

export function ejecutarOperacionSoporte(operation: SupportOperation, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>('/api/support/operation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, payload }),
  })
}

export function consultarCEOQuery(domain: string, startDate: string, endDate: string, question?: string) {
  return request<Record<string, unknown>>('/api/ceo/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    agente: 'Agente-CEO',
    agent_name: 'Agente-CEO',
    instrucciones: 'Responde como Agente-CEO con resumen ejecutivo y detalle accionable.',
    incluir: [domain],
    fecha_inicio: startDate,
    fecha_fin: endDate,
    comparar_periodo_anterior: true,
    incluir_ia: true,
    ...(question ? { pregunta: question } : {}),
  }) })
}

export type InvoiceRecord = {
  id: number
  number?: string | null
  vendor_name?: string | null
  vendor_tax_id?: string | null
  issued_at?: string | null
  subtotal?: string | number | null
  tax?: string | number | null
  total?: string | number | null
  currency?: string | null
  processing_status?: string | null
  payment_status?: string | null
}

export type InvoiceDocumentResult = {
  message?: string
  review_required?: boolean
  processing_status?: string | null
  payment_status?: string | null
  review_reasons?: string[]
  invoice?: InvoiceRecord
  data?: Record<string, unknown>
}

export type InvoiceReviewPayload = {
  number?: string
  vendor_name?: string
  vendor_tax_id?: string
  issued_at?: string
  subtotal?: number
  tax?: number
  total?: number
  currency?: string
}

export type InvoiceReviewResult = {
  message?: string
  processing_status?: string
  payment_status?: string
  invoice?: InvoiceRecord
}

export type InvoiceListResult = {
  current_page?: number
  data: InvoiceRecord[]
  first_page_url?: string
  from?: number | null
  last_page?: number
  last_page_url?: string
  next_page_url?: string | null
  path?: string
  per_page?: number
  prev_page_url?: string | null
  to?: number | null
  total?: number
}

export function enviarFactura(file: File) {
  if (file.type === 'application/pdf') {
    return file.slice(0, 5).arrayBuffer().then((header) => {
      if (new TextDecoder().decode(header) !== '%PDF-') throw new Error('El archivo tiene extensión PDF, pero su contenido no es un PDF válido.')
      return uploadInvoiceFile(file)
    })
  }
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Selecciona un PDF, PNG o JPG válido.')
  return uploadInvoiceFile(file)
}

function uploadInvoiceFile(file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<InvoiceDocumentResult>('/api/invoices/document', { method: 'POST', body })
}

export function revisarFactura(invoiceId: number, payload: InvoiceReviewPayload) {
  return request<InvoiceReviewResult>(`/api/invoices/${invoiceId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}


export function listarFacturas(processingStatus?: string) {
  const params = new URLSearchParams()
  params.set('per_page', '50')

  if (processingStatus) {
    params.set('processing_status', processingStatus)
  }

  return request<InvoiceListResult>(
    `/api/invoices?${params.toString()}`,
    { method: 'GET' },
  )
}


export function eliminarFactura(invoiceId: number) {
  return request<Record<string, never>>(
    `/api/invoices/${invoiceId}`,
    { method: 'DELETE' },
  )
}
