const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
 
export type ApiErrorBody = {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
};
 
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
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
      `La solicitud falló con HTTP ${response.status}.`;
    throw new ApiRequestError(message, response.status, body);
  }
 
  return body as T;
}