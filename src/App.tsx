import { FormEvent, useEffect, useRef, useState } from 'react'
import { login, uploadInvoice } from './api' // Conservamos las que sí funcionan directo con Laravel
import { functionApi } from './services/functionApi' // Tu nuevo cliente para Azure

// Definimos la forma de la respuesta del chat según el documento
type ChatResponse = {
  success: boolean;
  session_id: string;
  response_id: string;
  response: string;
};
function App() {
  const fileInput = useRef<HTMLInputElement>(null)

  const [token, setToken] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
    { role: 'assistant', text: '¡Hola! Soy tu asistente de IA. Sube una factura o escribe tu duda para comenzar.' }
  ])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleLogin = async () => {
    setStatusMessage('Conectando con la API en Azure...')
    try {
      const data = await login('alexis@rioclaro.local', 'RioClaro2026!')
      setToken(data.token)
      setStatusMessage('¡Conexión exitosa! Sesión iniciada.')
    } catch (error: any) {
      setStatusMessage(`Falló la conexión: ${error.message}`)
    }
  }

  const handleUpload = async () => {
    if (!token) return setStatusMessage('Primero debes iniciar sesión.')
    if (!fileToUpload) return setStatusMessage('Por favor selecciona un archivo primero.')

    setStatusMessage('Subiendo y procesando con Azure Document Intelligence...')
    try {
      const data = await uploadInvoice(fileToUpload, token)
      if (data.review_required) {
        setStatusMessage(`Factura guardada. Requiere revisión (Estado: ${data.processing_status})`)
      } else {
        setStatusMessage(`¡Factura validada correctamente! (Estado: ${data.processing_status})`)
      }
    } catch (error: any) {
      setStatusMessage(`Error al subir: ${error.message}`)
    }
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!message.trim()) return

    if (!token) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Por favor inicia sesión primero para chatear.' }])
      return
    }

    const userText = message.trim()
    setChatMessages(prev => [...prev, { role: 'user', text: userText }])
    setMessage('')

    try {
      const data = await sendChatMessage(userText, token)
      const reply = data.reply || data.message || 'Respuesta recibida del servidor.'
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error de conexión: ${error.message}` }])
    }
  }

  return (
    <div className="app-shell">
      <div className="main-content">
        
        <div className="header-row">
          <div>
            <h1 className="page-title">Gestor de Facturas</h1>
            <p className="page-subtitle">Panel de análisis inteligente y soporte con IA</p>
          </div>

          <button
            type="button"
            className="theme-switch"
            onClick={() => setDarkMode((current) => !current)}
            aria-label={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            <span className={`switch-knob ${darkMode ? 'is-dark' : ''}`}>
              {darkMode ? '☀' : '☾'}
            </span>
          </button>
        </div>

        <div className="login-section">
          {!token ? (
            <button type="button" className="primary-button" onClick={handleLogin}>
              1. Iniciar Sesión en el Sistema
            </button>
          ) : (
            <span style={{ color: '#059669', fontWeight: 600, fontSize: '15px' }}>✓ Sesión Activa con Token Sanctum</span>
          )}
          {statusMessage && <div className="status-text">{statusMessage}</div>}
        </div>

        {token && (
          <div className="cards-container">
            
            <div className="card">
              <div className="card-header">Subir Factura</div>
              <div style={{ padding: '28px' }}>
                <div 
                  className={`upload-zone ${fileName ? 'has-file' : ''}`}
                  onClick={() => fileInput.current?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <p style={{ margin: '0 0 15px', fontWeight: 500 }}>
                    {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic para seleccionar PDF o imagen'}
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInput.current?.click()
                    }}
                  >
                    Nueva factura
                  </button>
                </div>

                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0]
                    if (selectedFile) {
                      setFileName(selectedFile.name)
                      setFileToUpload(selectedFile)
                    }
                  }}
                />

                {fileToUpload && (
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button 
                      type="button" 
                      className="primary-button" 
                      onClick={handleUpload}
                      style={{ width: '100%', backgroundColor: '#059669', padding: '18px' }}
                    >
                      Enviar a Procesar con IA
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card chat-container">
              <div className="card-header">Chat de Soporte IA</div>

              <div className="chat-messages">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={msg.role === 'user' ? 'user-message' : 'assistant-message'}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <form className="chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Escribe tu pregunta..."
                />

                <button type="submit" className="send-button">
                  Enviar
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default App