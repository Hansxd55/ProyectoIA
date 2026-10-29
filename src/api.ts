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

const ceoPayload = (question?: string) => ({
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
  return request<ChatResult>('/api/support/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionId ? { message, session_id: sessionId } : { message }) })
}

export function ejecutarOperacionSoporte(operation: SupportOperation, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>('/api/support/operation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, payload }),
  })
}

export function consultarCEOQuery(domain: string, startDate: string, endDate: string) {
  return request<Record<string, unknown>>('/api/ceo/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    incluir: [domain],
    fecha_inicio: startDate,
    fecha_fin: endDate,
    comparar_periodo_anterior: true,
    incluir_ia: true,
  }) })
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
  return request<{ message?: string }>('/api/invoices/document', { method: 'POST', body })
}
