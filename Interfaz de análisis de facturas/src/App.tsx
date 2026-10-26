import { FormEvent, ReactNode, useRef, useState } from "react";

type IconName =
  | "dashboard"
  | "invoice"
  | "upload"
  | "agents"
  | "chat"
  | "orders"
  | "returns"
  | "tickets"
  | "settings"
  | "bell"
  | "search"
  | "plus"
  | "arrow"
  | "file"
  | "check"
  | "clock"
  | "trend"
  | "send"
  | "chevron";

const iconPaths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  invoice: <><path d="M6 3h10l3 3v15H6z" /><path d="M9 10h6M9 14h6M9 18h3M16 3v4h3" /></>,
  upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 14v6h14v-6" /></>,
  agents: <><circle cx="9" cy="8" r="3" /><path d="M3 19c.6-3 2.5-5 6-5s5.4 2 6 5" /><circle cx="17" cy="9" r="2" /><path d="M16 14c2.8-.2 4.3 1.4 5 3.5" /></>,
  chat: <><path d="M4 5h16v12H9l-5 4z" /><path d="M8 9h8M8 13h5" /></>,
  orders: <><path d="M4 7h16v13H4zM8 7V4h8v3" /><path d="M9 12h6" /></>,
  returns: <><path d="M8 7H4v-4" /><path d="M4.5 7A8 8 0 1 1 4 15" /></>,
  tickets: <><path d="M4 5h16v5a2.5 2.5 0 0 0 0 5v4H4v-4a2.5 2.5 0 0 0 0-5z" /><path d="M12 8v8" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  file: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6M15 3v4h3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  trend: <><path d="m4 16 5-5 4 4 7-8" /><path d="M15 7h5v5" /></>,
  send: <><path d="m4 4 17 8-17 8 3-8z" /><path d="M7 12h14" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

const navSections = [
  {
    label: "PRINCIPAL",
    items: [
      { name: "Resumen", icon: "dashboard" as IconName },
      { name: "Facturas", icon: "invoice" as IconName, count: "18" },
      { name: "Importar archivos", icon: "upload" as IconName },
      { name: "Agentes IA", icon: "agents" as IconName },
    ],
  },
  {
    label: "ATENCIÓN AL CLIENTE",
    items: [
      { name: "Asistente", icon: "chat" as IconName, live: true },
      { name: "Pedidos", icon: "orders" as IconName },
      { name: "Devoluciones", icon: "returns" as IconName },
      { name: "Tickets", icon: "tickets" as IconName, count: "6" },
    ],
  },
];

const recentInvoices = [
  { id: "FAC-2024-0892", client: "Distribuciones Mena", amount: "€ 4.280,00", status: "Analizada", date: "Hoy, 10:42" },
  { id: "FAC-2024-0891", client: "Estudio Norte S.L.", amount: "€ 1.960,50", status: "Analizando", date: "Hoy, 09:18" },
  { id: "FAC-2024-0890", client: "Grupo Alcázar", amount: "€ 8.750,00", status: "Revisar", date: "Ayer, 17:35" },
];

function App() {
  const [active, setActive] = useState("Resumen");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { role: "agent", text: "Hola, soy Alma. Puedo consultar pedidos, facturas, devoluciones y tickets. ¿En qué te ayudo?" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    setChat((current) => [...current, { role: "user", text }, { role: "agent", text: "Entendido. Estoy consultando esa información para ti." }]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-stone-200 text-stone-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-700 bg-stone-900 text-stone-300 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-stone-700 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-950/30">
            <Icon name="invoice" className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-stone-100">Nexo</div>
            <div className="text-xs text-stone-500">Gestión inteligente</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-7">
          {navSections.map((section) => (
            <div key={section.label} className="mb-7">
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-stone-500">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setActive(item.name)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active === item.name ? "bg-stone-700/80 text-white" : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                    }`}
                  >
                    <Icon name={item.icon} className={`h-[18px] w-[18px] ${active === item.name ? "text-teal-400" : "text-stone-500 group-hover:text-stone-300"}`} />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.count && <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400">{item.count}</span>}
                    {item.live && <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_0_3px_rgba(45,212,191,.12)]" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-stone-700 p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-stone-400 hover:bg-stone-800">
            <Icon name="settings" className="h-[18px] w-[18px] text-stone-500" />
            Configuración
          </button>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-800/70 p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-200 text-xs font-semibold text-amber-900">LM</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-200">Laura Méndez</p>
              <p className="truncate text-xs text-stone-500">Administradora</p>
            </div>
            <Icon name="chevron" className="h-4 w-4 text-stone-600" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-stone-300 bg-stone-100/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-800 text-stone-100 lg:hidden"><Icon name="invoice" className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-stone-500">Panel de control</p>
              <h1 className="text-lg font-semibold tracking-tight text-stone-800">Buenos días, Laura</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative hidden md:block">
              <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input className="w-56 rounded-lg border border-stone-300 bg-stone-200/60 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-teal-600 focus:bg-stone-100" placeholder="Buscar factura, pedido..." />
            </label>
            <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-stone-300 bg-stone-100 text-stone-500 hover:bg-stone-200" aria-label="Notificaciones">
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-stone-100 bg-amber-500" />
            </button>
          </div>
        </header>

        <main className="p-5 md:p-8">
          <div className="mx-auto max-w-[1500px]">
            <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1 text-sm text-stone-500">Miércoles, 24 de julio</p>
                <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Todo bajo control</h2>
                <p className="mt-1 text-sm text-stone-500">Revisa el estado de tus documentos y agentes.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50">
                  <Icon name="upload" className="h-4 w-4" /> Importar Excel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800">
                  <Icon name="plus" className="h-4 w-4" /> Nueva factura
                </button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Facturas procesadas", value: "1.248", detail: "+12% este mes", icon: "file" as IconName, accent: "bg-teal-100 text-teal-700" },
                { label: "Pendientes de revisión", value: "18", detail: "3 de alta prioridad", icon: "clock" as IconName, accent: "bg-amber-100 text-amber-700" },
                { label: "Pedidos activos", value: "86", detail: "9 salen hoy", icon: "orders" as IconName, accent: "bg-sky-100 text-sky-700" },
                { label: "Precisión de IA", value: "98,4%", detail: "+1,2% vs. mes anterior", icon: "trend" as IconName, accent: "bg-violet-100 text-violet-700" },
              ].map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-stone-300 bg-stone-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-stone-500">{stat.label}</p>
                    <div className={`grid h-9 w-9 place-items-center rounded-lg ${stat.accent}`}><Icon name={stat.icon} className="h-[18px] w-[18px]" /></div>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{stat.detail}</p>
                </article>
              ))}
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.8fr)]">
              <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-100 shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                    <div>
                      <h3 className="font-semibold text-stone-800">Facturas recientes</h3>
                      <p className="mt-0.5 text-xs text-stone-500">Documentos procesados por tus agentes</p>
                    </div>
                    <button className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900">Ver todas <Icon name="arrow" className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          <th className="px-5 py-3">Factura</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b border-stone-200 last:border-0 hover:bg-stone-200/40">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-200 text-stone-500"><Icon name="file" className="h-4 w-4" /></div>
                                <div><p className="text-sm font-medium text-stone-800">{invoice.id}</p><p className="text-xs text-stone-500">{invoice.client}</p></div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-stone-700">{invoice.amount}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                invoice.status === "Analizada" ? "bg-teal-100 text-teal-700" : invoice.status === "Analizando" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                              }`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{invoice.status}</span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-stone-500">{invoice.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <AgentCard number="01" title="Analista de facturas" description="Extrae, valida y compara datos de tus archivos." task="842 documentos analizados" />
                  <AgentCard number="02" title="Auditor inteligente" description="Detecta duplicados, errores y anomalías fiscales." task="37 incidencias detectadas" />
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-stone-300 bg-stone-100 p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="font-semibold text-stone-800">Importar documentos</h3><p className="mt-0.5 text-xs text-stone-500">Convierte Excel en reportes PDF</p></div>
                    <span className="rounded-md bg-stone-200 px-2 py-1 text-[10px] font-semibold text-stone-500">XLSX · XLS · CSV</span>
                  </div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" />
                  <button onClick={() => fileRef.current?.click()} className="group flex w-full flex-col items-center rounded-xl border border-dashed border-stone-400 bg-stone-200/50 px-5 py-7 text-center transition hover:border-teal-600 hover:bg-teal-50/50">
                    <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-stone-100 text-teal-700 shadow-sm group-hover:bg-teal-100"><Icon name="upload" className="h-5 w-5" /></div>
                    <p className="text-sm font-medium text-stone-700">Arrastra tu archivo aquí</p>
                    <p className="mt-1 text-xs text-stone-500">o haz clic para seleccionarlo</p>
                  </button>
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-teal-50 p-3">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-teal-600 text-white"><Icon name="check" className="h-3.5 w-3.5" /></div>
                    <div className="flex-1"><p className="text-xs font-medium text-stone-700">Salida automática en PDF</p><p className="text-[11px] text-stone-500">Lista para revisar y compartir</p></div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-stone-300 bg-stone-100 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-stone-200 p-4">
                    <div className="relative grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-sm font-semibold text-white">A<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-stone-100 bg-teal-400" /></div>
                    <div className="flex-1"><h3 className="text-sm font-semibold text-stone-800">Alma · Soporte IA</h3><p className="text-[11px] text-teal-700">En línea · Responde al instante</p></div>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-200"><Icon name="chat" className="h-4 w-4" /></button>
                  </div>
                  <div className="h-52 space-y-3 overflow-y-auto bg-stone-200/30 p-4">
                    {chat.map((item, index) => (
                      <div key={index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                        <p className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${item.role === "user" ? "rounded-br-md bg-teal-700 text-white" : "rounded-bl-md border border-stone-200 bg-stone-100 text-stone-600"}`}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendMessage} className="border-t border-stone-200 p-3">
                    <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-200/40 p-1.5 focus-within:border-teal-600">
                      <input value={message} onChange={(event) => setMessage(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-stone-400" placeholder="Pregunta por un pedido o factura..." />
                      <button type="submit" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-700 text-white hover:bg-teal-800" aria-label="Enviar mensaje"><Icon name="send" className="h-4 w-4" /></button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AgentCard({ number, title, description, task }: { number: string; title: string; description: string; task: string }) {
  return (
    <article className="rounded-2xl border border-stone-300 bg-stone-100 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-800 text-xs font-semibold text-stone-100">
          {number}<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-stone-100 bg-teal-400" />
        </div>
        <div><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-stone-800">{title}</h3><span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-700">Activo</span></div><p className="mt-1 text-xs leading-relaxed text-stone-500">{description}</p></div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500"><Icon name="check" className="h-3.5 w-3.5 text-teal-600" />{task}</span>
        <button className="text-[11px] font-medium text-teal-700 hover:text-teal-900">Ver actividad</button>
      </div>
    </article>
  );
}

export default App;
