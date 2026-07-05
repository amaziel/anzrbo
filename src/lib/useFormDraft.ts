import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Sauvegarde auto d'un brouillon dans localStorage.
 * - Restaure au montage (+ toast "Brouillon restauré")
 * - Sauvegarde debouncée (300ms) à chaque changement
 * - clear() après enregistrement réussi
 * Les fichiers (File/Blob) ne sont pas persistables.
 */
export function useFormDraft<T extends object>(
  key: string,
  value: T,
  restore: (v: T) => void,
  opts: { silent?: boolean; label?: string } = {},
) {
  const queryClient = useQueryClient();
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          restore(parsed as T);
          void queryClient.invalidateQueries();
          window.dispatchEvent(new CustomEvent("anzrbo:draft-restored", { detail: { key } }));
          if (!opts.silent) {
            toast.success(opts.label ?? "Brouillon restauré", {
              description: "Données reprises automatiquement. Les tableaux et cartes sont resynchronisés avec la base.",
            });
          }
        }
      }
    } catch (e) {
      console.warn("[form-draft] restore failed", key, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { console.warn("[form-draft] save failed", key, e); }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, value]);

  return {
    clear: () => { try { localStorage.removeItem(key); } catch { /* noop */ } },
    hasDraft: () => typeof window !== "undefined" && !!localStorage.getItem(key),
  };
}
