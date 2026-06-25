export type ClientDiagnosticEvent = {
  at: string;
  type: "console" | "runtime" | "network" | "service-worker";
  level: "info" | "warn" | "error";
  message: string;
  detail?: string;
};

const STORAGE_KEY = "anzrbo_client_diagnostics_v1";
const MAX_EVENTS = 80;
let initialized = false;

function serialize(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ""}`.trim();
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function addClientDiagnostic(event: Omit<ClientDiagnosticEvent, "at">) {
  if (typeof window === "undefined") return;
  try {
    const current = readClientDiagnostics();
    const next = [{ ...event, at: new Date().toISOString() }, ...current].slice(0, MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function readClientDiagnostics(): ClientDiagnosticEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClientDiagnosticEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearClientDiagnostics() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function initClientDiagnostics() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    addClientDiagnostic({
      type: "console",
      level: "error",
      message: args.map(serialize).join(" ").slice(0, 2_000),
    });
    originalConsoleError(...args);
  };

  window.addEventListener("error", (event) => {
    addClientDiagnostic({
      type: "runtime",
      level: "error",
      message: event.message || "Erreur JavaScript",
      detail: serialize(event.error),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    addClientDiagnostic({
      type: "runtime",
      level: "error",
      message: "Promesse rejetée non gérée",
      detail: serialize(event.reason),
    });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    try {
      const response = await originalFetch(input, init);
      if (!response.ok) {
        addClientDiagnostic({
          type: "network",
          level: "error",
          message: `${response.status} ${response.statusText}`.trim(),
          detail: url,
        });
      }
      return response;
    } catch (error) {
      addClientDiagnostic({
        type: "network",
        level: "error",
        message: "Requête réseau échouée",
        detail: `${url}\n${serialize(error)}`,
      });
      throw error;
    }
  };
}