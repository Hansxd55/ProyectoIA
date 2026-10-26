// Leer la URL desde las variables de entorno de Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Login falló: HTTP ${response.status}`);
  }

  // Guardar el token en el navegador
  localStorage.setItem("auth_token", data.token);
  return data;
}

export async function uploadInvoice(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/invoices/document`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    },
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Error al subir: HTTP ${response.status}`);
  }

  return data;
}

export async function sendChatMessage(message: string, token: string) {
  const response = await fetch(`${API_URL}/api/support/chat`, { // <-- Cambio aquí
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Error en el chat: HTTP ${response.status}`);
  }

  return data;
}