import { useEffect, useRef } from "react";

/**
 * Sauvegarde automatique d'un brouillon de formulaire dans localStorage.
 * - Restaure automatiquement au montage (via le setter fourni)
 * - Sauvegarde à chaque changement (debounce 300ms)
 * - À appeler `clear()` après un enregistrement réussi
 *
 * Les fichiers (File/Blob) ne sont pas persistables — seuls les champs texte/objets JSON le sont.
 */
export function useFormDraft<T extends object>(
  key: string,
  value: T,
  restore: (v: T) => void,
) {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restauration une seule fois au montage
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") restore(parsed as T);
      }
    } catch (e) {
      console.warn("[form-draft] restore failed", key, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sauvegarde debouncée à chaque changement
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn("[form-draft] save failed", key, e);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value]);

  return {
    clear: () => {
      try { localStorage.removeItem(key); } catch { /* noop */ }
    },
    hasDraft: () => {
      if (typeof window === "undefined") return false;
      return !!localStorage.getItem(key);
    },
  };
}
