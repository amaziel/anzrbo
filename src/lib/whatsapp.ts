export const DEFAULT_WHATSAPP_TEMPLATE =
  "Bonjour {prenom}, je vous contacte au sujet de {sujet} ({organisation}). {demande}";

export type WhatsAppVars = Record<string, string | undefined>;

export function renderWhatsAppMessage(template: string, vars: WhatsAppVars): string {
  return template
    .replace(/\{(\w+)\}/g, (_m, key: string) => vars[key] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
