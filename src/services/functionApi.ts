const API_BASE_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
 
export type ApiErrorBody = {
  success?: false;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};
 
export interface Cliente {
  ClienteID: string;
  RazonSocial: string;
  Segmento: string;
  NivelServicio: string;
  CondicionesPago: string;
  Correo: string;
  SucursalResponsable: string;
  Estado: string;
  Synthetic: boolean;
}

export interface Producto {
  SKU: string;
  Nombre: string;
  Categoria: string;
  Subcategoria: string;
  Presentacion: string;
  Unidad: string;
  Marca: string;
  Costo_MXN: number;
  Precio_MXN: number;
  Estado: string;
  ProveedorPrincipalID: string;
  ProveedorAlternoID: string;
  LeadTimeDias: number;
  ClasificacionDato: string;
  Synthetic: boolean;
}

export interface ProductoInventario {
  InventarioID: string;
  SKU: string;
  Producto: string;
  Sucursal: string;
  ExistenciaFisica: number;
  Reservado: number;
  Disponible: number;
  Minimo: number;
  Maximo: number;
  EstatusStock: string;
  FechaCorte: string;
  SistemaOrigen: string;
  Synthetic: boolean;
}

export interface PedidoDetalle {
  LineaID: string;
  PedidoID: string;
  Linea: number;
  SKU: string;
  Producto: string;
  CantidadPedida: number;
  Unidad: string;
  PrecioUnitario_MXN: number;
  Importe_MXN: number;
  CantidadSurtida: number;
  Synthetic: boolean;
}

export interface Pedido {
  PedidoID: string;
  ClienteID: string;
  FechaPedido: string;
  Estado: string;
  Sucursal: string;
  FechaComprometida: string;
  TipoFecha: string;
  Guia: string | null;
  Incidencia: string | null;
  Subtotal_MXN: number;
  IVA_MXN: number;
  Total_MXN: number;
  Moneda: string;
  SistemaOrigen: string;
  ClasificacionDato: string;
  Synthetic: boolean;
}

export interface Ticket {
  TicketID: string;
  ClienteID: string;
  RelacionadoID: string;
  Tipo: string;
  Categoria: string;
  Prioridad: string;
  Estado: string;
  Responsable: string;
  FechaCreacion: string;
  FechaObjetivo: string;
  SLA_Horas: number;
  Descripcion: string;
  ProximaAccion: string;
  BloqueoRetencion: boolean;
  ClasificacionDato: string;
  Synthetic: boolean;
}

export type QueryResponse<T> =
  | { found: true; data: T; message?: string }
  | { found: false; message?: string };

export type ConsultarClientesResponse = QueryResponse<Cliente[]>;
export type ConsultarProductosResponse = QueryResponse<Producto[]>;
export type ConsultarInventarioResponse = QueryResponse<ProductoInventario[]>;
export type ConsultarPedidosResponse = QueryResponse<Pedido[]>;
export type ConsultarTicketsResponse = QueryResponse<Ticket[]>;

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  success: boolean;
  session_id: string;
  response_id: string;
  response: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    body: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}
 
export async function functionApi<T>(
  route: string,
  payload: unknown,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/api/function/${route.replace(/^\/+/, "")}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
 
  const rawBody = await response.text();
  let body: unknown;
 
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = rawBody;
  }
 
  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message =
      errorBody?.error?.message ??
      errorBody?.message ??
      `La solicitud falló con HTTP ${response.status}.`;
    throw new ApiRequestError(message, response.status, body);
  }
 
  return body as T;
}

export function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const payload: ChatRequest =
    sessionId === undefined ? { message } : { message, session_id: sessionId };

  return functionApi<ChatResponse>("chat", payload);
}